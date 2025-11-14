import { BaseElement } from '../../../../base-element.js';
import { renderSegmentedToggleTemplate } from './segmented-toggle-template.js';

if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./segmented-toggle-styles.css', import.meta.url));
}

export class UISegmentedToggle extends BaseElement {
  static stateSchema = {
    value:       { type: 'string',  default: '', attribute: { name: 'value', observed: true, reflect: true } },
    options:    { type: 'json',    default: [], attribute: { name: 'options', observed: true, reflect: true } },
    name:       { type: 'string',  default: '', attribute: { name: 'name', observed: true, reflect: true } },
    disabled:   { type: 'boolean', default: false, attribute: { name: 'disabled', observed: true, reflect: true } },
    required:   { type: 'boolean', default: false, attribute: { name: 'required', observed: true, reflect: true } },
    status:     { type: 'string',  default: 'default', attribute: null },
    messages:   { type: 'json',    default: null, attribute: null },
    meta:       { type: 'json',    default: null, attribute: null },
    focused:    { type: 'string',  default: '', attribute: null, internal: true },
    dirty:      { type: 'boolean', default: false, attribute: null, internal: true }
  };

  constructor() {
    super();
    this._onOptionClick = this._onOptionClick.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._optionButtons = [];
  }

  connectedCallback() {
    super.connectedCallback();
    
    // Применяем атрибуты к самому элементу
    this.setAttribute('role', 'tablist');
    if (this.state.name) {
      this.setAttribute('name', this.state.name);
    }
    if (this.state.disabled) {
      this.setAttribute('data-disabled', 'true');
    }
    if (this.state.status && this.state.status !== 'default') {
      this.setAttribute('data-status', this.state.status);
    }
    
    // Рендерим сначала
    this.render();
    this._bindEvents();
    
    // Затем инициализируем связь со стейтом родителя (поля)
    requestAnimationFrame(() => {
      this._initStateLink();
    });
  }
  
  disconnectedCallback() {
    // Очищаем ссылку на стейт родителя
    if (this.state._valueDescriptor) {
      delete this.state.value;
      delete this.state._valueDescriptor;
    }
  }
  
  _initStateLink() {
    // Находим родителя (поле)
    const field = this.closest('ui-form-field');
    if (!field || !field.state) {
      // Если поля нет, работаем автономно (не в контексте формы)
      return;
    }
    
    // Если value еще не инициализирован (поле еще не создало ссылку на форму), ждем
    if (field.state.value === undefined || !field.state._valueDescriptor) {
      // Пытаемся еще раз через кадр
      requestAnimationFrame(() => {
        this._initStateLink();
      });
      return;
    }
    
    // Если ссылка уже создана, не создаем повторно
    if (this.state._valueDescriptor) return;
    
    // Создаем ссылку на значение в стейте поля
    Object.defineProperty(this.state, 'value', {
      get: () => field.state.value ?? '',
      set: (val) => {
        field.state.value = val ?? ''; // Используем setter поля (который синхронизируется с формой)
        // Обновляем UI
        this._updateActiveState();
      },
      enumerable: true,
      configurable: true
    });
    this.state._valueDescriptor = true;
    
    // Устанавливаем начальное значение в UI
    if (field.state.value !== null && field.state.value !== undefined) {
      this._updateActiveState();
    }
  }

  onStateChanged(key) {
    // Применяем атрибуты напрямую к самому элементу
    if (key === 'name') {
      if (this.state.name) {
        this.setAttribute('name', this.state.name);
      } else {
        this.removeAttribute('name');
      }
    }
    if (key === 'disabled') {
      if (this.state.disabled) {
        this.setAttribute('data-disabled', 'true');
      } else {
        this.removeAttribute('data-disabled');
      }
    }
    if (key === 'status') {
      const status = this.state.status || 'default';
      if (status !== 'default') {
        this.setAttribute('data-status', status);
      } else {
        this.removeAttribute('data-status');
      }
    }
  }

  _bindEvents() {
    this._optionButtons = Array.from(this.querySelectorAll('[data-option]'));
    this._optionButtons.forEach((btn, index) => {
      btn.addEventListener('click', this._onOptionClick);
      btn.addEventListener('keydown', this._onKeyDown);
      btn.setAttribute('tabindex', index === 0 ? '0' : '-1');
    });
  }

