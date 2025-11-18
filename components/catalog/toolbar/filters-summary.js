/**
 * Filters summary widget - отображение активных фильтров в виде чипсов.
 *
 * Responsibilities:
 * - Отображение активных фильтров в виде чипсов
 * - Подписка на стор: получение активных фильтров
 * - Генерация чипсов на основе state.filters
 * - Обработка удаления фильтра (клик на крестик)
 * - Обработка клика на чипс (скролл к соответствующему фильтру в сайдбаре)
 *
 * Dependencies:
 * - catalog-store.js - для получения и обновления состояния
 * - filter-registry.js - для получения метаданных фильтров
 * - ui-filters-summary - компонент из UI Kit
 */

import { getFiltersForMode, getFilterKey, getTaxonomyTerms, getDataModel } from '../sidebar/filter-registry.js';

/**
 * Получить название фильтра по его ключу
 * @param {string} filterKey - Ключ фильтра
 * @param {string} mode - Режим каталога
 * @returns {string} Название фильтра
 */
const getFilterLabel = (filterKey, mode) => {
  const filterConfigs = getFiltersForMode(mode);
  const filterConfig = filterConfigs.find((f) => {
    const key = getFilterKey(f.fieldSlug || f.id);
    return key === filterKey;
  });
  return filterConfig?.label || filterKey;
};

/**
 * Получить отображаемое значение фильтра
 * @param {string} filterKey - Ключ фильтра
 * @param {Array} filterValues - Значения фильтра
 * @param {string} mode - Режим каталога
 * @returns {string} Отображаемое значение
 */
const getFilterDisplayValue = (filterKey, filterValues, mode) => {
  if (!Array.isArray(filterValues) || filterValues.length === 0) {
    return '';
  }

  // Получаем конфигурацию фильтра
  const filterConfigs = getFiltersForMode(mode);
  const filterConfig = filterConfigs.find((f) => {
    const key = getFilterKey(f.fieldSlug || f.id);
    return key === filterKey;
  });

  if (!filterConfig) {
    // Если конфигурации нет, просто возвращаем значения через запятую
    return filterValues.join(', ');
  }

  // Если это таксономия, получаем названия терминов
  if (filterConfig.type === 'select-single' || filterConfig.type === 'select-multi') {
    const taxonomyTerms = getTaxonomyTerms();
    
    // Извлекаем slug таксономии из dataSource
    // dataSource имеет структуру: { type: 'global', path: 'taxonomy_terms.occurrence', adapter: 'taxonomyTermsAdapter' }
    let taxonomySlug = null;
    if (filterConfig.dataSource) {
      if (filterConfig.dataSource.path) {
        // Извлекаем из path: 'taxonomy_terms.occurrence' -> 'occurrence'
        const pathMatch = filterConfig.dataSource.path.match(/taxonomy_terms\.(.+)/);
        if (pathMatch) {
          taxonomySlug = pathMatch[1];
        }
      } else if (filterConfig.dataSource.taxonomy) {
        // Fallback для старого формата
        taxonomySlug = filterConfig.dataSource.taxonomy;
      }
    }
    
    // Если не нашли в dataSource, пытаемся найти по fieldSlug (для occurrence_field -> occurrence)
    if (!taxonomySlug && filterConfig.fieldSlug) {
      // Пытаемся найти related_taxonomy из data-model
      const dataModel = getDataModel();
      if (dataModel && dataModel.post_types) {
        // Ищем поле в конфигурации типа поста
        for (const postTypeKey of Object.keys(dataModel.post_types)) {
          const postType = dataModel.post_types[postTypeKey];
          if (postType.fields && postType.fields[filterConfig.fieldSlug]) {
            const field = postType.fields[filterConfig.fieldSlug];
            if (field.related_taxonomy) {
              taxonomySlug = field.related_taxonomy;
              break;
            }
          }
        }
      }
    }
    
    if (taxonomySlug && taxonomyTerms && taxonomyTerms[taxonomySlug]) {
      const terms = taxonomyTerms[taxonomySlug];
      const displayValues = filterValues.map((value) => {
        // Ищем термин по slug или id
        const term = Object.values(terms).find(
          (t) => t.slug === value || String(t.id) === String(value)
        );
        return term ? term.name : value;
      });
      
      // Форматируем значения: если значений много (больше 2), показываем первые 2 и остаток
      if (displayValues.length > 2) {
        const firstTwo = displayValues.slice(0, 2).join(', ');
        const remaining = displayValues.length - 2;
        return `${firstTwo} +${remaining}`;
      }
      
      return displayValues.join(', ');
    }
  }

  // Для остальных типов просто возвращаем значения через запятую
  return filterValues.join(', ');
};

