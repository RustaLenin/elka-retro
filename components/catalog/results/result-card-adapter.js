const toStringOrEmpty = (value) => (value === undefined || value === null ? '' : String(value));
const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

export const adaptResultItem = (item = {}, mode = 'type') => {
  if (!item || typeof item !== 'object') {
    return null;
  }

  if (mode === 'instance') {
    return createInstanceCard(item);
  }

  return createTypeCard(item);
};

export const adaptResultList = (items = [], mode = 'type') =>
  items
    .map((item) => adaptResultItem(item, mode))
    .filter((node) => node !== null);

function createTypeCard(item) {
  const element = document.createElement('toy-type-card');

  if (item.id !== undefined) {
    element.setAttribute('id', toStringOrEmpty(item.id));
  }

  if (item.title) {
    element.setAttribute('title', toStringOrEmpty(item.title));
  }

  if (item.year) {
    element.setAttribute('year', toStringOrEmpty(item.year));
  }

  if (item.factory) {
    element.setAttribute('factory', toStringOrEmpty(item.factory));
  }

  if (item.rarityName) {
    element.setAttribute('rarity-name', toStringOrEmpty(item.rarityName));
  }

  if (item.rarity) {
    element.setAttribute('rarity', toStringOrEmpty(item.rarity));
  }

  if (item.image) {
    element.setAttribute('image', toStringOrEmpty(item.image));
  }

  if (item.link) {
    element.setAttribute('link', toStringOrEmpty(item.link));
  }

  if (isFiniteNumber(item.availableCount)) {
    element.setAttribute('available-count', String(item.availableCount));
  }

  if (isFiniteNumber(item.minPrice)) {
    element.setAttribute('min-price', String(item.minPrice));
  }

  if (isFiniteNumber(item.maxPrice)) {
    element.setAttribute('max-price', String(item.maxPrice));
  }

  return element;
}

function createInstanceCard(item) {
  const element = document.createElement('toy-instance-card');

  if (item.id !== undefined) {
    element.setAttribute('id', toStringOrEmpty(item.id));
  }

  if (item.title) {
    element.setAttribute('title', toStringOrEmpty(item.title));
  }

  if (isFiniteNumber(item.price)) {
    element.setAttribute('price', String(item.price));
  }

  if (item.image) {
    element.setAttribute('image', toStringOrEmpty(item.image));
  }

  if (item.rarity) {
    element.setAttribute('rarity', toStringOrEmpty(item.rarity));
  }

  if (item.tubeCondition) {
    element.setAttribute('tube-condition', toStringOrEmpty(item.tubeCondition));
  }

  if (item.condition) {
    element.setAttribute('condition', toStringOrEmpty(item.condition));
  }

  if (item.authenticity) {
    element.setAttribute('authenticity', toStringOrEmpty(item.authenticity));
  }

  if (item.status) {
    element.setAttribute('status', toStringOrEmpty(item.status));
  }

  if (item.instanceIndex) {
    element.setAttribute('instance-index', toStringOrEmpty(item.instanceIndex));
  }

  if (item.link) {
    element.setAttribute('link', toStringOrEmpty(item.link));
  }

  return element;
}
