/**
 * Field Config Adapter
 * 
 * Универсальный адаптер для конвертации доменных моделей данных в конфигурации полей UI Form Kit.
 * Предоставляет расширяемый механизм маппинга типов полей, источников данных и декораторов.
 */

/**
 * Формат field config для UI Form Kit
 * @typedef {Object} FieldConfig
 * @property {string} id - Уникальный идентификатор поля
 * @property {string} type - Тип поля UI Kit (text, number, range, select-single, select-multi, checkbox, segmented-toggle)
 * @property {string} label - Отображаемое название поля
 * @property {string} [description] - Дополнительное описание
 * @property {*} [defaultValue] - Значение по умолчанию
 * @property {boolean} [required] - Обязательность поля
 * @property {boolean} [disabled] - Отключенное состояние
 * @property {boolean} [readonly] - Только чтение
 * @property {Object} [dataSource] - Источник данных для select компонентов
 * @property {Array} [validation] - Правила валидации
 * @property {Object} [icon] - Конфигурация иконки
 * @property {Object} [tooltip] - Конфигурация подсказки
 * @property {Object} [hints] - Подсказки для поля
 * @property {Object} [meta] - Дополнительные метаданные
 */

/**
 * Маппер типов полей из доменной модели в типы UI Kit
 * @type {Object<string, Function>}
 */
const DEFAULT_TYPE_MAPPERS = {
  // Текстовые поля
  text: () => 'text',
  string: () => 'text',
  email: () => 'text',
  url: () => 'text',
  tel: () => 'text',
  password: () => 'text',
  
  // Числовые поля
  number: (fieldConfig) => {
    // Для диапазонов используем range, иначе number
    if (fieldConfig?.is_range === true) {
      return 'range';
    }
    return 'number';
  },
  integer: () => 'number',
  float: () => 'number',
  decimal: () => 'number',
  currency: (fieldConfig) => {
    // Для валютных диапазонов (цена) используем range
    if (fieldConfig?.is_range === true) {
      return 'range';
    }
    return 'number';
  },
  
  // Таксономии и выборы
  taxonomy: (fieldConfig) => {
    // Для таксономий используем select-single или select-multi
    return fieldConfig?.multi_choose === true ? 'select-multi' : 'select-single';
  },
  select: (fieldConfig) => {
    return fieldConfig?.multi_choose === true ? 'select-multi' : 'select-single';
  },
  enum: () => 'select-single',
  
  // Чекбоксы и переключатели
  boolean: () => 'checkbox',
  checkbox: () => 'checkbox',
  toggle: () => 'segmented-toggle',
  
  // Специальные типы
  range: () => 'range',
  'segmented-toggle': () => 'segmented-toggle',
};

/**
 * Класс адаптера конфигураций полей
 */
class FieldConfigAdapter {
  constructor(options = {}) {
    this.typeMappers = { ...DEFAULT_TYPE_MAPPERS, ...(options.typeMappers || {}) };
    this.decoratorAdapter = options.decoratorAdapter || null;
    this.dataSourceAdapter = options.dataSourceAdapter || null;
    this.validationAdapter = options.validationAdapter || null;
  }

  /**
   * Регистрация кастомного маппера типа
   * @param {string} sourceType - Тип в доменной модели
   * @param {Function} mapper - Функция маппинга (fieldConfig) => uiKitType
   */
  registerTypeMapper(sourceType, mapper) {
    if (typeof mapper !== 'function') {
      console.warn('[field-config-adapter] Type mapper must be a function', sourceType);
      return;
    }
    this.typeMappers[sourceType] = mapper;
  }

  /**
   * Преобразование типа поля из доменной модели в тип UI Kit
   * @param {string} sourceType - Тип в доменной модели
   * @param {Object} fieldConfig - Полная конфигурация поля
   * @returns {string|null} - Тип UI Kit или null если не поддерживается
   */
  mapFieldType(sourceType, fieldConfig) {
    const mapper = this.typeMappers[sourceType];
    if (!mapper) {
      console.warn(`[field-config-adapter] Unknown field type: ${sourceType}`);
      return null;
    }
    try {
      return mapper(fieldConfig);
    } catch (error) {
      console.error(`[field-config-adapter] Error mapping type ${sourceType}:`, error);
      return null;
    }
  }

