/**
 * Cart Item Template
 * Шаблон для элемента корзины
 */

// Экранируем HTML для безопасности
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Получить класс цвета для состояния (condition)
function getConditionColorClass(condition) {
  if (!condition) return '';
  
  const slug = condition.toLowerCase().trim();
  const name = condition.toLowerCase().trim();
  
  if (slug === 'lux' || slug === 'люкс' || name === 'люкс' || name.includes('люкс')) {
    return 'condition-lux';
  } else if (slug === 'good' || slug === 'хорошее' || name === 'хорошее' || name.includes('хорош')) {
    return 'condition-good';
  } else if (slug === 'so-so' || slug === 'так себе' || name === 'так себе' || name.includes('так себе') || name.includes('средн')) {
    return 'condition-so-so';
  } else if (slug === 'bad' || slug === 'плохое' || name === 'плохое' || name.includes('плох')) {
    return 'condition-bad';
  }
  
  return '';
}

export function cart_item_template(state) {
  const { id, type, title, price, image, index, condition } = state;

  const safeTitle = title ? escapeHtml(title) : '';
  const safeImage = image ? escapeHtml(image) : '';
  const safeIndex = index ? escapeHtml(index) : '';
  const safePrice = price || '';
  const safeCondition = condition ? escapeHtml(condition) : '';
  const conditionClass = getConditionColorClass(condition);

  return `
    ${safeImage ? `
      <div class="cart-item_image">
        <img src="${safeImage}" alt="${safeTitle}" loading="lazy" />
      </div>
    ` : `
      <div class="cart-item_image cart-item_image--placeholder">
        <ui-icon name="image" size="medium"></ui-icon>
      </div>
    `}
    <div class="cart-item_content">
      <div class="cart-item_main">
        <div class="cart-item_info">
          ${safeTitle ? `
            <h3 class="cart-item_title">${safeTitle}</h3>
          ` : ''}
          ${safeCondition ? `
            <div class="cart-item_condition">
              <span class="cart-item_condition-label">Состояние:</span>
              <span class="cart-item_condition-value ${conditionClass}">${safeCondition}</span>
            </div>
          ` : ''}
        </div>
        <ui-button 
          type="danger" 
          icon="trash" 
          icon-position="left"
          label="Убрать из корзины"
          class="cart-item_remove-btn"
          event="cart-item:remove-click"
        ></ui-button>
      </div>
      ${safePrice ? `
        <div class="cart-item_price-row">
          <div class="cart-item_price">${safePrice}</div>
        </div>
      ` : ''}
    </div>
  `;
}

