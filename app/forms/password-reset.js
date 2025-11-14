/**
 * Конфигурация формы восстановления пароля
 */

// Используем глобальный сервис из window.app.services вместо статического импорта
// Это позволяет избежать проблем с разрешением путей при динамической загрузке модулей

// Конфигурация формы восстановления пароля
export const passwordResetFormConfig = {
  formId: 'auth-password-reset-form',
  title: 'Восстановление пароля',
  description: 'Введите email для получения инструкций по восстановлению пароля',
  fields: [
    {
      id: 'email',
      type: 'text',
      label: 'Email',
      placeholder: 'Введите email',
      autocomplete: 'email',
      required: true,
      validation: {
        rules: ['required', 'email']
      },
      icon: {
        key: 'envelope',
        icon_position: 'left',
        color: '#888888'
      }
    }
  ],
  actions: {
    submit: {
      label: 'Отправить запрос',
      type: 'primary',
      icon: {
        key: 'arrow-right',
        icon_position: 'right',
        color: '#0055FF'
      },
      loadingLabel: 'Отправка...',
      successLabel: 'Запрос отправлен'
    }
  },
  pipeline: {
    sanitize: (payload) => {
      // payload = { controller, values }
      const { values } = payload;
      return {
        email: String(values.email || '').trim().toLowerCase()
      };
    },
    validate: async (payload) => {
      // payload = { controller, values }
      const { values } = payload;
      const errors = [];
      
      // Валидация email
      if (!values.email || values.email.trim() === '') {
        errors.push({
          fieldId: 'email',
          rule: 'required',
          message: 'Введите email',
          severity: 'error'
        });
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
        errors.push({
          fieldId: 'email',
          rule: 'email',
          message: 'Некорректный email',
          severity: 'error'
        });
      }
      
      return {
        valid: errors.length === 0,
        errors,
        fieldMessages: {},
        formMessages: errors.length > 0 ? {
          message: 'Пожалуйста, исправьте ошибки в полях формы',
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
      
      const result = await authService.requestPasswordReset(values.email);
      
      if (!result.success) {
        throw new Error(result.error || 'Ошибка запроса восстановления пароля');
      }
      
      return result;
    },
    onSuccess: (payload) => {
      // payload = { controller, values, result }
      const { result } = payload;
      // Успешный запрос обрабатывается через событие password-reset:success
      // Это событие обновит состояние модального окна (submitted = true)
      window.dispatchEvent(new CustomEvent('password-reset:success', {
        detail: { message: result?.message || 'Запрос отправлен успешно' }
      }));
    },
    onError: (payload, error) => {
      // payload = { controller, values }, error
      window.dispatchEvent(new CustomEvent('password-reset:error', {
        detail: { error: error.message || 'Ошибка запроса восстановления пароля' }
      }));
    }
  }
};
