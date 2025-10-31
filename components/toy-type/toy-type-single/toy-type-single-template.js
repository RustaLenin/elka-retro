/**
 * Toy Type Single Template
 * Шаблон для отображения страницы типа игрушки
 */

// Экранируем HTML для безопасности (для текста)
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Получить URL таксономии для кликабельности
// WordPress использует стандартный формат для таксономий через rewrite rules
// Формат зависит от настроек, но обычно: /{taxonomy_slug}/{term_slug}/
function getTaxonomyUrl(taxonomySlug, termSlug) {
  // WordPress обычно использует формат без префикса taxonomy/
  // Для кастомных таксономий может быть другой формат
  // В MVP используем стандартный формат WP
  if (taxonomySlug && termSlug) {
    // Для кастомных таксономий типа toy_type_* используем формат без префикса toy_type_
    const cleanSlug = taxonomySlug.replace(/^toy_type_/, '');
    return `/${cleanSlug}/${termSlug}/`;
  }
  return '#';
}

// Форматировать значения таксономий для отображения
function formatTaxonomyValue(terms, taxonomySlug, taxonomyData) {
  // Если нет данных, возвращаем null
  if (!terms) return null;
  
  // Если это не массив, преобразуем в массив
  const termsArray = Array.isArray(terms) ? terms : [terms];
  
  // Если массив пустой, возвращаем null
  if (termsArray.length === 0) return null;
  
  // Используем taxonomyMap для быстрого поиска
  const taxonomyMap = taxonomyData?.taxonomyMap || {};
  const termArray = taxonomyMap[taxonomySlug] || [];
  
  return termsArray.map(term => {
    if (typeof term === 'number') {
      // Это ID, ищем в taxonomyMap
      const termObj = termArray.find(t => t.id === term || t.term_id === term);
      
      if (termObj) {
        return {
          id: term,
          name: termObj.name,
          slug: termObj.slug,
          url: getTaxonomyUrl(taxonomySlug, termObj.slug)
        };
      }
      
      // Fallback: если не нашли в taxonomyMap, ищем во всех терминах
      const embeddedTerms = taxonomyData?.['wp:term'] || [];
      for (const arr of embeddedTerms) {
        if (Array.isArray(arr)) {
          const found = arr.find(t => (t.id === term || t.term_id === term) && t.taxonomy === taxonomySlug);
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
      
      // Если совсем не нашли, формируем базовый объект
      return {
        id: term,
        name: `Term ${term}`,
        slug: '',
        url: `/?${taxonomySlug}=${term}`
      };
    } else {
      // Уже объект с данными (если REST вернул полные объекты)
      return {
        id: term.id || term.term_id,
        name: term.name,
        slug: term.slug,
        url: term.link || getTaxonomyUrl(taxonomySlug, term.slug)
      };
    }
  });
}

export function toy_type_single_template(state) {
  const { data, loading, error, instances } = state;
  
  // Если загрузка - показываем loader
  if (loading) {
    return `
      <div class="toy-type-single_content">
        <block-loader></block-loader>
      </div>
    `;
  }
  
  // Если ошибка
  if (error) {
    return `
      <div class="toy-type-single_content">
        <div class="toy-type-single_error">
          <p>Ошибка загрузки типа игрушки: ${escapeHtml(error)}</p>
        </div>
      </div>
    `;
  }
  
  // Если данных нет
  if (!data) {
    return `
      <div class="toy-type-single_content">
        <div class="toy-type-single_empty">
          <p>Тип игрушки не найден</p>
        </div>
      </div>
    `;
  }
  
  // Получаем данные
  const title = data.title?.rendered || '';
  const content = data.content?.rendered || '';
  
  // Получаем изображение - MVP: одна картинка 16:9
  // TODO: В будущем здесь будет галерея картинок (toy_type_photos)
  let imageUrl = '';
  
  // Сначала пробуем получить из toy_type_photos (первая фотография)
  const photos = data.meta?.toy_type_photos || [];
  if (photos.length > 0 && photos[0]) {
    // В REST API с _embed=1 фотографии могут быть в _embedded
    // Или нужно получить URL через Media API
    // Пока пробуем через featured_media или используем ID для формирования URL
    const photoId = Array.isArray(photos[0]) ? photos[0].ID : photos[0];
    if (typeof photoId === 'number') {
      // Пробуем найти в _embedded media
      const embeddedMedia = data._embedded?.['wp:attachment'] || [];
      const photoMedia = embeddedMedia.find(m => m.id === photoId);
      if (photoMedia) {
        imageUrl = photoMedia.source_url || photoMedia.media_details?.sizes?.large?.source_url || '';
      } else {
        // Fallback: формируем URL через стандартный формат WP Media
        imageUrl = `/wp-json/wp/v2/media/${photoId}`;
      }
    }
  }
  
  // Если не нашли в toy_type_photos, используем featured_media
  if (!imageUrl && data.featured_media) {
    if (data._embedded?.['wp:featuredmedia']?.[0]) {
      imageUrl = data._embedded['wp:featuredmedia'][0].source_url || 
                 data._embedded['wp:featuredmedia'][0].media_details?.sizes?.large?.source_url || '';
    }
    if (!imageUrl && typeof data.featured_media === 'number') {
      // Fallback: формируем URL
      imageUrl = `/wp-json/wp/v2/media/${data.featured_media}`;
    }
  }
  
  // Получаем категории для хлебных крошек (берем первую или самую глубокую)
  const categories = data['toy_type_category-of-toys'] || [];
  const categoryId = categories.length > 0 ? categories[categories.length - 1] : null;
  
  // Получаем таксономии для таблицы Technical Information
  // В Pods REST API таксономии приходят как массивы полных объектов терминов
  // в полях вида: occurrences, year_of_productions, materials, sizes, glass_thicknes, mounting_types
  
  // Occurrence (single pick) - приходит как массив объектов в поле 'occurrences'
  // Или как массив ID в поле 'occurrence'
  const occurrenceTerms = data.occurrences || [];
  const occurrences = occurrenceTerms.map(term => ({
    id: term.id || term.term_id,
    name: term.name,
    slug: term.slug,
    url: term.link || getTaxonomyUrl('occurrence', term.slug)
  }));
  
  // Years of Production (multi pick)
  const yearTerms = data.year_of_productions || [];
  const years = yearTerms.map(term => ({
    id: term.id || term.term_id,
    name: term.name,
    slug: term.slug,
    url: term.link || getTaxonomyUrl('year_of_production', term.slug)
  }));
  
  // Material (multi pick)
  const materialTerms = data.materials || [];
  const materials = materialTerms.map(term => ({
    id: term.id || term.term_id,
    name: term.name,
    slug: term.slug,
    url: term.link || getTaxonomyUrl('material', term.slug)
  }));
  
  // Size (multi pick)
  const sizeTerms = data.sizes || [];
  const sizes = sizeTerms.map(term => ({
    id: term.id || term.term_id,
    name: term.name,
    slug: term.slug,
    url: term.link || getTaxonomyUrl('size', term.slug)
  }));
  
  // Glass Thickness (multi pick) - обратите внимание: в ответе поле называется 'glass_thicknes' (без 's' на конце 'thickness')
  const glassThicknessTerms = data.glass_thicknes || data.glass_thickness || [];
  const glassThickness = glassThicknessTerms.map(term => ({
    id: term.id || term.term_id,
    name: term.name,
    slug: term.slug,
    url: term.link || getTaxonomyUrl('glass_thickness', term.slug)
  }));
  
  // Mounting Type (multi pick)
  const mountingTypeTerms = data.mounting_types || [];
  const mountingTypes = mountingTypeTerms.map(term => ({
    id: term.id || term.term_id,
    name: term.name,
    slug: term.slug,
    url: term.link || getTaxonomyUrl('mounting_type', term.slug)
  }));
  
  // Функция для рендера кликабельных терминов
  function renderTerms(terms) {
    if (!terms || terms.length === 0) return '<span class="taxonomy-empty">—</span>';
    return terms.map((term, idx) => {
      const separator = idx < terms.length - 1 ? ', ' : '';
      const safeName = escapeHtml(term.name || '');
      const safeUrl = term.url || '#';
      return `<a href="${safeUrl}" class="taxonomy-link">${safeName}</a>${separator}`;
    }).join('');
  }
  
  // Проверяем, есть ли хотя бы одна строка для таблицы
  const hasTechnicalInfo = (occurrences && occurrences.length > 0) ||
                           (years && years.length > 0) ||
                           (materials && materials.length > 0) ||
                           (sizes && sizes.length > 0) ||
                           (glassThickness && glassThickness.length > 0) ||
                           (mountingTypes && mountingTypes.length > 0);

  return `
    <div class="toy-type-single_content">
      ${categoryId ? `
        <category-breadcrumbs category-id="${categoryId}"></category-breadcrumbs>
      ` : ''}
      
      ${title ? `
        <header class="toy-type-single_header">
          <h1 class="toy-type-single_title">${title}</h1>
        </header>
      ` : ''}
      
      <div class="toy-type-single_main">
        <div class="toy-type-single_main-left">
          ${imageUrl ? `
            <div class="toy-type-single_image">
              <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" loading="lazy" />
            </div>
          ` : ''}
        </div>
        
        <div class="toy-type-single_main-right">
          ${content ? `
            <div class="toy-type-single_body">
              <section class="toy-type-single_description">
                <h2 class="toy-type-single_section-title">Description</h2>
                <div class="toy-type-single_description-content">
                  ${content}
                </div>
              </section>
            </div>
          ` : ''}
          
          ${hasTechnicalInfo ? `
            <div class="toy-type-single_technical">
              <h2 class="toy-type-single_section-title">Technical Information</h2>
              <table class="toy-type-single_properties">
                <tbody>
                  ${occurrences && occurrences.length > 0 ? `
                    <tr>
                      <td class="property-label">Occurrence Rate</td>
                      <td class="property-value">${renderTerms(occurrences)}</td>
                    </tr>
                  ` : ''}
                  ${years && years.length > 0 ? `
                    <tr>
                      <td class="property-label">Years of Production</td>
                      <td class="property-value">${renderTerms(years)}</td>
                    </tr>
                  ` : ''}
                  ${materials && materials.length > 0 ? `
                    <tr>
                      <td class="property-label">Material</td>
                      <td class="property-value">${renderTerms(materials)}</td>
                    </tr>
                  ` : ''}
                  ${sizes && sizes.length > 0 ? `
                    <tr>
                      <td class="property-label">Size</td>
                      <td class="property-value">${renderTerms(sizes)}</td>
                    </tr>
                  ` : ''}
                  ${glassThickness && glassThickness.length > 0 ? `
                    <tr>
                      <td class="property-label">Thickness</td>
                      <td class="property-value">${renderTerms(glassThickness)}</td>
                    </tr>
                  ` : ''}
                  ${mountingTypes && mountingTypes.length > 0 ? `
                    <tr>
                      <td class="property-label">Mounting Type</td>
                      <td class="property-value">${renderTerms(mountingTypes)}</td>
                    </tr>
                  ` : ''}
                </tbody>
              </table>
            </div>
          ` : ''}
        </div>
      </div>
      
      ${instances && instances.length > 0 ? `
        <div class="toy-type-single_instances">
          <h2 class="toy-type-single_section-title">Доступные экземпляры</h2>
          <div class="toy-instance-cards-container">
            ${instances.map(instance => {
              // Получаем данные экземпляра
              // В Pods REST API структура: instance.id, instance.post_title, instance.post_content
              const instanceId = instance.id || instance.ID;
              const instanceTitle = instance.post_title || instance.title?.rendered || instance.title || '';
              // Цена приходит в корне как cost, не в meta
              const instancePrice = instance.cost ? parseFloat(instance.cost) : (instance.meta?.cost ? parseFloat(instance.meta.cost) : null);
              
              // Получаем изображение экземпляра
              // В Pods _thumbnail_id приходит как массив, первый элемент - ID изображения
              // URL изображения загружается в JS и сохраняется в _thumbnail_url
              let instanceImage = instance._thumbnail_url || '';
              
              // Fallback: пробуем получить из photos_of_the_toy_instance
              if (!instanceImage) {
                const photos = instance.photos_of_the_toy_instance || instance.meta?.photos_of_the_toy_instance || [];
                if (photos.length > 0 && photos[0]) {
                  const photoId = Array.isArray(photos[0]) ? photos[0].ID : photos[0];
                  if (typeof photoId === 'number') {
                    // В MVP можно запросить отдельно или использовать placeholder
                  }
                }
              }
              
              // Получаем состояние трубочки (tube_condition)
              // В JS уже нормализованы данные: tube_condition всегда массив объектов или пусто
              // (для реальных данных термины загружаются по ID в toy-type-single.js)
              let tubeConditionSlug = '';
              
              // После нормализации в JS tube_condition всегда массив объектов
              if (instance.tube_condition && Array.isArray(instance.tube_condition) && instance.tube_condition.length > 0) {
                const firstCondition = instance.tube_condition[0];
                if (typeof firstCondition === 'object' && firstCondition !== null) {
                  // Slug может быть как 'more_75', '25-50', '100' и т.д.
                  tubeConditionSlug = firstCondition.slug || firstCondition.name || '';
                  // Нормализуем slug (убираем пробелы, приводим к lowercase для сравнения)
                  if (tubeConditionSlug) {
                    tubeConditionSlug = tubeConditionSlug.toLowerCase().trim();
                  }
                }
              }
              
              // Если всё ещё не нашли, используем пустую строку (иконка не отобразится)
              
              // Редкость берём из типа (occurrence) - получаем slug для определения цвета
              // В Pods REST API occurrences приходит как массив объектов в корне или как массив ID в toy_type_occurrence
              let raritySlug = '';
              
              // Сначала пробуем получить из occurrences (массив объектов терминов)
              if (data.occurrences && Array.isArray(data.occurrences) && data.occurrences.length > 0) {
                const firstOccurrence = data.occurrences[0];
                raritySlug = firstOccurrence?.slug || '';
              }
              
              // Fallback: ищем через ID в toy_type_occurrence или _embedded
              if (!raritySlug) {
                const occurrenceId = data['toy_type_occurrence']?.[0] || data.meta?.occurrences?.[0] || data.meta?.occurrence?.[0] || '';
                if (occurrenceId && data._embedded?.['wp:term']) {
                  for (const termArray of data._embedded['wp:term']) {
                    if (Array.isArray(termArray)) {
                      const termObj = termArray.find(t => 
                        (t.id === occurrenceId || t.term_id === occurrenceId) && t.taxonomy === 'occurrence'
                      );
                      if (termObj) {
                        raritySlug = termObj.slug; // Используем slug для определения цвета
                        break;
                      }
                    }
                  }
                }
              }
              
              // Экранируем данные
              const safeTitle = escapeHtml(instanceTitle);
              const safeImage = instanceImage ? escapeHtml(instanceImage) : '';
              const safeTubeCondition = tubeConditionSlug ? escapeHtml(tubeConditionSlug) : '';
              
              return `
                <toy-instance-card
                  id="${instanceId}"
                  title="${safeTitle}"
                  ${instancePrice !== null ? `price="${instancePrice}"` : ''}
                  ${safeImage ? `image="${safeImage}"` : ''}
                  ${safeTubeCondition ? `tube-condition="${safeTubeCondition}"` : ''}
                  ${raritySlug ? `rarity="${raritySlug}"` : ''}
                ></toy-instance-card>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

