/**
 * Filter registry maps URL keys to UI components and validation rules.
 *
 * Responsibilities:
 * - Чтение полей из window.data_model с show_in_filters: true
 * - Маппинг типов полей (taxonomy, number) в типы UI Kit компонентов
 * - Генерация конфигураций фильтров для ui-form-controller
 * - Подготовка dataSource из window.taxonomy_terms
 * - Нормализация и валидация значений фильтров
 *
 * Data Sources:
 * - window.data_model - полная модель данных из core/data-model.json
 * - window.taxonomy_terms - термины таксономий в формате { taxonomy_slug: { term_id: { id, name, slug, description } } }
 */

/**
 * Константы для ключей фильтров (используются в URL и сторе)
 */
export const FILTER_KEYS = {
  MODE: 'mode',
  CATEGORY: 'category-of-toys', // Иерархическая таксономия категорий
  SEARCH: 'search',
  SORT: 'sort',
  PAGE: 'page',
  // Ключи фильтров генерируются динамически на основе полей из data-model.json
};

/**
 * Маппинг типов полей из data-model.json в типы UI Kit компонентов
 */
const FIELD_TYPE_TO_UI_TYPE = {
  taxonomy: (fieldConfig) => {
    // Для таксономий используем select-single или select-multi в зависимости от multi_choose
    return fieldConfig.multi_choose === true ? 'select-multi' : 'select-single';
  },
  relationship: (fieldConfig) => {
    // Для relationship используем select-single или select-multi в зависимости от multi_choose
    return fieldConfig.multi_choose === true ? 'select-multi' : 'select-single';
  },
  number: (fieldConfig) => {
    // Для числовых полей используем range (для диапазонов) или number
    // Пока используем number, range будет добавлен позже
    return 'number';
  },
  currency: (fieldConfig) => {
    // Для валютных полей (цена) используем range для диапазона
    // Пока используем number, range будет добавлен позже
    return 'number';
  },
};

/**
 * Получить data-model из window.data_model
 * Экспортируем для использования в других модулях
 * @returns {Object|null} Data model или null если недоступен
 */
export const getDataModel = () => {
  if (typeof window === 'undefined' || !window.data_model) {
    return null;
  }
  return window.data_model;
};

/**
 * Получить термины таксономий из window.taxonomy_terms
 * @returns {Object|null} Термины таксономий или null если недоступны
 */
export const getTaxonomyTerms = () => {
  if (typeof window === 'undefined' || !window.taxonomy_terms) {
    console.warn('[filter-registry] window.taxonomy_terms is not available');
    return null;
  }
  return window.taxonomy_terms;
};

/**
 * Преобразовать термины таксономии в формат опций для UI Kit select
 * @param {string} taxonomySlug - Слаг таксономии
 * @returns {Array<{value: string, label: string}>} Массив опций
 */
const getTaxonomyOptions = (taxonomySlug) => {
  const taxonomyTerms = getTaxonomyTerms();
  if (!taxonomyTerms || !taxonomyTerms[taxonomySlug]) {
    return [];
  }

  const terms = taxonomyTerms[taxonomySlug];
  const options = [];

  // window.taxonomy_terms имеет структуру { taxonomy_slug: { term_id: { id, name, slug, description } } }
  Object.values(terms).forEach((term) => {
    if (term && term.id && term.name) {
      options.push({
        value: String(term.id), // Используем ID как значение (для совместимости с бэкендом и категориями)
        label: term.name,
        // description убираем - он не нужен в опциях и излишне усложняет интерфейс
      });
    }
  });

  // Сортируем опции по имени для удобства пользователя
  options.sort((a, b) => a.label.localeCompare(b.label, 'ru'));

  return options;
};

/**
 * Создать dataSource для UI Kit select компонента из таксономии
 * @param {string} taxonomySlug - Слаг таксономии
 * @returns {Object} Конфигурация dataSource для ui-select
 */
const createTaxonomyDataSource = (taxonomySlug) => {
  return {
    type: 'global',
    path: `taxonomy_terms.${taxonomySlug}`,
    adapter: 'taxonomyTermsAdapter', // Адаптер будет преобразовывать структуру window.taxonomy_terms в опции
  };
};

/**
 * Загрузить опции для relationship поля из REST API
 * @param {string} relatedPostType - Слаг связанного типа поста (например, 'toy_type')
 * @returns {Promise<Array<{value: string, label: string}>>} Массив опций
 */
