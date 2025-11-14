/**
 * Фабрика конфигураций форм фильтров каталога
 * 
 * Генерирует конфигурацию формы динамически на основе:
 * - Режима каталога (type/instance)
 * - Доступных полей из data-model.json через filter-registry.js
 * - Текущих значений фильтров из window.app.catalog.getState()
 * 
 * Конфигурация регистрируется в window.app.forms и используется
 * через атрибут config-path в ui-form-controller
 */

import { getFiltersForMode, getFilterKey, loadRelationshipOptions } from '../../components/catalog/sidebar/filter-registry.js';

/**
 * Нормализовать значение фильтра для формы
 * В сторе фильтры хранятся как { filterKey: [value1, value2] }
 * Для select-single нужно взять первый элемент, для select-multi - весь массив
 * 
 * @param {*} filterValue - Значение фильтра из стора (массив или null/undefined)
 * @param {string} fieldType - Тип поля (select-single, select-multi, number, text)
 * @returns {*} Нормализованное значение для формы
 */
function normalizeFilterValueForForm(filterValue, fieldType) {
  if (filterValue === null || filterValue === undefined) {
    return null;
  }

  if (Array.isArray(filterValue)) {
    if (fieldType === 'select-multi') {
      // Для множественного выбора возвращаем весь массив
      return filterValue.length > 0 ? filterValue : null;
    } else {
      // Для одиночного выбора берём первое значение
      return filterValue.length > 0 ? filterValue[0] : null;
    }
  }

  // Если не массив, возвращаем как есть (для number, text)
  return filterValue;
}

/**
 * Нормализовать значение формы для стора
 * Форма возвращает значения в зависимости от типа поля:
 * - select-single: строка или null
 * - select-multi: массив или null
 * - number: число или null
 * - text: строка или null
 * 
 * В сторе всегда храним как { filterKey: [value1, value2] } для единообразия
 * 
 * @param {*} formValue - Значение из формы
 * @param {string} fieldType - Тип поля
 * @returns {Array|null} Нормализованное значение для стора (массив или null)
 */
function normalizeFormValueForStore(formValue, fieldType) {
  if (formValue === null || formValue === undefined || formValue === '') {
    return null;
  }

  if (fieldType === 'select-multi') {
    // Для множественного выбора значение уже массив
    if (Array.isArray(formValue)) {
      return formValue.length > 0 ? formValue : null;
    }
    return null;
  } else {
    // Для одиночного выбора или других типов - одиночное значение
    // В сторе всегда храним как массив для единообразия
    return [String(formValue)];
  }
}

/**
 * Загрузить опции для relationship полей
 * @param {Array} fields - Конфигурации полей формы
 * @returns {Promise<Array>} Поля с загруженными опциями
 */
async function loadRelationshipOptionsForFields(fields) {
  const fieldsWithOptions = [];

  for (const field of fields) {
    // Если поле имеет _relationshipPostType, загружаем опции
    if (field._relationshipPostType) {
      try {
        const options = await loadRelationshipOptions(field._relationshipPostType);
        fieldsWithOptions.push({
          ...field,
          options: options || [],
          // Удаляем временное поле после загрузки опций
          _relationshipPostType: undefined,
        });
      } catch (error) {
        console.error(`[catalog-filters-factory] Error loading options for relationship field ${field.id}:`, error);
        // Если не удалось загрузить, оставляем поле без опций
        fieldsWithOptions.push({
          ...field,
          options: [],
          _relationshipPostType: undefined,
        });
      }
    } else {
      // Для обычных полей просто копируем конфигурацию
      fieldsWithOptions.push(field);
    }
  }

  return fieldsWithOptions;
}

/**
 * Создать конфигурацию формы фильтров каталога
 * 
 * @param {string} mode - Режим каталога ('type' | 'instance')
 * @param {Object} currentFilters - Текущие фильтры из стора { filterKey: [values] }
 * @returns {Promise<Object>} Конфигурация формы для ui-form-controller
 */
