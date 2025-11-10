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
import {
  parse as parseUrlState,
  subscribe as subscribeToUrlState,
  applyStateToUrl,
} from './catalog-url-state.js';

const SCROLL_PREFETCH_OFFSET = 0.6;

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

    this.state = parseUrlState();
    this.state.mode = this.state.mode === 'instance' ? 'instance' : 'type';
    this.state.perPage = this.normalizePerPage(this.state.perPage);
    this.state.sort = this.state.sort || this.settings.defaultSort;

    this.root = null;
    this.loaderEl = null;
    this.resultsComponent = null;
    this.unsubscribeUrl = null;
    this.sentinel = null;
    this.observer = null;
    this.pendingRequest = null;
  }

  init(rootElement) {
    if (!rootElement) {
      throw new Error('[catalog] root element is required for initialization');
    }

    this.root = rootElement;
    this.root.innerHTML = renderCatalogPage();

    this.loaderEl = this.root.querySelector('[data-catalog-loader]');
    const resultsContainer = this.root.querySelector('[data-catalog-results]');
    const emptyStateEl = this.root.querySelector('[data-catalog-empty]');
    const errorEl = this.root.querySelector('[data-catalog-error]');
    this.sentinel = this.root.querySelector('[data-catalog-sentinel]');

    this.resultsComponent = new CatalogResults({
      container: resultsContainer,
      emptyElement: emptyStateEl,
      errorElement: errorEl,
    });

    this.fetchAndRender();

    this.setupObserver();

    this.unsubscribeUrl = subscribeToUrlState((nextState) => {
      const next = {
        ...this.state,
        ...nextState,
      };

      const changed =
        next.mode !== this.state.mode ||
        next.page !== this.state.page ||
        next.perPage !== this.state.perPage ||
        next.search !== this.state.search ||
        next.sort !== this.state.sort ||
        JSON.stringify(next.filters) !== JSON.stringify(this.state.filters);

      if (!changed) {
        return;
      }

      this.state = next;
      this.fetchAndRender();
    });
  }

  async fetchAndRender() {
    this.setLoading(true);
    this.resultsComponent.showSkeleton(renderLoadingSkeleton());

    try {
      const payload = await this.fetchData({ append: false, page: this.state.page });

      this.resultsComponent.hideSkeleton();
      this.setLoading(false);

      const items = Array.isArray(payload.items) ? payload.items : [];
      this.resultsComponent.renderInitial(items, this.state.mode);
      this.resultsComponent.updateMeta(payload.meta || {});

      this.totalPages = payload.meta?.total_pages || 1;
    } catch (error) {
      console.error('[catalog] Failed to fetch data', error);
      this.resultsComponent.hideSkeleton();
      this.setLoading(false);
      this.resultsComponent.showError('Не удалось загрузить каталог. Попробуйте обновить страницу позже.');
    }
  }

  async fetchData({ append = false, page } = {}) {
    if (this.pendingRequest) {
      this.pendingRequest.abort();
      this.pendingRequest = null;
    }

    const controller = new AbortController();
    this.pendingRequest = controller;

    const endpointBase = (this.options.endpoint || '').replace(/\/$/, '');
    const modePath = this.state.mode === 'instance' ? 'instances' : 'types';
    const params = new URLSearchParams();

    const perPage = this.normalizePerPage(this.state.perPage);

    params.set('per_page', perPage);
    params.set('page', page || this.state.page);

    if (this.state.search) {
      params.set('search', this.state.search);
    }

    if (this.state.sort) {
      params.set('sort', this.state.sort);
    }

    Object.keys(this.state.filters || {}).forEach((key) => {
      const values = this.state.filters[key];
      if (!Array.isArray(values)) {
        return;
      }
      values.forEach((value) => {
        params.append(`filters[${key}]`, value);
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
    if (typeof this.unsubscribeUrl === 'function') {
      this.unsubscribeUrl();
    }
    if (this.resultsComponent) {
      this.resultsComponent.destroy();
    }

    this.resultsComponent = null;
    this.root = null;
    this.loaderEl = null;
    this.teardownObserver();

    if (this.pendingRequest) {
      this.pendingRequest.abort();
      this.pendingRequest = null;
    }
  }

  updateState(partial, { replace = false } = {}) {
    this.state = {
      ...this.state,
      ...partial,
      filters: {
        ...this.state.filters,
        ...(partial.filters || {}),
      },
    };
    this.state.perPage = this.normalizePerPage(this.state.perPage);
    this.state.sort = this.state.sort || this.settings.defaultSort;
    applyStateToUrl(this.state, { replace });
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
    const totalPages = this.totalPages || 1;
    return this.state.page < totalPages && !this.pendingAppend;
  }

  async loadNextPage() {
    if (!this.shouldLoadMore()) {
      return;
    }

    this.pendingAppend = true;
    const nextPage = this.state.page + 1;

    try {
      const payload = await this.fetchData({
        append: true,
        page: nextPage,
      });

      this.state.page = nextPage;
      this.totalPages = payload.meta?.total_pages || this.totalPages;
      applyStateToUrl(this.state, { replace: true });
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('[catalog] Failed to load next page', error);
      }
    } finally {
      this.pendingAppend = false;
    }
  }
}