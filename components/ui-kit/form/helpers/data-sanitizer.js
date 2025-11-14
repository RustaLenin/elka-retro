/**
 * Data Sanitizer
 * 
 * Утилиты для очистки и нормализации данных форм перед валидацией и отправкой.
 * Предоставляет функции санитизации для различных типов полей.
 */

/**
 * Опции санитизации
 * @typedef {Object} SanitizeOptions
 * @property {boolean} [trimStrings=true] - Удалять пробелы в начале и конце строк
 * @property {boolean} [convertEmptyToNull=false] - Преобразовывать пустые строки в null
 * @property {boolean} [escapeHtml=false] - Экранировать HTML для текстовых полей
 * @property {boolean} [normalizeNumbers=true] - Нормализовать числовые значения
 * @property {Array<string>} [excludeFields=[]] - Поля, которые не нужно санитизировать
 */

/**
 * Экранирование HTML для защиты от XSS
 * @param {string} str - Строка для экранирования
 * @returns {string} - Экранированная строка
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return str.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Санитизация текстового значения
 * @param {*} value - Значение для санитизации
 * @param {Object} fieldConfig - Конфигурация поля
 * @param {SanitizeOptions} options - Опции санитизации
 * @returns {string|null} - Очищенное значение
 */
function sanitizeText(value, fieldConfig = {}, options = {}) {
  const {
    trimStrings = true,
    convertEmptyToNull = false,
    escapeHtmlChars = false
  } = options;

  if (value === null || value === undefined) {
    return convertEmptyToNull ? null : '';
  }

  let str = String(value);

  if (trimStrings) {
    str = str.trim();
  }

  // Для паролей и email не применяем HTML-экранирование (они валидируются отдельно)
  const shouldEscape = escapeHtmlChars && fieldConfig.type !== 'password' && fieldConfig.type !== 'email';
  if (shouldEscape) {
    str = escapeHtml(str);
  }

  // Применяем maxLength если указан
  if (fieldConfig.maxLength && str.length > fieldConfig.maxLength) {
    str = str.substring(0, fieldConfig.maxLength);
  }

  if (convertEmptyToNull && str === '') {
    return null;
  }

  return str;
}

/**
 * Санитизация числового значения
 * @param {*} value - Значение для санитизации
 * @param {Object} fieldConfig - Конфигурация поля
 * @param {SanitizeOptions} options - Опции санитизации
 * @returns {number|null} - Нормализованное число или null
 */
function sanitizeNumber(value, fieldConfig = {}, options = {}) {
  const { normalizeNumbers = true, convertEmptyToNull = true } = options;

  if (value === null || value === undefined || value === '') {
    return convertEmptyToNull ? null : 0;
  }

  if (typeof value === 'number') {
    if (isNaN(value) || !isFinite(value)) {
      return null;
    }
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return convertEmptyToNull ? null : 0;
    }

    // Удаляем пробелы, запятые (заменяем на точку), нечисловые символы (кроме минуса и точки)
    let cleaned = trimmed.replace(/\s+/g, '').replace(',', '.');
    
    // Удаляем все кроме цифр, минуса и точки
    cleaned = cleaned.replace(/[^\d.-]/g, '');
    
    const num = parseFloat(cleaned);
    if (isNaN(num) || !isFinite(num)) {
      return null;
    }

    // Применяем min/max если указаны
    if (normalizeNumbers) {
      if (fieldConfig.min !== undefined && num < fieldConfig.min) {
        return fieldConfig.min;
      }
      if (fieldConfig.max !== undefined && num > fieldConfig.max) {
        return fieldConfig.max;
      }
    }

    // Применяем precision если указан
    if (fieldConfig.precision !== undefined && fieldConfig.precision !== null) {
      return parseFloat(num.toFixed(fieldConfig.precision));
    }

    return num;
  }

  return null;
}

