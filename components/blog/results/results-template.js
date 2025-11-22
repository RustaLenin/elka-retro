/**
 * Blog results template helpers.
 */

export const renderResultsContainer = () => `
  <div class="blog-results" data-blog-results-root>
    <div class="blog-results__grid" data-blog-results></div>
    <div class="blog-results__empty" data-blog-empty hidden>
      <div class="blog-results__empty-content">
        <ui-icon name="news" size="large" class="blog-results__empty-icon"></ui-icon>
        <h3 class="blog-results__empty-title">Постов пока нет</h3>
        <p class="blog-results__empty-text">Новости появятся здесь позже</p>
      </div>
    </div>
    <div class="blog-results__error" data-blog-error hidden>
      <p></p>
    </div>
    <div class="blog-results__end-message" data-blog-end-message hidden>
      <div class="blog-results__end-message-content">
        <ui-icon name="info" size="medium"></ui-icon>
        <span>Больше загружать нечего</span>
      </div>
    </div>
    <div class="blog-results__sentinel" data-blog-sentinel></div>
  </div>
`;

export const renderLoadingSkeleton = (count = 6) => {
  const items = Array.from({ length: count }).map(
    () => `
      <div class="blog-results__skeleton-card" aria-hidden="true">
        <div class="blog-results__skeleton-image"></div>
        <div class="blog-results__skeleton-line blog-results__skeleton-line--wide"></div>
        <div class="blog-results__skeleton-line"></div>
        <div class="blog-results__skeleton-line blog-results__skeleton-line--short"></div>
      </div>
    `
  );

  return `<div class="blog-results__skeleton">${items.join('')}</div>`;
};

