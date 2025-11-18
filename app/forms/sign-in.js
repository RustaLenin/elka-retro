/**
 * Конфигурация формы авторизации
 */

// Используем глобальный сервис из window.app.services вместо статического импорта
// Это позволяет избежать проблем с разрешением путей при динамической загрузке модулей

// Конфигурация формы авторизации
export const signInFormConfig = {
  formId: 'auth-login-form',
  title: 'Вход',
  description: 'Введите данные для входа в аккаунт',
  fields: [
    {
      id: 'username',
      type: 'text',
      label: 'Логин или Email',
      placeholder: 'Введите логин или email',
      autocomplete: 'username',
      required: true,
      validation: [
        { rule: 'required', value: true, message: 'Введите логин или email', severity: 'error' }
      ],
      icon: {
        key: 'user',
        icon_position: 'left',
        color: '#888888'
      }
    },
    {
      id: 'password',
      type: 'text',
      label: 'Пароль',
      placeholder: 'Введите пароль',
      mask: 'password',
      autocomplete: 'current-password',
      required: true,
      validation: [
        { rule: 'required', value: true, message: 'Введите пароль', severity: 'error' }
      ],
      icon: {
        key: 'lock',
        icon_position: 'left',
        color: '#888888'
      }
    },
    {
      id: 'remember_me',
      type: 'checkbox',
      label: 'Запомнить меня',
      defaultValue: false
    }
  ],
  actions: {
    submit: {
      label: 'Войти',
      type: 'primary',
      icon: {
        key: 'arrow-right',
        icon_position: 'right',
        color: '#0055FF'
      },
      loadingLabel: 'Вход...',
      successLabel: 'Вход выполнен'
    }
  },
  pipeline: {
    sanitize: (payload) => {
      // payload = { controller, values }
      const { values } = payload;
      return {
        username: String(values.username || '').trim(),
        password: String(values.password || ''),
        remember_me: Boolean(values.remember_me)
      };
    },
    validate: async (payload) => {
      // payload = { controller, values }
      const { values } = payload;
      const errors = [];
      
      if (!values.username || values.username.trim() === '') {
        errors.push({
          fieldId: 'username',
          rule: 'required',
          message: 'Введите логин или email',
          severity: 'error'
        });
      }
      
      if (!values.password || values.password === '') {
        errors.push({
          fieldId: 'password',
          rule: 'required',
          message: 'Введите пароль',
          severity: 'error'
        });
      }
      
      return {
        valid: errors.length === 0,
        errors,
        fieldMessages: {},
        formMessages: errors.length > 0 ? {
          message: 'Пожалуйста, заполните все обязательные поля',
          details: errors.map(e => e.message)
        } : null
      };
    },
    submit: async (payload) => {
      // payload = { controller, values }
      const { values } = payload;
      const authService = window.app?.services?.authService;
      
      if (!authService) {
        throw new Error('Auth service not loaded yet. Please wait a moment and try again.');
      }
      
      const result = await authService.login(
        values.username,
        values.password,
        values.remember_me
      );
      
      if (!result.success) {
        throw new Error(result.error || 'Ошибка авторизации');
      }
      
      return result;
    },
    onSuccess: ({ result }) => {
      window.dispatchEvent(new CustomEvent('elkaretro:auth:login', {
        detail: { user: result?.user }
      }));
      window.app?.modal?.close?.('auth:signIn');
      window.app?.ui?.showNotification?.('Вы успешно вошли в аккаунт', 'success');
    },
    onError: ({ error }) => {
      const message = error?.message || error?.error || (typeof error === 'string' ? error : 'Ошибка авторизации');
      window.dispatchEvent(new CustomEvent('elkaretro:auth:error', {
        detail: { error: message }
      }));
      window.app?.ui?.showNotification?.(message, 'error');
    }
  }
};

