function escapeHTML(value) {
  if (value == null) return '';
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
  return `<ui-icon class="ui-form-field__icon" name="${name}"${position}${color}${onClick}></ui-icon>`;
}

function renderLabel(state) {
  const label = state?.label;
  const required = state?.required;
  const description = state?.description;
  const hints = state?.hints || {};
  const iconMarkup = renderIcon(state?.icon);

  if (!label && !description && !iconMarkup) {
    return '<div class="ui-form-field__label-wrapper" hidden></div>';
  }

  return `
    <div class="ui-form-field__label-wrapper">
      ${iconMarkup ? `<span class="ui-form-field__label-icon">${iconMarkup}</span>` : ''}
      ${label ? `<label class="ui-form-field__label">${escapeHTML(label)}${required ? '<span class="ui-form-field__required">*</span>' : ''}</label>` : ''}
      ${description ? `<p class="ui-form-field__description">${escapeHTML(description)}</p>` : ''}
      ${hints.field ? `<p class="ui-form-field__hint">${escapeHTML(hints.field)}</p>` : ''}
    </div>
  `;
}

function renderFeedback(messages) {
  if (!messages || (!messages.error?.length && !messages.success?.length && !messages.info?.length)) {
    return '<div class="ui-form-field__feedback" hidden></div>';
  }

  const sections = ['error', 'success', 'info']
    .map(type => {
      const list = Array.isArray(messages[type]) ? messages[type] : [];
      if (!list.length) return '';
      return `
        <ul class="ui-form-field__feedback-list ui-form-field__feedback-list--${type}">
          ${list.map(msg => `<li>${escapeHTML(msg)}</li>`).join('')}
        </ul>
      `;
    })
    .join('');

  return `
    <div class="ui-form-field__feedback">
      ${sections}
    </div>
  `;
}

function renderTooltip(tooltip) {
  if (!tooltip || !tooltip.content) return '';
  return `
    <ui-tooltip class="ui-form-field__tooltip"
      data-trigger="info"
      data-position="${escapeHTML(tooltip.position || 'right')}"
      data-variant="${escapeHTML(tooltip.variant || 'neutral')}"
    >
      ${escapeHTML(tooltip.content)}
    </ui-tooltip>
  `;
}

export function renderFormFieldTemplate(state) {
  const status = state?.status || 'default';
  const disabled = state?.disabled ? ' data-disabled="true"' : '';
  const messages = {
    error: state?.messages?.error || [],
    success: state?.messages?.success || [],
    info: state?.messages?.info || []
  };

  return `
    <div class="ui-form-field ui-form-field--${escapeHTML(status)}"${disabled}>
      ${renderLabel(state)}
      <div class="ui-form-field__control">
        <slot></slot>
        ${renderTooltip(state?.tooltip)}
      </div>
      ${renderFeedback(messages)}
    </div>
  `;
}
