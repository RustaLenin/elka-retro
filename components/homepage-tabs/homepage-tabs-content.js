/**
 * Homepage Tabs Content Component
 * 
 * Управляет видимостью контента табов на главной странице.
 * Контент рендерится PHP, компонент только переключает видимость.
 * 
 * @package ElkaRetro
 */

if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./homepage-tabs-content-styles.css', import.meta.url));
}

export class HomepageTabsContent extends HTMLElement {
  constructor() {
    super();
    this._activeTab = this.getAttribute('active-tab') || 'toys';
  }

  static get observedAttributes() {
    return ['active-tab'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'active-tab' && oldValue !== newValue) {
      this._activeTab = newValue;
      this._showActiveTab();
    }
  }

  connectedCallback() {
    this._attachEventListeners();
    this._showActiveTab();
  }

  disconnectedCallback() {
    this._detachEventListeners();
  }

  _attachEventListeners() {
    this._handleTabChange = (e) => {
      const activeTab = e.detail?.activeTab;
      if (activeTab && activeTab !== this._activeTab) {
        this.setAttribute('active-tab', activeTab);
      }
    };

    // Находим ui-tabs в родительском элементе и слушаем его событие напрямую
    const parent = this.parentElement;
    if (parent) {
      const uiTabs = parent.querySelector('ui-tabs');
      if (uiTabs) {
        uiTabs.addEventListener('ui-tabs:change', this._handleTabChange);
        this._uiTabsElement = uiTabs; // Сохраняем ссылку для отписки
      } else {
        // Fallback: слушаем на родительском элементе (событие всплывает)
        parent.addEventListener('ui-tabs:change', this._handleTabChange);
        this._parentElement = parent; // Сохраняем ссылку для отписки
      }
    } else {
      // Fallback: слушаем на самом элементе (событие всплывает)
      this.addEventListener('ui-tabs:change', this._handleTabChange);
    }
  }

  _detachEventListeners() {
    if (this._handleTabChange) {
      // Отписываемся от ui-tabs, если подписывались напрямую
      if (this._uiTabsElement) {
        this._uiTabsElement.removeEventListener('ui-tabs:change', this._handleTabChange);
        this._uiTabsElement = null;
      }
      // Отписываемся от родительского элемента
      if (this._parentElement) {
        this._parentElement.removeEventListener('ui-tabs:change', this._handleTabChange);
        this._parentElement = null;
      }
      // Отписываемся от самого элемента
      this.removeEventListener('ui-tabs:change', this._handleTabChange);
    }
  }

  _showActiveTab() {
    const panels = this.querySelectorAll('.tab-panel');
    panels.forEach(panel => {
      const isActive = panel.dataset.tabId === this._activeTab;
      panel.style.display = isActive ? 'block' : 'none';
    });
  }

  /**
   * Публичный API: программное переключение таба
   * @param {string} tabId - ID таба для активации
   */
  showTab(tabId) {
    if (tabId) {
      this.setAttribute('active-tab', tabId);
    }
  }

  /**
   * Публичный API: получить текущий активный таб
   * @returns {string}
   */
  getActiveTab() {
    return this._activeTab;
  }
}

customElements.define('homepage-tabs-content', HomepageTabsContent);

