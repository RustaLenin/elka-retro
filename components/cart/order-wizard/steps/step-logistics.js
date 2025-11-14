import { BaseElement } from '../../../base-element.js';
import { step_logistics_template } from './step-logistics-template.js';
// Импортируем конфигурации форм приложения
import '../../../../app/forms/index.js';

// Загружаем стили на верхнем уровне модуля
if (window.app && window.app.toolkit && window.app.toolkit.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./step-logistics-styles.css', import.meta.url));
}

/**
 * Step Logistics Component
 * Шаг ввода адреса доставки
 * 
 * Для авторизованных пользователей подтягивает адрес из профиля.
 * Позволяет редактировать адрес.
 */
export class StepLogistics extends BaseElement {
  static stateSchema = {
    deliveryMethod: { type: 'string', default: '', attribute: null, internal: true },
    address: { type: 'json', default: null, attribute: null, internal: true },
    isAuthorized: { type: 'boolean', default: false, attribute: null, internal: true },
  };

  constructor() {
    super();
    this._formController = null;
    this._onSubmit = this._onSubmit.bind(this);
    this._onError = this._onError.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    this.checkAuth();
    this.render();
    
    // Подписываемся на события формы
    window.addEventListener('order-logistics:submit', this._onSubmit);
    window.addEventListener('order-logistics:error', this._onError);
    
    // Инициализируем форму после рендера
    requestAnimationFrame(() => {
      this.initForm();
    });
  }

  disconnectedCallback() {
    window.removeEventListener('order-logistics:submit', this._onSubmit);
    window.removeEventListener('order-logistics:error', this._onError);
  }

  /**
   * Проверить авторизацию и загрузить адрес из профиля
   */
  async checkAuth() {
    // Используем данные из window.app.auth (из PHP) - они всегда доступны при загрузке страницы
    if (window.app?.auth?.user && window.app.auth.authenticated) {
      this.setState({ isAuthorized: true });

      // Загружаем адрес из профиля пользователя
      // В данных из PHP может не быть meta, поэтому адрес будет пустым
      // Это нормально - пользователь введёт адрес в форме
      const user = window.app.auth.user;
      const addressMeta = user.meta?.delivery_address || {};
      if (addressMeta && Object.keys(addressMeta).length > 0) {
        this.setState({
          address: {
            street: addressMeta.street || '',
            city: addressMeta.city || '',
            region: addressMeta.region || '',
            postal_code: addressMeta.postal_code || '',
            country: addressMeta.country || 'Россия',
          },
        });
      }
    } else {
      // PHP вернул null - пользователь не авторизован, не делаем запросов
      this.setState({ isAuthorized: false });
    }
  }

  /**
   * Инициализировать форму
   */
  async initForm() {
    // Ждём, пока форма инициализируется через config-path
    await customElements.whenDefined('ui-form-controller');
    
    // Ждём несколько кадров для полной инициализации
    await new Promise((resolve) => requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    }));
    
    this._formController = this.querySelector('ui-form-controller');
    if (!this._formController) {
      console.error('[StepLogistics] Form controller not found');
      return;
    }

    // Устанавливаем значения через публичный API
    if (this.state.deliveryMethod) {
      this._formController.setFieldValue('delivery_method', this.state.deliveryMethod);
    }
    
    if (this.state.address) {
      const addr = this.state.address;
      if (addr.country) this._formController.setFieldValue('country', addr.country);
      if (addr.region) this._formController.setFieldValue('region', addr.region);
      if (addr.city) this._formController.setFieldValue('city', addr.city);
      if (addr.street) this._formController.setFieldValue('street', addr.street);
      if (addr.postal_code) this._formController.setFieldValue('postal_code', addr.postal_code);
    }
  }

  /**
   * Обработка отправки формы
   */
  _onSubmit(e) {
    const { values } = e.detail;
    this.handleSubmit(values);
  }

  /**
   * Обработка ошибки формы
   */
  _onError(e) {
    console.error('[StepLogistics] Form error:', e.detail.error);
  }

  /**
   * Обработка отправки формы
   */
  async handleSubmit(data) {
    try {
      // Сохраняем данные доставки
      this.setState({
        deliveryMethod: data.delivery_method,
        address: {
          country: data.country,
          region: data.region,
          city: data.city,
          street: data.street,
          postal_code: data.postal_code || '',
        },
      });

      // Если пользователь авторизован, сохраняем адрес в профиль
      if (this.state.isAuthorized) {
        await this.saveAddressToProfile(data);
      }

      // Уведомляем Wizard о готовности перейти к следующему шагу
      this.dispatchEvent(new CustomEvent('wizard:step:next'));
    } catch (error) {
      console.error('[StepLogistics] Submit error:', error);
    }
  }

  /**
   * Сохранить адрес в профиль пользователя
   */
  async saveAddressToProfile(addressData) {
    try {
      const response = await fetch('/wp-json/elkaretro/v1/user/profile', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': window.wpApiSettings?.nonce || '',
        },
        body: JSON.stringify({
          delivery_address: {
            country: addressData.country,
            region: addressData.region,
            city: addressData.city,
            street: addressData.street,
            postal_code: addressData.postal_code,
          },
        }),
      });

      if (!response.ok) {
        console.warn('[StepLogistics] Failed to save address to profile');
      }
    } catch (error) {
      console.error('[StepLogistics] Save address error:', error);
    }
  }

  /**
   * Валидация шага
   */
  async validate() {
    if (!this._formController) {
      return false;
    }

    return await this._formController.validate();
  }

  /**
   * Получить данные шага
   */
  async getData() {
    if (this._formController) {
      const formData = this._formController.getValues() || {};
      return {
        delivery_method: formData.delivery_method,
        address: {
          country: formData.country,
          region: formData.region,
          city: formData.city,
          street: formData.street,
          postal_code: formData.postal_code || '',
        },
      };
    }

    return {
      delivery_method: this.state.deliveryMethod,
      address: this.state.address,
    };
  }

  render() {
    this.innerHTML = step_logistics_template({
      isAuthorized: this.state.isAuthorized,
      hasSavedAddress: this.state.address && Object.keys(this.state.address).length > 0,
    });
  }
}

customElements.define('step-logistics', StepLogistics);

