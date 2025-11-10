function escapeAttr(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;');
}

function renderAffix(content, className) {
  if (!content) return '';
  return `<span class="${className}">${escapeAttr(content)}</span>`;
}

function renderStepper(state) {
  if (!state?.stepper || state.disabled || state.readonly) return '';
  const stepValue = state.stepper.step || state.step || 1;
  return `
    <div class="ui-input-number__steppers" data-step="${escapeAttr(stepValue)}">
      <button type="button" class="ui-input-number__stepper ui-input-number__stepper--up" data-action="increment">
        <ui-icon name="chevron_up" size="small"></ui-icon>
      </button>
      <button type="button" class="ui-input-number__stepper ui-input-number__stepper--down" data-action="decrement">
        <ui-icon name="chevron_down" size="small"></ui-icon>
      </button>
    </div>
  `;
}

export function renderNumberInputTemplate(state) {
  const value = state?.value ?? '';
  const placeholder = state?.placeholder ?? '';
  const min = state?.min != null ? ` min="${escapeAttr(state.min)}"` : '';
  const max = state?.max != null ? ` max="${escapeAttr(state.max)}"` : '';
  const step = state?.step != null ? ` step="${escapeAttr(state.step)}"` : '';
  const disabled = state?.disabled ? ' disabled' : '';
  const readonly = state?.readonly ? ' readonly' : '';
  const nameAttr = state?.name ? ` name="${escapeAttr(state.name)}"` : '';
  const inputMode = state?.inputMode ? ` inputmode="${escapeAttr(state.inputMode)}"` : '';
  const prefix = renderAffix(state?.prefix, 'ui-input-number__prefix');
  const suffix = renderAffix(state?.suffix ?? state?.currency, 'ui-input-number__suffix');
  const stepper = renderStepper(state);
  const status = state?.status ? ` data-status="${escapeAttr(state.status)}"` : '';
  const disabledWrapper = state?.disabled ? ' data-disabled="true"' : '';

  return `
    <label class="ui-input-number__wrapper"${status}${disabledWrapper}>
      ${prefix}
      <input
        class="ui-input-number__control"
        type="number"
        value="${escapeAttr(value)}"
        placeholder="${escapeAttr(placeholder)}"${min}${max}${step}${disabled}${readonly}${nameAttr}${inputMode}
      />
      ${suffix}
      ${stepper}
    </label>
  `;
}
