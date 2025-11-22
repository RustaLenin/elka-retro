/**
 * Конфигурация формы регистрации
 */

// Используем глобальный сервис из window.app.services вместо статического импорта
// Это позволяет избежать проблем с разрешением путей при динамической загрузке модулей

// Конфигурация формы регистрации
export const registerFormConfig = {
  formId: 'auth-register-form',
  title: 'Регистрация',
  description: 'Создайте аккаунт для доступа к личному кабинету',
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
    },
    {
      id: 'username',
      type: 'text',
      label: 'Логин',
      placeholder: 'Введите логин',
      autocomplete: 'username',
      required: true,
      validation: {
        rules: ['required', 'minLength:3']
      },
      icon: {
        key: 'user',
        icon_position: 'left',
        color: '#888888'
      }
    },
    {
      id: 'phone',
      type: 'text',
      label: 'Телефон',
      placeholder: 'Введите номер телефона',
      autocomplete: 'tel',
      required: true,
      validation: {
        rules: ['required', 'phone']
      },
      icon: {
        key: 'phone',
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
      id: 'password_confirm',
      type: 'text',
      label: 'Подтверждение пароля',
      placeholder: 'Повторите пароль',
      mask: 'password',
      autocomplete: 'new-password',
      required: true,
      validation: {
        rules: ['required', 'passwordsMatch:password']
      },
      icon: {
        key: 'lock',
        icon_position: 'left',
        color: '#888888'
      }
    },
    {
      id: 'privacy_consent',
      type: 'checkbox',
      label: 'Я согласен на обработку <a href="#" data-app-action="legal.openPrivacyConsent" class="register-form__legal-link">персональных данных</a>',
      required: true,
      validation: {
        rules: ['required']
      }
    },
    {
      id: 'offer_consent',
      type: 'checkbox',
      label: 'Я согласен с условиями <a href="#" data-app-action="legal.openPublicOffer" class="register-form__legal-link">публичной оферты</a>',
      required: true,
      validation: {
        rules: ['required']
      }
    }
  ],
  actions: {
    submit: {
      label: 'Зарегистрироваться',
      type: 'primary',
      icon: {
        key: 'arrow-right',
        icon_position: 'right',
        color: '#0055FF'
      },
      loadingLabel: 'Регистрация...',
      successLabel: 'Регистрация выполнена'
    }
  },
  pipeline: {
    sanitize: (payload) => {
      // payload = { controller, values }
      const { values } = payload;
      return {
        email: String(values.email || '').trim().toLowerCase(),
        username: String(values.username || '').trim(),
        phone: String(values.phone || '').trim(),
        password: String(values.password || ''),
        password_confirm: String(values.password_confirm || '')
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
      
      // Валидация логина
      if (!values.username || values.username.trim() === '') {
        errors.push({
          fieldId: 'username',
          rule: 'required',
          message: 'Введите логин',
          severity: 'error'
        });
      } else if (values.username.trim().length < 3) {
        errors.push({
          fieldId: 'username',
          rule: 'minLength',
          message: 'Логин должен содержать минимум 3 символа',
          severity: 'error'
        });
      }
      
      // Валидация телефона
      if (!values.phone || values.phone.trim() === '') {
        errors.push({
          fieldId: 'phone',
          rule: 'required',
          message: 'Введите номер телефона',
          severity: 'error'
        });
      }
      
      // Валидация пароля
      if (!values.password || values.password === '') {
        errors.push({
          fieldId: 'password',
          rule: 'required',
          message: 'Введите пароль',
          severity: 'error'
        });
      } else {
        // Проверка сложности пароля (минимум 16 символов, маленькие, большие буквы, цифры, спецсимволы)
        const password = values.password;
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
            fieldId: 'password',
            rule: 'passwordStrength',
            message: `Пароль должен содержать: ${passwordErrors.join(', ')}`,
            severity: 'error'
          });
        }
      }
      
      // Валидация подтверждения пароля
      if (!values.password_confirm || values.password_confirm === '') {
        errors.push({
          fieldId: 'password_confirm',
          rule: 'required',
          message: 'Подтвердите пароль',
          severity: 'error'
        });
      } else if (values.password !== values.password_confirm) {
        errors.push({
          fieldId: 'password_confirm',
          rule: 'passwordsMatch',
          message: 'Пароли не совпадают',
          severity: 'error'
        });
      }
      
      // Валидация согласия на обработку персональных данных
      if (!values.privacy_consent || values.privacy_consent !== true) {
        errors.push({
          fieldId: 'privacy_consent',
          rule: 'required',
          message: 'Необходимо согласие на обработку персональных данных',
          severity: 'error'
        });
      }
      
      // Валидация согласия с публичной офертой
      if (!values.offer_consent || values.offer_consent !== true) {
        errors.push({
          fieldId: 'offer_consent',
          rule: 'required',
          message: 'Необходимо согласие с условиями публичной оферты',
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
      
      const result = await authService.register(
        values.email,
        values.username,
        values.password,
        values.phone,
        values.privacy_consent,
        values.offer_consent,
        values.first_name,
        values.last_name
      );
      
      if (!result.success) {
        throw new Error(result.error || 'Ошибка регистрации');
      }
      
      return result;
    },
    onSuccess: (payload) => {
      // payload = { controller, values, result }
      const { result } = payload;
      // Успешная регистрация обрабатывается через событие elkaretro:auth:register
      window.dispatchEvent(new CustomEvent('elkaretro:auth:register', {
        detail: { user: result?.user }
      }));
    },
    onError: (payload, error) => {
      // payload = { controller, values }, error
      window.dispatchEvent(new CustomEvent('elkaretro:auth:error', {
        detail: { error: error.message || 'Ошибка регистрации' }
      }));
    }
  }
};
