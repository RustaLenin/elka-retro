import { BaseElement } from '../../../base-element.js';
import { step_payment_template } from './step-payment-template.js';
// Импортируем конфигурации форм приложения
import '../../../../app/forms/index.js';

// Загружаем стили на верхнем уровне модуля
if (window.app && window.app.toolkit && window.app.toolkit.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./step-payment-styles.css', import.meta.url));
}

/**
 * Step Payment Component
 * Шаг выбора способа оплаты
 * 
 * В MVP без интеграций с платежными системами.
 * Только перечисление способов оплаты и отображение реквизитов.
 */
export class StepPayment extends BaseElement {
  static stateSchema = {
    paymentMethod: { type: 'string', default: '', attribute: null, internal: true },
    paymentDetails: { type: 'json', default: null, attribute: null, internal: true },
  };

  constructor() {
    super();
    this._formController = null;
    this._onSubmit = this._onSubmit.bind(this);
    this._onError = this._onError.bind(this);
    this._onFieldChange = this._onFieldChange.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    this.render();
    
    // Подписываемся на события формы
    window.addEventListener('order-payment:submit', this._onSubmit);
    window.addEventListener('order-payment:error', this._onError);
    
    // Инициализируем форму после рендера
    requestAnimationFrame(() => {
      this.initForm();
    });
  }

  disconnectedCallback() {
    window.removeEventListener('order-payment:submit', this._onSubmit);
    window.removeEventListener('order-payment:error', this._onError);
    if (this._formController) {
      this._formController.removeEventListener('ui-form-controller:field:change', this._onFieldChange);
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
      console.error('[StepPayment] Form controller not found');
      return;
    }

    // Устанавливаем значение через публичный API
    if (this.state.paymentMethod) {
      this._formController.setFieldValue('payment_method', this.state.paymentMethod);
      // Обновляем реквизиты для уже выбранного способа оплаты
      this.updatePaymentDetails(this.state.paymentMethod);
    }

    // Слушаем изменения способа оплаты для отображения реквизитов
    this._formController.addEventListener('ui-form-controller:field:change', this._onFieldChange);
  }

  /**
   * Обработка изменения поля формы
   */
  _onFieldChange(e) {
    if (e.detail.fieldId === 'payment_method') {
      this.updatePaymentDetails(e.detail.value);
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
    console.error('[StepPayment] Form error:', e.detail.error);
  }

  /**
   * Обновить отображение реквизитов в зависимости от способа оплаты
   */
  updatePaymentDetails(paymentMethod) {
    const detailsContainer = this.querySelector('.step-payment_details');
    if (!detailsContainer) {
      return;
    }

    const details = this.getPaymentDetails(paymentMethod);
    if (details) {
      detailsContainer.innerHTML = `
        <div class="step-payment_details-content">
          <h4 class="step-payment_details-title">Реквизиты для оплаты</h4>
          <div class="step-payment_details-text">${details}</div>
        </div>
      `;
      detailsContainer.style.display = 'block';
    } else {
      detailsContainer.style.display = 'none';
    }
  }

  /**
   * Получить реквизиты для способа оплаты
   */
  getPaymentDetails(paymentMethod) {
    const details = {
      bank_transfer: `
        <p><strong>Банковский перевод:</strong></p>
        <p>Получатель: ООО "Ёлка Ретро"<br>
        ИНН: 1234567890<br>
        КПП: 123456789<br>
        Банк: ПАО "Банк"<br>
        БИК: 123456789<br>
        Расчетный счет: 40702810100000000000<br>
        Корреспондентский счет: 30101810100000000593</p>
        <p><em>В назначении платежа укажите номер заказа</em></p>
      `,
      card: `
        <p><strong>Оплата банковской картой:</strong></p>
        <p>Оплата будет доступна после подтверждения заказа.<br>
        Реквизиты для оплаты будут отправлены на ваш email.</p>
      `,
      cash: `
        <p><strong>Оплата наличными:</strong></p>
        <p>Оплата производится при получении заказа курьером или в пункте самовывоза.</p>
      `,
    };

    return details[paymentMethod] || null;
  }

  /**
   * Обработка отправки формы
   */
  async handleSubmit(data) {
    try {
      // Сохраняем данные оплаты
      this.setState({
        paymentMethod: data.payment_method,
        paymentDetails: {
          method: data.payment_method,
          details: this.getPaymentDetails(data.payment_method),
        },
      });

      // Уведомляем Wizard о готовности перейти к следующему шагу
      this.dispatchEvent(new CustomEvent('wizard:step:next'));
    } catch (error) {
      console.error('[StepPayment] Submit error:', error);
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
        payment_method: formData.payment_method,
        payment_details: this.getPaymentDetails(formData.payment_method),
      };
    }

    return {
      payment_method: this.state.paymentMethod,
      payment_details: this.state.paymentDetails,
    };
  }

  render() {
    this.innerHTML = step_payment_template();
  }
}

customElements.define('step-payment', StepPayment);

