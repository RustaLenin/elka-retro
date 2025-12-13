/**
 * Cart Page Template
 * Шаблон для страницы корзины
 */

export function cart_page_template(state) {
  const { items = [], isLoading, isEmpty, showBlockingOverlay, blockingMessage, successOrder, orderId } = state;

  // Нормализуем items
  const itemsArray = Array.isArray(items) ? items : [];
  
  // КРИТИЧНО: Показываем loader ВСЕГДА, если isLoading не равен явно false
  // Это гарантирует, что пустое состояние не покажется до завершения загрузки
  // Даже если isLoading === undefined или null, показываем loader
  const isDefinitivelyLoaded = isLoading === false;
  
  if (!isDefinitivelyLoaded) {
    return `
      <div class="cart-page">
        <div class="cart-page_loading">
          <ui-loader></ui-loader>
          <p>Загрузка корзины...</p>
        </div>
      </div>
    `;
  }

  // ВАЖНО: Проверяем successOrder ПЕРЕД проверкой isEmpty
  // Если заказ успешно создан, показываем overlay с сообщением об успехе
  // Это должно иметь приоритет над empty state
  if (successOrder && orderId) {
    return `
      <div class="cart-page">
        <div class="cart-page_success-overlay">
          <div class="cart-page_success-content">
            <ui-icon name="check_circle" size="large" class="cart-page_success-icon"></ui-icon>
            <h2 class="cart-page_success-title">Заказ успешно создан!</h2>
            <p class="cart-page_success-text">
              Ваш заказ <strong>№${orderId}</strong> успешно оформлен.
            </p>
            <p class="cart-page_success-description">
              Мы отправили вам письмо с информацией о заказе. После подтверждения заказа администратором вы получите ссылку для оплаты.
            </p>
            <div class="cart-page_success-actions">
              <ui-button
                type="primary"
                label="Перейти в каталог"
                icon="chevron_right"
                icon-position="right"
                action="link"
                href="/catalog"
                class="cart-page_success-btn"
              ></ui-button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // Показываем пустое состояние ТОЛЬКО если:
  // 1. Загрузка явно завершена (isLoading === false)
  // 2. И корзина действительно пуста
  // 3. И заказ НЕ был успешно создан (successOrder !== true)
  if (isDefinitivelyLoaded && isEmpty === true && itemsArray.length === 0 && !successOrder) {
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
        <h1 class="cart-page_title">Оформление заказа</h1>
        <div class="cart-page_steps">
          <div class="cart-page_step cart-page_step--active">
            <div class="cart-page_step_number">1</div>
            <div class="cart-page_step_label">Состав заказа</div>
          </div>
          <div class="cart-page_step">
            <div class="cart-page_step_number">2</div>
            <div class="cart-page_step_label">Доставка</div>
          </div>
          <div class="cart-page_step">
            <div class="cart-page_step_number">3</div>
            <div class="cart-page_step_label">Проверка данных</div>
          </div>
        </div>
      </header>

      <div class="cart-page_content">
        <div class="cart-page_main">
          ${showBlockingOverlay ? `
            <div class="cart-page_overlay">
              <ui-loader></ui-loader>
              <p>${blockingMessage || 'Обновляем корзину...'}</p>
            </div>
          ` : ''}
          <div class="cart-page_items" role="list">
            <!-- Товары будут добавлены через renderItems() -->
          </div>
          <!-- Сумма всех элементов будет добавлена через renderItemsTotal() -->
        </div>

        <aside class="cart-page_sidebar">
          <cart-summary></cart-summary>
        </aside>
      </div>

      <footer class="cart-page_footer">
        <ui-button 
          type="primary"
          label="Далее"
          icon="chevron_right"
          icon-position="right"
          event="cart-page:checkout-click"
          class="cart-page_next-btn"
        ></ui-button>
      </footer>
    </div>
  `;
}

