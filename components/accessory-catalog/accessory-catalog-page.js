/**
 * Accessory Catalog Page Orchestrator
 * 
 * Responsibilities:
 * - Bootstrap sidebar, toolbar, and results components
 * - Coordinate shared state via accessory-catalog-store
 * - Subscribe to data source updates and push them into the results list
 * - Expose lifecycle hooks for infinite scroll and route changes
 */

import { renderAccessoryCatalogPage } from './accessory-catalog-page-template.js';
import AccessoryCatalogResults from './results/accessory-catalog-results.js';
import { renderLoadingSkeleton } from './results/results-template.js';
import AccessoryCatalogSidebar from './sidebar/accessory-catalog-sidebar.js';
import AccessoryCatalogToolbar from './toolbar/accessory-catalog-toolbar.js';

// Загружаем стили сразу при импорте модуля
if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./accessory-catalog-page-styles.css', import.meta.url));
  window.app.toolkit.loadCSSOnce(new URL('./results/results-styles.css', import.meta.url));
}

const SCROLL_PREFETCH_OFFSET = 0.6;

// Максимальное значение limit для backend API (ограничение на стороне сервера)
const MAX_LIMIT = 1000;

/**
 * Accessory Catalog Page Orchestrator
 * 
 * Компонент использует публичный API window.app.accessoryCatalog вместо прямого доступа к стору
 * Слушает события elkaretro:accessory-catalog:updated для реактивного обновления данных
 */
