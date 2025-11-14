import { BaseElement } from '../../../base-element.js';
import { step_confirmation_template } from './step-confirmation-template.js';
import { getCartStore } from '../../cart-store.js';
import { calculateTotal } from '../../cart-service.js';
import { formatPrice } from '../../helpers/price-formatter.js';

// Загружаем стили на верхнем уровне модуля
if (window.app && window.app.toolkit && window.app.toolkit.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./step-confirmation-styles.css', import.meta.url));
}

/**
 * Step Confirmation Component
 * Шаг подтверждения заказа
 * 
 * Отображает итоговую информацию о заказе и создает заказ через REST API.
 */
export class StepConfirmation extends BaseElement {
  static stateSchema = {
    orderData: { type: 'json', default: null, attribute: null, internal: true },
    isSubmitting: { type: 'boolean', default: false, attribute: null, internal: true },
    orderId: { type: 'number', default: null, attribute: null, internal: true },
    error: { type: 'string', default: '', attribute: null, internal: true },
  };

  constructor() {
    super();
  }

  connectedCallback() {
    super.connectedCallback();
    this.loadOrderData();
    this.render();
  }

  /**
   * Обработка изменений состояния
   */
  onStateChanged(key) {
    if (key === 'isSubmitting') {
      // Обновляем состояние loading на ui-button
      const confirmBtn = this.querySelector('.step-confirmation_submit-btn');
      if (confirmBtn && confirmBtn.setState) {
        confirmBtn.setState({ loading: this.state.isSubmitting, disabled: this.state.isSubmitting });
      }
    }
  }

  /**
   * Загрузить данные заказа из Wizard
   */
  loadOrderData() {
    // Получаем данные из родительского Wizard
    const wizard = this.closest('order-wizard');
    if (wizard && wizard.state && wizard.state.orderData) {
      this.setState({ orderData: wizard.state.orderData });
    }

    // Получаем данные корзины
    const store = getCartStore();
    const cart = store.getCart();
    const totals = calculateTotal();

    this.setState({
      orderData: {
        ...this.state.orderData,
        cart: {
          items: cart.items,
          totals,
        },
      },
    });
  }

  /**
   * Создать заказ
   */
  async createOrder() {
    this.setState({ isSubmitting: true, error: '' });

    try {
      const orderData = this.prepareOrderData();

      const response = await fetch('/wp-json/elkaretro/v1/orders', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': window.wpApiSettings?.nonce || '',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка создания заказа');
      }

      const result = await response.json();

      if (result.success && result.order) {
        this.setState({
          orderId: result.order.id,
          isSubmitting: false,
        });

        // Очищаем корзину
        const store = getCartStore();
        store.clearCart();

        // Очищаем прогресс Wizard
        localStorage.removeItem('elkaretro_order_wizard_progress');

        // Перерисовываем для отображения успеха
        this.render();

        // Уведомляем о успешном создании заказа
        window.dispatchEvent(
          new CustomEvent('elkaretro:order:created', {
            detail: { order: result.order },
          })
        );
      } else {
        throw new Error(result.message || 'Ошибка создания заказа');
      }
    } catch (error) {
      console.error('[StepConfirmation] Create order error:', error);
      this.setState({
        isSubmitting: false,
        error: error.message || 'Ошибка создания заказа',
      });
      this.render();
    }
  }

  /**
   * Подготовить данные заказа для отправки
   */
  prepareOrderData() {
    const { orderData } = this.state;
    const store = getCartStore();
    const cart = store.getCart();
    const totals = calculateTotal();

    return {
      cart: {
        items: cart.items.map((item) => ({
          id: item.id,
          type: item.type,
          price: item.price,
        })),
      },
      user: orderData.user || null,
      personal: orderData.personal || null,
      delivery: orderData.logistics || null,
      payment: orderData.payment || null,
      totals: {
        subtotal: totals.subtotal,
        discount: totals.discountAmount,
        fee: totals.feeAmount,
        total: totals.total,
      },
    };
  }

  /**
   * Валидация шага
   */
  async validate() {
    // На шаге подтверждения валидация не требуется
    return true;
  }

  /**
   * Получить данные шага
   */
  async getData() {
    return this.state.orderData;
  }

  render() {
    const { orderData, isSubmitting, orderId, error } = this.state;

    if (orderId) {
      // Заказ создан успешно
      this.innerHTML = step_confirmation_template({
        orderId,
        orderData,
        success: true,
      });
      return;
    }

    if (error) {
      // Ошибка создания заказа
      this.innerHTML = step_confirmation_template({
        orderData,
        error,
        isSubmitting: false,
      });
      return;
    }

    // Отображение данных для подтверждения
    this.innerHTML = step_confirmation_template({
      orderData,
      isSubmitting,
      error: null,
    });

    // Прикрепляем обработчик кнопки подтверждения через кастомное событие
    this.removeEventListener('step-confirmation:submit-click', this._handleSubmit);
    this._handleSubmit = () => this.createOrder();
    this.addEventListener('step-confirmation:submit-click', this._handleSubmit);

    // Устанавливаем состояние loading на ui-button
    const confirmBtn = this.querySelector('.step-confirmation_submit-btn');
    if (confirmBtn && confirmBtn.setState) {
      confirmBtn.setState({ loading: isSubmitting, disabled: isSubmitting });
    }
  }
}

customElements.define('step-confirmation', StepConfirmation);

