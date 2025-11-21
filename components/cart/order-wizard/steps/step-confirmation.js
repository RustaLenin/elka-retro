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
    console.log('[StepConfirmation] createOrder() called');
    
    // Сразу дизейблим кнопку в wizard
    const wizard = this.closest('order-wizard');
    if (wizard) {
      wizard.setState({ isSubmitting: true });
    }
    
    this.setState({ isSubmitting: true, error: '' });

    try {
      const orderData = this.prepareOrderData();

      console.log('[StepConfirmation] Sending order data to backend:', {
        url: '/wp-json/elkaretro/v1/orders',
        hasPersonal: !!orderData.personal,
        personalEmail: orderData.personal?.email,
        personalUsername: orderData.personal?.username,
        hasPassword: !!(orderData.personal?.password),
        cartItems: orderData.cart?.items?.length || 0,
      });

      const response = await fetch('/wp-json/elkaretro/v1/orders', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': window.wpApiSettings?.nonce || '',
        },
        body: JSON.stringify(orderData),
      });

      console.log('[StepConfirmation] Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[StepConfirmation] Backend error:', errorData);
        throw new Error(errorData.message || 'Ошибка создания заказа');
      }

      const result = await response.json();
      console.log('[StepConfirmation] Backend response:', result);

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
      
      // Сбрасываем флаг isSubmitting в wizard при ошибке
      const wizard = this.closest('order-wizard');
      if (wizard) {
        wizard.setState({ isSubmitting: false });
      }
      
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

    const preparedData = {
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

    console.log('[StepConfirmation] Prepared order data:', {
      hasCart: !!preparedData.cart?.items?.length,
      cartItemsCount: preparedData.cart?.items?.length || 0,
      hasPersonal: !!preparedData.personal,
      personalKeys: preparedData.personal ? Object.keys(preparedData.personal) : [],
      hasPassword: !!(preparedData.personal?.password),
      hasDelivery: !!preparedData.delivery,
      hasPayment: !!preparedData.payment,
      hasTotals: !!preparedData.totals,
    });

    return preparedData;
  }

  /**
   * Валидация шага
   * На шаге подтверждения создаем заказ
   */
  async validate() {
    console.log('[StepConfirmation] validate() called', {
      orderId: this.state.orderId,
      isSubmitting: this.state.isSubmitting,
      hasOrderData: !!this.state.orderData,
    });

    // Если заказ уже создан, пропускаем
    if (this.state.orderId) {
      console.log('[StepConfirmation] Order already created, skipping');
      return true;
    }
    
    // Если уже идет создание заказа, ждем
    if (this.state.isSubmitting) {
      console.log('[StepConfirmation] Order creation in progress, waiting...');
      return false;
    }
    
    // Создаем заказ
    console.log('[StepConfirmation] Starting order creation...');
    await this.createOrder();
    
    // Возвращаем true только если заказ успешно создан
    const success = !!this.state.orderId;
    console.log('[StepConfirmation] Order creation result:', { success, orderId: this.state.orderId });
    return success;
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

    // Кнопка подтверждения теперь в wizard footer, обработка через validateStep()
  }
}

customElements.define('step-confirmation', StepConfirmation);

