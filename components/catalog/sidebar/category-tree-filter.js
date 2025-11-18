import { BaseElement } from '../../base-element.js';
import { renderCategoryTreeFilterTemplate } from './category-tree-filter-template.js';

if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./category-tree-filter-styles.css', import.meta.url));
}

/**
 * Category Tree Filter Component
 * 
 * Иерархический фильтр категорий для каталога.
 * Позволяет выбирать категории из дерева, раскрывать/сворачивать узлы,
 * искать по названиям, разворачивать на весь экран.
 * 
 * Не является полем формы, работает напрямую с catalog-store.
 */
export class CategoryTreeFilter extends BaseElement {
  static stateSchema = {
    // Внутренние состояния (не атрибуты)
    selectedCategories: { type: 'json', default: [], attribute: null, internal: true },
    expandedNodes: { type: 'json', default: [], attribute: null, internal: true },
    searchQuery: { type: 'string', default: '', attribute: null, internal: true },
    isExpanded: { type: 'boolean', default: false, attribute: null, internal: true },
    
    // Дерево категорий (построенное из window.taxonomy_terms)
    categoryTree: { type: 'json', default: [], attribute: null, internal: true },
    
    // Ссылки на DOM элементы
    _searchInput: { type: 'json', default: null, attribute: null, internal: true },
  };

  constructor() {
    super();
    this._onCategoryClick = this._onCategoryClick.bind(this);
    this._onToggleNode = this._onToggleNode.bind(this);
    this._onSearchInput = this._onSearchInput.bind(this);
    this._onClearSearch = this._onClearSearch.bind(this);
    this._onToggleExpanded = this._onToggleExpanded.bind(this);
    this._onCatalogUpdate = this._onCatalogUpdate.bind(this);
    
    // Словарь для быстрого доступа к категориям по ID
    this._categoriesMap = new Map();
    
    // Таймер для debounce поиска
    this._searchDebounceTimer = null;
  }

  connectedCallback() {
    super.connectedCallback();
    
    // Загружаем дерево категорий из window.taxonomy_terms
    this._loadCategoryTree();
    
    // Загружаем состояние раскрытия из localStorage
    this._loadExpandedState();
    
    // Загружаем выбранные категории из стора
    this._loadSelectedFromStore();
    
    // Подписываемся на обновления каталога
    window.addEventListener('elkaretro:catalog:updated', this._onCatalogUpdate);
    
    // Рендерим компонент
    this.render();
    
    // Привязываем события
    this._attachEvents();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._detachEvents();
    window.removeEventListener('elkaretro:catalog:updated', this._onCatalogUpdate);
    
    // Сохраняем состояние раскрытия в localStorage
    this._saveExpandedState();
  }

  /**
   * Загрузить дерево категорий из window.taxonomy_terms
   * @private
   */
  _loadCategoryTree() {
    if (typeof window === 'undefined' || !window.taxonomy_terms) {
      console.warn('[category-tree-filter] window.taxonomy_terms not available');
      return;
    }

    const flatTerms = window.taxonomy_terms['category-of-toys'];
    if (!flatTerms || typeof flatTerms !== 'object') {
      console.warn('[category-tree-filter] category-of-toys terms not found');
      return;
    }

    // Строим дерево из плоской структуры
    const tree = this._buildTree(flatTerms);
    this.setState({ categoryTree: tree });
  }

  /**
   * Построить иерархическое дерево из плоской структуры терминов
   * @param {Object} flatTerms - { term_id: { id, name, slug, parent } }
   * @returns {Array} Массив корневых категорий с вложенными children
   * @private
   */
  _buildTree(flatTerms) {
    // Создаём словарь для быстрого доступа
    this._categoriesMap.clear();
    const nodes = new Map();
    
    // Создаём узлы для всех категорий
    Object.values(flatTerms).forEach(term => {
      const node = {
        id: term.id,
        name: term.name,
        slug: term.slug,
        parent: term.parent || 0,
        children: [],
        toy_types_count: term.toy_types_count || 0, // Количество типов в категории
        _original: term, // Сохраняем оригинальные данные
      };
      nodes.set(term.id, node);
      this._categoriesMap.set(term.id, node);
    });
    
    // Строим дерево: добавляем дочерние узлы к родителям
    const rootNodes = [];
    nodes.forEach(node => {
      if (node.parent === 0 || !nodes.has(node.parent)) {
        // Корневой узел
        rootNodes.push(node);
      } else {
        // Дочерний узел
        const parent = nodes.get(node.parent);
        if (parent) {
          parent.children.push(node);
        }
      }
    });
    
    // Сортируем узлы по имени (рекурсивно)
    const sortNodes = (nodes) => {
      nodes.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
      nodes.forEach(node => {
        if (node.children.length > 0) {
          sortNodes(node.children);
        }
      });
    };
    
    sortNodes(rootNodes);
    
    return rootNodes;
  }

