/**
 * Catalog data source abstraction over REST/AJAX endpoints.
 *
 * Responsibilities:
 * - Trigger backend catalog fetches based on current state.
 * - Handle debounced search and request cancellation.
 * - Expose methods for loading next page (infinite scroll).
 * - Normalize responses via result-card-adapter.
 *
 * TODO:
 * - Implement constructor accepting endpoint URLs and fetch helpers.
 * - Implement load(state) returning Promise<{ items, meta }>.
 * - Implement loadNextPage() for infinite scroll.
 * - Implement cancelPendingRequest() to avoid race conditions.
 * - Emit events or promise hooks for loading/error states.
 */

export default class CatalogDataSource {
  constructor(options = {}) {
    this.options = options;
    // TODO: setup default endpoint, debounce timers, abort controllers.
  }

  load(/* state */) {
    // TODO: fetch filtered results and adapt payload.
    return Promise.resolve({ items: [], meta: {} });
  }

  loadNextPage() {
    // TODO: request next page using stored pagination cursor.
    return Promise.resolve({ items: [], meta: {} });
  }

  cancelPendingRequest() {
    // TODO: abort current fetch.
  }
}

