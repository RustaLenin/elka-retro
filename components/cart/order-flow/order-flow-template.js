/**
 * Order Flow Template
 * Шаблон для flow оформления заказа
 */

export function order_flow_template(state) {
  const { steps, allSteps, currentStep, currentStepConfig, isSubmitting } = state;

  return `
    <div class="order-flow">
      ${isSubmitting ? `
        <div class="order-flow_overlay">
          <div class="order-flow_loader">
            <ui-loader></ui-loader>
            <p class="order-flow_loader-text">Создание заказа...</p>
            <p class="order-flow_loader-hint">Пожалуйста, не закрывайте страницу</p>
          </div>
        </div>
      ` : ''}
      
      <header class="order-flow_header">
        <h2 class="order-flow_title">Оформление заказа</h2>
        <div class="order-flow_steps">
          ${allSteps.map((step) => {
            const stepNumber = step.number;
            const isActive = stepNumber === currentStep;
            const isCompleted = stepNumber < currentStep;
            const isAccessible = stepNumber <= currentStep || isCompleted;

            return `
              <div class="order-flow_step ${isActive ? 'order-flow_step--active' : ''} ${isCompleted ? 'order-flow_step--completed' : ''} ${!isAccessible ? 'order-flow_step--disabled' : ''}">
                <div class="order-flow_step_number">${stepNumber}</div>
                <div class="order-flow_step_label">${step.name}</div>
              </div>
            `;
          }).join('')}
        </div>
      </header>

      <div class="order-flow_content">
        <div class="order-flow_main">
          <div class="order-flow_step-container">
            <!-- Шаг будет загружен динамически -->
          </div>
        </div>

        <aside class="order-flow_sidebar">
          <cart-summary></cart-summary>
        </aside>
      </div>

      <footer class="order-flow_footer">
        ${currentStep >= 2 ? `
          <ui-button
            type="secondary"
            label="Назад"
            icon="chevron_left"
            icon-position="left"
            event="order-flow:step:prev"
            class="order-flow_back-btn"
          ></ui-button>
        ` : ''}
      </footer>
    </div>
  `;
}

