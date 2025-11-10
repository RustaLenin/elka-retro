import { BaseElement } from '../../../../base-element.js';
import { renderSelectMultiTemplate } from './select-multi-template.js';
import { filterOptions, resolvePath } from '../select-utils.js';

if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./select-multi-styles.css', import.meta.url));
}

const EVENT_PREFIX = 'ui-select';

export class UISelectMulti extends BaseElement {
  static stateSchema = {
    values:            { type: 'json',    default: [], attribute: { name: 'values', observed: true, reflect: true } },
    options:           { type: 'json',    default: [], attribute: { name: 'options', observed: true, reflect: true } },
    placeholder:       { type: 'string',  default: 'Выберите значения', attribute: { name: 'placeholder', observed: true, reflect: true } },
    disabled:          { type: 'boolean', default: false, attribute: { name: 'disabled', observed: true, reflect: true } },
    required:          { type: 'boolean', default: false, attribute: { name: 'required', observed: true, reflect: true } },
    dropdownOpen:      { type: 'boolean', default: false, attribute: null, internal: true },
    showSearch:        { type: 'boolean', default: false, attribute: { name: 'searchable', observed: true, reflect: true } },
    searchQuery:       { type: 'string',  default: '', attribute: null, internal: true },
    highlightedIdx:    { type: 'number',  default: -1, attribute: null, internal: true },
    decorators:        { type: 'json',    default: null, attribute: null },
    searchPlaceholder: { type: 'string',  default: 'Поиск…', attribute: { name: 'search-placeholder', observed: true, reflect: true } },
    emptyMessage:      { type: 'string',  default: 'Нет данных', attribute: { name: 'empty-message', observed: true, reflect: true } },
    filterFn:          { type: 'string',  default: '', attribute: { name: 'filter-fn', observed: true, reflect: true } },
    allowSelectAll:    { type: 'boolean', default: false, attribute: { name: 'allow-select-all', observed: true, reflect: true } },
    maxSelections:     { type: 'number',  default: null, attribute: { name: 'max-selections', observed: true, reflect: true } },
    loading:           { type: 'boolean', default: false, attribute: { name: 'loading', observed: true, reflect: true } },
    status:            { type: 'string',  default: 'default', attribute: null },
    messages:          { type: 'json',    default: null, attribute: null },
    meta:              { type: 'json',    default: null, attribute: null },
    touched:           { type: 'boolean', default: false, attribute: null, internal: true },
    dirty:             { type: 'boolean', default: false, attribute: null, internal: true },
    filteredOptions:   { type: 'json',    default: [], attribute: null, internal: true }
  };

  constructor() {
    super();
    this._onTriggerClick = this._onTriggerClick.bind(this);
    this._onSearchInput = this._onSearchInput.bind(this);
    this._onOptionClick = this._onOptionClick.bind(this);
    this._onChipRemove = this._onChipRemove.bind(this);
    this._onToggleAll = this._onToggleAll.bind(this);
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
    if (['options', 'values', 'searchQuery', 'filterFn'].includes(key)) {
      this._deriveState();
    }
    if (key === 'dropdownOpen') {
      if (this.state.dropdownOpen) this._addDocumentListener();
      else this._removeDocumentListener();
    }
  }

  render() {
    this._detachEvents();
    this.innerHTML = renderSelectMultiTemplate(this.state);
    this._cacheElements();
    this._attachEvents();
  }

  _cacheElements() {
    this._triggerEl = this.querySelector('.ui-select-multi__trigger');
    this._dropdownEl = this.querySelector('.ui-select-multi__dropdown');
    this._searchEl = this.querySelector('.ui-select-multi__search');
    this._optionsEl = this.querySelector('.ui-select-multi__options');
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
    this.addEventListener('click', this._onChipRemove);
    const toggleAll = this.querySelector('.ui-select-multi__select-all');
    if (toggleAll) toggleAll.addEventListener('click', this._onToggleAll);
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
    const toggleAll = this.querySelector('.ui-select-multi__select-all');
    if (toggleAll) toggleAll.removeEventListener('click', this._onToggleAll);
    this.removeEventListener('click', this._onChipRemove);
    this.removeEventListener('keydown', this._onKeyDown);
  }

