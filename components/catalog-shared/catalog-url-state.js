/**
 * Catalog URL State Management
 *
 * Responsibilities:
 * - Parse and normalize catalog state from URL query parameters
 * - Serialize catalog state to URL query parameters
 * - Provide observers for URL state changes (popstate, hashchange)
 * - Handle flat key=value1,value2 URL format
 *
 * This utility is shared between toy catalog and accessory catalog.
 */

const DEFAULT_STATE = {
  limit: 30,
  search: '',
  sort: 'newest',
  filters: {},
};

// Известные ключи, которые не являются фильтрами
const knownKeys = new Set(['mode', 'offset', 'limit', 'search', 'sort', 'page', 'per_page', 'perPage']);

// Максимальное значение limit (соответствует MAX_PER_PAGE на backend)
const MAX_LIMIT = 1000;

/**
 * Parses URL query parameters into catalog state object
 * @returns {Object} Catalog state
 */
export function parse() {
  const urlParams = new URLSearchParams(window.location.search);
  const state = { ...DEFAULT_STATE };

  // Парсим известные параметры
  if (urlParams.has('limit')) {
    const limit = Math.min(Math.max(1, parseInt(urlParams.get('limit'), 10) || DEFAULT_STATE.limit), MAX_LIMIT);
    state.limit = limit;
  }

  if (urlParams.has('search')) {
    state.search = urlParams.get('search').trim();
  }

  if (urlParams.has('sort')) {
    state.sort = urlParams.get('sort');
  }

  // Парсим фильтры (все параметры, которые не являются известными ключами)
  const filters = {};
  urlParams.forEach((value, key) => {
    if (!knownKeys.has(key) && key.trim() !== '') {
      // Поддерживаем формат value1,value2 (запятые)
      const values = value.split(',').map(v => v.trim()).filter(v => v !== '');
      if (values.length > 0) {
        filters[key] = values;
      }
    }
  });
  state.filters = filters;

  return state;
}

/**
 * Serializes catalog state to URL query string
 * @param {Object} state - Catalog state
 * @param {Object} options - Options
 * @param {boolean} options.replace - Whether to replace current history entry (default: false)
 * @returns {string} Query string
 */
export function serialize(state, options = {}) {
  const params = new URLSearchParams();

  // Добавляем limit (всегда в URL)
  if (state.limit !== undefined && state.limit !== null) {
    const limit = Math.min(Math.max(1, parseInt(state.limit, 10) || DEFAULT_STATE.limit), MAX_LIMIT);
    params.set('limit', String(limit));
  }

  // Добавляем search
  if (state.search && state.search.trim()) {
    params.set('search', state.search.trim());
  }

  // Добавляем sort
  if (state.sort && state.sort !== DEFAULT_STATE.sort) {
    params.set('sort', state.sort);
  }

  // Добавляем фильтры в формате key=value1,value2
  if (state.filters && typeof state.filters === 'object') {
    Object.keys(state.filters).forEach(key => {
      const values = state.filters[key];
      if (Array.isArray(values) && values.length > 0) {
        // Заменяем %2C на запятые для лучшей читаемости URL
        const valueStr = values.join(',').replace(/%2C/g, ',');
        params.set(key, valueStr);
      }
    });
  }

  let queryString = params.toString();
  
  // Заменяем %2C на запятые в финальной строке для лучшей читаемости
  queryString = queryString.replace(/%2C/g, ',');

  return queryString;
}

/**
 * Applies catalog state to current URL
 * @param {Object} state - Catalog state
 * @param {Object} options - Options
 * @param {boolean} options.replace - Whether to replace current history entry (default: false)
 */
export function applyStateToUrl(state, options = {}) {
  const queryString = serialize(state, options);
  const newUrl = queryString
    ? `${window.location.pathname}?${queryString}`
    : window.location.pathname;

  if (options.replace) {
    window.history.replaceState({}, '', newUrl);
  } else {
    window.history.pushState({}, '', newUrl);
  }
}

/**
 * Subscribes to URL state changes (popstate, hashchange)
 * @param {Function} callback - Callback function that receives parsed state
 * @returns {Function} Unsubscribe function
 */
export function subscribe(callback) {
  const handlePopState = () => {
    const state = parse();
    callback(state);
  };

  window.addEventListener('popstate', handlePopState);

  return () => {
    window.removeEventListener('popstate', handlePopState);
  };
}