export default class AccessoryCatalogPage {
  constructor(options = {}) {
    const globalSettings = typeof window !== 'undefined' && window.accessoryCatalogSettings ? window.accessoryCatalogSettings : {};
    this.settings = {
      perPageOptions: Array.isArray(globalSettings.per_page_options) && globalSettings.per_page_options.length
        ? globalSettings.per_page_options.map((value) => Number(value) || 0).filter((value) => value > 0)
        : [30, 50, 100],
      defaultPerPage: Number(globalSettings.default_per_page) > 0 ? Number(globalSettings.default_per_page) : 30,
      defaultSort: typeof globalSettings.default_sort === 'string' ? globalSettings.default_sort : 'newest',
      sortOptions: Array.isArray(globalSettings.sort_options) && globalSettings.sort_options.length
        ? globalSettings.sort_options
        : ['newest', 'oldest', 'price_low_high', 'price_high_low', 'alphabetical'],
    };

    this.options = {
      endpoint: '',
      perPage: this.settings.defaultPerPage,
      ...options,
    };

    // Нормализуем начальное состояние через API с учётом настроек
    const initialState = window.app?.accessoryCatalog?.getState();
    if (initialState) {
      if (!initialState.sort && window.app?.accessoryCatalog) {
        window.app.accessoryCatalog.setSort(this.settings.defaultSort);
      }
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
    this.pendingAppend = false;
    
    // Отслеживание предыдущего состояния для предотвращения лишних запросов
    this._previousState = null;
  }

  init(rootElement) {
    if (!rootElement) {
      throw new Error('[accessory-catalog] root element is required for initialization');
    }

    this.root = rootElement;
    this.root.innerHTML = renderAccessoryCatalogPage();

    this.loaderEl = this.root.querySelector('[data-accessory-catalog-loader]');
    const sidebarContainer = this.root.querySelector('[data-accessory-catalog-sidebar]');
    const toolbarContainer = this.root.querySelector('[data-accessory-catalog-toolbar]');
    const resultsContainer = this.root.querySelector('[data-accessory-catalog-results]');
    const emptyStateEl = this.root.querySelector('[data-accessory-catalog-empty]');
    const errorEl = this.root.querySelector('[data-accessory-catalog-error]');
    this.sentinel = this.root.querySelector('[data-accessory-catalog-sentinel]');

    // Инициализируем сайдбар с фильтрами
    if (sidebarContainer) {
      this.sidebarComponent = new AccessoryCatalogSidebar();
      this.sidebarComponent.init(sidebarContainer);
    }

    // Инициализируем toolbar (поиск, сортировка)
    if (toolbarContainer) {
      this.toolbarComponent = new AccessoryCatalogToolbar();
      this.toolbarComponent.init(toolbarContainer);
    }

    // Инициализируем компонент результатов
    const endMessageEl = rootElement.querySelector('[data-accessory-catalog-end-message]');
    this.resultsComponent = new AccessoryCatalogResults({
      container: resultsContainer,
      emptyElement: emptyStateEl,
      errorElement: errorEl,
      endMessageElement: endMessageEl,
    });

    // Подписываемся на события каталога для реактивного обновления
    window.addEventListener('elkaretro:accessory-catalog:updated', this._handleCatalogUpdate);
    this.unsubscribeStore = () => {
      window.removeEventListener('elkaretro:accessory-catalog:updated', this._handleCatalogUpdate);
    };

    // Также подписываемся на изменения стора для метаданных (loading, error, meta)
    if (window.app?.accessoryCatalogStore) {
      this.unsubscribeMeta = window.app.accessoryCatalogStore.subscribe((storeState) => {
        // Обновляем индикатор загрузки
        this.setLoading(storeState.isLoading);
        
        // Обновляем ошибки
        if (storeState.error) {
          this.resultsComponent.showError(storeState.error.message || 'Не удалось загрузить каталог.');
        } else {
          this.resultsComponent.hideError();
        }

        // Обновляем метаданные в компоненте результатов
        if (storeState.meta) {
          this.resultsComponent.updateMeta(storeState.meta);
        }
      });
    }

    // Первоначальная загрузка данных
    this._previousState = window.app?.accessoryCatalog?.getState();
    this.fetchAndRender();

    this.setupObserver();
  }

  async fetchAndRender() {
    const catalogState = window.app?.accessoryCatalog?.getState();
    const catalogStore = window.app?.accessoryCatalogStore;
    if (!catalogState || !catalogStore) {
      return;
    }
    
    // Сбрасываем loadedCount при первой загрузке
    catalogStore._state.loadedCount = 0;
    
    // Отключаем IntersectionObserver во время загрузки, чтобы предотвратить второй запрос
    this.teardownObserver();
    
    // Устанавливаем флаг загрузки через стор
    catalogStore.setLoading(true);
    this.resultsComponent.showSkeleton(renderLoadingSkeleton());

    try {
      // При первой загрузке используем limit из URL, но ограничиваем максимумом backend'а
      const requestedLimit = catalogState.limit || 30;
      const limit = Math.min(requestedLimit, MAX_LIMIT);
      
      if (requestedLimit > MAX_LIMIT) {
        console.warn(`[accessory-catalog] Requested limit ${requestedLimit} exceeds backend maximum ${MAX_LIMIT}, using ${MAX_LIMIT} instead`);
      }
      
      const payload = await this.fetchData({ append: false, offset: 0, limit });

      this.resultsComponent.hideSkeleton();
      catalogStore.setLoading(false);

      const items = Array.isArray(payload.items) ? payload.items : [];
      
      this.resultsComponent.renderInitial(items);
      
      // Обновляем loadedCount после успешной загрузки
      if (items.length > 0) {
        catalogStore.incrementLoadedCount(items.length);
      }
      
      // Обновляем метаданные в сторе
      catalogStore.updateMeta({
        total: payload.meta?.total || 0,
        totalPages: payload.meta?.total_pages || 1,
      });
      
      // Проверяем, все ли элементы загружены при первой загрузке
      const total = payload.meta?.total || 0;
      const loadedCount = catalogStore.getLoadedCount();
      
      if (loadedCount >= total && total > 0) {
        if (this.resultsComponent && typeof this.resultsComponent.showEndMessage === 'function') {
          this.resultsComponent.showEndMessage();
        }
      } else {
        // Включаем IntersectionObserver обратно только если есть что загружать
        this.setupObserver();
      }
    } catch (error) {
      // Игнорируем AbortError - это нормальное поведение при отмене запроса
      if (error.name === 'AbortError') {
        return;
      }
      
      console.error('[accessory-catalog] Failed to fetch data', error);
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

    const catalogState = window.app?.accessoryCatalog?.getState();
    const catalogStore = window.app?.accessoryCatalogStore;
    if (!catalogState || !catalogStore) {
      this.pendingRequest = null;
      return { items: [], meta: {} };
    }
    const endpointBase = (this.options.endpoint || '').replace(/\/$/, '');
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
    const queryString = params.toString().replace(/%2C/g, ',');
    // Endpoint уже содержит полный путь /accessories, поэтому используем его как есть
    const url = `${endpointBase}?${queryString}`;
    
    try {
      const response = await fetch(url, { credentials: 'same-origin', signal: controller.signal });

      if (!response.ok) {
        throw new Error(`Accessory catalog request failed with status ${response.status}`);
      }

      const data = await response.json();
      
      // Очищаем pendingRequest только если это всё ещё наш запрос (защита от race condition)
      if (this.pendingRequest === controller) {
        this.pendingRequest = null;
      }

      return data;
    } catch (fetchError) {
      // Если запрос был отменён, просто выходим без ошибки
      if (fetchError.name === 'AbortError') {
        if (this.pendingRequest === controller) {
          this.pendingRequest = null;
        }
        return { items: [], meta: {} };
      }
      
      // Очищаем pendingRequest перед пробросом ошибки
      if (this.pendingRequest === controller) {
        this.pendingRequest = null;
      }
      
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
   * @param {Object} detail - Детали события elkaretro:accessory-catalog:updated
   * @private
   */
  _onCatalogStateChange(detail) {
    if (!detail || !detail.state) {
      return;
    }

    const catalogState = detail.state;

    // Проверяем, изменилось ли состояние каталога (filters, search, sort, limit)
    const currentStateStr = JSON.stringify({
      limit: catalogState.limit,
      search: catalogState.search,
      sort: catalogState.sort,
      filters: catalogState.filters,
    });

    const previousStateStr = this._previousState
      ? JSON.stringify({
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
    const meta = window.app?.accessoryCatalogStore?.getMeta();
    const catalogStore = window.app?.accessoryCatalogStore;
    
    if (!meta || !catalogStore) {
      return false;
    }
    
    // Не загружаем следующую страницу, если идет загрузка
    const storeState = catalogStore.getState();
    if (storeState.isLoading) {
      return false;
    }
    
    const total = meta.total || 0;
    const loadedCount = catalogStore.getLoadedCount();
    
    return loadedCount < total && !this.pendingAppend;
  }

  async loadNextPage() {
    if (!this.shouldLoadMore()) {
      return;
    }

    this.pendingAppend = true;
    const catalogStore = window.app?.accessoryCatalogStore;
    if (!catalogStore) {
      this.pendingAppend = false;
      return;
    }

    try {
      const payload = await this.fetchData({ append: true });

      const items = Array.isArray(payload.items) ? payload.items : [];
      if (items.length) {
        this.resultsComponent.appendItems(items);
        
        // Обновляем loadedCount после успешной загрузки
        catalogStore.incrementLoadedCount(items.length);
      }

      // Обновляем метаданные в сторе
      const currentMeta = catalogStore.getMeta();
      catalogStore.updateMeta({
        total: payload.meta?.total || currentMeta.total,
        totalPages: payload.meta?.total_pages || currentMeta.totalPages,
      });
      
      // Проверяем, все ли элементы загружены
      const total = payload.meta?.total || currentMeta.total || 0;
      const loadedCount = catalogStore.getLoadedCount();
      
      if (loadedCount >= total && total > 0) {
        if (this.resultsComponent && typeof this.resultsComponent.showEndMessage === 'function') {
          this.resultsComponent.showEndMessage();
        }
        this.teardownObserver();
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('[accessory-catalog] Failed to load next page', error);
        catalogStore.setError(error);
        
        // Если ошибка 400, останавливаем infinite scroll
        if (error.message && error.message.includes('400')) {
          console.warn('[accessory-catalog] Received 400 error, stopping infinite scroll to prevent recursion');
          this.teardownObserver();
        }
      }
    } finally {
      this.pendingAppend = false;
    }
  }
}

