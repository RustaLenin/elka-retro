import { BaseElement } from '../../../base-element.js';
import { renderTabNavigationTemplate } from './tab-navigation-template.js';

if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./tab-navigation-styles.css', import.meta.url));
}

export class TabNavigation extends BaseElement {
  static stateSchema = {
    activeTab: {
      type: 'string',
      default: 'settings',
      attribute: { name: 'active-tab', observed: true, reflect: true }
    }
  };

  constructor() {
    super();
  }

  connectedCallback() {
    super.connectedCallback();
    this.render();
  }

  onStateChanged(key) {
    if (key === 'activeTab') {
      this.render();
    }
  }

  render() {
    // Получаем элементы вкладок из дочерних элементов
    const tabItems = Array.from(this.querySelectorAll('tab-nav-item')).map(item => ({
      id: item.getAttribute('id') || '',
      label: item.getAttribute('label') || ''
    }));

    this.innerHTML = renderTabNavigationTemplate({
      activeTab: this.state.activeTab,
      tabs: tabItems
    });

    this._attachEventListeners();
  }

  _attachEventListeners() {
    // Обработка кликов через кастомное событие от ui-button
    this.removeEventListener('tab-navigation:tab-click', this._handleTabClick);
    this._handleTabClick = (e) => {
      e.preventDefault();
      const tabId = e.target.dataset?.tabId || e.target.closest('.tab-navigation__button')?.dataset?.tabId;
      if (tabId && tabId !== this.state.activeTab) {
        this.setState({ activeTab: tabId });
        
        // Отправляем событие смены вкладки
        this.dispatchEvent(new CustomEvent('tab-navigation:change', {
          detail: { 
            activeTab: tabId,
            previousTab: this.state.activeTab
          },
          bubbles: true
        }));
      }
    };
    this.addEventListener('tab-navigation:tab-click', this._handleTabClick);
  }
}

customElements.define('tab-navigation', TabNavigation);

// Компонент для отдельного элемента вкладки
export class TabNavItem extends BaseElement {
  connectedCallback() {
    super.connectedCallback();
    // Этот компонент используется только для передачи данных родителю
    // Реальный рендер происходит в tab-navigation
  }
}

customElements.define('tab-nav-item', TabNavItem);

