import { main_sidebar_template } from './main-sidebar-template.js';
import { BaseElement } from '../../base-element.js';

class MainSidebar extends BaseElement {
  constructor() {
    super();
    this.state = {
      collapsed: true,
      activeSection: 'hero'
    };
    this.observer = null;
  }
  
  connectedCallback() {
    super.connectedCallback();
    this.render();
    this.attachEventListeners();
    this.setupIntersectionObserver();
  }
  
  disconnectedCallback() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
  
  render() {
    this.innerHTML = main_sidebar_template(this.state);
  }
  
  attachEventListeners() {
    // Toggle button
    const toggleButton = this.querySelector('.ToggleSidebar');
    if (toggleButton) {
      toggleButton.addEventListener('click', () => this.toggle());
    }
    
    // Section links
    const links = this.querySelectorAll('.ScrollToSection');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionId = link.getAttribute('data-section');
        app.nav.scrollToSection(sectionId);
      });
    });
  }
  
  setupIntersectionObserver() {
    const sections = ['hero', 'catalog', 'news', 'new-arrivals', 'popular'];
    
    const options = {
      rootMargin: '-100px 0px -66%',
      threshold: 0
    };
    
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.state.activeSection = entry.target.id;
          this.render();
          this.attachEventListeners();
        }
      });
    }, options);
    
    sections.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        this.observer.observe(element);
      }
    });
  }
  
  toggle() {
    this.state.collapsed = !this.state.collapsed;
    this.render();
    this.attachEventListeners();
  }
}

customElements.define('main-sidebar', MainSidebar);