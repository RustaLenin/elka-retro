/**
 * Accessory Catalog Sort Control Widget
 * 
 * Responsibilities:
 * - Выбор опций сортировки для аксессуаров
 * - Интеграция со стором: подписка на sort, обновление при выборе
 * - Опции сортировки из backend (ACCESSORY_SORTS в catalog-query-manager.php)
 * 
 * Dependencies:
 * - accessory-catalog-store.js - для получения и обновления состояния
 * - ui-select-single - компонент выбора из UI Kit
 */

import { renderSortControl } from './sort-control-template.js';

/**
 * Маппинг значений сортировки на человекочитаемые названия для аксессуаров
 */
const SORT_LABELS = {
  default: 'Новые поступления',
  newest: 'Сначала новые',
  oldest: 'Сначала старые',
  price_low_high: 'Сначала дешёвые',
  price_high_low: 'Сначала дорогие',
  alphabetical: 'По алфавиту',
  stock_desc: 'Сначала в наличии',
};

/**
 * Получить опции сортировки для аксессуаров
 * @returns {Array} Массив опций сортировки [{ value, label }]
 */
const getSortOptions = () => {
  // Опции сортировки для аксессуаров (из catalog-query-manager.php ACCESSORY_SORTS)
  const sortKeys = ['default', 'newest', 'oldest', 'price_low_high', 'price_high_low', 'alphabetical', 'stock_desc'];
  
  return sortKeys.map((key) => ({
    value: key,
    label: SORT_LABELS[key] || key,
  }));
};

/**
 * Создать и инициализировать компонент сортировки для каталога аксессуаров
 * Компонент использует публичный API window.app.accessoryCatalog вместо прямого доступа к стору
 * @param {Object} options - Опции инициализации
 * @param {HTMLElement} options.container - Контейнер для рендеринга сортировки
 * @returns {Object} API компонента: { render(), setValue(value), getValue(), destroy() }
 */
export const createSortControl = ({ container } = {}) => {
  if (!container) {
    throw new Error('[accessory-sort-control] Container element is required');
  }

  let unsubscribeStore = null;
  let selectElement = null;

  const handleSelectChange = (event) => {
    const newSort = event.detail?.value;
    if (!newSort) {
      return;
    }

    if (window.app && window.app.accessoryCatalog) {
      window.app.accessoryCatalog.setSort(newSort);
    }
  };

  const handleCatalogUpdate = (event) => {
    if (!selectElement) {
      return;
    }

    const catalogState = event.detail?.state;
    if (!catalogState) {
      return;
    }

    const currentSort = catalogState.sort || '';
    const currentValue = selectElement.getAttribute('value') || '';

    if (currentValue !== currentSort) {
      selectElement.setAttribute('value', currentSort);
    }
  };

  const render = () => {
    container.innerHTML = '';

    const currentState = window.app?.accessoryCatalog?.getState();
    const currentSort = currentState?.sort || 'newest';

    const sortOptions = getSortOptions();

    container.innerHTML = renderSortControl({ currentValue: currentSort, options: sortOptions });

    window.addEventListener('elkaretro:accessory-catalog:updated', handleCatalogUpdate);
    unsubscribeStore = () => {
      window.removeEventListener('elkaretro:accessory-catalog:updated', handleCatalogUpdate);
    };

    customElements.whenDefined('ui-select-single').then(() => {
      return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }).then(() => {
      selectElement = container.querySelector('ui-select-single');
      
      if (!selectElement) {
        console.warn('[accessory-sort-control] ui-select-single element not found in container:', container);
        return;
      }

      if (sortOptions.length > 0) {
        const currentOptionsAttr = selectElement.getAttribute('options');
        const currentOptions = selectElement.state?.options || [];
        
        if (!currentOptionsAttr || currentOptionsAttr === '[]' || !Array.isArray(currentOptions) || currentOptions.length === 0) {
          selectElement.setAttribute('options', JSON.stringify(sortOptions));
        }
      }

      selectElement.addEventListener('ui-select:change', handleSelectChange);
    }).catch((error) => {
      console.error('[accessory-sort-control] Error initializing elements:', error);
    });
  };

  const setValue = (value) => {
    if (typeof value !== 'string') {
      return;
    }

    if (window.app && window.app.accessoryCatalog) {
      window.app.accessoryCatalog.setSort(value);
    }
  };

  const getValue = () => {
    const state = window.app?.accessoryCatalog?.getState();
    return state?.sort || '';
  };

  const destroy = () => {
    if (selectElement) {
      selectElement.removeEventListener('ui-select:change', handleSelectChange);
      selectElement = null;
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
    setValue,
    getValue,
    destroy,
  };
};

