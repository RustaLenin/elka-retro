import { BaseElement } from '../../base-element.js';

export class NavLink extends BaseElement {
  static stateSchema = {
    href:    { type: 'string', default: '#', attribute: { name: 'href', observed: true, reflect: true } },
    label:   { type: 'string', default: '', attribute: { name: 'label', observed: true, reflect: true } },
    icon:    { type: 'string', default: '', attribute: { name: 'icon', observed: true, reflect: true } },
    variant: { type: 'string', default: '', attribute: { name: 'variant', observed: true, reflect: true } },
    target:  { type: 'string', default: '', attribute: { name: 'target', observed: true, reflect: true } },
  };

  connectedCallback() {
    if (window.app?.toolkit?.loadCSSOnce) {
      window.app.toolkit.loadCSSOnce(new URL('./nav-link-styles.css', import.meta.url));
    }
    super.connectedCallback();
    this.render();
  }

  render() {
    const { href, label, icon, variant, target } = this.state;
    const cls = `site_header-nav_link${variant ? ' site_header-nav_link--' + variant : ''}`;
    const targetAttr = target ? ` target="${target}" rel="noopener noreferrer"` : '';
    this.innerHTML = `
      <a href="${href}" class="${cls}"${targetAttr}>
        ${icon ? `<ui-icon name="${icon}" size="medium"></ui-icon>` : ''}
        ${label ? `<span>${label}</span>` : ''}
      </a>
    `;
  }
}

customElements.define('nav-link', NavLink);


