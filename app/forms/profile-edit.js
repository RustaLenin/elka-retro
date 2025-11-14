/**
 * Конфигурация формы редактирования профиля
 */

// Используем глобальный сервис из window.app.services вместо статического импорта
// Это позволяет избежать проблем с разрешением путей при динамической загрузке модулей

// Конфигурация формы редактирования профиля
export const profileEditFormConfig = {
  formId: 'profile-edit-form',
  title: 'Редактирование профиля',
  description: 'Обновите данные вашего профиля',
  fields: [
    {
      id: 'first_name',
      type: 'text',
      label: 'Имя',
      placeholder: 'Введите имя',
      autocomplete: 'given-name',
      defaultValue: '',
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
      defaultValue: '',
      icon: {
        key: 'user',
        icon_position: 'left',
        color: '#888888'
      }
    },
    {
      id: 'display_name',
      type: 'text',
      label: 'Отображаемое имя',
      placeholder: 'Введите отображаемое имя',
      autocomplete: 'name',
      defaultValue: '',
      validation: {
        rules: ['required']
      },
      icon: {
        key: 'user',
        icon_position: 'left',
        color: '#888888'
      }
    },
    {
      id: 'email',
      type: 'text',
      label: 'Email',
      placeholder: 'Введите email',
      autocomplete: 'email',
      required: true,
      defaultValue: '',
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
      id: 'phone',
      type: 'text',
      label: 'Телефон',
      placeholder: 'Введите номер телефона',
      autocomplete: 'tel',
      required: true,
      defaultValue: '',
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
      id: 'delivery_address',
      type: 'text',
      label: 'Адрес доставки',
      placeholder: 'Введите адрес доставки',
      defaultValue: '',
      icon: {
        key: 'map-marker',
        icon_position: 'left',
        color: '#888888'
      }
    },
    {
      id: 'messenger_link',
      type: 'text',
      label: 'Ссылка на мессенджер',
      placeholder: 'Введите ссылку на Telegram, VK и т.д.',
      defaultValue: '',
      icon: {
        key: 'link',
        icon_position: 'left',
        color: '#888888'
      }
    }
  ],
  actions: {
    submit: {
      label: 'Сохранить изменения',
      type: 'primary',
      icon: {
        key: 'check',
        icon_position: 'right',
        color: '#0055FF'
      },
      loadingLabel: 'Сохранение...',
      successLabel: 'Изменения сохранены'
    }
  },
  pipeline: {
    sanitize: (payload) => {
      // payload = { controller, values }
      const { values } = payload;
      return {
        first_name: String(values.first_name || '').trim(),
        last_name: String(values.last_name || '').trim(),
        display_name: String(values.display_name || '').trim(),
        email: String(values.email || '').trim().toLowerCase(),
        phone: String(values.phone || '').trim(),
        delivery_address: String(values.delivery_address || '').trim(),
        messenger_link: String(values.messenger_link || '').trim()
      };
    },
    validate: async (payload) => {
      // payload = { controller, values }
      const { values } = payload;
      const errors = [];
      
      // Валидация отображаемого имени
      if (!values.display_name || values.display_name.trim() === '') {
        errors.push({
          fieldId: 'display_name',
          rule: 'required',
          message: 'Введите отображаемое имя',
          severity: 'error'
        });
      }
      
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
      
      // Валидация телефона
      if (!values.phone || values.phone.trim() === '') {
        errors.push({
          fieldId: 'phone',
          rule: 'required',
          message: 'Введите номер телефона',
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
      
      const result = await userService.updateProfile(values);
      
      if (!result.success) {
        throw new Error(result.error || 'Ошибка обновления профиля');
      }
      
      return result;
    },
    onSuccess: (payload) => {
      // payload = { controller, values, result }
      const { result } = payload;
      // Успешное обновление профиля обрабатывается через событие profile:updated
      window.dispatchEvent(new CustomEvent('profile:updated', {
        detail: { profile: result?.user }
      }));
    },
    onError: (payload, error) => {
      // payload = { controller, values }, error
      window.dispatchEvent(new CustomEvent('profile:update-error', {
        detail: { error: error.message || 'Ошибка обновления профиля' }
      }));
    }
  }
};
