/**
 * Accessory Catalog Store - единый источник истины для состояния каталога аксессуаров.
 *
 * Responsibilities:
 * - Централизованное управление состоянием каталога аксессуаров (filters, sort, pagination, search)
 * - Хранение метаданных (counts, total pages)
 * - Синхронизация с URL через catalog-url-state (без mode)
 * - Подписки для компонентов (sidebar, toolbar, results)
 * - Валидация и нормализация состояния
 *
 * Architecture:
 * - Store является singleton (один экземпляр на страницу)
 * - Состояние иммутабельно (все обновления создают новый объект)
 * - Подписки через паттерн Observer
 * - Интеграция с catalog-url-state для синхронизации URL (без mode)
 */

import {
  parse as parseUrlState,
  applyStateToUrl,
  subscribe as subscribeToUrlState,
} from '../catalog-shared/catalog-url-state.js';

const CATALOG_STORAGE_KEY = 'elkaretro_accessory_catalog_state';

/**
 * @typedef {Object} AccessoryCatalogState
 * @property {number} limit - сколько всего элементов показано (в URL)
 * @property {string} search - поисковый запрос
 * @property {string} sort - сортировка
 * @property {Object<string, string[]>} filters - активные фильтры { filterKey: [values] }
 */

/**
 * @typedef {Object} AccessoryCatalogMetadata
 * @property {number} total - общее количество результатов
 * @property {number} totalPages - общее количество страниц
 */

/**
 * @typedef {Object} AccessoryCatalogStoreState
 * @property {AccessoryCatalogState} state - состояние каталога
 * @property {AccessoryCatalogMetadata} meta - метаданные результатов
 * @property {boolean} isLoading - флаг загрузки
 * @property {Error|null} error - ошибка загрузки
 * @property {number} loadedCount - сколько элементов уже загружено (для вычисления offset)
 * @property {number} perPage - элементов на странице (для infinite scroll)
 */

class AccessoryCatalogStore {
  constructor() {
    /** @type {AccessoryCatalogStoreState} */
    this._state = {
      state: this._getDefaultState(),
      meta: this._getDefaultMeta(),
      isLoading: false,
      error: null,
      draftFilters: null,
      loadedCount: 0, // Сколько элементов уже загружено (для вычисления offset)
      perPage: 30, // Элементов на странице (для infinite scroll)
    };

    /** @type {Set<Function>} */
    this._subscribers = new Set();

    /** @type {Function|null} */
    this._unsubscribeUrl = null;

    // Синхронизация с URL при инициализации
    this._initUrlSync();
  }

  /**
   * Инициализация синхронизации с URL
   * @private
   */
  _initUrlSync() {
    const urlState = parseUrlState();
    const storedState = this._loadStateFromStorage();
    const hasUrlParams = this._hasUrlQueryParams();

    // Для аксессуаров игнорируем mode из URL (если есть)
    const urlStateWithoutMode = { ...urlState };
    delete urlStateWithoutMode.mode;

    const initialStateSource = hasUrlParams
      ? urlStateWithoutMode
      : storedState || urlStateWithoutMode;

    this._state.state = this._normalizeState(initialStateSource);
    this._saveStateToStorage(this._state.state);

    if (!hasUrlParams && storedState) {
      applyStateToUrl(this._state.state, { replace: true });
    }

    // Подписываемся на изменения URL (popstate, программные изменения)
    this._unsubscribeUrl = subscribeToUrlState((urlState) => {
      const urlStateWithoutMode = { ...urlState };
      delete urlStateWithoutMode.mode;
      const normalized = this._normalizeState(urlStateWithoutMode);
      if (this._hasStateChanged(this._state.state, normalized)) {
        this._updateState({ state: normalized }, { syncUrl: false }); // Не синхронизируем URL, т.к. он уже обновлён
      }
    });
  }

  /**
   * Получить состояние по умолчанию
   * @returns {AccessoryCatalogState}
   * @private
   */
  _getDefaultState() {
    return {
      limit: 30, // Сколько всего показано элементов (в URL)
      search: '',
      sort: 'default', // Дефолтная сортировка для аксессуаров (используется 'default' из ACCESSORY_SORTS)
      filters: {},
    };
  }

  /**
   * Получить метаданные по умолчанию
   * @returns {AccessoryCatalogMetadata}
   * @private
   */
  _getDefaultMeta() {
    return {
      total: 0,
      totalPages: 0,
    };
  }

