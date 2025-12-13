import { BaseElement } from '../../base-element.js';
import { renderUserMenuTemplate } from './user-menu-template.js';

if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./user-menu-styles.css', import.meta.url));
}

export class UserMenu extends BaseElement {
  static stateSchema = {
    open: {
      type: 'boolean',
      default: false,
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
    this._onClickOutside = this._onClickOutside.bind(this);
    this._onEscape = this._onEscape.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    
    // Сохраняем ссылки на обработчики для правильного удаления
    this._handleAuthLogin = () => this._updateUser();
    this._handleAuthRegister = () => this._updateUser();
    this._handleAuthLogout = () => this._updateUser();
    
    // Доверяем данным из PHP - window.app.auth всегда инициализирован при загрузке страницы
    if (window.app?.auth?.user && window.app.auth.authenticated) {
      this.setState({ user: window.app.auth.user });
    } else {
      // PHP вернул null - пользователь не авторизован
      this.setState({ user: null });
    }
    
    this.render();
    
    // Подписываемся на события авторизации
    window.addEventListener('elkaretro:auth:login', this._handleAuthLogin);
    window.addEventListener('elkaretro:auth:register', this._handleAuthRegister);
    window.addEventListener('elkaretro:auth:logout', this._handleAuthLogout);
    
    // Слушаем изменения состояния авторизации
    if (window.app?.auth) {
      this._checkAuthState();
      // Периодически проверяем состояние (на случай изменений извне)
      this._authCheckInterval = setInterval(() => this._checkAuthState(), 5000);
    }
  }

  disconnectedCallback() {
    if (this._handleAuthLogin) {
      window.removeEventListener('elkaretro:auth:login', this._handleAuthLogin);
    }
    if (this._handleAuthRegister) {
      window.removeEventListener('elkaretro:auth:register', this._handleAuthRegister);
    }
    if (this._handleAuthLogout) {
      window.removeEventListener('elkaretro:auth:logout', this._handleAuthLogout);
    }
    
    if (this._authCheckInterval) {
      clearInterval(this._authCheckInterval);
      this._authCheckInterval = null;
    }
    
    this._removeOutsideClickListeners();
  }

  onStateChanged(key) {
    if (key === 'open') {
      this._updateMenuVisibility();
    } else if (key === 'user') {
      this.render();
    }
  }

  async _updateUser() {
    // Доверяем данным из PHP - window.app.auth всегда инициализирован при загрузке страницы
    if (window.app?.auth?.user && window.app.auth.authenticated) {
      this.setState({ user: window.app.auth.user });
    } else {
      // PHP вернул null - пользователь не авторизован
      this.setState({ user: null });
    }
  }

  _checkAuthState() {
    if (window.app?.auth) {
      const authenticated = window.app.auth.authenticated;
      const user = window.app.auth.user;
      
      if (authenticated && user) {
        this.setState({ user });
      } else if (!authenticated && this.state.user) {
        this.setState({ user: null });
      }
    }
  }

  _updateMenuVisibility() {
    const menu = this.querySelector('.user-menu__dropdown');
    if (menu) {
      menu.classList.toggle('user-menu__dropdown--open', this.state.open);
    }

    if (this.state.open) {
      this._addOutsideClickListeners();
    } else {
      this._removeOutsideClickListeners();
    }
  }

  _addOutsideClickListeners() {
    document.addEventListener('click', this._onClickOutside);
    document.addEventListener('keydown', this._onEscape);
  }

  _removeOutsideClickListeners() {
    document.removeEventListener('click', this._onClickOutside);
    document.removeEventListener('keydown', this._onEscape);
  }

  _onClickOutside(event) {
    if (!this.state.open) return;
    
    const button = this.querySelector('.user-menu__button');
    const menu = this.querySelector('.user-menu__dropdown');
    
    if (button && menu && 
        !button.contains(event.target) && 
        !menu.contains(event.target)) {
      this.close();
    }
  }

  _onEscape(event) {
    if (event.key === 'Escape' && this.state.open) {
      this.close();
    }
  }

  async toggle() {
    if (!this.state.user) {
      // Если пользователь не авторизован, открываем модальное окно авторизации
      const openAuth = () => {
        if (window.app?.events) {
          window.app.events.emit('user.showAuthModal', { source: 'user-menu:toggle' });
        } else {
          window.app?.services?.userUi?.showAuthModal();
        }
      };

      // user-ui-service уже загружен статически через app.js
      if (!window.app?.services?.userUi) {
        console.warn('[UserMenu] user-ui-service not available');
        return;
      }

      openAuth();
      return;
    }

    // Если пользователь авторизован, переключаем меню
    this.setState({ open: !this.state.open });
  }

  open() {
    if (this.state.user) {
      this.setState({ open: true });
    }
  }

  close() {
    this.setState({ open: false });
  }

  _getUserInitials() {
    if (!this.state.user) return '';
    
    const displayName = this.state.user.name || this.state.user.display_name || '';
    const parts = displayName.trim().split(/\s+/);
    
    if (parts.length >= 2) {
      // Первые буквы имени и фамилии
      return (parts[0][0] + parts[1][0]).toUpperCase();
    } else if (parts.length === 1 && parts[0].length > 0) {
      // Первая буква имени
      return parts[0][0].toUpperCase();
    } else {
      // Fallback на email
      const email = this.state.user.email || this.state.user.user_email || '';
      return email.length > 0 ? email[0].toUpperCase() : '?';
    }
  }

  render() {
    this.innerHTML = renderUserMenuTemplate({
      user: this.state.user,
      initials: this._getUserInitials(),
      open: this.state.open
    });
    
    this._attachEventListeners();
  }

  _attachEventListeners() {
    // Обработчики событий теперь обрабатываются через глобальный event bus (data-app-action)
    // Удаляем старую логику с user-menu:toggle-click
  }
}

customElements.define('user-menu', UserMenu);

