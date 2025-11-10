import { site_header_template } from './site-header-template.js';
import { BaseElement } from '../../base-element.js';

class SiteHeader extends BaseElement {
  constructor() {
    super();
    this.state = {
      cartCount: 2,
      menuOpen: false,
      catalogUrl: '/catalog/'
    };
  }
  
  connectedCallback() {
    super.connectedCallback();
    // Get cart count from attribute
    const cartCountAttr = this.getAttribute('cart-count');
    if (cartCountAttr) {
      this.state.cartCount = parseInt(cartCountAttr, 10);
    }

    const catalogAttr = this.getAttribute('catalog-url');
    if (catalogAttr) {
      this.state.catalogUrl = catalogAttr;
    }
    
    this.render();
    this.attachEventListeners();
    
    // Listen for cart updates
    window.addEventListener('cart-updated', (e) => {
      this.state.cartCount = e.detail.count;
      this.render();
      this.attachEventListeners();
    });
  }
  
  render() {
    this.innerHTML = site_header_template(this.state);
  }
  
  attachEventListeners() {
    // Mobile menu toggle
    const menuButton = this.querySelector('.MobileMenuToggle');
    if (menuButton) {
      menuButton.addEventListener('click', () => this.toggleMenu());
    }
    
    // Close mobile menu
    const closeButtons = this.querySelectorAll('.CloseMobileMenu');
    closeButtons.forEach(button => {
      button.addEventListener('click', () => this.closeMenu());
    });
  }
  
  toggleMenu() {
    this.state.menuOpen = !this.state.menuOpen;
    this.render();
    this.attachEventListeners();
  }
  
  closeMenu() {
    this.state.menuOpen = false;
    this.render();
    this.attachEventListeners();
  }
}

customElements.define('site-header', SiteHeader);