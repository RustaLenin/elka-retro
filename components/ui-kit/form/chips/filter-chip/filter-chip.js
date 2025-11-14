import { BaseElement } from '../../../../base-element.js';
import { renderFilterChipTemplate } from './filter-chip-template.js';

if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./filter-chip-styles.css', import.meta.url));
}

export class UIFilterChip extends BaseElement {
  static stateSchema = {
    label:      { type: 'string',  default: '', attribute: { name: 'label', observed: true, reflect: true } },
    value:      { type: 'string',  default: '', attribute: { name: 'value', observed: true, reflect: true } },
    filterId:   { type: 'string',  default: '', attribute: { name: 'filter-id', observed: true, reflect: true } },
    removable:  { type: 'boolean', default: true, attribute: { name: 'removable', observed: true, reflect: true } },
    meta:       { type: 'json',    default: null, attribute: null }
  };

  constructor() {
    super();
    this._onRemoveClick = this._onRemoveClick.bind(this);
    this._onChipClick = this._onChipClick.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    // Применяем атрибуты к самому элементу
    this.setAttribute('role', 'button');
    this.setAttribute('tabindex', '0');
    this.render();
    this._bindEvents();
  }

  _bindEvents() {
    const removeBtn = this.querySelector('[data-action="remove"]');
    if (removeBtn) {
      removeBtn.addEventListener('click', this._onRemoveClick);
    }
    this.addEventListener('click', this._onChipClick);
  }

  _onRemoveClick(e) {
    e.stopPropagation();
    if (!this.state.removable) return;
    this._emitEvent('remove', {
      filterId: this.state.filterId,
      label: this.state.label,
      value: this.state.value
    });
  }

  _onChipClick(e) {
    if (e.target.closest('[data-action="remove"]')) return;
    this._emitEvent('click', {
      filterId: this.state.filterId
    });
  }

  _emitEvent(type, detail) {
    this.dispatchEvent(new CustomEvent(`ui-filter-chip:${type}`, {
      bubbles: true,
      composed: true,
      detail: {
        ...detail,
        component: 'ui-filter-chip'
      }
    }));
  }

  render() {
    this.innerHTML = renderFilterChipTemplate(this.state);
    this._bindEvents();
  }

  // Публичный API

  /**
   * Получить текущее значение чипа
   * @returns {{filterId: string, value: string, label: string}}
   */
  value() {
    return {
      filterId: this.state.filterId || '',
      value: this.state.value || '',
      label: this.state.label || ''
    };
  }

  /**
   * Установить значение чипа
   * @param {{filterId?: string, value?: string, label?: string}|null} value - новое значение
   * @returns {this}
   */
  setValue(value) {
    if (value && typeof value === 'object') {
      const updates = {};
      if (value.filterId !== undefined) updates.filterId = String(value.filterId);
      if (value.value !== undefined) updates.value = String(value.value);
      if (value.label !== undefined) updates.label = String(value.label);
      
      if (Object.keys(updates).length > 0) {
        this.setState(updates);
        this.render();
      }
    }
    return this;
  }

  /**
   * Сбросить к дефолтным значениям
   * @returns {this}
   */
  reset() {
    this.setValue({
      filterId: '',
      value: '',
      label: ''
    });
    return this;
  }

  /**
   * Удалить чип (эмитирует событие remove)
   * @returns {this}
   */
  remove() {
    if (this.state.removable) {
      this._emitEvent('remove', {
        filterId: this.state.filterId,
        label: this.state.label,
        value: this.state.value
      });
    }
    return this;
  }
}

customElements.define('ui-filter-chip', UIFilterChip);

