import { BaseElement } from '../../../base-element.js';
import { renderFormControllerTemplate } from './form-controller-template.js';

if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./form-controller-styles.css', import.meta.url));
}

export class UIFormController extends BaseElement {
  static stateSchema = {
    formId:    { type: 'string',  default: '', attribute: { name: 'form-id', observed: true, reflect: true } },
    title:     { type: 'string',  default: '', attribute: { name: 'title', observed: true, reflect: true } },
    description:{ type: 'string', default: '', attribute: { name: 'description', observed: true, reflect: true } },
    debug:     { type: 'boolean', default: false, attribute: { name: 'debug', observed: true, reflect: true } },
    icon:      { type: 'json',    default: null, attribute: null },
    actions:   { type: 'json',    default: null, attribute: null },
    layout:    { type: 'json',    default: null, attribute: null },
    pipeline:  { type: 'json',    default: null, attribute: null },
    status:    { type: 'json',    default: null, attribute: null },
    autosubmit:{ type: 'json',    default: null, attribute: null },
    values:    { type: 'json',    default: null, attribute: null },
    fields:    { type: 'json',    default: null, attribute: null }
  };

  constructor() {
    super();
    this._onFieldEvent = this._onFieldEvent.bind(this);
    this._onSubmitClick = this._onSubmitClick.bind(this);
    this._onExtraActionClick = this._onExtraActionClick.bind(this);

    this._fieldEvents = [
      'ui-form-field:init',
      'ui-form-field:control-attached',
      'ui-form-field:input',
      'ui-form-field:change',
      'ui-form-field:select',
      'ui-form-field:deselect',
      'ui-form-field:open',
      'ui-form-field:close',
      'ui-form-field:search',
      'ui-form-field:blur',
      'ui-form-field:focus',
      'ui-form-field:validation',
      'ui-form-field:clear',
      'ui-form-field:increment',
      'ui-form-field:decrement'
    ];

    this._fieldStates = new Map();
    this._fields = new Map();
    this._pipelineHandlers = {};
    this._submitButton = null;
    this._extraButtons = [];
    this._isSubmitting = false;
    this._autosubmitTimer = null;
    this._autosubmitConfig = null;
  }

  connectedCallback() {
    super.connectedCallback();
    const defaults = {};
    if (!this.state.status) defaults.status = { type: 'idle', message: null, details: [] };
    if (!this.state.actions) defaults.actions = { submit: null, extra: [] };
    if (!this.state.values) defaults.values = {};
    if (!this.state.fields) defaults.fields = [];
    if (Object.keys(defaults).length > 0) {
      this.setState(defaults);
    } else {
      this.render();
    }
    this._fieldEvents.forEach(evt => this.addEventListener(evt, this._onFieldEvent));
  }

  disconnectedCallback() {
    this._unbindActions();
    this._fieldEvents.forEach(evt => this.removeEventListener(evt, this._onFieldEvent));
    this._clearAutosubmitTimer();
  }

  onStateChanged(_key) {
    if (_key === 'autosubmit') {
      this._autosubmitConfig = this.state.autosubmit || null;
    }
    if (_key === 'actions') {
      this._rebindActionsSoon();
    }
  }

  submit() {
    if (this._isSubmitting) return Promise.resolve();
    this._clearAutosubmitTimer();
    return this._runSubmissionFlow();
  }

  clear() {
    this._clearAutosubmitTimer();
    const payload = {};
    this._fieldStates.forEach((record, key) => {
      const fieldEl = record.field;
      const initialValue = record.initialValue ?? '';
      if (fieldEl && typeof fieldEl.setState === 'function') {
        fieldEl.setState({
          value: initialValue,
          status: 'default',
          messages: null,
          touched: false,
          dirty: false
        });
      }
      record.value = initialValue;
      record.status = 'default';
      record.messages = null;
      record.touched = false;
      record.dirty = false;
      payload[record.name || key] = initialValue;
    });
    this._syncAggregatedState();
    this._emitFormEvent('clear', { values: this.state.values });
  }

