import { BaseElement } from '../../../base-element.js';
import { step_personal_template } from './step-personal-template.js';
// Конфигурации форм загружаются динамически в _ensureFormsLoaded()

// Загружаем стили на верхнем уровне модуля
if (window.app && window.app.toolkit && window.app.toolkit.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./step-personal-styles.css', import.meta.url));
}

/**
 * Step Personal Component
 * Шаг ввода личных данных
 * 
 * Для неавторизованных пользователей: полная форма регистрации (email, логин, пароль, телефон, имя, фамилия)
 * Для авторизованных пользователей: только телефон, имя, фамилия (email и логин уже есть в профиле)
 */
export class StepPersonal extends BaseElement {
  static stateSchema = {
    formData: { type: 'json', default: null, attribute: null, internal: true },
    isSubmitting: { type: 'boolean', default: false, attribute: null, internal: true },
    isAuthorized: { type: 'boolean', default: false, attribute: null, internal: true },
  };

  constructor() {
    super();
    this._formController = null;
    this._onRegistered = this._onRegistered.bind(this);
    this._onError = this._onError.bind(this);
    this._onAuthorizedSubmit = this._onAuthorizedSubmit.bind(this);
    this._onAuthorizedError = this._onAuthorizedError.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    
    // Подписываемся на события формы (для неавторизованных)
    window.addEventListener('order-personal:registered', this._onRegistered);
    window.addEventListener('order-personal:error', this._onError);
    
    // Подписываемся на события формы (для авторизованных)
    window.addEventListener('order-personal-authorized:submit', this._onAuthorizedSubmit);
    window.addEventListener('order-personal-authorized:error', this._onAuthorizedError);
    
    // Сначала проверяем авторизацию, потом рендерим
    this.checkAuth();
    
    // Убеждаемся, что конфигурации форм загружены перед рендером
    this._ensureFormsLoaded().then(() => {
      // Рендерим после установки isAuthorized и загрузки форм
      requestAnimationFrame(() => {
        this.render();
        
        // Инициализируем форму после рендера
        requestAnimationFrame(() => {
          this._initForm();
        });
      });
    });
  }

  disconnectedCallback() {
    window.removeEventListener('order-personal:registered', this._onRegistered);
    window.removeEventListener('order-personal:error', this._onError);
    window.removeEventListener('order-personal-authorized:submit', this._onAuthorizedSubmit);
    window.removeEventListener('order-personal-authorized:error', this._onAuthorizedError);
  }

  /**
   * Убедиться, что конфигурации форм загружены
   */
  async _ensureFormsLoaded() {
    // Если конфигурации уже загружены, возвращаемся сразу
    if (window.app?.forms?.orderPersonal && window.app?.forms?.orderPersonalAuthorized) {
      return;
    }
    
    // Импортируем конфигурации форм, если они еще не загружены
    try {
      await import('../../../../app/forms/index.js');
      console.log('[StepPersonal] Forms loaded:', Object.keys(window.app?.forms || {}));
    } catch (error) {
      console.error('[StepPersonal] Failed to load forms:', error);
    }
  }

  /**
   * Проверить авторизацию пользователя
   */
  checkAuth() {
    // Используем данные из window.app.auth (из PHP) - они всегда доступны при загрузке страницы
    if (window.app?.auth?.user && window.app.auth.authenticated) {
      this.setState({ isAuthorized: true });
      console.log('[StepPersonal] User is authorized:', {
        user: window.app.auth.user,
        hasPhone: !!(window.app.auth.user.phone || window.app.auth.user.meta?.phone || window.app.auth.user.meta?.phone_number)
      });
    } else {
      this.setState({ isAuthorized: false });
      console.log('[StepPersonal] User is not authorized');
    }
    
    // Проверяем, что конфигурации форм загружены
    console.log('[StepPersonal] Available forms:', {
      orderPersonal: !!window.app?.forms?.orderPersonal,
      orderPersonalAuthorized: !!window.app?.forms?.orderPersonalAuthorized,
      allForms: Object.keys(window.app?.forms || {})
    });
  }

