/**
 * Шаблон формы для обычной страницы (mode="page")
 * Включает header, status, body, actions (footer), debug
 */

import {
  escapeHTML,
  escapeAttribute,
  renderIcon,
  renderStatus,
  renderFormBody,
  renderActions,
  renderDebugPanel
} from './form-controller-template-utils.js';

function renderHeader(state) {
  const title = state?.title;
  const description = state?.description;
  const iconMarkup = renderIcon(state?.icon);

  if (!title && !description && !iconMarkup) {
    return '<header class="ui-form-controller__header" hidden></header>';
  }

  return `
    <header class="ui-form-controller__header">
      ${iconMarkup ? `<div class="ui-form-controller__header-icon">${iconMarkup}</div>` : ''}
      <div class="ui-form-controller__header-content">
        ${title ? `<h2 class="ui-form-controller__title">${escapeHTML(title)}</h2>` : ''}
        ${description ? `<p class="ui-form-controller__description">${escapeHTML(description)}</p>` : ''}
      </div>
    </header>
  `;
}

export function renderFormControllerPageTemplate(state) {
  const gapStyle = state?.layoutGap ? ` style="--ui-form-layout-gap:${escapeAttribute(state.layoutGap)}"` : '';
  return `
    <form class="ui-form-controller"${gapStyle} novalidate>
      ${renderHeader(state)}
      ${renderStatus(state)}
      ${renderFormBody(state)}
      ${renderActions(state, false)}
      ${renderDebugPanel(state)}
    </form>
  `;
}

