import { BaseElement } from '../../base-element.js';
import { component_template } from './loader-template.js';

export class BlockLoader extends BaseElement {
  static stateSchema = {
    label:          { type: 'string',  default: 'Загрузка...', attribute: { name: 'label', observed: true, reflect: true } },
    spinduration:   { type: 'number',  default: 1200,          attribute: { name: 'spinduration', observed: true, reflect: true } },
    fadeinduration: { type: 'number',  default: 400,           attribute: { name: 'fadeinduration', observed: true, reflect: true } },
    fadeoutduration:{ type: 'number',  default: 400,           attribute: { name: 'fadeoutduration', observed: true, reflect: true } },
  };

  constructor() {
    super();
  }

  connectedCallback() {
    window.app.toolkit.loadCSSOnce(new URL('./loader-styles.css', import.meta.url));
    super.connectedCallback();
    this.render();
    this.classList.remove('hiding');
  }

  setLabel(label) { this.setAttribute('label', label); }
  setSpinDuration(ms) { this.setAttribute('spinduration', ms); }
  setFadeInDuration(ms) { this.setAttribute('fadeinduration', ms); }
  setFadeOutDuration(ms) { this.setAttribute('fadeoutduration', ms); }

  show() { this.classList.remove('hiding'); }

  hide() {
    this.classList.add('hiding');
    const ms = Number(this.getAttribute('fadeoutduration')) || BlockLoader.stateSchema.fadeoutduration.default;
    setTimeout(() => this.remove(), ms);
  }

  destroy() { this.hide(); }

  render() {
    const entries = Object.entries(this.state);
    let html = component_template;
    entries.forEach(([key, val]) => {
      html = html.replaceAll(`{{${key}}}`, String(val));
    });
    this.innerHTML = html;
  }
}

customElements.define('block-loader', BlockLoader);


