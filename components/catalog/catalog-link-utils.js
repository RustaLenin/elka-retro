/**
 * Catalog Link Utilities
 * 
 * Утилиты для формирования ссылок на каталог с фильтрами.
 * 
 * Responsibilities:
 * - Формирование URL каталога с параметрами фильтров
 * - Создание ссылок на таксономии с применением фильтров
 * - Нормализация значений фильтров (ID, массив, строка)
 * 
 * URL Format:
 * - `/catalog/?mode=type&category-of-toys=71,80&material=1`
 * - Плоский формат `key=value1,value2` (без `filters[key][]`)
 */

/**
 * Получить базовый URL каталога
 * @returns {string} Базовый URL каталога
 */
function getCatalogBaseUrl() {
  // TODO: Возможно, нужно получать из PHP через wp_localize_script
  // Пока используем хардкод, так как это стандартный путь
  return '/catalog/';
}

/**
 * Получить базовый URL каталога аксессуаров
 * @returns {string} Базовый URL каталога аксессуаров
 */
function getAccessoryCatalogBaseUrl() {
  // TODO: Возможно, нужно получать из PHP через wp_localize_script
  // Пока используем хардкод
  return '/accessories/';
}

/**
 * Формирует URL каталога с фильтрами
 * 
 * @param {Object} filters - Объект с фильтрами { 'category-of-toys': [71, 80], 'material': [1] }
 * @param {Object} options - Опции для формирования URL
 * @param {string} [options.mode='type'] - Режим каталога ('type' | 'instance')
 * @param {string} [options.baseUrl] - Базовый URL (по умолчанию '/catalog/')
 * @param {string} [options.search] - Поисковый запрос
 * @param {string} [options.sort] - Сортировка
 * @param {number} [options.limit] - Лимит элементов (для shared links)
 * @returns {string} Полный URL каталога с параметрами
 * 
 * @example
 * getCatalogUrl({ 'category-of-toys': [71, 80], 'material': [1] })
 * // => '/catalog/?mode=type&category-of-toys=71,80&material=1'
 */
export function getCatalogUrl(filters = {}, options = {}) {
  const {
    mode = 'type',
    baseUrl = getCatalogBaseUrl(),
    search = '',
    sort = '',
    limit = undefined,
  } = options;

  const params = new URLSearchParams();

  // Обязательные параметры
  params.set('mode', mode);
  
  if (limit !== undefined) {
    params.set('limit', String(limit));
  }

  if (search) {
    params.set('search', search);
  }

  if (sort) {
    params.set('sort', sort);
  }

  // Добавляем фильтры в плоском формате
  Object.keys(filters)
    .sort() // Сортируем для единообразия
    .forEach((key) => {
      const values = filters[key];
      if (!values || (Array.isArray(values) && values.length === 0)) {
        return;
      }

      // Нормализуем значения в массив
      const valuesArray = Array.isArray(values) ? values : [values];
      
      // Фильтруем пустые значения и преобразуем в строки
      const normalized = valuesArray
        .map((v) => {
          if (v === null || v === undefined) {
            return '';
          }
          return String(v).trim();
        })
        .filter((v) => v !== '');

      if (normalized.length > 0) {
        // Используем запятые вместо %2C для читаемости URL
        params.set(key, normalized.join(','));
      }
    });

  // Получаем строку запроса и заменяем закодированные запятые на обычные
  const query = params.toString().replace(/%2C/g, ',');
  
  return `${baseUrl}${query ? `?${query}` : ''}`;
}

/**
 * Формирует URL каталога с фильтром по таксономии
 * 
 * @param {string} taxonomySlug - Slug таксономии (например, 'category-of-toys')
 * @param {string|number|Array<string|number>} termId - ID термина (или массив ID)
 * @param {Object} options - Опции для формирования URL
 * @param {string} [options.mode='type'] - Режим каталога ('type' | 'instance')
 * @param {string} [options.baseUrl] - Базовый URL (по умолчанию '/catalog/')
 * @param {boolean} [options.multiple=false] - Если true, добавляет к существующим фильтрам, иначе заменяет
 * @param {Object} [options.existingFilters={}] - Существующие фильтры (для multiple=true)
 * @returns {string} URL каталога с фильтром по таксономии
 * 
 * @example
 * getCatalogTaxonomyUrl('category-of-toys', 71)
 * // => '/catalog/?mode=type&category-of-toys=71'
 * 
 * getCatalogTaxonomyUrl('condition', [1, 2], { mode: 'instance' })
 * // => '/catalog/?mode=instance&condition=1,2'
 */
export function getCatalogTaxonomyUrl(taxonomySlug, termId, options = {}) {
  const {
    mode = 'type',
    baseUrl = getCatalogBaseUrl(),
    multiple = false,
    existingFilters = {},
  } = options;

  if (!taxonomySlug || !termId) {
    return getCatalogUrl({}, { mode, baseUrl });
  }

  // Нормализуем termId в массив
  const termIdsArray = Array.isArray(termId) ? termId : [termId];
  
  // Преобразуем в строки (ID всегда строки)
  const normalizedIds = termIdsArray.map(id => String(id)).filter(id => id !== '');

  if (normalizedIds.length === 0) {
    return getCatalogUrl({}, { mode, baseUrl });
  }

  // Формируем объект фильтров
  const filters = { ...existingFilters };

  if (multiple && existingFilters[taxonomySlug]) {
    // Добавляем к существующим значениям
    const existing = Array.isArray(existingFilters[taxonomySlug]) 
      ? existingFilters[taxonomySlug] 
      : [existingFilters[taxonomySlug]];
    
    // Объединяем и убираем дубликаты
    const combined = [...existing, ...normalizedIds];
    filters[taxonomySlug] = Array.from(new Set(combined));
  } else {
    // Заменяем существующие значения
    filters[taxonomySlug] = normalizedIds;
  }

  return getCatalogUrl(filters, { mode, baseUrl });
}

