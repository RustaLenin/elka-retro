import AccessoryCatalogPage from './accessory-catalog-page.js';

class AccessoryCatalogPageElement extends HTMLElement {
  connectedCallback() {
    if (this._initialized) {
      return;
    }

    this._initialized = true;
    this.setup();
  }

  disconnectedCallback() {
    if (this._accessoryCatalogPage && typeof this._accessoryCatalogPage.destroy === 'function') {
      this._accessoryCatalogPage.destroy();
    }
    this._accessoryCatalogPage = null;
    this._initialized = false;
  }

  setup() {
    if (!window?.app?.toolkit) {
      console.warn('[accessory-catalog] app toolkit is not ready');
    } else {
      window.app.toolkit.loadCSSOnce(new URL('./accessory-catalog-page-styles.css', import.meta.url));
      window.app.toolkit.loadCSSOnce(new URL('./results/results-styles.css', import.meta.url));
    }

    const endpoint = this.dataset.endpoint || '';

    this._accessoryCatalogPage = new AccessoryCatalogPage({
      endpoint,
    });

    this._accessoryCatalogPage.init(this);
  }
}

if (!customElements.get('accessory-catalog-page')) {
  customElements.define('accessory-catalog-page', AccessoryCatalogPageElement);
}
