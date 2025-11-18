/**
 * Шаблоны для рендеринга category-tree-filter
 */

function escapeHTML(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Рендерить узел дерева категорий
 * @param {Object} node - Узел категории
 * @param {Set} selected - Множество выбранных ID
 * @param {Set} expanded - Множество раскрытых ID
 * @param {number} level - Уровень вложенности (0 = корень)
 * @returns {string}
 */
function renderCategoryNode(node, selected, expanded, level = 0) {
  const isSelected = selected.has(node.id);
  const isExpanded = expanded.has(node.id);
  const hasChildren = node.children && node.children.length > 0;
  const indent = level * 20; // 20px на уровень
  const toyTypesCount = node.toy_types_count || 0;
  const isDisabled = toyTypesCount === 0;
  
  // Определяем состояние чекбокса (checked, indeterminate если частично выбрано)
  let checkboxState = '';
  if (isSelected) {
    // Проверяем, все ли дочерние выбраны
    if (hasChildren) {
      const allChildrenSelected = node.children.every(child => selected.has(child.id));
      checkboxState = allChildrenSelected ? 'checked' : 'indeterminate';
    } else {
      checkboxState = 'checked';
    }
  }
  
  let html = `
    <div class="category-tree-filter__node ${isDisabled ? 'category-tree-filter__node--disabled' : ''}" data-category-id="${node.id}" style="padding-left: ${indent}px;">
      <div class="category-tree-filter__node-content">
        <label class="category-tree-filter__checkbox-wrapper ${isDisabled ? 'category-tree-filter__checkbox-wrapper--disabled' : ''}">
          <input 
            type="checkbox" 
            class="category-tree-filter__checkbox"
            data-category-checkbox
            data-category-id="${node.id}"
            ${checkboxState === 'checked' ? 'checked' : ''}
            ${checkboxState === 'indeterminate' ? 'data-indeterminate="true"' : ''}
            ${isDisabled ? 'disabled' : ''}
            aria-label="Выбрать категорию ${escapeAttribute(node.name)}"
          >
          <span class="category-tree-filter__checkbox-label">
            ${escapeHTML(node.name)}
            <span class="category-tree-filter__count">(${toyTypesCount})</span>
          </span>
        </label>
        
        ${hasChildren ? `
          <button 
            type="button"
            class="category-tree-filter__toggle"
            data-toggle-node
            data-category-id="${node.id}"
            aria-label="${isExpanded ? 'Свернуть' : 'Развернуть'} категорию ${escapeAttribute(node.name)}"
            aria-expanded="${isExpanded}"
          >
            <ui-icon 
              name="${isExpanded ? 'chevron_down' : 'chevron_right'}" 
              size="small"
            ></ui-icon>
          </button>
        ` : ''}
      </div>
      
      ${hasChildren && isExpanded ? `
        <div class="category-tree-filter__children">
          ${node.children.map(child => renderCategoryNode(child, selected, expanded, level + 1)).join('')}
        </div>
      ` : ''}
    </div>
  `;
  
  return html;
}

/**
 * Рендерить дерево категорий
 * @param {Array} tree - Массив корневых узлов
 * @param {Set} selected - Множество выбранных ID
 * @param {Set} expanded - Множество раскрытых ID
 * @returns {string}
 */
function renderCategoryTree(tree, selected, expanded) {
  if (!tree || tree.length === 0) {
    return `
      <div class="category-tree-filter__empty">
        <p>Категории не найдены</p>
      </div>
    `;
  }
  
  return `
    <div class="category-tree-filter__tree">
      ${tree.map(node => renderCategoryNode(node, selected, expanded, 0)).join('')}
    </div>
  `;
}

/**
 * Основной шаблон компонента
 * @param {Object} state - Состояние компонента
 * @param {Array} state.tree - Дерево категорий
 * @param {Set} state.selected - Выбранные категории
 * @param {Set} state.expanded - Раскрытые узлы
 * @param {string} state.searchQuery - Поисковый запрос
 * @param {boolean} state.isExpanded - Развёрнут ли на весь экран
 * @returns {string}
 */
export function renderCategoryTreeFilterTemplate(state) {
  const { tree = [], selected = new Set(), expanded = new Set(), searchQuery = '', isExpanded = false } = state;
  
  return `
    <div class="category-tree-filter ${isExpanded ? 'category-tree-filter--expanded' : ''}">
      <div class="category-tree-filter__header">
        <div class="category-tree-filter__title-row">
          <h3 class="category-tree-filter__title">Категории</h3>
          <button 
            type="button"
            class="category-tree-filter__expand-btn"
            data-toggle-expanded
            aria-label="${isExpanded ? 'Свернуть' : 'Развернуть'} фильтр категорий"
            aria-expanded="${isExpanded}"
          >
            <ui-icon 
              name="${isExpanded ? 'chevron_left' : 'chevron_right'}" 
              size="small"
            ></ui-icon>
          </button>
        </div>
        
        <div class="category-tree-filter__search">
          <input 
            type="text"
            class="category-tree-filter__search-input"
            data-search-input
            placeholder="Поиск по категориям..."
            value="${escapeAttribute(searchQuery)}"
            aria-label="Поиск по категориям"
          >
          ${searchQuery ? `
            <button 
              type="button"
              class="category-tree-filter__search-clear"
              data-clear-search
              aria-label="Очистить поиск"
            >
              <ui-icon name="close" size="small"></ui-icon>
            </button>
          ` : ''}
        </div>
      </div>
      
      <div class="category-tree-filter__body">
        ${renderCategoryTree(tree, selected, expanded)}
      </div>
    </div>
  `;
}

