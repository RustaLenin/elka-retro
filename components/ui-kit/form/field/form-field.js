import { BaseElement } from '../../../base-element.js';
import { renderFormFieldTemplate } from './form-field-template.js';

if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./form-field-styles.css', import.meta.url));
}

export class UIFormField extends BaseElement {
  static autoRender = false; // Отключаем автоматический рендер, управляем вручную

  static stateSchema = {
    fieldId:     { type: 'string',  default: '', attribute: { name: 'field-id', observed: true, reflect: true } },
    name:        { type: 'string',  default: '', attribute: { name: 'name', observed: true, reflect: true } },
    label:       { type: 'string',  default: '', attribute: { name: 'label', observed: true, reflect: true } },
    description: { type: 'string',  default: '', attribute: { name: 'description', observed: true, reflect: true } },
    required:    { type: 'boolean', default: false, attribute: { name: 'required', observed: true, reflect: true } },
    disabled:    { type: 'boolean', default: false, attribute: { name: 'disabled', observed: true, reflect: true } },
    status:      { type: 'string',  default: 'default', attribute: null },
    statusMessage: { type: 'string', default: '', attribute: null },
    messages:    { type: 'json',    default: null, attribute: null },
    hints:       { type: 'json',    default: null, attribute: null },
    tooltip:     { type: 'json',    default: null, attribute: null },
    icon:        { type: 'json',    default: null, attribute: null },
    value:       { type: 'json',    default: null, attribute: null },
    meta:        { type: 'json',    default: null, attribute: null },
    touched:     { type: 'boolean', default: false, attribute: null, internal: true },
    dirty:       { type: 'boolean', default: false, attribute: null, internal: true },
    autoValidate:{ type: 'boolean', default: false, attribute: { name: 'auto-validate', observed: true, reflect: true } },
    errorMessage:{ type: 'string',  default: 'Поле заполнено некорректно', attribute: { name: 'error-message', observed: true, reflect: true } },
    successMessage:{ type: 'string', default: 'Готово', attribute: { name: 'success-message', observed: true, reflect: true } },
    allowedPattern:{ type: 'string', default: '', attribute: { name: 'allowed-pattern', observed: true, reflect: true } }
  };

  constructor() {
    super();
    this._onControlEvent = this._onControlEvent.bind(this);
    this._controlEl = null;
    this._initialValue = null;
    this._statusTimer = null;
    this._statusMessageEl = null;
  }

  connectedCallback() {
    super.connectedCallback();
    
    // ВАЖНО: Сначала загружаем конфигурацию поля из data-атрибута или из формы
    // Конфигурация нужна для рендеринга контрола
    this._loadFieldConfig();
    
    // Рендерим после загрузки конфигурации
    this.render();
    
    // Затем инициализируем связь со стейтом родителя
    // Ждем следующий кадр, чтобы убедиться, что родитель уже инициализировал values
    requestAnimationFrame(() => {
      this._initStateLink();
    });
  }
  
  /**
   * Загрузить конфигурацию поля из data-атрибута или из конфигурации формы
   * @private
   */
  _loadFieldConfig() {
    if (this.state.config) {
      return; // Конфигурация уже загружена
    }
    
    const fieldId = this.getAttribute('field-id');
    if (!fieldId) {
      return;
    }
    
    // Пытаемся загрузить из data-атрибута (переданного через renderField)
    const configAttr = this.getAttribute('data-field-config');
    if (configAttr) {
      try {
        this.state.config = JSON.parse(configAttr);
        return;
      } catch (e) {
        // Если не удалось распарсить, попробуем получить из формы
      }
    }
    
    // Fallback: получаем из конфигурации формы
    const formController = this.closest('ui-form-controller');
    if (formController && formController.state) {
      const fieldConfig = (formController.state.fields || []).find(f => f.id === fieldId);
      if (fieldConfig) {
        this.state.config = fieldConfig;
      }
    }
  }
  