  /**
   * Нормализация состояния (валидация, дефолты)
   * @param {Partial<AccessoryCatalogState>} state
   * @returns {AccessoryCatalogState}
   * @private
   */
  _normalizeState(state = {}) {
    const defaultState = this._getDefaultState();
    const normalized = {
      // Ограничиваем limit максимумом, чтобы предотвратить ошибки от старых больших значений
      limit: (() => {
        const MAX_LIMIT = 1000; // Максимальное значение limit для backend API
        const requestedLimit = Math.max(1, parseInt(state.limit, 10) || defaultState.limit);
        if (requestedLimit > MAX_LIMIT) {
          console.warn(`[accessory-catalog-store] Limit ${requestedLimit} from state exceeds maximum ${MAX_LIMIT}, normalized to ${MAX_LIMIT}`);
        }
        return Math.min(requestedLimit, MAX_LIMIT);
      })(),
      search: typeof state.search === 'string' ? state.search.trim() : defaultState.search,
      sort: typeof state.sort === 'string' && state.sort.trim() ? state.sort.trim() : defaultState.sort,
      filters: {},
    };

    // Нормализация фильтров
    if (state.filters && typeof state.filters === 'object') {
      Object.keys(state.filters).forEach((key) => {
        const values = state.filters[key];
        if (Array.isArray(values) && values.length > 0) {
          const normalizedValues = Array.from(
            new Set(values.filter((v) => typeof v === 'string' && v.trim() !== '').map((v) => v.trim()))
          );
          if (normalizedValues.length > 0) {
            normalized.filters[key] = normalizedValues;
          }
        }
      });
    }

    return normalized;
  }

  /**
   * Проверка изменения состояния
   * @param {AccessoryCatalogState} oldState
   * @param {AccessoryCatalogState} newState
   * @returns {boolean}
   * @private
   */
  _hasStateChanged(oldState, newState) {
    return (
      oldState.limit !== newState.limit ||
      oldState.search !== newState.search ||
      oldState.sort !== newState.sort ||
      JSON.stringify(oldState.filters) !== JSON.stringify(newState.filters)
    );
  }

  /**
   * Установить флаг загрузки
   * @param {boolean} isLoading
   */
  setLoading(isLoading) {
    const prevState = this.getState();
    this._state.isLoading = isLoading;
    this._notifySubscribers(prevState, this.getState());
  }

  /**
   * Установить ошибку
   * @param {Error|null} error
   */
  setError(error) {
    const prevState = this.getState();
    this._state.error = error;
    this._notifySubscribers(prevState, this.getState());
  }

  /**
   * Обновление состояния с уведомлением подписчиков
   * @param {Partial<AccessoryCatalogStoreState>} updates
   * @param {Object} options
   * @param {boolean} options.syncUrl - синхронизировать с URL (default: true)
   * @param {boolean} options.replace - использовать replaceState вместо pushState (default: false)
   * @private
   */
  _updateState(updates, { syncUrl = true, replace = false } = {}) {
    const prevState = this.getState();

    // Создаём новый объект состояния (иммутабельность)
    const newState = {
      ...this._state,
      ...updates,
    };

    // Если обновляется state, нормализуем его
    if (updates.state) {
      newState.state = this._normalizeState(updates.state);

      // Если изменились фильтры, поиск, сортировка - сбрасываем loadedCount и limit
      const filtersChanged = JSON.stringify(prevState.state.filters) !== JSON.stringify(newState.state.filters);
      const searchChanged = prevState.state.search !== newState.state.search;
      const sortChanged = prevState.state.sort !== newState.state.sort;

      if (filtersChanged || searchChanged || sortChanged) {
        newState.loadedCount = 0;
        newState.state.limit = newState.perPage; // Сбрасываем limit на perPage
      }
    }

    // Если обновляется meta
    if (updates.meta) {
      newState.meta = {
        ...this._state.meta,
        ...updates.meta,
      };
    }

    // Обновляем внутреннее состояние
    this._state = newState;

    // Синхронизация с URL (без mode)
    if (syncUrl && updates.state) {
      applyStateToUrl(this._state.state, { replace });
    }

    // Сохраняем в localStorage
    if (updates.state) {
      this._saveStateToStorage(this._state.state);
    }

    // Уведомляем подписчиков
    this._notifySubscribers(prevState, this.getState());
  }

  /**
   * Уведомление подписчиков
   * @param {AccessoryCatalogStoreState} prevState - Предыдущее состояние
   * @param {AccessoryCatalogStoreState} nextState - Новое состояние
   * @private
   */
  _notifySubscribers(prevState = null, nextState = null) {
    const currentState = nextState || this.getState();
    const previousState = prevState || this.getState();

    // Клонируем draftFilters для безопасности
    const draftFiltersClone = currentState.draftFilters ? { ...currentState.draftFilters } : null;

    // Отправляем событие с draftFilters
    window.dispatchEvent(
      new CustomEvent('elkaretro:accessory-catalog:updated', {
        detail: {
          state: { ...currentState.state },
          meta: { ...currentState.meta },
          isLoading: currentState.isLoading,
          error: currentState.error,
          draftFilters: draftFiltersClone,
          prevState: { ...previousState.state },
        },
        bubbles: true,
      })
    );

    // Вызываем коллбеки подписчиков
    this._subscribers.forEach((callback) => {
      try {
        // Создаём клоны для передачи в callback, чтобы избежать мутаций
        const stateClone = {
          ...currentState,
          state: { ...currentState.state },
          meta: { ...currentState.meta },
          draftFilters: draftFiltersClone,
        };
        const prevStateClone = {
          ...previousState,
          state: { ...previousState.state },
          meta: { ...previousState.meta },
          draftFilters: previousState.draftFilters ? { ...previousState.draftFilters } : null,
        };
        callback(stateClone, prevStateClone);
      } catch (error) {
        console.error('[accessory-catalog-store] Error in subscriber callback:', error);
      }
    });
  }

