/**
 * Validation Registry
 * 
 * Реестр правил валидации для UI Form Kit.
 * Предоставляет стандартизированный способ регистрации и выполнения валидаторов.
 */

/**
 * Формат ошибки валидации
 * @typedef {Object} ValidationError
 * @property {string} rule - Код правила валидации (например, 'required', 'minLength', 'pattern')
 * @property {string} message - Сообщение об ошибке для пользователя
 * @property {string} [severity='error'] - Уровень серьёзности: 'error', 'warning', 'info'
 * @property {string} [fieldId] - ID поля (заполняется автоматически при валидации поля)
 */

/**
 * Формат результата валидации
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Результат валидации (true = валидно, false = ошибки)
 * @property {ValidationError[]} errors - Массив ошибок
 * @property {Object<string, {status: string, messages: {error: string[], warning?: string[], info?: string[]}}>} [fieldMessages] - Сообщения по полям (для совместимости с form-controller)
 * @property {Object} [formMessages] - Сообщения уровня формы
 */

/**
 * Функция валидатора (синхронная)
 * @callback SyncValidator
 * @param {*} value - Значение поля
 * @param {*} ruleValue - Значение правила (из конфигурации)
 * @param {Object} context - Контекст валидации { fieldId, fieldConfig, formValues }
 * @returns {boolean|ValidationError|ValidationError[]} - true если валидно, иначе ошибка или массив ошибок
 */

/**
 * Функция валидатора (асинхронная)
 * @callback AsyncValidator
 * @param {*} value - Значение поля
 * @param {*} ruleValue - Значение правила (из конфигурации)
 * @param {Object} context - Контекст валидации { fieldId, fieldConfig, formValues }
 * @returns {Promise<boolean|ValidationError|ValidationError[]>} - Promise с результатом
 */

/**
 * Конфигурация валидатора
 * @typedef {Object} ValidatorConfig
 * @property {string} rule - Код правила
 * @property {SyncValidator|AsyncValidator} validator - Функция валидатора
 * @property {string} [defaultMessage] - Сообщение по умолчанию
 * @property {boolean} [async=false] - Асинхронный валидатор
 */

class ValidationRegistry {
  constructor() {
    this._validators = new Map();
    this._registerBuiltInValidators();
  }

