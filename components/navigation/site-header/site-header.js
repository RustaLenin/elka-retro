import { site_header_template } from './site-header-template.js';
import { BaseElement } from '../../base-element.js';

class SiteHeader extends BaseElement {
  constructor() {
    super();
    this.state = {
      cartCount: 2,
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
    
    // Инициализируем счетчик корзины
    this.initCartCount();
    
    // Инициализируем компоненты авторизации
    this._initAuth();
    
    // Listen for cart updates (новые события от cartStore)
    this._handleCartUpdated = (e) => {
      this.state.cartCount = e.detail.count || 0;
      this.render();
      this.attachEventListeners();
    };
    
    window.addEventListener('elkaretro:cart:updated', this._handleCartUpdated);
    
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
    try {
      await Promise.all([
        import('../../user-profile/services/user-ui-service.js'),
        import('../../user-profile/user-menu/user-menu.js')
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

  /**
   * Инициализировать счетчик корзины из cartStore
   */
  async initCartCount() {
    // Пытаемся получить счетчик из cartStore
    if (window.app && window.app.cartStore) {
      const count = window.app.cartStore.getCount();
      if (count !== this.state.cartCount) {
        this.state.cartCount = count;
        this.render();
        this.attachEventListeners();
      }
    } else {
      // Fallback: пытаемся загрузить cartStore асинхронно
      try {
        const { getCartStore } = await import('../../cart/cart-store.js');
        const cartStore = getCartStore();
        if (!window.app.cartStore) {
          window.app.cartStore = cartStore;
        }
        const count = cartStore.getCount();
        if (count !== this.state.cartCount) {
          this.state.cartCount = count;
          this.render();
          this.attachEventListeners();
        }
      } catch (error) {
        console.warn('[SiteHeader] Failed to load cart store:', error);
        // Если не удалось загрузить, проверяем через небольшую задержку
        setTimeout(() => {
          if (window.app && window.app.cartStore) {
            const count = window.app.cartStore.getCount();
            this.state.cartCount = count;
            this.render();
            this.attachEventListeners();
          }
        }, 500);
      }
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