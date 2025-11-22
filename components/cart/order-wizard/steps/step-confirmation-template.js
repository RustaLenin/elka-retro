/**
 * Step Confirmation Template
 * Шаблон для шага подтверждения заказа
 */

function formatPrice(price) {
  if (typeof price !== 'number') return '0 ₽';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

export function step_confirmation_template(state) {
  const { orderData, isSubmitting, orderId, error, success } = state;

  if (success && orderId) {
    return `
      <div class="step-confirmation">
        <div class="step-confirmation_success">
          <ui-icon name="check_circle" size="large" class="step-confirmation_success-icon"></ui-icon>
          <h3 class="step-confirmation_success-title">Заказ успешно создан!</h3>
          <p class="step-confirmation_success-text">
            Номер вашего заказа: <strong>#${orderId}</strong>
          </p>
          <p class="step-confirmation_success-description">
            Подробности заказа отправлены на ваш email.
          </p>
          <a href="/" class="step-confirmation_success-link">
            Вернуться на главную
          </a>
        </div>
      </div>
    `;
  }

  if (!orderData || !orderData.cart) {
    return `
      <div class="step-confirmation">
        <div class="step-confirmation_error">
          <p>Ошибка: данные заказа не найдены</p>
        </div>
      </div>
    `;
  }

  const { cart, personal, logistics, payment, totals } = orderData;

  return `
    <div class="step-confirmation">
      <!-- Overlay теперь на уровне order-wizard, здесь не нужен -->
      <div class="step-confirmation_content">
        <h3 class="step-confirmation_title">Подтверждение заказа</h3>
        <p class="step-confirmation_description">
          Проверьте данные заказа и подтвердите оформление
        </p>

        <div class="step-confirmation_sections">
          ${personal ? `
            <div class="step-confirmation_section">
              <h4 class="step-confirmation_section-title">Личные данные</h4>
              <div class="step-confirmation_section-content">
                <p><strong>Email:</strong> ${personal.email || ''}</p>
                <p><strong>Телефон:</strong> ${personal.phone || ''}</p>
                ${personal.first_name || personal.last_name ? `
                  <p><strong>Имя:</strong> ${personal.first_name || ''} ${personal.last_name || ''}</p>
                ` : ''}
              </div>
            </div>
          ` : ''}

          ${logistics ? `
            <div class="step-confirmation_section">
              <h4 class="step-confirmation_section-title">Доставка</h4>
              <div class="step-confirmation_section-content">
                <p><strong>Способ:</strong> ${logistics.delivery_method === 'courier' ? 'Курьером' : logistics.delivery_method === 'pickup' ? 'Самовывоз' : 'Почта России'}</p>
                ${logistics.address ? `
                  <p><strong>Адрес:</strong> ${logistics.address.country || ''}, ${logistics.address.region || ''}, ${logistics.address.city || ''}, ${logistics.address.street || ''}</p>
                  ${logistics.address.postal_code ? `<p><strong>Индекс:</strong> ${logistics.address.postal_code}</p>` : ''}
                ` : ''}
              </div>
            </div>
          ` : ''}

          ${payment ? `
            <div class="step-confirmation_section">
              <h4 class="step-confirmation_section-title">Оплата</h4>
              <div class="step-confirmation_section-content">
                <p><strong>Способ:</strong> ${payment.payment_method === 'bank_transfer' ? 'Банковский перевод' : payment.payment_method === 'card' ? 'Банковская карта' : 'Наличными при получении'}</p>
              </div>
            </div>
          ` : ''}

          ${totals ? `
            <div class="step-confirmation_section step-confirmation_section--totals">
              <h4 class="step-confirmation_section-title">Итого</h4>
              <div class="step-confirmation_section-content">
                <div class="step-confirmation_totals">
                  <div class="step-confirmation_total-row">
                    <span>Сумма товаров:</span>
                    <span>${formatPrice(totals.subtotal)}</span>
                  </div>
                  ${totals.discount > 0 ? `
                    <div class="step-confirmation_total-row step-confirmation_total-row--discount">
                      <span>Скидка:</span>
                      <span>-${formatPrice(totals.discount)}</span>
                    </div>
                  ` : ''}
                  ${totals.fee > 0 ? `
                    <div class="step-confirmation_total-row">
                      <span>Сбор на комплектацию:</span>
                      <span>${formatPrice(totals.fee)}</span>
                    </div>
                  ` : ''}
                  <div class="step-confirmation_total-row step-confirmation_total-row--final">
                    <span><strong>Сумма заказа:</strong></span>
                    <span><strong>${formatPrice(totals.total)}</strong></span>
                  </div>
                </div>
              </div>
            </div>
          ` : ''}
        </div>

        ${error ? `
          <div class="step-confirmation_error">
            <p>${error}</p>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

