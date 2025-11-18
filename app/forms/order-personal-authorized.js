/**
 * Конфигурация формы личных данных для авторизованных пользователей
 * Только телефон, имя, фамилия (email и логин уже есть в профиле)
 */

export const orderPersonalAuthorizedFormConfig = {
  formId: 'order-personal-authorized-form',
  title: 'Личные данные',
  description: 'Проверьте и при необходимости дополните ваши данные. Email и логин уже указаны в вашем профиле.',
  fields: [
    {
      id: 'phone',
      type: 'text',
      label: 'Телефон',
      placeholder: '+7 (999) 123-45-67',
      autocomplete: 'tel',
      allowedPattern: '\\d',
      mask: 'phone',
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
      loadingLabel: 'Сохранение...',
      successLabel: 'Сохранено'
    }
  },
  pipeline: {
    sanitize: (payload) => {
      const { values } = payload;
      return {
        phone: String(values.phone || '').trim(),
        first_name: String(values.first_name || '').trim(),
        last_name: String(values.last_name || '').trim()
      };
    },
    validate: async (payload) => {
      const { values } = payload;
      const errors = [];
      
      if (!values.phone || values.phone.trim() === '') {
        errors.push({
          fieldId: 'phone',
          rule: 'required',
          message: 'Телефон обязателен для заполнения',
          severity: 'error'
        });
      } else {
        const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
        if (!phoneRegex.test(values.phone)) {
          errors.push({
            fieldId: 'phone',
            rule: 'pattern',
            message: 'Введите корректный номер телефона',
            severity: 'error'
          });
        }
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
    submit: async (payload) => {
      const { values } = payload;
      
      // Отправляем событие для обработки в step-personal.js
      window.dispatchEvent(new CustomEvent('order-personal-authorized:submit', {
        detail: {
          values: {
            phone: values.phone,
            first_name: values.first_name || '',
            last_name: values.last_name || ''
          }
        }
      }));
      
      return {
        success: true,
        values: values
      };
    },
    onSuccess: (payload) => {
      // Уведомляем компонент шага о готовности перейти к следующему шагу
      // Это обрабатывается через событие order-personal-authorized:submit
    },
    onError: (payload, error) => {
      window.dispatchEvent(new CustomEvent('order-personal-authorized:error', {
        detail: { error: error.message || 'Ошибка сохранения данных' }
      }));
    }
  }
};