/**
 * Санитизация диапазона значений (range)
 * @param {*} value - Значение для санитизации
 * @param {Object} fieldConfig - Конфигурация поля
 * @param {SanitizeOptions} options - Опции санитизации
 * @returns {Object|null} - Объект { min: number|null, max: number|null } или null
 */
function sanitizeRange(value, fieldConfig = {}, options = {}) {
  if (value === null || value === undefined) {
    return { min: null, max: null };
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    const result = {
      min: value.min !== undefined ? sanitizeNumber(value.min, { ...fieldConfig, type: 'number' }, options) : null,
      max: value.max !== undefined ? sanitizeNumber(value.max, { ...fieldConfig, type: 'number' }, options) : null
    };

    // Проверяем что min <= max
    if (result.min !== null && result.max !== null && result.min > result.max) {
      // Корректируем: устанавливаем max = min
      result.max = result.min;
    }

    return result;
  }

  return { min: null, max: null };
}

/**
 * Санитизация значения select-single
 * @param {*} value - Значение для санитизации
 * @param {Object} fieldConfig - Конфигурация поля
 * @param {SanitizeOptions} options - Опции санитизации
 * @returns {string|null} - Очищенное значение или null
 */
function sanitizeSelectSingle(value, fieldConfig = {}, options = {}) {
  const { convertEmptyToNull = true } = options;

  if (value === null || value === undefined || value === '') {
    return convertEmptyToNull ? null : '';
  }

  // Преобразуем в строку
  const str = String(value).trim();

  if (str === '') {
    return convertEmptyToNull ? null : '';
  }

  return str;
}

/**
 * Санитизация значения select-multi
 * @param {*} value - Значение для санитизации
 * @param {Object} fieldConfig - Конфигурация поля
 * @param {SanitizeOptions} options - Опции санитизации
 * @returns {Array} - Массив строк
 */
function sanitizeSelectMulti(value, fieldConfig = {}, options = {}) {
  if (value === null || value === undefined || value === '') {
    return [];
  }

  if (Array.isArray(value)) {
    // Фильтруем и нормализуем значения
    const result = value
      .map(item => {
        if (item === null || item === undefined || item === '') {
          return null;
        }
        return String(item).trim();
      })
      .filter(item => item !== null && item !== '');

    // Применяем maxSelections если указан
    if (fieldConfig.maxSelections && result.length > fieldConfig.maxSelections) {
      return result.slice(0, fieldConfig.maxSelections);
    }

    // Удаляем дубликаты
    return [...new Set(result)];
  }

  // Если одно значение, преобразуем в массив
  const str = String(value).trim();
  return str === '' ? [] : [str];
}

/**
 * Санитизация значения checkbox
 * @param {*} value - Значение для санитизации
 * @param {Object} fieldConfig - Конфигурация поля
 * @param {SanitizeOptions} options - Опции санитизации
 * @returns {boolean} - Булево значение
 */
function sanitizeCheckbox(value, fieldConfig = {}, options = {}) {
  if (value === null || value === undefined || value === '') {
    return false;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    const lower = value.trim().toLowerCase();
    return lower === 'true' || lower === '1' || lower === 'on' || lower === 'yes';
  }

  return Boolean(value);
}

/**
 * Санитизация значения segmented-toggle
 * @param {*} value - Значение для санитизации
 * @param {Object} fieldConfig - Конфигурация поля
 * @param {SanitizeOptions} options - Опции санитизации
 * @returns {string|null} - Очищенное значение или null
 */
function sanitizeSegmentedToggle(value, fieldConfig = {}, options = {}) {
  const { convertEmptyToNull = false } = options;

  if (value === null || value === undefined || value === '') {
    return convertEmptyToNull ? null : '';
  }

  const str = String(value).trim();

  // Проверяем что значение есть в опциях
  if (fieldConfig.options && Array.isArray(fieldConfig.options)) {
    const validValue = fieldConfig.options.find(opt => {
      const optValue = opt.value !== undefined ? opt.value : opt;
      return String(optValue) === str;
    });

    if (!validValue) {
      return convertEmptyToNull ? null : '';
    }
  }

  return str;
}

