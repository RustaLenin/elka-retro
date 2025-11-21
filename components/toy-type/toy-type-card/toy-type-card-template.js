/**
 * Toy Type Card Template
 * Шаблон для карточки типа игрушки
 */

export function toy_type_card_template(state) {
  const { id, title, year, factory, rarity, rarityName, image, link, availableCount, minPrice, maxPrice } = state;
  
  // Экранируем HTML для безопасности
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  const safeTitle = title ? escapeHtml(title) : '';
  const safeYear = year ? escapeHtml(year) : '';
  const safeFactory = factory ? escapeHtml(factory) : '';
  const safeImage = image ? escapeHtml(image) : '';
  const safeLink = link || '#';
  
  // Формируем текст редкости с более подробным описанием
  const rarityLabels = {
    'often': 'Часто встречается',
    'not-often': 'Не часто встречается',
    'rarely': 'Редко встречается',
    'rare': 'Раритетный экземпляр'
  };
  const rarityLabel = rarityName || (rarity ? (rarityLabels[rarity] || rarity) : '');
  
  // Формируем информацию о цене (если есть)
  let priceInfo = '';
  if (minPrice !== null && maxPrice !== null && minPrice !== maxPrice) {
    priceInfo = `${minPrice} - ${maxPrice} ₽`;
  } else if (minPrice !== null) {
    priceInfo = `от ${minPrice} ₽`;
  }
  
  return `
    <a href="${safeLink}" class="toy-type-card_link">
      ${safeImage ? `
        <div class="toy-type-card_image">
          <img src="${safeImage}" alt="${safeTitle}" loading="lazy" />
        </div>
      ` : ''}
      <div class="toy-type-card_content">
        ${safeTitle ? `
          <h3 class="toy-type-card_title">${safeTitle}</h3>
        ` : ''}
        <div class="toy-type-card_meta">
          ${rarityLabel ? `
            <span class="toy-type-card_rarity-label">Встречаемость:</span>
            <span class="toy-type-card_rarity rarity--${rarity || ''}">${rarityLabel}</span>
          ` : ''}
        </div>
        ${priceInfo ? `
          <div class="toy-type-card_price">${priceInfo}</div>
        ` : ''}
      </div>
    </a>
    <div class="toy-type-card_actions">
      <a href="${safeLink}" class="toy-type-card_view-link">
        ${availableCount !== undefined && availableCount > 0 ? `
          <span class="toy-type-card_availability-label">
            Доступно экземпляров: <span class="toy-type-card_count-badge">${availableCount}</span>
          </span>
        ` : ''}
        <span class="toy-type-card_view-text">
          Смотреть
          <ui-icon name="chevron_right" size="small"></ui-icon>
        </span>
      </a>
    </div>
  `;
}

