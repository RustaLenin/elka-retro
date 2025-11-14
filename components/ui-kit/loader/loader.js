import { BaseElement } from '../../base-element.js';
import { component_template } from './loader-template.js';

// Загружаем стили сразу при импорте модуля
if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./loader-styles.css', import.meta.url));
}

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

  // Публичный API (дополнить существующие методы)

  /**
   * Проверить, видим ли лоадер
   * @returns {boolean}
   */
  isVisible() {
    return !this.classList.contains('hiding') && this.isConnected;
  }

  /**
   * Получить текущую метку
   * @returns {string}
   */
  label() {
    return this.state.label || '';
  }

  /**
   * Получить текущую длительность вращения
   * @returns {number}
   */
  spinDuration() {
    return this.state.spinduration || 1200;
  }

  /**
   * Получить текущую длительность появления
   * @returns {number}
   */
  fadeInDuration() {
    return this.state.fadeinduration || 400;
  }

  /**
   * Получить текущую длительность исчезновения
   * @returns {number}
   */
  fadeOutDuration() {
    return this.state.fadeoutduration || 400;
  }

  /**
   * Сбросить к дефолтным значениям
   * @returns {this}
   */
  reset() {
    this.setLabel('Загрузка...');
    this.setSpinDuration(1200);
    this.setFadeInDuration(400);
    this.setFadeOutDuration(400);
    this.show();
    return this;
  }
}

customElements.define('block-loader', BlockLoader);


