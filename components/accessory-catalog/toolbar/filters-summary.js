/**
 * Accessory Catalog Filters Summary Widget
 * 
 * Responsibilities:
 * - Отображение активных фильтров в виде чипсов
 * - Подписка на стор: получение активных фильтров
 * - Генерация чипсов на основе state.filters
 * - Обработка удаления фильтра (клик на крестик)
 * - Обработка клика на чипс (скролл к соответствующему фильтру в сайдбаре)
 * 
 * Dependencies:
 * - accessory-catalog-store.js - для получения и обновления состояния
 * - accessory-filter-registry.js - для получения метаданных фильтров
 * - ui-filters-summary - компонент из UI Kit
 */

import { getAccessoryFilters, getFilterKey, getTaxonomyTerms } from '../sidebar/accessory-filter-registry.js';

/**
 * Получить название фильтра по его ключу
 * @param {string} filterKey - Ключ фильтра
 * @returns {string} Название фильтра
 */
const getFilterLabel = (filterKey) => {
  const filterConfigs = getAccessoryFilters();
  const filterConfig = filterConfigs.find((f) => f.key === filterKey);
  return filterConfig?.label || filterKey;
};

/**
 * Получить отображаемое значение фильтра
 * @param {string} filterKey - Ключ фильтра
 * @param {Array} filterValues - Значения фильтра
 * @returns {string} Отображаемое значение
 */
const getFilterDisplayValue = (filterKey, filterValues) => {
  if (!Array.isArray(filterValues) || filterValues.length === 0) {
    return '';
  }

  const filterConfigs = getAccessoryFilters();
  const filterConfig = filterConfigs.find((f) => f.key === filterKey);

  if (!filterConfig) {
    return filterValues.join(', ');
  }

  // Если это таксономия, получаем названия терминов
  if (filterConfig.type === 'select-single' || filterConfig.type === 'select-multi') {
    const taxonomyTerms = getTaxonomyTerms();
    
    let taxonomySlug = null;
    if (filterConfig.dataSource) {
      if (filterConfig.dataSource.path) {
        const pathMatch = filterConfig.dataSource.path.match(/taxonomy_terms\.(.+)/);
        if (pathMatch) {
          taxonomySlug = pathMatch[1];
        }
      }
    }
    
    if (taxonomySlug && taxonomyTerms && taxonomyTerms[taxonomySlug]) {
      const terms = taxonomyTerms[taxonomySlug];
      const displayValues = filterValues.map((value) => {
        const term = Object.values(terms).find(
          (t) => t.slug === value || String(t.id) === String(value)
        );
        return term ? term.name : value;
      });
      
      if (displayValues.length > 2) {
        const firstTwo = displayValues.slice(0, 2).join(', ');
        const remaining = displayValues.length - 2;
        return `${firstTwo} +${remaining}`;
      }
      
      return displayValues.join(', ');
    }
  }

  return filterValues.join(', ');
};

/**
 * Создать и инициализировать компонент фильтров-чипсов для каталога аксессуаров
 * Компонент использует публичный API window.app.accessoryCatalog вместо прямого доступа к стору
 * @param {Object} options - Опции инициализации
 * @param {HTMLElement} options.container - Контейнер для рендеринга чипсов
 * @param {HTMLElement} [options.sidebarContainer] - Контейнер сайдбара для скролла (опционально)
 * @returns {Object} API компонента: { render(), destroy() }
 */
