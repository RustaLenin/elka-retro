/**
 * Form Storage Adapter
 * 
 * Адаптер для сохранения и восстановления состояния формы в LocalStorage.
 * Поддерживает версионирование данных, миграции и настройки безопасности.
 */

/**
 * Опции хранилища
 * @typedef {Object} StorageOptions
 * @property {string} [version='1.0.0'] - Версия схемы данных (для миграций)
 * @property {number} [maxAge] - Максимальный возраст данных в миллисекундах (автоочистка)
 * @property {number} [maxSize] - Максимальный размер данных в байтах (предупреждение)
 * @property {Array<string>} [excludeFields=[]] - Поля, которые не нужно сохранять (GDPR/privacy)
 * @property {Function} [migrate] - Функция миграции данных (oldVersion, oldData) => newData
 * @property {boolean} [compress=false] - Сжатие данных (использует JSON.stringify, не реальное сжатие)
 */

/**
 * Формат сохраненных данных
 * @typedef {Object} StoredFormData
 * @property {string} version - Версия схемы данных
 * @property {number} timestamp - Время последнего сохранения (Unix timestamp)
 * @property {Object} values - Значения полей формы
 * @property {Object} [metadata] - Дополнительные метаданные
 */

/**
 * Проверка доступности LocalStorage
 * @returns {boolean} - true если LocalStorage доступен
 */
