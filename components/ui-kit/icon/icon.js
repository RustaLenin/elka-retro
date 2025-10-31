import { BaseElement } from '../../base-element.js';
import { icons } from './icon-set.js';

export class UiIcon extends BaseElement {
  static stateSchema = {
    name: { type: 'string', default: '', attribute: { name: 'name', observed: true, reflect: true } },
    size: { type: 'string',  default: 'medium', attribute: { name: 'size', observed: true, reflect: true } },
    spin: { type: 'boolean', default: false, attribute: { name: 'spin', observed: true, reflect: true } },
  };

  constructor() {
    super();
  }

  connectedCallback() {
    window.app.toolkit.loadCSSOnce(new URL('./icon-styles.css', import.meta.url));
    super.connectedCallback();
    this.render();
  }

  onStateChanged(key) {
    if (key === 'name' || key === 'spin') return; // will re-render
  }

  changeIcon(newName) {
    this.setState({ name: newName || '' });
  }

  render() {
    const { name, size, spin } = this.state;
    const svg = icons[name] || '';
    this.innerHTML = svg || '';
    const svgEl = this.querySelector('svg');
    if (svgEl) {
      if (spin) svgEl.setAttribute('data-spin', 'true');
      else svgEl.removeAttribute('data-spin');
    }
    // size устанавливается автоматически через reflect: true в BaseElement
    // не нужно вызывать setAttribute здесь, чтобы избежать рекурсии
  }
}

customElements.define('ui-icon', UiIcon);


