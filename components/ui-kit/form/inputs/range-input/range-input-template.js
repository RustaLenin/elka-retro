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

function renderStepper(state, field) {
  if (!state?.stepper || state.disabled || state.readonly) return '';
  const stepValue = state.stepper.step || state.step || 1;
  return `
    <div class="ui-input-range__steppers ui-input-range__steppers--${field}" data-step="${escapeAttr(stepValue)}">
      <button type="button" class="ui-input-range__stepper ui-input-range__stepper--up" data-stepper="${field}-up">
        <ui-icon name="chevron_up" size="small"></ui-icon>
      </button>
      <button type="button" class="ui-input-range__stepper ui-input-range__stepper--down" data-stepper="${field}-down">
        <ui-icon name="chevron_down" size="small"></ui-icon>
      </button>
    </div>
  `;
}

function renderClearButton(state, field) {
  if (!state?.clearable || state.disabled || state.readonly) return '';
  const value = field === 'min' ? state.minValue : state.maxValue;
  if (!value || value.trim() === '') return '';
  return `
    <button type="button" class="ui-input-range__clear" data-clear="${field}">
      <ui-icon name="close" size="small"></ui-icon>
    </button>
  `;
}

export function renderRangeInputTemplate(state) {
  const minValue = state?.minValue ?? '';
  const maxValue = state?.maxValue ?? '';
  const minPlaceholder = state?.minPlaceholder ?? '';
  const maxPlaceholder = state?.maxPlaceholder ?? '';
  const minLabel = state?.minLabel ?? 'от';
  const maxLabel = state?.maxLabel ?? 'до';
  const min = state?.min != null ? ` min="${escapeAttr(state.min)}"` : '';
  const max = state?.max != null ? ` max="${escapeAttr(state.max)}"` : '';
  const step = state?.step != null ? ` step="${escapeAttr(state.step)}"` : '';
  const disabled = state?.disabled ? ' disabled' : '';
  const readonly = state?.readonly ? ' readonly' : '';
  const nameAttr = state?.name ? ` name="${escapeAttr(state.name)}"` : '';
  const inputMode = state?.inputMode ? ` inputmode="${escapeAttr(state.inputMode)}"` : '';
  const prefix = renderAffix(state?.prefix, 'ui-input-range__prefix');
  const suffix = renderAffix(state?.suffix ?? state?.currency, 'ui-input-range__suffix');
  const minStepper = renderStepper(state, 'min');
  const maxStepper = renderStepper(state, 'max');
  const minClear = renderClearButton(state, 'min');
  const maxClear = renderClearButton(state, 'max');

  // Обёртка wrapper не нужна - стили контейнера на самом элементе ui-input-range
  // Атрибуты status и disabled применяются к самому элементу через JS
  // Но нужна структура для двух полей (min/max)
  return `
    <div class="ui-input-range__field ui-input-range__field--min">
      <label class="ui-input-range__label">${escapeAttr(minLabel)}</label>
      <div class="ui-input-range__input-wrapper">
        ${prefix}
        <input
          class="ui-input-range__control"
          type="number"
          data-range-input="min"
          value="${escapeAttr(minValue)}"
          placeholder="${escapeAttr(minPlaceholder)}"${min}${max}${step}${disabled}${readonly}${nameAttr ? ` name="${escapeAttr(state.name)}_min"` : ''}${inputMode}
        />
        ${suffix}
        ${minClear}
        ${minStepper}
      </div>
    </div>
    <div class="ui-input-range__field ui-input-range__field--max">
      <label class="ui-input-range__label">${escapeAttr(maxLabel)}</label>
      <div class="ui-input-range__input-wrapper">
        ${prefix}
        <input
          class="ui-input-range__control"
          type="number"
          data-range-input="max"
          value="${escapeAttr(maxValue)}"
          placeholder="${escapeAttr(maxPlaceholder)}"${min}${max}${step}${disabled}${readonly}${nameAttr ? ` name="${escapeAttr(state.name)}_max"` : ''}${inputMode}
        />
        ${suffix}
        ${maxClear}
        ${maxStepper}
      </div>
    </div>
  `;
}

