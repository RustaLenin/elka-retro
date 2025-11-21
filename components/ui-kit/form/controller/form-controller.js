import { BaseElement } from '../../../base-element.js';
import { renderFormControllerPageTemplate } from './form-controller-page-template.js';
import { renderFormControllerModalTemplate } from './form-controller-modal-template.js';

if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./form-controller-styles.css', import.meta.url));
}

export class UIFormController extends BaseElement {
  static stateSchema = {
    formId:    { type: 'string',  default: '', attribute: { name: 'form-id', observed: true, reflect: true } },
    title:     { type: 'string',  default: '', attribute: { name: 'title', observed: true, reflect: true } },
    description:{ type: 'string', default: '', attribute: { name: 'description', observed: true, reflect: true } },
    debug:     { type: 'boolean', default: false, attribute: { name: 'debug', observed: true, reflect: true } },
    configPath:{ type: 'string',  default: '', attribute: { name: 'config-path', observed: true, reflect: true } },
    mode:      { type: 'string',  default: 'page', attribute: { name: 'mode', observed: true, reflect: true } },
    background:{ type: 'boolean', default: false, attribute: { name: 'background', observed: true, reflect: true } },
    icon:      { type: 'json',    default: null, attribute: null },
    actions:   { type: 'json',    default: null, attribute: null },
    layout:    { type: 'json',    default: null, attribute: null },
    layoutGap: { type: 'string',  default: '', attribute: { name: 'layout-gap', observed: true, reflect: true } },
    pipeline:  { type: 'json',    default: null, attribute: null },
    status:    { type: 'json',    default: null, attribute: null },
    autosubmit:{ type: 'json',    default: null, attribute: null },
    values:    { type: 'json',    default: null, attribute: null },
    fields:    { type: 'json',    default: null, attribute: null }
  };

  constructor() {
    super();
    this._onSubmitClick = this._onSubmitClick.bind(this);
    this._onExtraActionClick = this._onExtraActionClick.bind(this);

    this._pipelineHandlers = {};
    this._submitButton = null;
    this._extraButtons = [];
    this._isSubmitting = false;
    this._autosubmitTimer = null;
    this._autosubmitConfig = null;
    this._overlayEl = null;
    this._overlayLoader = null;
  }

  connectedCallback() {
    super.connectedCallback();
    
    // Инициализируем дефолтные значения
    const defaults = {};
    if (!this.state.status) defaults.status = { type: 'idle', message: null, details: [] };
    if (!this.state.actions) defaults.actions = { submit: null, extra: [] };
    if (!this.state.fields) defaults.fields = [];
    
    if (Object.keys(defaults).length > 0) {
      this.setState(defaults);
    }
    
    // values инициализируется в _initFieldsState() после загрузки fields
    
    // Если указан config-path, загружаем конфигурацию
    if (this.state.configPath) {
      this._loadConfigFromPath(this.state.configPath);
    } else {
      // Если конфиг уже загружен, инициализируем поля
      if (this.state.fields && this.state.fields.length > 0) {
        this._initFieldsState();
        this.render();
        this._initFields();
      } else {
        this.render();
      }
    }
    
    this._bindActions();
    this._applyLayoutGap();
  }
  
  onStateChanged(key) {
    if (key === 'fields') {
      // Когда поля загружены, инициализируем их стейт и рендерим
      this._initFieldsState();
      this.render();
      // Ждем следующего кадра для инициализации ссылок (после того, как поля будут в DOM)
      requestAnimationFrame(() => {
        this._initFields();
      });
    }
    if (key === 'autosubmit') {
      this._autosubmitConfig = this.state.autosubmit || null;
    }
    if (key === 'actions') {
      this._rebindActionsSoon();
    }
    if (key === 'layoutGap') {
      this._applyLayoutGap();
    }
  }
  
