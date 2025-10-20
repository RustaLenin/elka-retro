// Global App State and Utilities
window.app = {
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