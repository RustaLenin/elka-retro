function escapeHTML(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderFormCheckboxTemplate(state) {
  const label = state?.label ?? '';
  const description = state?.description ?? '';
  const hint = state?.hint ?? '';
  const status = state?.status || 'default';
  const disabled = state?.disabled ? ' data-disabled="true"' : '';
  const required = state?.required ? '<span class="ui-form-checkbox__required">*</span>' : '';

  return `
    <label class="ui-form-checkbox__label-wrapper" data-status="${escapeHTML(status)}"${disabled}>
      <input
        class="ui-form-checkbox__control"
        type="checkbox"
        ${state?.checked ? 'checked' : ''}
        ${state?.disabled ? 'disabled' : ''}
        ${state?.required ? 'required' : ''}
        ${state?.name ? `name="${escapeHTML(state.name)}"` : ''}
        ${state?.value ? `value="${escapeHTML(state.value)}"` : ''}
        aria-checked="${state?.checked ? 'true' : 'false'}"
      />
      <span class="ui-form-checkbox__box" aria-hidden="true">
        <span class="ui-form-checkbox__box-mark"></span>
      </span>
      <span class="ui-form-checkbox__content">
        ${label ? `<span class="ui-form-checkbox__label">${escapeHTML(label)}${required}</span>` : ''}
        ${description ? `<span class="ui-form-checkbox__description">${escapeHTML(description)}</span>` : ''}
        ${hint ? `<span class="ui-form-checkbox__hint">${escapeHTML(hint)}</span>` : ''}
      </span>
    </label>
  `;
}