  /**
   * Загрузка состояния из localStorage
   * @returns {AccessoryCatalogState|null}
   * @private
   */
  _loadStateFromStorage() {
    try {
      const stored = localStorage.getItem(CATALOG_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Игнорируем mode из localStorage (если есть)
        delete parsed.mode;
        return this._normalizeState(parsed);
      }
    } catch (error) {
      console.warn('[accessory-catalog-store] Failed to load state from localStorage:', error);
    }
    return null;
  }

  /**
   * Сохранение состояния в localStorage
   * @param {AccessoryCatalogState} state
   * @private
   */
  _saveStateToStorage(state) {
    try {
      localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('[accessory-catalog-store] Failed to save state to localStorage:', error);
    }
  }

  /**
   * Проверка наличия query параметров в URL
   * @returns {boolean}
   * @private
   */
  _hasUrlQueryParams() {
    if (typeof window === 'undefined' || !window.location) {
      return false;
    }

    const params = new URLSearchParams(window.location.search);
    // Игнорируем mode при проверке
    const keys = Array.from(params.keys()).filter(key => key !== 'mode');
    return keys.length > 0;
  }

  /**
   * Получить текущее состояние каталога
   * @returns {AccessoryCatalogState}
   */
  getCatalogState() {
    return { ...this._state.state };
  }

  /**
   * Получить метаданные каталога
   * @returns {AccessoryCatalogMetadata}
   */
  getMeta() {
    return { ...this._state.meta };
  }

  /**
   * Получить полное состояние стора
   * @returns {AccessoryCatalogStoreState}
   */
  getState() {
    return {
      ...this._state,
      state: { ...this._state.state },
      meta: { ...this._state.meta },
      draftFilters: this._state.draftFilters ? { ...this._state.draftFilters } : null,
    };
  }

  /**
   * Обновить состояние каталога
   * @param {Partial<AccessoryCatalogState>} stateUpdates
   */
  updateState(stateUpdates) {
    const newState = {
      ...this._state.state,
      ...stateUpdates,
    };
    this._updateState({ state: newState });
  }

  /**
   * Обновить метаданные
   * @param {Partial<AccessoryCatalogMetadata>} metaUpdates
   */
  updateMeta(metaUpdates) {
    this._updateState({ meta: metaUpdates }, { syncUrl: false });
  }

  /**
   * Установить draft фильтры (для предпросмотра без применения)
   * @param {Object<string, string[]>|null} draftFilters
   */
  setDraftFilters(draftFilters) {
    const prevState = this.getState();
    this._state.draftFilters = draftFilters ? { ...draftFilters } : null;
    this._notifySubscribers(prevState, this.getState());
  }

  /**
   * Получить draft фильтры (для предпросмотра без применения)
   * @returns {Object<string, string[]>|null}
   */
  getDraftFilters() {
    return this._state.draftFilters ? { ...this._state.draftFilters } : null;
  }

  /**
   * Подписаться на изменения состояния
   * @param {Function} callback
   * @returns {Function} Функция для отписки
   */
  subscribe(callback) {
    this._subscribers.add(callback);

    // Сразу вызываем callback с текущим состоянием (как prevState и nextState для начального вызова)
    try {
      const currentState = this.getState();
      callback(currentState, currentState);
    } catch (error) {
      console.error('[accessory-catalog-store] Error in subscriber callback (initial call):', error);
    }

    return () => {
      this._subscribers.delete(callback);
    };
  }

  /**
   * Сброс состояния к дефолтному
   */
  reset() {
    this._updateState({
      state: this._getDefaultState(),
      meta: this._getDefaultMeta(),
      loadedCount: 0,
      error: null,
      draftFilters: null,
    });
  }

  /**
   * Очистка ресурсов
   */
  destroy() {
    if (this._unsubscribeUrl) {
      this._unsubscribeUrl();
      this._unsubscribeUrl = null;
    }
    this._subscribers.clear();
  }

  /**
   * Получить количество загруженных элементов
   * @returns {number}
   */
  getLoadedCount() {
    return this._state.loadedCount;
  }

  /**
   * Получить offset для следующего запроса
   * @returns {number}
   */
  getOffset() {
    return this._state.loadedCount;
  }

  /**
   * Увеличить количество загруженных элементов
   * @param {number} amount - количество добавленных элементов
   */
  incrementLoadedCount(amount) {
    this._state.loadedCount = Math.max(0, this._state.loadedCount + amount);
  }

  /**
   * Получить количество элементов на странице
   * @returns {number}
   */
  getPerPage() {
    return this._state.perPage;
  }
}

// Singleton instance
let accessoryCatalogStoreInstance = null;

/**
 * Получить экземпляр AccessoryCatalogStore (singleton)
 * @returns {AccessoryCatalogStore}
 */
export function getAccessoryCatalogStore() {
  if (!accessoryCatalogStoreInstance) {
    accessoryCatalogStoreInstance = new AccessoryCatalogStore();
  }
  return accessoryCatalogStoreInstance;
}

export default AccessoryCatalogStore;

