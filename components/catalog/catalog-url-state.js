/**
 * Catalog URL state manager.
 *
 * Responsibilities:
 * - Parse existing query string into normalized state object.
 * - Serialize state back into URL (pushState/replaceState).
 * - Provide subscription mechanism for state change listeners.
 * - Offer helpers for merging partial updates and validating values.
 *
 * TODO:
 * - Implement parse(windowLocationSearch) returning structured state.
 * - Implement serialize(state) producing query string.
 * - Implement apply(state, { replace }) to update browser history.
 * - Implement subscribe(listener) / unsubscribe(listener).
 * - Integrate validation using filter-registry definitions.
 */

const subscribers = new Set();
const DEFAULT_STATE = Object.freeze({
  mode: 'type',
  page: 1,
  perPage: 30,
  search: '',
  sort: '',
  filters: {},
});

const knownKeys = new Set(['mode', 'page', 'per_page', 'search', 'sort']);

const cloneState = (state = {}) => ({
  mode: state.mode || DEFAULT_STATE.mode,
  page: state.page || DEFAULT_STATE.page,
  perPage: state.perPage || DEFAULT_STATE.perPage,
  search: state.search || DEFAULT_STATE.search,
  sort: state.sort || DEFAULT_STATE.sort,
  filters: { ...(state.filters || {}) },
});

export const parse = (search = '') => {
  if (!search) {
    search = typeof window !== 'undefined' ? window.location.search : '';
  }

  const params = new URLSearchParams(search.replace(/^\?/, ''));
  const state = cloneState();

  params.forEach((value, rawKey) => {
    if (knownKeys.has(rawKey)) {
      switch (rawKey) {
        case 'mode':
          state.mode = value === 'instance' ? 'instance' : 'type';
          break;
        case 'page':
          state.page = Math.max(1, parseInt(value, 10) || DEFAULT_STATE.page);
          break;
        case 'per_page':
          state.perPage = Math.max(1, parseInt(value, 10) || DEFAULT_STATE.perPage);
          break;
        case 'search':
          state.search = value.trim();
          break;
        case 'sort':
          state.sort = value.trim();
          break;
        default:
          break;
      }
      return;
    }

    if (rawKey.startsWith('filters[') && rawKey.endsWith(']')) {
      const filterKey = rawKey.slice(8, -1).trim();
      if (!filterKey) {
        return;
      }
      if (!state.filters[filterKey]) {
        state.filters[filterKey] = [];
      }
      state.filters[filterKey].push(value);
    }
  });

  Object.keys(state.filters).forEach((key) => {
    const arr = state.filters[key];
    if (!Array.isArray(arr)) {
      delete state.filters[key];
      return;
    }
    const normalized = Array.from(new Set(arr.filter((val) => typeof val === 'string' && val.trim() !== ''))).map(
      (val) => val.trim()
    );
    if (!normalized.length) {
      delete state.filters[key];
    } else {
      state.filters[key] = normalized;
    }
  });

  return state;
};

export const serialize = (state = {}) => {
  const params = new URLSearchParams();
  const nextState = cloneState(state);

  params.set('mode', nextState.mode);

  if (nextState.page > 1) {
    params.set('page', String(nextState.page));
  }

  if (nextState.perPage !== DEFAULT_STATE.perPage) {
    params.set('per_page', String(nextState.perPage));
  }

  if (nextState.search) {
    params.set('search', nextState.search);
  }

  if (nextState.sort) {
    params.set('sort', nextState.sort);
  }

  Object.keys(nextState.filters)
    .sort()
    .forEach((key) => {
      const values = nextState.filters[key];
      if (!Array.isArray(values) || !values.length) {
        return;
      }
      values.forEach((value) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(`filters[${key}]`, value);
        }
      });
    });

  const query = params.toString();
  return query ? `?${query}` : '';
};

export const applyStateToUrl = (state, { replace = false } = {}) => {
  if (typeof window === 'undefined' || !window.history || !window.location) {
    return;
  }

  const current = parse(window.location.search);
  const next = cloneState({ ...current, ...state });

  const query = serialize(next);
  const newUrl = `${window.location.pathname}${query}${window.location.hash || ''}`;

  if (replace) {
    window.history.replaceState(next, '', newUrl);
  } else {
    window.history.pushState(next, '', newUrl);
  }

  notify(next);
};

export const subscribe = (listener) => {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
};

export const notify = (state) => {
  const snapshot = cloneState(state);
  subscribers.forEach((listener) => listener(snapshot));
};

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', (event) => {
    const state = event?.state ? cloneState(event.state) : parse(window.location.search);
    notify(state);
  });
}
