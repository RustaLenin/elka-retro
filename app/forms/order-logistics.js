/**
 * Конфигурация формы доставки для оформления заказа
 */

export const orderLogisticsFormConfig = {
  formId: 'order-logistics-form',
  title: 'Доставка',
  description: 'Укажите способ доставки и адрес',
  fields: [
    {
      id: 'delivery_method',
      type: 'select-single',
      label: 'Способ доставки',
      required: true,
      options: [
        { value: 'courier', label: 'Курьером' },
        { value: 'pickup', label: 'Самовывоз' },
        { value: 'post', label: 'Почта России' },
      ],
      validation: [
        { rule: 'required', value: true, message: 'Выберите способ доставки', severity: 'error' }
      ],
      icon: {
        key: 'truck',
        icon_position: 'left',
        color: '#888888'
      }
    },
    {
      id: 'country',
      type: 'text',
      label: 'Страна',
      placeholder: 'Россия',
      autocomplete: 'country',
      required: true,
      defaultValue: 'Россия',
      validation: [
        { rule: 'required', value: true, message: 'Страна обязательна для заполнения', severity: 'error' }
      ],
      icon: {
        key: 'map',
        icon_position: 'left',
        color: '#888888'
      }
    },
    {
      id: 'region',
      type: 'text',
      label: 'Регион / Область',
      placeholder: 'Введите регион или область',
      autocomplete: 'address-level1',
      required: true,
      validation: [
        { rule: 'required', value: true, message: 'Регион обязателен для заполнения', severity: 'error' }
      ],
      icon: {
        key: 'map',
        icon_position: 'left',
        color: '#888888'
      }
    },
    {
      id: 'city',
      type: 'text',
      label: 'Город',
      placeholder: 'Введите город',
      autocomplete: 'address-level2',
      required: true,
      validation: [
        { rule: 'required', value: true, message: 'Город обязателен для заполнения', severity: 'error' }
      ],
      icon: {
        key: 'map',
        icon_position: 'left',
        color: '#888888'
      }
    },
    {
      id: 'street',
      type: 'text',
      label: 'Улица, дом, квартира',
      placeholder: 'Введите адрес',
      autocomplete: 'street-address',
      required: true,
      validation: [
        { rule: 'required', value: true, message: 'Адрес обязателен для заполнения', severity: 'error' }
      ],
      icon: {
        key: 'home',
        icon_position: 'left',
        color: '#888888'
      }
    },
    {
      id: 'postal_code',
      type: 'text',
      label: 'Почтовый индекс',
      placeholder: '123456',
      autocomplete: 'postal-code',
      required: false,
      validation: [
        { rule: 'pattern', value: '^[0-9]{6}$', message: 'Введите корректный почтовый индекс (6 цифр)', severity: 'error' }
      ],
      icon: {
        key: 'mail',
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
        delivery_method: String(values.delivery_method || '').trim(),
        country: String(values.country || 'Россия').trim(),
        region: String(values.region || '').trim(),
        city: String(values.city || '').trim(),
        street: String(values.street || '').trim(),
        postal_code: String(values.postal_code || '').trim()
      };
    },
    validate: async (payload) => {
      const { values } = payload;
      const errors = [];
      
      if (!values.delivery_method || values.delivery_method.trim() === '') {
        errors.push({
          fieldId: 'delivery_method',
          rule: 'required',
          message: 'Выберите способ доставки',
          severity: 'error'
        });
      }
      
      if (!values.country || values.country.trim() === '') {
        errors.push({
          fieldId: 'country',
          rule: 'required',
          message: 'Страна обязательна для заполнения',
          severity: 'error'
        });
      }
      
      if (!values.region || values.region.trim() === '') {
        errors.push({
          fieldId: 'region',
          rule: 'required',
          message: 'Регион обязателен для заполнения',
          severity: 'error'
        });
      }
      
      if (!values.city || values.city.trim() === '') {
        errors.push({
          fieldId: 'city',
          rule: 'required',
          message: 'Город обязателен для заполнения',
          severity: 'error'
        });
      }
      
      if (!values.street || values.street.trim() === '') {
        errors.push({
          fieldId: 'street',
          rule: 'required',
          message: 'Адрес обязателен для заполнения',
          severity: 'error'
        });
      }
      
      if (values.postal_code && values.postal_code.trim() !== '') {
        const postalCodeRegex = /^[0-9]{6}$/;
        if (!postalCodeRegex.test(values.postal_code)) {
          errors.push({
            fieldId: 'postal_code',
            rule: 'pattern',
            message: 'Введите корректный почтовый индекс (6 цифр)',
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
      
      // Отправляем событие для обработки в step-logistics.js
      window.dispatchEvent(new CustomEvent('order-logistics:submit', {
        detail: {
          values: {
            delivery_method: values.delivery_method,
            country: values.country,
            region: values.region,
            city: values.city,
            street: values.street,
            postal_code: values.postal_code || ''
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
      // Это обрабатывается через событие order-logistics:submit
    },
    onError: (payload, error) => {
      window.dispatchEvent(new CustomEvent('order-logistics:error', {
        detail: { error: error.message || 'Ошибка сохранения данных доставки' }
      }));
    }
  }
};