export const createFiltersSummary = ({ container, sidebarContainer = null } = {}) => {
  if (!container) {
    throw new Error('[accessory-filters-summary] Container element is required');
  }

  let unsubscribeStore = null;
  let summaryElement = null;

  const handleFilterRemove = (event) => {
    const { filterId } = event.detail || {};
    if (!filterId) {
      return;
    }

    if (window.app && window.app.accessoryCatalog) {
      if (filterId === 'search') {
        window.app.accessoryCatalog.setSearch('');
      } else {
        window.app.accessoryCatalog.updateFilter(filterId, null);
      }
    }
  };

  const handleFilterClick = (event) => {
    const { filterId } = event.detail || {};
    if (!filterId || !sidebarContainer) {
      return;
    }

    // Находим соответствующий фильтр в сайдбаре
    const filterField = sidebarContainer.querySelector(
      `ui-form-field[field-id="${filterId}"], ui-form-field[name="${filterId}"]`
    );

    if (filterField) {
      filterField.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      
      filterField.classList.add('accessory-catalog-sidebar__filter--highlighted');
      setTimeout(() => {
        filterField.classList.remove('accessory-catalog-sidebar__filter--highlighted');
      }, 2000);
    }
  };

  const formatFiltersForChips = (filters) => {
    if (!filters || typeof filters !== 'object') {
      return [];
    }

    const chips = [];

    Object.entries(filters)
      .filter(([filterKey, values]) => Array.isArray(values) && values.length > 0)
      .forEach(([filterKey, filterValues]) => {
        const label = getFilterLabel(filterKey);
        const displayValue = getFilterDisplayValue(filterKey, filterValues);

        chips.push({
          id: filterKey,
          label,
          value: displayValue,
          removable: true,
        });
      });

    return chips;
  };

  const handleCatalogUpdate = (event) => {
    if (!summaryElement) {
      return;
    }

    const catalogState = event.detail?.state;
    const draftFilters = event.detail?.draftFilters;
    if (!catalogState) {
      return;
    }

    const filters = draftFilters && Object.keys(draftFilters).length > 0
      ? draftFilters
      : (catalogState.filters || {});
    
    const chips = formatFiltersForChips(filters);
    if (catalogState.search && catalogState.search.trim() !== '') {
      chips.unshift({
        id: 'search',
        label: 'Поиск',
        value: catalogState.search.trim(),
        removable: true,
      });
    }

    if (typeof summaryElement.setFilters === 'function') {
      summaryElement.setFilters(chips);
    }
  };

  const render = () => {
    container.innerHTML = '';

    const currentState = window.app?.accessoryCatalog?.getState();
    if (!currentState) {
      return;
    }
    
    const draftFilters = window.app?.accessoryCatalogStore?.getDraftFilters?.();
    const hasDraft = draftFilters && Object.keys(draftFilters).length > 0;
    const filters = hasDraft ? draftFilters : (currentState.filters || {});
    const chips = formatFiltersForChips(filters);
    
    if (currentState.search && currentState.search.trim() !== '') {
      chips.unshift({
        id: 'search',
        label: 'Поиск',
        value: currentState.search.trim(),
        removable: true,
      });
    }

    container.innerHTML = `
      <ui-filters-summary empty-label="Нет активных фильтров"></ui-filters-summary>
    `;
    
    summaryElement = container.querySelector('ui-filters-summary');
    
    if (!summaryElement) {
      console.warn('[accessory-filters-summary] ui-filters-summary element not found after render');
      return;
    }
    
    if (typeof summaryElement.setFilters === 'function') {
      summaryElement.setFilters(chips);
    }

    summaryElement.addEventListener('ui-filters-summary:remove', handleFilterRemove);
    summaryElement.addEventListener('ui-filters-summary:click', handleFilterClick);

    window.addEventListener('elkaretro:accessory-catalog:updated', handleCatalogUpdate);
    unsubscribeStore = () => {
      window.removeEventListener('elkaretro:accessory-catalog:updated', handleCatalogUpdate);
    };

    handleCatalogUpdate({ detail: { state: currentState } });
  };

  const destroy = () => {
    if (summaryElement) {
      summaryElement.removeEventListener('ui-filters-summary:remove', handleFilterRemove);
      summaryElement.removeEventListener('ui-filters-summary:click', handleFilterClick);
      summaryElement = null;
    }

    if (typeof unsubscribeStore === 'function') {
      unsubscribeStore();
      unsubscribeStore = null;
    }

    if (container) {
      container.innerHTML = '';
    }
  };

  return {
    render,
    destroy,
  };
};

