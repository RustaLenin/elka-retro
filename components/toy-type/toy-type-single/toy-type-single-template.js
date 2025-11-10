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
// Все ссылки ведут на страницу поиска с фильтром по таксономии
function getTaxonomyUrl(taxonomySlug, termSlug, termId = null) {
  // Формируем URL страницы поиска с параметрами фильтра
  if (taxonomySlug && termSlug) {
    // Используем ID термина, если доступен, иначе slug
    const filterValue = termId || termSlug;
    return `/?search=1&${taxonomySlug}=${encodeURIComponent(filterValue)}`;
  }
  return '/?search=1';
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

/**
 * Рендерит карточку экземпляра
 */
function renderInstanceCard(instance, data) {
  // Получаем дата-модель для правильных названий полей
  const dataModel = window.data_model;
  const toyInstanceConfig = dataModel?.post_types?.toy_instance || {};
  const toyInstanceFields = toyInstanceConfig.fields || {};
  
  // Получаем данные экземпляра
  // В Pods REST API структура: instance.id, instance.post_title, instance.post_content
  const instanceId = instance.id || instance.ID;
  
  // Индекс экземпляра из дата-модели (toy_instance_index)
  const instanceIndexField = toyInstanceFields.toy_instance_index?.slug || 'toy_instance_index';
  const instanceIndex = instance[instanceIndexField] || instance.toy_instance_index || '';
  
  // Заголовок: используем post_title (как требуется), индекс только как fallback
  const instanceTitle = instance.post_title || instance.title?.rendered || instance.title || instanceIndex || '';
  
  // Цена из дата-модели (cost)
  const costField = toyInstanceFields.cost?.slug || 'cost';
  const instancePrice = instance[costField] ? parseFloat(instance[costField]) : (instance.cost ? parseFloat(instance.cost) : (instance.meta?.cost ? parseFloat(instance.meta.cost) : null));
  
  // Получаем изображение экземпляра
  // В Pods _thumbnail_id приходит как массив, первый элемент - ID изображения
  // URL изображения загружается в JS и сохраняется в _thumbnail_url
  let instanceImage = instance._thumbnail_url || '';
  
  // Fallback: пробуем получить из photos_of_the_toy_instance (из дата-модели)
  if (!instanceImage) {
    const photosField = toyInstanceFields.photos_of_the_toy_instance?.slug || 'photos_of_the_toy_instance';
    const photos = instance[photosField] || instance.photos_of_the_toy_instance || instance.meta?.photos_of_the_toy_instance || [];
    if (photos.length > 0 && photos[0]) {
      const photoId = Array.isArray(photos[0]) ? photos[0].ID : photos[0];
      if (typeof photoId === 'number') {
        // В MVP можно запросить отдельно или использовать placeholder
      }
    }
  }
  
  // Получаем состояние трубочки из дата-модели (tube_condition_field)
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
  
  // Получаем состояние (condition) из дата-модели
  // В JS уже нормализованы данные: condition всегда массив объектов или пусто
  // (для реальных данных термины загружаются по ID в toy-type-single.js)
  let conditionName = '';
  
  // После нормализации в JS condition всегда массив объектов
  if (instance.condition && Array.isArray(instance.condition) && instance.condition.length > 0) {
    const firstCondition = instance.condition[0];
    if (typeof firstCondition === 'object' && firstCondition !== null) {
      // Используем name для отображения (человекочитаемое название)
      conditionName = firstCondition.name || firstCondition.slug || '';
    }
  } else {
    // Fallback: пробуем получить напрямую из поля condition_field (если не нормализовано)
    const conditionField = toyInstanceFields.condition_field?.slug || 'condition_field';
    const conditionFieldData = instance[conditionField] || instance.condition_field || [];
    
    if (Array.isArray(conditionFieldData) && conditionFieldData.length > 0) {
      const firstCondition = conditionFieldData[0];
      if (typeof firstCondition === 'object' && firstCondition !== null) {
        conditionName = firstCondition.name || firstCondition.slug || '';
      }
    } else if (typeof conditionFieldData === 'object' && conditionFieldData !== null) {
      conditionName = conditionFieldData.name || conditionFieldData.slug || '';
    }
  }
  
  // Статус экземпляра
  const instanceStatus = instance.post_status || instance.status || 'publish';
  
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
  const safeCondition = conditionName ? escapeHtml(conditionName) : '';
  const safeInstanceIndex = instanceIndex ? escapeHtml(instanceIndex) : '';
  const safeStatus = instanceStatus ? escapeHtml(instanceStatus) : '';
  
  return `
    <toy-instance-card
      id="${instanceId}"
      title="${safeTitle}"
      ${instancePrice !== null ? `price="${instancePrice}"` : ''}
      ${safeImage ? `image="${safeImage}"` : ''}
      ${safeTubeCondition ? `tube-condition="${safeTubeCondition}"` : ''}
      ${safeCondition ? `condition="${safeCondition}"` : ''}
      ${raritySlug ? `rarity="${raritySlug}"` : ''}
      ${safeInstanceIndex ? `instance-index="${safeInstanceIndex}"` : ''}
      ${safeStatus ? `status="${safeStatus}"` : ''}
    ></toy-instance-card>
  `;
}

/**
 * Рендерит секции с экземплярами, разделенные по статусам
 */
function renderInstancesSection(data, instancesByStatus) {
  if (!instancesByStatus) {
    instancesByStatus = { available: [], reserved: [], sold: [] };
  }
  
  const { available = [], reserved = [], sold = [] } = instancesByStatus;
  
  // Проверяем, есть ли хотя бы один экземпляр
  const hasAnyInstances = available.length > 0 || reserved.length > 0 || sold.length > 0;
  
  if (!hasAnyInstances) {
    return '';
  }
  
  let html = '<div class="toy-type-single_instances-wrapper">';
  
  // Доступные экземпляры
  if (available.length > 0) {
    html += `
      <div class="toy-type-single_instances toy-type-single_instances--available">
        <h2 class="toy-type-single_section-title">Доступные экземпляры</h2>
        <div class="toy-instance-cards-container">
          ${available.map(instance => renderInstanceCard(instance, data)).join('')}
        </div>
      </div>
    `;
  }
  
  // Забронированные экземпляры
  if (reserved.length > 0) {
    html += `
      <div class="toy-type-single_instances toy-type-single_instances--reserved">
        <h2 class="toy-type-single_section-title">Забронированные экземпляры</h2>
        <div class="toy-instance-cards-container">
          ${reserved.map(instance => renderInstanceCard(instance, data)).join('')}
        </div>
      </div>
    `;
  }
  
  // Проданные экземпляры
  if (sold.length > 0) {
    html += `
      <div class="toy-type-single_instances toy-type-single_instances--sold">
        <h2 class="toy-type-single_section-title">Проданные экземпляры</h2>
        <div class="toy-instance-cards-container">
          ${sold.map(instance => renderInstanceCard(instance, data)).join('')}
        </div>
      </div>
    `;
  }
  
  html += '</div>';
  
  return html;
}

export function toy_type_single_template(state) {
  const { data, loading, error, instances, instancesByStatus } = state;
  
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
  
  // Получаем дата-модель
  const dataModel = window.data_model;
  if (!dataModel || !dataModel.post_types || !dataModel.post_types.toy_type) {
    console.warn('[toy-type-single-template] Data model not available');
  }
  
  const toyTypeConfig = dataModel?.post_types?.toy_type || {};
  const fields = toyTypeConfig.fields || {};
  
  // Получаем данные
  const title = data.title?.rendered || '';
  const content = data.content?.rendered || '';
  
  // Получаем категории для хлебных крошек
  // В REST API категории приходят как массив ID в поле 'category-of-toys'
  const categoryField = 'category-of-toys';
  const categoriesData = data[categoryField] || [];
  let categoryId = null;
  
  // Обрабатываем массив ID категорий
  if (Array.isArray(categoriesData) && categoriesData.length > 0) {
    // Берем последнюю категорию (самую глубокую в иерархии)
    // В REST API это массив ID: [70]
    const lastCategoryId = categoriesData[categoriesData.length - 1];
    if (typeof lastCategoryId === 'number') {
      categoryId = lastCategoryId;
    }
  } else if (typeof categoriesData === 'number') {
    categoryId = categoriesData;
  }
  
  // Fallback: ищем в _embedded терминах, если не нашли ID
  if (!categoryId && data._embedded?.['wp:term']) {
    for (const arr of data._embedded['wp:term']) {
      if (Array.isArray(arr)) {
        const categoryTerm = arr.find(t => t.taxonomy === categoryField);
        if (categoryTerm) {
          categoryId = categoryTerm.id || categoryTerm.term_id;
          break;
        }
      }
    }
  }
  
  // Получаем редкость (occurrence) для чипса
  // В REST API поле приходит как occurrence_field (массив объектов) или occurrence (массив ID)
  const occurrenceField = fields.occurrence_field?.slug || 'occurrence_field';
  const occurrenceTerms = data[occurrenceField] || data.occurrence || [];
  let raritySlug = '';
  let rarityName = '';
  let rarityUrl = '';
  
  if (Array.isArray(occurrenceTerms) && occurrenceTerms.length > 0) {
    const firstOccurrence = occurrenceTerms[0];
    if (typeof firstOccurrence === 'object' && firstOccurrence !== null) {
      // Уже объект с данными
      raritySlug = firstOccurrence.slug || '';
      rarityName = firstOccurrence.name || '';
      rarityUrl = firstOccurrence.link || getTaxonomyUrl('occurrence', firstOccurrence.slug, firstOccurrence.id || firstOccurrence.term_id);
    } else if (typeof firstOccurrence === 'number') {
      // Это ID, ищем в _embedded
      const embeddedTerms = data._embedded?.['wp:term'] || [];
      for (const arr of embeddedTerms) {
        if (Array.isArray(arr)) {
          const found = arr.find(t => (t.id === firstOccurrence || t.term_id === firstOccurrence) && t.taxonomy === 'occurrence');
          if (found) {
            raritySlug = found.slug || '';
            rarityName = found.name || '';
            rarityUrl = found.link || getTaxonomyUrl('occurrence', found.slug, found.id || found.term_id);
            break;
          }
        }
      }
    }
  }
  
  // Формируем массив полей для таблицы Technical Information
  // Используем только поля с show_in_description: true
  const technicalFields = [];
  
  // Функция для получения значения таксономии из данных
  function getTaxonomyValue(relatedTaxonomy, restApiField) {
    // В REST API поля приходят как {field_slug}_field (например, year_of_production_field, materials_field)
    // Пробуем сначала точное название, потом варианты
    const value = data[restApiField] || [];
    if (!Array.isArray(value) || value.length === 0) return null;
    
    return value.map(term => {
      if (typeof term === 'number') {
        // Это ID, нужно найти в _embedded
        const embeddedTerms = data._embedded?.['wp:term'] || [];
        for (const arr of embeddedTerms) {
          if (Array.isArray(arr)) {
            const found = arr.find(t => (t.id === term || t.term_id === term) && t.taxonomy === relatedTaxonomy);
            if (found) {
              return {
                id: term,
                name: found.name,
                slug: found.slug,
                url: found.link || getTaxonomyUrl(relatedTaxonomy, found.slug, term)
              };
            }
          }
        }
        return null;
      } else {
        // Уже объект с данными (как в REST API приходит из Pods)
        return {
          id: term.id || term.term_id,
          name: term.name,
          slug: term.slug,
          url: term.link || getTaxonomyUrl(relatedTaxonomy, term.slug, term.id || term.term_id)
        };
      }
    }).filter(t => t !== null);
  }
  
  // Проходим по всем полям и добавляем те, у которых show_in_description: true
  Object.keys(fields).forEach(fieldSlug => {
    const fieldConfig = fields[fieldSlug];
    if (fieldConfig.show_in_description && fieldConfig.field_type === 'taxonomy') {
      // Используем slug напрямую как название поля в REST API
      const restApiField = fieldConfig.slug || fieldSlug;
      const relatedTaxonomy = fieldConfig.related_taxonomy;
      const values = getTaxonomyValue(relatedTaxonomy, restApiField);
      
      if (values && values.length > 0) {
        technicalFields.push({
          label: fieldConfig.display_name || fieldSlug,
          values: values,
          taxonomy: relatedTaxonomy
        });
      }
    }
  });
  
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
  const hasTechnicalInfo = technicalFields.length > 0;

  // Формируем текст редкости для чипса
  const rarityLabels = {
    'often': 'Часто встречается',
    'not-often': 'Не часто встречается',
    'rarely': 'Редко встречается',
    'rare': 'Раритетный экземпляр'
  };
  const rarityLabel = raritySlug ? (rarityLabels[raritySlug] || rarityName || raritySlug) : '';
  
  // URL для поиска с фильтром по редкости
  const raritySearchUrl = raritySlug ? `/?search=1&occurrence=${encodeURIComponent(raritySlug)}` : '/?search=1';
  
  return `
    <div class="toy-type-single_content">
      ${categoryId ? `
        <category-breadcrumbs category-id="${categoryId}"></category-breadcrumbs>
      ` : ''}
      
      ${title ? `
        <header class="toy-type-single_header">
          <h1 class="toy-type-single_title">${title}</h1>
          ${rarityLabel ? `
            <a href="${raritySearchUrl}" class="toy-type-single_rarity rarity--${raritySlug}">
              ${escapeHtml(rarityLabel)}
            </a>
          ` : ''}
        </header>
      ` : ''}
      
      <div class="toy-type-single_main">
        <div class="toy-type-single_main-left">
          <div class="toy-type-single_image">
            <ui-image-gallery state-path="toyType.featured_image"></ui-image-gallery>
          </div>
        </div>
        
        <div class="toy-type-single_main-right">
          ${hasTechnicalInfo ? `
            <div class="toy-type-single_technical">
              <h2 class="toy-type-single_section-title">Технические характеристики:</h2>
              <table class="toy-type-single_properties">
                <tbody>
                  ${technicalFields.map(field => `
                    <tr>
                      <td class="property-label">${escapeHtml(field.label)}</td>
                      <td class="property-value">${renderTerms(field.values)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}
        </div>
      </div>
      
      ${content ? `
        <div class="toy-type-single_body toy-type-single_body--full">
          <section class="toy-type-single_description">
            <h2 class="toy-type-single_section-title">Описание:</h2>
            <div class="toy-type-single_description-content">
              ${content}
            </div>
          </section>
        </div>
      ` : ''}
      
      ${renderInstancesSection(data, instancesByStatus)}
    </div>
  `;
}

