import { BaseElement } from '../../../base-element.js';
import { step_confirmation_template } from './step-confirmation-template.js';
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
    orderNumber: { type: 'string', default: null, attribute: null, internal: true },
    success: { type: 'boolean', default: false, attribute: null, internal: true },
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
    if (!window.app?.cart) {
      console.warn('[step-confirmation] cart not initialized');
      return;
    }
    const cart = window.app.cart.getCart();
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

      // Удаляем user из объекта, если он null или undefined
      if (orderData.user === null || orderData.user === undefined) {
        delete orderData.user;
      }

      console.log('[StepConfirmation] Sending order data to backend:', {
        url: '/wp-json/elkaretro/v1/orders',
        hasPersonal: !!orderData.personal,
        personalEmail: orderData.personal?.email,
        personalUsername: orderData.personal?.username,
        hasPassword: !!(orderData.personal?.password),
        hasUser: !!orderData.user,
        userValue: orderData.user,
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
        
        // Извлекаем понятное сообщение об ошибке
        let errorMessage = 'Ошибка создания заказа';
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.data?.message) {
          errorMessage = errorData.data.message;
        } else if (errorData.data?.details) {
          // Если есть детали ошибки, пытаемся извлечь из них
          const details = errorData.data.details;
          const firstError = Object.values(details)[0];
          if (firstError && typeof firstError === 'string') {
            errorMessage = firstError;
          }
        }
        
        const error = new Error(errorMessage);
        error.response = response;
        error.errorData = errorData;
        throw error;
      }

      const result = await response.json();
      console.log('[StepConfirmation] Backend response:', result);

      if (result.success && result.order) {
        const orderNumber = result.order.order_number || `#${result.order.id}`;
        
        // Обновляем состояние в step
        this.setState({
          orderId: result.order.id,
          orderNumber: orderNumber,
          success: true,
          isSubmitting: false,
        });
        
        // Обновляем состояние в wizard - оставляем isSubmitting: true и устанавливаем success
        const wizard = this.closest('order-wizard');
        if (wizard) {
          wizard.setState({ 
            isSubmitting: true, // Оставляем overlay открытым
            success: true,
            orderNumber: orderNumber,
            error: null 
          });
          
          // onStateChanged() вызовет _updateOverlayContent() автоматически
          // Но на случай, если это не произошло, вызываем напрямую с небольшой задержкой
          requestAnimationFrame(() => {
            wizard._updateOverlayContent();
          });
        }

        // Очищаем корзину
        if (window.app?.cart) {
          window.app.cart.clearCart();
        }

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
      
      // Извлекаем понятное сообщение об ошибке
      let errorMessage = 'Ошибка создания заказа';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.errorData) {
        // Если errorData уже был извлечен в блоке if (!response.ok)
        errorMessage = error.errorData.message || error.errorData.data?.message || errorMessage;
      }
      
      // Отправляем событие об ошибке создания заказа
      window.dispatchEvent(
        new CustomEvent('elkaretro:order:error', {
          detail: {
            error: errorMessage,
            errorData: error.errorData || null
          }
        })
      );
      
      this.setState({
        error: errorMessage,
        // НЕ сбрасываем isSubmitting - оставляем overlay с ошибкой
      });
      
      // Устанавливаем ошибку в wizard для отображения в overlay
      const wizard = this.closest('order-wizard');
      if (wizard) {
        wizard.setState({ 
          isSubmitting: true, // Оставляем overlay
          error: errorMessage 
        });
      }
      
      this.render();
    }
  }

  /**
   * Подготовить данные заказа для отправки
   */
  prepareOrderData() {
    const { orderData } = this.state;
    if (!window.app?.cart) {
      console.warn('[step-confirmation] cart not initialized');
      return null;
    }
    const cart = window.app.cart.getCart();
    const totals = calculateTotal();

    const preparedData = {
      cart: {
        items: cart.items.map((item) => ({
          id: item.id,
          type: item.type,
          price: item.price,
        })),
      },
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
    
    // user передаем только если он есть и не null, иначе не передаем параметр вообще
    // Проверяем, что user существует, не null, не undefined, и является объектом
    if (orderData.user != null && typeof orderData.user === 'object' && !Array.isArray(orderData.user)) {
      preparedData.user = orderData.user;
    }
    
    // Дополнительная проверка: если user все равно null, удаляем его
    if (preparedData.user === null || preparedData.user === undefined) {
      delete preparedData.user;
    }

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
    const { orderData, isSubmitting, orderId, orderNumber, success, error } = this.state;

    if (success && orderNumber) {
      // Заказ создан успешно
      this.innerHTML = step_confirmation_template({
        orderId,
        orderNumber,
        orderData,
        success: true,
        isSubmitting: false,
        error: null,
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

