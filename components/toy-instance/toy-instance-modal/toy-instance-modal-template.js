/**
 * Toy Instance Modal Template
 * Шаблон для модального окна с детальной информацией об экземпляре
 */

// Импортируем утилиту для формирования ссылок каталога
import { getCatalogTaxonomyUrl } from '../../catalog/catalog-link-utils.js';

// Экранируем HTML для безопасности
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Получить URL таксономии
// Все ссылки ведут в каталог с фильтром по таксономии
// Для экземпляров используем режим 'instance', так как фильтруем экземпляры напрямую
function getTaxonomyUrl(taxonomySlug, termSlug, termId = null) {
  if (!taxonomySlug) {
    return '/catalog/';
  }
  
  // Используем ID термина, если доступен
  // ID всегда приоритетнее, так как бэкенд работает с ID
  const termIdToUse = termId || null;
  
  if (!termIdToUse) {
    // Если ID нет, пытаемся найти его по slug в window.taxonomy_terms
    const taxonomyTerms = window.taxonomy_terms?.[taxonomySlug];
    if (taxonomyTerms && termSlug) {
      const foundTerm = Object.values(taxonomyTerms).find(
        term => term && term.slug === termSlug
      );
      if (foundTerm && foundTerm.id) {
        // Для экземпляров используем mode='instance', так как фильтруем экземпляры
        return getCatalogTaxonomyUrl(taxonomySlug, foundTerm.id, { mode: 'instance' });
      }
    }
    // Если не нашли, возвращаем базовый URL каталога
    return '/catalog/';
  }
  
  // Для экземпляров используем mode='instance', так как фильтруем экземпляры напрямую
  return getCatalogTaxonomyUrl(taxonomySlug, termIdToUse, { mode: 'instance' });
}

// Форматировать значения таксономий
// В Pods REST API таксономии могут приходить как:
// - Массив объектов терминов (data.authenticity, data.condition)
// - Число (ID термина в data.meta.authenticitys, data.meta.conditions)
// - false (если не развернуты)
function formatTaxonomyValue(terms, taxonomySlug, taxonomyData) {
  // Если false или пусто - возвращаем null
  if (!terms || terms === false) return null;
  
  // Если это число (ID термина), преобразуем в массив
  if (typeof terms === 'number') {
    terms = [terms];
  }
  
  // Если это не массив, пытаемся преобразовать
  if (!Array.isArray(terms)) {
    // Если это объект термина, оборачиваем в массив
    if (typeof terms === 'object' && terms !== null) {
      terms = [terms];
    } else {
      return null; // Неизвестный формат
    }
  }
  
  if (terms.length === 0) return null;
  
  const taxonomyMap = taxonomyData?.taxonomyMap || {};
  const termArray = taxonomyMap[taxonomySlug] || [];
  
  return terms.map(term => {
    if (typeof term === 'number') {
      // ID термина - ищем в taxonomyMap или embedded
      const termObj = termArray.find(t => {
        const tId = parseInt(t.id || t.term_id || 0, 10);
        return tId === term;
      });
      
      if (termObj) {
        return {
          id: term,
          name: termObj.name,
          slug: termObj.slug,
          url: getTaxonomyUrl(taxonomySlug, termObj.slug, termObj.id || term)
        };
      }
      
      // Fallback поиск в embedded
      const embeddedTerms = taxonomyData?.['wp:term'] || [];
      for (const arr of embeddedTerms) {
        if (Array.isArray(arr)) {
          const found = arr.find(t => {
            const tId = parseInt(t.id || t.term_id || 0, 10);
            return tId === term && t.taxonomy === taxonomySlug;
          });
          if (found) {
            return {
              id: term,
              name: found.name,
              slug: found.slug,
              url: getTaxonomyUrl(taxonomySlug, found.slug, found.id || found.term_id || term)
            };
          }
        }
      }
      
      // Если не нашли, возвращаем минимальный объект с ID
      return {
        id: term,
        name: `Term ${term}`,
        slug: '',
        url: getTaxonomyUrl(taxonomySlug, null, term)
      };
    } else if (typeof term === 'object' && term !== null) {
      // Уже объект термина (из Pods развернутых данных)
      const termId = term.id || term.term_id || null;
      return {
        id: termId,
        name: term.name || '',
        slug: term.slug || '',
        url: getTaxonomyUrl(taxonomySlug, term.slug || '', termId)
      };
    } else {
      // Неизвестный формат
      return {
        id: '',
        name: String(term),
        slug: '',
        url: '#'
      };
    }
  });
}