  _initStateLink() {
    // Находим родителя и инициализируем связь со стейтом
    const formController = this.closest('ui-form-controller');
    if (!formController || !formController.state) return;
    
    const fieldId = this.getAttribute('field-id');
    if (!fieldId) return;
    
    // Убеждаемся, что конфигурация загружена (должна быть загружена в connectedCallback)
    if (!this.state.config) {
      this._loadFieldConfig();
    }
    
    // Если есть конфигурация, сохраняем начальное значение
    if (this.state.config && !this._initialValue) {
      this._initialValue = this.state.config.defaultValue ?? null;
      this.state.initialValue = this._initialValue;

      if (this.state.config.allowedPattern) {
        this.setState({ allowedPattern: this.state.config.allowedPattern });
      }
    }
    
    // Если values еще не инициализированы, ждем
    if (!formController.state.values || formController.state.values[fieldId] === undefined) {
      // Пытаемся еще раз через кадр
      requestAnimationFrame(() => {
        this._initStateLink();
      });
      return;
    }
    
    // Если ссылка уже создана, не создаем повторно
    if (this.state._valueDescriptor) return;
    
    // Создаем ссылку на значение в стейте родителя
    Object.defineProperty(this.state, 'value', {
      get: () => formController.state.values[fieldId],
      set: (val) => {
        formController.state.values[fieldId] = val;
        // Обновляем контрол
        const control = this._getControl();
        if (control) {
          if (typeof control.applyExternalValue === 'function') {
            control.applyExternalValue(val);
          }
        }
      },
      enumerable: true,
      configurable: true
    });
    this.state._valueDescriptor = true;
    
    // Устанавливаем начальное значение, если его еще нет
    if (formController.state.values[fieldId] === null || formController.state.values[fieldId] === undefined) {
      formController.state.values[fieldId] = this._initialValue;
    }
  }

  disconnectedCallback() {
    this._detachControlListeners();
    this._detachTextareaListeners();
    
    // Очищаем ссылку на стейт родителя
    if (this.state._valueDescriptor) {
      delete this.state.value;
      delete this.state._valueDescriptor;
    }
  }

  onStateChanged(_key) {
    // value, dirty, touched НЕ должны вызывать render() - это внутренние флаги состояния
    // Контрол сам обновляет значение напрямую через ссылку
    
    // Обновляем состояние контрола без перерисовки
    if (_key === 'disabled' || _key === 'required') {
      this._applyFieldStateToControl();
    }
    
    // Для textarea синхронизируем значение при изменении
    if (_key === 'value' && this._controlEl && this._controlEl.tagName === 'TEXTAREA') {
      this._syncTextarea();
    }

    // Обновляем статус без перерисовки
    if (_key === 'status' || _key === 'messages') {
      this._updateStatus();
      if (this._controlEl) {
        this._emitFieldEvent('ui-form-field:validation', {
          status: this.state.status,
          messages: this.state.messages || { error: [], success: [], info: [] },
        });
      }
    }
    
    // Перерисовываем только при изменении структуры (label, description, config)
    const structuralKeys = ['label', 'description', 'config'];
    if (structuralKeys.includes(_key)) {
      this.render();
    }
    
    // dirty и touched - только внутренние флаги, не требуют обновления DOM
  }
  
  /**
   * Обновить статус без перерисовки
   * @private
   */
  _updateStatus() {
    if (!this.shadowRoot && !this.querySelector('.ui-form-field')) {
      return; // Еще не отрендерено
    }
    
    const status = this.state.status || 'default';
    const fieldEl = this.querySelector('.ui-form-field');
    if (fieldEl) {
      // Удаляем все статусные классы
      fieldEl.classList.remove('ui-form-field--default', 'ui-form-field--error', 'ui-form-field--success', 'ui-form-field--warning');
      // Добавляем текущий статус
      if (status !== 'default') {
        fieldEl.classList.add(`ui-form-field--${status}`);
      }
    }

    if (status === 'error') {
      this.setAttribute('is_error', 'true');
      this.removeAttribute('is_success');
    } else if (status === 'success') {
      this.setAttribute('is_success', 'true');
      this.removeAttribute('is_error');
    } else {
      this.removeAttribute('is_error');
      this.removeAttribute('is_success');
    }

    if (this._statusMessageEl) {
      this._statusMessageEl.textContent = this.state.statusMessage || '';
    }
  }