  copyToClipboard() {
    const values = this.state.values || {};
    const payload = JSON.stringify(values, null, 2);
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(payload).catch(() => {
        this._fallbackCopy(payload);
      });
    } else {
      this._fallbackCopy(payload);
    }
    this._emitFormEvent('copy', { values });
  }

  render() {
    this.innerHTML = renderFormControllerTemplate(this.state);
    this._bindActions();
  }

  configure(config = {}) {
    if (config.pipeline) {
      this._pipelineHandlers = config.pipeline;
    }
    const patch = {};
    if (config.id !== undefined) patch.formId = config.id;
    if (config.title !== undefined) patch.title = config.title;
    if (config.description !== undefined) patch.description = config.description;
    if (config.icon !== undefined) patch.icon = config.icon;
    if (config.actions !== undefined) patch.actions = config.actions;
    if (config.layout !== undefined) patch.layout = config.layout;
    if (config.debug !== undefined) patch.debug = Boolean(config.debug);
    if (config.autosubmit !== undefined) patch.autosubmit = config.autosubmit;
    if (Object.keys(patch).length > 0) {
      this.setState(patch);
    }
  }

  setPipeline(pipeline = {}) {
    this._pipelineHandlers = pipeline || {};
  }

  setActions(actions = {}) {
    this.setState({ actions });
  }

  getValues() {
    return { ...(this.state.values || {}) };
  }

  _onFieldEvent(event) {
    const detail = event.detail || {};
    const fieldEl = event.target;
    const key = detail.fieldId || detail.name || fieldEl.getAttribute('field-id') || fieldEl.getAttribute('name');
    if (!key) return;

    let record = this._fieldStates.get(key);
    if (!record) {
      record = {
        fieldId: key,
        name: detail.name || key,
        field: fieldEl,
        initialValue: detail.value ?? fieldEl?.state?.value ?? null,
        value: detail.value ?? fieldEl?.state?.value ?? null,
        status: detail.status || 'default',
        messages: detail.messages || null,
        touched: Boolean(detail.touched),
        dirty: Boolean(detail.dirty),
        required: detail.required ?? fieldEl?.state?.required ?? false
      };
    }

    record.field = fieldEl;
    if (detail.name) record.name = detail.name;
    if (detail.value !== undefined) record.value = detail.value;
    if (detail.status) record.status = detail.status;
    if (detail.messages) record.messages = detail.messages;
    if (detail.touched !== undefined) record.touched = detail.touched;
    if (detail.dirty !== undefined) record.dirty = detail.dirty;
    if (detail.required !== undefined) record.required = detail.required;
    if (event.type === 'ui-form-field:init' || event.type === 'ui-form-field:control-attached') {
      record.initialValue = record.value;
    }
    this._fieldStates.set(key, record);
    this._fields.set(key, fieldEl);

    if (event.type === 'ui-form-field:change') {
      record.touched = true;
      this._scheduleAutosubmit('change', key);
    } else if (event.type === 'ui-form-field:input') {
      record.dirty = true;
      this._scheduleAutosubmit('input', key);
    } else if (event.type === 'ui-form-field:validation') {
      // Already handled above
    }

    this._syncAggregatedState();
    this._emitFormEvent(event.type.replace('ui-form-field:', ''), {
      fieldId: record.fieldId,
      name: record.name,
      value: record.value,
      status: record.status,
      messages: record.messages,
      origin: detail.origin,
      rawValue: detail.rawValue,
      formatted: detail.formatted,
      originalEvent: detail.originalEvent
    });
  }

  _bindActions() {
    this._unbindActions();
    this._submitButton = this.querySelector('ui-button[data-role="submit"]');
    this._extraButtons = Array.from(this.querySelectorAll('ui-button[data-role="extra"]'));

    if (this._submitButton) {
      this._submitButton.addEventListener('click', this._onSubmitClick);
    }
    this._extraButtons.forEach(btn => {
      btn.addEventListener('click', this._onExtraActionClick);
    });
  }

  _unbindActions() {
    if (this._submitButton) {
      this._submitButton.removeEventListener('click', this._onSubmitClick);
    }
    this._extraButtons.forEach(btn => btn.removeEventListener('click', this._onExtraActionClick));
    this._submitButton = null;
    this._extraButtons = [];
  }

  _rebindActionsSoon() {
    requestAnimationFrame(() => this._bindActions());
  }

  _onSubmitClick(event) {
    event.preventDefault();
    event.stopPropagation();
    this.submit();
  }

  _onExtraActionClick(event) {
    event.preventDefault();
    const button = event.currentTarget;
    const actionId = button?.dataset?.actionId;
    if (!actionId) return;

    if (actionId === 'clear') {
      this.clear();
      return;
    }
    if (actionId === 'copy-json') {
      this.copyToClipboard();
      return;
    }

    const actions = this.state.actions || {};
    const extra = Array.isArray(actions.extra) ? actions.extra : [];
    const config = extra.find(item => item.id === actionId);
    const handler = config?.handler;
    this._invokeHandler(handler, { actionId, controller: this, values: this.getValues() });
  }

  async _runSubmissionFlow() {
    const values = this.getValues();
    const context = { controller: this, values };

    try {
      this._isSubmitting = true;
      this._setSubmitLoading(true);
      this._setFormStatus({ type: 'validating', message: 'Проверяем данные…', details: [] });

      const sanitized = await this._invokeHandler(this._getPipelineHandler('sanitize'), context, values) ?? values;

      const requiredCheck = this._runRequiredValidation(sanitized);
      const requiredValid = this._applyValidationResult(requiredCheck);
      if (!requiredValid) {
        this._setFormStatus({ type: 'error', message: 'Заполните обязательные поля', details: requiredCheck?.formMessages?.details || [] });
        this._emitFormEvent('invalid', { values: sanitized, validation: requiredCheck });
        this._setSubmitLoading(false);
        this._isSubmitting = false;
        return;
      }

      const validationResult = await this._invokeHandler(this._getPipelineHandler('validate'), {
        ...context,
        values: sanitized
      });
      const valid = this._applyValidationResult(validationResult);
      if (!valid) {
        this._setFormStatus({ type: 'error', message: 'Некоторые поля заполнены неверно', details: validationResult?.formMessages || [] });
        this._emitFormEvent('invalid', { values: sanitized, validation: validationResult });
        this._setSubmitLoading(false);
        this._isSubmitting = false;
        return;
      }

      this._setFormStatus({ type: 'submitting', message: 'Отправляем данные…', details: [] });
      const submissionResult = await this._invokeHandler(this._getPipelineHandler('submit'), {
        ...context,
        values: sanitized
      });

      this._setFormStatus({ type: 'success', message: 'Форма успешно отправлена', details: [] });
      this._emitFormEvent('success', { values: sanitized, result: submissionResult });
      await this._invokeHandler(this._getPipelineHandler('onSuccess'), {
        ...context,
        values: sanitized,
        result: submissionResult
      });
      this._setSubmitSuccess();
    } catch (error) {
      console.error('[ui-form-controller] submit error', error);
      this._setFormStatus({ type: 'error', message: error?.message || 'Ошибка отправки формы', details: [] });
      this._emitFormEvent('error', { error });
      await this._invokeHandler(this._getPipelineHandler('onError'), { ...context, error });
    } finally {
      this._setSubmitLoading(false);
      this._isSubmitting = false;
    }
  }

  _applyValidationResult(result) {
    if (!result) return true;
    if (typeof result === 'boolean') return result;
    const valid = result.valid !== false;

    if (result.fieldMessages && typeof result.fieldMessages === 'object') {
      Object.entries(result.fieldMessages).forEach(([fieldKey, info]) => {
        const field = this._fields.get(fieldKey);
        if (field && typeof field.setState === 'function') {
          field.setState({
            status: info?.status || (Array.isArray(info?.messages?.error) && info.messages.error.length ? 'error' : 'default'),
            messages: info?.messages || null
          });
        }
        const record = this._fieldStates.get(fieldKey);
        if (record) {
          record.status = info?.status || record.status;
          record.messages = info?.messages || record.messages;
        }
      });
      this._syncAggregatedState();
    }

    if (result.formMessages) {
      this._setFormStatus({
        type: valid ? 'success' : 'error',
        message: result.formMessages.message || null,
        details: result.formMessages.details || []
      });
    }

    return valid;
  }

  _getPipelineHandler(name) {
    const fromState = this.state.pipeline || {};
    const handler = fromState?.[name] ?? this._pipelineHandlers?.[name];
    return handler;
  }

  async _invokeHandler(handler, payload, fallback) {
    if (!handler) return fallback;
    let fn = handler;
    if (typeof handler === 'string') {
      fn = this._resolvePath(handler);
    }
    if (typeof fn !== 'function') return fallback;
    const result = fn.call(this, payload);
    if (result && typeof result.then === 'function') {
      return await result;
    }
    return result;
  }

  _resolvePath(path) {
    if (!path) return null;
    const segments = String(path).split('.');
    let ctx = window;
    for (const segment of segments) {
      if (!ctx || typeof ctx !== 'object') return null;
      ctx = ctx[segment];
    }
    return ctx;
  }

  _runRequiredValidation(values) {
    const fieldMessages = {};
    const missingFields = [];

    this._fieldStates.forEach((record, key) => {
      if (!record?.required) return;

      const fieldName = record.name || key;
      const value = values && Object.prototype.hasOwnProperty.call(values, fieldName)
        ? values[fieldName]
        : record.value;

      const isMissing =
        value === null ||
        value === undefined ||
        value === '' ||
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === 'boolean' && value === false);

      if (!isMissing) return;

      fieldMessages[key] = {
        status: 'error',
        messages: { error: ['Поле обязательно для заполнения'] }
      };
      missingFields.push(record.label || fieldName);
    });

    if (!missingFields.length) return null;

    return {
      valid: false,
      fieldMessages,
      formMessages: {
        message: 'Заполните обязательные поля',
        details: missingFields
      }
    };
  }

  _syncAggregatedState() {
    const values = {};
    const fields = [];
    this._fieldStates.forEach((record, key) => {
      values[record.name || key] = record.value ?? null;
      fields.push({
        fieldId: record.fieldId,
        name: record.name || key,
        status: record.status,
        messages: record.messages,
        touched: record.touched,
        dirty: record.dirty
      });
    });
    this.setState({ values, fields });
  }

  _setSubmitLoading(isLoading) {
    if (this._submitButton && typeof this._submitButton.setState === 'function') {
      this._submitButton.setState({ loading: isLoading, disabled: isLoading });
    }
  }

  _setSubmitSuccess() {
    if (this._submitButton && typeof this._submitButton.setState === 'function') {
      this._submitButton.setState({ loading: false, success: true, disabled: false });
      setTimeout(() => {
        if (this._submitButton) {
          this._submitButton.setState({ success: false });
        }
      }, 1500);
    }
  }

  _setFormStatus(status) {
    this.setState({
      status: {
        type: status?.type || 'idle',
        message: status?.message || null,
        details: Array.isArray(status?.details) ? status.details : []
      }
    });
  }

  _emitFormEvent(name, detail) {
    this.dispatchEvent(new CustomEvent(`ui-form:${name}`, {
      bubbles: true,
      composed: true,
      detail: {
        formId: this.state.formId || null,
        controller: this,
        values: this.state.values || {},
        ...detail
      }
    }));
  }

  _scheduleAutosubmit(eventType, fieldId) {
    if (!this._autosubmitConfig?.enabled) return;
    const allowedEvents = this._autosubmitConfig.events || ['change'];
    if (!allowedEvents.includes(eventType)) return;
    if (Array.isArray(this._autosubmitConfig.excludeFields) && fieldId) {
      if (this._autosubmitConfig.excludeFields.includes(fieldId)) return;
    }
    const delay = Number(this._autosubmitConfig.debounceMs || 0);
    if (delay <= 0) return;
    this._clearAutosubmitTimer();
    this._autosubmitTimer = setTimeout(() => {
      this.submit();
    }, delay);
  }

  _clearAutosubmitTimer() {
    if (this._autosubmitTimer) {
      clearTimeout(this._autosubmitTimer);
      this._autosubmitTimer = null;
    }
  }

  _fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.warn('[ui-form-controller] copy fallback failed', err);
    }
    document.body.removeChild(textarea);
  }
}

customElements.define('ui-form-controller', UIFormController);


