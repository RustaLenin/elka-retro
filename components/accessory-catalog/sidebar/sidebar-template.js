/**
 * Accessory Catalog Sidebar Template Helpers
 * 
 * Responsibilities:
 * - Генерация HTML разметки для сайдбара фильтров аксессуаров
 * - Структура: кнопки действий, динамические фильтры (без mode-toggle)
 */

/**
 * Рендеринг оболочки сайдбара с секциями для компонентов
 * @returns {string} HTML разметка сайдбара
 */
export const renderSidebarShell = () => {
  return `
    <div class="accessory-catalog-sidebar" data-accessory-catalog-sidebar-inner>
      <div class="accessory-catalog-sidebar__fixed">
        <!-- Кнопки действий (Применить фильтры, Сбросить) - sticky сверху -->
        <div class="accessory-catalog-sidebar__section accessory-catalog-sidebar__section--actions" data-accessory-sidebar-actions></div>
        
        <!-- Фильтр категорий (иерархический) -->
        <div class="accessory-catalog-sidebar__section accessory-catalog-sidebar__section--category" data-accessory-sidebar-category></div>
        
        <!-- Динамические фильтры -->
        <div class="accessory-catalog-sidebar__filters-scroll">
          <div class="accessory-catalog-sidebar__section accessory-catalog-sidebar__section--filters" data-accessory-sidebar-filters></div>
        </div>
      </div>
    </div>
  `;
};

/**
 * Рендеринг кнопок действий (Применить фильтры, Сбросить фильтры)
 * @param {Object} options - Опции рендеринга
 * @param {boolean} options.hasActiveFilters - Есть ли активные фильтры
 * @returns {string} HTML разметка кнопок
 */
export const renderActionButtons = ({ hasActiveFilters = false } = {}) => {
  return `
    <div class="accessory-catalog-sidebar__actions">
      ${hasActiveFilters ? `
        <button 
          type="button" 
          class="accessory-catalog-sidebar__reset-icon" 
          data-reset-filters 
          aria-label="Сбросить фильтры"
        >
          <ui-icon name="refresh"></ui-icon>
        </button>
      ` : ''}
      <ui-button 
        type="primary"
        label="Применить фильтры"
        event="accessory-catalog-sidebar:apply-filters"
        class="accessory-catalog-sidebar__apply-button"
        data-apply-filters
      ></ui-button>
    </div>
  `;
};

