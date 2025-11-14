/**
 * Register Modal Template
 */

export function renderRegisterModalTemplate(state) {
  return `
    <ui-modal 
      title="Регистрация" 
      size="medium"
      ${state.visible ? '' : 'style="display: none;"'}
    >
      <div class="register-modal__content">
        <ui-form-controller 
          config-path="app.forms.register"
          mode="modal"
        ></ui-form-controller>
        
        <div class="register-modal__links">
          <a href="#" data-action="login" class="register-modal__link">Уже есть аккаунт? Войдите</a>
        </div>
      </div>
    </ui-modal>
  `;
}

