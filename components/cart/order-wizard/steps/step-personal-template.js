/**
 * Step Personal Template
 * Шаблон для шага личных данных
 */

export function step_personal_template(state) {
  const { isSubmitting, isAuthorized } = state;
  
  // Выбираем конфигурацию формы в зависимости от авторизации
  const configPath = isAuthorized 
    ? 'window.app.forms.orderPersonalAuthorized'
    : 'window.app.forms.orderPersonal';

  // Проверяем, что конфигурация существует
  if (isAuthorized && !window.app?.forms?.orderPersonalAuthorized) {
    console.error('[StepPersonal] orderPersonalAuthorized config not found!', window.app?.forms);
  }
  if (!isAuthorized && !window.app?.forms?.orderPersonal) {
    console.error('[StepPersonal] orderPersonal config not found!', window.app?.forms);
  }

  console.log('[StepPersonal Template] Rendering with:', { isAuthorized, configPath, availableForms: Object.keys(window.app?.forms || {}) });

  return `
    <div class="step-personal">
      <div class="step-personal_content">
        <ui-form-controller config-path="${configPath}" background></ui-form-controller>
        ${isSubmitting ? `
          <div class="step-personal_loading">
            <ui-loader></ui-loader>
            <p>${isAuthorized ? 'Сохранение...' : 'Регистрация...'}</p>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

