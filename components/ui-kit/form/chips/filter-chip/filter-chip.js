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
    this._onRemoveKeydown = this._onRemoveKeydown.bind(this);
    this._removeButton = null;
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
    this._removeButton = this.querySelector('[data-action="remove"]');
    if (this._removeButton) {
      this._removeButton.addEventListener('click', this._onRemoveClick);
      this._removeButton.addEventListener('keydown', this._onRemoveKeydown);
    }
    this.addEventListener('click', this._onChipClick);
  }

  _onRemoveClick(e) {
    e.stopPropagation();
    if (!this.state.removable) return;
    console.debug('[ui-filter-chip] remove click', {
      filterId: this.state.filterId,
      value: this.state.value,
    });
    this._emitRemove();
  }

  _onRemoveKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._onRemoveClick(e);
    }
  }

  _onChipClick(e) {
    if (e.target.closest('[data-action="remove"]')) return;
    this._emitEvent('click', {
      filterId: this.state.filterId
    });
  }

  _emitRemove() {
    const field = this.closest('ui-form-field');
    console.debug('[ui-filter-chip] emit remove', {
      fieldFound: Boolean(field),
      filterId: this.state.filterId,
    });
    if (field && typeof field.setValue === 'function') {
      try {
        field.setValue(null);
        if (typeof field.handleControlChange === 'function') {
          field.handleControlChange({ type: 'change' });
        }
      } catch (err) {
        console.warn('[ui-filter-chip] Failed to reset field value', err);
      }
    }

    this._emitEvent('remove', {
      filterId: this.state.filterId,
      label: this.state.label,
      value: this.state.value
    });

    const controller = this.closest('ui-form-controller');
    if (controller && typeof controller.submit === 'function') {
      console.debug('[ui-filter-chip] submitting form controller');
      controller.submit();
    } else {
      console.debug('[ui-filter-chip] dispatch ui-form:change fallback');
      this.dispatchEvent(new CustomEvent('ui-form:change', {
        bubbles: true,
        composed: true,
        detail: {
          filterId: this.state.filterId,
          value: null,
        },
      }));
    }
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

