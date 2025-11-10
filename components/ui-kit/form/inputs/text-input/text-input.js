import { BaseElement } from '../../../../base-element.js';
import { renderTextInputTemplate } from './text-input-template.js';

if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./text-input-styles.css', import.meta.url));
}

export class UITextInput extends BaseElement {
  static stateSchema = {
    value:        { type: 'string',  default: '', attribute: { name: 'value', observed: true, reflect: true } },
    placeholder:  { type: 'string',  default: '', attribute: { name: 'placeholder', observed: true, reflect: true } },
    name:         { type: 'string',  default: '', attribute: { name: 'name', observed: true, reflect: true } },
    disabled:     { type: 'boolean', default: false, attribute: { name: 'disabled', observed: true, reflect: true } },
    readonly:     { type: 'boolean', default: false, attribute: { name: 'readonly', observed: true, reflect: true } },
    required:     { type: 'boolean', default: false, attribute: { name: 'required', observed: true, reflect: true } },
    status:       { type: 'string',  default: 'default', attribute: null },
    messages:     { type: 'json',    default: null, attribute: null },
    maxLength:    { type: 'number',  default: null, attribute: { name: 'maxlength', observed: true, reflect: true } },
    autocomplete: { type: 'string',  default: '', attribute: { name: 'autocomplete', observed: true, reflect: true } },
    inputMode:    { type: 'string',  default: '', attribute: { name: 'inputmode', observed: true, reflect: true } },
    pattern:      { type: 'string',  default: '', attribute: { name: 'pattern', observed: true, reflect: true } },
    mask:         { type: 'string',  default: null, attribute: { name: 'mask', observed: true, reflect: true } },
    prefix:       { type: 'string',  default: '', attribute: { name: 'prefix', observed: true, reflect: true } },
    suffix:       { type: 'string',  default: '', attribute: { name: 'suffix', observed: true, reflect: true } },
    clearable:    { type: 'boolean', default: false, attribute: { name: 'clearable', observed: true, reflect: true } },
    meta:         { type: 'json',    default: null, attribute: null },
    focused:      { type: 'boolean', default: false, attribute: null, internal: true },
    dirty:        { type: 'boolean', default: false, attribute: null, internal: true }
  };

  constructor() {
    super();
    this._onInput = this._onInput.bind(this);
    this._onChange = this._onChange.bind(this);
    this._onFocus = this._onFocus.bind(this);
    this._onBlur = this._onBlur.bind(this);
    this._onClear = this._onClear.bind(this);
    this._inputEl = null;
    this._clearBtn = null;
    this._suspendDispatch = false;
  }

  connectedCallback() {
    super.connectedCallback();
    this.render();
    this._emitLifecycleEvent('init');
  }

  disconnectedCallback() {
    this._detachEvents();
  }

  onStateChanged(_key) {
    if (_key === 'value' && this._inputEl && this._inputEl.value !== this.state.value) {
      this._inputEl.value = this.state.value ?? '';
    }

    if ((_key === 'status' || _key === 'messages') && !this._suspendDispatch) {
      this._emitValidation();
    }
  }

  render() {
    this._detachEvents();
    this.innerHTML = renderTextInputTemplate(this.state);
    this._inputEl = this.querySelector('.ui-input-text__control');
    this._clearBtn = this.querySelector('.ui-input-text__clear');
    this._attachEvents();
    this._syncControl();
  }

  _attachEvents() {
    if (!this._inputEl) return;
    this._inputEl.addEventListener('input', this._onInput);
    this._inputEl.addEventListener('change', this._onChange);
    this._inputEl.addEventListener('focus', this._onFocus);
    this._inputEl.addEventListener('blur', this._onBlur);
    if (this._clearBtn) {
      this._clearBtn.addEventListener('click', this._onClear);
    }
  }

  _detachEvents() {
    if (this._inputEl) {
      this._inputEl.removeEventListener('input', this._onInput);
      this._inputEl.removeEventListener('change', this._onChange);
      this._inputEl.removeEventListener('focus', this._onFocus);
      this._inputEl.removeEventListener('blur', this._onBlur);
    }
    if (this._clearBtn) {
      this._clearBtn.removeEventListener('click', this._onClear);
    }
  }

  _syncControl() {
    if (this._inputEl) {
      this._inputEl.value = this.state.value ?? '';
    }
  }

  _onInput(event) {
    const nextValue = event.target.value ?? '';
    this.setState({ value: nextValue, dirty: true });
    this._emitEvent('ui-input-text:input', { value: nextValue, originalEvent: event });
  }

  _onChange(event) {
    const nextValue = event.target.value ?? '';
    this.setState({ value: nextValue });
    this._emitEvent('ui-input-text:change', { value: nextValue, originalEvent: event });
  }

  _onFocus(event) {
    this.setState({ focused: true });
    this._emitEvent('ui-input-text:focus', { value: this.state.value, originalEvent: event });
  }

  _onBlur(event) {
    this.setState({ focused: false });
    this._emitEvent('ui-input-text:blur', { value: this.state.value, originalEvent: event });
  }

  _onClear() {
    this.setState({ value: '', dirty: true });
    this._emitEvent('ui-input-text:clear', { value: '' });
    this._emitEvent('ui-input-text:change', { value: '' });
  }

  _emitValidation() {
    const messages = this.state.messages || { error: [], success: [], info: [] };
    this._emitEvent('ui-input-text:validation', {
      status: this.state.status || 'default',
      messages
    });
  }

  _emitLifecycleEvent(type) {
    this._emitEvent(`ui-input-text:${type}`, { value: this.state.value });
  }

  _emitEvent(name, detail) {
    this.dispatchEvent(new CustomEvent(name, {
      bubbles: true,
      composed: true,
      detail: {
        field: this.getAttribute('name') || this.state.name || null,
        ...detail
      }
    }));
  }
}

customElements.define('ui-input-text', UITextInput);


