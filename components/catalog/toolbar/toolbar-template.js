/**
 * Toolbar template helpers.
 *
 * Responsibilities:
 * - Генерация HTML разметки для toolbar каталога
 * - Структура: поиск, сортировка, фильтры-чипсы (будут добавлены позже)
 */

/**
 * Рендеринг оболочки toolbar с секциями для компонентов
 * @returns {string} HTML разметка toolbar
 */
export const renderToolbarShell = () => {
  return `
    <div class="catalog-toolbar" data-catalog-toolbar-inner>
      <!-- Верхняя строка: поиск и сортировка -->
      <div class="catalog-toolbar__row">
        <!-- Поиск по названию -->
        <div class="catalog-toolbar__section catalog-toolbar__section--search" data-toolbar-search></div>
        
        <!-- Сортировка -->
        <div class="catalog-toolbar__section catalog-toolbar__section--sort" data-toolbar-sort></div>
      </div>
      
      <!-- Фильтры-чипсы (активные фильтры) -->
      <div class="catalog-toolbar__section catalog-toolbar__section--chips" data-toolbar-chips></div>
    </div>
  `;
};

/**
 * Рендеринг чипса активного фильтра (для будущего использования)
 * @param {Object} chip - Данные чипса
 * @param {string} chip.label - Название фильтра
 * @param {string} chip.value - Значение фильтра
 * @returns {string} HTML разметка чипса
 */
export const renderActiveFilterChip = (chip = {}) => {
  // TODO: Реализовать когда понадобятся чипсы фильтров
  return '';
};

