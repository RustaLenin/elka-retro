/**
 * Order Card Template
 * Шаблон карточки заказа для истории заказов
 */

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch (e) {
    return dateString;
  }
}

function formatPrice(price) {
  if (price === null || price === undefined) return '';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
}

function getStatusLabel(status) {
  const statuses = {
    'awaiting_payment': 'Ожидает оплаты',
    'collecting': 'Собирается',
    'shipped': 'Отправлен',
    'closed': 'Закрыт',
    'clarification': 'Уточнение у клиента',
    'cancelled': 'Отменён'
  };
  return statuses[status] || status;
}

function getStatusClass(status) {
  const classes = {
    'awaiting_payment': 'order-card__status--awaiting',
    'collecting': 'order-card__status--collecting',
    'shipped': 'order-card__status--shipped',
    'closed': 'order-card__status--closed',
    'clarification': 'order-card__status--clarification',
    'cancelled': 'order-card__status--cancelled'
  };
  return classes[status] || '';
}

function canCancelOrder(status) {
  // Можно отменить только заказы, которые еще не отправлены и не закрыты
  return status === 'awaiting_payment' || status === 'collecting' || status === 'clarification';
}

function getDeliveryMethodLabel(method) {
  const methods = {
    'courier': 'Курьером',
    'pickup': 'Самовывоз',
    'post': 'Почта России'
  };
  return methods[method] || method;
}

function getPaymentMethodLabel(method) {
  const methods = {
    'bank_transfer': 'Банковский перевод',
    'card': 'Банковская карта',
    'cash': 'Наличными при получении'
  };
  return methods[method] || method;
}

export function renderOrderCardTemplate(state) {
  const { order } = state;
  
  if (!order) {
    return '<div class="order-card order-card--empty">Заказ не найден</div>';
  }

  const orderNumber = escapeHtml(order.order_number || '');
  const status = order.status || 'awaiting_payment';
  const statusLabel = getStatusLabel(status);
  const statusClass = getStatusClass(status);
  const createdDate = formatDate(order.created_at);
  const totalAmount = formatPrice(order.total_amount);
  const subtotal = formatPrice(order.subtotal);
  const discountAmount = order.discount_amount ? formatPrice(order.discount_amount) : null;
  const feeAmount = order.fee_amount ? formatPrice(order.fee_amount) : null;
  const deliveryMethod = getDeliveryMethodLabel(order.delivery_method);
  const deliveryAddress = escapeHtml(order.delivery_address || '');
  const paymentMethod = getPaymentMethodLabel(order.payment_method);
  const items = order.items || [];
  const itemsCount = items.length;

  // Подсчет товаров по типам
  const toyInstancesCount = items.filter(item => item.type === 'toy_instance').length;
  const accessoriesCount = items.filter(item => item.type === 'ny_accessory').length;

  return `
    <div class="order-card">
      <header class="order-card__header">
        <div class="order-card__header-top">
          <div class="order-card__number">
            <span class="order-card__number-label">Заказ</span>
            <span class="order-card__number-value">${orderNumber}</span>
          </div>
          <div class="order-card__status ${statusClass}">
            ${escapeHtml(statusLabel)}
          </div>
        </div>
        <div class="order-card__date">
          ${createdDate}
        </div>
      </header>

      ${itemsCount > 0 ? `
        <div class="order-card__items">
          <div class="order-card__items-header">
            <h3 class="order-card__items-title">Товары (${itemsCount})</h3>
          </div>
          <div class="order-card__items-list">
            ${items.map((item, index) => `
              <div class="order-card__item">
                <div class="order-card__item-info">
                  <span class="order-card__item-type">
                    ${item.type === 'toy_instance' ? 'Игрушка' : 'Аксессуар'}
                  </span>
                  ${item.title ? `
                    <span class="order-card__item-title">${escapeHtml(item.title)}</span>
                  ` : `
                    <span class="order-card__item-id">ID: ${item.id}</span>
                  `}
                </div>
                ${item.price !== null && item.price !== undefined ? `
                  <div class="order-card__item-price">${formatPrice(item.price)}</div>
                ` : ''}
              </div>
            `).join('')}
          </div>
          ${toyInstancesCount > 0 && accessoriesCount > 0 ? `
            <div class="order-card__items-summary">
              <span>Игрушек: ${toyInstancesCount}, Аксессуаров: ${accessoriesCount}</span>
            </div>
          ` : ''}
        </div>
      ` : ''}

      <div class="order-card__details">
        <div class="order-card__detail">
          <span class="order-card__detail-label">Доставка:</span>
          <span class="order-card__detail-value">${deliveryMethod}${deliveryAddress ? `, ${deliveryAddress}` : ''}</span>
        </div>
        <div class="order-card__detail">
          <span class="order-card__detail-label">Оплата:</span>
          <span class="order-card__detail-value">${paymentMethod}</span>
        </div>
      </div>

      <div class="order-card__totals">
        ${subtotal ? `
          <div class="order-card__total-row">
            <span class="order-card__total-label">Товары:</span>
            <span class="order-card__total-value">${subtotal}</span>
          </div>
        ` : ''}
        ${discountAmount ? `
          <div class="order-card__total-row order-card__total-row--discount">
            <span class="order-card__total-label">Скидка:</span>
            <span class="order-card__total-value">-${discountAmount}</span>
          </div>
        ` : ''}
        ${feeAmount ? `
          <div class="order-card__total-row">
            <span class="order-card__total-label">Комплектация:</span>
            <span class="order-card__total-value">${feeAmount}</span>
          </div>
        ` : ''}
        ${totalAmount ? `
          <div class="order-card__total-row order-card__total-row--final">
            <span class="order-card__total-label">Итого:</span>
            <span class="order-card__total-value">${totalAmount}</span>
          </div>
        ` : ''}
      </div>

      ${canCancelOrder(status) ? `
        <div class="order-card__actions">
          <ui-button 
            type="ghost" 
            label="Отменить заказ" 
            icon="x"
            class="order-card__action order-card__action--cancel"
            data-app-action="order-card:cancel"
            data-order-id="${order.id}"
          ></ui-button>
        </div>
      ` : ''}
    </div>
  `;
}

