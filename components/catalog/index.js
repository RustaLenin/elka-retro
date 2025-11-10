import CatalogPage from './catalog-page.js';

class CatalogPageElement extends HTMLElement {
  connectedCallback() {
    if (this._initialized) {
      return;
    }

    this._initialized = true;
    this.setup();
  }

  disconnectedCallback() {
    if (this._catalogPage && typeof this._catalogPage.destroy === 'function') {
      this._catalogPage.destroy();
    }
    this._catalogPage = null;
    this._initialized = false;
  }

  setup() {
    if (!window?.app?.toolkit) {
      console.warn('[catalog] app toolkit is not ready');
    } else {
      window.app.toolkit.loadCSSOnce(new URL('./catalog-page-styles.css', import.meta.url));
      window.app.toolkit.loadCSSOnce(new URL('./results/results-styles.css', import.meta.url));
    }

    const endpoint = this.dataset.endpoint || '';
    const mode = (this.dataset.mode || 'type').toLowerCase();
    const perPage = Number(this.dataset.perPage) || 30;

    this._catalogPage = new CatalogPage({
      endpoint,
      mode,
      perPage,
    });

    this._catalogPage.init(this);
  }
}

if (!customElements.get('catalog-page')) {
  customElements.define('catalog-page', CatalogPageElement);
}