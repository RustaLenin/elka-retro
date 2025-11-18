import { authService } from './auth-service.js';

if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('../modals/auth-modals-styles.css', import.meta.url));
}

const USER_MODAL_IDS = {
  signIn: 'auth:signIn',
  register: 'auth:register',
  passwordReset: 'auth:passwordReset',
};

function ensureModalManager() {
  if (!window.app?.modal) {
    console.warn('[user-ui-service] app.modal is not initialized');
    return false;
  }
  return true;
}

function registerAuthModals() {
  if (!ensureModalManager()) return;

  window.app.modal.register({
    id: USER_MODAL_IDS.signIn,
    title: 'Вход в аккаунт',
    size: 'medium',
    closable: true,
    footer: false,
    bodyPadding: 'compact',
    body: () => `
      <div class="auth-modal__content">
        <ui-form-controller 
          config-path="app.forms.signIn"
          mode="modal"
        ></ui-form-controller>
        <div class="auth-modal__links">
          <a href="#" data-app-action="user.showRegisterModal" class="auth-modal__link">Нет аккаунта? Зарегистрируйтесь</a>
          <a href="#" data-app-action="user.showPasswordResetModal" class="auth-modal__link">Забыли пароль?</a>
        </div>
      </div>
    `,
  });

  window.app.modal.register({
    id: USER_MODAL_IDS.register,
    title: 'Регистрация',
    size: 'medium',
    closable: true,
    footer: false,
    bodyPadding: 'compact',
    body: () => `
      <div class="register-modal__content">
        <ui-form-controller 
          config-path="app.forms.register"
          mode="modal"
        ></ui-form-controller>
        <div class="register-modal__links">
          <a href="#" data-app-action="user.showSignInModal" class="register-modal__link">Уже есть аккаунт? Войдите</a>
        </div>
      </div>
    `,
  });

  window.app.modal.register({
    id: USER_MODAL_IDS.passwordReset,
    title: 'Восстановление пароля',
    size: 'medium',
    closable: true,
    footer: false,
    bodyPadding: 'compact',
    body: () => `
      <div class="password-reset-modal__content">
        <ui-form-controller 
          config-path="app.forms.passwordReset"
          mode="modal"
        ></ui-form-controller>
      </div>
    `,
  });
}

function registerUserActions(service) {
  const events = window.app?.events;
  if (!events) {
    console.warn('[user-ui-service] app.events is not initialized');
    return;
  }
  events.unregister('user');
  events.register('user', {
    showSignInModal: () => service.showSignInModal(),
    showRegisterModal: () => service.showRegisterModal(),
    showPasswordResetModal: () => service.showPasswordResetModal(),
    toggleMenu: () => {
      // Находим компонент user-menu и вызываем его метод toggle
      const userMenu = document.querySelector('user-menu');
      if (userMenu && typeof userMenu.toggle === 'function') {
        userMenu.toggle();
      }
    },
    openProfile: ({ payload } = {}) => {
      // Закрываем меню перед переходом
      const userMenu = document.querySelector('user-menu');
      if (userMenu && typeof userMenu.close === 'function') {
        userMenu.close();
      }
      
      const url = payload?.url || '/profile/';
      if (payload?.newTab) {
        window.open(url, '_blank');
        return;
      }
      if (payload?.replace) {
        window.location.replace(url);
        return;
      }
      window.location.href = url;
    },
    openOrders: ({ payload } = {}) => {
      // Закрываем меню перед переходом
      const userMenu = document.querySelector('user-menu');
      if (userMenu && typeof userMenu.close === 'function') {
        userMenu.close();
      }
      
      const url = payload?.url || '/profile/#orders';
      if (payload?.newTab) {
        window.open(url, '_blank');
        return;
      }
      if (payload?.replace) {
        window.location.replace(url);
        return;
      }
      window.location.href = url;
    },
    logout: async () => {
      // Закрываем меню перед выходом
      const userMenu = document.querySelector('user-menu');
      if (userMenu && typeof userMenu.close === 'function') {
        userMenu.close();
      }
      
      try {
        await authService.logout();
      } catch (error) {
        console.error('[user-ui-service] Logout failed:', error);
      }
    },
  });
}

export const userUiService = {
  init() {
    if (!ensureModalManager()) return;
    registerAuthModals();
    window.app.services = window.app.services || {};
    window.app.services.userUi = this;
    registerUserActions(this);

    window.addEventListener('password-reset:success', () => {
      window.app.modal.updateBody(
        USER_MODAL_IDS.passwordReset,
        `
        <div class="password-reset-modal__content password-reset-modal__content--success">
          <div class="password-reset-modal__success">
            <ui-icon name="check" size="large"></ui-icon>
            <h3>Запрос отправлен</h3>
            <p>Если указанный email существует в нашей системе, на него будет отправлено письмо с инструкциями по восстановлению пароля.</p>
            <p class="password-reset-modal__hint">Проверьте папку "Спам", если письмо не пришло в течение нескольких минут.</p>
          </div>
        </div>
        `
      );
    });

    window.addEventListener('password-reset:error', () => {
      // Ошибки отображаются через ui-form-controller, не меняем тело
    });
  },

  showSignInModal() {
    if (!ensureModalManager()) return;
    window.app.modal.open(USER_MODAL_IDS.signIn);
  },

  showRegisterModal() {
    if (!ensureModalManager()) return;
    window.app.modal.open(USER_MODAL_IDS.register);
  },

  showPasswordResetModal() {
    if (!ensureModalManager()) return;
    window.app.modal.open(USER_MODAL_IDS.passwordReset);
  },
};

userUiService.init();


