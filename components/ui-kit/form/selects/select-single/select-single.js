import { BaseElement } from '../../../../base-element.js';
import { renderSelectSingleTemplate } from './select-single-template.js';
import { filterOptions, resolvePath } from '../select-utils.js';

if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./select-single-styles.css', import.meta.url));
}

const EVENT_PREFIX = 'ui-select';

export class UISelectSingle extends BaseElement {
  static stateSchema = {
    value:            { type: 'string',  default: '', attribute: { name: 'value', observed: true, reflect: true } },
    options:          { type: 'json',    default: [], attribute: { name: 'options', observed: true, reflect: true } },
    placeholder:      { type: 'string',  default: 'Выберите значение', attribute: { name: 'placeholder', observed: true, reflect: true } },
    disabled:         { type: 'boolean', default: false, attribute: { name: 'disabled', observed: true, reflect: true } },
    required:         { type: 'boolean', default: false, attribute: { name: 'required', observed: true, reflect: true } },
    dropdownOpen:     { type: 'boolean', default: false, attribute: null, internal: true },
    showSearch:       { type: 'boolean', default: false, attribute: { name: 'searchable', observed: true, reflect: true } },
    searchQuery:      { type: 'string',  default: '', attribute: null, internal: true },
    highlightedIdx:   { type: 'number',  default: -1, attribute: null, internal: true },
    decorators:       { type: 'json',    default: null, attribute: null },
    searchPlaceholder:{ type: 'string',  default: 'Поиск…', attribute: { name: 'search-placeholder', observed: true, reflect: true } },
    emptyMessage:     { type: 'string',  default: 'Нет данных', attribute: { name: 'empty-message', observed: true, reflect: true } },
    filterFn:         { type: 'string',  default: '', attribute: { name: 'filter-fn', observed: true, reflect: true } },
    loading:          { type: 'boolean', default: false, attribute: { name: 'loading', observed: true, reflect: true } },
    status:           { type: 'string',  default: 'default', attribute: null },
    messages:         { type: 'json',    default: null, attribute: null },
    meta:             { type: 'json',    default: null, attribute: null },
    filteredOptions:  { type: 'json',    default: [], attribute: null, internal: true },
    selectedOption:   { type: 'json',    default: null, attribute: null, internal: true },
    touched:          { type: 'boolean', default: false, attribute: null, internal: true },
    dirty:            { type: 'boolean', default: false, attribute: null, internal: true }
  };

  constructor() {
    super();
    this._onTriggerClick = this._onTriggerClick.bind(this);
    this._onSearchInput = this._onSearchInput.bind(this);
    this._onOptionClick = this._onOptionClick.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onDocumentClick = this._onDocumentClick.bind(this);

    this._triggerEl = null;
    this._dropdownEl = null;
    this._searchEl = null;
    this._optionsEl = null;
  }

  connectedCallback() {
    super.connectedCallback();
    
    // Рендерим сначала
    this._deriveState();
    this.render();
    
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
    
    this._detachEvents();
    this._removeDocumentListener();
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
    if (this.state._valueDescriptor) {
      // Обновляем derived state при изменении значения извне
      this._deriveState();
      this.render();
      return;
    }
    
    // Создаем ссылку на значение в стейте поля
    Object.defineProperty(this.state, 'value', {
      get: () => field.state.value ?? '',
      set: (val) => {
        field.state.value = val ?? ''; // Используем setter поля (который синхронизируется с формой)
        // Обновляем derived state и UI
        this._deriveState();
        this.render();
      },
      enumerable: true,
      configurable: true
    });
    this.state._valueDescriptor = true;
    
    // Обновляем derived state с начальным значением
    this._deriveState();
    this.render();
  }

