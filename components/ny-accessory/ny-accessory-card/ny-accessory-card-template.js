/**
 * Ny Accessory Card Template
 * Карточка новогоднего аксессуара
 */
export function ny_accessory_card_template(state) {
  const {
    id,
    title,
    index,
    price,
    stock,
    condition,
    conditionSlug,
    material,
    excerpt,
    image,
    link
  } = state;

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatPrice(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
      return '';
    }
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Number(value));
  }

  function normalizeConditionSlug(cond, slug) {
    const source = (slug || cond || '').toString().toLowerCase().trim();
    if (!source) return '';
    if (source.includes('lux') || source.includes('люкс')) return 'lux';
    if (source.includes('good') || source.includes('хорош')) return 'good';
    if (source.includes('so-so') || source.includes('так себе') || source.includes('средн')) return 'so-so';
    if (source.includes('bad') || source.includes('плох')) return 'bad';
    return '';
  }

  const safeTitle = escapeHtml(title);
  const safeIndex = escapeHtml(index);
  const safeCondition = escapeHtml(condition);
  const safeMaterial = Array.isArray(material)
    ? escapeHtml(material.join(', '))
    : escapeHtml(material);
  const safeExcerpt = escapeHtml(excerpt);
  const safeImage = image ? escapeHtml(image) : '';
  const safeLink = link || '#';
  const priceLabel = formatPrice(price);
  const conditionClass = normalizeConditionSlug(condition, conditionSlug);

  return `
    <a class="ny-accessory-card__stretched-link" href="${safeLink}" aria-label="${safeTitle || 'Перейти к аксессуару'}"></a>
    <div class="ny-accessory-card__media">
      <a href="${safeLink}" class="ny-accessory-card__media-link" aria-label="${safeTitle || 'Просмотреть аксессуар'}">
        ${safeImage ? `
          <img src="${safeImage}" alt="${safeTitle}" loading="lazy" />
        ` : `
          <div class="ny-accessory-card__media-placeholder">
            <ui-icon name="image" size="large"></ui-icon>
          </div>
        `}
      </a>
      ${safeIndex ? `<span class="ny-accessory-card__badge ny-accessory-card__badge--index">${safeIndex}</span>` : ''}
      ${stock !== null && stock !== undefined && stock > 0 ? `<span class="ny-accessory-card__badge ny-accessory-card__badge--stock">Остаток: ${stock}</span>` : ''}
    </div>
    <div class="ny-accessory-card__content">
      ${safeTitle ? `
        <h3 class="ny-accessory-card__title">
          <a href="${safeLink}" class="ny-accessory-card__title-link">${safeTitle}</a>
        </h3>
      ` : ''}
      ${safeExcerpt ? `
        <p class="ny-accessory-card__excerpt">${safeExcerpt}</p>
      ` : ''}
      <div class="ny-accessory-card__meta">
        ${safeMaterial ? `
          <span class="ny-accessory-card__meta-item ny-accessory-card__meta-item--material">
            <span class="ny-accessory-card__meta-label">Материал:</span>
            <span class="ny-accessory-card__meta-value">${safeMaterial}</span>
          </span>
        ` : ''}
        ${safeCondition ? `
          <span class="ny-accessory-card__meta-item ny-accessory-card__meta-item--condition">
            <span class="ny-accessory-card__meta-label">Состояние:</span>
            <span class="ny-accessory-card__condition-value ${conditionClass ? `ny-accessory-card__condition-value--${conditionClass}` : ''}">
              ${safeCondition}
            </span>
          </span>
        ` : ''}
      </div>
      <div class="ny-accessory-card__footer">
        ${priceLabel ? `<span class="ny-accessory-card__price">${priceLabel}</span>` : ''}
        <ui-button 
          type="${state.inCart ? 'danger' : 'primary'}" 
          icon="${state.inCart ? 'trash' : 'cart'}" 
          aria-label="${state.inCart ? 'Убрать из корзины' : 'Добавить в корзину'}"
          event="ny-accessory-card:cart-click"
          class="ny-accessory-card__cart-button ${state.inCart ? 'ny-accessory-card__cart-button--in-cart' : ''}"
        ></ui-button>
      </div>
    </div>
  `;
}



