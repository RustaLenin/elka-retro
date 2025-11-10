/**
 * Filter registry maps URL keys to UI components and validation rules.
 *
 * TODO:
 * - Define FILTER_KEYS constant to ensure consistent naming.
 * - Export getFiltersForMode(mode) returning array of registry entries.
 * - Provide normalize/filter helper referencing catalog-url-state validation.
 * - Include metadata (e.g., analytics identifiers, default values).
 */

export const FILTER_KEYS = {
  MODE: 'mode',
  CATEGORY: 'category',
  SEARCH: 'search',
  SORT: 'sort',
  PAGE: 'page',
  // TODO: extend with toy type + instance specific keys.
};

export const getFiltersForMode = (/* mode */) => {
  // TODO: return registry definitions like { key, control, validator }.
  return [];
};

export const normalizeFilterValue = (/* key, value */) => {
  // TODO: apply sanitization/validation per filter.
  return null;
};

