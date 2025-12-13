import { BaseElement } from '../../base-element.js';
import { cart_summary_template } from './cart-summary-template.js';
import { calculateTotal } from '../cart-service.js';
import { formatPrice, formatDiscount } from '../helpers/price-formatter.js';

// Загружаем стили на верхнем уровне модуля
if (window.app && window.app.toolkit && window.app.toolkit.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./cart-summary-styles.css', import.meta.url));
}

// Импортируем tooltip для работы hint
import '../../ui-kit/tooltip/tooltip.js';
// Импортируем ui-icon для отображения иконки
import '../../ui-kit/icon/icon.js';

/**
 * Cart Summary Component
 * Компонент для отображения итоговой информации о корзине
 * Автономный компонент: подписывается на изменения корзины
 */
export class CartSummary extends BaseElement {
  static stateSchema = {
    subtotal: { type: 'number', default: 0, attribute: null, internal: true },
    discountAmount: { type: 'number', default: 0, attribute: null, internal: true },
    feeAmount: { type: 'number', default: 0, attribute: null, internal: true },
    deliveryCost: { type: 'number', default: 0, attribute: null, internal: true },
    total: { type: 'number', default: 0, attribute: null, internal: true },
    itemsCount: { type: 'number', default: 0, attribute: null, internal: true },
  };

  constructor() {
    super();
    this._unsubscribe = null;
    this._handleCartUpdate = () => {
      this.updateTotals();
    };
    this._handleDeliveryChange = (event) => {
      // Используем deliveryCost из события, если он есть
      if (event && event.detail && event.detail.deliveryCost !== undefined) {
        const deliveryCost = event.detail.deliveryCost || 0;
        console.log('[CartSummary] Delivery cost from event:', deliveryCost);
        this.setState({ deliveryCost });
        this.updateTotals();
      } else {
        // Fallback: читаем из LocalStorage
        this.updateDeliveryCost();
      }
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this.subscribeToCart();
    this.subscribeToDeliveryChanges();
    this.updateTotals();
    this.updateDeliveryCost();
    this.render();
  }

  disconnectedCallback() {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    window.removeEventListener('order-flow:delivery-changed', this._handleDeliveryChange);
  }

  /**
   * Подписаться на изменения способа доставки
   */
  subscribeToDeliveryChanges() {
    window.addEventListener('order-flow:delivery-changed', this._handleDeliveryChange);
  }

  /**
   * Обновить стоимость доставки из LocalStorage
   */
  updateDeliveryCost() {
    try {
      const saved = localStorage.getItem('elkaretro_order_data');
      if (saved) {
        const orderData = JSON.parse(saved);
        const deliveryMethod = orderData.delivery?.delivery_method;
        
        if (deliveryMethod) {
          const cost = this.getDeliveryCost(deliveryMethod);
          this.setState({ deliveryCost: cost });
          this.updateTotals();
        } else {
          this.setState({ deliveryCost: 0 });
          this.updateTotals();
        }
      } else {
        this.setState({ deliveryCost: 0 });
        this.updateTotals();
      }
    } catch (error) {
      console.error('[cart-summary] Failed to update delivery cost:', error);
    }
  }

  /**
   * Получить стоимость доставки по способу
   */
  getDeliveryCost(method) {
    const costs = {
      'pickup_udelnaya': 0,
      'pickup_ozon': 150,
      'pickup_cdek': 350,
      'courier_cdek': 400, // Минимальная стоимость
      'post_russia': 300, // Минимальная стоимость
    };
    return costs[method] || 0;
  }

  /**
   * Подписаться на изменения корзины
   */
  subscribeToCart() {
    if (!window.app?.cart) {
      console.warn('[cart-summary] cart not initialized');
      return;
    }
    this._unsubscribe = window.app.cart.subscribe((nextState) => {
      this.updateTotals();
    });
  }

  /**
   * Обновить итоговые суммы
   */
  updateTotals() {
    const totals = calculateTotal();
    const deliveryCost = this.state.deliveryCost || 0;
    const total = totals.total + deliveryCost;
    
    this.setState({
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      feeAmount: totals.feeAmount,
      total: total,
      itemsCount: totals.itemsCount,
    });
  }

  render() {
    const { subtotal, discountAmount, feeAmount, deliveryCost, total, itemsCount } = this.state;

    // Форматируем значения для отображения
    const formattedSubtotal = formatPrice(subtotal);
    const formattedDiscount = discountAmount > 0 ? formatDiscount(discountAmount) : null;
    const formattedFee = feeAmount > 0 ? formatPrice(feeAmount) : null;
    const formattedDeliveryCost = deliveryCost > 0 ? formatPrice(deliveryCost) : null;
    const formattedTotal = formatPrice(total);

    // Передаём весь state + форматированные значения
    this.innerHTML = cart_summary_template({
      ...this.state, // Весь state целиком
      subtotal: formattedSubtotal, // Форматированные значения (перезаписывают исходные)
      discount: formattedDiscount,
      fee: formattedFee,
      deliveryCost: formattedDeliveryCost,
      total: formattedTotal,
    });
  }
}

// Проверяем, не зарегистрирован ли элемент уже
if (!customElements.get('cart-summary')) {
  customElements.define('cart-summary', CartSummary);
} else {
  console.warn('[cart-summary] cart-summary already registered, skipping re-registration');
}

