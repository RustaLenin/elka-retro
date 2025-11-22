import BlogPage from './blog-page.js';

class BlogPageElement extends HTMLElement {
  connectedCallback() {
    if (this._initialized) {
      return;
    }

    this._initialized = true;
    this.setup();
  }

  disconnectedCallback() {
    if (this._blogPage && typeof this._blogPage.destroy === 'function') {
      this._blogPage.destroy();
    }
    this._blogPage = null;
    this._initialized = false;
  }

  setup() {
    if (!window?.app?.toolkit) {
      console.warn('[blog] app toolkit is not ready');
    } else {
      window.app.toolkit.loadCSSOnce(new URL('./results/results-styles.css', import.meta.url));
    }

    const endpoint = this.dataset.endpoint || '/wp-json/wp/v2/posts';
    const perPage = Number(this.dataset.perPage) || 10;

    this._blogPage = new BlogPage({
      endpoint,
      perPage,
    });

    this._blogPage.init(this);
  }
}

if (!customElements.get('blog-page')) {
  customElements.define('blog-page', BlogPageElement);
}

