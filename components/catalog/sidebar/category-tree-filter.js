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
  // Отключаем автоматический рендер, управляем вручную для оптимизации
  static autoRender = false;
  
  static stateSchema = {
    // Конфигурация через атрибуты
    taxonomy: { type: 'string', default: 'category-of-toys', attribute: { name: 'taxonomy', observed: true } },
    filterKey: { type: 'string', default: 'category-of-toys', attribute: { name: 'filter-key', observed: true } },
    storeApi: { type: 'string', default: 'catalog', attribute: { name: 'store-api', observed: true } },
    updateEvent: { type: 'string', default: 'elkaretro:catalog:updated', attribute: { name: 'update-event', observed: true } },
    storageKey: { type: 'string', default: 'elkaretro_category_filter_expanded', attribute: { name: 'storage-key', observed: true } },
    
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
    const updateEvent = this.state.updateEvent || 'elkaretro:catalog:updated';
    this._currentUpdateEvent = updateEvent;
    window.addEventListener(updateEvent, this._onCatalogUpdate);
    
    // Рендерим компонент
    this.render();
    
    // Привязываем события
    this._attachEvents();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._detachEvents();
    
    // Отписываемся от событий
    if (this._currentUpdateEvent) {
      window.removeEventListener(this._currentUpdateEvent, this._onCatalogUpdate);
      this._currentUpdateEvent = null;
    }
    
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

    const taxonomySlug = this.state.taxonomy || 'category-of-toys';
    const flatTerms = window.taxonomy_terms[taxonomySlug];
    if (!flatTerms || typeof flatTerms !== 'object') {
      console.warn(`[category-tree-filter] ${taxonomySlug} terms not found`);
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
        toy_types_count: term.toy_types_count || 0, // Количество типов в категории (прямой счет)
        category_index: term.category_index || 0, // Индекс категории для сортировки
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
    
    // Рекурсивно суммируем счетчики для родительских категорий
    // Логика: каждый узел показывает прямой счетчик + сумму всех дочерних (рекурсивно)
    const sumCountsRecursive = (node) => {
      // Сохраняем прямой счетчик
      const directCount = node.toy_types_count || 0;
      let childrenCount = 0;
      
      // Рекурсивно обрабатываем детей и суммируем их счетчики
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
          sumCountsRecursive(child);
          // К счетчику родителя добавляем итоговый счетчик дочернего (который уже включает всех потомков)
          childrenCount += child.toy_types_count || 0;
        });
      }
      
      // Итоговый счетчик: прямой + сумма всех дочерних (которые уже включают своих потомков)
      node.toy_types_count = directCount + childrenCount;
    };
    
    // Применяем суммирование ко всем корневым узлам
    rootNodes.forEach(node => {
      sumCountsRecursive(node);
    });
    
    // Сортируем узлы по индексу категории, затем по имени (рекурсивно)
    const sortNodes = (nodes) => {
      nodes.sort((a, b) => {
        // Сначала по индексу категории (если есть и больше 0)
        const aIndex = a.category_index || 0;
        const bIndex = b.category_index || 0;
        
        if (aIndex > 0 && bIndex > 0) {
          // Если у обоих есть индекс, сортируем по индексу
          return aIndex - bIndex;
        } else if (aIndex > 0) {
          // Если только у первого есть индекс, он идёт первым
          return -1;
        } else if (bIndex > 0) {
          // Если только у второго есть индекс, он идёт первым
          return 1;
        } else {
          // Если у обоих нет индекса, сортируем по имени
          return a.name.localeCompare(b.name, 'ru');
        }
      });
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
   * Если нет сохраненного состояния, автоматически раскрываем первый и второй уровень
   * @private
   */
  _loadExpandedState() {
    try {
      const storageKey = this.state.storageKey || 'elkaretro_category_filter_expanded';
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const expanded = JSON.parse(stored);
        if (Array.isArray(expanded) && expanded.length > 0) {
          this.setState({ expandedNodes: expanded });
          return;
        }
      }
      
      // Если нет сохраненного состояния, раскрываем первый и второй уровень
      this._expandDefaultLevels();
    } catch (e) {
      console.warn('[category-tree-filter] Failed to load expanded state:', e);
      // При ошибке также раскрываем уровни по умолчанию
      this._expandDefaultLevels();
    }
  }

  /**
   * Раскрыть первый и второй уровень категорий по умолчанию
   * @private
   */
  _expandDefaultLevels() {
    const tree = this.state.categoryTree || [];
    const expanded = new Set();
    
    // Раскрываем первый уровень (корневые категории)
    tree.forEach(rootNode => {
      if (rootNode.children && rootNode.children.length > 0) {
        expanded.add(rootNode.id);
        
        // Раскрываем второй уровень (дети корневых категорий)
        rootNode.children.forEach(childNode => {
          if (childNode.children && childNode.children.length > 0) {
            expanded.add(childNode.id);
          }
        });
      }
    });
    
    if (expanded.size > 0) {
      this.setState({ expandedNodes: Array.from(expanded) });
    }
  }

  /**
   * Сохранить состояние раскрытия в localStorage
   * @private
   */
  _saveExpandedState() {
    try {
      const storageKey = this.state.storageKey || 'elkaretro_category_filter_expanded';
      const expanded = Array.from(this.state.expandedNodes || []);
      localStorage.setItem(storageKey, JSON.stringify(expanded));
    } catch (e) {
      console.warn('[category-tree-filter] Failed to save expanded state:', e);
    }
  }
  
  /**
   * Обработчик изменений состояния
   * @param {string} key - Ключ изменённого свойства
   */
  onStateChanged(key) {
    super.onStateChanged(key);
    
    // При изменении таксономии перезагружаем дерево
    if (key === 'taxonomy') {
      this._loadCategoryTree();
      this.render();
    }
    
    // При изменении события обновления - переподписываемся
    if (key === 'updateEvent') {
      if (this._currentUpdateEvent) {
        window.removeEventListener(this._currentUpdateEvent, this._onCatalogUpdate);
      }
      const updateEvent = this.state.updateEvent || 'elkaretro:catalog:updated';
      this._currentUpdateEvent = updateEvent;
      window.addEventListener(updateEvent, this._onCatalogUpdate);
    }
  }

  /**
   * Загрузить выбранные категории из стора
   * @private
   */
  _loadSelectedFromStore() {
    const storeApi = this.state.storeApi || 'catalog';
    const filterKey = this.state.filterKey || 'category-of-toys';
    const store = window.app?.[`${storeApi}Store`] || window.app?.[storeApi];
    
    if (!store) {
      return;
    }

    const catalogState = store.getCatalogState ? store.getCatalogState() : (store.getState ? store.getState() : {});
    const selected = catalogState.filters?.[filterKey] || [];
    
    if (Array.isArray(selected) && selected.length > 0) {
      // Преобразуем в числа (IDs) - теперь всегда работаем с ID
      const selectedIds = selected.map(val => {
        // Если это число или строка с числом - используем как ID
        const id = typeof val === 'number' ? val : parseInt(val, 10);
        // Если это не число, пытаемся найти по slug (обратная совместимость)
        if (isNaN(id)) {
          const found = Array.from(this._categoriesMap.values()).find(cat => cat.slug === val);
          return found ? found.id : null;
        }
        return id;
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

    const filterKey = this.state.filterKey || 'category-of-toys';
    const selected = state.filters?.[filterKey] || [];
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
      this._updateCheckboxes();
      // _updateCheckboxes уже вызывает _updateNodeAttributes и _updateRootAttributes
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
    const wasExpanded = expanded.has(categoryId);
    
    if (wasExpanded) {
      expanded.delete(categoryId);
    } else {
      expanded.add(categoryId);
    }
    
    this.setState({ expandedNodes: Array.from(expanded) });
    this._saveExpandedState();
    
    // Обновляем только видимость дочерних узлов и иконку без полного рендера
    this._updateNodeExpandedState(categoryId, !wasExpanded);
  }
  
  /**
   * Обновить состояние раскрытия узла без полного рендера
   * @param {number} categoryId
   * @param {boolean} isExpanded
   * @private
   */
  _updateNodeExpandedState(categoryId, isExpanded) {
    const node = this.querySelector(`[data-category-id="${categoryId}"]`);
    if (!node) return;
    
    // Находим контейнер с дочерними узлами (теперь всегда должен быть в DOM)
    const childrenContainer = node.querySelector('.category-tree-filter__children');
    if (childrenContainer) {
      childrenContainer.style.display = isExpanded ? '' : 'none';
    }
    
    // Обновляем иконку в кнопке раскрытия
    const toggleBtn = node.querySelector('[data-toggle-node]');
    if (toggleBtn) {
      const icon = toggleBtn.querySelector('ui-icon');
      if (icon) {
        icon.setAttribute('name', isExpanded ? 'chevron_down' : 'chevron_right');
      }
      toggleBtn.setAttribute('aria-expanded', String(isExpanded));
      
      // Обновляем aria-label с учетом названия категории
      const categoryName = node.querySelector('.category-tree-filter__checkbox-label')?.textContent?.trim() || 'категорию';
      toggleBtn.setAttribute('aria-label', `${isExpanded ? 'Свернуть' : 'Развернуть'} ${categoryName}`);
    }
  }

  /**
   * Переключить состояние разворота на весь экран
   * Публичный метод для внешнего управления
   */
  toggleExpanded() {
    const isExpanded = !this.state.isExpanded;
    
    // Если разворачиваем каталог - автоматически разворачиваем все категории
    if (isExpanded) {
      this._expandAllCategories();
    }
    
    this.setState({ isExpanded });
    
    // Обновляем только класс и иконку без полного рендера
    this._updateExpandedState(isExpanded);
    
    // Эмитим событие для сайдбара, чтобы скрыть/показать другие фильтры
    this.dispatchEvent(new CustomEvent('category-filter:expanded', {
      bubbles: true,
      composed: true,
      detail: { isExpanded }
    }));
  }
  
  /**
   * Развернуть все категории в дереве (рекурсивно)
   * @private
   */
  _expandAllCategories() {
    const tree = this.state.categoryTree || [];
    const expanded = new Set(this.state.expandedNodes || []);
    
    // Рекурсивная функция для добавления всех категорий в expanded
    const addAllToExpanded = (nodes) => {
      nodes.forEach(node => {
        if (node.children && node.children.length > 0) {
          expanded.add(node.id);
          addAllToExpanded(node.children);
        }
      });
    };
    
    addAllToExpanded(tree);
    
    if (expanded.size > 0) {
      this.setState({ expandedNodes: Array.from(expanded) });
      // Обновляем видимость всех дочерних узлов в DOM
      expanded.forEach(categoryId => {
        this._updateNodeExpandedState(categoryId, true);
      });
    }
  }
  
  /**
   * Обновить состояние разворота без полного рендера
   * @param {boolean} isExpanded
   * @private
   */
  _updateExpandedState(isExpanded) {
    const root = this.querySelector('.category-tree-filter');
    if (root) {
      if (isExpanded) {
        root.classList.add('category-tree-filter--expanded');
      } else {
        root.classList.remove('category-tree-filter--expanded');
      }
    }
    
    // Обновляем атрибуты корневого элемента (вызовет CSS правила видимости)
    this._updateRootAttributes();
    
    // Обновляем иконку и текст в кнопке разворота
    const expandBtn = this.querySelector('[data-toggle-expanded]');
    if (expandBtn) {
      const icon = expandBtn.querySelector('ui-icon');
      if (icon) {
        icon.setAttribute('name', isExpanded ? 'chevron_left' : 'chevron_right');
      }
      const text = expandBtn.querySelector('.category-tree-filter__expand-btn-text');
      if (text) {
        text.textContent = isExpanded ? 'Свернуть' : 'Развернуть';
      }
      expandBtn.setAttribute('aria-expanded', String(isExpanded));
      expandBtn.setAttribute('aria-label', `${isExpanded ? 'Свернуть' : 'Развернуть'} фильтр категорий`);
    }
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
    const expanded = new Set(this.state.expandedNodes || []);
    const node = this._categoriesMap.get(categoryId);
    
    if (!node) return;
    
    // Рекурсивно выбираем все дочерние категории
    const selectRecursive = (n) => {
      selected.add(n.id);
      n.children.forEach(child => selectRecursive(child));
    };
    
    // Рекурсивно раскрываем все дочерние узлы
    const expandRecursive = (n) => {
      if (n.children && n.children.length > 0) {
        expanded.add(n.id);
        n.children.forEach(child => expandRecursive(child));
      }
    };
    
    selectRecursive(node);
    expandRecursive(node);
    
    this.setState({ 
      selectedCategories: Array.from(selected),
      expandedNodes: Array.from(expanded)
    });
    
    // Обновляем видимость дочерних узлов в DOM без полного рендера
    const expandNodeRecursive = (n) => {
      if (n.children && n.children.length > 0) {
        this._updateNodeExpandedState(n.id, true);
        n.children.forEach(child => expandNodeRecursive(child));
      }
    };
    expandNodeRecursive(node);
    
    this._saveExpandedState();
    this._syncWithStore();
    this._updateCheckboxes();
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
    this._updateCheckboxes();
  }

  /**
   * Синхронизировать выбранные категории со стором
   * @private
   */
  _syncWithStore() {
    const storeApi = this.state.storeApi || 'catalog';
    const filterKey = this.state.filterKey || 'category-of-toys';
    const store = window.app?.[`${storeApi}Store`] || window.app?.[storeApi];
    
    if (!store || !store.updateState) {
      return;
    }

    const selectedIds = this.state.selectedCategories || [];
    
    // Отправляем ID как строки (для единообразия с остальными фильтрами)
    const selectedIdsAsStrings = selectedIds
      .map(id => String(id))
      .filter(Boolean);

    // Получаем текущее состояние
    const currentState = store.getCatalogState ? store.getCatalogState() : (store.getState ? store.getState() : {});
    const currentFilters = currentState.filters || {};

    // Обновляем стор
    store.updateState({
      filters: {
        ...currentFilters,
        [filterKey]: selectedIdsAsStrings.length > 0 ? selectedIdsAsStrings : undefined,
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

  /**
   * Обновить состояние чекбоксов без полной перерисовки
   * @private
   */
  _updateCheckboxes() {
    const selected = new Set(this.state.selectedCategories || []);
    
    // Обновляем состояние всех чекбоксов
    this.querySelectorAll('[data-category-checkbox]').forEach(checkbox => {
      const categoryId = parseInt(checkbox.dataset.categoryId, 10);
      if (isNaN(categoryId)) return;
      
      const node = this._categoriesMap.get(categoryId);
      if (!node) return;
      
      const isSelected = selected.has(categoryId);
      const hasChildren = node.children && node.children.length > 0;
      
      // Определяем состояние чекбокса (логика должна совпадать с шаблоном)
      if (isSelected) {
        if (hasChildren) {
          // Проверяем, все ли дочерние выбраны
          const allChildrenSelected = node.children.every(child => selected.has(child.id));
          checkbox.checked = allChildrenSelected;
          checkbox.indeterminate = !allChildrenSelected;
          // Обновляем атрибут для indeterminate
          if (allChildrenSelected) {
            checkbox.removeAttribute('data-indeterminate');
          } else {
            checkbox.setAttribute('data-indeterminate', 'true');
          }
        } else {
          // Категория выбрана и нет детей - просто checked
          checkbox.checked = true;
          checkbox.indeterminate = false;
          checkbox.removeAttribute('data-indeterminate');
        }
      } else {
        // Категория не выбрана
        checkbox.checked = false;
        checkbox.indeterminate = false;
        checkbox.removeAttribute('data-indeterminate');
      }
    });
    
    // Обновляем атрибуты видимости узлов и корневого элемента
    this._updateNodeAttributes();
    this._updateRootAttributes();
  }
  
  /**
   * Обновить атрибуты видимости узлов (selected, has-selected-descendant)
   * @private
   */
  _updateNodeAttributes() {
    const selected = new Set(this.state.selectedCategories || []);
    
    // Сначала находим все узлы с выбранными потомками (рекурсивно)
    const nodesWithSelectedDescendants = new Set();
    
    const checkDescendants = (nodeId) => {
      const node = this._categoriesMap.get(nodeId);
      if (!node) return false;
      
      // Проверяем, выбран ли сам узел
      if (selected.has(nodeId)) {
        return true;
      }
      
      // Проверяем дочерние узлы
      let hasSelectedChild = false;
      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          if (checkDescendants(child.id)) {
            hasSelectedChild = true;
          }
        }
      }
      
      // Если есть выбранный потомок, добавляем в список
      if (hasSelectedChild) {
        nodesWithSelectedDescendants.add(nodeId);
      }
      
      return hasSelectedChild || selected.has(nodeId);
    };
    
    // Проверяем все категории в дереве
    const rootTree = this.state.categoryTree || [];
    const traverse = (nodes) => {
      for (const node of nodes) {
        checkDescendants(node.id);
        if (node.children && node.children.length > 0) {
          traverse(node.children);
        }
      }
    };
    traverse(rootTree);
    
    // Обновляем атрибуты на DOM узлах
    this.querySelectorAll('[data-category-id]').forEach(nodeEl => {
      const categoryId = parseInt(nodeEl.dataset.categoryId, 10);
      if (isNaN(categoryId)) return;
      
      const isSelected = selected.has(categoryId);
      const hasDescendant = nodesWithSelectedDescendants.has(categoryId) && !isSelected;
      
      // Обновляем атрибут selected
      if (isSelected) {
        nodeEl.setAttribute('selected', 'true');
        nodeEl.removeAttribute('has-selected-descendant');
      } else {
        nodeEl.removeAttribute('selected');
      }
      
      // Обновляем атрибут has-selected-descendant
      if (hasDescendant) {
        nodeEl.setAttribute('has-selected-descendant', 'true');
      } else {
        nodeEl.removeAttribute('has-selected-descendant');
      }
    });
  }
  
  /**
   * Обновить атрибуты корневого элемента (any-selected, expanded)
   * @private
   */
  _updateRootAttributes() {
    const root = this.querySelector('.category-tree-filter');
    if (!root) return;
    
    const selected = this.state.selectedCategories || [];
    const hasSelection = selected.length > 0;
    const isExpanded = this.state.isExpanded || false;
    
    // Обновляем any-selected
    if (hasSelection) {
      root.setAttribute('any-selected', 'true');
    } else {
      root.removeAttribute('any-selected');
    }
    
    // Обновляем expanded
    if (isExpanded) {
      root.setAttribute('expanded', 'true');
    } else {
      root.removeAttribute('expanded');
    }
  }

  render() {
    // Для поиска используем фильтрованное дерево, для остальных случаев - полное дерево
    const searchQuery = (this.state.searchQuery || '').toLowerCase().trim();
    let tree = this.state.categoryTree || [];
    
    // Если есть поиск, фильтруем дерево
    if (searchQuery) {
      const expanded = new Set(this.state.expandedNodes || []);
      tree = this._filterTreeForSearch(tree, searchQuery, expanded);
    }
    // В остальных случаях рендерим полное дерево (видимость управляется через CSS)
    
    const selected = new Set(this.state.selectedCategories || []);
    const expanded = new Set(this.state.expandedNodes || []);
    
    this.innerHTML = renderCategoryTreeFilterTemplate({
      tree,
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
    
    // Обновляем атрибуты видимости после рендера
    this._updateNodeAttributes();
    this._updateRootAttributes();
  }
}

customElements.define('category-tree-filter', CategoryTreeFilter);

