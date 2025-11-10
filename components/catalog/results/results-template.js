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
      <p>По вашему запросу ничего не найдено.</p>
    </div>
    <div class="catalog-results__error" data-catalog-error hidden>
      <p></p>
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

