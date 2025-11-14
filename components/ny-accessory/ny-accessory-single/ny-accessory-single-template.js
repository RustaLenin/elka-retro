/**
 * Ny Accessory Single Template
 * Страница новогоднего аксессуара
 */

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

function getTaxonomyUrl(taxonomySlug, termSlug, termId = null) {
  if (taxonomySlug && termSlug) {
    const filterValue = termId || termSlug;
    return `/?search=1&${taxonomySlug}=${encodeURIComponent(filterValue)}`;
  }
  return '/?search=1';
}

function renderTermLinks(terms, taxonomySlug) {
  if (!terms || terms.length === 0) {
    return '';
  }

  return terms
    .map(term => {
      const name = escapeHtml(term.name || '');
      const slug = term.slug || '';
      const id = term.id || null;
      const link = term.link || getTaxonomyUrl(taxonomySlug, slug, id);
      return `<a href="${link}" class="ny-accessory-single__taxonomy-link">${name}</a>`;
    })
    .join(', ');
}

function normalizeConditionClass(term) {
  const source = (term?.slug || term?.name || '').toString().toLowerCase().trim();
  if (!source) return '';
  if (source.includes('lux') || source.includes('люкс')) return 'lux';
  if (source.includes('good') || source.includes('хорош')) return 'good';
  if (source.includes('so-so') || source.includes('так себе') || source.includes('средн')) return 'so-so';
  if (source.includes('bad') || source.includes('плох')) return 'bad';
  return '';
}

export function ny_accessory_single_template(state) {
  const { data, loading, error, gallery = [], termsMap = {}, price, index, excerpt } = state;

  if (loading) {
    return `
      <block-loader></block-loader>
    `;
  }

  if (error) {
    return `
      <div class="ny-accessory-single__error">
        <p>${escapeHtml(error)}</p>
      </div>
    `;
  }

  if (!data) {
    return `
      <div class="ny-accessory-single__empty">
        <p>Аксессуар не найден</p>
      </div>
    `;
  }

  const title = data.title?.rendered || '';
  const content = data.content?.rendered || '';
  const priceLabel = formatPrice(price);

  const conditionTerms = termsMap.condition || [];
  const materialTerms = termsMap.material || [];
  const yearTerms = termsMap.year_of_production || [];
  const categoryTerms = termsMap.ny_category || [];
  const lotTerms = termsMap.lot_configurations || [];
  const propertyTerms = termsMap.property || [];

  const primaryCondition = conditionTerms[0] || null;
  const conditionClass = normalizeConditionClass(primaryCondition);
  const conditionValue = primaryCondition ? escapeHtml(primaryCondition.name || primaryCondition.slug || '') : '';

  const galleryAttr = escapeHtml(JSON.stringify(gallery || []));

  const tableRows = [];

  const categoryValue = renderTermLinks(categoryTerms, 'ny_category');
  if (categoryValue) {
    tableRows.push({ label: 'Категория', value: categoryValue });
  }

  const materialValue = renderTermLinks(materialTerms, 'material');
  if (materialValue) {
    tableRows.push({ label: 'Материал', value: materialValue });
  }

  if (conditionValue) {
    tableRows.push({
      label: 'Состояние',
      value: `<a href="${getTaxonomyUrl('condition', primaryCondition.slug || '', primaryCondition.id || primaryCondition.term_id || null)}" class="ny-accessory-single__taxonomy-link ${conditionClass ? `ny-accessory-single__condition ny-accessory-single__condition--${conditionClass}` : 'ny-accessory-single__condition'}">${conditionValue}</a>`
    });
  }

  const yearValue = renderTermLinks(yearTerms, 'year_of_production');
  if (yearValue) {
    tableRows.push({ label: 'Год производства', value: yearValue });
  }

  const lotValue = renderTermLinks(lotTerms, 'lot_configurations');
  if (lotValue) {
    tableRows.push({ label: 'Комплектация', value: lotValue });
  }

  return `
    <header class="ny-accessory-single__header">
      <div class="ny-accessory-single__headline">
        <h1 class="ny-accessory-single__title">${escapeHtml(title)}</h1>
        ${excerpt ? `<p class="ny-accessory-single__excerpt">${escapeHtml(excerpt)}</p>` : ''}
      </div>
    </header>

    <div class="ny-accessory-single__main">
      <div class="ny-accessory-single__main-left">
        <div class="ny-accessory-single__media">
          <ui-image-gallery images="${galleryAttr}"></ui-image-gallery>
        </div>
      </div>

      <div class="ny-accessory-single__main-right">
        ${tableRows.length > 0 ? `
        <section class="ny-accessory-single__technical">
          <h2 class="ny-accessory-single__section-title">Технические характеристики</h2>
          <table class="ny-accessory-single__properties">
            <tbody>
              ${tableRows.map(row => `
                <tr>
                  <td class="ny-accessory-single__property-label">${row.label}</td>
                  <td class="ny-accessory-single__property-value">${row.value}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </section>
        ` : ''}

        <div class="ny-accessory-single__purchase">
          ${priceLabel ? `<span class="ny-accessory-single__purchase-price">${priceLabel}</span>` : ''}
          <button class="ny-accessory-single__add-to-cart" type="button">
            <ui-icon name="cart" size="small"></ui-icon>
            <span>В корзину</span>
          </button>
        </div>
      </div>
    </div>

    ${content ? `
      <section class="ny-accessory-single__description">
        <h2 class="ny-accessory-single__section-title">Описание</h2>
        <div class="ny-accessory-single__description-content">
          ${content}
        </div>
      </section>
    ` : ''}
  `;
}




