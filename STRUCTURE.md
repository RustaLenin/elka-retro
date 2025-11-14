# ElkaRetro Theme Structure

High-level map of the theme directory with brief responsibility notes for each part. Use it as a quick primer when navigating the codebase.

## Root (WordPress Template Entry Points)
- `404.php` – layout for not-found pages.
- `archive.php` / `category.php` / `tag.php` – archive listings for posts and taxonomies.
- `author.php` – author archive view.
- `comments.php` – rendering of the comment list and form.
- `footer.php` / `header.php` – shared footer and header markup.
- `functions.php` – defines constants, loads theme bootstrap code from `core/`, registers assets/components.
- `index.php` – default fallback template.
- `page.php` / `page-blog.php` / `page-catalog.php` / `page-profile.php` – page-level templates, the catalog one bootstraps the JS catalog experience.
- `page-catalog.php` – WordPress page template that prepares data for catalog components.
- `page-blog.php` – template for the blog index.
- `page-profile.php` – template for user profile page, bootstraps profile components.
- `page-cart.php` – template for the cart page, bootstraps cart components.
- `single.php` – default single post layout.
- `single-ny_accessory.php` / `single-toy_type.php` – single templates for custom post types.
- `search.php` – search results page.
- `style.css` – theme metadata and global stylesheet.
- `README.md` / `LICENSE` – project meta.
- `screenshot.jpg` – theme preview image.

## `app/`
- `app.js` – attaches the global `window.app` namespace (toolkit utilities, cart, navigation helpers, modal loader, and page state manager).

## `assets/`
- `img/` – theme static imagery referenced by templates and blocks.

## `components/` (Custom Web Components and UI modules)
- `components.js` – eagerly registers global UI-kit pieces and lazy-loads page-specific components based on `elkaretro-required-components`.
- `components.css` – shared styles for component wrappers.
- `base-element.js` – base class helpers for custom elements.
- `GLOBAL_STATE_MANAGEMENT.md` – notes about shared JS state usage.
- `WP_COMPONENTS_ARCHITECTURE.md` – overview of component patterns.
- `WP_DATA_MODEL.md` – documentation of the data-model JSON.
- `WP_PODS_REST_API.md` – REST integration notes.
- `UI_KIT_USAGE_RULES.md` – **обязательные правила использования UI-Kit компонентов для стилистического единства проекта.**
- `catalog/`
  - `README.md` – usage notes for the catalog block.
  - `index.js` – entry point that wires catalog submodules.
  - `catalog-page.js` / `catalog-page-template.js` / `catalog-page-styles.css` – container component for the catalog page layout, templating, and styling.
  - `catalog-data-source.js` – fetches catalog data from REST endpoints.
  - `catalog-url-state.js` – manages URL/query parameters for filters and pagination.
  - `results/` – rendering of catalog result lists:
    - `catalog-results.js` – main results renderer that consumes the data source.
    - `result-card-adapter.js` – converts backend payloads into card props.
    - `empty-state.js` – UI for empty search results.
    - `results-template.js` / `results-styles.css` – markup and styles for the results list.
  - `sidebar/` – filter sidebar implementations:
    - `catalog-sidebar.js` – wrapper component for sidebar toggling.
    - `filter-registry.js` – maps filter types to UI components.
    - `instance-filters.js` / `type-filters.js` – filter groups for toy instances and types.
    - `shared-category-filter.js` – reusable category filter widget.
    - `mode-toggle.js` – switches between view modes (types vs instances).
    - `sidebar-template.js` / `sidebar-styles.css` – layout and style definitions.
  - `toolbar/`
    - `catalog-toolbar.js` – container for search, sorting, and view controls.
    - `search-box.js` – search input component tied to URL state.
    - `sort-control.js` – sorting selector component.
    - `toolbar-template.js` / `toolbar-styles.css` – presentation assets.
- `category-breadcrumbs/` – breadcrumb component to show category ancestry.
  - `category-breadcrumbs.js` with template/styles companions.
- `category-catalog/` – section combining category info and catalog preview.
- `category-filter-modal/` – modal component for mobile filter UX (JS/CSS parallels).
- `navigation/`
  - `site-header/`, `site-footer/`, `nav-link/` – nav shell components with templates and styles to manage menus and links.
- `pages/`
  - `page/` – default WP page component.
  - `error-page/` – route for error handling (404/maintenance).
- `posts/`
  - `post-card/` – list card component used in archives (JS/template/styles).
  - `post-single/` – single article layout component.
- `toy-type/`, `toy-instance/`, `ny-accessory/`
  - `*-card/` – card presentation for catalog lists.
  - `*-single/` or `*-modal/` – detail views and modal interactions per entity.
- `user-profile/` – user profile and authentication module:
  - `README.md` / `BACKLOG.md` – module documentation and task list.
  - `modals/` – authentication modal forms (login, register, password reset) using `ui-modal` and `ui-form-controller`.
  - `profile-page/` – main profile page component with tabs:
    - `tabs/` – tab components (settings, order history, contact form).
    - `tab-navigation/` – tab switcher component.
  - `services/` – JavaScript services for auth and user data (auth-service.js, user-service.js, profile-api-adapter.js).
