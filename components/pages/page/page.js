import { BaseElement } from '../../base-element.js';
import { page_template } from './page-template.js';

/**
 * Page Component
 * Отображение отдельной страницы WordPress (page post type)
 * Автономный компонент: загружает данные по ID через WP REST API
 */
export class Page extends BaseElement {
  static stateSchema = {
    id: { type: 'number', default: null, attribute: { name: 'id', observed: true, reflect: true } },
    data: { type: 'json', default: null, attribute: null, internal: true },
    loading: { type: 'boolean', default: false, attribute: null, internal: true },
    error: { type: 'string', default: null, attribute: null, internal: true },
  };

  constructor() {
    super();
  }

  connectedCallback() {
    window.app.toolkit.loadCSSOnce(new URL('./page-styles.css', import.meta.url));
    super.connectedCallback();
    if (this.state.id) {
      this.loadData();
    } else {
      this.render();
    }
  }

  async loadData() {
    const { id } = this.state;
    if (!id) return;
    
    this.setState({ loading: true, error: null });
    try {
      const res = await fetch(`/wp-json/wp/v2/pages/${id}?_embed=1`, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      this.setState({ data: json });
    } catch (e) {
      this.setState({ error: e.message || 'Ошибка загрузки' });
    } finally {
      this.setState({ loading: false });
    }
  }

  onStateChanged(key) {
    if (key === 'id') {
      this.loadData();
    } else if (key === 'loading' || key === 'data' || key === 'error') {
      this.render();
    }
  }

  render() {
    this.innerHTML = page_template(this.state);
  }
}

customElements.define('wp-page', Page);

