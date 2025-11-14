import { site_footer_template } from './site-footer-template.js';
import { BaseElement } from '../../base-element.js';

class SiteFooter extends BaseElement {
  static stateSchema = {
    toyCatalogUrl: { type: 'string', default: '/catalog/', attribute: { name: 'toy-catalog-url', observed: true } },
    nyAccessoryUrl: { type: 'string', default: '/ny-accessory/', attribute: { name: 'ny-accessory-url', observed: true } },
  };

  constructor() {
    super();
  }
  
  connectedCallback() {
    super.connectedCallback();
    this.render();
  }
  
  onStateChanged() {
    this.render();
  }
  
  render() {
    this.innerHTML = site_footer_template(this.state);
  }
}

customElements.define('site-footer', SiteFooter);