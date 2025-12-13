import { authService } from './auth-service.js';

if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('../modals/auth-modals-styles.css', import.meta.url));
}

const USER_MODAL_IDS = {
  code: 'auth:code',
  signIn: 'auth:signIn', // Старое, будет удалено
  register: 'auth:register', // Старое, будет удалено
  passwordReset: 'auth:passwordReset', // Старое, будет удалено
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

  // Новое единое модальное окно авторизации/регистрации через код
  window.app.modal.register({
    id: USER_MODAL_IDS.code,
    title: 'Вход / Регистрация',
    size: 'medium',
    closable: true,
    footer: false,
    bodyPadding: 'compact',
    body: () => `
      <div class="auth-modal__content">
        <ui-form-controller 
          config-path="app.forms.authCode"
          mode="modal"
        ></ui-form-controller>
      </div>
    `,
  });

  // Старые модальные окна удалены - используем новое единое модальное окно auth:code
  // Оставлены только для обратной совместимости (перенаправляют на новое окно)
}

function registerUserActions(service) {
  const events = window.app?.events;
  if (!events) {
    console.warn('[user-ui-service] app.events is not initialized');
    return;
  }
  events.unregister('user');
  events.register('user', {
    showAuthModal: () => service.showAuthModal(),
    // Старые действия для обратной совместимости - перенаправляют на новое модальное окно
    showSignInModal: () => service.showAuthModal(), // Deprecated: используйте showAuthModal
    showRegisterModal: () => service.showAuthModal(), // Deprecated: используйте showAuthModal
    showPasswordResetModal: () => {
      // Восстановление пароля не поддерживается в новой системе
      console.warn('[user-ui-service] Password reset is not supported in the new auth system');
      service.showAuthModal(); // Перенаправляем на авторизацию
    },
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
    openContactForm: ({ payload } = {}) => {
      // Переходим на страницу профиля с вкладкой обратной связи
      const url = '/profile/#contact';
      
      // Сохраняем данные для предзаполнения формы
      if (payload?.subject) {
        sessionStorage.setItem('contact-form-preset', JSON.stringify({
          subject: payload.subject,
          orderId: payload.orderId,
          orderNumber: payload.orderNumber
        }));
      }
      
      window.location.href = url;
    }
  });
}

const userUiService = {
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

  showAuthModal() {
    if (!ensureModalManager()) return;
    window.app.modal.open(USER_MODAL_IDS.code);
  },

  // Старые методы для обратной совместимости - перенаправляют на новое модальное окно
  showSignInModal() {
    console.warn('[user-ui-service] showSignInModal is deprecated, use showAuthModal instead');
    this.showAuthModal();
  },

  showRegisterModal() {
    console.warn('[user-ui-service] showRegisterModal is deprecated, use showAuthModal instead');
    this.showAuthModal();
  },

  showPasswordResetModal() {
    console.warn('[user-ui-service] showPasswordResetModal is deprecated, password reset is not supported in the new auth system');
    this.showAuthModal();
  },
};

// Экспортируем для явной инициализации в app.js
export { userUiService };


