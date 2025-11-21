/**
 * Catalog Store - единый источник истины для состояния каталога.
 *
 * Responsibilities:
 * - Централизованное управление состоянием каталога (mode, filters, sort, pagination, search)
 * - Хранение метаданных (counts, available filters, total pages)
 * - Синхронизация с URL через catalog-url-state
 * - Подписки для компонентов (sidebar, toolbar, results)
 * - Валидация и нормализация состояния
 *
 * Architecture:
 * - Store является singleton (один экземпляр на страницу)
 * - Состояние иммутабельно (все обновления создают новый объект)
 * - Подписки через паттерн Observer
 * - Интеграция с catalog-url-state для синхронизации URL
 */

import {
  parse as parseUrlState,
  applyStateToUrl,
  subscribe as subscribeToUrlState,
} from '../catalog-shared/catalog-url-state.js';

const CATALOG_STORAGE_KEY = 'elkaretro_catalog_state';

/**
 * @typedef {Object} CatalogState
 * @property {string} mode - 'type' | 'instance'
 * @property {number} limit - сколько всего элементов показано (в URL)
 * @property {string} search - поисковый запрос
 * @property {string} sort - сортировка
 * @property {Object<string, string[]>} filters - активные фильтры { filterKey: [values] }
 */

/**
 * @typedef {Object} CatalogMetadata
 * @property {number} total - общее количество результатов
 * @property {number} totalPages - общее количество страниц
 */

/**
 * @typedef {Object} CatalogStoreState
 * @property {CatalogState} state - состояние каталога
 * @property {CatalogMetadata} meta - метаданные результатов
 * @property {boolean} isLoading - флаг загрузки
 * @property {Error|null} error - ошибка загрузки
 * @property {number} loadedCount - сколько элементов уже загружено (для вычисления offset)
 * @property {number} perPage - элементов на странице (для infinite scroll)
 */

class CatalogStore {
  constructor() {
    /** @type {CatalogStoreState} */
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

    const initialStateSource = hasUrlParams
      ? urlState
      : storedState || urlState;

    this._state.state = this._normalizeState(initialStateSource);
    this._saveStateToStorage(this._state.state);

    if (!hasUrlParams && storedState) {
      applyStateToUrl(this._state.state, { replace: true });
    }

    // Подписываемся на изменения URL (popstate, программные изменения)
    this._unsubscribeUrl = subscribeToUrlState((urlState) => {
      const normalized = this._normalizeState(urlState);
      if (this._hasStateChanged(this._state.state, normalized)) {
        this._updateState({ state: normalized }, { syncUrl: false }); // Не синхронизируем URL, т.к. он уже обновлён
      }
    });
  }

  /**
   * Получить состояние по умолчанию
   * @returns {CatalogState}
   * @private
   */
  _getDefaultState() {
    return {
      mode: 'type',
      limit: 30, // Сколько всего показано элементов (в URL)
      search: '',
      sort: 'newest',
      filters: {},
    };
  }

