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

export function renderFilterChipTemplate(state) {
  const label = escapeHtml(state?.label ?? '');
  const value = escapeHtml(state?.value ?? '');
  const removable = state?.removable !== false;
  const showRemove = removable && value !== '';

  // Обёртка не нужна - стили контейнера на самом элементе ui-filter-chip
  // Атрибуты role="button" и tabindex="0" применяются к самому элементу через JS
  // Просто возвращаем содержимое напрямую
  return `
    <span class="ui-filter-chip__label">${label}</span>
    ${value ? `<span class="ui-filter-chip__separator">:</span>` : ''}
    ${value ? `<span class="ui-filter-chip__value">${value}</span>` : ''}
    ${showRemove ? `
      <button type="button" class="ui-filter-chip__remove" data-action="remove" aria-label="Удалить фильтр">
        <ui-icon name="close" size="small"></ui-icon>
      </button>
    ` : ''}
  `;
}

