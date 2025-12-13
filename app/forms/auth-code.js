/**
 * Конфигурация формы авторизации/регистрации через код
 * 
 * Единая форма для авторизации и регистрации:
 * - Начальное состояние: поле email
 * - После запроса кода: поле code
 * - Динамическое переключение между состояниями
 */

// Конфигурация формы авторизации через код
export const authCodeFormConfig = {
  formId: 'auth-code-form',
  title: 'Вход / Регистрация',
  description: `
    <div style="margin-bottom: 1.5rem;">
      <p style="margin: 0 0 1rem 0; color: var(--color-muted-foreground, #9ca3af); font-size: 0.875rem; line-height: 1.5;">
        <strong>Если у вас нет аккаунта:</strong> Укажите вашу почту, и мы создадим аккаунт. 
        После этого мы вышлем письмо на указанную почту для подтверждения, что вы владеете этой почтой.
      </p>
      <p style="margin: 0; color: var(--color-muted-foreground, #9ca3af); font-size: 0.875rem; line-height: 1.5;">
        <strong>Если аккаунт уже есть и почта подтверждена:</strong> Мы вышлем на указанную почту код для авторизации.
      </p>
    </div>
  `,
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
        key: 'envelope',
        icon_position: 'left',
        color: '#888888'
      }
    }
  ],
  actions: {
    submit: {
      label: 'Отправить код',
      type: 'primary',
      icon: {
        key: 'arrow-right',
        icon_position: 'right',
        color: '#0055FF'
      },
      loadingLabel: 'Отправка...',
      successLabel: 'Код отправлен'
    },
    extra: []
  },
  pipeline: {
    sanitize: (payload) => {
      const { values } = payload;
      return {
        email: String(values.email || '').trim().toLowerCase(),
        code: String(values.code || '').trim()
      };
    },
    validate: async (payload) => {
      const { values, controller } = payload;
      const errors = [];
      const fieldMessages = {};

      // Определяем текущее состояние формы
      const currentFields = controller.state.fields || [];
      const hasEmailField = currentFields.some(f => f.id === 'email');
      const hasCodeField = currentFields.some(f => f.id === 'code');

      if (hasEmailField) {
        // Валидация email
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
      }

      if (hasCodeField) {
        // Валидация кода
        if (!values.code || values.code.trim() === '') {
          errors.push({
            fieldId: 'code',
            rule: 'required',
            message: 'Введите код',
            severity: 'error'
          });
        } else {
          const codeRegex = /^\d{6}$/;
          if (!codeRegex.test(values.code)) {
            errors.push({
              fieldId: 'code',
              rule: 'format',
              message: 'Код должен состоять из 6 цифр',
              severity: 'error'
            });
          }
        }
      }

      // Формируем fieldMessages
      errors.forEach(error => {
        if (error.fieldId) {
          if (!fieldMessages[error.fieldId]) {
            fieldMessages[error.fieldId] = { status: 'error', messages: { error: [] } };
          }
          fieldMessages[error.fieldId].messages.error.push(error.message);
        }
      });

      return {
        valid: errors.length === 0,
        errors,
        fieldMessages,
        formMessages: errors.length > 0 ? {
          message: 'Пожалуйста, исправьте ошибки в форме',
          details: errors.map(e => e.message)
        } : null
      };
    },
    submit: async (payload) => {
      const { values, controller } = payload;
      const authService = window.app?.services?.authService;

      if (!authService) {
        throw new Error('Auth service not loaded yet. Please wait a moment and try again.');
      }

      // Определяем текущее состояние формы
      const currentFields = controller.state.fields || [];
      const hasEmailField = currentFields.some(f => f.id === 'email');
      const hasCodeField = currentFields.some(f => f.id === 'code');

      if (hasEmailField) {
        // Запрос кода
        const result = await authService.requestCode(values.email);

        if (!result.success) {
          // Обрабатываем ошибки
          const errorCode = result.error || 'unknown_error';
          const errorMessage = result.message || 'Ошибка запроса кода';

          // Формируем ошибку для отображения
          const error = new Error(errorMessage);
          error.errorCode = errorCode;
          error.retryAfter = result.retryAfter;
          error.blockedUntil = result.blockedUntil;
          throw error;
        }

        // Успешный запрос кода - переключаем форму на ввод кода
        const codeField = {
          id: 'code',
          type: 'text',
          label: 'Код подтверждения',
          placeholder: 'Введите 6-значный код',
          autocomplete: 'one-time-code',
          required: true,
          validation: [
            { rule: 'required', value: true, message: 'Введите код', severity: 'error' },
            { rule: 'pattern', value: '^\\d{6}$', message: 'Код должен состоять из 6 цифр', severity: 'error' }
          ],
          icon: {
            key: 'key',
            icon_position: 'left',
            color: '#888888'
          }
        };

        // Обновляем форму: убираем email, добавляем code
        // Проверяем, был ли создан новый аккаунт (если result содержит эту информацию)
        const isNewAccount = result.isNewAccount || false;
        
        controller.setState({
          fields: [codeField],
          description: `
            <p style="margin: 0 0 0.5rem 0; color: var(--color-foreground, #f5f7fa); font-size: 0.875rem; line-height: 1.5;">
              Код отправлен на <strong>${values.email}</strong>
            </p>
            <p style="margin: 0; color: var(--color-muted-foreground, #9ca3af); font-size: 0.875rem; line-height: 1.5;">
              ${isNewAccount 
                ? 'Мы создали для вас аккаунт и отправили письмо с подтверждением. Введите 6-значный код из письма для завершения регистрации.' 
                : 'Введите 6-значный код из письма для входа в аккаунт.'}
            </p>
          `,
          actions: {
            submit: {
              label: 'Войти',
              type: 'primary',
              icon: {
                key: 'arrow-right',
                icon_position: 'right',
                color: '#0055FF'
              },
              loadingLabel: 'Проверка...',
              successLabel: 'Вход выполнен'
            },
            extra: [
              {
                label: 'Отправить код повторно',
                type: 'ghost',
                action: 'resend-code',
                disabled: true // Будет включена через 180 секунд
              }
            ]
          }
        });

        // Сохраняем email для последующей проверки кода
        controller._authEmail = values.email;
        controller._codeRequestedAt = Date.now();
        controller._canResendAfter = result.canResendAfter || 180;

        // Запускаем таймер для кнопки "Отправить код повторно"
        setTimeout(() => {
          startResendTimer(controller, result.canResendAfter || 180);
        }, 100);

        return {
          success: true,
          message: result.message || 'Код отправлен на почту',
          canResendAfter: result.canResendAfter || 180
        };
      } else if (hasCodeField) {
        // Проверка кода
        const email = controller._authEmail || values.email;
        const result = await authService.verifyCode(email, values.code);

        if (!result.success) {
          // Обрабатываем ошибки
          const errorCode = result.error || 'unknown_error';
          const errorMessage = result.message || 'Ошибка проверки кода';

          // Формируем ошибку для отображения
          const error = new Error(errorMessage);
          error.errorCode = errorCode;
          error.retryAfter = result.retryAfter;
          error.blockedUntil = result.blockedUntil;
          error.newCodeSent = result.newCodeSent || false;
          throw error;
        }

        // Успешная авторизация
        return {
          success: true,
          user: result.user,
          message: 'Вы успешно авторизовались. Теперь вы можете продолжить оформление, заказ будет привязан к вашему профилю.'
        };
      }

      throw new Error('Неизвестное состояние формы');
    },
    onSuccess: ({ result, controller }) => {
      // Проверяем наличие поля code через DOM
      const codeField = controller.querySelector('ui-form-field[field-id="code"]');
      const hasCodeField = !!codeField;

      if (hasCodeField && result.user) {
        // Успешная авторизация - показываем сообщение и закрываем модальное окно
        controller.setState({
          status: {
            type: 'success',
            message: result.message || 'Вы успешно авторизовались',
            details: []
          }
        });

        // Отправляем событие авторизации
        window.dispatchEvent(new CustomEvent('elkaretro:auth:login', {
          detail: { user: result.user }
        }));

        // Закрываем модальное окно через 2 секунды (пользователь может закрыть раньше)
        setTimeout(() => {
          window.app?.modal?.close?.('auth:code');
        }, 2000);
      }
    },
    onError: ({ error, controller }) => {
      const errorCode = error.errorCode || 'unknown_error';
      const errorMessage = error.message || 'Ошибка';

      // Обработка различных типов ошибок
      if (errorCode === 'too_frequent') {
        // Rate limiting - показываем таймер
        const retryAfter = error.retryAfter || 180;
        setTimeout(() => {
          startResendTimer(controller, retryAfter);
        }, 100);
        
        // Показываем ошибку через formMessages
        controller.setState({
          status: {
            type: 'error',
            message: errorMessage,
            details: []
          }
        });
      } else if (errorCode === 'too_many_attempts') {
        // Блокировка - показываем сообщение без таймера
        controller.setState({
          status: {
            type: 'error',
            message: errorMessage || 'Заблокировано на 3 часа',
            details: []
          }
        });
      } else if (errorCode === 'code_expired') {
        // Истечение кода - показываем уведомление
        const message = error.newCodeSent 
          ? 'Старый код истёк, мы вам на почту отправили новый код'
          : 'Код истёк. Запросите новый код.';
        
        controller.setState({
          status: {
            type: 'error',
            message: message,
            details: []
          }
        });
      } else if (errorCode === 'daily_limit_exceeded') {
        // Превышение лимита отправок
        controller.setState({
          status: {
            type: 'error',
            message: errorMessage || 'Превышен лимит отправок кодов (10 в сутки). Попробуйте позже.',
            details: []
          }
        });
      } else {
        // Общая ошибка
        const fieldMessages = {};
        
        // Если ошибка связана с конкретным полем
        if (errorCode === 'invalid_code') {
          fieldMessages.code = {
            status: 'error',
            messages: { error: [errorMessage] }
          };
        } else if (errorCode === 'invalid_email') {
          fieldMessages.email = {
            status: 'error',
            messages: { error: [errorMessage] }
          };
        }

        controller.setState({
          status: {
            type: 'error',
            message: errorMessage,
            details: []
          },
          fieldMessages
        });
      }
    }
  }
};