  /**
   * Создание dataSource для select компонентов
   * @param {Object} fieldConfig - Конфигурация поля
   * @param {*} dataContext - Контекст данных (window.taxonomy_terms, REST API и т.д.)
   * @returns {Object|null} - Конфигурация dataSource или null
   */
  createDataSource(fieldConfig, dataContext = {}) {
    // Если есть кастомный адаптер, используем его
    if (this.dataSourceAdapter && typeof this.dataSourceAdapter === 'function') {
      return this.dataSourceAdapter(fieldConfig, dataContext);
    }

    // Стандартная обработка для таксономий
    if (fieldConfig.type === 'taxonomy' || fieldConfig.field_type === 'taxonomy') {
      const taxonomySlug = fieldConfig.related_taxonomy || fieldConfig.slug || fieldConfig.id;
      if (!taxonomySlug) return null;

      // Поддержка window.taxonomy_terms
      if (dataContext.taxonomyTerms && dataContext.taxonomyTerms[taxonomySlug]) {
        return {
          type: 'global',
          path: `taxonomyTerms.${taxonomySlug}`,
          adapter: 'taxonomyOptionAdapter'
        };
      }

      // Поддержка прямого указания опций
      if (Array.isArray(fieldConfig.options)) {
        return {
          type: 'static',
          options: fieldConfig.options
        };
      }

      // Поддержка REST API
      if (fieldConfig.api_endpoint) {
        return {
          type: 'rest',
          endpoint: fieldConfig.api_endpoint,
          path: fieldConfig.api_path || 'data',
          method: fieldConfig.api_method || 'GET'
        };
      }
    }

    // Поддержка статических опций для select
    if (fieldConfig.options && Array.isArray(fieldConfig.options)) {
      return {
        type: 'static',
        options: fieldConfig.options
      };
    }

    return null;
  }

  /**
   * Применение декораторов (иконки, цвета) к конфигурации поля
   * @param {FieldConfig} fieldConfig - Конфигурация поля
   * @param {Object} sourceConfig - Исходная конфигурация из доменной модели
   * @param {*} decoratorContext - Контекст для декораторов
   * @returns {FieldConfig} - Обновленная конфигурация
   */
  applyDecorators(fieldConfig, sourceConfig, decoratorContext = {}) {
    if (!this.decoratorAdapter || typeof this.decoratorAdapter !== 'function') {
      return fieldConfig;
    }

    try {
      const decorators = this.decoratorAdapter(sourceConfig, decoratorContext);
      if (decorators && typeof decorators === 'object') {
        return { ...fieldConfig, ...decorators };
      }
    } catch (error) {
      console.error('[field-config-adapter] Error applying decorators:', error);
    }

    return fieldConfig;
  }