  onStateChanged(key) {
    if (['options', 'value', 'searchQuery', 'filterFn'].includes(key)) {
      this._deriveState();
      this.render();
    }
    if (key === 'dropdownOpen') {
      // Применяем классы напрямую к самому элементу
      if (this.state.dropdownOpen) {
        this.classList.add('is-open');
        this.setAttribute('data-open', 'true');
        this._addDocumentListener();
      } else {
        this.classList.remove('is-open');
        this.removeAttribute('data-open');
        this._removeDocumentListener();
      }
    }
    if (key === 'disabled') {
      // Применяем классы напрямую к самому элементу
      if (this.state.disabled) {
        this.classList.add('is-disabled');
      } else {
        this.classList.remove('is-disabled');
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

  render() {
    this._detachEvents();
    this.innerHTML = renderSelectSingleTemplate(this.state);
    this._cacheElements();
    this._attachEvents();
  }

  _cacheElements() {
    this._triggerEl = this.querySelector('.ui-select-single__trigger');
    this._dropdownEl = this.querySelector('.ui-select-single__dropdown');
    this._searchEl = this.querySelector('.ui-select-single__search');
    this._optionsEl = this.querySelector('.ui-select-single__options');
  }

  _attachEvents() {
    if (this._triggerEl) {
      this._triggerEl.addEventListener('click', this._onTriggerClick);
      this._triggerEl.addEventListener('keydown', this._onKeyDown);
    }
    if (this._searchEl) {
      this._searchEl.addEventListener('input', this._onSearchInput);
      this._searchEl.addEventListener('keydown', this._onKeyDown);
    }
    if (this._optionsEl) {
      this._optionsEl.addEventListener('click', this._onOptionClick);
      this._optionsEl.addEventListener('keydown', this._onKeyDown);
    }
    this.addEventListener('keydown', this._onKeyDown);
  }

  _detachEvents() {
    if (this._triggerEl) {
      this._triggerEl.removeEventListener('click', this._onTriggerClick);
      this._triggerEl.removeEventListener('keydown', this._onKeyDown);
    }
    if (this._searchEl) {
      this._searchEl.removeEventListener('input', this._onSearchInput);
      this._searchEl.removeEventListener('keydown', this._onKeyDown);
    }
    if (this._optionsEl) {
      this._optionsEl.removeEventListener('click', this._onOptionClick);
      this._optionsEl.removeEventListener('keydown', this._onKeyDown);
    }
    this.removeEventListener('keydown', this._onKeyDown);
  }

  _deriveState() {
    const options = Array.isArray(this.state.options) ? this.state.options : [];
    const selectedOption = options.find(option => option.value === this.state.value) || null;
    const filterFn = this.state.filterFn ? (typeof this.state.filterFn === 'function' ? this.state.filterFn : resolvePath(this.state.filterFn)) : null;
    const filteredOptions = filterOptions(options, this.state.searchQuery, filterFn);

    const showSearch = this.state.showSearch || filteredOptions.length > 8;
    const highlightedIdx = Math.min(
      Math.max(this.state.highlightedIdx, selectedOption ? filteredOptions.findIndex(opt => opt.value === selectedOption.value) : 0),
      filteredOptions.length - 1
    );

    this.setState({
      selectedOption,
      filteredOptions,
      showSearch,
      highlightedIdx
    });
  }

  _toggleDropdown(forceState) {
    if (this.state.disabled) return;
    const next = typeof forceState === 'boolean' ? forceState : !this.state.dropdownOpen;
    this.setState({ dropdownOpen: next });
    if (next) {
      this._emit(EVENT_PREFIX + ':open', { value: this.state.value });
      requestAnimationFrame(() => {
        if (this._searchEl) this._searchEl.focus();
      });
    } else {
      this._emit(EVENT_PREFIX + ':close', { value: this.state.value });
    }
  }

  _onTriggerClick(event) {
    event.preventDefault();
    this._toggleDropdown();
  }

  _onSearchInput(event) {
    const query = event.target.value;
    this.setState({ searchQuery: query, highlightedIdx: 0 });
    this._emit(EVENT_PREFIX + ':search', { query });
  }

  _onOptionClick(event) {
    const li = event.target.closest('.ui-select-single__option');
    if (!li || li.classList.contains('is-disabled')) return;
    const value = li.dataset.value;
    this._selectValue(value);
  }

  _onKeyDown(event) {
    if (!this.state.dropdownOpen && (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      this._toggleDropdown(true);
      return;
    }

    if (!this.state.dropdownOpen) return;

    const maxIndex = (this.state.filteredOptions?.length || 0) - 1;
    if (maxIndex < 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.setState({ highlightedIdx: Math.min(maxIndex, (this.state.highlightedIdx + 1) % (maxIndex + 1)) });
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.setState({
          highlightedIdx:
            this.state.highlightedIdx <= 0 ? maxIndex : this.state.highlightedIdx - 1
        });
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this._selectHighlighted();
        break;
      case 'Escape':
        event.preventDefault();
        this._toggleDropdown(false);
        break;
      case 'Tab':
        this._toggleDropdown(false);
        break;
      default:
        break;
    }
  }

  _selectHighlighted() {
    const idx = this.state.highlightedIdx;
    const option = Array.isArray(this.state.filteredOptions) ? this.state.filteredOptions[idx] : null;
    if (option && !option.disabled) {
      this._selectValue(option.value);
    }
  }

  _selectValue(value) {
    if (value === this.state.value) {
      this._toggleDropdown(false);
      return;
    }
    
    // Обновляем через setter (который синхронизируется с полем и формой)
    this.state.value = value;
    
    // Обновляем остальные флаги
    this.setState({ dropdownOpen: false, searchQuery: '', dirty: true, touched: true });
    
    const option = (this.state.options || []).find(opt => opt.value === value) || null;
    this._emit(EVENT_PREFIX + ':select', { value, option });
    this._emit(EVENT_PREFIX + ':change', { value, option });
  }

  _addDocumentListener() {
    document.addEventListener('mousedown', this._onDocumentClick);
  }

  _removeDocumentListener() {
    document.removeEventListener('mousedown', this._onDocumentClick);
  }

  _onDocumentClick(event) {
    if (!this.contains(event.target)) {
      this._toggleDropdown(false);
    }
  }

  _emit(name, detail) {
    this.dispatchEvent(new CustomEvent(name, {
      bubbles: true,
      composed: true,
      detail: {
        value: this.state.value || null,
        values: this.state.value ? [this.state.value] : [],
        ...detail
      }
    }));
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
      console.warn(`[ui-select-single] Value "${value}" not found in options`);
      return this;
    }
    
    const previousValue = this.state.value;
    const newValue = value ?? null;
    
    // Обновляем через setter (если есть связь с полем)
    if (this.state._valueDescriptor) {
      this.state.value = newValue;
    } else {
      this.setState({ value: newValue });
      this._deriveState();
      this.render();
    }
    
    // Если связь есть, обновляем derived state и UI
    if (this.state._valueDescriptor) {
      this._deriveState();
      this.render();
    }
    
    if (previousValue !== newValue) {
      this.setState({ dirty: true });
      this._emit(EVENT_PREFIX + ':change', { value: newValue, previousValue, option });
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

  /**
   * Открыть выпадающий список
   * @returns {this}
   */
  open() {
    if (!this.state.disabled) {
      this._toggleDropdown(true);
    }
    return this;
  }

  /**
   * Закрыть выпадающий список
   * @returns {this}
   */
  close() {
    if (this.state.dropdownOpen) {
      this._toggleDropdown(false);
    }
    return this;
  }
}

customElements.define('ui-select-single', UISelectSingle);