/**
 * Санитизация одного поля на основе его типа
 * @param {string} fieldId - Идентификатор поля
 * @param {*} value - Значение поля
 * @param {Object} fieldConfig - Конфигурация поля
 * @param {SanitizeOptions} options - Опции санитизации
 * @returns {*} - Очищенное значение
 */
export function sanitizeField(fieldId, value, fieldConfig = {}, options = {}) {
  const { excludeFields = [] } = options;

  // Пропускаем исключенные поля
  if (excludeFields.includes(fieldId)) {
    return value;
  }

  const fieldType = fieldConfig.type || 'text';

  switch (fieldType) {
    case 'text':
    case 'email':
    case 'url':
    case 'tel':
    case 'password':
      return sanitizeText(value, fieldConfig, options);

    case 'number':
      return sanitizeNumber(value, fieldConfig, options);

    case 'range':
      return sanitizeRange(value, fieldConfig, options);

    case 'select-single':
      return sanitizeSelectSingle(value, fieldConfig, options);

    case 'select-multi':
      return sanitizeSelectMulti(value, fieldConfig, options);

    case 'checkbox':
      return sanitizeCheckbox(value, fieldConfig, options);

    case 'segmented-toggle':
      return sanitizeSegmentedToggle(value, fieldConfig, options);

    default:
      // Для неизвестных типов применяем базовую санитизацию
      if (typeof value === 'string' && options.trimStrings !== false) {
        return value.trim();
      }
      return value;
  }
}

/**
 * Санитизация всей формы (всех полей)
 * @param {Object} values - Объект со значениями полей { fieldId: value }
 * @param {Array<Object>} fields - Массив конфигураций полей
 * @param {SanitizeOptions} options - Опции санитизации
 * @returns {Object} - Объект с очищенными значениями
 */
export function sanitizeForm(values, fields = [], options = {}) {
  if (!values || typeof values !== 'object') {
    return {};
  }

  const sanitized = {};
  const fieldConfigMap = new Map();

  // Создаем карту конфигураций полей для быстрого доступа
  if (Array.isArray(fields)) {
    fields.forEach(field => {
      if (field && field.id) {
        fieldConfigMap.set(field.id, field);
      }
    });
  }

  // Санитизируем каждое поле
  Object.entries(values).forEach(([fieldId, value]) => {
    const fieldConfig = fieldConfigMap.get(fieldId) || {};
    sanitized[fieldId] = sanitizeField(fieldId, value, fieldConfig, options);
  });

  return sanitized;
}

/**
 * Создание функции-хендлера для pipeline.sanitize
 * @param {Array<Object>} fields - Массив конфигураций полей
 * @param {SanitizeOptions} options - Опции санитизации
 * @returns {Function} - Функция-хендлер для pipeline
 */
export function createSanitizeHandler(fields = [], options = {}) {
  return (context) => {
    const values = context.values || {};
    return sanitizeForm(values, fields, options);
  };
}

/**
 * Предустановленные опции санитизации для разных сценариев
 */
export const sanitizePresets = {
  // Строгая санитизация (для пользовательского ввода)
  strict: {
    trimStrings: true,
    convertEmptyToNull: true,
    escapeHtml: true,
    normalizeNumbers: true,
    excludeFields: []
  },

  // Мягкая санитизация (для уже обработанных данных)
  soft: {
    trimStrings: true,
    convertEmptyToNull: false,
    escapeHtml: false,
    normalizeNumbers: false,
    excludeFields: []
  },

  // Для фильтров (сохраняем пустые строки, не экранируем HTML)
  filters: {
    trimStrings: true,
    convertEmptyToNull: false,
    escapeHtml: false,
    normalizeNumbers: true,
    excludeFields: []
  }
};
