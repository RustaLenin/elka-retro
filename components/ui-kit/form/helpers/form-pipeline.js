/**
 * Form Pipeline Utilities
 * 
 * Утилиты для оркестрации пайплайна обработки формы: sanitize → validate → submit → handle response.
 * Предоставляет готовые хелперы для интеграции с validation-registry и data-sanitizer.
 */

import { sanitizeForm, sanitizePresets } from './data-sanitizer.js';
import { validationRegistry } from './validation-registry.js';

/**
 * Конфигурация пайплайна
 * @typedef {Object} PipelineConfig
 * @property {Function} [sanitize] - Функция санитизации (context) => sanitizedValues
 * @property {Function} [validate] - Функция валидации (context) => ValidationResult
 * @property {Function} [submit] - Функция отправки (context) => Promise<result>
 * @property {Function} [onSuccess] - Обработчик успеха (context) => void
 * @property {Function} [onError] - Обработчик ошибки (context, error) => void
 * @property {Array<Object>} [fields] - Конфигурации полей для валидации/санитизации
 * @property {Object} [sanitizeOptions] - Опции санитизации
 */

/**
 * Создание обработчика санитизации для pipeline на основе data-sanitizer
 * @param {Array<Object>} fields - Массив конфигураций полей
 * @param {Object} [options] - Опции санитизации (по умолчанию sanitizePresets.strict)
 * @returns {Function} - Функция-обработчик для pipeline.sanitize
 */
export function createPipelineSanitizeHandler(fields = [], options = sanitizePresets.strict) {
  return (context) => {
    const values = context.values || {};
    return sanitizeForm(values, fields, options);
  };
}

/**
 * Создание обработчика валидации на основе validation-registry
 * @param {Array<Object>} fields - Массив конфигураций полей
 * @returns {Function} - Функция-обработчик для pipeline.validate
 */
export function createValidateHandler(fields = []) {
  return async (context) => {
    const values = context.values || {};
    return await validationRegistry.validateForm(values, fields);
  };
}

/**
 * Создание обработчика отправки через REST API
 * @param {string} endpoint - URL эндпоинта
 * @param {Object} [options] - Опции запроса
 * @param {string} [options.method='POST'] - HTTP метод
 * @param {Object} [options.headers={}] - Дополнительные заголовки
 * @param {Function} [options.transform] - Функция преобразования данных перед отправкой (values) => payload
 * @param {Function} [options.handleResponse] - Функция обработки ответа (response) => result
 * @returns {Function} - Функция-обработчик для pipeline.submit
 */
export function createRestSubmitHandler(endpoint, options = {}) {
  const {
    method = 'POST',
    headers = {},
    transform = (values) => values,
    handleResponse = async (response) => {
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
        throw new Error(error.message || `HTTP ${response.status}`);
      }
      return await response.json();
    }
  } = options;

  return async (context) => {
    const values = context.values || {};
    const payload = transform(values);

    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };

    const response = await fetch(endpoint, {
      method,
      headers: defaultHeaders,
      body: JSON.stringify(payload),
      credentials: 'same-origin'
    });

    return await handleResponse(response);
  };
}

/**
 * Создание обработчика отправки с retry политикой
 * @param {Function} submitHandler - Оригинальный обработчик submit
 * @param {Object} [options] - Опции retry
 * @param {number} [options.maxRetries=3] - Максимальное количество попыток
 * @param {number} [options.delay=1000] - Задержка между попытками в миллисекундах
 * @param {Function} [options.shouldRetry] - Функция определения нужно ли повторять (error) => boolean
 * @returns {Function} - Функция-обработчик с retry
 */
export function createRetryHandler(submitHandler, options = {}) {
  const {
    maxRetries = 3,
    delay = 1000,
    shouldRetry = (error) => {
      // По умолчанию повторяем при сетевых ошибках и 5xx статусах
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return true; // Сетевая ошибка
      }
      if (error.status >= 500) {
        return true; // Серверная ошибка
      }
      return false;
    }
  } = options;

  return async (context) => {
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await submitHandler(context);
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries && shouldRetry(error)) {
          // Ждем перед следующей попыткой (экспоненциальная задержка)
          const waitTime = delay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  };
}

