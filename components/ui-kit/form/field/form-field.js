import { BaseElement } from '../../../base-element.js';
import { renderFormFieldTemplate } from './form-field-template.js';

if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./form-field-styles.css', import.meta.url));
}

export class UIFormField extends BaseElement {
  static stateSchema = {
    fieldId:     { type: 'string',  default: '', attribute: { name: 'field-id', observed: true, reflect: true } },
    name:        { type: 'string',  default: '', attribute: { name: 'name', observed: true, reflect: true } },
    label:       { type: 'string',  default: '', attribute: { name: 'label', observed: true, reflect: true } },
    description: { type: 'string',  default: '', attribute: { name: 'description', observed: true, reflect: true } },
    required:    { type: 'boolean', default: false, attribute: { name: 'required', observed: true, reflect: true } },
    disabled:    { type: 'boolean', default: false, attribute: { name: 'disabled', observed: true, reflect: true } },
    status:      { type: 'string',  default: 'default', attribute: null },
    messages:    { type: 'json',    default: null, attribute: null },
    hints:       { type: 'json',    default: null, attribute: null },
    tooltip:     { type: 'json',    default: null, attribute: null },
    icon:        { type: 'json',    default: null, attribute: null },
    value:       { type: 'json',    default: null, attribute: null },
    meta:        { type: 'json',    default: null, attribute: null },
    touched:     { type: 'boolean', default: false, attribute: null, internal: true },
    dirty:       { type: 'boolean', default: false, attribute: null, internal: true }
  };

  constructor() {
    super();
    this._slotChange = this._slotChange.bind(this);
    this._onControlEvent = this._onControlEvent.bind(this);
    this._controlEl = null;
    this._slotEl = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this.render();
    this._emitLifecycle('init');
  }

  disconnectedCallback() {
    this._detachControlListeners();
    this._detachSlotListener();
  }

  onStateChanged(_key) {
    if (_key === 'disabled' || _key === 'required') {
      this._applyFieldStateToControl();
    }

    if ((_key === 'status' || _key === 'messages') && this._controlEl) {
      this._emitFieldEvent('ui-form-field:validation', {
        status: this.state.status,
        messages: this.state.messages || { error: [], success: [], info: [] },
      });
    }
  }

  render() {
    this._detachSlotListener();
    this._detachControlListeners();
    this.innerHTML = renderFormFieldTemplate(this.state);
    this._slotEl = this.querySelector('slot');
    if (this._slotEl) {
      this._slotEl.addEventListener('slotchange', this._slotChange);
      this._slotChange();
    }
    this._applyFieldStateToControl();
  }

  _slotChange() {
    if (!this._slotEl) return;
    const assigned = this._slotEl.assignedElements({ flatten: true }).filter(node => node instanceof HTMLElement);
    const control = assigned[0] || null;
    if (control === this._controlEl) {
      return;
    }
    this._detachControlListeners();
    this._controlEl = control;
    this._attachControlListeners();
    this._applyFieldStateToControl();
    if (this._controlEl) {
      this.setState({
        name: this.state.name || this._controlEl.getAttribute('name') || '',
      });
      this._emitLifecycle('control-attached');
    }
  }

  _attachControlListeners() {
    if (!this._controlEl) return;
    const matchEvents = [
      'ui-input-text:input',
      'ui-input-text:change',
      'ui-input-text:focus',
      'ui-input-text:blur',
      'ui-input-text:clear',
      'ui-input-text:validation',
      'ui-input-number:input',
      'ui-input-number:change',
      'ui-input-number:focus',
      'ui-input-number:blur',
      'ui-input-number:increment',
      'ui-input-number:decrement',
      'ui-input-number:validation',
      'ui-checkbox:input',
      'ui-checkbox:change',
      'ui-checkbox:focus',
      'ui-checkbox:blur',
      'ui-checkbox:validation',
      'ui-select:open',
      'ui-select:close',
      'ui-select:search',
      'ui-select:select',
      'ui-select:deselect',
      'ui-select:change',
      'ui-select:validation'
    ];
    matchEvents.forEach(evt => {
      this._controlEl.addEventListener(evt, this._onControlEvent);
    });
  }

