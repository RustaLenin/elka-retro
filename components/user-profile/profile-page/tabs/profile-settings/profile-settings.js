import { BaseElement } from '../../../../base-element.js';
import { userService } from '../../../services/user-service.js';
import { renderProfileSettingsTemplate } from './profile-settings-template.js';

if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./profile-settings-styles.css', import.meta.url));
}

export class ProfileSettingsTab extends BaseElement {
  static stateSchema = {
    userId: {
      type: 'number',
      default: null,
      attribute: { name: 'user-id', observed: true, reflect: true }
    },
    loading: {
      type: 'boolean',
      default: true,
      attribute: null,
      internal: true
    },
    saving: {
      type: 'boolean',
      default: false,
      attribute: null,
      internal: true
    },
    error: {
      type: 'string',
      default: null,
      attribute: null,
      internal: true
    },
    success: {
      type: 'boolean',
      default: false,
      attribute: null,
      internal: true
    },
    profile: {
      type: 'json',
      default: null,
      attribute: null,
      internal: true
    }
  };

  constructor() {
    super();
    this._profileFormController = null;
    this._onProfileSuccess = this._onProfileSuccess.bind(this);
    this._onProfileError = this._onProfileError.bind(this);
    this._onPasswordSuccess = this._onPasswordSuccess.bind(this);
    this._onPasswordError = this._onPasswordError.bind(this);
  }

  async connectedCallback() {
    super.connectedCallback();
    
    // Forms уже загружены статически через app.js
    
    this.loadProfile();
  }

  disconnectedCallback() {
    // Отписываемся от событий
    window.removeEventListener('profile:updated', this._onProfileSuccess);
    window.removeEventListener('profile:update-error', this._onProfileError);
    window.removeEventListener('profile:password-changed', this._onPasswordSuccess);
    window.removeEventListener('profile:password-change-error', this._onPasswordError);
  }

  async loadProfile() {
    this.setState({ loading: true, error: null });
    
    try {
      const result = await userService.getProfile(this.state.userId);
      
      if (result.success && result.user) {
        this.setState({ 
          profile: result.user,
          loading: false 
        });
        this.render();
        this._initForms();
      } else {
        this.setState({ 
          error: result.error || 'Ошибка загрузки профиля',
          loading: false 
        });
        this.render();
      }
    } catch (error) {
      console.error('[ProfileSettingsTab] Load profile error:', error);
      this.setState({ 
        error: 'Ошибка загрузки профиля',
        loading: false 
      });
      this.render();
    }
  }

  onStateChanged(key) {
    if (key === 'userId' && this.state.userId) {
      this.loadProfile();
    }
  }

  _initForms() {
    // Форма профиля - заполняем значения полей данными из профиля
    this._profileFormController = this.querySelector('#profile-form-controller');
    if (this._profileFormController && this.state.profile) {
      // Подписываемся на события из конфигурации формы
      window.addEventListener('profile:updated', this._onProfileSuccess);
      window.addEventListener('profile:update-error', this._onProfileError);
      // Заполняем поля формы значениями из профиля через публичный API
      this._updateProfileFormFields();
    }

    // Форма смены пароля - уже инициализирована через config-path, только подписываемся на события
    const passwordFormController = this.querySelector('#password-form-controller');
    if (passwordFormController) {
      window.addEventListener('profile:password-changed', this._onPasswordSuccess);
      window.addEventListener('profile:password-change-error', this._onPasswordError);
    }
  }

  /**
   * Обновить поля формы профиля с данными из загруженного профиля
   * Используем публичный API формы для установки значений
   */
  _updateProfileFormFields() {
    if (!this._profileFormController || !this.state.profile) return;

    const profile = this.state.profile;
    
    // Устанавливаем значения полей через публичный API формы
    if (typeof this._profileFormController.setFieldValue === 'function') {
      this._profileFormController.setFieldValue('first_name', profile.first_name || '');
      this._profileFormController.setFieldValue('last_name', profile.last_name || '');
      this._profileFormController.setFieldValue('display_name', profile.display_name || profile.name || '');
      this._profileFormController.setFieldValue('email', profile.email || profile.user_email || '');
      this._profileFormController.setFieldValue('phone', profile.phone || '');
      this._profileFormController.setFieldValue('delivery_address', profile.delivery_address || '');
      this._profileFormController.setFieldValue('messenger_link', profile.messenger_link || '');
    }
  }

  _onProfileSuccess(e) {
    // Обновляем локальный профиль из события
    if (e.detail?.profile) {
      this.setState({ 
        profile: { ...this.state.profile, ...e.detail.profile },
        success: true 
      });
    } else {
      this.setState({ success: true });
    }
    
    setTimeout(() => {
      this.setState({ success: false });
    }, 3000);
  }

  _onProfileError(e) {
    this.setState({ error: e.detail?.error || 'Ошибка обновления профиля' });
  }

  _onPasswordSuccess(e) {
    // Пароль успешно изменён - событие обрабатывается в конфигурации формы
  }

  _onPasswordError(e) {
    // Ошибка смены пароля уже отображается в форме
  }

  render() {
    if (this.state.loading) {
      this.innerHTML = `
        <div class="profile-settings-tab profile-settings-tab--loading">
          <block-loader label="Загрузка профиля..."></block-loader>
        </div>
      `;
      return;
    }

    if (this.state.error && !this.state.profile) {
      this.innerHTML = `
        <div class="profile-settings-tab profile-settings-tab--error">
          <div class="profile-settings-tab__error">
            <p>${this.state.error}</p>
            <button class="profile-settings-tab__retry" onclick="this.closest('profile-settings-tab').loadProfile()">
              Повторить попытку
            </button>
          </div>
        </div>
      `;
      return;
    }

    this.innerHTML = renderProfileSettingsTemplate({
      profile: this.state.profile,
      error: this.state.error,
      success: this.state.success
    });

    // Инициализируем формы после рендера
    requestAnimationFrame(() => {
      this._initForms();
    });
  }
}

customElements.define('profile-settings-tab', ProfileSettingsTab);