  _onOptionClick(e) {
    if (this.state.disabled) return;
    const optionValue = e.currentTarget.getAttribute('data-option');
    if (optionValue === this.state.value) return;
    const previousValue = this.state.value;
    
    // Обновляем через setter (который синхронизируется с полем и формой)
    this.state.value = optionValue;
    
    // Обновляем флаги
    this.setState({ dirty: true });
    
    // UI обновится автоматически через setter
    this._emitEvent('change', {
      value: optionValue,
      previousValue: previousValue
    });
  }

  _onKeyDown(e) {
    if (this.state.disabled) return;
    const currentIndex = this._optionButtons.findIndex(btn => btn.getAttribute('data-option') === this.state.value);
    let nextIndex = currentIndex;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIndex = currentIndex > 0 ? currentIndex - 1 : this._optionButtons.length - 1;
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIndex = currentIndex < this._optionButtons.length - 1 ? currentIndex + 1 : 0;
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const optionValue = e.currentTarget.getAttribute('data-option');
      if (optionValue !== this.state.value) {
        this._onOptionClick({ currentTarget: e.currentTarget });
      }
      return;
    } else {
      return;
    }
    if (nextIndex !== currentIndex) {
      const nextButton = this._optionButtons[nextIndex];
      const nextValue = nextButton.getAttribute('data-option');
      const previousValue = this.state.value;
      
      // Обновляем через setter (который синхронизируется с полем и формой)
      this.state.value = nextValue;
      
      // Обновляем флаги
      this.setState({ dirty: true });
      
      // UI обновится автоматически через setter
      nextButton.focus();
      this._emitEvent('change', {
        value: nextValue,
        previousValue: previousValue
      });
    }
  }

  _updateActiveState() {
    this._optionButtons.forEach(btn => {
      const optionValue = btn.getAttribute('data-option');
      const isActive = optionValue === this.state.value;
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      btn.classList.toggle('ui-segmented-toggle__option--active', isActive);
      btn.setAttribute('tabindex', isActive ? '0' : '-1');
    });
  }

  _emitEvent(type, detail) {
    this.dispatchEvent(new CustomEvent(`ui-segmented-toggle:${type}`, {
      bubbles: true,
      composed: true,
      detail: {
        ...detail,
        component: 'ui-segmented-toggle',
        name: this.state.name
      }
    }));
  }

  render() {
    this.innerHTML = renderSegmentedToggleTemplate(this.state);
    this._bindEvents();
    this._updateActiveState();
  }

  // Публичный API

  /**
   * Получить текущее значение
   * @returns {string|null}
   */
  value() {
    return this.state.value ?? null;
  }

  /**
   * Установить значение
   * @param {string|null} value - новое значение
   * @returns {this}
   */
  setValue(value) {
    // Проверяем, что значение есть в опциях
    const options = this.state.options || [];
    const option = options.find(opt => 
      opt.value === value || String(opt.value) === String(value)
    );
    
    if (value !== null && value !== undefined && value !== '' && !option) {
      console.warn(`[ui-segmented-toggle] Value "${value}" not found in options`);
      return this;
    }
    
    const previousValue = this.state.value;
    const newValue = value ?? null;
    
    // Обновляем через setter (если есть связь с полем)
    if (this.state._valueDescriptor) {
      this.state.value = newValue;
    } else {
      this.setState({ value: newValue });
    }
    
    // Обновляем UI
    this._updateActiveState();
    
    if (previousValue !== newValue) {
      this.setState({ dirty: true });
      this._emitEvent('change', { value: newValue, previousValue });
    }
    
    return this;
  }

  /**
   * Сбросить к дефолтному значению
   * @returns {this}
   */
  reset() {
    this.setValue(null);
    this.setState({ dirty: false, touched: false });
    return this;
  }

  /**
   * Проверить валидность
   * @returns {boolean}
   */
  isValid() {
    return !this.state.status || this.state.status !== 'error';
  }
}

customElements.define('ui-segmented-toggle', UISegmentedToggle);