  _detachControlListeners() {
    if (!this._controlEl) return;
    const matchEvents = [
      'ui-input-text:input',
      'ui-input-text:change',
      'ui-input-text:focus',
      'ui-input-text:blur',
      'ui-input-text:clear',
      'ui-input-text:validation',
      'ui-input-number:input',
      'ui-input-number:change',
      'ui-input-number:focus',
      'ui-input-number:blur',
      'ui-input-number:increment',
      'ui-input-number:decrement',
      'ui-input-number:validation',
      'ui-checkbox:input',
      'ui-checkbox:change',
      'ui-checkbox:focus',
      'ui-checkbox:blur',
      'ui-checkbox:validation',
      'ui-select:open',
      'ui-select:close',
      'ui-select:search',
      'ui-select:select',
      'ui-select:deselect',
      'ui-select:change',
      'ui-select:validation'
    ];
    matchEvents.forEach(evt => {
      this._controlEl.removeEventListener(evt, this._onControlEvent);
    });
  }

  _detachSlotListener() {
    if (this._slotEl) {
      this._slotEl.removeEventListener('slotchange', this._slotChange);
    }
    this._slotEl = null;
  }

  _applyFieldStateToControl() {
    if (!this._controlEl) return;
    if (this.state.disabled) {
      this._controlEl.setAttribute('disabled', '');
    } else {
      this._controlEl.removeAttribute('disabled');
    }
    if (this.state.required) {
      this._controlEl.setAttribute('required', '');
    } else {
      this._controlEl.removeAttribute('required');
    }
    const describedBy = this._ensureFeedbackId();
    if (describedBy) {
      this._controlEl.setAttribute('aria-describedby', describedBy);
    }
    this._controlEl.setAttribute('aria-invalid', this.state.status === 'error' ? 'true' : 'false');
  }

  _ensureFeedbackId() {
    const feedback = this.querySelector('.ui-form-field__feedback');
    if (!feedback) return null;
    if (!feedback.id) {
      feedback.id = `${this.state.fieldId || this.state.name || 'field'}-feedback`;
    }
    return feedback.id;
  }

  _onControlEvent(event) {
    const type = event.type;
    const detail = event.detail || {};
    const value = detail.value !== undefined
      ? detail.value
      : detail.values !== undefined
      ? detail.values
      : detail.rawValue !== undefined
      ? detail.rawValue
      : detail.checked !== undefined
      ? detail.checked
      : undefined;
    const update = {};

    if (value !== undefined) {
      update.value = value;
    }

    switch (type) {
      case 'ui-input-text:input':
      case 'ui-input-number:input':
        update.dirty = true;
        break;
      case 'ui-input-text:change':
      case 'ui-input-number:change':
        update.touched = true;
        break;
      case 'ui-input-text:blur':
      case 'ui-input-number:blur':
        update.touched = true;
        break;
      case 'ui-input-text:validation':
      case 'ui-input-number:validation':
      case 'ui-select:validation':
      case 'ui-checkbox:validation':
        update.status = detail.status || 'default';
        update.messages = detail.messages || null;
        break;
      case 'ui-select:change':
      case 'ui-checkbox:change':
        update.touched = true;
        break;
      case 'ui-select:select':
      case 'ui-select:deselect':
      case 'ui-checkbox:input':
        update.dirty = true;
        break;
      case 'ui-checkbox:blur':
        update.touched = true;
        break;
      default:
        break;
    }

    const hasUpdate = Object.keys(update).length > 0;
    if (hasUpdate) {
      this.setState(update);
    }

    this._emitFieldEvent(`ui-form-field:${type.split(':')[1] || type}`, {
      origin: type,
      value: detail.value ?? detail.rawValue ?? this.state.value,
      rawValue: detail.rawValue,
      formatted: detail.formatted,
      status: detail.status,
      messages: detail.messages,
      originalEvent: detail.originalEvent,
    });
  }

  _emitLifecycle(stage) {
    this._emitFieldEvent(`ui-form-field:${stage}`, {});
  }

  _emitFieldEvent(name, detail) {
    this.dispatchEvent(new CustomEvent(name, {
      bubbles: true,
      composed: true,
      detail: {
        fieldId: this.state.fieldId || this.state.name || this.getAttribute('name') || null,
        name: this.state.name || this.getAttribute('name') || null,
        label: this.state.label || null,
        required: this.state.required,
        disabled: this.state.disabled,
        status: this.state.status,
        messages: this.state.messages,
        value: this.state.value,
        touched: this.state.touched,
        dirty: this.state.dirty,
        ...detail,
      },
    }));
  }
}

customElements.define('ui-form-field', UIFormField);