function isLocalStorageAvailable() {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Получение размера строки в байтах (приблизительно)
 * @param {string} str - Строка
 * @returns {number} - Размер в байтах
 */
function getStringSize(str) {
  return new Blob([str]).size;
}

/**
 * Класс адаптера хранилища формы
 */
class FormStorageAdapter {
  constructor(storageKey, options = {}) {
    this.storageKey = storageKey;
    this.options = {
      version: '1.0.0',
      maxAge: null,
      maxSize: 5 * 1024 * 1024, // 5MB по умолчанию
      excludeFields: [],
      migrate: null,
      compress: false,
      ...options
    };

    if (!isLocalStorageAvailable()) {
      console.warn('[form-storage] LocalStorage is not available');
    }
  }

  /**
   * Сохранение состояния формы
   * @param {Object} values - Значения полей формы
   * @param {Object} [metadata] - Дополнительные метаданные
   * @returns {boolean} - true если успешно сохранено
   */
  save(values = {}, metadata = {}) {
    if (!this.storageKey) {
      return false;
    }

    if (!isLocalStorageAvailable()) {
      return false;
    }

    try {
      // Фильтруем исключенные поля
      const filteredValues = this._filterExcludedFields(values);

      // Формируем данные для сохранения
      const data = {
        version: this.options.version,
        timestamp: Date.now(),
        values: filteredValues,
        metadata: metadata
      };

      // Сериализуем в JSON
      const json = JSON.stringify(data);

      // Сохраняем в LocalStorage
      localStorage.setItem(this.storageKey, json);

      return true;
    } catch (error) {
      console.error('[form-storage] Error saving form data:', error);
      return false;
    }
  }

  /**
   * Восстановление состояния формы
   * @returns {Object|null} - Значения полей или null если данных нет
   */
  load() {
    if (!this.storageKey) {
      return null;
    }

    if (!isLocalStorageAvailable()) {
      return null;
    }

    try {
      const json = localStorage.getItem(this.storageKey);
      if (!json) {
        return null;
      }

      const data = JSON.parse(json);

      // Проверка возраста данных
      if (this.options.maxAge && data.timestamp) {
        const age = Date.now() - data.timestamp;
        if (age > this.options.maxAge) {
          // Данные устарели, удаляем
          this.clear();
          return null;
        }
      }

      // Миграция данных если версия изменилась
      if (data.version !== this.options.version && this.options.migrate) {
        const migrated = this.options.migrate(data.version, data);
        if (migrated) {
          // Сохраняем мигрированные данные
          this.save(migrated.values || data.values, migrated.metadata || data.metadata);
          return migrated.values || data.values;
        }
      }

      return data.values || null;
    } catch (error) {
      console.error('[form-storage] Error loading form data:', error);
      // При ошибке парсинга удаляем поврежденные данные
      this.clear();
      return null;
    }
  }

  /**
   * Получение полных данных (включая метаданные)
   * @returns {StoredFormData|null} - Полные данные или null
   */
  loadFull() {
    if (!this.storageKey || !isLocalStorageAvailable()) {
      return null;
    }

    try {
      const json = localStorage.getItem(this.storageKey);
      if (!json) {
        return null;
      }

      const data = JSON.parse(json);

      // Проверка возраста
      if (this.options.maxAge && data.timestamp) {
        const age = Date.now() - data.timestamp;
        if (age > this.options.maxAge) {
          this.clear();
          return null;
        }
      }

      // Миграция если нужно
      if (data.version !== this.options.version && this.options.migrate) {
        const migrated = this.options.migrate(data.version, data);
        if (migrated) {
          this.save(migrated.values || data.values, migrated.metadata || data.metadata);
          return migrated;
        }
      }

      return data;
    } catch (error) {
      console.error('[form-storage] Error loading full form data:', error);
      this.clear();
      return null;
    }
  }

  /**
   * Очистка сохраненных данных
   * @returns {boolean} - true если успешно очищено
   */
  clear() {
    if (!this.storageKey || !isLocalStorageAvailable()) {
      return false;
    }

    try {
      localStorage.removeItem(this.storageKey);
      return true;
    } catch (error) {
      console.error('[form-storage] Error clearing form data:', error);
      return false;
    }
  }

  /**
   * Проверка наличия сохраненных данных
   * @returns {boolean} - true если данные есть
   */
  hasData() {
    if (!this.storageKey || !isLocalStorageAvailable()) {
      return false;
    }

    return localStorage.getItem(this.storageKey) !== null;
  }

  /**
   * Получение метаданных сохраненных данных
   * @returns {Object|null} - Метаданные или null
   */
  getMetadata() {
    const full = this.loadFull();
    return full ? (full.metadata || {}) : null;
  }

  /**
   * Получение времени последнего сохранения
   * @returns {number|null} - Unix timestamp или null
   */
  getTimestamp() {
    const full = this.loadFull();
    return full ? (full.timestamp || null) : null;
  }

  /**
   * Фильтрация исключенных полей
   * @private
   */
  _filterExcludedFields(values) {
    if (!this.options.excludeFields || this.options.excludeFields.length === 0) {
      return values;
    }

    const filtered = { ...values };
    this.options.excludeFields.forEach(fieldId => {
      delete filtered[fieldId];
    });

    return filtered;
  }

  /**
   * Очистка старых данных при переполнении
   * @private
   */
  _clearOldData() {
    // Простая стратегия: очищаем все данные для текущего ключа
    // В будущем можно реализовать более умную стратегию (например, очистку самых старых форм)
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error('[form-storage] Error clearing old data:', error);
    }
  }
}

/**
 * Создание адаптера хранилища для формы
 * @param {string} storageKey - Ключ для LocalStorage
 * @param {StorageOptions} options - Опции хранилища
 * @returns {FormStorageAdapter} - Экземпляр адаптера
 */
export function createFormStorage(storageKey, options = {}) {
  return new FormStorageAdapter(storageKey, options);
}

/**
 * Предустановленные конфигурации хранилища
 */
export const storagePresets = {
  // Стандартное хранилище (без ограничений по возрасту)
  standard: {
    version: '1.0.0',
    excludeFields: []
  },

  // Хранилище для фильтров (автоочистка через 7 дней)
  filters: {
    version: '1.0.0',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 дней
    excludeFields: []
  },

  // Безопасное хранилище (исключает чувствительные поля)
  secure: {
    version: '1.0.0',
    excludeFields: ['password', 'passwordConfirm', 'creditCard', 'ssn', 'token']
  },

  // Временное хранилище (автоочистка через 1 час)
  temporary: {
    version: '1.0.0',
    maxAge: 60 * 60 * 1000, // 1 час
    excludeFields: []
  }
};

// Экспорт класса
export { FormStorageAdapter };
