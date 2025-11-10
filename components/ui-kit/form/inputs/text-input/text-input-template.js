function escapeAttribute(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;');
}

function renderPrefix(prefix) {
  if (!prefix) return '';
  return `<span class="ui-input-text__prefix">${escapeAttribute(prefix)}</span>`;
}

function renderSuffix(suffix) {
  if (!suffix) return '';
  return `<span class="ui-input-text__suffix">${escapeAttribute(suffix)}</span>`;
}

function renderClearButton(state) {
  if (!state?.clearable || state?.disabled || state?.readonly || !state?.value) return '';
  return `
    <button type="button" class="ui-input-text__clear" data-action="clear">
      <ui-icon name="close" size="small"></ui-icon>
    </button>
  `;
}

export function renderTextInputTemplate(state) {
  const value = state?.value ?? '';
  const placeholder = state?.placeholder ?? '';
  const inputType = state?.inputType || 'text';
  const disabled = state?.disabled ? ' disabled' : '';
  const readonly = state?.readonly ? ' readonly' : '';
  const maxlength = state?.maxLength != null ? ` maxlength="${escapeAttribute(state.maxLength)}"` : '';
  const autocomplete = state?.autocomplete ? ` autocomplete="${escapeAttribute(state.autocomplete)}"` : '';
  const nameAttr = state?.name ? ` name="${escapeAttribute(state.name)}"` : '';
  const inputMode = state?.inputMode ? ` inputmode="${escapeAttribute(state.inputMode)}"` : '';
  const pattern = state?.pattern ? ` pattern="${escapeAttribute(state.pattern)}"` : '';
  const prefix = renderPrefix(state?.prefix);
  const suffix = renderSuffix(state?.suffix);
  const clearButton = renderClearButton(state);
  const status = state?.status ? ` data-status="${escapeAttribute(state.status)}"` : '';
  const disabledWrapper = state?.disabled ? ' data-disabled="true"' : '';

  return `
    <label class="ui-input-text__wrapper"${status}${disabledWrapper}>
      ${prefix}
      <input
        class="ui-input-text__control"
        type="${escapeAttribute(inputType)}"
        value="${escapeAttribute(value)}"
        placeholder="${escapeAttribute(placeholder)}"${disabled}${readonly}${maxlength}${autocomplete}${nameAttr}${inputMode}${pattern}
      />
      ${suffix}
      ${clearButton}
    </label>
  `;
}
