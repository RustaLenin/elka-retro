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

export function renderFiltersSummaryTemplate(state) {
  const filters = Array.isArray(state?.filters) ? state.filters : [];
  const emptyLabel = state?.emptyLabel || 'Нет активных фильтров';

  if (filters.length === 0) {
    return `
      <div class="ui-filters-summary__empty">
        ${escapeHtml(emptyLabel)}
      </div>
    `;
  }

  const chipsHtml = filters.map(filter => {
    const label = escapeAttr(filter.label || filter.id || '');
    const value = escapeAttr(filter.value || '');
    const filterId = escapeAttr(filter.id || '');
    const removable = filter.removable !== false;
    return `
      <ui-filter-chip
        label="${label}"
        value="${value}"
        filter-id="${filterId}"
        removable="${removable ? 'true' : 'false'}"
      ></ui-filter-chip>
    `;
  }).join('');

  return `
    <div class="ui-filters-summary__wrapper">
      ${chipsHtml}
    </div>
  `;
}

