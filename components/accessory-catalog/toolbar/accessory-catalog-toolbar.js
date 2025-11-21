/**
 * Accessory Catalog Toolbar Controller
 * 
 * Responsibilities:
 * - Оркестратор компонентов toolbar (поиск, сортировка)
 * - Интеграция search-box и sort-control
 * - Управление жизненным циклом компонентов
 * 
 * Dependencies:
 * - search-box.js - компонент поиска
 * - sort-control.js - компонент сортировки
 * - filters-summary.js - компонент фильтров-чипсов
 */

import { createSearchBox } from './search-box.js';
import { createSortControl } from './sort-control.js';
import { createFiltersSummary } from './filters-summary.js';
import { renderToolbarShell } from './toolbar-template.js';

// Загружаем стили сразу при импорте модуля
if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./toolbar-styles.css', import.meta.url));
}

export default class AccessoryCatalogToolbar {
  constructor(options = {}) {
    this.options = options;
    this.container = null;
    
    // Ссылки на компоненты
    this.searchBox = null;
    this.sortControl = null;
    this.filtersSummary = null;
    
    // Ссылки на DOM элементы
    this.searchContainer = null;
    this.sortContainer = null;
    this.chipsContainer = null;
  }

  /**
   * Инициализация toolbar
   * @param {HTMLElement} container - Контейнер для рендеринга toolbar
   */
  init(container) {
    if (!container) {
      throw new Error('[accessory-catalog-toolbar] Container element is required');
    }

    this.container = container;

    // Рендерим структуру toolbar
    this.container.innerHTML = renderToolbarShell();

    // Находим контейнеры для компонентов
    this.searchContainer = this.container.querySelector('[data-accessory-toolbar-search]');
    this.sortContainer = this.container.querySelector('[data-accessory-toolbar-sort]');
    this.chipsContainer = this.container.querySelector('[data-accessory-toolbar-chips]');

    if (!this.searchContainer || !this.sortContainer) {
      console.error('[accessory-catalog-toolbar] Required containers not found after render');
      return;
    }

    // Инициализируем компонент поиска
    this.searchBox = createSearchBox({
      container: this.searchContainer,
      debounceMs: 10000,
    });
    this.searchBox.render();

    // Инициализируем компонент сортировки
    this.sortControl = createSortControl({
      container: this.sortContainer,
    });
    this.sortControl.render();

    // Инициализируем компонент фильтров-чипсов (если контейнер есть)
    if (this.chipsContainer) {
      const sidebarContainer = document.querySelector('[data-accessory-catalog-sidebar]');
      
      this.filtersSummary = createFiltersSummary({
        container: this.chipsContainer,
        sidebarContainer: sidebarContainer,
      });
      this.filtersSummary.render();
    }
  }

  /**
   * Уничтожить компонент (очистка подписок и ссылок)
   */
  destroy() {
    if (this.searchBox && typeof this.searchBox.destroy === 'function') {
      this.searchBox.destroy();
      this.searchBox = null;
    }

    if (this.sortControl && typeof this.sortControl.destroy === 'function') {
      this.sortControl.destroy();
      this.sortControl = null;
    }

    if (this.filtersSummary && typeof this.filtersSummary.destroy === 'function') {
      this.filtersSummary.destroy();
      this.filtersSummary = null;
    }

    if (this.container) {
      this.container.innerHTML = '';
    }

    this.searchContainer = null;
    this.sortContainer = null;
    this.chipsContainer = null;
    this.container = null;
  }
}

