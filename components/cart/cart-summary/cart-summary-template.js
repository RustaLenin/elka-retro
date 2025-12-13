/**
 * Cart Summary Template
 * Шаблон для итоговой информации о корзине
 */

export function cart_summary_template(state) {
  const { subtotal, discount, fee, deliveryCost, total, itemsCount } = state;

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
            <span 
              class="cart-summary_label cart-summary_label--clickable"
              data-hint="При единовременной покупке на сумму менее 3500 руб. к стоимости покупки автоматически добавляется сбор на комплектацию в размере 350 руб."
              data-hint-trigger="click"
              data-hint-placement="top"
            >
              <span class="cart-summary_label-text">Сбор на комплектацию:</span>
              <ui-icon name="info" size="small" class="cart-summary_label-icon"></ui-icon>
            </span>
            <span class="cart-summary_value">${fee}</span>
          </div>
        ` : ''}

        ${deliveryCost ? `
          <div class="cart-summary_row cart-summary_row--delivery">
            <span class="cart-summary_label">Доставка:</span>
            <span class="cart-summary_value">${deliveryCost}</span>
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

