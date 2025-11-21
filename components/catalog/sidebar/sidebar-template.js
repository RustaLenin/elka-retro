/**
 * Sidebar template helpers.
 *
 * Responsibilities:
 * - Генерация HTML разметки для сайдбара фильтров
 * - Структура: mode toggle, категории, динамические фильтры
 * - Поддержка секций для группировки фильтров
 */

/**
 * Рендеринг оболочки сайдбара с секциями для компонентов
 * @returns {string} HTML разметка сайдбара
 */
export const renderSidebarShell = () => {
  return `
    <div class="catalog-sidebar" data-catalog-sidebar-inner>
      <div class="catalog-sidebar__fixed">
        <!-- Кнопки действий (Применить фильтры, Сбросить) - sticky сверху -->
        <div class="catalog-sidebar__section catalog-sidebar__section--actions" data-sidebar-actions></div>
        
        <!-- Переключатель режимов (Типы / Экземпляры) -->
        <div class="catalog-sidebar__section catalog-sidebar__section--mode-toggle" data-sidebar-mode-toggle></div>
        
        <!-- Общий фильтр категорий (иерархический) -->
        <div class="catalog-sidebar__section catalog-sidebar__section--category" data-sidebar-category></div>
        
        <!-- Динамические фильтры (зависят от режима) -->
        <div class="catalog-sidebar__filters-scroll">
          <div class="catalog-sidebar__section catalog-sidebar__section--filters" data-sidebar-filters></div>
        </div>
      </div>
    </div>
  `;
};

/**
 * Рендеринг группы фильтров (для будущего использования)
 * @param {Object} config - Конфигурация группы фильтров
 * @returns {string} HTML разметка группы
 */
export const renderFilterGroup = (config = {}) => {
  // TODO: Реализовать когда понадобится группировка фильтров
  return '';
};

/**
 * Рендеринг кнопок действий (Применить фильтры, Сбросить фильтры)
 * @param {Object} options - Опции рендеринга
 * @param {boolean} options.hasActiveFilters - Есть ли активные фильтры
 * @returns {string} HTML разметка кнопок
 */
export const renderActionButtons = ({ hasActiveFilters = false } = {}) => {
  return `
    <div class="catalog-sidebar__actions">
      ${hasActiveFilters ? `
        <button 
          type="button" 
          class="catalog-sidebar__reset-icon" 
          data-reset-filters 
          aria-label="Сбросить фильтры"
        >
          <ui-icon name="refresh"></ui-icon>
        </button>
      ` : ''}
      <ui-button 
        type="primary"
        label="Применить фильтры"
        event="catalog-sidebar:apply-filters"
        class="catalog-sidebar__apply-button"
        data-apply-filters
      ></ui-button>
    </div>
  `;
};

/**
 * Рендеринг кнопки сброса фильтров (для обратной совместимости)
 * @param {Object} options - Опции рендеринга
 * @param {boolean} options.hasActiveFilters - Есть ли активные фильтры
 * @returns {string} HTML разметка кнопки
 * @deprecated Используйте renderActionButtons вместо этого
 */
export const renderResetButton = ({ hasActiveFilters = false } = {}) => {
  return renderActionButtons({ hasActiveFilters });
};

