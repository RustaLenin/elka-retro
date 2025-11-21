/**
 * Results template helpers.
 *
 * TODO:
 * - Export renderResultsContainer() returning root markup with sentinel element.
 * - Export renderLoadingSkeleton(count) for placeholder cards.
 * - Export renderError(message) and renderEmpty(state).
 */

export const renderResultsContainer = () => `
  <div class="catalog-results" data-catalog-results-root>
    <div class="catalog-results__grid" data-catalog-results></div>
    <div class="catalog-results__empty" data-catalog-empty hidden>
      <div class="catalog-results__empty-content">
        <ui-icon name="search" size="large" class="catalog-results__empty-icon"></ui-icon>
        <h3 class="catalog-results__empty-title">По вашему запросу ничего не найдено</h3>
        <p class="catalog-results__empty-text">Попробуйте изменить параметры поиска или фильтры</p>
      </div>
    </div>
    <div class="catalog-results__error" data-catalog-error hidden>
      <p></p>
    </div>
    <div class="catalog-results__end-message" data-catalog-end-message hidden>
      <div class="catalog-results__end-message-content">
        <ui-icon name="info" size="medium"></ui-icon>
        <span>Больше загружать нечего</span>
      </div>
    </div>
    <div class="catalog-results__sentinel" data-catalog-sentinel></div>
  </div>
`;

export const renderLoadingSkeleton = (count = 6) => {
  const items = Array.from({ length: count }).map(
    () => `
      <div class="catalog-results__skeleton-card" aria-hidden="true">
        <div class="catalog-results__skeleton-image"></div>
        <div class="catalog-results__skeleton-line catalog-results__skeleton-line--wide"></div>
        <div class="catalog-results__skeleton-line"></div>
      </div>
    `
  );

  return `<div class="catalog-results__skeleton">${items.join('')}</div>`;
};

