import { renderResultsContainer } from './results/results-template.js';

export const renderCatalogPage = () => `
  <div class="catalog-page" data-catalog-root>
    <aside class="catalog-page__sidebar" data-catalog-sidebar>
      <div class="catalog-page__placeholder">
        <p>Сайдбар фильтров</p>
      </div>
    </aside>
    <section class="catalog-page__content">
      <header class="catalog-page__toolbar" data-catalog-toolbar>
        <div class="catalog-page__placeholder">
          <p>Панель управления (поиск, сортировка)</p>
        </div>
      </header>
      <div class="catalog-page__loader" data-catalog-loader hidden>
        <block-loader label="Загрузка каталога..."></block-loader>
      </div>
      ${renderResultsContainer()}
    </section>
  </div>
`;

export const renderLoadingPlaceholder = () => `
  <div class="catalog-page__loader catalog-page__loader--inline">
    <block-loader label="Загрузка каталога..."></block-loader>
  </div>
`;