  render() {
    this._detachControlListeners();
    this._detachTextareaListeners();
    
    // Проверяем, что конфигурация загружена перед рендером
    if (!this.state.config) {
      this._loadFieldConfig();
    }
    
    // Рендерим шаблон поля (контрол рендерится внутри шаблона на основе state.config)
    this.innerHTML = renderFormFieldTemplate(this.state);
    
    // Находим контрол после рендера (веб-компоненты или нативный textarea)
    this._controlEl = this.querySelector('ui-input-text, ui-input-number, ui-input-range, ui-select-single, ui-select-multi, ui-checkbox, .ui-form-field__textarea, textarea');
    this._statusMessageEl = this.querySelector('.ui-form-field__status-message');
    
    // Применяем состояние к контролу
    this._applyFieldStateToControl();
    
    // Для нативного textarea синхронизируем значение и добавляем слушатели
    if (this._controlEl && this._controlEl.tagName === 'TEXTAREA') {
      this._syncTextarea();
      this._attachTextareaListeners();
    } else if (this._controlEl) {
      // Подключаем слушатели событий веб-компонента
      this._attachControlListeners();
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
      'ui-input-range:input',
      'ui-input-range:change',
      'ui-input-range:focus',
      'ui-input-range:blur',
      'ui-input-range:validation',
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
      'ui-select:validation',
      'ui-segmented-toggle:change'
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
      'ui-input-range:input',
      'ui-input-range:change',
      'ui-input-range:focus',
      'ui-input-range:blur',
      'ui-input-range:validation',
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
      'ui-select:validation',
      'ui-segmented-toggle:change'
    ];
    matchEvents.forEach(evt => {
      this._controlEl.removeEventListener(evt, this._onControlEvent);
    });
  }