/**
 * Формирует URL каталога аксессуаров с фильтрами (без mode)
 * 
 * @param {Object} filters - Объект с фильтрами { 'ny_category': [71, 80], 'material': [1] }
 * @param {Object} options - Опции для формирования URL
 * @param {string} [options.baseUrl] - Базовый URL (по умолчанию '/accessories/')
 * @param {string} [options.search] - Поисковый запрос
 * @param {string} [options.sort] - Сортировка
 * @param {number} [options.limit] - Лимит элементов (для shared links)
 * @returns {string} Полный URL каталога аксессуаров с параметрами
 * 
 * @example
 * getAccessoryCatalogUrl({ 'ny_category': [71, 80], 'material': [1] })
 * // => '/accessories/?ny_category=71,80&material=1'
 */
export function getAccessoryCatalogUrl(filters = {}, options = {}) {
  const {
    baseUrl = getAccessoryCatalogBaseUrl(),
    search = '',
    sort = '',
    limit = undefined,
  } = options;

  const params = new URLSearchParams();
  
  if (limit !== undefined) {
    params.set('limit', String(limit));
  }

  if (search) {
    params.set('search', search);
  }

  if (sort) {
    params.set('sort', sort);
  }

  // Добавляем фильтры в плоском формате (без mode)
  Object.keys(filters)
    .sort() // Сортируем для единообразия
    .forEach((key) => {
      const values = filters[key];
      if (!values || (Array.isArray(values) && values.length === 0)) {
        return;
      }

      // Нормализуем значения в массив
      const valuesArray = Array.isArray(values) ? values : [values];
      
      // Фильтруем пустые значения и преобразуем в строки
      const normalized = valuesArray
        .map((v) => {
          if (v === null || v === undefined) {
            return '';
          }
          return String(v).trim();
        })
        .filter((v) => v !== '');

      if (normalized.length > 0) {
        // Используем запятые вместо %2C для читаемости URL
        params.set(key, normalized.join(','));
      }
    });

  // Получаем строку запроса и заменяем закодированные запятые на обычные
  const query = params.toString().replace(/%2C/g, ',');
  
  return `${baseUrl}${query ? `?${query}` : ''}`;
}

/**
 * Формирует URL каталога аксессуаров с фильтром по таксономии (без mode)
 * 
 * @param {string} taxonomySlug - Slug таксономии (например, 'ny_category')
 * @param {string|number|Array<string|number>} termId - ID термина (или массив ID)
 * @param {Object} options - Опции для формирования URL
 * @param {string} [options.baseUrl] - Базовый URL (по умолчанию '/accessories/')
 * @param {boolean} [options.multiple=false] - Если true, добавляет к существующим фильтрам, иначе заменяет
 * @param {Object} [options.existingFilters={}] - Существующие фильтры (для multiple=true)
 * @returns {string} URL каталога аксессуаров с фильтром по таксономии
 * 
 * @example
 * getAccessoryCatalogTaxonomyUrl('ny_category', 71)
 * // => '/accessories/?ny_category=71'
 * 
 * getAccessoryCatalogTaxonomyUrl('condition', [1, 2])
 * // => '/accessories/?condition=1,2'
 */
export function getAccessoryCatalogTaxonomyUrl(taxonomySlug, termId, options = {}) {
  const {
    baseUrl = getAccessoryCatalogBaseUrl(),
    multiple = false,
    existingFilters = {},
  } = options;

  if (!taxonomySlug || !termId) {
    return getAccessoryCatalogUrl({}, { baseUrl });
  }

  // Нормализуем termId в массив
  const termIdsArray = Array.isArray(termId) ? termId : [termId];
  
  // Преобразуем в строки (ID всегда строки)
  const normalizedIds = termIdsArray.map(id => String(id)).filter(id => id !== '');

  if (normalizedIds.length === 0) {
    return getAccessoryCatalogUrl({}, { baseUrl });
  }

  // Формируем объект фильтров
  const filters = { ...existingFilters };

  if (multiple && existingFilters[taxonomySlug]) {
    // Добавляем к существующим значениям
    const existing = Array.isArray(existingFilters[taxonomySlug]) 
      ? existingFilters[taxonomySlug] 
      : [existingFilters[taxonomySlug]];
    
    // Объединяем и убираем дубликаты
    const combined = [...existing, ...normalizedIds];
    filters[taxonomySlug] = Array.from(new Set(combined));
  } else {
    // Заменяем существующие значения
    filters[taxonomySlug] = normalizedIds;
  }

  return getAccessoryCatalogUrl(filters, { baseUrl });
}