  /**
   * Загрузить состояние раскрытия из localStorage
   * @private
   */
  _loadExpandedState() {
    try {
      const stored = localStorage.getItem('elkaretro_category_filter_expanded');
      if (stored) {
        const expanded = JSON.parse(stored);
        if (Array.isArray(expanded)) {
          this.setState({ expandedNodes: expanded });
        }
      }
    } catch (e) {
      console.warn('[category-tree-filter] Failed to load expanded state:', e);
    }
  }

  /**
   * Сохранить состояние раскрытия в localStorage
   * @private
   */
  _saveExpandedState() {
    try {
      const expanded = Array.from(this.state.expandedNodes || []);
      localStorage.setItem('elkaretro_category_filter_expanded', JSON.stringify(expanded));
    } catch (e) {
      console.warn('[category-tree-filter] Failed to save expanded state:', e);
    }
  }

  /**
   * Загрузить выбранные категории из стора
   * @private
   */
  _loadSelectedFromStore() {
    if (!window.app?.catalogStore) {
      return;
    }

    const catalogState = window.app.catalogStore.getCatalogState();
    const selected = catalogState.filters?.['category-of-toys'] || [];
    
    if (Array.isArray(selected) && selected.length > 0) {
      // Преобразуем slugs/IDs в числа (IDs)
      const selectedIds = selected.map(val => {
        // Если это slug, находим ID по slug
        if (typeof val === 'string' && !/^\d+$/.test(val)) {
          const found = Array.from(this._categoriesMap.values()).find(cat => cat.slug === val);
          return found ? found.id : null;
        }
        return parseInt(val, 10);
      }).filter(id => id && !isNaN(id));
      
      this.setState({ selectedCategories: selectedIds });
      
      // Раскрываем путь к выбранным категориям
      selectedIds.forEach(id => {
        this._expandPathToCategory(id);
      });
    }
  }

  /**
   * Обработчик обновления каталога
   * @param {CustomEvent} event
   * @private
   */
  _onCatalogUpdate(event) {
    const { state } = event.detail || {};
    if (!state) return;

    const selected = state.filters?.['category-of-toys'] || [];
    const selectedIds = Array.isArray(selected) ? selected.map(val => {
      if (typeof val === 'string' && !/^\d+$/.test(val)) {
        const found = Array.from(this._categoriesMap.values()).find(cat => cat.slug === val);
        return found ? found.id : null;
      }
      return parseInt(val, 10);
    }).filter(id => id && !isNaN(id)) : [];

    // Обновляем выбранные категории только если они изменились
    const currentSelected = new Set(this.state.selectedCategories || []);
    const newSelected = new Set(selectedIds);
    
    if (currentSelected.size !== newSelected.size || 
        !Array.from(currentSelected).every(id => newSelected.has(id))) {
      this.setState({ selectedCategories: selectedIds });
      this.render();
    }
  }

  /**
   * Раскрыть путь от корня до указанной категории
   * @param {number} categoryId
   * @private
   */
  _expandPathToCategory(categoryId) {
    const expanded = new Set(this.state.expandedNodes || []);
    const node = this._categoriesMap.get(categoryId);
    
    if (!node) return;
    
    // Поднимаемся вверх по дереву, раскрывая всех родителей
    let current = node;
    while (current && current.parent !== 0) {
      expanded.add(current.parent);
      current = this._categoriesMap.get(current.parent);
    }
    
    this.setState({ expandedNodes: Array.from(expanded) });
  }

  /**
   * Привязать обработчики событий
   * @private
   */
  _attachEvents() {
    // Обработчики будут привязаны после рендера через делегирование
  }

  /**
   * Отвязать обработчики событий
   * @private
   */
  _detachEvents() {
    // Обработчики привязаны через делегирование, очистка не требуется
  }

