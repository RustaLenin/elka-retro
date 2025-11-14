/**
 * Cart Summary Template
 * Шаблон для итоговой информации о корзине
 */

export function cart_summary_template(state) {
  const { subtotal, discount, fee, total, itemsCount } = state;

  return `
    <div class="cart-summary">
      <h2 class="cart-summary_title">Итого</h2>
      
      <div class="cart-summary_items-count">
        Товаров в корзине: <strong>${itemsCount}</strong>
      </div>

      <div class="cart-summary_details">
        <div class="cart-summary_row">
          <span class="cart-summary_label">Сумма товаров:</span>
          <span class="cart-summary_value">${subtotal}</span>
        </div>

        ${discount ? `
          <div class="cart-summary_row cart-summary_row--discount">
            <span class="cart-summary_label">Скидка:</span>
            <span class="cart-summary_value">${discount}</span>
          </div>
        ` : ''}

        ${fee ? `
          <div class="cart-summary_row cart-summary_row--fee">
            <span class="cart-summary_label">Сбор на комплектацию:</span>
            <span class="cart-summary_value">${fee}</span>
          </div>
        ` : ''}

        <div class="cart-summary_row cart-summary_row--total">
          <span class="cart-summary_label">Сумма заказа:</span>
          <span class="cart-summary_value">${total}</span>
        </div>
      </div>
    </div>
  `;
}

