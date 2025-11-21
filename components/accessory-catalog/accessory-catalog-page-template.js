import { renderResultsContainer } from './results/results-template.js';

export const renderAccessoryCatalogPage = () => `
  <div class="accessory-catalog-page" data-accessory-catalog-root>
    <aside class="accessory-catalog-page__sidebar" data-accessory-catalog-sidebar>
      <div class="accessory-catalog-page__placeholder">
        <p>Сайдбар фильтров</p>
      </div>
    </aside>
    <section class="accessory-catalog-page__content">
      <header class="accessory-catalog-page__toolbar" data-accessory-catalog-toolbar>
        <div class="accessory-catalog-page__placeholder">
          <p>Панель управления (поиск, сортировка)</p>
        </div>
      </header>
      <div class="accessory-catalog-page__loader" data-accessory-catalog-loader hidden>
        <block-loader label="Загрузка каталога..."></block-loader>
      </div>
      ${renderResultsContainer()}
    </section>
  </div>
`;

export const renderLoadingPlaceholder = () => `
  <div class="accessory-catalog-page__loader accessory-catalog-page__loader--inline">
    <block-loader label="Загрузка каталога..."></block-loader>
  </div>
`;