/**
 * Создать и инициализировать компонент фильтров-чипсов
 * Компонент использует публичный API window.app.catalog вместо прямого доступа к стору
 * @param {Object} options - Опции инициализации
 * @param {HTMLElement} options.container - Контейнер для рендеринга чипсов
 * @param {HTMLElement} [options.sidebarContainer] - Контейнер сайдбара для скролла (опционально)
 * @returns {Object} API компонента: { render(), destroy() }
 */
export const createFiltersSummary = ({ container, sidebarContainer = null } = {}) => {
  if (!container) {
    throw new Error('[filters-summary] Container element is required');
  }

  let unsubscribeStore = null;
  let summaryElement = null;

  /**
   * Обработчик удаления фильтра
   * Использует публичный API window.app.catalog
   * @param {CustomEvent} event - Событие ui-filters-summary:remove
   */
  const handleFilterRemove = (event) => {
    const { filterId } = event.detail || {};
    if (!filterId) {
      return;
    }

    if (window.app && window.app.catalog) {
      // Если это поиск, очищаем его через API
      if (filterId === 'search') {
        window.app.catalog.setSearch('');
      } else {
        // Удаляем фильтр через API (передаём null для удаления)
        window.app.catalog.updateFilter(filterId, null);
      }
    }
  };

  /**
   * Обработчик клика на чипс (скролл к фильтру в сайдбаре)
   * @param {CustomEvent} event - Событие ui-filters-summary:click
   */
  const handleFilterClick = (event) => {
    const { filterId } = event.detail || {};
    if (!filterId || !sidebarContainer) {
      return;
    }

    // Специальная обработка для category-of-toys
    if (filterId === 'category-of-toys') {
      // Находим компонент category-tree-filter
      const categoryFilter = sidebarContainer.querySelector('category-tree-filter');
      if (categoryFilter) {
        // Разворачиваем фильтр категорий, если он свёрнут
        if (!categoryFilter.state.isExpanded) {
          categoryFilter.toggleExpanded();
        }
        
        // Скроллим к фильтру категорий
        categoryFilter.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        // Подсвечиваем фильтр
        categoryFilter.classList.add('catalog-sidebar__filter--highlighted');
        setTimeout(() => {
          categoryFilter.classList.remove('catalog-sidebar__filter--highlighted');
        }, 2000);
      }
      return;
    }

    // Находим соответствующий фильтр в сайдбаре
    // Ищем по field-id в ui-form-field или по name в ui-form-controller
    const filterField = sidebarContainer.querySelector(
      `ui-form-field[field-id="${filterId}"], ui-form-field[name="${filterId}"]`
    );

    if (filterField) {
      // Скроллим к фильтру
      filterField.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      
      // Подсвечиваем фильтр (опционально)
      filterField.classList.add('catalog-sidebar__filter--highlighted');
      setTimeout(() => {
        filterField.classList.remove('catalog-sidebar__filter--highlighted');
      }, 2000);
    }
  };

  /**
   * Преобразовать фильтры из стора в формат для ui-filters-summary
   * @param {Object} filters - Фильтры из стора { filterKey: [values] }
   * @param {string} mode - Режим каталога
   * @returns {Array} Массив фильтров для чипсов
   */
  const formatFiltersForChips = (filters, mode) => {
    if (!filters || typeof filters !== 'object') {
      return [];
    }

    const chips = [];
    
    // Обрабатываем category-of-toys отдельно - один общий чипс
    if (filters['category-of-toys'] && Array.isArray(filters['category-of-toys']) && filters['category-of-toys'].length > 0) {
      const categoryValues = filters['category-of-toys'];
      const taxonomyTerms = getTaxonomyTerms();
      const categoryTerms = taxonomyTerms?.['category-of-toys'];
      
      if (categoryTerms) {
        // Получаем названия категорий
        const categoryNames = categoryValues
          .map(value => {
            const term = Object.values(categoryTerms).find(
              t => t.slug === value || String(t.id) === String(value)
            );
            return term ? term.name : value;
          })
          .filter(Boolean);
        
        // Создаём один общий чипс
        chips.push({
          id: 'category-of-toys',
          label: 'Категории',
          value: categoryNames.join(', '),
          removable: true,
        });
      }
    }

    // Обрабатываем остальные фильтры
    Object.entries(filters)
      .filter(([filterKey, values]) => {
        // Пропускаем category-of-toys, так как он уже обработан
        if (filterKey === 'category-of-toys') {
          return false;
        }
        return Array.isArray(values) && values.length > 0;
      })
      .forEach(([filterKey, filterValues]) => {
        const label = getFilterLabel(filterKey, mode);
        const displayValue = getFilterDisplayValue(filterKey, filterValues, mode);

        chips.push({
          id: filterKey,
          label,
          value: displayValue,
          removable: true,
        });
      });

    return chips;
  };

  /**
   * Обработчик изменений состояния каталога через события
   * Обновляет список чипсов при изменении фильтров
   * @param {CustomEvent} event - Событие elkaretro:catalog:updated
   */
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
    const mode = catalogState.mode || 'type';
    
    // Добавляем чип для поиска, если он активен
    const chips = formatFiltersForChips(filters, mode);
    if (catalogState.search && catalogState.search.trim() !== '') {
      chips.unshift({
        id: 'search',
        label: 'Поиск',
        value: catalogState.search.trim(),
        removable: true,
      });
    }

    // Обновляем чипсы через метод setFilters
    if (typeof summaryElement.setFilters === 'function') {
      summaryElement.setFilters(chips);
    }
  };

  /**
   * Рендеринг компонента чипсов в контейнер
   */
  const render = () => {
    // Очищаем контейнер
    container.innerHTML = '';

    // Получаем текущие фильтры из API
    const currentState = window.app?.catalog?.getState();
    if (!currentState) {
      return;
    }
    
    const draftFilters = window.app?.catalogStore?.getDraftFilters?.();
    const hasDraft = draftFilters && Object.keys(draftFilters).length > 0;
    const filters = hasDraft ? draftFilters : (currentState.filters || {});
    const mode = currentState.mode || 'type';
    const chips = formatFiltersForChips(filters, mode);
    
    // Добавляем чип для поиска, если он активен
    if (currentState.search && currentState.search.trim() !== '') {
      chips.unshift({
        id: 'search',
        label: 'Поиск',
        value: currentState.search.trim(),
        removable: true,
      });
    }

    // Используем innerHTML вместо createElement (новый подход)
    container.innerHTML = `
      <ui-filters-summary empty-label="Нет активных фильтров"></ui-filters-summary>
    `;
    
    // Находим элемент после рендера
    summaryElement = container.querySelector('ui-filters-summary');
    
    if (!summaryElement) {
      console.warn('[filters-summary] ui-filters-summary element not found after render');
      return;
    }
    
    // Устанавливаем начальные фильтры
    if (typeof summaryElement.setFilters === 'function') {
      summaryElement.setFilters(chips);
    }

    // Подписываемся на события
    summaryElement.addEventListener('ui-filters-summary:remove', handleFilterRemove);
    summaryElement.addEventListener('ui-filters-summary:click', handleFilterClick);

    // Подписываемся на события каталога для синхронизации
    window.addEventListener('elkaretro:catalog:updated', handleCatalogUpdate);
    unsubscribeStore = () => {
      window.removeEventListener('elkaretro:catalog:updated', handleCatalogUpdate);
    };

    // Обновляем чипсы сразу при рендере
    handleCatalogUpdate({ detail: { state: currentState } });
  };

  /**
   * Уничтожить компонент (очистка подписок и ссылок)
   */
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

  // Возвращаем API компонента
  return {
    render,
    destroy,
  };
};

