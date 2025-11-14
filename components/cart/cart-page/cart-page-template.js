/**
 * Cart Page Template
 * Шаблон для страницы корзины
 */

export function cart_page_template(state) {
  const { items, isLoading, isEmpty } = state;

  if (isLoading) {
    return `
      <div class="cart-page">
        <div class="cart-page_loading">
          <ui-loader></ui-loader>
          <p>Загрузка корзины...</p>
        </div>
      </div>
    `;
  }

  if (isEmpty) {
    return `
      <div class="cart-page">
        <div class="cart-page_empty">
          <div class="cart-page_empty-content">
            <ui-icon name="cart" size="large" class="cart-page_empty-icon"></ui-icon>
            <h2 class="cart-page_empty-title">Корзина пуста</h2>
            <p class="cart-page_empty-text">Добавьте товары в корзину, чтобы продолжить покупки.</p>
            <div class="cart-page_empty-actions">
              <ui-button
                label="Перейти в каталог"
                type="primary"
                icon="chevron_right"
                icon-position="right"
                action="link"
                href="/catalog"
                class="cart-page_empty-button"
              ></ui-button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="cart-page">
      <header class="cart-page_header">
        <h1 class="cart-page_title">Корзина</h1>
      </header>

      <div class="cart-page_content">
        <div class="cart-page_main">
          <div class="cart-page_items" role="list">
            <!-- Товары будут добавлены через renderItems() -->
          </div>
          <!-- Сумма всех элементов будет добавлена через renderItemsTotal() -->
        </div>

        <aside class="cart-page_sidebar">
          <cart-summary></cart-summary>
          
          <div class="cart-page_actions">
            <ui-button 
              type="primary"
              width="full_width"
              label="Оформить заказ"
              event="cart-page:checkout-click"
              class="cart-page_checkout-btn"
            ></ui-button>
          </div>
        </aside>
      </div>
    </div>
  `;
}

