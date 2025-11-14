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
  }

  connectedCallback() {
    super.connectedCallback();
    this.initOrderData();
    this.checkAuth();
    this.render();
    this.loadStep();
  }

  disconnectedCallback() {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
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
      // Если авторизован, пропускаем шаг авторизации
      if (this.state.currentStep === 1) {
        // Проверяем, есть ли телефон в профиле (проверяем разные варианты структуры)
        const userMeta = user.meta || {};
        const phone = user.phone || userMeta.phone || userMeta.phone_number || '';
        const hasPhone = phone && String(phone).trim() !== '';
        
        console.log('[OrderWizard] User phone check:', { 
          userPhone: user.phone, 
          metaPhone: userMeta.phone, 
          metaPhoneNumber: userMeta.phone_number,
          hasPhone 
        });
        
        if (hasPhone) {
          // Если телефон есть, переходим сразу к шагу доставки (шаг 3)
          this.goToStep(3);
        } else {
          // Если телефона нет, показываем шаг "Личные данные" (шаг 2) для его заполнения
          this.goToStep(2);
        }
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
    this.setState({ currentStep: step });
    this.saveProgress();
    this.loadStep();
  }

  /**
   * Валидация шага
   */
  async validateStep(step) {
    const stepElement = this.querySelector(step.component);
    if (!stepElement || typeof stepElement.validate !== 'function') {
      return true;
    }

    return await stepElement.validate();
  }

  /**
   * Сохранить данные шага
   */
  async saveStepData(step) {
    const stepElement = this.querySelector(step.component);
    if (!stepElement || typeof stepElement.getData !== 'function') {
      return;
    }

    const stepData = await stepElement.getData();
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

  render() {
    const { currentStep, isAuthorized } = this.state;
    const currentStepInfo = this.steps[currentStep - 1];

    this.innerHTML = order_wizard_template({
      steps: this.steps,
      currentStep,
      currentStepInfo,
      isAuthorized,
    });

    // После рендера загружаем шаг
    this.loadStep();
    this.attachEventListeners();
  }

  /**
   * Прикрепить обработчики событий
   */
  attachEventListeners() {
    // Обработка кликов через кастомные события от ui-button
    this.removeEventListener('order-wizard:next-click', this._handleNext);
    this._handleNext = () => this.nextStep();
    this.addEventListener('order-wizard:next-click', this._handleNext);

    this.removeEventListener('order-wizard:prev-click', this._handlePrev);
    this._handlePrev = () => this.prevStep();
    this.addEventListener('order-wizard:prev-click', this._handlePrev);

    // Слушаем события от шагов
    this.addEventListener('wizard:step:next', () => this.nextStep());
    this.addEventListener('wizard:step:prev', () => this.prevStep());
    this.addEventListener('wizard:step:goto', (e) => {
      if (e.detail && e.detail.step) {
        this.goToStep(e.detail.step);
      }
    });
  }
}

customElements.define('order-wizard', OrderWizard);

