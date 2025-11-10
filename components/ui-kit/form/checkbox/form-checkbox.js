import { BaseElement } from '../../../base-element.js';
import { renderFormCheckboxTemplate } from './form-checkbox-template.js';

if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./form-checkbox-styles.css', import.meta.url));
}

const EVENT_PREFIX = 'ui-checkbox';

export class UIFormCheckbox extends BaseElement {
  static stateSchema = {
    checked:       { type: 'boolean', default: false, attribute: { name: 'checked', observed: true, reflect: true } },
    indeterminate: { type: 'boolean', default: false, attribute: { name: 'indeterminate', observed: true, reflect: true } },
    value:         { type: 'string',  default: 'on', attribute: { name: 'value', observed: true, reflect: true } },
    name:          { type: 'string',  default: '', attribute: { name: 'name', observed: true, reflect: true } },
    label:         { type: 'string',  default: '', attribute: { name: 'label', observed: true, reflect: true } },
    description:   { type: 'string',  default: '', attribute: { name: 'description', observed: true, reflect: true } },
    hint:          { type: 'string',  default: '', attribute: { name: 'hint', observed: true, reflect: true } },
    disabled:      { type: 'boolean', default: false, attribute: { name: 'disabled', observed: true, reflect: true } },
    required:      { type: 'boolean', default: false, attribute: { name: 'required', observed: true, reflect: true } },
    status:        { type: 'string',  default: 'default', attribute: null },
    messages:      { type: 'json',    default: null, attribute: null },
    meta:          { type: 'json',    default: null, attribute: null },
    touched:       { type: 'boolean', default: false, attribute: null, internal: true },
    dirty:         { type: 'boolean', default: false, attribute: null, internal: true }
  };

  constructor() {
    super();
    this._onChange = this._onChange.bind(this);
    this._onFocus = this._onFocus.bind(this);
    this._onBlur = this._onBlur.bind(this);

    this._inputEl = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this.render();
  }

  disconnectedCallback() {
    this._detachEvents();
  }

  onStateChanged(key) {
    if (['checked', 'indeterminate', 'disabled', 'required', 'value'].includes(key)) {
      this._syncControl();
    }
  }

  render() {
    this._detachEvents();
    this.innerHTML = renderFormCheckboxTemplate(this.state);
    this._inputEl = this.querySelector('.ui-form-checkbox__control');
    this._attachEvents();
    this._syncControl();
  }

  _attachEvents() {
    if (!this._inputEl) return;
    this._inputEl.addEventListener('change', this._onChange);
    this._inputEl.addEventListener('focus', this._onFocus);
    this._inputEl.addEventListener('blur', this._onBlur);
  }

  _detachEvents() {
    if (!this._inputEl) return;
    this._inputEl.removeEventListener('change', this._onChange);
    this._inputEl.removeEventListener('focus', this._onFocus);
    this._inputEl.removeEventListener('blur', this._onBlur);
  }

  _syncControl() {
    if (!this._inputEl) return;
    this._inputEl.checked = Boolean(this.state.checked);
    this._inputEl.indeterminate = Boolean(this.state.indeterminate);
    this._inputEl.disabled = Boolean(this.state.disabled);
    this._inputEl.required = Boolean(this.state.required);
    if (this.state.value != null) {
      this._inputEl.value = String(this.state.value);
    }
  }

  _onChange(event) {
    const checked = event.target.checked;
    const indeterminate = event.target.indeterminate;
    this.setState({
      checked,
      indeterminate,
      dirty: true,
      touched: true
    });
    this._emit(EVENT_PREFIX + ':input', { checked });
    this._emit(EVENT_PREFIX + ':change', { checked });
  }

  _onFocus(event) {
    this._emit(EVENT_PREFIX + ':focus', { checked: this.state.checked, originalEvent: event });
  }

  _onBlur(event) {
    this.setState({ touched: true });
    this._emit(EVENT_PREFIX + ':blur', { checked: this.state.checked, originalEvent: event });
  }

  _emit(name, detail) {
    this.dispatchEvent(new CustomEvent(name, {
      bubbles: true,
      composed: true,
      detail: {
        checked: this.state.checked,
        value: this.state.checked ? this.state.value : null,
        ...detail
      }
    }));
  }
}

customElements.define('ui-form-checkbox', UIFormCheckbox);
