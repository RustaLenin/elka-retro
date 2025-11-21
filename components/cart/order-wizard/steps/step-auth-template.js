/**
 * Step Auth Template
 * Шаблон для шага авторизации
 */

export function step_auth_template(state) {
  const { isAuthorized } = state;

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
        <h3 class="step-auth_title">Авторизация</h3>
        <p class="step-auth_description">
          Войдите в аккаунт для быстрого оформления заказа
        </p>

        <div class="step-auth_actions">
          <ui-button 
            type="primary"
            width="full_width"
            label="Авторизация"
            event="step-auth:login-click"
            class="step-auth_login-btn"
          ></ui-button>

          <div class="step-auth_divider">
            <span class="step-auth_divider-text">или</span>
          </div>

          <div class="step-auth_continue-section">
            <ui-button 
              type="secondary"
              width="full_width"
              label="Продолжить без авторизации"
              event="step-auth:continue-without-auth-click"
              class="step-auth_continue-btn"
            ></ui-button>
            <p class="step-auth_hint">
              указать регистрационные данные при оформлении заказа
            </p>
          </div>
        </div>
      </div>
    </div>
  `;
}

