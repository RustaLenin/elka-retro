/**
 * Step Payment Template
 * Шаблон для шага оплаты
 */

export function step_payment_template() {
  return `
    <div class="step-payment">
      <div class="step-payment_content">
        <ui-form-controller config-path="window.app.forms.orderPayment" background></ui-form-controller>
        <div class="step-payment_details" style="display: none;"></div>
      </div>
    </div>
  `;
}

