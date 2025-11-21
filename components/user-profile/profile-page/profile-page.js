import { BaseElement } from '../../base-element.js';
import { authService } from '../services/auth-service.js';
import { renderProfilePageTemplate } from './profile-page-template.js';

if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./profile-page-styles.css', import.meta.url));
}

export class ProfilePage extends BaseElement {
  static stateSchema = {
    userId: {
      type: 'number',
      default: null,
      attribute: { name: 'user-id', observed: true, reflect: true }
    },
    activeTab: {
      type: 'string',
      default: 'settings',
      attribute: { name: 'active-tab', observed: true, reflect: true }
    },
    loading: {
      type: 'boolean',
      default: true,
      attribute: null,
      internal: true
    },
    error: {
      type: 'string',
      default: null,
      attribute: null,
      internal: true
    },
    user: {
      type: 'json',
      default: null,
      attribute: null,
      internal: true
    }
  };

  constructor() {
    super();
    this._tabsLoaded = new Set();
  }

  connectedCallback() {
    super.connectedCallback();
    
    // Проверяем авторизацию
    this._checkAuth();
    
    // Слушаем изменения авторизации
    window.addEventListener('elkaretro:auth:logout', () => {
      this._redirectToHome();
    });
  }

  async _checkAuth() {
    // Используем данные из window.app.auth (из PHP) - они всегда доступны при загрузке страницы
    if (window.app?.auth?.user && window.app.auth.authenticated) {
      this.setState({ 
        user: window.app.auth.user,
        userId: window.app.auth.user.id,
        loading: false 
      });
      
      this.render();
      this._initActiveTab();
      return;
    }

    // Если данных нет, значит пользователь не авторизован
    // Редирект на главную с открытием модалки авторизации
    this._redirectToHomeWithAuth();
  }

  _redirectToHome() {
    window.location.href = '/';
  }

  _redirectToHomeWithAuth() {
    // Редирект на главную и открытие модального окна авторизации
    const currentUrl = window.location.href;
    window.location.href = '/?redirect=' + encodeURIComponent(currentUrl);
    
    // После загрузки страницы откроем модальное окно
    // (это обработается в app.js или на главной странице)
  }

  onStateChanged(key) {
    if (key === 'activeTab') {
      this._initActiveTab();
    }
  }

  _initActiveTab() {
    const tabId = this.state.activeTab || 'settings';
    
    // Показываем активную вкладку
    this._showActiveTab();
    
    // Ленивая загрузка вкладки (если ещё не загружена)
    this._loadTab(tabId);
    
    // Обновляем навигацию по вкладкам
    this._updateTabNavigation();
  }

  /**
   * Получить имя элемента вкладки по её ID
   */
  _getTabElementName(tabId) {
    const mapping = {
      'settings': 'profile-settings-tab',
      'orders': 'order-history-tab',
      'contact': 'contact-form-tab',
    };
    return mapping[tabId] || null;
  }

  async _loadTab(tabId) {
    const tabElementName = this._getTabElementName(tabId);
    if (!tabElementName) {
      console.warn(`[ProfilePage] Unknown tab ID: ${tabId}`);
      return;
    }

    // Проверяем, не загружен ли уже JavaScript-компонент вкладки
    const tabElement = this.querySelector(tabElementName);
    if (!tabElement) {
      console.warn(`[ProfilePage] Tab element "${tabElementName}" not found`);
      return;
    }

    // Если компонент уже определён и подключён, просто показываем вкладку
    if (customElements.get(tabElementName) && tabElement.isConnected) {
      this._tabsLoaded.add(tabId);
      this._showActiveTab();
      return;
    }

    // Если вкладка уже загружена, не загружаем повторно
    if (this._tabsLoaded.has(tabId)) {
      this._showActiveTab();
      return;
    }

    try {
      // Ленивая загрузка JavaScript-компонента вкладки
      switch (tabId) {
        case 'settings':
          await import('./tabs/profile-settings/profile-settings.js');
          break;
        case 'orders':
          await import('./tabs/order-history/order-history.js');
          break;
        case 'contact':
          await import('./tabs/contact-form/contact-form.js');
          break;
        default:
          console.warn('[ProfilePage] Unknown tab:', tabId);
          return;
      }

      // Ждём, пока компонент зарегистрируется и инициализируется
      await customElements.whenDefined(tabElementName);
      
      this._tabsLoaded.add(tabId);
      
      // Компоненты вкладок уже созданы в шаблоне, нужно только показать активную
      this._showActiveTab();
    } catch (error) {
      console.error(`[ProfilePage] Failed to load tab ${tabId}:`, error);
    }
  }

  _showActiveTab() {
    const activeTab = this.state.activeTab;
    const tabs = ['settings', 'orders', 'contact'];
    
    tabs.forEach(tabId => {
      const tabElementName = this._getTabElementName(tabId);
      if (tabElementName) {
        const tabElement = this.querySelector(tabElementName);
        if (tabElement) {
          tabElement.style.display = tabId === activeTab ? 'block' : 'none';
        }
      }
    });
  }

  _updateTabNavigation() {
    const nav = this.querySelector('ui-tabs');
    if (nav) {
      nav.setAttribute('active-tab', this.state.activeTab);
      // Обновляем навигацию, если у неё есть метод render
      if (typeof nav.render === 'function') {
        nav.render();
      }
    }
  }

  _handleTabChange(event) {
    const { activeTab, previousTab } = event.detail;
    this.setState({ activeTab });
    
    // Показываем новую активную вкладку и скрываем предыдущую
    this._showActiveTab();
    
    // Загружаем новую вкладку, если ещё не загружена
    this._loadTab(activeTab);
    
    // Отправляем событие смены вкладки
    this.dispatchEvent(new CustomEvent('profile-page:tab-changed', {
      detail: { activeTab, previousTab },
      bubbles: true
    }));
  }

  render() {
    if (this.state.loading) {
      this.innerHTML = `
        <div class="profile-page profile-page--loading">
          <block-loader label="Загрузка профиля..."></block-loader>
        </div>
      `;
      return;
    }

    if (this.state.error) {
      this.innerHTML = `
        <div class="profile-page profile-page--error">
          <div class="profile-page__error">
            <p>${this.state.error}</p>
          </div>
        </div>
      `;
      return;
    }

    this.innerHTML = renderProfilePageTemplate(this.state);
    
    // Инициализируем компоненты после рендера
    requestAnimationFrame(() => {
      this._initComponents();
    });
  }

  async _initComponents() {
    // Инициализируем навигацию по вкладкам
    const tabNav = this.querySelector('ui-tabs');
    if (tabNav) {
      // Ждём, пока компонент ui-tabs загрузится и определится
      await customElements.whenDefined('ui-tabs');
      
      // Убеждаемся, что навигация отрендерилась с вкладками из шаблона
      if (typeof tabNav.render === 'function') {
        tabNav.render();
      }
      
      // Добавляем обработчик смены вкладки
      tabNav.addEventListener('ui-tabs:change', (e) => this._handleTabChange(e));
      this._updateTabNavigation();
    }

    // Загружаем активную вкладку
    this._initActiveTab();
  }

  showTab(tabId) {
    this.setState({ activeTab: tabId });
  }
}

customElements.define('profile-page', ProfilePage);

