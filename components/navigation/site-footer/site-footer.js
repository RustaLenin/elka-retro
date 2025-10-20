import { site_footer_template } from './site-footer-template.js';

class SiteFooter extends HTMLElement {
  constructor() {
    super();
    this.state = {};
  }
  
  connectedCallback() {
    this.render();
  }
  
  render() {
    this.innerHTML = site_footer_template(this.state);
  }
}

customElements.define('site-footer', SiteFooter);