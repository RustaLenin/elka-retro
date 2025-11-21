/**
 * Accessory Catalog Results Templates
 */

export const renderResultsContainer = () => `
  <div class="accessory-catalog-results" data-accessory-catalog-results-root>
    <div class="accessory-catalog-results__grid" data-accessory-catalog-results>
      <div class="accessory-catalog-results__grid-inner"></div>
    </div>
    <div class="accessory-catalog-results__empty" data-accessory-catalog-empty hidden>
      <div class="accessory-catalog-results__empty-content">
        <ui-icon name="search" size="large" class="accessory-catalog-results__empty-icon"></ui-icon>
        <h3 class="accessory-catalog-results__empty-title">По вашему запросу ничего не найдено</h3>
        <p class="accessory-catalog-results__empty-text">Попробуйте изменить параметры поиска или фильтры</p>
      </div>
    </div>
    <div class="accessory-catalog-results__error" data-accessory-catalog-error hidden>
      <p></p>
    </div>
    <div class="accessory-catalog-results__end-message" data-accessory-catalog-end-message hidden>
      <div class="accessory-catalog-results__end-message-content">
        <ui-icon name="info" size="medium"></ui-icon>
        <span>Больше загружать нечего</span>
      </div>
    </div>
    <div class="accessory-catalog-results__sentinel" data-accessory-catalog-sentinel></div>
  </div>
`;

export const renderLoadingSkeleton = (count = 6) => {
  const items = Array.from({ length: count }).map(
    () => `
      <div class="accessory-catalog-results__skeleton-card" aria-hidden="true">
        <div class="accessory-catalog-results__skeleton-image"></div>
        <div class="accessory-catalog-results__skeleton-line accessory-catalog-results__skeleton-line--wide"></div>
        <div class="accessory-catalog-results__skeleton-line"></div>
      </div>
    `
  );

  return `<div class="accessory-catalog-results__skeleton">${items.join('')}</div>`;
};

