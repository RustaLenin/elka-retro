/**
 * Catalog page orchestrator.
 *
 * Responsibilities:
 * - Bootstrap sidebar, toolbar, and results components.
 * - Coordinate shared state via catalog-url-state helpers.
 * - Subscribe to data source updates and push them into the results list.
 * - Expose lifecycle hooks for infinite scroll and route changes.
 *
 * TODO:
 * - Implement init() to wire DOM nodes and initialize child components.
 * - Implement bindEvents() to handle cross-component communication.
 * - Implement handleUrlStateChange(state) to react on URL updates.
 * - Implement handleInfiniteScroll() with throttled observer.
 * - Implement destroy() for cleanup on page teardown/navigation.
 */

import { renderCatalogPage } from './catalog-page-template.js';
import CatalogResults from './results/catalog-results.js';
import { renderLoadingSkeleton } from './results/results-template.js';
import CatalogSidebar from './sidebar/catalog-sidebar.js';
import CatalogToolbar from './toolbar/catalog-toolbar.js';

const SCROLL_PREFETCH_OFFSET = 0.6;

// Максимальное значение limit для backend API (ограничение на стороне сервера)
const MAX_LIMIT = 1000;

/**
 * Catalog Page Orchestrator
 * 
 * Компонент использует публичный API window.app.catalog вместо прямого доступа к стору
 * Слушает события elkaretro:catalog:updated для реактивного обновления данных
 */
export default class CatalogPage {
  constructor(options = {}) {
    const globalSettings = typeof window !== 'undefined' && window.catalogSettings ? window.catalogSettings : {};
    this.settings = {
      perPageOptions: Array.isArray(globalSettings.per_page_options) && globalSettings.per_page_options.length
        ? globalSettings.per_page_options.map((value) => Number(value) || 0).filter((value) => value > 0)
        : [30, 50, 100],
      defaultPerPage: Number(globalSettings.default_per_page) > 0 ? Number(globalSettings.default_per_page) : 30,
      defaultSort: typeof globalSettings.default_sort === 'string' ? globalSettings.default_sort : 'newest',
      sortOptions: Array.isArray(globalSettings.sort_options) && globalSettings.sort_options.length
        ? globalSettings.sort_options
        : ['newest', 'oldest'],
    };

    this.options = {
      endpoint: '',
      perPage: this.settings.defaultPerPage,
      ...options,
    };

    // Нормализуем начальное состояние через API с учётом настроек
    // Если store ещё не инициализирован, ждём события готовности
    const ensureStoreReady = () => {
      const initialState = window.app?.catalog?.getState();
      if (initialState) {
        if (!initialState.sort && window.app?.catalog) {
          window.app.catalog.setSort(this.settings.defaultSort);
        }
        // perPage пока не поддерживается в API, но можно добавить позже
      } else if (!window.app?.catalogStore) {
        // Store ещё не готов, ждём события
        window.addEventListener('elkaretro:catalog-store:ready', () => {
          const state = window.app?.catalog?.getState();
          if (state && !state.sort && window.app?.catalog) {
            window.app.catalog.setSort(this.settings.defaultSort);
          }
        }, { once: true });
      }
    };
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', ensureStoreReady, { once: true });
    } else {
      ensureStoreReady();
    }

    // Обработчик событий каталога
    this._handleCatalogUpdate = (event) => {
      this._onCatalogStateChange(event.detail);
    };

    this.root = null;
    this.loaderEl = null;
    this.resultsComponent = null;
    this.sidebarComponent = null;
    this.toolbarComponent = null;
    this.unsubscribeStore = null;
    this.unsubscribeMeta = null;
    this.sentinel = null;
    this.observer = null;
    this.pendingRequest = null;
    
