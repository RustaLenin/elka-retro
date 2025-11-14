import { BaseElement } from '../../base-element.js';
import { cart_summary_template } from './cart-summary-template.js';
import { getCartStore } from '../cart-store.js';
import { calculateTotal } from '../cart-service.js';
import { formatPrice, formatDiscount } from '../helpers/price-formatter.js';

// Загружаем стили на верхнем уровне модуля
if (window.app && window.app.toolkit && window.app.toolkit.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./cart-summary-styles.css', import.meta.url));
}

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
    total: { type: 'number', default: 0, attribute: null, internal: true },
    itemsCount: { type: 'number', default: 0, attribute: null, internal: true },
  };

  constructor() {
    super();
    this._unsubscribe = null;
    this._handleCartUpdate = () => {
      this.updateTotals();
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this.subscribeToCart();
    this.updateTotals();
    this.render();
  }

  disconnectedCallback() {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
  }

  /**
   * Подписаться на изменения корзины
   */
  subscribeToCart() {
    const store = getCartStore();
    this._unsubscribe = store.subscribe((nextState) => {
      this.updateTotals();
    });
  }

  /**
   * Обновить итоговые суммы
   */
  updateTotals() {
    const totals = calculateTotal();
    this.setState({
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      feeAmount: totals.feeAmount,
      total: totals.total,
      itemsCount: totals.itemsCount,
    });
  }

  render() {
    const { subtotal, discountAmount, feeAmount, total, itemsCount } = this.state;

    const formattedSubtotal = formatPrice(subtotal);
    const formattedDiscount = discountAmount > 0 ? formatDiscount(discountAmount) : null;
    const formattedFee = feeAmount > 0 ? formatPrice(feeAmount) : null;
    const formattedTotal = formatPrice(total);

    this.innerHTML = cart_summary_template({
      subtotal: formattedSubtotal,
      discount: formattedDiscount,
      fee: formattedFee,
      total: formattedTotal,
      itemsCount,
    });
  }
}

customElements.define('cart-summary', CartSummary);

