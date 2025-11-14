/**
 * Order Wizard Template
 * Шаблон для пошагового мастера оформления заказа
 */

export function order_wizard_template(state) {
  const { steps, currentStep, currentStepInfo, isAuthorized } = state;

  return `
    <div class="order-wizard">
      <header class="order-wizard_header">
        <h2 class="order-wizard_title">Оформление заказа</h2>
        <div class="order-wizard_steps">
          ${steps.map((step, index) => {
            const stepNumber = index + 1;
            const isActive = stepNumber === currentStep;
            const isCompleted = stepNumber < currentStep;
            const isAccessible = stepNumber <= currentStep || isCompleted;

            return `
              <div class="order-wizard_step ${isActive ? 'order-wizard_step--active' : ''} ${isCompleted ? 'order-wizard_step--completed' : ''} ${!isAccessible ? 'order-wizard_step--disabled' : ''}">
                <div class="order-wizard_step_number">${stepNumber}</div>
                <div class="order-wizard_step_label">${step.name}</div>
              </div>
            `;
          }).join('')}
        </div>
      </header>

      <div class="order-wizard_content">
        <div class="order-wizard_step-container">
          <!-- Шаг будет загружен динамически -->
        </div>
      </div>

      <footer class="order-wizard_footer">
        <ui-button 
          type="ghost"
          label="Назад"
          event="order-wizard:prev-click"
          ${currentStep === 1 ? 'disabled' : ''}
          class="order-wizard_prev-btn"
        ></ui-button>
        <ui-button 
          type="primary"
          label="${currentStep === steps.length ? 'Завершить заказ' : 'Далее'}"
          event="order-wizard:next-click"
          class="order-wizard_next-btn"
        ></ui-button>
      </footer>
    </div>
  `;
}