  _loadConfigFromPath(configPath) {
    try {
      // Разбираем путь, например "window.app.forms.signIn" или "app.forms.signIn"
      const pathParts = configPath.split('.');
      let config = window;
      
      for (const part of pathParts) {
        if (config && typeof config === 'object' && part in config) {
          config = config[part];
        } else {
          console.warn(`[UIFormController] Config path "${configPath}" not found`);
          return;
        }
      }
      
      if (config && typeof config === 'object') {
        // Сохраняем pipeline
        if (config.pipeline) {
          this._pipelineHandlers = config.pipeline;
        }
        
        // Применяем конфигурацию
        const patch = {};
        if (config.formId !== undefined) patch.formId = config.formId;
        if (config.title !== undefined) patch.title = config.title;
        if (config.description !== undefined) patch.description = config.description;
        if (config.icon !== undefined) patch.icon = config.icon;
        if (config.actions !== undefined) patch.actions = config.actions;
        if (config.layout !== undefined) patch.layout = config.layout;
        if (config.layoutGap !== undefined) patch.layoutGap = config.layoutGap;
        if (config.debug !== undefined) patch.debug = Boolean(config.debug);
        if (config.autosubmit !== undefined) patch.autosubmit = config.autosubmit;
        
        // Устанавливаем поля и pipeline
        patch.fields = config.fields || [];
        patch.pipeline = config.pipeline || {};
        
        this.setState(patch);
      }
    } catch (error) {
      console.error(`[UIFormController] Error loading config from path "${configPath}":`, error);
    }
  }

  disconnectedCallback() {
    this._unbindActions();
    this._clearAutosubmitTimer();
  }

  _applyLayoutGap() {
    const value = this.state?.layoutGap;
    if (value) {
      this.style.setProperty('--ui-form-layout-gap', value);
    } else {
      this.style.removeProperty('--ui-form-layout-gap');
    }
  }

  // Публичный API

  /**
   * Получить все значения формы
   */
  getValues() {
    return this._getFieldValues();
  }

  /**
   * Получить значение конкретного поля
   */
  getFieldValue(fieldId) {
    const field = this.getField(fieldId);
    return field ? field.value() : null;
  }

  /**
   * Установить значение конкретного поля
   */
  setFieldValue(fieldId, value) {
    const field = this.getField(fieldId);
    if (field) {
      field.setValue(value);
    }
    return this;
  }

  /**
   * Получить поле по ID
   */
  getField(fieldId) {
    return this.querySelector(`ui-form-field[field-id="${fieldId}"]`) || null;
  }

  /**
   * Получить все поля формы
   */
  getFields() {
    return Array.from(this.querySelectorAll('ui-form-field'));
  }

  /**
   * Сбросить всю форму
   */
  reset() {
    this.getFields().forEach(field => {
      field.reset();
    });
    
    // Сбрасываем статус формы
    this.setState({
      status: {
        type: 'idle',
        message: null,
        details: []
      }
    });
    
    this._emitFormEvent('reset', { values: this.getValues() });
    return this;
  }

  /**
   * Валидировать форму без отправки
   * @returns {Promise<boolean>}
   */
  async validate() {
    const values = this.getValues();
    const context = { controller: this, values };

    const sanitized = (await this._invokeHandler(this._getPipelineHandler('sanitize'), context, values)) ?? values;

    const requiredCheck = this._runRequiredValidation(sanitized);
    const requiredValid = this._applyValidationResult(requiredCheck, { showStatus: false });
    if (!requiredValid) {
      this._emitFormEvent('invalid', { values: sanitized, validation: requiredCheck });
      return false;
    }

    const validationResult = await this._invokeHandler(this._getPipelineHandler('validate'), {
      ...context,
      values: sanitized
    });
    const valid = this._applyValidationResult(validationResult, { showStatus: false });
    if (!valid) {
      this._emitFormEvent('invalid', { values: sanitized, validation: validationResult });
      return false;
    }

    return true;
  }

  /**
   * Проверить валидность всех полей
   */
  isValid() {
    return this.getFields().every(field => field.isValid());
  }

