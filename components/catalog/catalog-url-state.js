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
  limit: 30, // Сколько всего показано элементов (в URL)
  search: '',
  sort: '',
  filters: {},
});

const knownKeys = new Set(['mode', 'limit', 'search', 'sort']);

// Максимальное значение limit для backend API
const MAX_LIMIT = 1000;

const cloneState = (state = {}) => {
  const requestedLimit = state.limit || DEFAULT_STATE.limit;
  return {
    mode: state.mode || DEFAULT_STATE.mode,
    // Ограничиваем limit максимумом, чтобы предотвратить ошибки от старых больших значений
    limit: Math.min(requestedLimit, MAX_LIMIT),
    search: state.search || DEFAULT_STATE.search,
    sort: state.sort || DEFAULT_STATE.sort,
    filters: { ...(state.filters || {}) },
  };
};

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
        case 'limit':
          const requestedLimit = Math.max(1, parseInt(value, 10) || DEFAULT_STATE.limit);
          // Ограничиваем limit максимумом, чтобы предотвратить ошибки от старых больших значений
          state.limit = Math.min(requestedLimit, MAX_LIMIT);
          if (requestedLimit > MAX_LIMIT) {
            console.warn(`[catalog-url-state] Limit ${requestedLimit} from URL exceeds maximum ${MAX_LIMIT}, normalized to ${MAX_LIMIT}`);
          }
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

    if (!rawKey) {
      return;
    }

    const fragments = value
      .split(',')
      .map((fragment) => fragment.trim())
      .filter((fragment) => fragment.length > 0);

    if (!fragments.length) {
      return;
    }

    if (!state.filters[rawKey]) {
      state.filters[rawKey] = [];
    }

    state.filters[rawKey].push(...fragments);
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
  params.set('limit', String(nextState.limit));

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

      const normalized = Array.from(
        new Set(
          values
            .map((value) => {
              if (value === null || value === undefined) {
                return '';
              }
              return String(value).trim();
            })
        )
      ).filter((value) => value !== '');

      if (!normalized.length) {
        return;
      }

      params.set(key, normalized.join(','));
    });

  // Получаем строку запроса и заменяем закодированные запятые на обычные
  // для читаемости URL (запятая в значении параметра безопасна)
  const query = params.toString().replace(/%2C/g, ',');
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
