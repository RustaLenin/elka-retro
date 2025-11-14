/**
 * Step Logistics Template
 * Шаблон для шага доставки
 */

export function step_logistics_template(state) {
  const { isAuthorized, hasSavedAddress } = state;

  return `
    <div class="step-logistics">
      <div class="step-logistics_content">
        ${isAuthorized && hasSavedAddress ? `
          <div class="step-logistics_notice">
            <ui-icon name="info" size="small"></ui-icon>
            <span>Используется адрес из вашего профиля. Вы можете изменить его ниже.</span>
          </div>
        ` : ''}
        <ui-form-controller config-path="window.app.forms.orderLogistics"></ui-form-controller>
      </div>
    </div>
  `;
}