  /**
   * Обработчик клика по категории (чекбокс)
   * @param {Event} event
   * @private
   */
  _onCategoryClick(event) {
    const checkbox = event.target.closest('[data-category-checkbox]');
    if (!checkbox) return;
    
    // Блокируем клик на disabled категориях
    if (checkbox.disabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const categoryId = parseInt(checkbox.dataset.categoryId, 10);
    if (isNaN(categoryId)) return;
    
    // Проверяем, не пустая ли категория
    const category = this._categoriesMap.get(categoryId);
    if (category && (category.toy_types_count || 0) === 0) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const isChecked = checkbox.checked;
    
    if (isChecked) {
      this._selectCategory(categoryId);
    } else {
      this._deselectCategory(categoryId);
    }
  }

  /**
   * Обработчик клика по кнопке раскрытия/сворачивания
   * @param {Event} event
   * @private
   */
  _onToggleNode(event) {
    const toggleBtn = event.target.closest('[data-toggle-node]');
    if (!toggleBtn) return;

    const categoryId = parseInt(toggleBtn.dataset.categoryId, 10);
    if (isNaN(categoryId)) return;

    this._toggleNode(categoryId);
  }

  /**
   * Обработчик ввода в поисковую строку
   * @param {Event} event
   * @private
   */
  _onSearchInput(event) {
    const query = event.target.value.trim();
    
    // Debounce поиска
    if (this._searchDebounceTimer) {
      clearTimeout(this._searchDebounceTimer);
    }
    
    this._searchDebounceTimer = setTimeout(() => {
      this.setState({ searchQuery: query });
      this.render();
    }, 300);
  }

  /**
   * Обработчик очистки поиска
   * @param {Event} event
   * @private
   */
  _onClearSearch(event) {
    event.preventDefault();
    this.setState({ searchQuery: '' });
    const searchInput = this.querySelector('[data-search-input]');
    if (searchInput) {
      searchInput.value = '';
    }
    this.render();
  }

  /**
   * Обработчик клика по кнопке разворота
   * @param {Event} event
   * @private
   */
  _onToggleExpanded(event) {
    event.preventDefault();
    this._toggleExpanded();
  }

  /**
   * Переключить состояние раскрытия узла
   * @param {number} categoryId
   * @private
   */
  _toggleNode(categoryId) {
    const expanded = new Set(this.state.expandedNodes || []);
    
    if (expanded.has(categoryId)) {
      expanded.delete(categoryId);
    } else {
      expanded.add(categoryId);
    }
    
    this.setState({ expandedNodes: Array.from(expanded) });
    this._saveExpandedState();
    this.render();
  }

  /**
   * Переключить состояние разворота на весь экран
   * Публичный метод для внешнего управления
   */
  toggleExpanded() {
    const isExpanded = !this.state.isExpanded;
    this.setState({ isExpanded });
    this.render();
    
    // Эмитим событие для сайдбара, чтобы скрыть/показать другие фильтры
    this.dispatchEvent(new CustomEvent('category-filter:expanded', {
      bubbles: true,
      composed: true,
      detail: { isExpanded }
    }));
  }

  /**
   * Переключить состояние разворота на весь экран (приватный алиас для внутреннего использования)
   * @private
   */
  _toggleExpanded() {
    this.toggleExpanded();
  }

  /**
   * Выбрать категорию (и все дочерние, если это родитель)
   * @param {number} categoryId
   * @private
   */
  _selectCategory(categoryId) {
    const selected = new Set(this.state.selectedCategories || []);
    const node = this._categoriesMap.get(categoryId);
    
    if (!node) return;
    
    // Рекурсивно выбираем все дочерние категории
    const selectRecursive = (n) => {
      selected.add(n.id);
      n.children.forEach(child => selectRecursive(child));
    };
    
    selectRecursive(node);
    
    this.setState({ selectedCategories: Array.from(selected) });
    this._syncWithStore();
    this.render();
  }

  /**
   * Снять выбор с категории (и всех дочерних)
   * @param {number} categoryId
   * @private
   */
  _deselectCategory(categoryId) {
    const selected = new Set(this.state.selectedCategories || []);
    const node = this._categoriesMap.get(categoryId);
    
    if (!node) return;
    
    // Рекурсивно снимаем выбор со всех дочерних категорий
    const deselectRecursive = (n) => {
      selected.delete(n.id);
      n.children.forEach(child => deselectRecursive(child));
    };
    
    deselectRecursive(node);
    
    // Проверяем, нужно ли снять выбор с родителя
    if (node.parent !== 0) {
      const parent = this._categoriesMap.get(node.parent);
      if (parent) {
        // Если все дочерние сняты, снимаем и родителя
        const allChildrenDeselected = parent.children.every(child => !selected.has(child.id));
        if (allChildrenDeselected) {
          selected.delete(parent.id);
        }
      }
    }
    
    this.setState({ selectedCategories: Array.from(selected) });
    this._syncWithStore();
    this.render();
  }

  /**
   * Синхронизировать выбранные категории со стором
   * @private
   */
  _syncWithStore() {
    if (!window.app?.catalogStore) {
      return;
    }

    const selectedIds = this.state.selectedCategories || [];
    
    // Преобразуем IDs в slugs для URL
    const selectedSlugs = selectedIds
      .map(id => {
        const node = this._categoriesMap.get(id);
        return node ? node.slug : null;
      })
      .filter(Boolean);

    // Обновляем стор
    window.app.catalogStore.updateState({
      filters: {
        ...window.app.catalogStore.getCatalogState().filters,
        'category-of-toys': selectedSlugs.length > 0 ? selectedSlugs : undefined,
      }
    });
  }

  /**
   * Получить видимые категории (с учётом поиска и состояния сворачивания)
   * @returns {Array}
   * @private
   */
  _getVisibleCategories() {
    const tree = this.state.categoryTree || [];
    const searchQuery = (this.state.searchQuery || '').toLowerCase().trim();
    const selected = new Set(this.state.selectedCategories || []);
    const expanded = new Set(this.state.expandedNodes || []);
    const isExpanded = this.state.isExpanded || false;
    
    // Если компонент развёрнут на весь экран, всегда показываем полное дерево
    if (isExpanded) {
      // В развёрнутом состоянии показываем всё дерево, но всё ещё применяем фильтрацию по поиску
      if (searchQuery) {
        return this._filterTreeForSearch(tree, searchQuery, expanded);
      }
      // Без поиска показываем полное дерево
      return tree;
    }
    
    // В свёрнутом состоянии применяем логику фильтрации
    
    // Если ничего не выбрано и нет поиска, показываем только корневые
    if (selected.size === 0 && !searchQuery) {
      return tree;
    }
    
    // Если есть поиск, фильтруем и показываем путь к найденным
    if (searchQuery) {
      return this._filterTreeForSearch(tree, searchQuery, expanded);
    }
    
    // Если что-то выбрано, показываем выбранные + их родителей
    return this._filterTreeForSelected(tree, selected, expanded);
  }

  /**
   * Фильтровать дерево для поиска
   * @param {Array} nodes
   * @param {string} query
   * @param {Set} expanded
   * @returns {Array}
   * @private
   */
  _filterTreeForSearch(nodes, query, expanded) {
    const result = [];
    
    nodes.forEach(node => {
      const matches = node.name.toLowerCase().includes(query);
      const childrenResult = this._filterTreeForSearch(node.children, query, expanded);
      
      if (matches || childrenResult.length > 0) {
        // Раскрываем путь к найденным
        expanded.add(node.id);
        
        result.push({
          ...node,
          children: childrenResult,
          _highlight: matches, // Флаг для подсветки
        });
      }
    });
    
    return result;
  }

  /**
   * Фильтровать дерево для выбранных категорий
   * @param {Array} nodes
   * @param {Set} selected
   * @param {Set} expanded
   * @returns {Array}
   * @private
   */
  _filterTreeForSelected(nodes, selected, expanded) {
    const result = [];
    
    nodes.forEach(node => {
      const isSelected = selected.has(node.id);
      const hasSelectedChildren = node.children.some(child => selected.has(child.id));
      const childrenResult = this._filterTreeForSelected(node.children, selected, expanded);
      
      if (isSelected || hasSelectedChildren || childrenResult.length > 0) {
        // Раскрываем путь к выбранным
        if (isSelected || hasSelectedChildren) {
          expanded.add(node.id);
        }
        
        result.push({
          ...node,
          children: childrenResult,
        });
      }
    });
    
    return result;
  }

  render() {
    const visibleTree = this._getVisibleCategories();
    const selected = new Set(this.state.selectedCategories || []);
    const expanded = new Set(this.state.expandedNodes || []);
    
    this.innerHTML = renderCategoryTreeFilterTemplate({
      tree: visibleTree,
      selected,
      expanded,
      searchQuery: this.state.searchQuery || '',
      isExpanded: this.state.isExpanded || false,
    });
    
    // Привязываем события через делегирование
    this.addEventListener('click', this._onCategoryClick);
    this.addEventListener('click', this._onToggleNode);
    
    const searchInput = this.querySelector('[data-search-input]');
    if (searchInput) {
      searchInput.addEventListener('input', this._onSearchInput);
    }
    
    const clearSearchBtn = this.querySelector('[data-clear-search]');
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', this._onClearSearch);
    }
    
    const expandBtn = this.querySelector('[data-toggle-expanded]');
    if (expandBtn) {
      expandBtn.addEventListener('click', this._onToggleExpanded);
    }
    
    // Устанавливаем indeterminate состояние для частично выбранных чекбоксов
    this.querySelectorAll('[data-indeterminate="true"]').forEach(checkbox => {
      checkbox.indeterminate = true;
    });
  }
}

customElements.define('category-tree-filter', CategoryTreeFilter);

