/**
 * Accessory Filter Registry
 * 
 * Responsibilities:
 * - Чтение полей из window.data_model для ny_accessory с show_in_filters: true
 * - Маппинг типов полей в типы UI Kit компонентов
 * - Генерация конфигураций фильтров для ui-form-controller
 * - Подготовка dataSource из window.taxonomy_terms
 */

/**
 * Получить data-model из window.data_model
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
    console.warn('[accessory-filter-registry] window.taxonomy_terms is not available');
    return null;
  }
  return window.taxonomy_terms;
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
    return fieldConfig.multi_choose === true ? 'select-multi' : 'select-single';
  },
  number: () => 'number',
  currency: () => 'number',
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
        value: String(term.id), // Используем ID как значение
        label: term.name,
      });
    }
  });

  // Сортируем опции по имени для удобства пользователя
  options.sort((a, b) => a.label.localeCompare(b.label, 'ru'));

  return options;
};

/**
 * Получить все фильтры для каталога аксессуаров
 * @returns {Array<Object>} Массив конфигураций фильтров
 */
export const getAccessoryFilters = () => {
  const dataModel = getDataModel();
  if (!dataModel || !dataModel.post_types || !dataModel.post_types.ny_accessory) {
    console.warn('[accessory-filter-registry] Data model not available or ny_accessory not found');
    return [];
  }

  const accessoryConfig = dataModel.post_types.ny_accessory;
  const filters = [];

  // Фильтры для аксессуаров (из data-model.json):
  // ny_category обрабатывается отдельно через category-tree-filter, поэтому исключаем из списка
  // ny_lot_configuration_field, ny_condition_field, ny_material_field, ny_year_of_production_field
  // Без property (ny_property_field) по решению пользователя

  const filterFields = {
    // 'ny_category': 'ny_category_field', // Исключено: обрабатывается через category-tree-filter
    'lot_configurations': 'ny_lot_configuration_field',
    'condition': 'ny_condition_field',
    'material': 'ny_material_field',
    'year_of_production': 'ny_year_of_production_field',
  };

  Object.keys(filterFields).forEach((filterKey) => {
    const fieldSlug = filterFields[filterKey];
    const fieldConfig = accessoryConfig.fields?.[fieldSlug];

    if (!fieldConfig) {
      console.warn(`[accessory-filter-registry] Field ${fieldSlug} not found in data model`);
      return;
    }

    // Проверяем, что поле должно показываться в фильтрах
    if (!fieldConfig.show_in_filters) {
      return;
    }

    // Получаем тип UI Kit компонента
    const uiType = FIELD_TYPE_TO_UI_TYPE[fieldConfig.field_type]?.(fieldConfig) || 'select-single';

    // Определяем таксономию для dataSource
    const taxonomySlug = fieldConfig.related_taxonomy || filterKey;

    // Получаем опции из taxonomy_terms
    const options = getTaxonomyOptions(taxonomySlug);

    // Создаём конфигурацию фильтра
    const filterConfig = {
      key: filterKey,
      slug: fieldSlug,
      label: fieldConfig.display_name || fieldSlug,
      type: uiType,
      options: options,
      dataSource: {
        type: 'global',
        path: `taxonomy_terms.${taxonomySlug}`,
      },
      multi_choose: fieldConfig.multi_choose || false,
    };

    // Для некоторых фильтров явно устанавливаем multi_choose
    // condition, lot_configurations, material - multi-select (согласно решению пользователя)
    if (filterKey === 'condition' || filterKey === 'lot_configurations' || filterKey === 'material') {
      filterConfig.type = 'select-multi';
      filterConfig.multi_choose = true;
    }

    filters.push(filterConfig);
  });

  return filters;
};

/**
 * Создать конфигурацию поля фильтра для ui-form-controller
 * @param {Object} filterConfig - Конфигурация фильтра из getAccessoryFilters()
 * @returns {Object} Конфигурация поля для UI Kit
 */
export const createFilterFieldConfig = (filterConfig) => {
  const fieldConfig = {
    id: filterConfig.key, // ui-form-controller требует поле id, а не key
    key: filterConfig.key, // Сохраняем key для использования в сторе
    label: filterConfig.label,
    type: filterConfig.type,
    required: false,
    layoutGap: '2px', // Минимальный gap для экономии места
  };

  // Если есть опции (для select), добавляем их
  if (filterConfig.options && filterConfig.options.length > 0) {
    fieldConfig.options = filterConfig.options;
  }

  // Если есть dataSource, добавляем его
  if (filterConfig.dataSource) {
    fieldConfig.dataSource = filterConfig.dataSource;
  }

  return fieldConfig;
};

/**
 * Получить ключ фильтра для URL/store по slug поля
 * @param {string} fieldSlug - Слаг поля из data-model.json
 * @returns {string} Ключ фильтра для URL/store
 */
export const getFilterKey = (fieldSlug) => {
  // Маппинг полей на ключи фильтров в URL
  const fieldToKeyMap = {
    'ny_category_field': 'ny_category',
    'ny_lot_configuration_field': 'lot_configurations',
    'ny_condition_field': 'condition',
    'ny_material_field': 'material',
    'ny_year_of_production_field': 'year_of_production',
  };

  return fieldToKeyMap[fieldSlug] || fieldSlug;
};