/**
 * Создание обработчика onSuccess для сохранения данных
 * @param {Function} storageAdapter - Адаптер хранилища (из form-storage)
 * @param {Object} [options] - Опции
 * @param {boolean} [options.saveOnSuccess=true] - Сохранять при успехе
 * @returns {Function} - Функция-обработчик для pipeline.onSuccess
 */
export function createSaveOnSuccessHandler(storageAdapter, options = {}) {
  const { saveOnSuccess = true } = options;

  return (context) => {
    if (!saveOnSuccess || !storageAdapter) {
      return;
    }

    try {
      const values = context.values || {};
      storageAdapter.save(values, {
        savedAt: Date.now(),
        success: true
      });
    } catch (error) {
      console.error('[form-pipeline] Error saving on success:', error);
    }
  };
}

/**
 * Создание обработчика onError для логирования
 * @param {Object} [options] - Опции
 * @param {Function} [options.logger] - Функция логирования (error, context) => void
 * @param {boolean} [options.showToUser=false] - Показывать ошибку пользователю
 * @returns {Function} - Функция-обработчик для pipeline.onError
 */
export function createErrorHandler(options = {}) {
  const {
    logger = (error, context) => {
      console.error('[form-pipeline] Submit error:', error, context);
    },
    showToUser = false
  } = options;

  return (context, error) => {
    logger(error, context);

    if (showToUser && context.controller) {
      // Можно отобразить ошибку через form-controller
      if (typeof context.controller._setFormStatus === 'function') {
        context.controller._setFormStatus({
          type: 'error',
          message: error.message || 'Ошибка отправки формы',
          details: []
        });
      }
    }
  };
}

/**
 * Создание полного пайплайна с готовыми обработчиками
 * @param {PipelineConfig} config - Конфигурация пайплайна
 * @returns {Object} - Объект с обработчиками пайплайна
 */
export function createPipeline(config = {}) {
  const {
    fields = [],
    sanitizeOptions = sanitizePresets.strict,
    endpoint,
    submitHandler,
    storageAdapter,
    errorHandlerOptions = {},
    retryOptions = null
  } = config;

  const pipeline = {};

  // Санитизация
  if (config.sanitize) {
    pipeline.sanitize = config.sanitize;
  } else if (fields.length > 0) {
    pipeline.sanitize = createPipelineSanitizeHandler(fields, sanitizeOptions);
  }

  // Валидация
  if (config.validate) {
    pipeline.validate = config.validate;
  } else if (fields.length > 0) {
    pipeline.validate = createValidateHandler(fields);
  }

  // Отправка
  if (config.submit) {
    pipeline.submit = config.submit;
  } else if (endpoint) {
    const submit = createRestSubmitHandler(endpoint, config.restOptions || {});
    pipeline.submit = retryOptions 
      ? createRetryHandler(submit, retryOptions)
      : submit;
  } else if (submitHandler) {
    pipeline.submit = retryOptions
      ? createRetryHandler(submitHandler, retryOptions)
      : submitHandler;
  }

  // onSuccess
  if (config.onSuccess) {
    pipeline.onSuccess = config.onSuccess;
  } else if (storageAdapter) {
    pipeline.onSuccess = createSaveOnSuccessHandler(storageAdapter);
  }

  // onError
  if (config.onError) {
    pipeline.onError = config.onError;
  } else {
    pipeline.onError = createErrorHandler(errorHandlerOptions);
  }

  return pipeline;
}

/**
 * Предустановленные конфигурации пайплайна
 */
export const pipelinePresets = {
  // Стандартный пайплайн (REST API)
  rest: (endpoint, fields, options = {}) => {
    return createPipeline({
      endpoint,
      fields,
      sanitizeOptions: sanitizePresets.strict,
      ...options
    });
  },

  // Пайплайн для фильтров (без валидации, с сохранением)
  filters: (submitHandler, fields, storageAdapter, options = {}) => {
    return createPipeline({
      submitHandler,
      fields,
      storageAdapter,
      sanitizeOptions: sanitizePresets.filters,
      validate: null, // Фильтры не требуют валидации
      ...options
    });
  },

  // Пайплайн с retry (для нестабильных соединений)
  resilient: (endpoint, fields, options = {}) => {
    return createPipeline({
      endpoint,
      fields,
      sanitizeOptions: sanitizePresets.strict,
      retryOptions: {
        maxRetries: 3,
        delay: 1000,
        ...options.retryOptions
      },
      ...options
    });
  }
};
