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
    const initialState = window.app?.catalog?.getState();
    if (initialState) {
      if (!initialState.sort && window.app?.catalog) {
        window.app.catalog.setSort(this.settings.defaultSort);
      }
      // perPage пока не поддерживается в API, но можно добавить позже
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
    this.resultsComponent = new CatalogResults({
      container: resultsContainer,
      emptyElement: emptyStateEl,
      errorElement: errorEl,
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
    this._previousState = window.app?.catalog?.getState();
    this.fetchAndRender();

    this.setupObserver();
  }

  async fetchAndRender() {
    const catalogState = window.app?.catalog?.getState();
    if (!catalogState) {
      return;
    }
    
    // Устанавливаем флаг загрузки через стор (т.к. setLoading - метод стора, не API)
    if (window.app?.catalogStore) {
      window.app.catalogStore.setLoading(true);
    }
    this.resultsComponent.showSkeleton(renderLoadingSkeleton());

    try {
      const payload = await this.fetchData({ append: false, page: catalogState.page });

      this.resultsComponent.hideSkeleton();
      if (window.app?.catalogStore) {
        window.app.catalogStore.setLoading(false);
      }

      const items = Array.isArray(payload.items) ? payload.items : [];
      this.resultsComponent.renderInitial(items, catalogState.mode);
      
      // Обновляем метаданные в сторе (updateMeta - метод стора, не API)
      if (window.app?.catalogStore) {
        window.app.catalogStore.updateMeta({
          total: payload.meta?.total || 0,
          totalPages: payload.meta?.total_pages || 1,
          availableFilters: payload.meta?.available_filters || {},
          facetCounts: payload.meta?.facet_counts || {},
        });
      }
    } catch (error) {
      console.error('[catalog] Failed to fetch data', error);
      this.resultsComponent.hideSkeleton();
      if (window.app?.catalogStore) {
        window.app.catalogStore.setLoading(false);
        window.app.catalogStore.setError(error);
      }
    }
  }

  async fetchData({ append = false, page } = {}) {
    if (this.pendingRequest) {
      this.pendingRequest.abort();
      this.pendingRequest = null;
    }

    const controller = new AbortController();
    this.pendingRequest = controller;

    const catalogState = window.app?.catalog?.getState();
    if (!catalogState) {
      return { items: [], meta: {} };
    }
    const endpointBase = (this.options.endpoint || '').replace(/\/$/, '');
    const modePath = catalogState.mode === 'instance' ? 'instances' : 'types';
    const params = new URLSearchParams();

    const perPage = this.normalizePerPage(catalogState.perPage);

    params.set('per_page', perPage);
    params.set('page', page || catalogState.page);

    if (catalogState.search) {
      params.set('search', catalogState.search);
    }

    if (catalogState.sort) {
      params.set('sort', catalogState.sort);
    }

    Object.keys(catalogState.filters || {}).forEach((key) => {
      const values = catalogState.filters[key];
      if (!Array.isArray(values)) {
        return;
      }
      values.forEach((value) => {
        params.append(`filters[${key}][]`, value);
      });
    });

    const url = `${endpointBase}/${modePath}?${params.toString()}`;
    const response = await fetch(url, { credentials: 'same-origin', signal: controller.signal });

    if (!response.ok) {
      throw new Error(`Catalog request failed with status ${response.status}`);
    }

    const data = await response.json();

    if (this.pendingRequest === controller) {
      this.pendingRequest = null;
    }

    return data;
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

    // Проверяем, изменилось ли состояние каталога (filters, search, sort, mode, page)
    const currentStateStr = JSON.stringify({
      mode: catalogState.mode,
      page: catalogState.page,
      search: catalogState.search,
      sort: catalogState.sort,
      filters: catalogState.filters,
    });

    const previousStateStr = this._previousState
      ? JSON.stringify({
          mode: this._previousState.mode,
          page: this._previousState.page,
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
    const catalogState = window.app?.catalog?.getState();
    
    if (!meta || !catalogState) {
      return false;
    }
    
    const totalPages = meta.totalPages || 1;
    return catalogState.page < totalPages && !this.pendingAppend;
  }

  async loadNextPage() {
    if (!this.shouldLoadMore()) {
      return;
    }

    this.pendingAppend = true;
    const catalogState = window.app?.catalog?.getState();
    if (!catalogState) {
      this.pendingAppend = false;
      return;
    }

    const nextPage = catalogState.page + 1;

    try {
      const payload = await this.fetchData({ page: nextPage });

      const items = Array.isArray(payload.items) ? payload.items : [];
      if (items.length) {
        this.resultsComponent.appendItems(items, catalogState.mode);
      }

      // Обновляем метаданные в сторе (updateMeta - метод стора, не API)
      if (window.app?.catalogStore) {
        const currentMeta = window.app.catalogStore.getMeta();
        window.app.catalogStore.updateMeta({
          total: payload.meta?.total || currentMeta.total,
          totalPages: payload.meta?.total_pages || currentMeta.totalPages,
          availableFilters: payload.meta?.available_filters || currentMeta.availableFilters,
          facetCounts: payload.meta?.facet_counts || currentMeta.facetCounts,
        });
      }

      // Обновляем страницу через API (replace: true не поддерживается, но это не критично)
      if (window.app?.catalog) {
        window.app.catalog.setPage(nextPage);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('[catalog] Failed to load next page', error);
        if (window.app?.catalogStore) {
          window.app.catalogStore.setError(error);
        }
      }
    } finally {
      this.pendingAppend = false;
    }
  }
}