// Import Navigation blocks

import "./navigation/site-header/site-header.js";
import "./navigation/site-footer/site-footer.js";
import "./navigation/nav-link/nav-link.js";
// UI-Kit components (load on all pages)
import "./ui-kit/icon/icon.js";
import "./ui-kit/loader/loader.js";
import "./ui-kit/notification/notification.js";
import "./ui-kit/button/button.js";
import "./ui-kit/tooltip/tooltip.js";
import "./ui-kit/modal/modal.js";
import "./ui-kit/image-gallery/image-gallery.js";
import "./ui-kit/tabs/ui-tabs.js";
import "./ui-kit/form/controller/form-controller.js";
import "./ui-kit/form/field/form-field.js";
import "./ui-kit/form/inputs/text-input/text-input.js";
import "./ui-kit/form/inputs/number-input/number-input.js";
import "./ui-kit/form/inputs/range-input/range-input.js";
import "./ui-kit/form/inputs/segmented-toggle/segmented-toggle.js";
import "./ui-kit/form/selects/select-single/select-single.js";
import "./ui-kit/form/selects/select-multi/select-multi.js";
import "./ui-kit/form/checkbox/form-checkbox.js";
import "./ui-kit/form/chips/filter-chip/filter-chip.js";
import "./ui-kit/form/chips/filters-summary/filters-summary.js";
import "./catalog/sidebar/category-tree-filter.js";

// Registry for page-specific components (extend as components are added)
const registry = {
  // Pages
  'wp-page': () => import('./pages/page/page.js'),
  'error-page': () => import('./pages/error-page/error-page.js'),
  
  // Posts
  'post-card': () => import('./posts/post-card/post-card.js'),
  'post-single': () => import('./posts/post-single/post-single.js'),
  
  // Toy Type
  'toy-type-card': () => import('./toy-type/toy-type-card/toy-type-card.js'),
  'toy-type-single': () => import('./toy-type/toy-type-single/toy-type-single.js'),
  
  // Toy Instance
  'toy-instance-card': () => import('./toy-instance/toy-instance-card/toy-instance-card.js'),
  'toy-instance-modal': () => import('./toy-instance/toy-instance-modal/toy-instance-modal.js'),
  
  // Ny Accessory
  'ny-accessory-card': () => import('./ny-accessory/ny-accessory-card/ny-accessory-card.js'),
  'ny-accessory-single': () => import('./ny-accessory/ny-accessory-single/ny-accessory-single.js'),
  
  // Catalog
  'catalog-page': () => import('./catalog/index.js'),
  
  // Accessory Catalog
  'accessory-catalog-page': () => import('./accessory-catalog/index.js'),
  
  // Category
  'category-breadcrumbs': () => import('./category-breadcrumbs/category-breadcrumbs.js'),
  'category-catalog': () => import('./category-catalog/category-catalog.js'),
  
  // User Profile
  'user-menu': () => import('./user-profile/user-menu/user-menu.js'),
  'profile-page': () => import('./user-profile/profile-page/profile-page.js'),
  
  // Homepage Tabs
  'homepage-tabs-content': () => import('./homepage-tabs/homepage-tabs-content.js'),
  
  // Cart
  'cart-page': () => import('./cart/index.js'),
  'cart-item': () => import('./cart/cart-item/cart-item.js'),
  'cart-summary': () => import('./cart/cart-summary/cart-summary.js'),
  'order-wizard': () => import('./cart/order-wizard/order-wizard.js'),
  'step-auth': () => import('./cart/order-wizard/steps/step-auth.js'),
  'step-personal': () => import('./cart/order-wizard/steps/step-personal.js'),
  'step-logistics': () => import('./cart/order-wizard/steps/step-logistics.js'),
  'step-payment': () => import('./cart/order-wizard/steps/step-payment.js'),
  'step-confirmation': () => import('./cart/order-wizard/steps/step-confirmation.js'),
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