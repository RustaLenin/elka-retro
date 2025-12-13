import { site_header_template } from './site-header-template.js';
import { BaseElement } from '../../base-element.js';

class SiteHeader extends BaseElement {
  constructor() {
    super();
    this.state = {
      cartCount: 0, // Будет обновлен при инициализации cart
      catalogUrl: '/catalog/',
      accessoriesUrl: '/ny-accessory/',
      homeUrl: '/'
    };
  }
  
  connectedCallback() {
    super.connectedCallback();
    // Get cart count from attribute
    const cartCountAttr = this.getAttribute('cart-count');
    if (cartCountAttr) {
      this.state.cartCount = parseInt(cartCountAttr, 10);
    }

    const catalogAttr = this.getAttribute('catalog-url');
    if (catalogAttr) {
      this.state.catalogUrl = catalogAttr;
    }

    const accessoriesAttr = this.getAttribute('accessories-url');
    if (accessoriesAttr) {
      this.state.accessoriesUrl = accessoriesAttr;
    }

    const homeAttr = this.getAttribute('home-url');
    if (homeAttr) {
      this.state.homeUrl = homeAttr;
    }
    
    // Инициализируем состояние авторизации
    this.state.authenticated = window.app?.auth?.authenticated || false;
    this.state.user = window.app?.auth?.user || null;
    
    this.render();
    this.attachEventListeners();
    
    // Инициализируем компоненты авторизации
    this._initAuth();
    
    // Слушаем события обновления корзины (включая инициализацию)
    // Когда cart инициализируется в app.js, будет отправлено событие elkaretro:cart:updated
    this._handleCartUpdated = (e) => {
      this.state.cartCount = e.detail.count || 0;
      this.render();
      this.attachEventListeners();
    };
    
    window.addEventListener('elkaretro:cart:updated', this._handleCartUpdated);
    
    // Если cart уже доступен при подключении компонента, получаем счетчик сразу
    if (window.app?.cart) {
      this.state.cartCount = window.app.cart.getCount();
      this.render();
      this.attachEventListeners();
    }
    
    // Также слушаем старое событие для обратной совместимости
    window.addEventListener('cart-updated', (e) => {
      this.state.cartCount = e.detail.count || 0;
      this.render();
      this.attachEventListeners();
    });

    // Слушаем изменения авторизации
    this._handleAuthChange = () => this._updateAuthState();
    window.addEventListener('elkaretro:auth:login', this._handleAuthChange);
    window.addEventListener('elkaretro:auth:register', this._handleAuthChange);
    window.addEventListener('elkaretro:auth:logout', this._handleAuthChange);
  }

  async _initAuth() {
    // Компоненты уже загружены статически через components.js
    // Просто ждём, пока они будут определены в customElements
    try {
      await Promise.all([
        customElements.whenDefined('user-menu')
      ]);
    } catch (error) {
      console.error('[SiteHeader] Failed to initialize auth components:', error);
    }
  }

  _updateAuthState() {
    if (window.app?.auth) {
      this.state.authenticated = window.app.auth.authenticated || false;
      this.state.user = window.app.auth.user || null;
      this.render();
      this.attachEventListeners();
    }
  }

  disconnectedCallback() {
    if (this._handleCartUpdated) {
      window.removeEventListener('elkaretro:cart:updated', this._handleCartUpdated);
    }
    
    if (this._handleAuthChange) {
      window.removeEventListener('elkaretro:auth:login', this._handleAuthChange);
      window.removeEventListener('elkaretro:auth:register', this._handleAuthChange);
      window.removeEventListener('elkaretro:auth:logout', this._handleAuthChange);
    }
  }

  render() {
    this.innerHTML = site_header_template(this.state);
  }
  
  attachEventListeners() {
    // Обработчики событий не требуются, так как мобильное меню удалено
  }
}

customElements.define('site-header', SiteHeader);