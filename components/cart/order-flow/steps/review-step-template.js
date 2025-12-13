/**
 * Review Step Template
 * Шаблон для шага проверки данных
 */

export function review_step_template(state) {
  const {
    orderData,
    cartItems,
    cartTotals,
    comment,
    preferredCommunication,
    promoCode,
    isSubmitting,
    isAuthorizing,
    error,
    errorMessage,
    isAuthorized,
    getDeliveryMethodLabel,
    formatPrice,
  } = state;

  // Подсчитываем товары по типам
  const toyInstances = cartItems.filter(item => item.type === 'toy_instance');
  const nyAccessories = cartItems.filter(item => item.type === 'ny_accessory');

  // Получаем данные доставки
  const delivery = orderData?.delivery || {};
  const deliveryMethod = delivery.delivery_method || '';
  const deliveryData = delivery.delivery_data || {};

  // Рассчитываем итоговую стоимость
  const subtotal = cartTotals.subtotal || 0;
  const discount = cartTotals.discount || 0;
  const fee = cartTotals.fee || 0;
  const deliveryCost = 0; // Стоимость доставки будет рассчитана позже
  const total = subtotal - discount + fee + deliveryCost;

  return `
    <div class="review-step">
      ${isAuthorizing ? `
        <div class="review-step_overlay">
          <div class="review-step_authorizing">
            <ui-loader size="large"></ui-loader>
            <h3 class="review-step_authorizing-title">Авторизуемся...</h3>
            <p class="review-step_authorizing-message">Пожалуйста, подождите, мы завершаем процесс авторизации</p>
          </div>
        </div>
      ` : isSubmitting ? `
        <div class="review-step_overlay">
          ${error ? `
            <div class="review-step_error">
              <ui-icon name="error" size="large" class="review-step_error-icon"></ui-icon>
              <h3 class="review-step_error-title">Ошибка при создании заказа</h3>
              <p class="review-step_error-message">${errorMessage || 'Не удалось создать заказ'}</p>
              <p class="review-step_error-hint">Проверьте данные и попробуйте снова</p>
              <div class="review-step_error-actions">
                <ui-button
                  type="primary"
                  label="Попробовать снова"
                  icon="refresh"
                  icon-position="left"
                  event="review-step:retry"
                  class="review-step_retry-btn"
                ></ui-button>
                <ui-button
                  type="secondary"
                  label="Вернуться назад"
                  icon="chevron_left"
                  icon-position="left"
                  event="order-flow:step:prev"
                  class="review-step_back-btn"
                ></ui-button>
              </div>
            </div>
          ` : `
            <div class="review-step_loader">
              <ui-loader></ui-loader>
              <p class="review-step_loader-text">Создание заказа...</p>
              <p class="review-step_loader-hint">Пожалуйста, не закрывайте страницу</p>
            </div>
          `}
        </div>
      ` : ''}

      <div class="review-step_content">
        <div class="review-step_section">
          <h3 class="review-step_section-title">
            <ui-icon name="shopping_cart" size="small"></ui-icon>
            Товары в заказе
          </h3>
          <div class="review-step_items-summary">
            <div class="review-step_items-count">
              <span class="review-step_items-count-label">Всего товаров:</span>
              <span class="review-step_items-count-value">${cartItems.length}</span>
            </div>
            ${toyInstances.length > 0 ? `
              <div class="review-step_items-type">
                <span class="review-step_items-type-label">Экземпляры игрушек:</span>
                <span class="review-step_items-type-value">${toyInstances.length}</span>
              </div>
            ` : ''}
            ${nyAccessories.length > 0 ? `
              <div class="review-step_items-type">
                <span class="review-step_items-type-label">Новогодние аксессуары:</span>
                <span class="review-step_items-type-value">${nyAccessories.length}</span>
              </div>
            ` : ''}
          </div>
        </div>

        ${deliveryMethod ? `
          <div class="review-step_section">
            <h3 class="review-step_section-title">
              <ui-icon name="local_shipping" size="small"></ui-icon>
              Доставка
            </h3>
            <div class="review-step_delivery-info">
              <div class="review-step_delivery-method">
                <span class="review-step_delivery-label">Способ доставки:</span>
                <span class="review-step_delivery-value">${getDeliveryMethodLabel(deliveryMethod)}</span>
              </div>
              ${deliveryData.address ? `
                <div class="review-step_delivery-address">
                  <span class="review-step_delivery-label">Адрес:</span>
                  <span class="review-step_delivery-value">${deliveryData.address}</span>
                </div>
              ` : ''}
              ${deliveryData.city ? `
                <div class="review-step_delivery-city">
                  <span class="review-step_delivery-label">Город:</span>
                  <span class="review-step_delivery-value">${deliveryData.city}</span>
                </div>
              ` : ''}
              ${deliveryData.firstName || deliveryData.name ? `
                <div class="review-step_delivery-name">
                  <span class="review-step_delivery-label">Имя получателя:</span>
                  <span class="review-step_delivery-value">${deliveryData.firstName || deliveryData.name}</span>
                </div>
              ` : ''}
              ${deliveryData.phone ? `
                <div class="review-step_delivery-phone">
                  <span class="review-step_delivery-label">Телефон:</span>
                  <span class="review-step_delivery-value">${deliveryData.phone}</span>
                </div>
              ` : ''}
            </div>
          </div>
        ` : ''}

        <div class="review-step_section">
          <h3 class="review-step_section-title">Предпочитаемые способы связи</h3>
          <div class="review-step_preferred-communication-field">
            <textarea
              class="review-step_preferred-communication"
              placeholder="Оставьте ссылку, номер на удобные вам способы связи (Телефон, Telegram, WhatsApp, VK...) и комментарий в свободной форме"
              rows="3"
            >${preferredCommunication || ''}</textarea>
          </div>
        </div>

        <div class="review-step_section">
          <h3 class="review-step_section-title">Промокод</h3>
          <div class="review-step_promo-code-field">
            <input
              type="text"
              class="review-step_promo-code"
              placeholder="Впишите номер промокода в поле, если он у вас есть"
              value="${promoCode || ''}"
            />
            <p class="review-step_promo-code-hint">Промокоды обрабатываются администраторами вручную после получения заказа</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

