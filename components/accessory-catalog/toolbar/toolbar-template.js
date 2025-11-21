/**
 * Accessory Catalog Toolbar Template Helpers
 * 
 * Responsibilities:
 * - Генерация HTML разметки для toolbar (поиск, сортировка, чипсы фильтров)
 */

/**
 * Рендеринг оболочки toolbar
 * @returns {string} HTML разметка toolbar
 */
export const renderToolbarShell = () => {
  return `
    <div class="accessory-catalog-toolbar" data-accessory-catalog-toolbar-inner>
      <!-- Верхняя строка: поиск и сортировка -->
      <div class="accessory-catalog-toolbar__row">
        <!-- Поиск по названию -->
        <div class="accessory-catalog-toolbar__section accessory-catalog-toolbar__section--search" data-accessory-toolbar-search></div>
        
        <!-- Сортировка -->
        <div class="accessory-catalog-toolbar__section accessory-catalog-toolbar__section--sort" data-accessory-toolbar-sort></div>
      </div>
      
      <!-- Фильтры-чипсы (активные фильтры) -->
      <div class="accessory-catalog-toolbar__section accessory-catalog-toolbar__section--chips" data-accessory-toolbar-chips></div>
    </div>
  `;
};