// Функция для запуска таймера повторной отправки кода
function startResendTimer(controller, canResendAfter) {
  if (controller._resendTimer) {
    clearInterval(controller._resendTimer);
  }

  let remaining = canResendAfter || 180;
  
  // Ищем кнопку "Отправить код повторно" в DOM
  const resendButton = controller.querySelector('[data-action="resend-code"]');
  
  if (!resendButton) {
    // Если кнопка еще не создана, ждем следующего кадра
    requestAnimationFrame(() => {
      startResendTimer(controller, canResendAfter);
    });
    return;
  }

  // Обновляем кнопку
  resendButton.disabled = true;
  const updateButtonText = () => {
    if (remaining > 0) {
      resendButton.textContent = `Отправить код повторно (${remaining} сек)`;
    } else {
      resendButton.disabled = false;
      resendButton.textContent = 'Отправить код повторно';
      clearInterval(controller._resendTimer);
      controller._resendTimer = null;
    }
  };
  
  updateButtonText();

  // Запускаем таймер
  controller._resendTimer = setInterval(() => {
    remaining--;
    updateButtonText();
  }, 1000);

  // Обработчик клика на кнопку "Отправить код повторно"
  const handleResendClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (resendButton.disabled) {
      return;
    }

    const email = controller._authEmail;
    if (!email) {
      return;
    }

    // Отправляем запрос на повторную отправку кода
    const authService = window.app?.services?.authService;
    if (!authService) {
      return;
    }

    resendButton.disabled = true;
    resendButton.textContent = 'Отправка...';

    try {
      const result = await authService.requestCode(email);
      
      if (result.success) {
        // Запускаем таймер заново
        startResendTimer(controller, result.canResendAfter || 180);
        
        // Показываем сообщение об успехе
        controller.setState({
          status: {
            type: 'success',
            message: 'Код отправлен повторно',
            details: []
          }
        });
      } else {
        // Обрабатываем ошибку
        const errorCode = result.error || 'unknown_error';
        const errorMessage = result.message || 'Ошибка запроса кода';
        
        if (errorCode === 'too_frequent') {
          startResendTimer(controller, result.retryAfter || 180);
        }
        
        controller.setState({
          status: {
            type: 'error',
            message: errorMessage,
            details: []
          }
        });
      }
    } catch (error) {
      controller.setState({
        status: {
          type: 'error',
          message: error.message || 'Ошибка запроса кода',
          details: []
        }
      });
    }
  };

  // Удаляем старый обработчик, если есть
  resendButton.removeEventListener('click', controller._resendClickHandler);
  controller._resendClickHandler = handleResendClick;
  resendButton.addEventListener('click', controller._resendClickHandler);
}

