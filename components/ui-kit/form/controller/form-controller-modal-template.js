/**
 * Шаблон формы для модального окна (mode="modal")
 * НЕ включает header (используется title модального окна)
 * Actions рендерятся как [data-form-actions] для перемещения в footer модального окна
 */

import {
  escapeAttribute,
  renderStatus,
  renderFormBody,
  renderActions,
  renderDebugPanel
} from './form-controller-template-utils.js';

export function renderFormControllerModalTemplate(state) {
  const gapStyle = state?.layoutGap ? ` style="--ui-form-layout-gap:${escapeAttribute(state.layoutGap)}"` : '';
  const description = state?.description;
  // Description может содержать HTML (ссылки и т.д.), поэтому не экранируем его
  return `
    <form class="ui-form-controller"${gapStyle} novalidate>
      ${renderStatus(state)}
      ${description ? `<div class="ui-form-controller__description" style="margin-bottom: 1.5rem;">${description}</div>` : ''}
      ${renderFormBody(state)}
      ${renderActions(state, true)}
      ${renderDebugPanel(state)}
    </form>
  `;
}

