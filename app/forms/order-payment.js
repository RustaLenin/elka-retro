/**
 * Конфигурация формы оплаты для оформления заказа
 */

export const orderPaymentFormConfig = {
  formId: 'order-payment-form',
  title: 'Способ оплаты',
  description: 'Выберите удобный способ оплаты',
  fields: [
    {
      id: 'payment_method',
      type: 'select-single',
      label: 'Способ оплаты',
      required: true,
      options: [
        { value: 'bank_transfer', label: 'Банковский перевод' },
        { value: 'card', label: 'Банковская карта' },
        { value: 'cash', label: 'Наличными при получении' },
      ],
      validation: [
        { rule: 'required', value: true, message: 'Выберите способ оплаты', severity: 'error' }
      ],
      icon: {
        key: 'credit_card',
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
        payment_method: String(values.payment_method || '').trim()
      };
    },
    validate: async (payload) => {
      const { values } = payload;
      const errors = [];
      
      if (!values.payment_method || values.payment_method.trim() === '') {
        errors.push({
          fieldId: 'payment_method',
          rule: 'required',
          message: 'Выберите способ оплаты',
          severity: 'error'
        });
      }
      
      return {
        valid: errors.length === 0,
        errors,
        fieldMessages: {},
        formMessages: errors.length > 0 ? {
          message: 'Пожалуйста, выберите способ оплаты',
          details: errors.map(e => e.message)
        } : null
      };
    },
    submit: async (payload) => {
      const { values } = payload;
      
      // Отправляем событие для обработки в step-payment.js
      window.dispatchEvent(new CustomEvent('order-payment:submit', {
        detail: {
          values: {
            payment_method: values.payment_method
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
      // Это обрабатывается через событие order-payment:submit
    },
    onError: (payload, error) => {
      window.dispatchEvent(new CustomEvent('order-payment:error', {
        detail: { error: error.message || 'Ошибка сохранения способа оплаты' }
      }));
    }
  }
};

