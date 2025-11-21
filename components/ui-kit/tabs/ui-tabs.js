/**
 * UI Tabs Component
 * 
 * Универсальный компонент табов для использования на любых страницах.
 * Не перетирает контент благодаря отключенному autoRender.
 * 
 * @package ElkaRetro
 */

import { BaseElement } from '../../base-element.js';
import { renderTabsTemplate } from './ui-tabs-template.js';

if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./ui-tabs-styles.css', import.meta.url));
}

export class UITabs extends BaseElement {
  static autoRender = false; // Отключаем автоматический рендер, чтобы не перетирать контент
  
  static stateSchema = {
    activeTab: {
      type: 'string',
      default: '',
      attribute: { name: 'active-tab', observed: true, reflect: true }
    },
    size: {
      type: 'string',
      default: 'medium',
      attribute: { name: 'size', observed: true, reflect: true }
    }
  };

  constructor() {
    super();
    this._tabItemsCache = null; // Кеш для сохранения данных табов
  }

  async connectedCallback() {
    super.connectedCallback();
    // Ждём, пока tab-item будет определён как custom element
    await customElements.whenDefined('ui-tab-item');
    // Используем requestAnimationFrame, чтобы дать время tab-item инициализироваться
    requestAnimationFrame(() => {
      this._cacheTabItems();
      this.render();
    });
  }

  onStateChanged(key) {
    if (key === 'activeTab') {
      this.render();
    }
  }

  _cacheTabItems() {
    // Сохраняем данные табов из DOM перед первым рендером
    if (this._tabItemsCache === null) {
      const tabItems = Array.from(this.querySelectorAll('ui-tab-item')).map(item => ({
        id: item.getAttribute('id') || '',
        label: item.getAttribute('label') || ''
      }));
      
      if (tabItems.length > 0) {
        this._tabItemsCache = tabItems;
      }
    }
  }

  render() {
    // Используем кеш, если он есть, иначе пытаемся прочитать из DOM
    let tabItems = this._tabItemsCache;
    
    if (!tabItems || tabItems.length === 0) {
      // Пробуем прочитать из DOM (на случай, если кеш не был создан)
      tabItems = Array.from(this.querySelectorAll('ui-tab-item')).map(item => ({
        id: item.getAttribute('id') || '',
        label: item.getAttribute('label') || ''
      }));
      
      // Сохраняем в кеш, если нашли
      if (tabItems.length > 0) {
        this._tabItemsCache = tabItems;
      }
    }

    // Если нет вкладок, не рендерим ничего
    if (!tabItems || tabItems.length === 0) {
      console.warn('[ui-tabs] No tab items found. Add <ui-tab-item> elements as children.');
      return;
    }

    // Если activeTab не установлен, используем первый таб
    if (!this.state.activeTab && tabItems.length > 0) {
      this.setState({ activeTab: tabItems[0].id });
      return; // render() вызовется снова через onStateChanged
    }

    this.innerHTML = renderTabsTemplate({
      activeTab: this.state.activeTab,
      tabs: tabItems,
      size: this.state.size || 'medium'
    });

    this._attachEventListeners();
  }

  _attachEventListeners() {
    // Обработка кликов через кастомное событие от ui-button
    this.removeEventListener('ui-tabs:tab-click', this._handleTabClick);
    this._handleTabClick = (e) => {
      e.preventDefault();
      const tabId = e.target.dataset?.tabId || e.target.closest('.ui-tabs__button')?.dataset?.tabId;
      if (tabId && tabId !== this.state.activeTab) {
        this.setState({ activeTab: tabId });
        
        // Отправляем событие смены вкладки
        this.dispatchEvent(new CustomEvent('ui-tabs:change', {
          detail: { 
            activeTab: tabId,
            previousTab: this.state.activeTab
          },
          bubbles: true
        }));
      }
    };
    this.addEventListener('ui-tabs:tab-click', this._handleTabClick);
  }

  /**
   * Публичный API: программное переключение таба
   * @param {string} tabId - ID таба для активации
   */
  showTab(tabId) {
    if (tabId) {
      this.setState({ activeTab: tabId });
    }
  }

  /**
   * Публичный API: получить текущий активный таб
   * @returns {string}
   */
  getActiveTab() {
    return this.state.activeTab;
  }
}

customElements.define('ui-tabs', UITabs);

// Компонент для отдельного элемента вкладки
export class UITabItem extends BaseElement {
  static autoRender = false; // Не рендерим ничего, только передаём данные родителю
  
  connectedCallback() {
    super.connectedCallback();
    // Этот компонент используется только для передачи данных родителю
    // Реальный рендер происходит в ui-tabs
  }
}

customElements.define('ui-tab-item', UITabItem);

