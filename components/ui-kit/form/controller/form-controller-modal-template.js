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
  return `
    <form class="ui-form-controller"${gapStyle} novalidate>
      ${renderStatus(state)}
      ${renderFormBody(state)}
      ${renderActions(state, true)}
      ${renderDebugPanel(state)}
    </form>
  `;
}

