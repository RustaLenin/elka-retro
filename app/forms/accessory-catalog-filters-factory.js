/**
 * Фабрика конфигураций форм фильтров каталога аксессуаров
 * 
 * Генерирует конфигурацию формы динамически на основе:
 * - Доступных полей из data-model.json через accessory-filter-registry.js
 * - Текущих значений фильтров из window.app.accessoryCatalog.getState()
 * 
 * Конфигурация регистрируется в window.app.forms и используется
 * через атрибут config-path в ui-form-controller
 */

import { getAccessoryFilters, getFilterKey, createFilterFieldConfig } from '../../components/accessory-catalog/sidebar/accessory-filter-registry.js';

export const ACCESSORY_CATALOG_FILTERS_FORM_KEY = 'accessoryCatalogFilters';

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
 * Создать конфигурацию формы фильтров для каталога аксессуаров
 * @returns {Promise<Object>} Конфигурация формы для ui-form-controller
 */
export async function createAccessoryCatalogFiltersFormConfig() {
  // Получаем список фильтров из реестра
  const filters = getAccessoryFilters();

  // Получаем текущие значения фильтров из стора
  const currentState = window.app?.accessoryCatalog?.getState();
  const currentFilters = currentState?.filters || {};

  // Создаём конфигурацию полей для формы
  const fields = filters.map((filterConfig) => {
    const fieldConfig = createFilterFieldConfig(filterConfig);

    // Получаем текущее значение фильтра из стора
    const filterKey = filterConfig.key;
    const filterValue = currentFilters[filterKey] || null;

    // Нормализуем значение для формы
    const normalizedValue = normalizeFilterValueForForm(filterValue, fieldConfig.type);

    // Добавляем значение по умолчанию
    if (normalizedValue !== null) {
      fieldConfig.defaultValue = normalizedValue;
    }

    return fieldConfig;
  });

  // Создаём конфигурацию формы
  const formConfig = {
    id: ACCESSORY_CATALOG_FILTERS_FORM_KEY,
    title: 'Фильтры каталога аксессуаров',
    description: '',
    fields: fields,
    layoutGap: '2px', // Минимальный gap для экономии места
    submitButton: false, // Кнопка отправки будет в сайдбаре
  };

  return formConfig;
}

/**
 * Нормализовать значения формы для стора
 * @param {Object} formValues - Значения формы
 * @param {Array} fieldConfigs - Конфигурации полей
 * @returns {Object} Нормализованные значения для стора { filterKey: [values] }
 */
export function normalizeFormValuesForStore(formValues, fieldConfigs) {
  const normalized = {};

  fieldConfigs.forEach((fieldConfig) => {
    const fieldKey = fieldConfig.key;
    const fieldType = fieldConfig.type;
    const formValue = formValues[fieldKey];

    // Нормализуем значение для стора
    const storeValue = normalizeFormValueForStore(formValue, fieldType);

    if (storeValue !== null) {
      normalized[fieldKey] = storeValue;
    }
  });

  return normalized;
}

