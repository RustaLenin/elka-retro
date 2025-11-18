## Catalog Architecture Overview

This catalog experience brings together search, filtering, sorting, and infinite scrolling for both toy types and toy instances. The feature set is split across frontend UI components and backend modules coordinating WordPress queries.

### Page-Level Composition
- **`catalog-page.js`** — orchestrates sidebar, toolbar, and result list; owns URL state parsing/sync via `catalog-url-state.js`; initializes data fetching and infinite scroll.
- **`catalog-page-template.js` / `catalog-page-styles.css`** — template and styling hooks for layout, including placeholders for sidebar, toolbar, and results grid.
- **`catalog-url-state.js`** — parses, normalises, and serialises GET params; provides observers for state changes triggered by filters or pagination.
- **`catalog-data-source.js`** — abstraction over WP REST/AJAX endpoint supporting both toy type and instance mode; handles debounced search and request cancellation.

### Sidebar System
- **`sidebar/` directory** contains the composite filter panel with reusable primitives.
  - **`sidebar/catalog-sidebar.js`** — renders toggle between search modes, attaches listeners, resolves filter schema.
  - **`sidebar/sidebar-template.js` / `sidebar/sidebar-styles.css`** — layout and styling for filter column.
  - **`sidebar/mode-toggle.js`** — handles switching between “toy types” and “toy instances”.
  - **`sidebar/shared-category-filter.js`** — source for shared toy category tree filter.
  - **`sidebar/type-filters.js`** — defines filter controls specific to toy type mode.
  - **`sidebar/instance-filters.js`** — defines filter controls specific to toy instance mode, including TODO for multi-step query (types → children → instances).
  - **`sidebar/filter-registry.js`** — maps URL parameter keys to UI components and validation rules.

### Sorting & Search Controls
- **`toolbar/` directory** for controls above the results grid.
  - **`toolbar/catalog-toolbar.js`** — composes search box, sort dropdown, active filter chips.
  - **`toolbar/toolbar-template.js` / `toolbar/toolbar-styles.css`** — structure/styling.
  - **`toolbar/search-box.js`** — emits full-text search updates.
  - **`toolbar/sort-control.js`** — exposes sort options and syncs with URL state.

### Result Feed & Infinite Scroll
- **`results/catalog-results.js`** — mounts existing card components, manages virtualization/infinite scroll, merges new pages.
- **`results/results-template.js` / `results/results-styles.css`** — container markup, loading skeletons, and “no results” placeholder.
- **`results/result-card-adapter.js`** — adapts backend payloads to existing card props (toy type or instance).
- **`results/empty-state.js`** — placeholder messaging tied to current search mode.

### Backend Modules (PHP)
- **`core/catalog/catalog-loader.php`** — bootstrap hooks for REST/AJAX endpoints and script enqueueing.
- **`core/catalog/catalog-query-manager.php`** — shared helpers for building `WP_Query` arguments, applying pagination, sorting, and search term.
- **`core/catalog/catalog-toy-type-service.php`** — encapsulates toy type search logic.
- **`core/catalog/catalog-toy-instance-service.php`** — encapsulates toy instance search logic, including multi-step resolution via toy types.
- **`core/catalog/catalog-response-adapter.php`** — normalises query results for frontend cards.
- **`core/catalog/catalog-rest-controller.php`** — REST endpoint handling for asynchronous fetches and filter metadata.
- REST namespace: `elkaretro/v1`.
- **`GET /catalog/types`** — returns toy type search results and filter metadata.
- **`GET /catalog/instances`** — returns toy instance search results and metadata (after type pre-filter).
- Both endpoints accept shared query params (`mode`, `page`, `per_page`, `search`, `sort`, `filters[...]`) as documented in controller normalization helpers.

### Script & Style Loading
- Create a dedicated entry module (e.g., `components/catalog/catalog-page.js`) exposed through the theme bundler (imported inside `components/components.js` when catalog page detected).
- Register/enqueue a new script handle within `Catalog_Loader::enqueue_assets()` (conditionally when catalog template is rendered or via page ID check).
- Localize runtime settings (REST base URL, nonce, feature flags) via `wp_localize_script`.
- Enqueue companion stylesheet built from `catalog-page-styles.css`, `sidebar/sidebar-styles.css`, `toolbar/toolbar-styles.css`, and `results/results-styles.css`.
- Ensure infinite scroll dependencies (e.g., IntersectionObserver polyfills) are enqueued when older browsers demand it.

### Filter Data Sources
- `window.data_model` mirrors `core/data-model.json`; `sidebar/filter-registry.js` builds schemas by reading fields with `show_in_filters: true` for `toy_type` and `toy_instance`.
- `elkaretro_get_catalog_filter_taxonomies()` feeds the union of catalog taxonomies into `window.taxonomy_terms`, so the frontend receives ready-to-use term dictionaries without extra REST calls.
- Toy type mode consumes `occurrence`, `year_of_production`, `material`, `manufacturer`, `size`, `glass_thickness`, `mounting_type`, and the hierarchical `category-of-toys`.
- Toy instance mode consumes `authenticity`, `lot_configurations`, `property`, `condition`, `tube_condition`, `paint_type`, `color_type`, and `back_color`.
- Category filter (`shared-category-filter.js`) and any future global analytics share the same `window.taxonomy_terms` payload; additional dynamic option sources (e.g., price ranges) come from the catalog REST controller metadata endpoints.

### Open Questions / Next Steps
- Define REST route naming and authentication requirements.
- Confirm taxonomy/meta keys available for filters in both modes.
- Decide whether results feed relies on WP REST API or custom AJAX controller.
- Validate performance implications of toy instance multi-step query.

Refer to TODOs inside each placeholder file for implementation guidance.

### Backlog (Catalog-specific features)

#### Иерархический фильтр категорий (`category-of-toys`)

**Контекст:**
Таксономия `category-of-toys` иерархическая (родитель-потомок). Нужен кастомный компонент для отображения дерева категорий с возможностью:
- Раскрытия/сворачивания подпунктов
- Выбора отдельных категорий (родительских и дочерних)
- Визуального отображения иерархии (отступы, индикаторы)

**Это не универсальный компонент UI Kit**, а специфичный для каталога компонент, который:
- Не является полем формы (не интегрируется в `ui-form-controller`)
- Имеет собственную логику выбора и синхронизации с URL
- Работает напрямую с `window.taxonomy_terms['category-of-toys']`

**Планируемая реализация:**
- Компонент: `components/catalog/sidebar/category-tree-filter.js`
- Использование: в `shared-category-filter.js` для рендеринга дерева
- Интеграция: синхронизация выбранных категорий с `catalog-url-state.js`
- Визуал: дерево с чекбоксами, поддержка раскрытия/сворачивания веток

**Зависимости:**
- Данные доступны в `window.taxonomy_terms['category-of-toys']` (уже загружены)
- Структура терминов содержит поле `parent` для построения дерева (добавлено в `functions.php`)

**Документация:**
- Полная спецификация: `components/catalog/sidebar/CATEGORY_FILTER_SPEC.md`
- Backlog реализации: `components/catalog/sidebar/CATEGORY_FILTER_BACKLOG.md`

