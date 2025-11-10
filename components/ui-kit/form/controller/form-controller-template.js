function escapeHTML(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderIcon(icon) {
  if (!icon || !icon.key) return '';
  const name = escapeHTML(icon.key);
  const position = icon.icon_position ? ` data-position="${escapeHTML(icon.icon_position)}"` : '';
  const color = icon.color ? ` data-color="${escapeHTML(icon.color)}"` : '';
  const onClick = icon.on_click ? ` data-on-click="${escapeHTML(icon.on_click)}"` : '';
  return `<ui-icon name="${name}"${position}${color}${onClick}></ui-icon>`;
}

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

function renderStatus(state) {
  const status = state?.status || {};
  const message = status.message ? `<p class="ui-form-controller__status-message">${escapeHTML(status.message)}</p>` : '';
  const details = Array.isArray(status.details)
    ? `<ul class="ui-form-controller__status-details">${status.details
        .map(detail => `<li>${escapeHTML(detail)}</li>`)
        .join('')}</ul>`
    : '';

  return `
    <section class="ui-form-controller__status" aria-live="polite" data-status="${escapeHTML(status.type || 'idle')}">
      ${message || details ? `${message}${details}` : '<!-- status placeholder -->'}
    </section>
  `;
}

function renderFormBody(state) {
  const layout = state?.layout || {};
  const layoutType = layout.type ? ` data-layout-type="${escapeHTML(layout.type)}"` : '';
  return `
    <section class="ui-form-controller__body">
      <div class="ui-form-controller__layout"${layoutType}>
        <!-- TODO: Render layout scaffolding (columns, groups, steps) -->
        <slot></slot>
      </div>
    </section>
  `;
}

function renderActionButton(action, role) {
  if (!action) return '';
  const id = action.id ? ` data-action-id="${escapeHTML(action.id)}"` : '';
  const type = action.type ? escapeHTML(action.type) : 'primary';
  const label = action.label ? escapeHTML(action.label) : '';
  const iconMarkup = renderIcon(action.icon);
  const loadingLabel = action.loadingLabel ? ` data-loading-label="${escapeHTML(action.loadingLabel)}"` : '';
  const successLabel = action.successLabel ? ` data-success-label="${escapeHTML(action.successLabel)}"` : '';
  const disabled = action.disabled ? ` disabled` : '';
  const visibility = action.visibleWhen ? ` data-visible-when="${escapeHTML(action.visibleWhen)}"` : '';

  return `
    <ui-button
      class="ui-form-controller__button"
      data-role="${escapeHTML(role)}"${id}${loadingLabel}${successLabel}${visibility}
      type="${type}"
      label="${label}"${disabled}
    >
      ${iconMarkup ? `<span class="ui-form-controller__button-icon">${iconMarkup}</span>` : ''}
      <span class="ui-form-controller__button-label">${label}</span>
    </ui-button>
  `;
}

function renderActions(state) {
  const actions = state?.actions || {};
  const submitMarkup = renderActionButton(actions.submit, 'submit');
  const extraActions = Array.isArray(actions.extra)
    ? actions.extra.map(action => renderActionButton(action, 'extra')).join('')
    : '';

  return `
    <footer class="ui-form-controller__actions">
      ${submitMarkup || extraActions
        ? `${submitMarkup || ''}${extraActions}`
        : '<!-- actions placeholder -->'}
    </footer>
  `;
}

function renderDebugPanel(state) {
  if (!state?.debug) return '';
  return `
    <aside class="ui-form-controller__debug">
      <details open class="ui-form-controller__debug-block">
        <summary>Текущее состояние</summary>
        <pre class="ui-form-controller__debug-state" data-debug="state"></pre>
      </details>
      <details class="ui-form-controller__debug-block">
        <summary>Sanitized payload</summary>
        <pre class="ui-form-controller__debug-payload" data-debug="payload"></pre>
      </details>
      <details class="ui-form-controller__debug-block">
        <summary>Лог валидации</summary>
        <pre class="ui-form-controller__debug-validation" data-debug="validation"></pre>
      </details>
    </aside>
  `;
}

export function renderFormControllerTemplate(state) {
  return `
    <form class="ui-form-controller" novalidate>
      ${renderHeader(state)}
      ${renderStatus(state)}
      ${renderFormBody(state)}
      ${renderActions(state)}
      ${renderDebugPanel(state)}
    </form>
  `;
}