  /**
   * Получить метаданные по умолчанию
   * @returns {CatalogMetadata}
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
   * @param {Partial<CatalogState>} state
   * @returns {CatalogState}
   * @private
   */
  _normalizeState(state = {}) {
    const defaultState = this._getDefaultState();
    const normalized = {
      mode: state.mode === 'instance' ? 'instance' : 'type',
      // Ограничиваем limit максимумом, чтобы предотвратить ошибки от старых больших значений
      limit: (() => {
        const MAX_LIMIT = 1000; // Максимальное значение limit для backend API
        const requestedLimit = Math.max(1, parseInt(state.limit, 10) || defaultState.limit);
        if (requestedLimit > MAX_LIMIT) {
          console.warn(`[catalog-store] Limit ${requestedLimit} from state exceeds maximum ${MAX_LIMIT}, normalized to ${MAX_LIMIT}`);
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
   * @param {CatalogState} oldState
   * @param {CatalogState} newState
   * @returns {boolean}
   * @private
   */
  _hasStateChanged(oldState, newState) {
    return (
      oldState.mode !== newState.mode ||
      oldState.limit !== newState.limit ||
      oldState.search !== newState.search ||
      oldState.sort !== newState.sort ||
      JSON.stringify(oldState.filters) !== JSON.stringify(newState.filters)
    );
  }

  /**
   * Обновление состояния с уведомлением подписчиков
   * @param {Partial<CatalogStoreState>} updates
   * @param {Object} options
   * @param {boolean} options.syncUrl - синхронизировать с URL (default: true)
   * @param {boolean} options.replace - использовать replaceState вместо pushState (default: false)
   * @private
   */
  _updateState(updates, { syncUrl = true, replace = false } = {}) {
    const prevState = this._state;

    // Создаём новый объект состояния (иммутабельность)
    this._state = {
      ...this._state,
      ...updates,
      state: updates.state ? { ...updates.state } : this._state.state,
      meta: updates.meta ? { ...updates.meta } : this._state.meta,
    };

    // Если изменились фильтры, поиск или сортировка - сбрасываем loadedCount
    if (updates.state) {
      const prevCatalogState = prevState.state;
      const nextCatalogState = this._state.state;
      const filtersChanged = JSON.stringify(prevCatalogState.filters) !== JSON.stringify(nextCatalogState.filters);
      const searchChanged = prevCatalogState.search !== nextCatalogState.search;
      const sortChanged = prevCatalogState.sort !== nextCatalogState.sort;
      const modeChanged = prevCatalogState.mode !== nextCatalogState.mode;

      if (filtersChanged || searchChanged || sortChanged || modeChanged) {
        // Сбрасываем счётчик загруженных элементов и limit при изменении фильтров/поиска/сортировки
        this._state.loadedCount = 0;
        // Если limit не был явно указан, сбрасываем на perPage
        if (nextCatalogState.limit === prevCatalogState.limit) {
          this._state.state.limit = this._state.perPage;
        }
      }

      this._state.draftFilters = null;
    }

    if (updates.state) {
      this._saveStateToStorage(this._state.state);
    }

    // Синхронизация с URL
    if (syncUrl && updates.state) {
      applyStateToUrl(this._state.state, { replace });
    }

    // Уведомление подписчиков
    this._notifySubscribers(prevState, this._state);
  }

  /**
   * Уведомление подписчиков об изменении
   * @param {CatalogStoreState} prevState
   * @param {CatalogStoreState} nextState
   * @private
   */
  _notifySubscribers(prevState, nextState) {
    // Отправляем глобальное событие об изменении каталога
    // Это позволяет компонентам реагировать на изменения без прямой подписки на стор
    window.dispatchEvent(
      new CustomEvent('elkaretro:catalog:updated', {
        detail: {
          state: nextState.state,
          meta: nextState.meta,
          isLoading: nextState.isLoading,
          error: nextState.error,
          prevState: prevState.state,
            draftFilters: nextState.draftFilters,
        },
      })
    );

    // Уведомляем подписчиков стора
    this._subscribers.forEach((callback) => {
      try {
        callback(nextState, prevState);
      } catch (error) {
        console.error('[catalog-store] Subscriber error:', error);
      }
    });
  }

  // ==================== Public API ====================

  /**
   * Получить текущее состояние
   * @returns {CatalogStoreState}
   */
  getState() {
    return {
      ...this._state,
      state: { ...this._state.state },
      meta: { ...this._state.meta },
      draftFilters: this._cloneFilters(this._state.draftFilters),
    };
  }

  /**
   * Получить только состояние каталога (без метаданных)
   * @returns {CatalogState}
   */
  getCatalogState() {
    return { ...this._state.state };
  }

  /**
   * Получить метаданные
   * @returns {CatalogMetadata}
   */
  getMeta() {
    return { ...this._state.meta };
  }

  /**
   * Получить черновые фильтры (значения из формы до применения)
   * @returns {Object|null}
   */
  getDraftFilters() {
    return this._cloneFilters(this._state.draftFilters);
  }

  /**
   * Обновить состояние каталога
   * @param {Partial<CatalogState>} stateUpdate
   * @param {Object} options
   * @param {boolean} options.replace - использовать replaceState (default: false)
   */
  updateState(stateUpdate, { replace = false } = {}) {
    const normalized = this._normalizeState({
      ...this._state.state,
      ...stateUpdate,
    });

    this._updateState({ state: normalized }, { syncUrl: true, replace });
  }

  /**
   * Обновить метаданные
   * @param {Partial<CatalogMetadata>} metaUpdate
   */
  updateMeta(metaUpdate) {
    this._updateState(
      {
        meta: {
          ...this._state.meta,
          ...metaUpdate,
        },
      },
      { syncUrl: false }
    );
  }

  /**
   * Установить флаг загрузки
   * @param {boolean} isLoading
   */
  setLoading(isLoading) {
    this._updateState({ isLoading, error: isLoading ? null : this._state.error }, { syncUrl: false });
  }

  /**
   * Установить ошибку
   * @param {Error|null} error
   */
  setError(error) {
    this._updateState({ error, isLoading: false }, { syncUrl: false });
  }

  /**
   * Сбросить состояние к дефолтному
   * @param {Object} options
   * @param {boolean} options.keepMode - сохранить текущий mode (default: false)
   */
  reset({ keepMode = false } = {}) {
    const defaultState = this._getDefaultState();
    const resetState = keepMode ? { ...defaultState, mode: this._state.state.mode } : defaultState;

    this._updateState(
      {
        state: resetState,
        meta: this._getDefaultMeta(),
        error: null,
        isLoading: false,
        loadedCount: 0,
      },
      { syncUrl: true, replace: false }
    );
  }

  /**
   * Подписаться на изменения состояния
   * @param {Function} callback - (nextState, prevState) => void
   * @returns {Function} функция отписки
   */
  subscribe(callback) {
    if (typeof callback !== 'function') {
      throw new Error('[catalog-store] Subscriber must be a function');
    }

    this._subscribers.add(callback);

    // Немедленно вызываем callback с текущим состоянием
    try {
      callback(this.getState(), this.getState());
    } catch (error) {
      console.error('[catalog-store] Initial subscriber callback error:', error);
    }

    // Возвращаем функцию отписки
    return () => {
      this._subscribers.delete(callback);
    };
  }

  /**
   * Подписаться только на изменения состояния каталога (без метаданных)
   * @param {Function} callback - (catalogState, prevCatalogState) => void
   * @returns {Function} функция отписки
   */
  subscribeToState(callback) {
    let prevCatalogState = this.getCatalogState();

    return this.subscribe((nextStoreState, prevStoreState) => {
      const nextCatalogState = nextStoreState.state;
      const prevCatalogStateSnapshot = prevCatalogState;

      if (this._hasStateChanged(prevCatalogStateSnapshot, nextCatalogState)) {
        prevCatalogState = nextCatalogState;
        try {
          callback(nextCatalogState, prevCatalogStateSnapshot);
        } catch (error) {
          console.error('[catalog-store] State subscriber error:', error);
        }
      }
    });
  }

  /**
   * Уничтожить стор (очистка подписок)
   */
  destroy() {
    this._subscribers.clear();
    if (this._unsubscribeUrl) {
      this._unsubscribeUrl();
      this._unsubscribeUrl = null;
    }
  }

  setDraftFilters(filters) {
    const normalized = this._normalizeFiltersMap(filters);
    const prevState = this._state;

    if (this._areFiltersEqual(prevState.draftFilters, normalized)) {
      return;
    }

    this._state = {
      ...this._state,
      draftFilters: normalized,
    };

    this._notifySubscribers(prevState, this._state);
  }

  _hasUrlQueryParams() {
    if (typeof window === 'undefined' || !window.location) {
      return false;
    }
    const query = window.location.search || '';
    return query.length > 1;
  }

  _loadStateFromStorage() {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    try {
      const raw = window.localStorage.getItem(CATALOG_STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    } catch (error) {
      console.warn('[catalog-store] Failed to load state from storage:', error);
    }
    return null;
  }

  _saveStateToStorage(state) {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    try {
      window.localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('[catalog-store] Failed to save state to storage:', error);
    }
  }

  _normalizeFiltersMap(filters) {
    if (!filters || typeof filters !== 'object') {
      return null;
    }

    const normalized = {};

    Object.entries(filters).forEach(([key, value]) => {
      if (!key) {
        return;
      }
      const normalizedKey = String(key).trim();
      if (!normalizedKey) {
        return;
      }

      const normalizedValues = this._normalizeFilterValues(value);
      if (normalizedValues.length > 0) {
        normalized[normalizedKey] = normalizedValues;
      }
    });

    return Object.keys(normalized).length ? normalized : null;
  }

  _normalizeFilterValues(value) {
    if (Array.isArray(value)) {
      return value
        .map((item) => (item === null || item === undefined ? '' : String(item).trim()))
        .filter((item) => item !== '');
    }

    if (value === null || value === undefined) {
      return [];
    }

    const asString = String(value).trim();
    return asString ? [asString] : [];
  }

  _areFiltersEqual(a, b) {
    const normalize = (obj) => {
      if (!obj || typeof obj !== 'object') {
        return {};
      }
      const sorted = {};
      Object.keys(obj)
        .sort()
        .forEach((key) => {
          const values = Array.isArray(obj[key]) ? [...obj[key]] : [];
          sorted[key] = values.sort();
        });
      return sorted;
    };

    const normalizedA = normalize(a);
    const normalizedB = normalize(b);
    return JSON.stringify(normalizedA) === JSON.stringify(normalizedB);
  }

  _cloneFilters(filters) {
    if (!filters || typeof filters !== 'object') {
      return null;
    }
    const cloned = {};
    Object.entries(filters).forEach(([key, values]) => {
      cloned[key] = Array.isArray(values) ? [...values] : [];
    });
    return cloned;
  }

  /**
   * Получить текущий loadedCount (сколько элементов уже загружено)
   * @returns {number}
   */
  getLoadedCount() {
    return this._state.loadedCount || 0;
  }

  /**
   * Получить offset для следующего запроса
   * @returns {number}
   */
  getOffset() {
    return this.getLoadedCount();
  }

  /**
   * Увеличить loadedCount после успешной загрузки элементов
   * @param {number} amount - количество загруженных элементов
   */
  incrementLoadedCount(amount) {
    if (typeof amount !== 'number' || amount < 0) {
      return;
    }
    this._state.loadedCount = (this._state.loadedCount || 0) + amount;
  }

  /**
   * Получить perPage (количество элементов на странице для infinite scroll)
   * @returns {number}
   */
  getPerPage() {
    return this._state.perPage || 30;
  }
}

// Singleton instance
let storeInstance = null;

/**
 * Получить экземпляр стора (singleton)
 * @returns {CatalogStore}
 */
export const getCatalogStore = () => {
  if (!storeInstance) {
    storeInstance = new CatalogStore();
  }
  return storeInstance;
};

/**
 * Сбросить экземпляр стора (для тестов)
 * @private
 */
export const _resetStore = () => {
  if (storeInstance) {
    storeInstance.destroy();
    storeInstance = null;
  }
};

export default CatalogStore;