  /**
   * Генерация правил валидации из доменной модели
   * @param {Object} fieldConfig - Конфигурация поля из доменной модели
   * @returns {Array} - Массив правил валидации
   */
  generateValidationRules(fieldConfig) {
    // Если есть кастомный адаптер, используем его
    if (this.validationAdapter && typeof this.validationAdapter === 'function') {
      return this.validationAdapter(fieldConfig) || [];
    }

    const rules = [];

    // Правило required
    if (fieldConfig.required === true) {
      rules.push({
        rule: 'required',
        value: true,
        message: fieldConfig.required_message || `${fieldConfig.display_name || fieldConfig.label || 'Поле'} обязательно для заполнения`
      });
    }

    // Правила длины для текстовых полей
    if (fieldConfig.min_length !== undefined) {
      rules.push({
        rule: 'minLength',
        value: fieldConfig.min_length,
        message: fieldConfig.min_length_message || `Минимальная длина: ${fieldConfig.min_length} символов`
      });
    }
    if (fieldConfig.max_length !== undefined) {
      rules.push({
        rule: 'maxLength',
        value: fieldConfig.max_length,
        message: fieldConfig.max_length_message || `Максимальная длина: ${fieldConfig.max_length} символов`
      });
    }

    // Правила для числовых полей
    if (fieldConfig.min !== undefined) {
      rules.push({
        rule: 'min',
        value: fieldConfig.min,
        message: fieldConfig.min_message || `Минимальное значение: ${fieldConfig.min}`
      });
    }
    if (fieldConfig.max !== undefined) {
      rules.push({
        rule: 'max',
        value: fieldConfig.max,
        message: fieldConfig.max_message || `Максимальное значение: ${fieldConfig.max}`
      });
    }

    // Правило range для диапазонов
    if (fieldConfig.type === 'range' || fieldConfig.is_range === true) {
      if (fieldConfig.range_min !== undefined || fieldConfig.range_max !== undefined) {
        rules.push({
          rule: 'range',
          value: {
            min: fieldConfig.range_min,
            max: fieldConfig.range_max
          },
          message: fieldConfig.range_message || `Диапазон должен быть от ${fieldConfig.range_min || '?'} до ${fieldConfig.range_max || '?'}`
        });
      }
    }

    // Правило maxSelections для select-multi
    if (fieldConfig.max_selections !== undefined) {
      rules.push({
        rule: 'maxSelections',
        value: fieldConfig.max_selections,
        message: fieldConfig.max_selections_message || `Можно выбрать не более ${fieldConfig.max_selections} элементов`
      });
    }

    // Правило pattern
    if (fieldConfig.pattern) {
      rules.push({
        rule: 'pattern',
        value: fieldConfig.pattern,
        message: fieldConfig.pattern_message || 'Неверный формат'
      });
    }

    // Правило email
    if (fieldConfig.type === 'email' || fieldConfig.field_type === 'email') {
      rules.push({
        rule: 'email',
        value: true,
        message: fieldConfig.email_message || 'Введите корректный email адрес'
      });
    }

    return rules;
  }

  /**
   * Конвертация одного поля из доменной модели в field config
   * @param {string} fieldId - Идентификатор поля
   * @param {Object} sourceConfig - Конфигурация поля из доменной модели
   * @param {Object} options - Опции конвертации
   * @param {*} options.dataContext - Контекст данных (window.taxonomy_terms и т.д.)
   * @param {*} options.decoratorContext - Контекст для декораторов
   * @param {boolean} options.skipIfFiltered - Пропустить поле если оно не должно отображаться (например, show_in_filters: false)
   * @returns {FieldConfig|null} - Конфигурация поля или null если пропущено
   */
  adaptField(fieldId, sourceConfig, options = {}) {
    if (!fieldId || !sourceConfig) {
      return null;
    }

    const {
      dataContext = {},
      decoratorContext = {},
      skipIfFiltered = false
    } = options;

    // Пропускаем поля, которые не должны отображаться (например, в фильтрах)
    if (skipIfFiltered && sourceConfig.show_in_filters === false) {
      return null;
    }

    // Определяем тип поля в доменной модели
    const sourceType = sourceConfig.type || sourceConfig.field_type || 'text';
    
    // Маппим в тип UI Kit
    const uiKitType = this.mapFieldType(sourceType, sourceConfig);
    if (!uiKitType) {
      return null;
    }

    // Базовая конфигурация поля
    const fieldConfig = {
      id: fieldId,
      type: uiKitType,
      label: sourceConfig.display_name || sourceConfig.label || sourceConfig.name || fieldId,
      description: sourceConfig.public_description || sourceConfig.description || undefined,
      required: sourceConfig.required === true,
      disabled: sourceConfig.disabled === true,
      readonly: sourceConfig.readonly === true,
      defaultValue: sourceConfig.default_value !== undefined 
        ? sourceConfig.default_value 
        : (sourceConfig.multi_choose === true ? [] : null),
      placeholder: sourceConfig.placeholder || undefined,
    };

    // Добавляем dataSource для select компонентов
    if (uiKitType === 'select-single' || uiKitType === 'select-multi') {
      const dataSource = this.createDataSource(sourceConfig, dataContext);
      if (dataSource) {
        fieldConfig.dataSource = dataSource;
      }

      // Настройки для select
      fieldConfig.searchable = sourceConfig.searchable !== false;
      fieldConfig.allowClear = sourceConfig.allow_clear !== false && uiKitType === 'select-single';
      fieldConfig.allowSelectAll = sourceConfig.allow_select_all === true && uiKitType === 'select-multi';
      fieldConfig.placeholder = fieldConfig.placeholder || `Выберите ${fieldConfig.label.toLowerCase()}`;
    }

    // Настройки для range
    if (uiKitType === 'range') {
      fieldConfig.min = sourceConfig.min !== undefined ? sourceConfig.min : undefined;
      fieldConfig.max = sourceConfig.max !== undefined ? sourceConfig.max : undefined;
      fieldConfig.step = sourceConfig.step !== undefined ? sourceConfig.step : 1;
      fieldConfig.minLabel = sourceConfig.min_label || 'от';
      fieldConfig.maxLabel = sourceConfig.max_label || 'до';
      fieldConfig.minPlaceholder = sourceConfig.min_placeholder || '';
      fieldConfig.maxPlaceholder = sourceConfig.max_placeholder || '';
    }

    // Настройки для number
    if (uiKitType === 'number') {
      fieldConfig.min = sourceConfig.min !== undefined ? sourceConfig.min : undefined;
      fieldConfig.max = sourceConfig.max !== undefined ? sourceConfig.max : undefined;
      fieldConfig.step = sourceConfig.step !== undefined ? sourceConfig.step : undefined;
      fieldConfig.precision = sourceConfig.precision !== undefined ? sourceConfig.precision : undefined;
      fieldConfig.format = sourceConfig.format || 'decimal';
      fieldConfig.currency = sourceConfig.currency || undefined;
    }

    // Настройки для segmented-toggle
    if (uiKitType === 'segmented-toggle') {
      fieldConfig.options = sourceConfig.options || [];
    }

    // Генерация правил валидации
    const validationRules = this.generateValidationRules(sourceConfig);
    if (validationRules.length > 0) {
      fieldConfig.validation = validationRules;
    }

    // Применение декораторов
    const decoratedConfig = this.applyDecorators(fieldConfig, sourceConfig, decoratorContext);

    // Метаданные (сохраняем исходную конфигурацию для справки)
    decoratedConfig.meta = {
      sourceType,
      originalConfig: sourceConfig
    };

    return decoratedConfig;
  }

