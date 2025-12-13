// Registry for page-specific components (extend as components are added)
// Загружаем все статические компоненты через статические импорты
// Navigation blocks
import './navigation/site-header/site-header.js';
import './navigation/site-footer/site-footer.js';
import './navigation/nav-link/nav-link.js';

// UI-Kit components (load on all pages)
import './ui-kit/icon/icon.js';
import './ui-kit/loader/loader.js';
import './ui-kit/notification/notification.js';
import './ui-kit/button/button.js';
import './ui-kit/tooltip/tooltip.js';
import './ui-kit/modal/modal.js';
import './ui-kit/image-gallery/image-gallery.js';
import './ui-kit/tabs/ui-tabs.js';
import './ui-kit/form/controller/form-controller.js';
import './ui-kit/form/field/form-field.js';
import './ui-kit/form/inputs/text-input/text-input.js';
import './ui-kit/form/inputs/number-input/number-input.js';
import './ui-kit/form/inputs/range-input/range-input.js';
import './ui-kit/form/inputs/segmented-toggle/segmented-toggle.js';
import './ui-kit/form/selects/select-single/select-single.js';
import './ui-kit/form/selects/select-multi/select-multi.js';
import './ui-kit/form/checkbox/form-checkbox.js';
import './ui-kit/form/chips/filter-chip/filter-chip.js';
import './ui-kit/form/chips/filters-summary/filters-summary.js';
import './catalog/sidebar/category-tree-filter.js';

// Pages
import './pages/page/page.js';
import './pages/error-page/error-page.js';

// Posts
import './posts/post-card/post-card.js';
import './posts/post-single/post-single.js';

// Toy Type
import './toy-type/toy-type-card/toy-type-card.js';
import './toy-type/toy-type-single/toy-type-single.js';

// Toy Instance
import './toy-instance/toy-instance-card/toy-instance-card.js';
import './toy-instance/toy-instance-modal/toy-instance-modal.js';

// Ny Accessory
import './ny-accessory/ny-accessory-card/ny-accessory-card.js';
import './ny-accessory/ny-accessory-single/ny-accessory-single.js';

// Catalog
import './catalog/index.js';

// Accessory Catalog
import './accessory-catalog/index.js';

// Blog
import './blog/index.js';

// Category
import './category-breadcrumbs/category-breadcrumbs.js';
import './category-catalog/category-catalog.js';

// User Profile
import './user-profile/user-menu/user-menu.js';
import './user-profile/profile-page/profile-page.js';
import './user-profile/profile-page/tabs/order-history/order-history.js';
import './user-profile/profile-page/tabs/order-history/order-card/order-card.js';

// Homepage Tabs
import './homepage-tabs/homepage-tabs-content.js';

// Cart
import './cart/index.js';
import './cart/cart-item/cart-item.js';
import './cart/cart-summary/cart-summary.js';
import './cart/order-wizard/order-wizard.js';
import './cart/order-wizard/steps/step-auth.js';
import './cart/order-wizard/steps/step-personal.js';
import './cart/order-wizard/steps/step-logistics.js';
import './cart/order-wizard/steps/step-payment.js';
import './cart/order-wizard/steps/step-confirmation.js';
// New Order Flow (loaded dynamically, but register for consistency)
import './cart/order-flow/order-flow.js';
import './cart/order-flow/steps/delivery-step.js';
import './cart/order-flow/steps/review-step.js';

const registry = {
  // Pages - компоненты уже загружены статически
  'wp-page': () => Promise.resolve(),
  'error-page': () => Promise.resolve(),
  
  // Posts - компоненты уже загружены статически
  'post-card': () => Promise.resolve(),
  'post-single': () => Promise.resolve(),
  
  // Toy Type - компоненты уже загружены статически
  'toy-type-card': () => Promise.resolve(),
  'toy-type-single': () => Promise.resolve(),
  
  // Toy Instance - компоненты уже загружены статически
  'toy-instance-card': () => Promise.resolve(),
  'toy-instance-modal': () => Promise.resolve(),
  
  // Ny Accessory - компоненты уже загружены статически
  'ny-accessory-card': () => Promise.resolve(),
  'ny-accessory-single': () => Promise.resolve(),
  
  // Catalog - компоненты уже загружены статически
  'catalog-page': () => Promise.resolve(),
  
  // Accessory Catalog - компоненты уже загружены статически
  'accessory-catalog-page': () => Promise.resolve(),
  
  // Blog - компоненты уже загружены статически
  'blog-page': () => Promise.resolve(),
  
  // Category - компоненты уже загружены статически
  'category-breadcrumbs': () => Promise.resolve(),
  'category-catalog': () => Promise.resolve(),
  
  // User Profile - компоненты уже загружены статически
  'user-menu': () => Promise.resolve(),
  'profile-page': () => Promise.resolve(),
  'order-history-tab': () => Promise.resolve(),
  'order-card': () => Promise.resolve(),
  
  // Homepage Tabs - компоненты уже загружены статически
  'homepage-tabs-content': () => Promise.resolve(),
  
  // Cart - компоненты уже загружены статически
  'cart-page': () => Promise.resolve(),
  'cart-item': () => Promise.resolve(),
  'cart-summary': () => Promise.resolve(),
  'order-wizard': () => Promise.resolve(),
  'step-auth': () => Promise.resolve(),
  'step-personal': () => Promise.resolve(),
  'step-logistics': () => Promise.resolve(),
  'step-payment': () => Promise.resolve(),
  'step-confirmation': () => Promise.resolve(),
  // New Order Flow - компоненты уже загружены статически
  'order-flow': () => Promise.resolve(),
  'delivery-step': () => Promise.resolve(),
  'review-step': () => Promise.resolve(),
};

function loadRequiredComponentsFromJSON() {
  const holder = document.getElementById('elkaretro-required-components');
  if (!holder) return;
  try {
    const list = JSON.parse(holder.textContent || '[]');
    if (!Array.isArray(list)) return;
    list.forEach(tagName => {
      const loader = registry[tagName];
      if (typeof loader === 'function') {
        loader().catch(err => console.error('[components] Failed to load', tagName, err));
      } else {
        // Unknown component tag; keep silent but helpful in dev
        if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
          console.warn('[components] No registry entry for', tagName);
        }
      }
    });
  } catch (e) {
    console.error('[components] Invalid JSON in elkaretro-required-components', e);
  }
}

// Kick off page-specific loading if list is present
loadRequiredComponentsFromJSON();