/**
 * Конфигурация формы смены пароля
 */

// Используем глобальный сервис из window.app.services вместо статического импорта
// Это позволяет избежать проблем с разрешением путей при динамической загрузке модулей

// Конфигурация формы смены пароля
export const profileChangePasswordFormConfig = {
  formId: 'profile-change-password-form',
  title: 'Смена пароля',
  description: 'Измените ваш пароль. Используйте минимум 16 символов, включая заглавные и строчные буквы, цифры и спецсимволы.',
  fields: [
    {
      id: 'old_password',
      type: 'text',
      label: 'Текущий пароль',
      placeholder: 'Введите текущий пароль',
      mask: 'password',
      autocomplete: 'current-password',
      required: true,
      validation: {
        rules: ['required']
      },
      icon: {
        key: 'lock',
        icon_position: 'left',
        color: '#888888'
      }
    },
    {
      id: 'new_password',
      type: 'text',
      label: 'Новый пароль',
      placeholder: 'Введите новый пароль',
      mask: 'password',
      autocomplete: 'new-password',
      required: true,
      validation: {
        rules: ['required', 'passwordStrength']
      },
      icon: {
        key: 'lock',
        icon_position: 'left',
        color: '#888888'
      }
    },
    {
      id: 'new_password_confirm',
      type: 'text',
      label: 'Подтверждение нового пароля',
      placeholder: 'Повторите новый пароль',
      mask: 'password',
      autocomplete: 'new-password',
      required: true,
      validation: {
        rules: ['required', 'passwordsMatch:new_password']
      },
      icon: {
        key: 'lock',
        icon_position: 'left',
        color: '#888888'
      }
    }
  ],
  actions: {
    submit: {
      label: 'Изменить пароль',
      type: 'primary',
      icon: {
        key: 'check',
        icon_position: 'right',
        color: '#0055FF'
      },
      loadingLabel: 'Изменение пароля...',
      successLabel: 'Пароль изменён'
    }
  },
  pipeline: {
    sanitize: (payload) => {
      // payload = { controller, values }
      const { values } = payload;
      return {
        old_password: String(values.old_password || ''),
        new_password: String(values.new_password || ''),
        new_password_confirm: String(values.new_password_confirm || '')
      };
    },
    validate: async (payload) => {
      // payload = { controller, values }
      const { values } = payload;
      const errors = [];
      
      // Валидация текущего пароля
      if (!values.old_password || values.old_password === '') {
        errors.push({
          fieldId: 'old_password',
          rule: 'required',
          message: 'Введите текущий пароль',
          severity: 'error'
        });
      }
      
      // Валидация нового пароля
      if (!values.new_password || values.new_password === '') {
        errors.push({
          fieldId: 'new_password',
          rule: 'required',
          message: 'Введите новый пароль',
          severity: 'error'
        });
      } else {
        // Проверка сложности пароля (минимум 16 символов, маленькие, большие буквы, цифры, спецсимволы)
        const password = values.new_password;
        const passwordErrors = [];
        
        if (password.length < 16) {
          passwordErrors.push('Минимум 16 символов');
        }
        if (!/[a-zа-я]/.test(password)) {
          passwordErrors.push('Маленькие буквы (a-z, а-я)');
        }
        if (!/[A-ZА-Я]/.test(password)) {
          passwordErrors.push('Большие буквы (A-Z, А-Я)');
        }
        if (!/\d/.test(password)) {
          passwordErrors.push('Цифры (0-9)');
        }
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
          passwordErrors.push('Спецсимволы (!@#$%^&*...)');
        }
        
        if (passwordErrors.length > 0) {
          errors.push({
            fieldId: 'new_password',
            rule: 'passwordStrength',
            message: `Пароль должен содержать: ${passwordErrors.join(', ')}`,
            severity: 'error'
          });
        }
      }
      
      // Валидация подтверждения пароля
      if (!values.new_password_confirm || values.new_password_confirm === '') {
        errors.push({
          fieldId: 'new_password_confirm',
          rule: 'required',
          message: 'Подтвердите новый пароль',
          severity: 'error'
        });
      } else if (values.new_password !== values.new_password_confirm) {
        errors.push({
          fieldId: 'new_password_confirm',
          rule: 'passwordsMatch',
          message: 'Пароли не совпадают',
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
      const userService = window.app?.services?.userService;
      
      if (!userService) {
        throw new Error('User service not loaded yet. Please wait a moment and try again.');
      }
      
      const result = await userService.changePassword(
        values.old_password,
        values.new_password
      );
      
      if (!result.success) {
        throw new Error(result.error || 'Ошибка смены пароля');
      }
      
      return result;
    },
    onSuccess: (payload) => {
      // payload = { controller, values, result }
      const { result } = payload;
      // Успешная смена пароля обрабатывается через событие profile:password-changed
      window.dispatchEvent(new CustomEvent('profile:password-changed', {
        detail: { message: result?.message || 'Пароль успешно изменён' }
      }));
      
      // Очищаем форму после успешной смены пароля
      const formController = payload.controller;
      if (formController && typeof formController.reset === 'function') {
        formController.reset();
      }
    },
    onError: (payload, error) => {
      // payload = { controller, values }, error
      window.dispatchEvent(new CustomEvent('profile:password-change-error', {
        detail: { error: error.message || 'Ошибка смены пароля' }
      }));
    }
  }
};
