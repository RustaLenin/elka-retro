import { site_footer_template } from './site-footer-template.js';
import { BaseElement } from '../../base-element.js';

class SiteFooter extends BaseElement {
  constructor() {
    super();
    this.state = {};
  }
  
  connectedCallback() {
    super.connectedCallback();
    this.render();
  }
  
  render() {
    this.innerHTML = site_footer_template(this.state);
  }
}

customElements.define('site-footer', SiteFooter);