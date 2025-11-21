/**
 * Accessory Catalog Result Card Adapter
 * 
 * Адаптирует данные из API в Web Components для карточек аксессуаров
 */

const toStringOrEmpty = (value) => (value === undefined || value === null ? '' : String(value));
const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

/**
 * Адаптирует один элемент аксессуара в Web Component
 * @param {Object} item - Данные аксессуара из API
 * @returns {HTMLElement|null} - Элемент ny-accessory-card или null
 */
export const adaptAccessoryCard = (item = {}) => {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const element = document.createElement('ny-accessory-card');

  if (item.id !== undefined) {
    element.setAttribute('id', toStringOrEmpty(item.id));
  }

  if (item.title) {
    element.setAttribute('title', toStringOrEmpty(item.title));
  }

  if (item.index) {
    element.setAttribute('index', toStringOrEmpty(item.index));
  }

  if (isFiniteNumber(item.price)) {
    element.setAttribute('price', String(item.price));
  }

  if (isFiniteNumber(item.stock)) {
    element.setAttribute('stock', String(item.stock));
  }

  if (item.condition) {
    element.setAttribute('condition', toStringOrEmpty(item.condition));
  }

  if (item.conditionSlug) {
    element.setAttribute('condition-slug', toStringOrEmpty(item.conditionSlug));
  }

  if (item.material) {
    element.setAttribute('material', toStringOrEmpty(item.material));
  }

  if (item.image) {
    element.setAttribute('image', toStringOrEmpty(item.image));
  }

  if (item.link) {
    element.setAttribute('link', toStringOrEmpty(item.link));
  }

  if (item.excerpt) {
    element.setAttribute('excerpt', toStringOrEmpty(item.excerpt));
  }

  return element;
};

/**
 * Адаптирует массив аксессуаров в массив Web Components
 * @param {Array} items - Массив данных аксессуаров из API
 * @returns {Array<HTMLElement>} - Массив элементов ny-accessory-card
 */
export const adaptAccessoryList = (items = []) =>
  items
    .map((item) => adaptAccessoryCard(item))
    .filter((node) => node !== null);

