import { BaseElement } from '../../base-element.js';
import { order_wizard_template } from './order-wizard-template.js';
import { getCartStore } from '../cart-store.js';

// Загружаем стили на верхнем уровне модуля
if (window.app && window.app.toolkit && window.app.toolkit.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./order-wizard-styles.css', import.meta.url));
}

/**
 * Order Wizard Component
 * Пошаговый мастер оформления заказа
 * 
 * Шаги:
 * 1. Проверка авторизации (step-auth)
 * 2. Личные данные (step-personal) - только для неавторизованных
 * 3. Логистика (step-logistics)
 * 4. Способ оплаты (step-payment)
 * 5. Подтверждение (step-confirmation)
 */
export class OrderWizard extends BaseElement {
  static stateSchema = {
    currentStep: { type: 'number', default: 1, attribute: { name: 'current-step', observed: true, reflect: true } },
    isAuthorized: { type: 'boolean', default: false, attribute: null, internal: true },
    orderData: { type: 'json', default: null, attribute: null, internal: true },
    isSubmitting: { type: 'boolean', default: false, attribute: null, internal: true },
  };

  constructor() {
    super();
    this.steps = [
      { id: 'auth', name: 'Авторизация', component: 'step-auth', skipIfAuthorized: true },
      { id: 'personal', name: 'Личные данные', component: 'step-personal', skipIfAuthorized: false }, // Теперь показывается для всех, но с разными формами
      { id: 'logistics', name: 'Доставка', component: 'step-logistics', skipIfAuthorized: false },
      { id: 'payment', name: 'Оплата', component: 'step-payment', skipIfAuthorized: false },
      { id: 'confirmation', name: 'Подтверждение', component: 'step-confirmation', skipIfAuthorized: false },
    ];
    this._unsubscribe = null;
    this._handleAuthSuccess = null;
    this._useProfileData = null; // Флаг: использовать данные из профиля или заполнить с нуля
    this._isNavigating = false; // Флаг для предотвращения множественных навигаций
    this._handleStepNext = null;
    this._handleStepPrev = null;
    this._handleStepGoto = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this.initOrderData();
    this.checkAuth();
    this.render();
    this.loadStep();
    this.attachAuthListeners();
  }

  disconnectedCallback() {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    this.detachAuthListeners();
  }

