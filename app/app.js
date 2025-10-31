// Global App State and Utilities
window.app = {
  // Toolkit utilities
  toolkit: {
    // Ensure a stylesheet is added to <head> only once
    loadCSSOnce(cssHref) {
      const href = String(cssHref);
      if (!document.querySelector(`link[rel="stylesheet"][href="${href}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
      }
    }
  },
  // Cart Management
  cart: {
    items: [],
    
    add: function(itemId) {
      console.log('Adding item to cart:', itemId);
      const existingItem = this.items.find(item => item.id === itemId);
      
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        this.items.push({ id: itemId, quantity: 1 });
      }
      
      this.updateCount();
      this.showNotification('Item added to cart');
    },
    
    remove: function(itemId) {
      this.items = this.items.filter(item => item.id !== itemId);
      this.updateCount();
    },
    
    getCount: function() {
      return this.items.reduce((sum, item) => sum + item.quantity, 0);
    },
    
    updateCount: function() {
      const event = new CustomEvent('cart-updated', { 
        detail: { count: this.getCount() } 
      });
      window.dispatchEvent(event);
    },
    
    showNotification: function(message) {
      // Simple notification (can be enhanced)
      console.log('Notification:', message);
    }
  },
  
  // Navigation Utilities
  nav: {
    scrollToSection: function(sectionId) {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  },
  
  // UI Utilities
  ui: {
    showHint: function(target, options = {}) {
      if (window.UIHintManager && target) {
        window.UIHintManager.show(target, options);
      }
    },
    hideHint: function() {
      if (window.UIHintManager) window.UIHintManager.hide();
    },
    toggleMobileMenu: function() {
      const header = document.querySelector('site-header');
      if (header) {
        header.toggleMenu();
      }
    },
    
    toggleSidebar: function() {
      const sidebar = document.querySelector('main-sidebar');
      if (sidebar) {
        sidebar.toggle();
      }
    },
    
    showModal: function(options = {}) {
      // Динамически импортируем функцию показа модалки
      return import('../components/ui-kit/modal/modal.js').then(module => {
        return module.showModal(options);
      }).catch(err => {
        console.error('[app.ui] Failed to load modal:', err);
      });
    }
  },
  
  // Global State Management
  state: {
    // Текущие данные страницы (обновляются компонентами при загрузке)
    currentPageData: {
      toyType: null,      // Данные типа игрушки
      toyInstance: null,   // Данные экземпляра игрушки
      page: null,         // Данные страницы WordPress
      post: null          // Данные поста WordPress
    },
    
    // Утилита для получения значения по пути в объекте (например, "toyInstance.images")
    get(path) {
      if (!path) return null;
      const keys = path.split('.');
      let value = this.currentPageData;
      for (const key of keys) {
        if (value === null || value === undefined) return null;
        value = value[key];
      }
      return value;
    },
    
    // Утилита для установки значения по пути с dispatch события
    set(path, value) {
      if (!path) return false;
      const keys = path.split('.');
      const lastKey = keys.pop();
      let target = this.currentPageData;
      for (const key of keys) {
        if (!target[key] || typeof target[key] !== 'object') {
          target[key] = {};
        }
        target = target[key];
      }
      target[lastKey] = value;
      
      // Dispatch события об изменении стейта
      const event = new CustomEvent('app-state-changed', {
        detail: {
          path: path,
          value: value,
          fullPath: path
        }
      });
      window.dispatchEvent(event);
      
      return true;
    },
    
    // Прямая установка объекта (для массового обновления)
    setData(data) {
      if (!data || typeof data !== 'object') return false;
      Object.assign(this.currentPageData, data);
      
      // Dispatch события об изменении стейта
      const event = new CustomEvent('app-state-changed', {
        detail: {
          path: null, // null означает обновление всего объекта
          value: data,
          fullPath: null
        }
      });
      window.dispatchEvent(event);
      
      return true;
    }
  }
};

// Initialize cart count from localStorage
document.addEventListener('DOMContentLoaded', function() {
  const savedCart = localStorage.getItem('cart');
  if (savedCart) {
    try {
      app.cart.items = JSON.parse(savedCart);
      app.cart.updateCount();
    } catch (e) {
      console.error('Error loading cart:', e);
    }
  }
});

// Save cart to localStorage on changes
window.addEventListener('cart-updated', function() {
  localStorage.setItem('cart', JSON.stringify(app.cart.items));
});