export const loadRelationshipOptions = async (relatedPostType) => {
  // Используем REST API endpoint каталога для получения списка постов
  const endpointMap = {
    toy_type: '/elkaretro/v1/catalog/types',
    toy_instance: '/elkaretro/v1/catalog/instances',
  };

  const endpoint = endpointMap[relatedPostType] || `/wp/v2/${relatedPostType}`;
  const apiUrl = `${window.wpApiSettings?.root || '/wp-json'}${endpoint}`;
  
  try {
    const params = new URLSearchParams({
      per_page: '100',
      orderby: 'title',
      order: 'asc',
      _fields: 'id,title',
    });

    const response = await fetch(`${apiUrl}?${params.toString()}`);
    if (!response.ok) {
      console.warn(`[filter-registry] Failed to load ${relatedPostType} options:`, response.status);
      return [];
    }

    const data = await response.json();
    
    // Преобразуем ответ в формат опций
    // REST API каталога возвращает { items: [...], meta: {...} }
    let items = [];
    if (Array.isArray(data)) {
      items = data;
    } else if (data.items && Array.isArray(data.items)) {
      items = data.items;
    } else if (data.data && Array.isArray(data.data)) {
      items = data.data;
    }

    // Преобразуем каждый элемент в опцию
    return items.map((item) => {
      // Для каталога items содержат { id, title, ... }
      const id = item.id;
      const title = item.title || item.title?.rendered || item.name || `ID: ${id}`;
      
      return {
        value: String(id),
        label: title,
      };
    });
  } catch (error) {
    console.error(`[filter-registry] Error loading ${relatedPostType} options:`, error);
    return [];
  }
};

/**
 * Создать конфигурацию поля фильтра для UI Kit на основе поля из data-model.json
 * @param {string} fieldSlug - Слаг поля
 * @param {Object} fieldConfig - Конфигурация поля из data-model.json
 * @param {string} postType - Тип поста (toy_type или toy_instance)
 * @returns {Object|null} Конфигурация поля для ui-form-controller или null если поле не поддерживается
 */
const createFilterFieldConfig = (fieldSlug, fieldConfig, postType) => {
  if (!fieldConfig || fieldConfig.show_in_filters !== true) {
    return null;
  }

  const fieldType = fieldConfig.field_type;
  const uiTypeMapper = FIELD_TYPE_TO_UI_TYPE[fieldType];

  if (!uiTypeMapper) {
    console.warn(`[filter-registry] Unsupported field type: ${fieldType} for field ${fieldSlug}`);
    return null;
  }

  const uiType = uiTypeMapper(fieldConfig);

  // Базовая конфигурация поля
  const fieldDef = {
    id: fieldSlug,
    type: uiType,
    label: fieldConfig.display_name || fieldSlug,
    description: fieldConfig.public_description || undefined,
    required: fieldConfig.required === true,
    defaultValue: fieldConfig.multi_choose === true ? [] : null,
  };

  // Для таксономий добавляем dataSource и опции
  if (fieldType === 'taxonomy' && fieldConfig.related_taxonomy) {
    const taxonomySlug = fieldConfig.related_taxonomy;
    fieldDef.dataSource = createTaxonomyDataSource(taxonomySlug);
    fieldDef.searchable = true; // Включаем поиск для всех таксономий

    // СПЕЦИАЛЬНАЯ ЛОГИКА ДЛЯ ФИЛЬТРОВ КАТАЛОГА:
    // Для фильтров каталога разрешаем множественный выбор даже если в data-model указано multi_choose: false
    // Это позволяет пользователю фильтровать по нескольким значениям, хотя у самой игрушки может быть только одно
    
    // Таксономии для мультивыбора в режиме типов
    const multiSelectForTypes = ['occurrence'];
    
    // Таксономии для мультивыбора в режиме экземпляров
    const multiSelectForInstances = ['authenticity', 'lot_configurations', 'condition', 'tube_condition'];
    
    // Определяем, нужно ли принудительно делать мультивыбор
    const shouldForceMultiSelect = 
      (postType === 'toy_type' && multiSelectForTypes.includes(taxonomySlug)) ||
      (postType === 'toy_instance' && multiSelectForInstances.includes(taxonomySlug));
    
    if (shouldForceMultiSelect) {
      // Принудительно делаем множественный выбор для определенных фильтров
      fieldDef.type = 'select-multi';
      fieldDef.placeholder = `Выберите ${fieldDef.label.toLowerCase()}`;
      fieldDef.allowSelectAll = false; // Пока отключаем "выбрать все"
    } else if (uiType === 'select-multi') {
      fieldDef.placeholder = `Выберите ${fieldDef.label.toLowerCase()}`;
      fieldDef.allowSelectAll = false; // Пока отключаем "выбрать все"
    } else {
      fieldDef.placeholder = `Выберите ${fieldDef.label.toLowerCase()}`;
      fieldDef.allowClear = true; // Разрешаем сброс для single select
    }
  }

  // Для relationship полей загружаем опции асинхронно
  // Пока оставляем пустой массив, опции будут загружены при инициализации формы
  if (fieldType === 'relationship' && fieldConfig.related_post_type) {
    const relatedPostType = fieldConfig.related_post_type;
    // Устанавливаем пустой массив опций, они будут загружены позже
    fieldDef.options = []; // Будет загружено асинхронно
    fieldDef._relationshipPostType = relatedPostType; // Сохраняем для загрузки
    fieldDef.searchable = true; // Включаем поиск для relationship

    // Для select-multi добавляем дополнительные опции
    if (uiType === 'select-multi') {
      fieldDef.placeholder = `Выберите ${fieldDef.label.toLowerCase()}`;
      fieldDef.allowSelectAll = false; // Пока отключаем "выбрать все"
    } else {
      fieldDef.placeholder = `Выберите ${fieldDef.label.toLowerCase()}`;
      fieldDef.allowClear = true; // Разрешаем сброс для single select
    }
  }

  // Для числовых полей (пока используем number, позже добавим range)
  if (fieldType === 'number' || fieldType === 'currency') {
    // TODO: После реализации ui-input-range использовать его для диапазонов
    // Пока оставляем как есть
  }

  return fieldDef;
};

