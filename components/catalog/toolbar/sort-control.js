/**
 * Sort control widget.
 *
 * Responsibilities:
 * - Выбор опций сортировки
 * - Интеграция со стором: подписка на sort, обновление при выборе
 * - Опции сортировки из window.catalogSettings.sortOptions
 *
 * Dependencies:
 * - catalog-store.js - для получения и обновления состояния
 * - ui-select-single - компонент выбора из UI Kit
 */

import { renderSortControl } from './sort-control-template.js';

/**
 * Маппинг значений сортировки на человекочитаемые названия
 */
const SORT_LABELS = {
  newest: 'Сначала новые',
  oldest: 'Сначала старые',
  price_asc: 'По цене (сначала дешевле)',
  price_desc: 'По цене (сначала дороже)',
  name_asc: 'По названию (А-Я)',
  name_desc: 'По названию (Я-А)',
};

/**
 * Нормализовать опции сортировки
 * Преобразует массив строк в массив объектов { value, label }
 * @param {Array} options - Опции (массив строк или объектов)
 * @returns {Array} Массив объектов [{ value, label }]
 */
const normalizeSortOptions = (options) => {
  if (!Array.isArray(options) || options.length === 0) {
    return [];
  }

  return options.map((option) => {
    // Если уже объект с value и label, возвращаем как есть
    if (typeof option === 'object' && option !== null && option.value) {
      return {
        value: option.value,
        label: option.label || SORT_LABELS[option.value] || option.value,
      };
    }

    // Если строка, преобразуем в объект
    if (typeof option === 'string') {
      return {
        value: option,
        label: SORT_LABELS[option] || option,
      };
    }

    // Неизвестный формат
    return null;
  }).filter(Boolean); // Убираем null значения
};

/**
 * Получить опции сортировки из глобальных настроек
 * @returns {Array} Массив опций сортировки [{ value, label }]
 */
const getSortOptions = () => {
  const globalSettings = typeof window !== 'undefined' && window.catalogSettings ? window.catalogSettings : {};
  
  // Получаем опции из настроек или используем дефолтные
  const rawOptions = Array.isArray(globalSettings.sort_options) && globalSettings.sort_options.length
    ? globalSettings.sort_options
    : ['newest', 'oldest']; // Дефолтные значения как строки

  // Нормализуем опции (преобразуем строки в объекты)
  return normalizeSortOptions(rawOptions);
};

/**
 * Создать и инициализировать компонент сортировки
 * Компонент использует публичный API window.app.catalog вместо прямого доступа к стору
 * @param {Object} options - Опции инициализации
 * @param {HTMLElement} options.container - Контейнер для рендеринга сортировки
 * @returns {Object} API компонента: { render(), setValue(value), getValue(), destroy() }
 */
export const createSortControl = ({ container } = {}) => {
  if (!container) {
    throw new Error('[sort-control] Container element is required');
  }

  let unsubscribeStore = null;
  let selectElement = null;

  /**
   * Обработчик изменения сортировки в селекте
   * Использует публичный API window.app.catalog
   * @param {CustomEvent} event - Событие ui-select:change
   */
  const handleSelectChange = (event) => {
    const newSort = event.detail?.value;
    if (!newSort) {
      return;
    }

    if (window.app && window.app.catalog) {
      window.app.catalog.setSort(newSort);
    }
  };

  /**
   * Обработчик изменений состояния каталога через события
   * Синхронизирует визуальное состояние селекта с актуальной сортировкой
   * @param {CustomEvent} event - Событие elkaretro:catalog:updated
   */
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

    // Обновляем значение селекта, если оно изменилось извне
    // Используем только setAttribute, не используем setState (старый подход)
    if (currentValue !== currentSort) {
      selectElement.setAttribute('value', currentSort);
    }
  };

  /**
   * Рендеринг селекта сортировки в контейнер
   */
  const render = () => {
    // Очищаем контейнер
    container.innerHTML = '';

    // Получаем текущую сортировку из API
    const currentState = window.app?.catalog?.getState();
    const currentSort = currentState?.sort || 'newest'; // Дефолтное значение, если не задано

    // Получаем опции сортировки
    const sortOptions = getSortOptions();

    // Рендерим шаблон
    container.innerHTML = renderSortControl({ currentValue: currentSort, options: sortOptions });

    // Подписываемся на события каталога для синхронизации
    window.addEventListener('elkaretro:catalog:updated', handleCatalogUpdate);
    unsubscribeStore = () => {
      window.removeEventListener('elkaretro:catalog:updated', handleCatalogUpdate);
    };

    // Находим элемент селекта после рендера
    // Используем простой подход: ждём регистрации кастомного элемента
    customElements.whenDefined('ui-select-single').then(() => {
      // Дополнительная задержка для полной инициализации
      return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }).then(() => {
      selectElement = container.querySelector('ui-select-single');
      
      if (!selectElement) {
        return;
      }

      // Убеждаемся, что опции установлены через атрибут
      // (они уже в шаблоне, но проверяем на случай проблем с парсингом)
      if (sortOptions.length > 0) {
        const currentOptionsAttr = selectElement.getAttribute('options');
        const currentOptions = selectElement.state?.options || [];
        
        // Проверяем, правильно ли парсятся опции
        if (!currentOptionsAttr || currentOptionsAttr === '[]' || !Array.isArray(currentOptions) || currentOptions.length === 0) {
          // Устанавливаем через setAttribute с JSON строкой
          selectElement.setAttribute('options', JSON.stringify(sortOptions));
        }
      }

      // Подписываемся на изменения селекта
      selectElement.addEventListener('ui-select:change', handleSelectChange);
    }).catch((error) => {
      // Silently handle initialization errors
    });
  };

  /**
   * Программно установить сортировку
   * Использует публичный API window.app.catalog
   * @param {string} value - Значение сортировки
   */
  const setValue = (value) => {
    if (typeof value !== 'string') {
      return;
    }

    if (window.app && window.app.catalog) {
      window.app.catalog.setSort(value);
    }
  };

  /**
   * Получить текущую сортировку
   * Использует публичный API window.app.catalog
   * @returns {string} Текущее значение сортировки
   */
  const getValue = () => {
    const state = window.app?.catalog?.getState();
    return state?.sort || '';
  };

  /**
   * Уничтожить компонент (очистка подписок и ссылок)
   */
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

  // Возвращаем API компонента
  return {
    render,
    setValue,
    getValue,
    destroy,
  };
};