  /**
   * Инициализировать форму (восстановить значения из formData или профиля)
   */
  async _initForm() {
    // Ждём, пока форма инициализируется через config-path
    await customElements.whenDefined('ui-form-controller');
    
    // Ждём несколько кадров для полной инициализации
    await new Promise((resolve) => requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    }));
    
    this._formController = this.querySelector('ui-form-controller');
    if (!this._formController) {
      console.error('[StepPersonal] Form controller not found');
      return;
    }

    if (this.state.isAuthorized) {
      // Для авторизованных: подставляем данные из профиля
      const user = window.app.auth.user;
      const userMeta = user.meta || {};
      
      // Подставляем телефон, имя, фамилию из профиля (проверяем разные варианты структуры)
      const phone = user.phone || userMeta.phone || userMeta.phone_number || '';
      if (phone && String(phone).trim() !== '') {
        this._formController.setFieldValue('phone', String(phone).trim());
      }
      
      const firstName = user.first_name || userMeta.first_name || '';
      if (firstName && String(firstName).trim() !== '') {
        this._formController.setFieldValue('first_name', String(firstName).trim());
      }
      
      const lastName = user.last_name || userMeta.last_name || '';
      if (lastName && String(lastName).trim() !== '') {
        this._formController.setFieldValue('last_name', String(lastName).trim());
      }
      
      // Если есть сохранённые данные формы, они имеют приоритет
      if (this.state.formData) {
        if (this.state.formData.phone) {
          this._formController.setFieldValue('phone', this.state.formData.phone);
        }
        if (this.state.formData.first_name) {
          this._formController.setFieldValue('first_name', this.state.formData.first_name);
        }
        if (this.state.formData.last_name) {
          this._formController.setFieldValue('last_name', this.state.formData.last_name);
        }
      }
    } else {
      // Для неавторизованных: восстанавливаем значения из сохранённых данных
      if (this.state.formData && this._formController) {
        Object.keys(this.state.formData).forEach(fieldId => {
          const value = this.state.formData[fieldId];
          if (value !== null && value !== undefined) {
            this._formController.setFieldValue(fieldId, value);
          }
        });
      }
    }
  }

  /**
   * Обработка успешной регистрации
   */
  _onRegistered(e) {
    const { formData } = e.detail;
    
    // Сохраняем данные формы
    this.setState({
      formData: formData || {},
      isSubmitting: false
    });

    // Уведомляем Wizard о успешной регистрации
    this.dispatchEvent(new CustomEvent('wizard:step:next'));
  }

  /**
   * Обработка ошибки регистрации
   */
  _onError(e) {
    this.setState({ isSubmitting: false });
    
    // Ошибка уже отображается в форме через конфигурацию
  }

  /**
   * Обработка отправки формы для авторизованных пользователей
   */
  _onAuthorizedSubmit(e) {
    const { values } = e.detail;
    
    // Сохраняем данные формы
    this.setState({
      formData: values || {},
      isSubmitting: false
    });

    // Уведомляем Wizard о готовности перейти к следующему шагу
    this.dispatchEvent(new CustomEvent('wizard:step:next'));
  }

  /**
   * Обработка ошибки для авторизованных пользователей
   */
  _onAuthorizedError(e) {
    this.setState({ isSubmitting: false });
    
    // Ошибка уже отображается в форме через конфигурацию
  }

  /**
   * Валидация шага
   */
  async validate() {
    if (!this._formController) {
      return false;
    }

    // Проверяем валидность формы
    const isValid = await this._formController.validate();
    return isValid;
  }

  /**
   * Получить данные шага
   */
  async getData() {
    if (this._formController) {
      const formData = this._formController.getValues() || {};
      
      if (this.state.isAuthorized) {
        // Для авторизованных: возвращаем только телефон, имя, фамилию
        // Email и username берём из профиля
        const user = window.app.auth.user;
        return {
          email: user.email,
          username: user.username || user.name,
          phone: formData.phone,
          first_name: formData.first_name || '',
          last_name: formData.last_name || '',
        };
      } else {
        // Для неавторизованных: возвращаем все данные, включая пароль и согласия для регистрации
        return {
          email: formData.email,
          username: formData.username,
          password: formData.password, // Пароль нужен для регистрации на BackEnd
          phone: formData.phone,
          first_name: formData.first_name || '',
          last_name: formData.last_name || '',
          privacy_consent: formData.privacy_consent || false,
          offer_consent: formData.offer_consent || false,
        };
      }
    }

    return this.state.formData || {};
  }

  render() {
    console.log('[StepPersonal] Rendering with isAuthorized:', this.state.isAuthorized);
    this.innerHTML = step_personal_template({
      isSubmitting: this.state.isSubmitting,
      isAuthorized: this.state.isAuthorized,
    });
  }
}

customElements.define('step-personal', StepPersonal);