  /**
   * Проверить, изменена ли форма
   */
  isDirty() {
    return this.getFields().some(field => field.isDirty());
  }

  /**
   * Отправить форму
   */
  async submit() {
    if (this._isSubmitting) return Promise.resolve();
    this._clearAutosubmitTimer();
    return this._runSubmissionFlow();
  }

  /**
   * Очистить форму (алиас для reset)
   */
  clear() {
    return this.reset();
  }

  // Внутренние методы

  /**
   * Инициализировать стейт values для всех полей
   */
  _initFieldsState() {
    const fields = this.state.fields || [];
    const values = {};
    
    fields.forEach(field => {
      // Инициализируем значение в зависимости от типа поля
      if (field.defaultValue !== undefined) {
        values[field.id] = field.defaultValue;
      } else {
        // Значения по умолчанию в зависимости от типа
        if (field.type === 'checkbox' || field.type === 'boolean') {
          values[field.id] = false;
        } else if (field.type === 'range') {
          values[field.id] = { min: null, max: null };
        } else if (field.type === 'select-multi') {
          values[field.id] = [];
        } else {
          values[field.id] = null;
        }
      }
    });
    
    this.setState({ values });
  }

  /**
   * Инициализировать поля со ссылками на стейт родителя
   */
  _initFields() {
    const fields = this.getFields();
    
    fields.forEach(fieldEl => {
      const fieldId = fieldEl.getAttribute('field-id');
      if (!fieldId) return;
      
      // Поле само создаст ссылку через _initStateLink()
      // Вызываем явно, если поле уже подключено
      if (fieldEl.isConnected && typeof fieldEl._initStateLink === 'function') {
        fieldEl._initStateLink();
      }
    });
  }

  /**
   * Получить значения всех полей напрямую из DOM
   */
  _getFieldValues() {
    const fields = this.getFields();
    const values = {};
    
    fields.forEach(field => {
      const fieldId = field.getAttribute('field-id');
      if (fieldId) {
        values[fieldId] = field.value();
      }
    });
    
    return values;
  }

  render() {
    const mode = this.state.mode || 'page';
    const template = mode === 'modal' 
      ? renderFormControllerModalTemplate(this.state)
      : renderFormControllerPageTemplate(this.state);
    
    this.innerHTML = template;
    this._bindActions();
    this._ensureOverlay();
  }

