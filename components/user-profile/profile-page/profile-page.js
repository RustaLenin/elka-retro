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

  async _loadTab(tabId) {
    // Проверяем, не загружен ли уже JavaScript-компонент вкладки
    const tabElement = this.querySelector(`${tabId}-tab`);
    if (!tabElement) {
      console.warn(`[ProfilePage] Tab element "${tabId}-tab" not found`);
      return;
    }

    // Если компонент уже определён и подключён, просто показываем вкладку
    if (customElements.get(`${tabId}-tab`) && tabElement.isConnected) {
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
      await customElements.whenDefined(`${tabId}-tab`);
      
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
      const tabElement = this.querySelector(`${tabId}-tab`);
      if (tabElement) {
        tabElement.style.display = tabId === activeTab ? 'block' : 'none';
      }
    });
  }

  _updateTabNavigation() {
    const nav = this.querySelector('tab-navigation');
    if (nav) {
      nav.setAttribute('active-tab', this.state.activeTab);
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

  _initComponents() {
    // Инициализируем навигацию по вкладкам
    const tabNav = this.querySelector('tab-navigation');
    if (tabNav) {
      // Передаём список вкладок в навигацию через innerHTML
      tabNav.innerHTML = `
        <tab-nav-item id="settings" label="Настройки профиля"></tab-nav-item>
        <tab-nav-item id="orders" label="История заказов"></tab-nav-item>
        <tab-nav-item id="contact" label="Обратная связь"></tab-nav-item>
      `;
      tabNav.render(); // Перерендерим навигацию с новыми вкладками
      
      tabNav.addEventListener('tab-navigation:change', (e) => this._handleTabChange(e));
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

