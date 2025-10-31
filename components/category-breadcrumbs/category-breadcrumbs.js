import { BaseElement } from '../base-element.js';

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
    window.app.toolkit.loadCSSOnce(new URL('./category-breadcrumbs-styles.css', import.meta.url));
    super.connectedCallback();
    if (this.state.categoryId) {
      this.loadCategoryPath();
    }
  }

  async loadCategoryPath() {
    const { categoryId } = this.state;
    if (!categoryId) return;
    
    this.setState({ loading: true, error: null });
    try {
      // TODO: реализовать загрузку категории и её родителей через REST API
      // Если указана только дочерняя категория - подтянуть всех родителей через parent
      // Построить полный путь от корня до текущей категории
      const category = await this.fetchCategory(categoryId);
      const path = await this.buildCategoryPath(category);
      this.setState({ categories: path });
    } catch (e) {
      this.setState({ error: e.message || 'Ошибка загрузки' });
    } finally {
      this.setState({ loading: false });
    }
  }

  async fetchCategory(id) {
    // TODO: GET /wp-json/wp/v2/toy_type_category-of-toys/{id}
    return null;
  }

  async buildCategoryPath(category) {
    // TODO: рекурсивно собрать путь от корня через parent
    return [];
  }

  onStateChanged(key) {
    if (key === 'categoryId') this.loadCategoryPath();
  }

  render() {
    // TODO: реализовать рендер хлебных крошек после получения data model
    // Каждая категория кликабельна
  }
}

customElements.define('category-breadcrumbs', CategoryBreadcrumbs);