/**
 * Получить список фильтров для указанного режима каталога
 * @param {string} mode - Режим каталога: 'type' | 'instance'
 * @returns {Array<Object>} Массив конфигураций полей для ui-form-controller
 */
export const getFiltersForMode = (mode = 'type') => {
  const dataModel = getDataModel();
  if (!dataModel || !dataModel.post_types) {
    console.warn('[filter-registry] Data model is not available');
    return [];
  }

  // Определяем тип поста на основе режима
  const postType = mode === 'instance' ? 'toy_instance' : 'toy_type';

  // Получаем конфигурацию типа поста
  const postTypeConfig = dataModel.post_types[postType];
  if (!postTypeConfig || !postTypeConfig.fields) {
    console.warn(`[filter-registry] Post type ${postType} not found in data model`);
    return [];
  }

  const filters = [];

  // Поля, которые нужно исключить из фильтров для экземпляров
  const excludedFieldsForInstances = [
    'connection_type_of_toy', // Связь: Тип игрушки
    'property_field' // Собственность
  ];

  // Проходим по всем полям типа поста
  Object.entries(postTypeConfig.fields).forEach(([fieldSlug, fieldConfig]) => {
    // Пропускаем поля, которые не должны отображаться в фильтрах
    if (!fieldConfig || fieldConfig.show_in_filters !== true) {
      return;
    }

    // Для экземпляров исключаем определенные поля
    if (postType === 'toy_instance' && excludedFieldsForInstances.includes(fieldSlug)) {
      return;
    }

    // Создаём конфигурацию поля фильтра
    const filterField = createFilterFieldConfig(fieldSlug, fieldConfig, postType);
    if (filterField) {
      filters.push(filterField);
    }
  });

  // Сортируем фильтры по display_name для единообразия
  filters.sort((a, b) => a.label.localeCompare(b.label, 'ru'));

  return filters;
};

/**
 * Нормализовать значение фильтра (санитизация и валидация)
 * @param {string} filterKey - Ключ фильтра (slug поля)
 * @param {any} value - Значение для нормализации
 * @returns {string|string[]|null} Нормализованное значение
 */
export const normalizeFilterValue = (filterKey, value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  // Для массивов (multi-select) нормализуем каждый элемент
  if (Array.isArray(value)) {
    const normalized = value
      .map((v) => {
        if (typeof v === 'string') {
          return v.trim();
        }
        if (typeof v === 'number') {
          return String(v);
        }
        return null;
      })
      .filter((v) => v !== null && v !== '');

    return normalized.length > 0 ? normalized : null;
  }

  // Для строк нормализуем
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed !== '' ? trimmed : null;
  }

  // Для чисел преобразуем в строку
  if (typeof value === 'number') {
    return String(value);
  }

  return null;
};

/**
 * Получить ключ фильтра для URL на основе slug поля
 * @param {string} fieldSlug - Слаг поля из data-model.json
 * @returns {string} Ключ для использования в URL и сторе
 */
export const getFilterKey = (fieldSlug) => {
  // Для таксономий используем related_taxonomy как ключ
  // Для остальных полей используем slug поля
  const dataModel = getDataModel();
  if (!dataModel || !dataModel.post_types) {
    return fieldSlug;
  }

  // Ищем поле в обоих типах постов
  for (const postType of ['toy_type', 'toy_instance']) {
    const postTypeConfig = dataModel.post_types[postType];
    if (postTypeConfig && postTypeConfig.fields && postTypeConfig.fields[fieldSlug]) {
      const fieldConfig = postTypeConfig.fields[fieldSlug];
      // Если поле связано с таксономией, используем её slug как ключ
      if (fieldConfig.field_type === 'taxonomy' && fieldConfig.related_taxonomy) {
        return fieldConfig.related_taxonomy;
      }
    }
  }

  return fieldSlug;
};

