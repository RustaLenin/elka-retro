/**
 * Authentication Service
 * 
 * Сервис для работы с авторизацией пользователей через WordPress REST API
 */

class AuthService {
  constructor() {
    this.currentUser = null;
    this.checkAuthPromise = null;
  }

  /**
   * Получить WordPress nonce для REST API
   */
  getNonce() {
    if (window.wpApiSettings && window.wpApiSettings.nonce) {
      return window.wpApiSettings.nonce;
    }
    return null;
  }

  /**
   * Выполнить авторизацию через стандартный WordPress login
   * WordPress требует использования cookies для авторизации
   */
  async login(username, password, rememberMe = false) {
    try {
      // WordPress не имеет REST API endpoint для логина
      // Используем стандартный wp_login через AJAX или форму
      // Для этого создадим кастомный endpoint или используем существующий
      
      const nonce = this.getNonce();
      const headers = {
        'Content-Type': 'application/json',
      };
      if (nonce) {
        headers['X-WP-Nonce'] = nonce;
      }

      const response = await fetch('/wp-json/elkaretro/v1/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers,
        body: JSON.stringify({
          username,
          password,
          remember: rememberMe,
        }),
      });

      const data = await response.json().catch(() => null);
      if (response.ok && data?.success) {
        const user = data.user || (await this.getCurrentUser().catch(() => null));
        if (user && !user.error) {
          this.currentUser = user;
          this.dispatchAuthEvent('login', { user });
          return { success: true, user };
        }
      }

      const errorMessage = data?.message || 'Неверный логин или пароль';
      this.dispatchAuthEvent('error', { error: errorMessage });
      return { success: false, error: errorMessage };

    } catch (error) {
      console.error('[AuthService] Login error:', error);
      this.dispatchAuthEvent('error', { error: error.message });
      return { success: false, error: error.message || 'Ошибка авторизации' };
    }
  }

  /**
   * Выход из системы
   */
  async logout() {
    try {
      const nonce = this.getNonce();
      const headers = {
        'Content-Type': 'application/json',
      };
      if (nonce) {
        headers['X-WP-Nonce'] = nonce;
      }

      const response = await fetch('/wp-json/elkaretro/v1/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers,
      });

      const data = await response.json().catch(() => null);
      
      if (response.ok && data?.success) {
        this.currentUser = null;
        this.dispatchAuthEvent('logout', {});
        
        // Редирект на главную страницу
        window.location.href = '/';
        
        return { success: true };
      }

      const errorMessage = data?.message || 'Не удалось выйти из системы';
      this.dispatchAuthEvent('error', { error: errorMessage });
      return { success: false, error: errorMessage };

    } catch (error) {
      console.error('[AuthService] Logout error:', error);
      this.dispatchAuthEvent('error', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Проверить статус авторизации
   * Сначала проверяет данные из PHP (window.app.auth), только если их нет - делает запрос к API
   */
  async checkAuth() {
    // Сначала проверяем данные из PHP (window.app.auth) - они всегда доступны при загрузке страницы
    if (window.app?.auth !== undefined) {
      if (window.app.auth.user && window.app.auth.authenticated) {
        this.currentUser = window.app.auth.user;
        return { authenticated: true, user: window.app.auth.user };
      } else {
        // PHP вернул null - пользователь не авторизован
        this.currentUser = null;
        return { authenticated: false, user: null };
      }
    }

    // Если window.app.auth не инициализирован (очень редкий случай), делаем запрос
    // Но обычно этого не должно происходить, так как PHP всегда инициализирует window.app.auth
    if (this.checkAuthPromise) {
      return this.checkAuthPromise;
    }

    this.checkAuthPromise = this._checkAuthInternal()
      .finally(() => {
        this.checkAuthPromise = null;
      });

    return this.checkAuthPromise;
  }

  async _checkAuthInternal() {
    try {
      const user = await this.getCurrentUser();
      
      if (user && !user.error) {
        this.currentUser = user;
        return { authenticated: true, user };
      } else {
        // Если получили ошибку, логируем её для отладки
        if (user?.error) {
          if (user.error !== 'not_authenticated') {
            console.warn('[AuthService] Auth check error:', user.error, user.details || '');
          }
        }
        this.currentUser = null;
        return { authenticated: false, user: null };
      }
    } catch (error) {
      console.error('[AuthService] Check auth error:', error);
      this.currentUser = null;
      return { authenticated: false, user: null, error: error.message };
    }
  }

  /**
   * Получить текущего пользователя через REST API
   */
  async getCurrentUser() {
    // Отладочное логирование для поиска источника вызова
    const stackTrace = new Error().stack;
    console.warn('[AuthService] getCurrentUser() called from:', stackTrace);
    
    try {
      const nonce = this.getNonce();
      const headers = {};

      if (nonce) {
        headers['X-WP-Nonce'] = nonce;
      }

      const response = await fetch('/wp-json/wp/v2/users/me', {
        method: 'GET',
        credentials: 'same-origin',
        headers
      });

      if (response.ok) {
        const user = await response.json();
        return user;
      } else if (response.status === 401 || response.status === 403) {
        // Не авторизован или нет прав доступа - это нормальное поведение, не логируем ошибку
        return { error: 'not_authenticated' };
      } else if (response.status === 500) {
        // Ошибка сервера - возможно, пользователь не авторизован
        // WordPress иногда возвращает 500 вместо 401 для неавторизованных пользователей
        try {
          const errorData = await response.json();
          // Если это ошибка авторизации, обрабатываем как 401
          if (errorData?.code === 'rest_not_logged_in' || errorData?.code === 'rest_cannot_view') {
            return { error: 'not_authenticated' };
          }
          console.error('[AuthService] Server error 500:', errorData);
          return { error: 'server_error', details: errorData };
        } catch (parseError) {
          // Не удалось распарсить JSON - вероятно, проблема на сервере
          // Для неавторизованных пользователей обычно возвращается ошибка авторизации
          // Если не можем определить, считаем что пользователь не авторизован (не логируем)
          return { error: 'not_authenticated' };
        }
      } else {
        const errorText = await response.text().catch(() => '');
        // Для других ошибок тоже может быть проблема авторизации
        if (response.status === 404) {
          return { error: 'not_authenticated' };
        }
        console.error('[AuthService] Get current user error:', response.status, errorText);
        return { error: `http_${response.status}` };
      }
    } catch (error) {
      console.error('[AuthService] Get current user error:', error);
      return { error: error.message };
    }
  }

  /**
   * Регистрация нового пользователя
   */
  async register(email, username, password, phone) {
    try {
      const nonce = this.getNonce();
      const headers = {
        'Content-Type': 'application/json',
      };

      if (nonce) {
        headers['X-WP-Nonce'] = nonce;
      }

      const userData = {
        email,
        username,
        password,
        // Добавляем телефон в мета-поля, если они поддерживаются
        meta: {
          phone: phone
        }
      };

      const response = await fetch('/wp-json/wp/v2/users', {
        method: 'POST',
        credentials: 'same-origin',
        headers,
        body: JSON.stringify(userData)
      });

      if (response.ok) {
        const user = await response.json();
        
          // После регистрации автоматически авторизуем
          const loginResult = await this.login(username, password, false);
          
          if (loginResult.success) {
            this.dispatchAuthEvent('register', { user: loginResult.user || user });
            return { success: true, user: loginResult.user || user };
          } else {
            // Если авторизация не удалась, возвращаем успех регистрации
            // пользователь может войти вручную
            this.dispatchAuthEvent('register', { user });
            return { success: true, user, needsLogin: true };
          }
      } else {
        const error = await response.json();
        const errorMessage = this.extractErrorMessage(error);
        this.dispatchAuthEvent('error', { error: errorMessage });
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      console.error('[AuthService] Register error:', error);
      const errorMessage = error.message || 'Ошибка регистрации';
      this.dispatchAuthEvent('error', { error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Извлечь сообщение об ошибке из ответа WordPress
   */
  extractErrorMessage(error) {
    if (error.message) {
      return error.message;
    }
    if (error.code) {
      const errorMessages = {
        'existing_user_email': 'Email уже используется',
        'existing_user_login': 'Логин уже используется',
        'invalid_email': 'Некорректный email',
        'invalid_username': 'Некорректный логин',
        'weak_password': 'Слабый пароль',
      };
      return errorMessages[error.code] || error.message || 'Ошибка регистрации';
    }
    return 'Ошибка регистрации';
  }

  /**
   * Запрос на восстановление пароля
   */
  async requestPasswordReset(email) {
    try {
      // Используем стандартный WordPress механизм восстановления пароля
      const formData = new FormData();
      formData.append('user_login', email);
      formData.append('wp-submit', 'Получить новый пароль');

      const response = await fetch('/wp-login.php?action=lostpassword', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin'
      });

      // WordPress всегда возвращает успех (из соображений безопасности)
      // даже если email не найден
      return { success: true, message: 'Если указанный email существует, на него будет отправлено письмо с инструкциями' };
    } catch (error) {
      console.error('[AuthService] Password reset error:', error);
      return { success: false, error: error.message || 'Ошибка запроса восстановления пароля' };
    }
  }

  /**
   * Отправить событие авторизации
   */
  dispatchAuthEvent(type, detail) {
    const event = new CustomEvent(`elkaretro:auth:${type}`, {
      detail: { ...detail, service: this }
    });
    window.dispatchEvent(event);
  }

  /**
   * Получить текущего пользователя из кеша
   */
  getCachedUser() {
    return this.currentUser;
  }

  /**
   * Проверить, авторизован ли пользователь (синхронно, из кеша)
   */
  isAuthenticated() {
    return this.currentUser !== null && !this.currentUser.error;
  }
}

// Создаём единственный экземпляр сервиса
export const authService = new AuthService();

// Экспортируем класс для возможного расширения
export default AuthService;

