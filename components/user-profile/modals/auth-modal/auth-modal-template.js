/**
 * Auth Modal Template
 */

export function renderAuthModalTemplate(state) {
  return `
    <ui-modal 
      title="Вход в аккаунт" 
      size="medium"
      ${state.visible ? '' : 'style="display: none;"'}
    >
      <div class="auth-modal__content">
        <ui-form-controller 
          config-path="app.forms.signIn"
          mode="modal"
        ></ui-form-controller>
        
        <div class="auth-modal__links">
          <a href="#" data-action="register" class="auth-modal__link">Нет аккаунта? Зарегистрируйтесь</a>
          <a href="#" data-action="forgot-password" class="auth-modal__link">Забыли пароль?</a>
        </div>
      </div>
    </ui-modal>
  `;
}

