/**
 * Shared category filter for accessory catalog.
 * 
 * Инициализирует компонент category-tree-filter для фильтрации по категориям аксессуаров.
 * Компонент работает напрямую с accessory-catalog-store и синхронизируется с URL.
 */

/**
 * Инициализировать фильтр категорий для каталога аксессуаров
 * @param {HTMLElement} container - Контейнер для рендеринга фильтра
 * @returns {Object} API для управления фильтром
 */
export const initAccessoryCategoryFilter = (container) => {
  if (!container) {
    console.warn('[accessory-category-filter] Container is required');
    return null;
  }

  // Создаём элемент category-tree-filter с конфигурацией для аксессуаров
  const filterElement = document.createElement('category-tree-filter');
  filterElement.setAttribute('taxonomy', 'ny_category');
  filterElement.setAttribute('filter-key', 'ny_category');
  filterElement.setAttribute('store-api', 'accessoryCatalog');
  filterElement.setAttribute('update-event', 'elkaretro:accessory-catalog:updated');
  filterElement.setAttribute('storage-key', 'elkaretro_accessory_category_filter_expanded');
  container.appendChild(filterElement);

  return {
    /**
     * Получить выбранные категории
     * @returns {Array<string>} Массив ID выбранных категорий (как строки)
     */
    getValue() {
      if (!filterElement || !filterElement._categoriesMap) {
        return [];
      }

      const selectedIds = filterElement.state.selectedCategories || [];
      return selectedIds.map(id => String(id));
    },

    /**
     * Установить выбранные категории
     * @param {Array<string|number>} idsOrSlugs - Массив ID или slugs категорий
     */
    setValue(idsOrSlugs) {
      if (!filterElement || !Array.isArray(idsOrSlugs)) {
        return;
      }

      // Преобразуем в IDs - теперь работаем с ID, но поддерживаем slugs для обратной совместимости
      const selectedIds = idsOrSlugs
        .map(val => {
          // Если это число или строка с числом - используем как ID
          const id = typeof val === 'number' ? val : parseInt(val, 10);
          if (!isNaN(id)) {
            return id;
          }
          // Если это не число, пытаемся найти по slug (обратная совместимость)
          const found = Array.from(filterElement._categoriesMap.values()).find(
            cat => cat.slug === val
          );
          return found ? found.id : null;
        })
        .filter(id => id && !isNaN(id));

      filterElement.setState({ selectedCategories: selectedIds });
      filterElement.render();
    },

    /**
     * Уничтожить фильтр
     */
    destroy() {
      if (filterElement && filterElement.parentNode) {
        filterElement.parentNode.removeChild(filterElement);
      }
    },

    /**
     * Получить элемент фильтра
     * @returns {HTMLElement}
     */
    getElement() {
      return filterElement;
    },
  };
};