  _applyFieldStateToControl() {
    if (!this._controlEl) return;
    
    // Для нативного textarea используем _syncTextarea
    if (this._controlEl.tagName === 'TEXTAREA') {
      this._syncTextarea();
      return;
    }
    
    // Обновляем только атрибуты disabled и required, не трогая DOM структуру
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
    
    // Обновляем aria-атрибуты только если они изменились, чтобы избежать лишних изменений DOM
    const currentInvalid = this._controlEl.getAttribute('aria-invalid');
    const newInvalid = this.state.status === 'error' ? 'true' : 'false';
    if (currentInvalid !== newInvalid) {
      this._controlEl.setAttribute('aria-invalid', newInvalid);
    }
    
    // Оптимизируем aria-describedby - создаём id только если есть feedback
    const feedback = this.querySelector('.ui-form-field__feedback');
    if (feedback && !feedback.hidden) {
      const describedBy = this._ensureFeedbackId();
      if (describedBy) {
        const currentDescribedBy = this._controlEl.getAttribute('aria-describedby');
        if (currentDescribedBy !== describedBy) {
          this._controlEl.setAttribute('aria-describedby', describedBy);
        }
      }
    } else {
      this._controlEl.removeAttribute('aria-describedby');
    }
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
    const update = {};

    // value больше не обрабатываем здесь - инпут сам синхронизируется через ссылку
    // Обрабатываем только статус, сообщения и флаги состояния

    switch (type) {
      case 'ui-input-text:input':
      case 'ui-input-number:input':
      case 'ui-input-range:input':
        update.dirty = true;
        this.clearStatus();
        break;
      case 'ui-input-text:change':
      case 'ui-input-number:change':
      case 'ui-input-range:change':
        update.touched = true;
        break;
      case 'ui-input-text:blur':
      case 'ui-input-number:blur':
      case 'ui-input-range:blur':
        update.touched = true;
        if (this.state.autoValidate) {
          this._runAutoValidation();
        }
        break;
      case 'ui-input-text:validation':
      case 'ui-input-number:validation':
      case 'ui-input-range:validation':
      case 'ui-select:validation':
      case 'ui-checkbox:validation':
        update.status = detail.status || 'default';
        update.messages = detail.messages || null;
        break;
      case 'ui-select:change':
      case 'ui-checkbox:change':
      case 'ui-segmented-toggle:change':
        update.touched = true;
        // Синхронизируем значение из контрола с state поля
        if (detail.value !== undefined) {
          update.value = detail.value;
        }
        break;
      case 'ui-select:close':
        update.touched = true;
        if (this.state.autoValidate) {
          this._runAutoValidation();
        }
        break;
      case 'ui-select:select':
      case 'ui-select:deselect':
      case 'ui-checkbox:input':
        update.dirty = true;
        this.clearStatus();
        break;
      case 'ui-checkbox:blur':
        update.touched = true;
        if (this.state.autoValidate) {
          this._runAutoValidation();
        }
        break;
      default:
        break;
    }

    const hasUpdate = Object.keys(update).length > 0;
    if (hasUpdate) {
      this.setState(update);
    }
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

  // Публичный API

  /**
   * Получить текущее значение поля
   */
  value() {
    // Для нативного textarea получаем значение напрямую из элемента
    const control = this._getControl();
    if (control && control.tagName === 'TEXTAREA') {
      return control.value || null;
    }
    
    // Для веб-компонентов получаем значение напрямую из контрола для актуальности
    if (control) {
      // Проверяем, есть ли у контрола метод value()
      if (typeof control.value === 'function') {
        const controlValue = control.value();
        if (controlValue !== null && controlValue !== undefined) {
          return controlValue;
        }
      }
      // Или получаем из state контрола
      if (control.state && control.state.value !== undefined) {
        return control.state.value ?? null;
      }
    }
    
    // Fallback на state поля
    return this.state.value ?? null;
  }

  /**
   * Установить значение поля
   */
  setValue(value) {
    // Используем setter для синхронизации с родителем (формой)
    // Контрол автоматически синхронизируется через свою ссылку на поле
    this.state.value = value;
    
    // Контрол сам обновит свой DOM через свой setter
    // Но можем помочь, если контрол еще не создал ссылку
    const control = this._getControl();
    
    // Для нативного textarea обновляем напрямую
    if (control && control.tagName === 'TEXTAREA') {
      control.value = value !== null && value !== undefined ? String(value) : '';
      return this;
    }
    
    if (control && !control.state?._valueDescriptor) {
      // Если контрол еще не создал ссылку, обновляем напрямую
      if (typeof control.setValue === 'function') {
        control.setValue(value);
      } else if (typeof control.setState === 'function') {
        control.setState({ value });
      }
    }
    
    return this;
  }

  /**
   * Сбросить поле к начальному значению
   */
  reset() {
    const initialValue = this.state.initialValue ?? this._initialValue ?? null;
    this.setValue(initialValue);
    
    // Сбрасываем статус и сообщения
    this.setState({
      status: 'default',
      messages: null,
      touched: false,
      dirty: false
    });
    this.clearStatus();
    
    return this;
  }

  /**
   * Установить ошибку на поле
   */
  setError(message, options = {}) {
    const messages = Array.isArray(message) ? message : [message];
    this.showError(messages[0], options.duration);
    return this;
  }

  /**
   * Очистить ошибки
   */
  clearError() {
    this.clearStatus();
    return this;
  }

  showError(message, duration = 0) {
    const text = message || this.state.errorMessage || 'Поле заполнено некорректно';
    this.setState({ messages: { error: [text] } });
    this._setStatusState('error', text);
    this._triggerTransientErrorAnimation();
    if (duration) {
      this._scheduleStatusClear(duration);
    }
  }

  showSuccess(message, duration = 2000) {
    const text = message || this.state.successMessage || '';
    this.setState({ messages: { success: text ? [text] : [] } });
    this._setStatusState('success', text);
    if (duration) {
      this._scheduleStatusClear(duration);
    }
  }

  clearStatus() {
    this._clearStatusTimer();
    this.setState({ messages: null });
    this._setStatusState('default', '');
  }

  _setStatusState(status, message) {
    this.setState({
      status,
      statusMessage: message || ''
    });
  }

  _scheduleStatusClear(duration) {
    this._clearStatusTimer();
    this._statusTimer = setTimeout(() => {
      this.clearStatus();
    }, duration);
  }

  _clearStatusTimer() {
    if (this._statusTimer) {
      clearTimeout(this._statusTimer);
      this._statusTimer = null;
    }
  }

  _runAutoValidation() {
    const value = this.value();

    if (this.state.required && this._isEmptyValue(value)) {
      this.showError(this._getRuleMessage('required'));
      return false;
    }

    const validations = Array.isArray(this.state.config?.validation) ? this.state.config.validation : [];
    for (const rule of validations) {
      if (!this._validateRule(rule, value)) {
        this.showError(rule?.message || this._getRuleMessage(rule?.rule));
        return false;
      }
    }

    if (!this._isEmptyValue(value)) {
      this.showSuccess(this.state.successMessage);
    } else {
      this.clearStatus();
    }
    return true;
  }

  _validateRule(rule, value) {
    if (!rule || !rule.rule) return true;
    const comparable = value == null ? '' : value;
    switch (rule.rule) {
      case 'pattern': {
        if (!rule.value) return true;
        const regex = rule.value instanceof RegExp ? rule.value : new RegExp(rule.value);
        return regex.test(comparable);
      }
      case 'minLength':
        return String(comparable).length >= Number(rule.value || 0);
      case 'maxLength':
        return String(comparable).length <= Number(rule.value || Infinity);
      case 'min':
        return Number(comparable) >= Number(rule.value || 0);
      case 'max':
        return Number(comparable) <= Number(rule.value || 0);
      case 'required':
        return !this._isEmptyValue(comparable);
      default:
        return true;
    }
  }

  _isEmptyValue(value) {
    return (
      value === null ||
      value === undefined ||
      value === '' ||
      (Array.isArray(value) && value.length === 0)
    );
  }

  _getRuleMessage(rule) {
    if (rule === 'required') {
      return this.getAttribute('error-message') || 'Поле обязательно для заполнения';
    }
    return this.getAttribute('error-message') || this.state.errorMessage || 'Поле заполнено некорректно';
  }

  /**
   * Проверить, валидно ли поле
   */
  isValid() {
    return this.state.status !== 'error';
  }

  /**
   * Проверить, изменено ли поле
   */
  isDirty() {
    return this.state.dirty === true;
  }

  /**
   * Проверить, было ли поле в фокусе
   */
  isTouched() {
    return this.state.touched === true;
  }

  _triggerTransientErrorAnimation() {
    const fieldEl = this.querySelector('.ui-form-field');
    if (!fieldEl) return;
    fieldEl.classList.remove('ui-form-field--error-animated');
    // Force reflow to restart animation
    void fieldEl.offsetWidth;
    fieldEl.classList.add('ui-form-field--error-animated');
    setTimeout(() => {
      fieldEl.classList.remove('ui-form-field--error-animated');
    }, 1200);
  }

  /**
   * Получить контрол поля
   */
  _getControl() {
    return this.querySelector('ui-input-text, ui-input-number, ui-checkbox, ui-select, ui-select-multi, ui-input-range, ui-segmented-toggle, .ui-form-field__textarea');
  }

  /**
   * Синхронизировать значение нативного textarea с состоянием поля
   * @private
   */
  _syncTextarea() {
    const textarea = this._controlEl;
    if (!textarea || textarea.tagName !== 'TEXTAREA') return;
    
    // Устанавливаем значение из состояния
    if (this.state.value !== null && this.state.value !== undefined) {
      textarea.value = String(this.state.value);
    }
    
    // Синхронизируем состояние disabled/required
    if (this.state.disabled) {
      textarea.disabled = true;
    } else {
      textarea.disabled = false;
    }
    
    if (this.state.required) {
      textarea.setAttribute('required', '');
    } else {
      textarea.removeAttribute('required');
    }
  }

  /**
   * Подключить слушатели событий для нативного textarea
   * @private
   */
  _attachTextareaListeners() {
    const textarea = this._controlEl;
    if (!textarea || textarea.tagName !== 'TEXTAREA') return;
    
    this._textareaInputHandler = () => {
      this.setState({ 
        value: textarea.value,
        dirty: true 
      });
      this.clearStatus();
    };
    
    this._textareaChangeHandler = () => {
      this.setState({ 
        value: textarea.value,
        touched: true 
      });
    };
    
    this._textareaBlurHandler = () => {
      this.setState({ 
        value: textarea.value,
        touched: true 
      });
      if (this.state.autoValidate) {
        this._runAutoValidation();
      }
    };
    
    textarea.addEventListener('input', this._textareaInputHandler);
    textarea.addEventListener('change', this._textareaChangeHandler);
    textarea.addEventListener('blur', this._textareaBlurHandler);
  }

  /**
   * Отключить слушатели событий для нативного textarea
   * @private
   */
  _detachTextareaListeners() {
    const textarea = this._controlEl;
    if (!textarea || textarea.tagName !== 'TEXTAREA') return;
    
    if (this._textareaInputHandler) {
      textarea.removeEventListener('input', this._textareaInputHandler);
    }
    if (this._textareaChangeHandler) {
      textarea.removeEventListener('change', this._textareaChangeHandler);
    }
    if (this._textareaBlurHandler) {
      textarea.removeEventListener('blur', this._textareaBlurHandler);
    }
  }
}

customElements.define('ui-form-field', UIFormField);