  _bindActions() {
    this._unbindActions();
    
    // В модальном режиме кнопки могут быть в footer модального окна
    const isModal = this.state.mode === 'modal';
    
    if (isModal) {
      const modal = this.closest('ui-modal');
      if (modal) {
        // Ищем кнопки в форме и в footer модального окна
        const formButton = this.querySelector('ui-button[data-role="submit"]');
        const modalFooter = modal.querySelector('.modal_footer');
        const footerButton = modalFooter?.querySelector('ui-button[data-role="submit"]');
        this._submitButton = footerButton || formButton;
        
        const formButtons = Array.from(this.querySelectorAll('ui-button[data-role="extra"]'));
        const footerButtons = modalFooter ? Array.from(modalFooter.querySelectorAll('ui-button[data-role="extra"]')) : [];
        this._extraButtons = [...footerButtons, ...formButtons];
      } else {
        // Если модального окна нет, ищем только в форме
        this._submitButton = this.querySelector('ui-button[data-role="submit"]');
        this._extraButtons = Array.from(this.querySelectorAll('ui-button[data-role="extra"]'));
      }
    } else {
      // Обычный режим - ищем только в форме
      this._submitButton = this.querySelector('ui-button[data-role="submit"]');
      this._extraButtons = Array.from(this.querySelectorAll('ui-button[data-role="extra"]'));
    }

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
      this.reset();
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
        this._setFormStatus({ type: 'idle', message: null, details: [] });
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
        this._setFormStatus({ type: 'idle', message: null, details: [] });
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

  _applyValidationResult(result, options = {}) {
    if (!result) return true;
    if (typeof result === 'boolean') return result;
    const valid = result.valid !== false;

    if (result.fieldMessages && typeof result.fieldMessages === 'object') {
      Object.entries(result.fieldMessages).forEach(([fieldKey, info]) => {
        const field = this.getField(fieldKey);
        if (field) {
          if (info?.status === 'error') {
            const messages = info?.messages?.error || [];
            const messageText = messages.length > 0 ? messages[0] : 'Поле заполнено некорректно';
            field.showError(messageText);
          } else if (info?.status === 'success') {
            field.showSuccess(info?.messages?.success?.[0]);
          } else {
            field.clearStatus();
          }
        }
      });
    }

    if (options.showStatus !== false && result.formMessages) {
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
    const fields = this.getFields();

    fields.forEach(field => {
      const fieldId = field.getAttribute('field-id');
      if (!fieldId) return;
      
      const fieldConfig = (this.state.fields || []).find(f => f.id === fieldId);
      if (!fieldConfig || !fieldConfig.required) return;

      const value = values[fieldId] ?? field.value();

      const isMissing =
        value === null ||
        value === undefined ||
        value === '' ||
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === 'boolean' && value === false);

      if (!isMissing) return;

      fieldMessages[fieldId] = {
        status: 'error',
        messages: { error: ['Поле обязательно для заполнения'] }
      };
      missingFields.push(fieldConfig.label || fieldId);
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
    const normalized = {
      type: status?.type || 'idle',
      message: status?.message || null,
      details: Array.isArray(status?.details) ? status.details : []
    };

    if (normalized.type === 'submitting') {
      this._toggleOverlay(true, normalized.message || 'Отправляем данные…');
    } else {
      this._toggleOverlay(false);
    }

    this.setState({ status: normalized });
  }

  _emitFormEvent(name, detail) {
    this.dispatchEvent(new CustomEvent(`ui-form:${name}`, {
      bubbles: true,
      composed: true,
      detail: {
        formId: this.state.formId || null,
        controller: this,
        values: this.getValues(),
        ...detail
      }
    }));
  }

  _clearAutosubmitTimer() {
    if (this._autosubmitTimer) {
      clearTimeout(this._autosubmitTimer);
      this._autosubmitTimer = null;
    }
  }

  _ensureOverlay() {
    const form = this.querySelector('form.ui-form-controller');
    if (!form) return;

    const isModal = this.state.mode === 'modal';
    
    // В модальном режиме overlay создаем внутри modal_body, иначе внутри формы
    let container = form;
    if (isModal) {
      // Ищем modal_body, в котором находится форма
      const modalBody = this.closest('.modal_body');
      if (modalBody) {
        container = modalBody;
      }
    }

    let overlay = container.querySelector('.ui-form-controller__overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'ui-form-controller__overlay';
      overlay.setAttribute('aria-hidden', 'true');
      overlay.style.display = 'none';
      overlay.style.pointerEvents = 'none';
      overlay.innerHTML = `
        <div class="ui-form-controller__overlay-content">
          <block-loader label="Отправляем данные…" size="large"></block-loader>
        </div>
      `;
      container.appendChild(overlay);
    }

    this._overlayEl = overlay;
    this._overlayLoader = overlay.querySelector('block-loader');
  }

  _toggleOverlay(isVisible, label) {
    if (!this._overlayEl) return;
    const visible = Boolean(isVisible);
    this._overlayEl.classList.toggle('ui-form-controller__overlay--visible', visible);
    this._overlayEl.setAttribute('aria-hidden', visible ? 'false' : 'true');
    this._overlayEl.style.display = visible ? 'flex' : 'none';
    this._overlayEl.style.pointerEvents = visible ? 'all' : 'none';
    if (visible && this._overlayLoader && label) {
      this._overlayLoader.setAttribute('label', label);
    }
  }

  copyToClipboard() {
    const values = this.getValues();
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
