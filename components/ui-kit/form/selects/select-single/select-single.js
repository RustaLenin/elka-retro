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
    this._deriveState();
    this.render();
  }

  disconnectedCallback() {
    this._detachEvents();
    this._removeDocumentListener();
  }

  onStateChanged(key) {
    if (['options', 'value', 'searchQuery', 'filterFn'].includes(key)) {
      this._deriveState();
    }
    if (key === 'dropdownOpen') {
      if (this.state.dropdownOpen) this._addDocumentListener();
      else this._removeDocumentListener();
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
    this.setState({ value, dropdownOpen: false, searchQuery: '', dirty: true, touched: true });
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
}

customElements.define('ui-select-single', UISelectSingle);