  _deriveState() {
    const options = Array.isArray(this.state.options) ? this.state.options : [];
    const filterFn = this.state.filterFn ? (typeof this.state.filterFn === 'function' ? this.state.filterFn : resolvePath(this.state.filterFn)) : null;
    const filteredOptions = filterOptions(options, this.state.searchQuery, filterFn);
    const showSearch = this.state.showSearch || filteredOptions.length > 8;
    const highlightedIdx = Math.min(
      Math.max(this.state.highlightedIdx, 0),
      filteredOptions.length - 1
    );
    this.setState({
      filteredOptions,
      showSearch,
      highlightedIdx
    });
  }

  _onTriggerClick(event) {
    event.preventDefault();
    this._toggleDropdown();
  }

  _toggleDropdown(forceState) {
    if (this.state.disabled) return;
    const next = typeof forceState === 'boolean' ? forceState : !this.state.dropdownOpen;
    this.setState({ dropdownOpen: next });
    if (next) {
      this._emit(EVENT_PREFIX + ':open', { values: this.state.values });
      requestAnimationFrame(() => {
        if (this._searchEl) this._searchEl.focus();
      });
    } else {
      this._emit(EVENT_PREFIX + ':close', { values: this.state.values });
    }
  }

  _onSearchInput(event) {
    const query = event.target.value;
    this.setState({ searchQuery: query, highlightedIdx: 0 });
    this._emit(EVENT_PREFIX + ':search', { query });
  }

  _onOptionClick(event) {
    const optionEl = event.target.closest('.ui-select-multi__option');
    if (!optionEl || optionEl.classList.contains('is-disabled')) return;
    const value = optionEl.dataset.value;
    this._toggleValue(value);
  }

  _onChipRemove(event) {
    const removeBtn = event.target.closest('.ui-select-multi__chip-remove');
    if (!removeBtn || this.state.disabled) return;
    event.preventDefault();
    const chip = removeBtn.closest('.ui-select-multi__chip');
    const labels = Array.isArray(this.state.options) ? this.state.options : [];
    const label = chip?.querySelector('.ui-select-multi__chip-label')?.textContent;
    if (!label) return;
    const option = labels.find(opt => opt.label === label);
    if (option) {
      this._toggleValue(option.value, true);
    }
  }

  _onToggleAll(event) {
    event.preventDefault();
    if (this.state.disabled) return;
    const filtered = Array.isArray(this.state.filteredOptions) ? this.state.filteredOptions : [];
    const selectable = filtered.filter(opt => !opt.disabled);
    const current = new Set(Array.isArray(this.state.values) ? this.state.values : []);
    const allSelected = selectable.length > 0 && selectable.every(opt => current.has(opt.value));

    let nextValues;
    if (allSelected) {
      selectable.forEach(opt => current.delete(opt.value));
      nextValues = Array.from(current);
    } else {
      selectable.forEach(opt => current.add(opt.value));
      nextValues = Array.from(current);
      if (this.state.maxSelections && nextValues.length > this.state.maxSelections) {
        nextValues = nextValues.slice(0, this.state.maxSelections);
      }
    }

    this._commitValues(nextValues, { origin: allSelected ? 'deselect-all' : 'select-all' });
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
      this._toggleValue(option.value);
    }
  }

  _toggleValue(value, forceDeselect = false) {
    const current = new Set(Array.isArray(this.state.values) ? this.state.values : []);
    const hasValue = current.has(value);

    if (hasValue || forceDeselect) {
      current.delete(value);
      this._commitValues(Array.from(current), { change: 'remove', value });
      this._emit(EVENT_PREFIX + ':deselect', { value });
      return;
    }

    const nextValues = Array.from(current);
    if (this.state.maxSelections && nextValues.length >= this.state.maxSelections) {
      this._emit(EVENT_PREFIX + ':validation', {
        status: 'error',
        messages: { error: [`Максимум ${this.state.maxSelections} значений`] }
      });
      return;
    }
    nextValues.push(value);
    this._commitValues(nextValues, { change: 'add', value });
    this._emit(EVENT_PREFIX + ':select', { value });
  }

  _commitValues(nextValues, meta = {}) {
    this.setState({ values: nextValues, dirty: true, touched: true });
    this._emit(EVENT_PREFIX + ':change', { values: nextValues, ...meta });
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
        values: Array.isArray(this.state.values) ? [...this.state.values] : [],
        ...detail
      }
    }));
  }
}

customElements.define('ui-select-multi', UISelectMulti);

