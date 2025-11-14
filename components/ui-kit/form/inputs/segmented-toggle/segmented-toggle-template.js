function escapeAttr(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeHtml(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderSegmentedToggleTemplate(state) {
  const options = Array.isArray(state?.options) ? state.options : [];
  const value = state?.value ?? '';
  const disabled = state?.disabled ? ' disabled' : '';

  const optionsHtml = options.map(opt => {
    const optValue = escapeAttr(opt.value ?? '');
    const optLabel = escapeHtml(opt.label ?? optValue);
    const isActive = optValue === value;
    return `
      <button
        type="button"
        class="ui-segmented-toggle__option${isActive ? ' ui-segmented-toggle__option--active' : ''}"
        data-option="${optValue}"
        aria-selected="${isActive ? 'true' : 'false'}"
        role="tab"
        ${disabled}
      >${optLabel}</button>
    `;
  }).join('');

  // Обёртка не нужна - стили контейнера на самом элементе ui-segmented-toggle
  // Атрибуты role="tablist", name, status и disabled применяются к самому элементу через JS
  // Просто возвращаем содержимое напрямую
  return optionsHtml;
}

