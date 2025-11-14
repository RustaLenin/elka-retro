/**
 * Конфигурация формы личных данных для оформления заказа
 */

import { authService } from '../../components/user-profile/services/auth-service.js';

// Конфигурация формы личных данных для оформления заказа
export const orderPersonalFormConfig = {
  formId: 'order-personal-form',
  title: 'Личные данные',
  description: 'Заполните данные для оформления заказа',
  fields: [
    {
      id: 'email',
      type: 'text',
      label: 'Email',
      placeholder: 'Введите email',
      autocomplete: 'email',
      required: true,
      validation: [
        { rule: 'required', value: true, message: 'Email обязателен для заполнения', severity: 'error' },
        { rule: 'email', value: true, message: 'Введите корректный email', severity: 'error' }
      ],
      icon: {
        key: 'mail',
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
      validation: [
        { rule: 'required', value: true, message: 'Логин обязателен для заполнения', severity: 'error' },
        { rule: 'minLength', value: 3, message: 'Логин должен содержать минимум 3 символа', severity: 'error' }
      ],
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
      placeholder: '+7 (999) 123-45-67',
      autocomplete: 'tel',
      required: true,
      validation: [
        { rule: 'required', value: true, message: 'Телефон обязателен для заполнения', severity: 'error' },
        { rule: 'pattern', value: '^[\\+]?[0-9\\s\\-\\(\\)]{10,}$', message: 'Введите корректный номер телефона', severity: 'error' }
      ],
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
      placeholder: 'Введите пароль (минимум 16 символов)',
      mask: 'password',
      autocomplete: 'new-password',
      required: true,
      validation: [
        { rule: 'required', value: true, message: 'Пароль обязателен для заполнения', severity: 'error' },
        { rule: 'minLength', value: 16, message: 'Пароль должен содержать минимум 16 символов', severity: 'error' },
        { rule: 'passwordStrength', value: true, message: 'Пароль должен содержать большие и маленькие буквы, цифры и спецсимволы', severity: 'error' }
      ],
      icon: {
        key: 'lock',
        icon_position: 'left',
        color: '#888888'
      }
    },
    {
      id: 'confirm_password',
      type: 'text',
      label: 'Подтверждение пароля',
      placeholder: 'Повторите пароль',
      mask: 'password',
      autocomplete: 'new-password',
      required: true,
      validation: [
        { rule: 'required', value: true, message: 'Подтверждение пароля обязательно', severity: 'error' },
        { rule: 'passwordsMatch', value: 'password', message: 'Пароли не совпадают', severity: 'error' }
      ],
      icon: {
        key: 'lock',
        icon_position: 'left',
        color: '#888888'
      }
    },
    {
      id: 'first_name',
      type: 'text',
      label: 'Имя',
      placeholder: 'Введите имя',
      autocomplete: 'given-name',
      required: false,
      icon: {
        key: 'user',
        icon_position: 'left',
        color: '#888888'
      }
    },
    {
      id: 'last_name',
      type: 'text',
      label: 'Фамилия',
      placeholder: 'Введите фамилию',
      autocomplete: 'family-name',
      required: false,
      icon: {
        key: 'user',
        icon_position: 'left',
        color: '#888888'
      }
    }
  ],
  actions: {
    submit: {
      label: 'Продолжить',
      type: 'primary',
      loadingLabel: 'Регистрация...',
      successLabel: 'Успешно'
    }
  },
  pipeline: {
    sanitize: (context) => {
      const values = context.values || {};
      return {
        email: String(values.email || '').trim().toLowerCase(),
        username: String(values.username || '').trim(),
        phone: String(values.phone || '').trim(),
        password: String(values.password || ''),
        confirm_password: String(values.confirm_password || ''),
        first_name: String(values.first_name || '').trim(),
        last_name: String(values.last_name || '').trim()
      };
    },
    validate: async (context) => {
      const values = context.values || {};
      const errors = [];
      
      if (!values.email || values.email.trim() === '') {
        errors.push({
          fieldId: 'email',
          rule: 'required',
          message: 'Email обязателен для заполнения',
          severity: 'error'
        });
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(values.email)) {
          errors.push({
            fieldId: 'email',
            rule: 'email',
            message: 'Введите корректный email',
            severity: 'error'
          });
        }
      }

      if (!values.username || values.username.trim() === '') {
        errors.push({
          fieldId: 'username',
          rule: 'required',
          message: 'Логин обязателен для заполнения',
          severity: 'error'
        });
      } else if (values.username.length < 3) {
        errors.push({
          fieldId: 'username',
          rule: 'minLength',
          message: 'Логин должен содержать минимум 3 символа',
          severity: 'error'
        });
      }

      if (!values.phone || values.phone.trim() === '') {
        errors.push({
          fieldId: 'phone',
          rule: 'required',
          message: 'Телефон обязателен для заполнения',
          severity: 'error'
        });
      }

      if (!values.password || values.password === '') {
        errors.push({
          fieldId: 'password',
          rule: 'required',
          message: 'Пароль обязателен для заполнения',
          severity: 'error'
        });
      } else {
        // Проверка сложности пароля
        const password = values.password;
        if (password.length < 16) {
          errors.push({
            fieldId: 'password',
            rule: 'minLength',
            message: 'Пароль должен содержать минимум 16 символов',
            severity: 'error'
          });
        } else {
          const passwordErrors = [];
          if (!/[a-zа-я]/.test(password)) {
            passwordErrors.push('маленькие буквы');
          }
          if (!/[A-ZА-Я]/.test(password)) {
            passwordErrors.push('большие буквы');
          }
          if (!/\d/.test(password)) {
            passwordErrors.push('цифры');
          }
          if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            passwordErrors.push('спецсимволы');
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
      }

      if (!values.confirm_password || values.confirm_password === '') {
        errors.push({
          fieldId: 'confirm_password',
          rule: 'required',
          message: 'Подтверждение пароля обязательно',
          severity: 'error'
        });
      } else if (values.password !== values.confirm_password) {
        errors.push({
          fieldId: 'confirm_password',
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
          message: 'Пожалуйста, исправьте ошибки в форме',
          details: errors.map(e => e.message)
        } : null
      };
    },
    submit: async (context) => {
      const values = context.values || {};
      
      // Регистрируем пользователя
      const result = await authService.register(
        values.email,
        values.username,
        values.password,
        values.phone
      );

      if (!result.success) {
        throw new Error(result.error || 'Ошибка регистрации');
      }

      return {
        success: true,
        user: result.user,
        formData: {
          email: values.email,
          username: values.username,
          phone: values.phone,
          first_name: values.first_name || '',
          last_name: values.last_name || ''
        }
      };
    },
    onSuccess: (context) => {
      // Отправляем событие успешной регистрации для перехода к следующему шагу
      window.dispatchEvent(new CustomEvent('order-personal:registered', {
        detail: {
          user: context.result?.user,
          formData: context.result?.formData
        }
      }));
    },
    onError: (context, error) => {
      window.dispatchEvent(new CustomEvent('order-personal:error', {
        detail: { error: error.message || 'Ошибка регистрации' }
      }));
    }
  }
};

