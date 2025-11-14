/**
 * Password Reset Modal Template
 */

export function renderPasswordResetModalTemplate(state) {
  if (state.submitted) {
    return `
      <ui-modal 
        title="Восстановление пароля" 
        size="medium"
        ${state.visible ? '' : 'style="display: none;"'}
      >
        <div class="password-reset-modal__content password-reset-modal__content--success">
          <div class="password-reset-modal__success">
            <ui-icon name="check" size="large"></ui-icon>
            <h3>Запрос отправлен</h3>
            <p>Если указанный email существует в нашей системе, на него будет отправлено письмо с инструкциями по восстановлению пароля.</p>
            <p class="password-reset-modal__hint">Проверьте папку "Спам", если письмо не пришло в течение нескольких минут.</p>
          </div>
        </div>
      </ui-modal>
    `;
  }

  return `
    <ui-modal 
      title="Восстановление пароля" 
      size="medium"
      ${state.visible ? '' : 'style="display: none;"'}
    >
      <div class="password-reset-modal__content">
        <ui-form-controller 
          config-path="app.forms.passwordReset"
          mode="modal"
        ></ui-form-controller>
      </div>
    </ui-modal>
  `;
}