export async function createCatalogFiltersFormConfig(mode, currentFilters = {}) {
  // Получаем конфигурации фильтров для режима через filter-registry
  const filterConfigs = await getFiltersForMode(mode);
  
  if (!Array.isArray(filterConfigs) || filterConfigs.length === 0) {
    console.warn(`[catalog-filters-factory] No filters found for mode: ${mode}`);
    return {
      fields: [],
      values: {},
      autosubmit: { enabled: false },
      pipeline: {},
    };
  }

  // Преобразуем конфигурации фильтров в конфигурации полей формы
  const fields = [];
  const values = {};

  for (const filterConfig of filterConfigs) {
    const filterKey = getFilterKey(filterConfig.fieldSlug || filterConfig.id);
    const currentValue = currentFilters[filterKey];

    // Создаём конфигурацию поля формы
    const fieldConfig = {
      id: filterConfig.id,
      type: filterConfig.type,
      label: filterConfig.label,
      ...(filterConfig.placeholder && { placeholder: filterConfig.placeholder }),
      ...(filterConfig.description && { description: filterConfig.description }),
      ...(filterConfig.required && { required: filterConfig.required }),
      ...(filterConfig.disabled && { disabled: filterConfig.disabled }),
      // Для select-* полей передаём опции или dataSource
      ...(filterConfig.options && Array.isArray(filterConfig.options) && { options: filterConfig.options }),
      ...(filterConfig.dataSource && { dataSource: filterConfig.dataSource }),
      // Для relationship полей сохраняем тип для последующей загрузки опций
      ...(filterConfig._relationshipPostType && { _relationshipPostType: filterConfig._relationshipPostType }),
      // Для number полей передаём min, max, step
      ...(filterConfig.min !== undefined && { min: filterConfig.min }),
      ...(filterConfig.max !== undefined && { max: filterConfig.max }),
      ...(filterConfig.step !== undefined && { step: filterConfig.step }),
      // Для select полей передаём searchable, allowClear
      ...(filterConfig.searchable !== undefined && { searchable: filterConfig.searchable }),
      ...(filterConfig.allowClear !== undefined && { allowClear: filterConfig.allowClear }),
    };

    // Нормализуем текущее значение для формы ПОСЛЕ создания fieldConfig,
    // чтобы использовать финальный тип поля (например, select-multi для occurrence)
    const normalizedValue = normalizeFilterValueForForm(currentValue, fieldConfig.type);
    if (normalizedValue !== null) {
      values[fieldConfig.id] = normalizedValue;
    }

    fields.push(fieldConfig);
  }

  // Загружаем опции для relationship полей
  const fieldsWithOptions = await loadRelationshipOptionsForFields(fields);

  // Настраиваем autosubmit с debounce (10 секунд)
  const autosubmit = {
    enabled: true,
    debounce: 10000, // 10 секунд задержка перед отправкой
    events: ['change'], // Только при изменении, не при вводе
  };

  // Pipeline для обработки отправки формы
  const pipeline = {
    /**
     * Санитизация значений формы
     */
    sanitize: (context) => {
      const formValues = context.values || {};
      const sanitized = {};

      for (const field of fieldsWithOptions) {
        const value = formValues[field.id];
        if (value !== undefined && value !== null) {
          // Применяем базовую санитизацию в зависимости от типа
          if (field.type === 'number') {
            const num = Number(value);
            sanitized[field.id] = isNaN(num) ? null : num;
          } else if (field.type === 'select-multi') {
            // Для select-multi проверяем, что это массив
            sanitized[field.id] = Array.isArray(value) ? value : null;
          } else {
            // Для строковых значений обрезаем пробелы
            sanitized[field.id] = String(value).trim();
          }
        }
      }

      return sanitized;
    },

    /**
     * Валидация формы (пока без валидации, все фильтры опциональны)
     */
    validate: async (context) => {
      // Фильтры каталога опциональны, поэтому всегда валидны
      return {
        valid: true,
        errors: [],
        fieldMessages: {},
        formMessages: null,
      };
    },

    /**
     * Отправка формы - обновление фильтров через window.app.catalog.setFilters()
     */
    submit: async (context) => {
      const formValues = context.values || {};
      
      // Преобразуем значения формы в формат стора
      const filters = {};
      
      for (const field of fieldsWithOptions) {
        const filterKey = getFilterKey(field.id);
        const formValue = formValues[field.id];
        
        // Нормализуем значение для стора
        const storeValue = normalizeFormValueForStore(formValue, field.type);
        
        if (storeValue !== null) {
          filters[filterKey] = storeValue;
        }
      }

      // Обновляем фильтры через публичный API
      if (window.app && window.app.catalog) {
        window.app.catalog.setFilters(filters);
      } else {
        console.warn('[catalog-filters-factory] window.app.catalog not available');
      }

      return { success: true, filters };
    },

    /**
     * Обработка успешной отправки
     */
    onSuccess: (context) => {
      console.debug('[catalog-filters-factory] Filters updated via form', context.result);
    },

    /**
     * Обработка ошибки
     */
    onError: (context, error) => {
      console.error('[catalog-filters-factory] Error updating filters:', error);
    },
  };

  // Возвращаем полную конфигурацию формы
  return {
    formId: `catalog-filters-${mode}`,
    fields: fieldsWithOptions,
    values,
    autosubmit,
    pipeline,
  };
}

/**
 * Константа для ключа конфигурации в window.app.forms
 */
export const CATALOG_FILTERS_FORM_KEY = 'catalogFilters';