    // Отслеживание предыдущего состояния для предотвращения лишних запросов
    this._previousState = null;
  }

  init(rootElement) {
    if (!rootElement) {
      throw new Error('[catalog] root element is required for initialization');
    }

    this.root = rootElement;
    this.root.innerHTML = renderCatalogPage();

    this.loaderEl = this.root.querySelector('[data-catalog-loader]');
    const sidebarContainer = this.root.querySelector('[data-catalog-sidebar]');
    const toolbarContainer = this.root.querySelector('[data-catalog-toolbar]');
    const resultsContainer = this.root.querySelector('[data-catalog-results]');
    const emptyStateEl = this.root.querySelector('[data-catalog-empty]');
    const errorEl = this.root.querySelector('[data-catalog-error]');
    this.sentinel = this.root.querySelector('[data-catalog-sentinel]');

    // Инициализируем сайдбар с фильтрами
    if (sidebarContainer) {
      this.sidebarComponent = new CatalogSidebar();
      this.sidebarComponent.init(sidebarContainer);
    }

    // Инициализируем toolbar (поиск, сортировка)
    if (toolbarContainer) {
      this.toolbarComponent = new CatalogToolbar();
      this.toolbarComponent.init(toolbarContainer);
    }

    // Инициализируем компонент результатов
    const endMessageEl = rootElement.querySelector('[data-catalog-end-message]');
    this.resultsComponent = new CatalogResults({
      container: resultsContainer,
      emptyElement: emptyStateEl,
      errorElement: errorEl,
      endMessageElement: endMessageEl,
    });

    // Подписываемся на события каталога для реактивного обновления
    window.addEventListener('elkaretro:catalog:updated', this._handleCatalogUpdate);
    this.unsubscribeStore = () => {
      window.removeEventListener('elkaretro:catalog:updated', this._handleCatalogUpdate);
    };

    // Также подписываемся на изменения стора для метаданных (loading, error, meta)
    // Это нужно, т.к. метаданные обновляются через store.updateMeta() в fetchAndRender
    if (window.app?.catalogStore) {
      this.unsubscribeMeta = window.app.catalogStore.subscribe((storeState, prevStoreState) => {
        // Обновляем индикатор загрузки
        this.setLoading(storeState.isLoading);
        
        // Обновляем ошибки
        if (storeState.error && !prevStoreState.error) {
          this.resultsComponent.showError(storeState.error.message || 'Не удалось загрузить каталог.');
        } else if (!storeState.error && prevStoreState.error) {
          this.resultsComponent.hideError();
        }

        // Обновляем метаданные в компоненте результатов
        if (storeState.meta && storeState.meta !== prevStoreState.meta) {
          this.resultsComponent.updateMeta(storeState.meta);
        }
      });
    }

    // Первоначальная загрузка данных
    // Ждём готовности catalogStore перед первой загрузкой данных
    const initDataLoading = () => {
      if (window.app?.catalogStore) {
        this._previousState = window.app?.catalog?.getState();
        this.fetchAndRender();
        this.setupObserver();
      } else {
        // Store ещё не готов, ждём события
        const onStoreReady = () => {
          this._previousState = window.app?.catalog?.getState();
          this.fetchAndRender();
          this.setupObserver();
        };
        window.addEventListener('elkaretro:catalog-store:ready', onStoreReady, { once: true });
        // Также проверяем через небольшой таймаут на случай, если событие уже было отправлено
        setTimeout(() => {
          if (window.app?.catalogStore && !this._previousState) {
            this._previousState = window.app?.catalog?.getState();
            this.fetchAndRender();
            this.setupObserver();
          }
        }, 100);
      }
    };
    
    initDataLoading();
  }

  async fetchAndRender() {
    const catalogState = window.app?.catalog?.getState();
    const catalogStore = window.app?.catalogStore;
    if (!catalogState || !catalogStore) {
      return;
    }
    
    // Сбрасываем loadedCount при первой загрузке
    catalogStore._state.loadedCount = 0;
    
    // Отключаем IntersectionObserver во время загрузки, чтобы предотвратить второй запрос
    this.teardownObserver();
    
    // Устанавливаем флаг загрузки через стор (т.к. setLoading - метод стора, не API)
    catalogStore.setLoading(true);
    this.resultsComponent.showSkeleton(renderLoadingSkeleton());

    try {
      // При первой загрузке используем limit из URL, но ограничиваем максимумом backend'а
      const requestedLimit = catalogState.limit || 30;
      const limit = Math.min(requestedLimit, MAX_LIMIT);
      
      // Если запрошенный limit больше максимума, предупреждаем в консоли
      if (requestedLimit > MAX_LIMIT) {
        console.warn(`[catalog] Requested limit ${requestedLimit} exceeds backend maximum ${MAX_LIMIT}, using ${MAX_LIMIT} instead`);
      }
      
      const payload = await this.fetchData({ append: false, offset: 0, limit });

      this.resultsComponent.hideSkeleton();
      catalogStore.setLoading(false);

      // Диагностика: логируем payload для отладки
      console.log('[catalog] Payload received:', payload);
      console.log('[catalog] Payload items:', payload?.items?.length || 0, payload?.items);
      
      const items = Array.isArray(payload.items) ? payload.items : [];
      
      // Диагностика: логируем данные для отладки
      console.log('[catalog] Fetched items:', items.length, items);
      console.log('[catalog] Mode:', catalogState.mode);
      console.log('[catalog] Results component:', this.resultsComponent);
      
      this.resultsComponent.renderInitial(items, catalogState.mode);
      
      // Обновляем loadedCount после успешной загрузки
      if (items.length > 0) {
        catalogStore.incrementLoadedCount(items.length);
      }
      
      // Обновляем метаданные в сторе (updateMeta - метод стора, не API)
      // Убрали availableFilters и facetCounts - фильтры не возвращаются из API,
      // frontend использует window.taxonomy_terms для опций фильтров
      catalogStore.updateMeta({
        total: payload.meta?.total || 0,
        totalPages: payload.meta?.total_pages || 1,
      });
      
      // Проверяем, все ли элементы загружены при первой загрузке
      const total = payload.meta?.total || 0;
      const loadedCount = catalogStore.getLoadedCount();
      
      if (loadedCount >= total && total > 0) {
        // Все элементы загружены, показываем плашку "Больше загружать нечего"
        if (this.resultsComponent && typeof this.resultsComponent.showEndMessage === 'function') {
          this.resultsComponent.showEndMessage();
        }
        // Не включаем observer, так как больше нечего загружать
      } else {
        // Включаем IntersectionObserver обратно только если есть что загружать
        this.setupObserver();
      }
    } catch (error) {
      // Игнорируем AbortError - это нормальное поведение при отмене запроса
      if (error.name === 'AbortError') {
        return; // Просто выходим, не показываем ошибку
      }
      
      console.error('[catalog] Failed to fetch data', error);
      this.resultsComponent.hideSkeleton();
      catalogStore.setLoading(false);
      catalogStore.setError(error);
      
      // Включаем IntersectionObserver обратно даже при ошибке
      this.setupObserver();
    }
  }

  async fetchData({ append = false, offset, limit } = {}) {
    // Если уже есть активный запрос, отменяем его
    if (this.pendingRequest) {
      this.pendingRequest.abort();
    }
    
    // Создаём новый controller для текущего запроса
    const controller = new AbortController();
    this.pendingRequest = controller;

    const catalogState = window.app?.catalog?.getState();
    const catalogStore = window.app?.catalogStore;
    if (!catalogState || !catalogStore) {
      this.pendingRequest = null;
      return { items: [], meta: {} };
    }
    const endpointBase = (this.options.endpoint || '').replace(/\/$/, '');
    const modePath = catalogState.mode === 'instance' ? 'instances' : 'types';
    const params = new URLSearchParams();

    // Определяем offset и limit
    if (append) {
      // Infinite scroll: используем offset из loadedCount и limit из perPage
      const loadedCount = catalogStore.getLoadedCount();
      const perPage = catalogStore.getPerPage();
      params.set('offset', String(loadedCount));
      params.set('limit', String(perPage));
    } else {
      // Первая загрузка: используем offset=0 и limit из URL, ограниченный максимумом
      params.set('offset', String(offset !== undefined ? offset : 0));
      const requestedLimit = limit !== undefined ? limit : (catalogState.limit || 30);
      const safeLimit = Math.min(requestedLimit, MAX_LIMIT);
      params.set('limit', String(safeLimit));
    }

    if (catalogState.search) {
      params.set('search', catalogState.search);
    }

    if (catalogState.sort) {
      params.set('sort', catalogState.sort);
    }

    Object.keys(catalogState.filters || {}).forEach((key) => {
      const values = catalogState.filters[key];
      if (!Array.isArray(values) || !values.length) {
        return;
      }
      const normalized = Array.from(
        new Set(
          values
            .map((value) => {
              if (value === null || value === undefined) {
                return '';
              }
              return String(value).trim();
            })
        )
      ).filter((value) => value !== '');
      if (!normalized.length) {
        return;
      }
      params.set(key, normalized.join(','));
    });

    // Получаем строку запроса и заменяем закодированные запятые на обычные
    // для читаемости URL (запятая в значении параметра безопасна)
    const queryString = params.toString().replace(/%2C/g, ',');
    const url = `${endpointBase}/${modePath}?${queryString}`;
    
    // Диагностика: логируем параметры запроса
    console.log('[catalog] Fetching data:', { append, offset, limit, url });
    
    try {
      const response = await fetch(url, { credentials: 'same-origin', signal: controller.signal });

      if (!response.ok) {
        throw new Error(`Catalog request failed with status ${response.status}`);
      }

      const data = await response.json();
      
      // Диагностика: логируем сырой ответ от API
      console.log('[catalog] Raw API response:', data);
      console.log('[catalog] Response items:', data?.items?.length || 0, data?.items);
      
      // Очищаем pendingRequest только если это всё ещё наш запрос (защита от race condition)
      if (this.pendingRequest === controller) {
        this.pendingRequest = null;
      }

      return data;
    } catch (fetchError) {
      // Если запрос был отменён, просто выходим без ошибки
      if (fetchError.name === 'AbortError') {
        console.log('[catalog] Fetch aborted (AbortError)');
        // Очищаем pendingRequest только если это наш запрос (защита от race condition)
        if (this.pendingRequest === controller) {
          this.pendingRequest = null;
        }
        return { items: [], meta: {} };
      }
      
      // Очищаем pendingRequest перед пробросом ошибки (защита от race condition)
      if (this.pendingRequest === controller) {
        this.pendingRequest = null;
      }
      
      // Пробрасываем другие ошибки
      throw fetchError;
    }
  }

  setLoading(isLoading) {
    if (!this.loaderEl) return;

    this.loaderEl.hidden = !isLoading;
  }

  destroy() {
    if (typeof this.unsubscribeStore === 'function') {
      this.unsubscribeStore();
    }
    if (typeof this.unsubscribeMeta === 'function') {
      this.unsubscribeMeta();
    }
    if (this.sidebarComponent) {
      this.sidebarComponent.destroy();
    }
    if (this.toolbarComponent) {
      this.toolbarComponent.destroy();
    }
    if (this.resultsComponent) {
      this.resultsComponent.destroy();
    }

    this.sidebarComponent = null;
    this.toolbarComponent = null;
    this.resultsComponent = null;
    this.root = null;
    this.loaderEl = null;
    this.teardownObserver();

    if (this.pendingRequest) {
      this.pendingRequest.abort();
      this.pendingRequest = null;
    }
  }

  /**
   * Обработчик изменений состояния каталога через события
   * @param {Object} detail - Детали события elkaretro:catalog:updated
   * @private
   */
  _onCatalogStateChange(detail) {
    if (!detail || !detail.state) {
      return;
    }

    const catalogState = detail.state;

    // Проверяем, изменилось ли состояние каталога (filters, search, sort, mode, limit)
    const currentStateStr = JSON.stringify({
      mode: catalogState.mode,
      limit: catalogState.limit,
      search: catalogState.search,
      sort: catalogState.sort,
      filters: catalogState.filters,
    });

    const previousStateStr = this._previousState
      ? JSON.stringify({
          mode: this._previousState.mode,
          limit: this._previousState.limit,
          search: this._previousState.search,
          sort: this._previousState.sort,
          filters: this._previousState.filters,
        })
      : null;

    // Если состояние изменилось, загружаем новые данные
    if (currentStateStr !== previousStateStr) {
      this._previousState = { ...catalogState };
      this.fetchAndRender();
    }
  }

  /**
   * Обновить состояние каталога (делегирует в API)
   * Использует публичный API window.app.catalog
   * @param {Partial<CatalogState>} partial
   * @param {Object} options
   * @param {boolean} options.replace
   */
  updateState(partial, { replace = false } = {}) {
    if (!window.app || !window.app.catalog) {
      return;
    }

    // Нормализуем perPage если передан (пока не поддерживается в API)
    if (partial.perPage !== undefined) {
      partial.perPage = this.normalizePerPage(partial.perPage);
    }
    
    // Нормализуем sort если передан
    if (partial.sort !== undefined && !partial.sort) {
      partial.sort = this.settings.defaultSort;
    }

    // Обновляем состояние через API
    if (partial.mode) {
      window.app.catalog.setMode(partial.mode);
    }
    if (partial.search !== undefined) {
      window.app.catalog.setSearch(partial.search);
    }
    if (partial.sort) {
      window.app.catalog.setSort(partial.sort);
    }
    if (partial.filters !== undefined) {
      window.app.catalog.setFilters(partial.filters);
    }
    if (partial.page !== undefined) {
      window.app.catalog.setPage(partial.page);
    }
  }

  normalizePerPage(value) {
    const intValue = Number(value);
    if (Number.isFinite(intValue) && intValue > 0) {
      if (this.settings.perPageOptions.includes(intValue)) {
        return intValue;
      }
      return intValue;
    }
    return this.settings.defaultPerPage;
  }

  setupObserver() {
    if (!this.sentinel || typeof IntersectionObserver === 'undefined') {
      return;
    }

    this.teardownObserver();

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && this.shouldLoadMore()) {
            this.loadNextPage();
          }
        });
      },
      {
        root: null,
        rootMargin: `0px 0px ${Math.round(window.innerHeight * (1 - SCROLL_PREFETCH_OFFSET))}px 0px`,
        threshold: 0,
      }
    );

    this.observer.observe(this.sentinel);
  }

  teardownObserver() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  shouldLoadMore() {
    const meta = window.app?.catalogStore?.getMeta();
    const catalogStore = window.app?.catalogStore;
    
    if (!meta || !catalogStore) {
      return false;
    }
    
    // Не загружаем следующую страницу, если идет загрузка (защита на случай раннего включения observer)
    const storeState = catalogStore.getState();
    if (storeState.isLoading) {
      return false;
    }
    
    const total = meta.total || 0;
    const loadedCount = catalogStore.getLoadedCount();
    
    // Проверяем, есть ли ещё элементы для загрузки
    return loadedCount < total && !this.pendingAppend;
  }

  async loadNextPage() {
    if (!this.shouldLoadMore()) {
      return;
    }

    this.pendingAppend = true;
    const catalogState = window.app?.catalog?.getState();
    const catalogStore = window.app?.catalogStore;
    if (!catalogState || !catalogStore) {
      this.pendingAppend = false;
      return;
    }

    try {
      // Infinite scroll: используем offset из loadedCount и limit из perPage
      const payload = await this.fetchData({ append: true });

      const items = Array.isArray(payload.items) ? payload.items : [];
      if (items.length) {
        this.resultsComponent.appendItems(items, catalogState.mode);
        
        // Обновляем loadedCount после успешной загрузки
        catalogStore.incrementLoadedCount(items.length);
        
        // Не обновляем limit в URL - он остается для первой загрузки
        // Для infinite scroll мы используем offset, а не увеличиваем limit
      }

      // Обновляем метаданные в сторе (updateMeta - метод стора, не API)
      // Убрали availableFilters и facetCounts - фильтры не возвращаются из API
      const currentMeta = catalogStore.getMeta();
      catalogStore.updateMeta({
        total: payload.meta?.total || currentMeta.total,
        totalPages: payload.meta?.total_pages || currentMeta.totalPages,
      });
      
      // Проверяем, все ли элементы загружены
      const total = payload.meta?.total || currentMeta.total || 0;
      const loadedCount = catalogStore.getLoadedCount();
      
      if (loadedCount >= total && total > 0) {
        // Все элементы загружены, показываем плашку "Больше загружать нечего"
        if (this.resultsComponent && typeof this.resultsComponent.showEndMessage === 'function') {
          this.resultsComponent.showEndMessage();
        }
        
        // Отключаем observer, так как больше нечего загружать
        this.teardownObserver();
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('[catalog] Failed to load next page', error);
        catalogStore.setError(error);
        
        // Если ошибка 400 (например, limit превышает максимум), останавливаем infinite scroll
        // чтобы предотвратить бесконечные повторные запросы
        if (error.message && error.message.includes('400')) {
          console.warn('[catalog] Received 400 error, stopping infinite scroll to prevent recursion');
          // Отключаем observer, чтобы предотвратить дальнейшие попытки загрузки
          this.teardownObserver();
        }
      }
    } finally {
      this.pendingAppend = false;
    }
  }
}