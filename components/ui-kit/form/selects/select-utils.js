export function escapeHTML(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function resolvePath(path) {
  if (!path) return null;
  const segments = String(path).split('.');
  let ctx = window;
  for (const segment of segments) {
    if (!ctx || typeof ctx !== 'object') return null;
    ctx = ctx[segment];
  }
  return ctx;
}

export function filterOptions(options, query, filterFnPath) {
  if (!Array.isArray(options)) return [];
  if (!query) return options;
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return options;

  if (filterFnPath) {
    const fn = typeof filterFnPath === 'function' ? filterFnPath : resolvePath(filterFnPath);
    if (typeof fn === 'function') {
      try {
        return fn(options, query) || [];
      } catch (err) {
        console.warn('[ui-select] filter function failed', err);
      }
    }
  }

  return options.filter(option => {
    const haystack = [
      option.label,
      option.description,
      option.value
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

export function formatSelectedLabels(options, values) {
  if (!Array.isArray(options)) return [];
  const valueSet = new Set(Array.isArray(values) ? values : [values]);
  return options
    .filter(opt => valueSet.has(opt.value))
    .map(opt => opt.label);
}

