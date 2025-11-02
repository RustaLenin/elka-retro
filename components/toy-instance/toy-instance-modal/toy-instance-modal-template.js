/**
 * Toy Instance Modal Template
 * Шаблон для модального окна с детальной информацией об экземпляре
 */

// Экранируем HTML для безопасности
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Получить URL таксономии
function getTaxonomyUrl(taxonomySlug, termSlug) {
  if (taxonomySlug && termSlug) {
    return `/taxonomy/${taxonomySlug}/${termSlug}/`;
  }
  return '#';
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
          url: getTaxonomyUrl(taxonomySlug, termObj.slug)
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
              url: getTaxonomyUrl(taxonomySlug, found.slug)
            };
          }
        }
      }
      
      // Если не нашли, возвращаем минимальный объект
      return {
        id: term,
        name: `Term ${term}`,
        slug: '',
        url: `/?${taxonomySlug}=${term}`
      };
    } else if (typeof term === 'object' && term !== null) {
      // Уже объект термина (из Pods развернутых данных)
      return {
        id: term.id || term.term_id || '',
        name: term.name || '',
        slug: term.slug || '',
        url: term.link || getTaxonomyUrl(taxonomySlug, term.slug || '')
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
  
  // Получаем основные данные
  // В Pods REST API для toy_instance: title может быть post_title или title.rendered
  const title = data.title?.rendered || data.post_title || data.title || '';
  // content может быть post_content (строка) или content.rendered (объект с rendered)
  let content = '';
  if (data.post_content && typeof data.post_content === 'string') {
    content = data.post_content; // Прямая строка из Pods API
  } else if (data.content?.rendered && typeof data.content.rendered === 'string') {
    content = data.content.rendered; // Стандартный WP REST API формат
  } else if (typeof data.content === 'string') {
    content = data.content; // Строка напрямую
  } else if (data.content && typeof data.content === 'object') {
    // Если content это объект, пытаемся извлечь rendered или raw
    content = data.content.rendered || data.content.raw || '';
  }
  // Гарантируем, что content это строка, а не объект
  if (typeof content !== 'string') {
    content = String(content || ''); // Преобразуем в строку, если это не строка
  }
  const cost = data.cost ? parseFloat(data.cost) : (data.meta?.cost ? parseFloat(data.meta.cost) : null);
  
  // Получаем таксономии для обработки
  const taxonomyData = data._embedded || {};
  const embeddedTerms = taxonomyData['wp:term'] || [];
  
  // Создаем маппинг таксономий
  const taxonomyMap = {};
  embeddedTerms.forEach(termArray => {
    if (Array.isArray(termArray)) {
      termArray.forEach(term => {
        const taxSlug = term.taxonomy;
        if (!taxonomyMap[taxSlug]) {
          taxonomyMap[taxSlug] = [];
        }
        taxonomyMap[taxSlug].push(term);
      });
    }
  });
  
  // Обрабатываем все таксономии экземпляра
  const authenticity = formatTaxonomyValue(
    data['toy_instance_authenticity'] || data.meta?.authenticitys,
    'authenticity',
    { 'wp:term': embeddedTerms, taxonomyMap }
  );
  
  const condition = formatTaxonomyValue(
    data['toy_instance_condition'] || data.meta?.conditions,
    'condition',
    { 'wp:term': embeddedTerms, taxonomyMap }
  );
  
  const lotConfiguration = formatTaxonomyValue(
    data['toy_instance_lot_configurations'] || data.meta?.lot_configuration,
    'lot_configurations',
    { 'wp:term': embeddedTerms, taxonomyMap }
  );
  
  const property = formatTaxonomyValue(
    data['toy_instance_property'] || data.meta?.propertys,
    'property',
    { 'wp:term': embeddedTerms, taxonomyMap }
  );
  
  const tubeCondition = formatTaxonomyValue(
    data['toy_instance_tube_condition'] || data.meta?.tube_conditions,
    'tube_condition',
    { 'wp:term': embeddedTerms, taxonomyMap }
  );
  
  const paintType = formatTaxonomyValue(
    data['toy_instance_paint_type'] || data.meta?.paint_types,
    'paint_type',
    { 'wp:term': embeddedTerms, taxonomyMap }
  );
  
  const backColor = formatTaxonomyValue(
    data['toy_instance_back_color'] || data.meta?.back_colors,
    'back_color',
    { 'wp:term': embeddedTerms, taxonomyMap }
  );
  
  const colorTypes = formatTaxonomyValue(
    data['toy_instance_color_type'] || data.meta?.color_types,
    'color_type',
    { 'wp:term': embeddedTerms, taxonomyMap }
  );
  
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
  const photos = data.meta?.photos_of_the_toy_instance || [];
  
  if (photos.length > 0) {
    // Если есть _embedded медиа, используем их
    const embeddedMedia = data._embedded?.['wp:attachment'] || [];
    const featuredMedia = data._embedded?.['wp:featuredmedia'] || [];
    const allMedia = [...embeddedMedia, ...featuredMedia];
    
    galleryImages = photos.map(photoId => {
      // Может быть массив с ID или просто число
      const id = Array.isArray(photoId) && photoId.ID ? photoId.ID : photoId;
      
      // Ищем в embedded медиа
      const mediaObj = allMedia.find(m => m.id === id || m.media_details?.id === id);
      if (mediaObj) {
        return {
          url: mediaObj.source_url || '',
          thumbnail: mediaObj.media_details?.sizes?.thumbnail?.source_url || mediaObj.source_url || '',
          alt: mediaObj.alt_text || mediaObj.title?.rendered || '',
          caption: mediaObj.caption?.rendered || ''
        };
      }
      
      // Если не нашли в embedded, возвращаем только ID для загрузки через компонент
      return { id: typeof id === 'number' ? id : null, url: '', alt: '', thumbnail: '' };
    }).filter(img => img.id || img.url); // Фильтруем только валидные изображения
  }
  
  // Если нет фото из meta, но есть featured_media
  if (galleryImages.length === 0 && data.featured_media) {
    const featuredMedia = data._embedded?.['wp:featuredmedia']?.[0];
    if (featuredMedia) {
      galleryImages = [{
        url: featuredMedia.source_url || '',
        thumbnail: featuredMedia.media_details?.sizes?.thumbnail?.source_url || featuredMedia.source_url || '',
        alt: featuredMedia.alt_text || featuredMedia.title?.rendered || '',
        caption: featuredMedia.caption?.rendered || ''
      }];
    }
  }
  
  // Сериализуем изображения для атрибута JSON
  // Используем двойные кавычки и экранируем их для HTML атрибута
  const galleryImagesJson = galleryImages.length > 0 
    ? JSON.stringify(galleryImages).replace(/"/g, '&quot;') 
    : '';
  
  // Получаем массив ID для альтернативного способа передачи
  const imageIds = galleryImages
    .map(img => img.id)
    .filter(id => id !== null && id !== undefined);
  const imageIdsJson = imageIds.length > 0 
    ? JSON.stringify(imageIds).replace(/"/g, '&quot;') 
    : '';
  
  return `
    <div class="toy-instance-modal_content">
      <!-- Используем глобальный стейт для галереи (приоритет 1) -->
      <ui-image-gallery state-path="toyInstance.images" ${galleryImagesJson ? `images="${galleryImagesJson}"` : ''} ${imageIdsJson ? `image-ids="${imageIdsJson}"` : ''}></ui-image-gallery>
      
      <div class="toy-instance-modal_info">
        <div class="toy-instance-modal_header">
          ${title ? `
            <h2 class="toy-instance-modal_title">${escapeHtml(title)}</h2>
          ` : ''}
          ${content ? `
            <div class="toy-instance-modal_description">
              ${content}
            </div>
          ` : ''}
        </div>
        
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
              ${condition && condition.length > 0 ? `
                <tr>
                  <td class="property-label">Состояние</td>
                  <td class="property-value">${renderTerms(condition)}</td>
                </tr>
              ` : ''}
              ${lotConfiguration && lotConfiguration.length > 0 ? `
                <tr>
                  <td class="property-label">Комплектация лота</td>
                  <td class="property-value">${renderTerms(lotConfiguration)}</td>
                </tr>
              ` : ''}
              ${property && property.length > 0 ? `
                <tr>
                  <td class="property-label">Собственность</td>
                  <td class="property-value">${renderTerms(property)}</td>
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
              ${backColor && backColor.length > 0 ? `
                <tr>
                  <td class="property-label">Цвет фона</td>
                  <td class="property-value">${renderTerms(backColor)}</td>
                </tr>
              ` : ''}
              ${colorTypes && colorTypes.length > 0 ? `
                <tr>
                  <td class="property-label">Характер окраса</td>
                  <td class="property-value">${renderTerms(colorTypes)}</td>
                </tr>
              ` : ''}
            </tbody>
          </table>
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