  /**
   * Инициализировать данные заказа
   */
  initOrderData() {
    // Загружаем из LocalStorage, если есть сохраненный прогресс
    const saved = localStorage.getItem('elkaretro_order_wizard_progress');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.setState({ orderData: parsed });
      } catch (error) {
        console.error('[OrderWizard] Failed to load saved progress:', error);
      }
    }

    if (!this.state.orderData) {
      this.setState({
        orderData: {
          cart: null,
          user: null,
          delivery: null,
          payment: null,
        },
      });
    }
  }

  /**
   * Проверить авторизацию пользователя
   */
  async checkAuth() {
    // Используем данные из window.app.auth (из PHP) - они всегда доступны при загрузке страницы
    if (window.app?.auth?.user && window.app.auth.authenticated) {
      const user = window.app.auth.user;
      this.setState({
        isAuthorized: true,
        orderData: {
          ...this.state.orderData,
          user: {
            id: user.id,
            email: user.email,
            name: user.name || '',
          },
        },
      });
      // Если авторизован и мы на шаге 1, определяем следующий шаг
      if (this.state.currentStep === 1) {
        // Показываем вопрос: использовать данные из профиля или заполнить с нуля?
        const useProfileData = await this.askUseProfileData();
        this._useProfileData = useProfileData;
        // Определяем следующий шаг
        const nextStep = await this.determineNextStep(useProfileData);
        this.goToStep(nextStep);
      }
    } else {
      // PHP вернул null - пользователь не авторизован, не делаем запросов
      this.setState({ isAuthorized: false });
      // Если не авторизован, начинаем с шага авторизации
      if (this.state.currentStep > 2) {
        this.goToStep(1);
      }
    }
  }

  /**
   * Обновить состояние авторизации без перезагрузки страницы
   * @returns {Promise<Object|null>} Данные пользователя или null
   */
  async refreshAuthState() {
    try {
      const response = await fetch('/wp-json/elkaretro/v1/user/profile', {
        credentials: 'same-origin',
        headers: {
          'X-WP-Nonce': window.wpApiSettings?.nonce || '',
        },
      });
      
      if (response.ok) {
        const user = await response.json();
        
        // Обновляем window.app.auth
        if (window.app) {
          window.app.auth = {
            authenticated: true,
            user: user,
          };
        }
        
        // Обновляем состояние Wizard
        this.setState({
          isAuthorized: true,
          orderData: {
            ...this.state.orderData,
            user: {
              id: user.id,
              email: user.email,
              name: user.name || user.display_name || '',
            },
          },
        });
        
        return user;
      }
    } catch (error) {
      console.error('[OrderWizard] Failed to refresh auth state:', error);
    }
    return null;
  }

  /**
   * Спросить пользователя: использовать данные из профиля или заполнить с нуля?
   * @returns {Promise<boolean>} true - использовать данные из профиля, false - заполнить с нуля
   */
  async askUseProfileData() {
    // TODO: Реализовать UI для вопроса
    // Временное решение: для авторизованных пользователей всегда используем данные из профиля
    // В будущем можно добавить модальное окно или инлайн-вопрос
    
    // Если уже был выбран ранее - используем сохраненное значение
    if (this._useProfileData !== null) {
      return this._useProfileData;
    }
    
    // По умолчанию используем данные из профиля
    return true;
  }

  /**
   * Определить следующий шаг на основе данных профиля
   * @param {boolean} useProfileData - использовать данные из профиля или заполнить с нуля
   * @returns {Promise<number>} Номер следующего шага
   */
  async determineNextStep(useProfileData = false) {
    // Если пользователь выбрал "Заполнить с нуля" - начинаем с шага 2
    if (!useProfileData) {
      return 2; // Шаг личных данных
    }
    
    // Проверка авторизации
    if (!window.app?.auth?.user || !window.app.auth.authenticated) {
      return 1; // Шаг авторизации
    }
    
    // Всегда начинаем с шага 2 (Личные данные) для проверки/дополнения
    // Данные будут предзаполнены из профиля
    return 2;
  }

  /**
   * Получить данные последнего заказа пользователя
   * @returns {Promise<Object|null>} Данные последнего заказа или null
   */
  async getLastOrderData() {
    try {
      const response = await fetch('/wp-json/elkaretro/v1/orders?per_page=1', {
        credentials: 'same-origin',
        headers: {
          'X-WP-Nonce': window.wpApiSettings?.nonce || '',
        },
      });
      
      if (response.ok) {
        const orders = await response.json();
        if (orders && orders.length > 0) {
          return orders[0];
        }
      }
    } catch (error) {
      console.error('[OrderWizard] Failed to get last order:', error);
    }
    return null;
  }

  /**
   * Прикрепить обработчики событий авторизации
   */
  attachAuthListeners() {
    // Слушаем успешную авторизацию
    this._handleAuthSuccess = async () => {
      // Обновляем состояние авторизации
      const user = await this.refreshAuthState();
      if (user) {
        // Показываем вопрос: использовать данные из профиля или заполнить с нуля?
        const useProfileData = await this.askUseProfileData();
        this._useProfileData = useProfileData;
        // Определяем следующий шаг
        const nextStep = await this.determineNextStep(useProfileData);
        this.goToStep(nextStep);
      }
    };
    
    window.addEventListener('elkaretro:auth:login', this._handleAuthSuccess);
  }

  /**
   * Открепить обработчики событий авторизации
   */
  detachAuthListeners() {
    if (this._handleAuthSuccess) {
      window.removeEventListener('elkaretro:auth:login', this._handleAuthSuccess);
      this._handleAuthSuccess = null;
    }
  }

  /**
   * Загрузить текущий шаг
   */
  async loadStep() {
    const step = this.steps[this.state.currentStep - 1];
    if (!step) {
      return;
    }

    const container = this.querySelector('.order-wizard_step-container');
    if (!container) {
      return;
    }

    // Проверяем, не загружен ли уже этот шаг
    const existingStep = container.querySelector(step.component);
    if (existingStep && existingStep.getAttribute('step-number') === String(this.state.currentStep)) {
      console.log('[OrderWizard] Step already loaded, skipping');
      return;
    }

    // Динамически импортируем компонент шага
    try {
      await import(`./steps/${step.component}.js`);

      // Создаем элемент шага
      const stepElement = document.createElement(step.component);
      stepElement.setAttribute('wizard-id', this.getAttribute('wizard-id') || 'order-wizard');
      stepElement.setAttribute('step-number', this.state.currentStep);

      container.innerHTML = '';
      container.appendChild(stepElement);
    } catch (error) {
      console.error(`[OrderWizard] Failed to load step ${step.component}:`, error);
      container.innerHTML = `<div class="order-wizard_error">Ошибка загрузки шага: ${step.name}</div>`;
    }
  }

  /**
   * Перейти к следующему шагу
   */
  async nextStep() {
    const currentStep = this.state.currentStep;
    const step = this.steps[currentStep - 1];

    // Валидация текущего шага
    const isValid = await this.validateStep(step);
    if (!isValid) {
      return false;
    }

    // Сохраняем данные шага
    await this.saveStepData(step);

    // Переходим к следующему шагу (пропускаем шаги, которые нужно пропустить)
    let nextStepNumber = currentStep + 1;
    
    // Пропускаем шаги, которые нужно пропустить для авторизованных
    if (this.state.isAuthorized) {
      while (nextStepNumber <= this.steps.length) {
        const nextStep = this.steps[nextStepNumber - 1];
        if (!nextStep || !nextStep.skipIfAuthorized) {
          break;
        }
        nextStepNumber++;
      }
    }

    if (nextStepNumber <= this.steps.length) {
      this.goToStep(nextStepNumber);
      return true;
    }

    return false;
  }

  /**
   * Перейти к предыдущему шагу
   */
  prevStep() {
    if (this.state.currentStep > 1) {
      this.goToStep(this.state.currentStep - 1);
    }
  }

  /**
   * Перейти к конкретному шагу
   */
  goToStep(stepNumber) {
    const step = Math.max(1, Math.min(stepNumber, this.steps.length));
    
    // Предотвращаем множественные вызовы для одного и того же шага
    if (this._isNavigating || this.state.currentStep === step) {
      console.log('[OrderWizard] Navigation already in progress or already on step', step);
      return;
    }
    
    this._isNavigating = true;
    this.setState({ currentStep: step });
    this.saveProgress();
    // Обновляем шаблон перед загрузкой шага
    this.render();
    
    // Сбрасываем флаг после завершения навигации
    requestAnimationFrame(() => {
      this._isNavigating = false;
    });
  }

  /**
   * Открыть/вернуться к шагу авторизации (публичный API)
   * @param {Object} [options]
   * @param {boolean} [options.scrollIntoView=true] - прокрутить к мастеру
   */
  openAuthStep(options = {}) {
    this.goToStep(1);
    if (options.scrollIntoView !== false) {
      this.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    }
  }

  /**
   * Валидация шага
   */
  async validateStep(step) {
    // Если уже идет отправка заказа, блокируем
    if (this.state.isSubmitting) {
      console.log('[OrderWizard] Order submission in progress, blocking validation');
      return false;
    }

    const stepElement = this.querySelector(step.component);
    if (!stepElement || typeof stepElement.validate !== 'function') {
      return true;
    }

    // Если это последний шаг (подтверждение), устанавливаем флаг isSubmitting
    if (this.state.currentStep === this.steps.length) {
      this.setState({ isSubmitting: true });
    }

    const result = await stepElement.validate();

    // Если валидация не прошла, сбрасываем флаг
    if (!result) {
      this.setState({ isSubmitting: false });
    }

    return result;
  }

  /**
   * Сохранить данные шага
   */
  async saveStepData(step) {
    const stepElement = this.querySelector(step.component);
    if (!stepElement || typeof stepElement.getData !== 'function') {
      console.log(`[OrderWizard] Step ${step.id} has no getData() method`);
      return;
    }

    const stepData = await stepElement.getData();
    console.log(`[OrderWizard] Saving step data for ${step.id}:`, {
      stepId: step.id,
      stepDataKeys: stepData ? Object.keys(stepData) : [],
      hasPassword: !!(stepData?.password),
      stepData,
    });
    
    this.setState({
      orderData: {
        ...this.state.orderData,
        [step.id]: stepData,
      },
    });
    this.saveProgress();
  }

  /**
   * Сохранить прогресс в LocalStorage
   */
  saveProgress() {
    try {
      localStorage.setItem('elkaretro_order_wizard_progress', JSON.stringify({
        currentStep: this.state.currentStep,
        orderData: this.state.orderData,
      }));
    } catch (error) {
      console.error('[OrderWizard] Failed to save progress:', error);
    }
  }

  /**
   * Очистить сохраненный прогресс
   */
  clearProgress() {
    localStorage.removeItem('elkaretro_order_wizard_progress');
  }

  /**
   * Обработка изменений состояния
   */
  onStateChanged(key) {
    if (key === 'isSubmitting') {
      // Обновляем disabled состояние кнопки "Завершить заказ"
      const nextBtn = this.querySelector('.order-wizard_next-btn');
      if (nextBtn && nextBtn.setDisabled) {
        nextBtn.setDisabled(this.state.isSubmitting);
      }
    }
  }

  render() {
    const { currentStep, isAuthorized, isSubmitting } = this.state;
    const currentStepInfo = this.steps[currentStep - 1];

    this.innerHTML = order_wizard_template({
      steps: this.steps,
      currentStep,
      currentStepInfo,
      isAuthorized,
      isSubmitting: this.state.isSubmitting,
    });

    // Прикрепляем обработчики событий перед загрузкой шага
    this.attachEventListeners();
    
    // После рендера загружаем шаг (только если контейнер существует)
    const container = this.querySelector('.order-wizard_step-container');
    if (container) {
      this.loadStep();
    }
  }

  /**
   * Прикрепить обработчики событий
   */
  attachEventListeners() {
    // Обработка кликов через кастомные события от ui-button
    this.removeEventListener('order-wizard:next-click', this._handleNext);
    this._handleNext = () => {
      // Если это последний шаг, сразу дизейблим кнопку
      if (this.state.currentStep === this.steps.length) {
        const nextBtn = this.querySelector('.order-wizard_next-btn');
        if (nextBtn && nextBtn.setDisabled) {
          nextBtn.setDisabled(true);
        }
        this.setState({ isSubmitting: true });
      }
      this.nextStep();
    };
    this.addEventListener('order-wizard:next-click', this._handleNext);

    this.removeEventListener('order-wizard:prev-click', this._handlePrev);
    this._handlePrev = () => this.prevStep();
    this.addEventListener('order-wizard:prev-click', this._handlePrev);

    // Слушаем события от шагов
    // Удаляем старые обработчики перед добавлением новых
    if (this._handleStepNext) {
      this.removeEventListener('wizard:step:next', this._handleStepNext);
    }
    this._handleStepNext = () => this.nextStep();
    this.addEventListener('wizard:step:next', this._handleStepNext);

    if (this._handleStepPrev) {
      this.removeEventListener('wizard:step:prev', this._handleStepPrev);
    }
    this._handleStepPrev = () => this.prevStep();
    this.addEventListener('wizard:step:prev', this._handleStepPrev);

    if (this._handleStepGoto) {
      this.removeEventListener('wizard:step:goto', this._handleStepGoto);
    }
    this._handleStepGoto = (e) => {
      console.log('[OrderWizard] Received wizard:step:goto event:', e.detail);
      // Останавливаем всплытие после обработки
      e.stopPropagation();
      if (e.detail && e.detail.step) {
        console.log('[OrderWizard] Going to step:', e.detail.step);
        this.goToStep(e.detail.step);
      }
    };
    this.addEventListener('wizard:step:goto', this._handleStepGoto);
  }
}

customElements.define('order-wizard', OrderWizard);

let cartActionsRegistered = false;
function registerCartEventActions() {
  if (cartActionsRegistered) return;
  if (!window.app?.events) {
    window.addEventListener('app:events-ready', registerCartEventActions, { once: true });
    return;
  }

  window.app.events.register('cart', {
    openAuthStep: ({ payload } = {}) => {
      const selector = payload?.wizardSelector;
      let wizard = selector ? document.querySelector(selector) : null;
      if (!wizard) {
        wizard = document.querySelector('order-wizard');
      }

      if (wizard?.openAuthStep) {
        wizard.openAuthStep(payload || {});
        return true;
      }

      console.warn('[cart] order-wizard not found for cart.openAuthStep action');
      return false;
    },
  });

  cartActionsRegistered = true;
}

registerCartEventActions();

