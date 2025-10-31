import { BaseElement } from '../base-element.js';

/**
 * Category Catalog Component
 * Каталог с навигацией по категориям (аналог Яндекс.Маркет)
 * Левая часть: дерево категорий с раскрытием/скрытием
 * Правая часть: подкатегории и карточки типов для выбранной категории
 */
export class CategoryCatalog extends BaseElement {
  static stateSchema = {
    selectedCategoryId: { type: 'number', default: null, attribute: { name: 'category-id', observed: true, reflect: true } },
    categories: { type: 'json', default: [], attribute: null, internal: true },
    expandedNodes: { type: 'json', default: [], attribute: null, internal: true },
    subcategories: { type: 'json', default: [], attribute: null, internal: true },
    types: { type: 'json', default: [], attribute: null, internal: true },
    loading: { type: 'boolean', default: false, attribute: null, internal: true },
    error: { type: 'string', default: null, attribute: null, internal: true },
  };

  constructor() {
    super();
  }

  connectedCallback() {
    window.app.toolkit.loadCSSOnce(new URL('./category-catalog-styles.css', import.meta.url));
    super.connectedCallback();
    this.loadCategoriesTree();
    if (this.state.selectedCategoryId) {
      this.loadSubcategories(this.state.selectedCategoryId);
    }
  }

  async loadCategoriesTree() {
    this.setState({ loading: true, error: null });
    try {
      // TODO: загрузить все категории через REST API
      // GET /wp-json/wp/v2/toy_type_category-of-toys?per_page=100&orderby=menu_order&order=asc
      // Построить дерево на основе parent связей
      const res = await fetch('/wp-json/wp/v2/toy_type_category-of-toys?per_page=100&orderby=menu_order&order=asc', { 
        credentials: 'same-origin' 
      });
      if (res.ok) {
        const categories = await res.json();
        const tree = this.buildTree(categories);
        this.setState({ categories: tree });
      }
    } catch (e) {
      this.setState({ error: e.message || 'Ошибка загрузки категорий' });
      console.error('[category-catalog] Failed to load categories:', e);
    } finally {
      this.setState({ loading: false });
    }
  }

  buildTree(categories) {
    // TODO: построить дерево категорий (родители-дети)
    // Вернуть массив корневых категорий с вложенными children
    return [];
  }

  async loadSubcategories(categoryId) {
    if (!categoryId) return;
    
    this.setState({ loading: true });
    try {
      // TODO: загрузить дочерние категории и типы игрушек для выбранной категории
      // GET /wp-json/wp/v2/toy_type_category-of-toys?parent={categoryId}
      // GET /wp-json/wp/v2/toy_type?toy_type_category-of-toys={categoryId}&per_page=20
      // Отсортировать подкатегории по menu_order
      const [subcatsRes, typesRes] = await Promise.all([
        fetch(`/wp-json/wp/v2/toy_type_category-of-toys?parent=${categoryId}&orderby=menu_order&order=asc`, { credentials: 'same-origin' }),
        fetch(`/wp-json/wp/v2/toy_type?toy_type_category-of-toys=${categoryId}&per_page=20`, { credentials: 'same-origin' })
      ]);
      
      const subcategories = subcatsRes.ok ? await subcatsRes.json() : [];
      const types = typesRes.ok ? await typesRes.json() : [];
      
      this.setState({ subcategories, types });
    } catch (e) {
      console.error('[category-catalog] Failed to load subcategories:', e);
    } finally {
      this.setState({ loading: false });
    }
  }

  toggleNode(categoryId) {
    // Раскрыть/скрыть дочерние элементы категории
    const expanded = [...(this.state.expandedNodes || [])];
    const index = expanded.indexOf(categoryId);
    if (index > -1) {
      expanded.splice(index, 1);
    } else {
      expanded.push(categoryId);
    }
    this.setState({ expandedNodes: expanded });
    this.render();
  }

  onCategorySelect(categoryId) {
    // Выбрать категорию: загрузить подкатегории и товары
    this.setState({ selectedCategoryId: categoryId });
    this.loadSubcategories(categoryId);
    // Раскрыть путь к выбранной категории в дереве
    this.expandPathToCategory(categoryId);
    this.render();
  }

  expandPathToCategory(categoryId) {
    // TODO: найти путь от корня до категории и раскрыть все узлы пути
    const expanded = [...(this.state.expandedNodes || [])];
    // Логика поиска и раскрытия пути
    this.setState({ expandedNodes: expanded });
  }

  renderCategoryTree(categories, level = 0) {
    // TODO: рекурсивно отрендерить дерево категорий
    // Каждый узел: кнопка раскрытия/скрытия, название, клик для выбора
    return '';
  }

  renderSubcategories() {
    // TODO: отрендерить подкатегории выбранной категории
    // Группировка по родителям или плоский список
    // Ссылки на подкатегории или карточки типов
    return '';
  }

  render() {
    // TODO: реализовать рендер каталога после получения data model
    // Левая часть: дерево категорий (sidebar)
    // Правая часть: подкатегории и карточки типов
  }
}

customElements.define('category-catalog', CategoryCatalog);

