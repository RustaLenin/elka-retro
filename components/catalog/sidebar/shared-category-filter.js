/**
 * Shared category filter between toy type and toy instance modes.
 * 
 * Инициализирует компонент category-tree-filter для фильтрации по категориям.
 * Компонент работает напрямую с catalog-store и синхронизируется с URL.
 */

/**
 * Инициализировать фильтр категорий
 * @param {HTMLElement} container - Контейнер для рендеринга фильтра
 * @returns {Object} API для управления фильтром
 */
export const initSharedCategoryFilter = (container) => {
  if (!container) {
    console.warn('[shared-category-filter] Container is required');
    return null;
  }

  // Создаём элемент category-tree-filter
  const filterElement = document.createElement('category-tree-filter');
  container.appendChild(filterElement);

  return {
    /**
     * Получить выбранные категории
     * @returns {Array<string>} Массив slugs выбранных категорий
     */
    getValue() {
      if (!filterElement || !filterElement._categoriesMap) {
        return [];
      }

      const selectedIds = filterElement.state.selectedCategories || [];
      return selectedIds
        .map(id => {
          const node = filterElement._categoriesMap.get(id);
          return node ? node.slug : null;
        })
        .filter(Boolean);
    },

    /**
     * Установить выбранные категории
     * @param {Array<string>} slugs - Массив slugs категорий
     */
    setValue(slugs) {
      if (!filterElement || !Array.isArray(slugs)) {
        return;
      }

      // Преобразуем slugs в IDs и устанавливаем выбранные
      const selectedIds = slugs
        .map(slug => {
          const found = Array.from(filterElement._categoriesMap.values()).find(
            cat => cat.slug === slug
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

