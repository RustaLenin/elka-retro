// Import Navigation blocks

import "./navigation/site-header/site-header.js";
import "./navigation/site-footer/site-footer.js";
import "./navigation/main-sidebar/main-sidebar.js";
import "./navigation/nav-link/nav-link.js";
// UI-Kit components (load on all pages)
import "./ui-kit/icon/icon.js";
import "./ui-kit/loader/loader.js";
import "./ui-kit/notification/notification.js";
import "./ui-kit/button/button.js";
import "./ui-kit/tooltip/tooltip.js";
import "./ui-kit/modal/modal.js";
import "./ui-kit/image-gallery/image-gallery.js";

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
  
  // Category
  'category-breadcrumbs': () => import('./category-breadcrumbs/category-breadcrumbs.js'),
  'category-catalog': () => import('./category-catalog/category-catalog.js'),
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