  /**
   * Конвертация множества полей из доменной модели
   * @param {Object} sourceFields - Объект с полями { fieldId: sourceConfig }
   * @param {Object} options - Опции конвертации
   * @returns {Array<FieldConfig>} - Массив конфигураций полей
   */
  adaptFields(sourceFields, options = {}) {
    if (!sourceFields || typeof sourceFields !== 'object') {
      return [];
    }

    const fields = [];
    const {
      skipIfFiltered = false,
      filterFn = null
    } = options;

    Object.entries(sourceFields).forEach(([fieldId, sourceConfig]) => {
      // Применяем кастомный фильтр если указан
      if (filterFn && typeof filterFn === 'function') {
        if (!filterFn(fieldId, sourceConfig)) {
          return;
        }
      }

      const fieldConfig = this.adaptField(fieldId, sourceConfig, { ...options, skipIfFiltered });
      if (fieldConfig) {
        fields.push(fieldConfig);
      }
    });

    // Сортировка по label
    if (options.sortByLabel !== false) {
      fields.sort((a, b) => a.label.localeCompare(b.label, 'ru'));
    }

    return fields;
  }
}

// Экспорт класса для создания кастомных инстансов
export { FieldConfigAdapter };

// Экспорт дефолтного инстанса
export const defaultAdapter = new FieldConfigAdapter();

// Экспорт утилит для работы с taxonomy_terms
export const taxonomyOptionAdapter = {
  /**
   * Преобразование терминов таксономии в опции для select
   * @param {Object} taxonomyTerms - Объект терминов { term_id: { id, name, slug, description } }
   * @returns {Array} - Массив опций [{ value, label, description }]
   */
  adaptOptions: (taxonomyTerms) => {
    if (!taxonomyTerms || typeof taxonomyTerms !== 'object') {
      return [];
    }

    const options = [];
    Object.values(taxonomyTerms).forEach((term) => {
      if (term && (term.slug || term.id) && term.name) {
        options.push({
          value: term.slug || String(term.id),
          label: term.name,
          description: term.description || undefined,
          icon: term.icon || undefined,
          color: term.color || undefined,
          meta: term.meta || undefined
        });
      }
    });

    // Сортировка по имени
    options.sort((a, b) => a.label.localeCompare(b.label, 'ru'));

    return options;
  }
};
