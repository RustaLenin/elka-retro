/**
 * Step Auth Template
 * Шаблон для шага авторизации
 */

export function step_auth_template(state) {
  const { isAuthorized, choice } = state;

  if (isAuthorized) {
    return `
      <div class="step-auth">
        <div class="step-auth_authorized">
          <ui-icon name="check_circle" size="large" class="step-auth_icon"></ui-icon>
          <h3 class="step-auth_title">Вы авторизованы</h3>
          <p class="step-auth_text">Продолжаем оформление заказа...</p>
        </div>
      </div>
    `;
  }

  return `
    <div class="step-auth">
      <div class="step-auth_content">
        <h3 class="step-auth_title">Вход или регистрация</h3>
        <p class="step-auth_description">
          Для оформления заказа необходимо войти в систему или зарегистрироваться.
        </p>

        <div class="step-auth_choices">
          <ui-button 
            type="ghost"
            icon="account"
            icon-position="left"
            label="Войти"
            data-description="У меня уже есть аккаунт"
            event="step-auth:login-click"
            class="step-auth_choice step-auth_login-btn ${choice === 'login' ? 'step-auth_choice--active' : ''}"
          ></ui-button>

          <ui-button 
            type="ghost"
            icon="user_plus"
            icon-position="left"
            label="Зарегистрироваться"
            data-description="Создать новый аккаунт"
            event="step-auth:register-click"
            class="step-auth_choice step-auth_register-btn ${choice === 'register' ? 'step-auth_choice--active' : ''}"
          ></ui-button>
        </div>
      </div>
    </div>
  `;
}