- `cart/` – shopping cart and order management:
  - `README.md` – documentation for cart and order functionality.
  - `BACKLOG.md` – task list for cart and order implementation.
  - `QUESTIONS.md` – questions for requirements clarification.
  - `cart-page/` – main cart page component (JS/template/styles).
  - `cart-item/` – individual cart item component.
  - `cart-summary/` – cart totals, discounts, and fees display.
  - `order-wizard/` – multi-step order checkout wizard with branching for auth/guest.
  - `cart-store.js` – centralized cart state management.
  - `cart-service.js` – cart business logic (add/remove, calculations).
  - `order-service.js` – order business logic (create, retrieve, status updates).
  - `commission-rules.js` – commission trading rules validation (reservation, fees, discounts, VIP).
  - `cart-api-adapter.js` / `order-api-adapter.js` – REST API data adapters.
- `ui-kit/` – reusable design system primitives:
  - `README.md` – explains extending the kit.
  - `button/`, `icon/`, `loader/`, `modal/`, `notification/`, `tooltip/`, `image-gallery/` – each folder keeps a JS custom element and matching CSS (plus README where needed).
  - `form/`
    - `README.md` – data flow and extension guide.
    - `controller/` – orchestrates form lifecycle, validation hooks, async submit pipeline.
    - `field/` – wrapper element that binds inputs with labels, errors, and help texts.
    - `checkbox/`, `inputs/text-input/`, `inputs/number-input/` – concrete input elements with templates/styles.
    - `selects/select-single` & `selects/select-multi` – dropdown components and helpers (`select-utils.js`).
    - `helpers/` – utility modules: `data-sanitizer.js`, `form-pipeline.js`, `form-storage.js`, `validation-registry.js`, etc., encapsulating validation, persistence, and config adaptation.

## `core/` (PHP Bootstrap and Domain Logic)
- `setup.php` – registers theme supports, widgets, scripts, and custom post status handling.
- `default_controller.php` – base controller helpers for template rendering.
- `theme-settings.php` – centralised theme option definitions and getters.
- `filters/content.php` – WordPress filter callbacks for content formatting.
- `catalog/`
  - `catalog-rest-controller.php` – REST routes exposing catalog data.
  - `catalog-loader.php` – bootstraps catalog services and wiring.
  - `catalog-query-manager.php` – builds WP_Query instances based on filters.
  - `catalog-response-adapter.php` – shapes REST responses for frontend consumption.
  - `catalog-toy-instance-service.php` / `catalog-toy-type-service.php` – domain services wrapping WP data access for catalog entities.
- `user-profile/` (planned)
  - `user-profile-rest-controller.php` – REST routes for user profile, authentication, and contact messages.
  - `user-profile-loader.php` – bootstraps user profile module and registers REST endpoints.
- `cart/`
  - `cart-rest-controller.php` – REST routes for cart operations (get, add, remove, sync).
  - `cart-service.php` – cart business logic on backend (validation, reservation management).
- `orders/`
  - `order-rest-controller.php` – REST routes for order operations (create, get, list, status updates).
  - `order-service.php` – order business logic (creation via PODS, reservation, email notifications).
  - `order-email-templates.php` – email templates for order notifications (admin and customer).
- `taxonomy-sync.php` – synchronises taxonomy terms from production via REST API.
- `instances-counter.php` – utility for counting toy instances per grouping.
- `instances-duplicates-merger.php` – merges duplicate instance entries in datasets.
- `mock-data-installer.php` – seeds local WP install with fixtures.
- `publishing-script.php` – helper for deployment/publishing tasks.
- `setup.php` – theme registration entry (see above).
- `mock-data/`
  - `fixtures.php` – static mock data set used for local dev.
  - `images/` – placeholder imagery referenced by fixtures.
  - `README.md` / `DEVELOPMENT_GUIDE.md` – documentation for mock-data usage.
- `data-model.json` – canonical representation of CPTs, taxonomies, and statuses used by PHP and JS.

## `modules/` (Standalone WordPress helpers)
- `dereg.php` – removes unused WP assets/features.
- `kama_breadcrumbs.php` – integration with Kama Breadcrumbs plugin helpers.
- `quick_tags.php` – defines TinyMCE quicktag buttons or admin editor helpers.

## `languages/`
- `*.po`, `*.mo`, `theme.pot` – translation catalogues for English and Russian strings.

## `template-parts/`
- `latest-ny-accessories.php`, `latest-toy-types.php`, `latest-posts.php` – partials rendering latest content blocks.
- `post_card.php` / `post_single.php` – server-rendered fallbacks matching JS components.
- `site-info-content.php` – footer/site info snippet.

## Additional Files
- `app/app.js` (see above) cooperates closely with components and templates.
- `core/setup.php`, `core/theme-settings.php`, and `functions.php` are the primary entry points to review first when wiring new features.
- WordPress templates (`page-*.php`, `single-*.php`) define which JS components to enqueue and prepare server data for the frontend.

Use this document as a starting point; for in-depth component behaviour, open the respective folder’s README or main JS/PHP file noted above.