  /**
   * Регистрация встроенных валидаторов
   * @private
   */
  _registerBuiltInValidators() {
    // required
    this.register({
      rule: 'required',
      validator: (value, ruleValue, context) => {
        if (!ruleValue) return true;
        const isEmpty = value === null || value === undefined || value === '' ||
                       (Array.isArray(value) && value.length === 0) ||
                       (typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length === 0);
        if (isEmpty) {
          return {
            rule: 'required',
            message: context.fieldConfig?.label 
              ? `${context.fieldConfig.label} обязательно для заполнения`
              : 'Поле обязательно для заполнения',
            severity: 'error'
          };
        }
        return true;
      }
    });

    // minLength
    this.register({
      rule: 'minLength',
      validator: (value, ruleValue, context) => {
        if (value === null || value === undefined || value === '') return true;
        const str = String(value);
        if (str.length < ruleValue) {
          return {
            rule: 'minLength',
            message: `Минимальная длина: ${ruleValue} символов`,
            severity: 'error'
          };
        }
        return true;
      }
    });

    // maxLength
    this.register({
      rule: 'maxLength',
      validator: (value, ruleValue, context) => {
        if (value === null || value === undefined || value === '') return true;
        const str = String(value);
        if (str.length > ruleValue) {
          return {
            rule: 'maxLength',
            message: `Максимальная длина: ${ruleValue} символов`,
            severity: 'error'
          };
        }
        return true;
      }
    });

    // pattern (regex)
    this.register({
      rule: 'pattern',
      validator: (value, ruleValue, context) => {
        if (value === null || value === undefined || value === '') return true;
        const str = String(value);
        const regex = ruleValue instanceof RegExp ? ruleValue : new RegExp(ruleValue);
        if (!regex.test(str)) {
          return {
            rule: 'pattern',
            message: context.fieldConfig?.validation?.find(v => v.rule === 'pattern')?.message || 'Неверный формат',
            severity: 'error'
          };
        }
        return true;
      }
    });

    // min (number)
    this.register({
      rule: 'min',
      validator: (value, ruleValue, context) => {
        if (value === null || value === undefined || value === '') return true;
        const num = Number(value);
        if (isNaN(num) || num < ruleValue) {
          return {
            rule: 'min',
            message: `Минимальное значение: ${ruleValue}`,
            severity: 'error'
          };
        }
        return true;
      }
    });

    // max (number)
    this.register({
      rule: 'max',
      validator: (value, ruleValue, context) => {
        if (value === null || value === undefined || value === '') return true;
        const num = Number(value);
        if (isNaN(num) || num > ruleValue) {
          return {
            rule: 'max',
            message: `Максимальное значение: ${ruleValue}`,
            severity: 'error'
          };
        }
        return true;
      }
    });

    // range (для ui-input-range)
    this.register({
      rule: 'range',
      validator: (value, ruleValue, context) => {
        if (value === null || value === undefined || typeof value !== 'object') return true;
        const { min, max } = ruleValue || {};
        if (min !== undefined && value.min !== null && value.min !== undefined) {
          const numMin = Number(value.min);
          if (!isNaN(numMin) && numMin < min) {
            return {
              rule: 'range',
              message: `Минимальное значение должно быть не менее ${min}`,
              severity: 'error'
            };
          }
        }
        if (max !== undefined && value.max !== null && value.max !== undefined) {
          const numMax = Number(value.max);
          if (!isNaN(numMax) && numMax > max) {
            return {
              rule: 'range',
              message: `Максимальное значение должно быть не более ${max}`,
              severity: 'error'
            };
          }
        }
        return true;
      }
    });

    // maxSelections (для select-multi)
    this.register({
      rule: 'maxSelections',
      validator: (value, ruleValue, context) => {
        if (!Array.isArray(value)) return true;
        if (value.length > ruleValue) {
          return {
            rule: 'maxSelections',
            message: `Можно выбрать не более ${ruleValue} элементов`,
            severity: 'error'
          };
        }
        return true;
      }
    });

    // email (простая проверка)
    this.register({
      rule: 'email',
      validator: (value, ruleValue, context) => {
        if (!ruleValue || value === null || value === undefined || value === '') return true;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(value))) {
          return {
            rule: 'email',
            message: 'Введите корректный email адрес',
            severity: 'error'
          };
        }
        return true;
      }
    });

    // passwordStrength - проверка сложности пароля
    this.register({
      rule: 'passwordStrength',
      validator: (value, ruleValue, context) => {
        if (!ruleValue || value === null || value === undefined || value === '') return true;
        const password = String(value);
        const errors = [];

        // Минимальная длина 16 символов
        if (password.length < 16) {
          errors.push('Минимум 16 символов');
        }

        // Маленькие буквы
        if (!/[a-zа-я]/.test(password)) {
          errors.push('Маленькие буквы (a-z, а-я)');
        }

        // Большие буквы
        if (!/[A-ZА-Я]/.test(password)) {
          errors.push('Большие буквы (A-Z, А-Я)');
        }

        // Цифры
        if (!/\d/.test(password)) {
          errors.push('Цифры (0-9)');
        }

        // Спецсимволы
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
          errors.push('Спецсимволы (!@#$%^&*...)');
        }

        if (errors.length > 0) {
          return {
            rule: 'passwordStrength',
            message: `Пароль должен содержать: ${errors.join(', ')}`,
            severity: 'error'
          };
        }

        return true;
      }
    });

    // passwordsMatch - проверка совпадения паролей
    this.register({
      rule: 'passwordsMatch',
      validator: (value, ruleValue, context) => {
        if (!ruleValue || value === null || value === undefined || value === '') return true;
        
        // ruleValue должен быть именем поля с паролем для сравнения
        const passwordFieldId = typeof ruleValue === 'string' ? ruleValue : 'password';
        const password = context.formValues?.[passwordFieldId];
        
        if (password !== value) {
          return {
            rule: 'passwordsMatch',
            message: 'Пароли не совпадают',
            severity: 'error'
          };
        }

        return true;
      }
    });
  }

  /**
   * Регистрация валидатора
   * @param {ValidatorConfig} config - Конфигурация валидатора
   * @returns {boolean} - true если успешно зарегистрирован
   */
  register(config) {
    if (!config || !config.rule || typeof config.validator !== 'function') {
      console.warn('[validation-registry] Invalid validator config', config);
      return false;
    }
    this._validators.set(config.rule, {
      validator: config.validator,
      defaultMessage: config.defaultMessage || null,
      async: config.async === true
    });
    return true;
  }

  /**
   * Получение валидатора по коду правила
   * @param {string} rule - Код правила
   * @returns {ValidatorConfig|null} - Конфигурация валидатора или null
   */
  get(rule) {
    return this._validators.get(rule) || null;
  }

  /**
   * Проверка наличия валидатора
   * @param {string} rule - Код правила
   * @returns {boolean} - true если валидатор зарегистрирован
   */
  has(rule) {
    return this._validators.has(rule);
  }

  /**
   * Валидация поля по правилам
   * @param {*} value - Значение поля
   * @param {Array} rules - Массив правил валидации [{ rule, value, message, severity, async }]
   * @param {Object} context - Контекст валидации { fieldId, fieldConfig, formValues }
   * @returns {Promise<ValidationResult>} - Результат валидации
   */
  async validate(value, rules, context = {}) {
    if (!Array.isArray(rules) || rules.length === 0) {
      return { valid: true, errors: [] };
    }

    const errors = [];
    const fieldId = context.fieldId || '';

    for (const ruleConfig of rules) {
      const { rule, value: ruleValue, message: customMessage, severity: customSeverity, async: isAsync } = ruleConfig;
      
      if (!rule) continue;

      const validatorInfo = this.get(rule);
      if (!validatorInfo) {
        console.warn(`[validation-registry] Unknown rule: ${rule}`);
        continue;
      }

      try {
        let result = validatorInfo.validator(value, ruleValue, context);
        
        // Обработка Promise для async валидаторов
        if (result && typeof result.then === 'function') {
          result = await result;
        }

        // result === true означает валидно
        if (result === true || result === null || result === undefined) {
          continue;
        }

        // result - ошибка или массив ошибок
        const errorList = Array.isArray(result) ? result : [result];
        errorList.forEach(error => {
          if (error && typeof error === 'object') {
            errors.push({
              rule: error.rule || rule,
              message: customMessage || error.message || validatorInfo.defaultMessage || 'Ошибка валидации',
              severity: customSeverity || error.severity || 'error',
              fieldId: fieldId
            });
          } else if (typeof error === 'string') {
            errors.push({
              rule: rule,
              message: customMessage || error,
              severity: customSeverity || 'error',
              fieldId: fieldId
            });
          }
        });
      } catch (error) {
        console.error(`[validation-registry] Validation error for rule "${rule}":`, error);
        errors.push({
          rule: rule,
          message: customMessage || 'Ошибка при проверке значения',
          severity: customSeverity || 'error',
          fieldId: fieldId
        });
      }
    }

    const valid = errors.length === 0;
    
    // Форматирование результата для совместимости с form-controller
    const fieldMessages = valid ? null : this._formatFieldMessages(fieldId, errors);
    
    return {
      valid,
      errors,
      fieldMessages
    };
  }

  /**
   * Форматирование ошибок для form-controller
   * @private
   */
  _formatFieldMessages(fieldId, errors) {
    const messages = { error: [], warning: [], info: [] };
    
    errors.forEach(error => {
      const severity = error.severity || 'error';
      if (messages[severity]) {
        messages[severity].push(error.message);
      }
    });

    const status = errors.some(e => e.severity === 'error') ? 'error' : 
                   errors.some(e => e.severity === 'warning') ? 'warning' : 'info';

    return {
      [fieldId]: {
        status,
        messages
      }
    };
  }

  /**
   * Валидация всей формы (всех полей)
   * @param {Object} values - Объект со значениями полей { fieldId: value }
   * @param {Array} fields - Массив конфигураций полей
   * @returns {Promise<ValidationResult>} - Результат валидации
   */
  async validateForm(values, fields) {
    if (!Array.isArray(fields)) {
      return { valid: true, errors: [], fieldMessages: null };
    }

    const allErrors = [];
    const fieldMessages = {};

    for (const fieldConfig of fields) {
      const fieldId = fieldConfig.id;
      if (!fieldId) continue;

      const value = values[fieldId];
      const rules = fieldConfig.validation || [];
      
      if (rules.length === 0) continue;

      const result = await this.validate(value, rules, {
        fieldId,
        fieldConfig,
        formValues: values
      });

      if (!result.valid && result.errors.length > 0) {
        allErrors.push(...result.errors);
      }

      if (result.fieldMessages) {
        Object.assign(fieldMessages, result.fieldMessages);
      }
    }

    const valid = allErrors.length === 0;
    const formMessages = valid ? null : {
      message: 'Пожалуйста, исправьте ошибки в полях формы',
      details: allErrors.map(e => e.message)
    };

    return {
      valid,
      errors: allErrors,
      fieldMessages: Object.keys(fieldMessages).length > 0 ? fieldMessages : null,
      formMessages
    };
  }
}

// Экспорт синглтона
export const validationRegistry = new ValidationRegistry();

// Экспорт класса для создания отдельных инстансов
export { ValidationRegistry };
