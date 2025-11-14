import { BaseElement } from '../../base-element.js';
import { icons } from './icon-set.js';

// Загружаем стили сразу при импорте модуля
if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./icon-styles.css', import.meta.url));
}

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

  // Публичный API

  /**
   * Получить имя иконки
   * @returns {string}
   */
  name() {
    return this.state.name || '';
  }

  /**
   * Установить имя иконки
   * @param {string} name - имя иконки
   * @returns {this}
   */
  setName(name) {
    this.setState({ name: String(name || '') });
    return this;
  }

  /**
   * Установить размер
   * @param {string} size - размер (small, medium, large)
   * @returns {this}
   */
  setSize(size) {
    this.setState({ size: String(size || 'medium') });
    return this;
  }

  /**
   * Установить/убрать анимацию вращения
   * @param {boolean} spin - включить/выключить вращение
   * @returns {this}
   */
  setSpin(spin) {
    this.setState({ spin: Boolean(spin) });
    return this;
  }

  /**
   * Переключить анимацию вращения
   * @returns {this}
   */
  toggleSpin() {
    return this.setSpin(!this.state.spin);
  }

  /**
   * Сбросить к дефолтным значениям
   * @returns {this}
   */
  reset() {
    this.setState({ 
      name: '', 
      size: 'medium', 
      spin: false 
    });
    return this;
  }

  // Оставить для обратной совместимости
  // changeIcon(newName) уже определен выше
}

customElements.define('ui-icon', UiIcon);


