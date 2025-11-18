/**
 * Конфигурация формы обратной связи
 */

// Конфигурация формы обратной связи
export const contactFormConfig = {
  formId: 'contact-form',
  title: 'Обратная связь',
  description: 'Отправьте нам сообщение, и мы ответим вам в ближайшее время',
  fields: [
    {
      id: 'subject',
      type: 'textarea',
      label: 'Тема сообщения',
      placeholder: 'Введите тему сообщения',
      required: true,
      defaultValue: '',
      validation: {
        rules: ['required']
      },
      rows: 3
    },
    {
      id: 'message',
      type: 'textarea',
      label: 'Сообщение',
      placeholder: 'Введите ваше сообщение',
      required: true,
      defaultValue: '',
      validation: {
        rules: ['required']
      },
      rows: 8
    }
  ],
  actions: {
    submit: {
      label: 'Отправить сообщение',
      type: 'primary',
      icon: {
        key: 'arrow-right',
        icon_position: 'right',
        color: '#0055FF'
      },
      loadingLabel: 'Отправка...',
      successLabel: 'Сообщение отправлено'
    }
  },
  pipeline: {
    sanitize: (payload) => {
      // payload = { controller, values }
      const { values } = payload;
      return {
        subject: String(values.subject || '').trim(),
        message: String(values.message || '').trim()
      };
    },
    validate: async (payload) => {
      // payload = { controller, values }
      const { values } = payload;
      const errors = [];
      
      // Валидация темы
      if (!values.subject || values.subject.trim() === '') {
        errors.push({
          fieldId: 'subject',
          rule: 'required',
          message: 'Введите тему сообщения',
          severity: 'error'
        });
      }
      
      // Валидация сообщения
      if (!values.message || values.message.trim() === '') {
        errors.push({
          fieldId: 'message',
          rule: 'required',
          message: 'Введите сообщение',
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
      
      const apiUrl = window.wpApiSettings?.root || '/wp-json/';
      const nonce = window.wpApiSettings?.nonce || '';
      
      // Получаем ID текущего пользователя из window.app.auth
      const userId = window.app?.auth?.user?.id || window.app?.auth?.user?.ID || null;
      
      if (!userId) {
        throw new Error('Необходима авторизация для отправки сообщения');
      }
      
      const response = await fetch(`${apiUrl}elkaretro/v1/user/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': nonce
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          user_id: userId,
          subject: values.subject,
          message: values.message
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Ошибка отправки сообщения');
      }
      
      const result = await response.json();
      return { success: true, message: result.message || 'Сообщение успешно отправлено' };
    },
    onSuccess: (payload) => {
      // payload = { controller, values, result }
      const { result } = payload;
      // Успешная отправка обрабатывается через событие contact:submitted
      // Это событие обновит состояние компонента (submitted = true)
      window.dispatchEvent(new CustomEvent('contact:submitted', {
        detail: { message: result?.message || 'Сообщение успешно отправлено' }
      }));
      
      // Очищаем форму после успешной отправки
      const formController = payload.controller;
      if (formController && typeof formController.reset === 'function') {
        formController.reset();
      }
    },
    onError: (payload, error) => {
      // payload = { controller, values }, error
      window.dispatchEvent(new CustomEvent('contact:submit-error', {
        detail: { error: error.message || 'Ошибка отправки сообщения' }
      }));
    }
  }
};