// Рендер кликабельных терминов
function renderTerms(terms) {
  if (!terms || terms.length === 0) return '<span class="taxonomy-empty">—</span>';
  return terms.map((term, idx) => {
    const separator = idx < terms.length - 1 ? ', ' : '';
    return `<a href="${term.url}" class="taxonomy-link">${escapeHtml(term.name)}</a>${separator}`;
  }).join('');
}

export function toy_instance_modal_template(data) {
  if (!data) return '<p>Данные не загружены</p>';
  
  const title = data.title?.rendered || data.post_title || data.title || '';
  let description = '';
  if (data.content?.rendered && typeof data.content.rendered === 'string') {
    description = data.content.rendered;
  } else if (typeof data.post_content === 'string') {
    description = data.post_content;
  } else if (typeof data.content === 'string') {
    description = data.content;
  } else if (data.content && typeof data.content === 'object') {
    description = data.content.rendered || data.content.raw || '';
  }
  if (typeof description !== 'string') {
    description = String(description || '');
  }
  const cost = data.cost ? parseFloat(data.cost) : (data.meta?.cost ? parseFloat(data.meta.cost) : null);
  
  const dataModel = window?.data_model;
  const taxonomyContext = {
    'wp:term': data._embedded?.['wp:term'] || [],
    taxonomyMap: dataModel?.taxonomyMap || {}
  };
  
  const authenticity = formatTaxonomyValue(
    data.authenticity_field,
    'authenticity',
    taxonomyContext
  );
  
  const lotConfiguration = formatTaxonomyValue(
    data.lot_configuration_field,
    'lot_configurations',
    taxonomyContext
  );
  
  const property = formatTaxonomyValue(
    data.property_field,
    'property',
    taxonomyContext
  );
  
  const condition = formatTaxonomyValue(
    data.condition_field,
    'condition',
    taxonomyContext
  );
  
  const tubeCondition = formatTaxonomyValue(
    data.tube_condition_field,
    'tube_condition',
    taxonomyContext
  );
  
  const paintType = formatTaxonomyValue(
    data.paint_type_field,
    'paint_type',
    taxonomyContext
  );
  
  const colorType = formatTaxonomyValue(
    data.color_type_field,
    'color_type',
    taxonomyContext
  );
  
  const backColor = formatTaxonomyValue(
    data.back_color_field,
    'back_color',
    taxonomyContext
  );

  const size = data.size_field || data.meta?.size_field || '';
  
  // Форматируем цену
  let formattedPrice = '';
  if (cost !== null && cost !== undefined) {
    formattedPrice = new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(cost);
  }
  
  // Получаем изображения экземпляра для галереи
  let galleryImages = [];
  const seenImageIds = new Set();
  const attachments = data._embedded?.['wp:attachment'] || [];
  const featuredMedia = data._embedded?.['wp:featuredmedia']?.[0] || null;
  const photosRaw = data.photos_of_the_toy_instance || data.meta?.photos_of_the_toy_instance || [];
  
  function addMedia(media) {
    if (!media) return;
    const id = media.id || media.ID || media.media_details?.id || null;
    if (id && seenImageIds.has(Number(id))) {
      return;
    }
    if (id) {
      seenImageIds.add(Number(id));
    }
    galleryImages.push({
      id: id ? Number(id) : null,
      url: media.source_url || media.guid?.rendered || '',
      thumbnail: media.media_details?.sizes?.thumbnail?.source_url || media.source_url || media.guid?.rendered || '',
      alt: media.alt_text || media.title?.rendered || media.post_title || '',
      caption: media.caption?.rendered || media.post_excerpt || ''
    });
  }
  
  if (featuredMedia) {
    addMedia(featuredMedia);
  }
  
  photosRaw.forEach(photo => {
    const id = parseInt(photo?.ID || photo?.id || photo, 10);
    if (!id || seenImageIds.has(id)) return;
    const mediaObj = attachments.find(m => {
      const mediaId = m.id || m.media_details?.id || parseInt(m.ID || 0, 10);
      return mediaId === id;
    });
    if (mediaObj) {
      addMedia(mediaObj);
    } else {
      const fallbackUrl = photo?.guid?.rendered || photo?.guid || '';
      if (fallbackUrl) {
        seenImageIds.add(id);
        galleryImages.push({
          id,
          url: fallbackUrl,
          thumbnail: fallbackUrl,
          alt: photo?.post_title || '',
          caption: photo?.post_excerpt || ''
        });
      } else {
        seenImageIds.add(id);
      }
    }
  });
  
  if (!galleryImages.length && featuredMedia) {
    addMedia(featuredMedia);
  }
  
  const galleryImagesJson = galleryImages.length > 0 
    ? JSON.stringify(galleryImages).replace(/"/g, '&quot;') 
    : '';
  
  const imageIdsJson = seenImageIds.size > 0 
    ? JSON.stringify(Array.from(seenImageIds)).replace(/"/g, '&quot;')
    : '';
  
  return `
    <div class="toy-instance-modal_content">
      <div class="toy-instance-modal_main">
        <div class="toy-instance-modal_gallery">
          <ui-image-gallery state-path="toyInstance.images" ${galleryImagesJson ? `images="${galleryImagesJson}"` : ''} ${imageIdsJson ? `image-ids="${imageIdsJson}"` : ''} fullscreen-hint></ui-image-gallery>
          ${description && description.trim() ? `
            <div class="toy-instance-modal_description">
              <div class="toy-instance-modal_description-content">
                ${description}
              </div>
            </div>
          ` : ''}
        </div>
        <div class="toy-instance-modal_details">
          <div class="toy-instance-modal_properties">
            <h3 class="toy-instance-modal_section-title">Характеристики</h3>
            <table class="toy-instance-modal_table">
              <tbody>
                ${authenticity && authenticity.length > 0 ? `
                  <tr>
                    <td class="property-label">Аутентичность</td>
                    <td class="property-value">${renderTerms(authenticity)}</td>
                  </tr>
                ` : ''}
                ${lotConfiguration && lotConfiguration.length > 0 ? `
                  <tr>
                    <td class="property-label">Комплектация лота</td>
                    <td class="property-value">${renderTerms(lotConfiguration)}</td>
                  </tr>
                ` : ''}
                ${condition && condition.length > 0 ? `
                  <tr>
                    <td class="property-label">Состояние</td>
                    <td class="property-value">${renderTerms(condition)}</td>
                  </tr>
                ` : ''}
                ${tubeCondition && tubeCondition.length > 0 ? `
                  <tr>
                    <td class="property-label">Состояние трубочки</td>
                    <td class="property-value">${renderTerms(tubeCondition)}</td>
                  </tr>
                ` : ''}
                ${paintType && paintType.length > 0 ? `
                  <tr>
                    <td class="property-label">Тип окраса</td>
                    <td class="property-value">${renderTerms(paintType)}</td>
                  </tr>
                ` : ''}
                ${colorType && colorType.length > 0 ? `
                  <tr>
                    <td class="property-label">Характер окраса</td>
                    <td class="property-value">${renderTerms(colorType)}</td>
                  </tr>
                ` : ''}
                ${backColor && backColor.length > 0 ? `
                  <tr>
                    <td class="property-label">Цвет фона</td>
                    <td class="property-value">${renderTerms(backColor)}</td>
                  </tr>
                ` : ''}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    
    <div class="toy-instance-modal_footer">
      ${formattedPrice ? `
        <div class="toy-instance-modal_price">${formattedPrice}</div>
      ` : ''}
      <button class="toy-instance-modal_buy-btn" type="button" data-instance-id="${data.id || ''}">
        Добавить в корзину
      </button>
    </div>
  `;
}

