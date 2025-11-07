import { BaseElement } from '../base-element.js';
import { category_breadcrumbs_template } from './category-breadcrumbs-template.js';

// Загружаем стили на верхнем уровне модуля (не в connectedCallback)
if (window.app && window.app.toolkit && window.app.toolkit.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./category-breadcrumbs-styles.css', import.meta.url));
}

/**
 * Category Breadcrumbs Component
 * Хлебные крошки для иерархии категорий игрушек
 * Автономный компонент: загружает родителей категории через WP REST API если нужно
 */
export class CategoryBreadcrumbs extends BaseElement {
  static stateSchema = {
    categoryId: { type: 'number', default: null, attribute: { name: 'category-id', observed: true, reflect: true } },
    categories: { type: 'json', default: [], attribute: null, internal: true },
    loading: { type: 'boolean', default: false, attribute: null, internal: true },
    error: { type: 'string', default: null, attribute: null, internal: true },
  };

  constructor() {
    super();
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.state.categoryId) {
      this.loadCategoryPath();
    } else {
      this.render();
    }
  }

  async loadCategoryPath() {
    const { categoryId } = this.state;
    if (!categoryId) {
      this.render();
      return;
    }
    
    this.setState({ loading: true, error: null });
    try {
      // Загружаем категорию и всех её родителей через REST API
      const path = await this.buildCategoryPath(categoryId);
      this.setState({ categories: path });
    } catch (e) {
      console.error('[category-breadcrumbs] Error loading category path:', e);
      this.setState({ error: e.message || 'Ошибка загрузки' });
    } finally {
      this.setState({ loading: false });
    }
  }

  async fetchCategory(id) {
    try {
      const res = await fetch(`/wp-json/wp/v2/category-of-toys/${id}`, { credentials: 'same-origin' });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return await res.json();
    } catch (e) {
      console.error(`[category-breadcrumbs] Failed to fetch category ${id}:`, e);
      throw e;
    }
  }

  async buildCategoryPath(categoryId) {
    const path = [];
    let currentId = categoryId;
    
    // Рекурсивно собираем путь от текущей категории до корня
    while (currentId) {
      try {
        const category = await this.fetchCategory(currentId);
        if (!category) break;
        
        path.unshift({
          id: category.id,
          name: category.name,
          slug: category.slug,
          url: category.link || `/category-of-toys/${category.slug}/`
        });
        
        // Переходим к родительской категории
        currentId = category.parent || 0;
        if (currentId === 0) break;
      } catch (e) {
        console.error(`[category-breadcrumbs] Failed to build path for category ${currentId}:`, e);
        break;
      }
    }
    
    return path;
  }

  onStateChanged(key) {
    if (key === 'categoryId') {
      this.loadCategoryPath();
    } else if (key === 'loading' || key === 'categories' || key === 'error') {
      this.render();
    }
  }

  render() {
    this.innerHTML = category_breadcrumbs_template(this.state);
  }
}

customElements.define('category-breadcrumbs', CategoryBreadcrumbs);

