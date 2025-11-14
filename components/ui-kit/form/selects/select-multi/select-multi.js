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
    this._onComponentClick = this._onComponentClick.bind(this);
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
    if (this.state._valuesDescriptor) {
      delete this.state.values;
      delete this.state._valuesDescriptor;
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
    if (this.state._valuesDescriptor) {
      // Обновляем derived state при изменении значения извне
      this._syncFromFieldValue();
      this._deriveState();
      this.render();
      return;
    }
    
    // Создаем массив-обертку для синхронизации с полем
    // field.state.value должен быть массивом
    if (!Array.isArray(field.state.value)) {
      field.state.value = [];
    }
    
    // Создаем ссылку на массив в стейте поля
    this.state.values = field.state.value;
    this.state._valuesDescriptor = true;
    
    // Обновляем derived state с начальным значением
    this._deriveState();
    this.render();
  }
  
  _syncFromFieldValue() {
    // values уже ссылается на field.state.value, просто обновляем derived state
    // Массив обновляется автоматически, так как это ссылка
  }

  onStateChanged(key) {
    if (['options', 'values', 'searchQuery', 'filterFn'].includes(key)) {
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
    // Основной обработчик клика на сам ui-select-multi - клик по любой области открывает dropdown
    // (кроме кнопки удаления и чипса "+N", которые обрабатываются отдельно)
    this.addEventListener('click', this._onComponentClick);
    
    if (this._triggerEl) {
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
    
    // Обработчик клика на родительский ui-form-field__control для кликабельности padding
    const fieldControl = this.closest('.ui-form-field__control');
    if (fieldControl && !fieldControl._selectMultiClickHandler) {
      const self = this;
      fieldControl._selectMultiClickHandler = (event) => {
        // Если клик был по самому fieldControl (padding/gap область), открываем dropdown
        if (event.target === fieldControl && !self.state.disabled && !self.state.dropdownOpen) {
          event.preventDefault();
          event.stopPropagation();
          self._toggleDropdown(true);
        }
      };
      fieldControl.addEventListener('click', fieldControl._selectMultiClickHandler);
    }
  }

  _detachEvents() {
    this.removeEventListener('click', this._onComponentClick);
    
    if (this._triggerEl) {
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
    
    // Удаляем обработчик клика с родительского ui-form-field__control
    const fieldControl = this.closest('.ui-form-field__control');
    if (fieldControl && fieldControl._selectMultiClickHandler) {
      fieldControl.removeEventListener('click', fieldControl._selectMultiClickHandler);
      delete fieldControl._selectMultiClickHandler;
    }
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

  _onComponentClick(event) {
    // Игнорируем клики по кнопке удаления чипса (обрабатываются в _onChipRemove)
    if (event.target.closest('.ui-select-multi__chip-remove')) {
      return;
    }
    
    // Игнорируем клики по чипсу "+N"
    if (event.target.closest('.ui-select-multi__chip--more')) {
      return;
    }
    
    // Игнорируем клики по dropdown (обрабатываются в _onOptionClick)
    if (event.target.closest('.ui-select-multi__dropdown')) {
      return;
    }
    
    // Все остальные клики по компоненту открывают/закрывают dropdown
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
    
    // Предотвращаем всплытие события, чтобы не открывался dropdown
    event.preventDefault();
    event.stopPropagation();
    
    // Игнорируем чипс "+N" - он не должен быть закрываемым
    const chip = removeBtn.closest('.ui-select-multi__chip');
    if (chip?.classList.contains('ui-select-multi__chip--more')) {
      return;
    }
    
    // Получаем value из data-value или из label
    const value = chip?.dataset.value;
    if (value) {
      this._toggleValue(value, true);
      return;
    }
    
    // Fallback: ищем по label (старая логика для обратной совместимости)
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
    // Обновляем массив напрямую (так как это ссылка на field.state.value)
    if (this.state._valuesDescriptor && Array.isArray(this.state.values)) {
      // Очищаем массив и добавляем новые значения
      this.state.values.length = 0;
      this.state.values.push(...nextValues);
    } else {
      // Если ссылка еще не создана, используем setState
      this.setState({ values: nextValues });
    }
    
    // Обновляем флаги
    this.setState({ dirty: true, touched: true });
    
    // Обновляем derived state и UI
    this._deriveState();
    this.render();
    
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

  // Публичный API

  /**
   * Получить текущие значения (копия массива)
   * @returns {string[]}
   */
  value() {
    const values = this.state.values || [];
    return [...values];
  }

  /**
   * Установить значения
   * @param {string[]|string|null} value - новые значения (массив или одиночное значение)
   * @returns {this}
   */
  setValue(value) {
    let newValues = [];
    
    if (Array.isArray(value)) {
      // Фильтруем только валидные значения из опций
      const options = this.state.options || [];
      const optionValues = options.map(opt => String(opt.value));
      newValues = value
        .map(v => String(v))
        .filter(v => optionValues.includes(v));
    } else if (value !== null && value !== undefined && value !== '') {
      // Одиночное значение превращаем в массив
      const options = this.state.options || [];
      const optionValues = options.map(opt => String(opt.value));
      const strValue = String(value);
      if (optionValues.includes(strValue)) {
        newValues = [strValue];
      }
    }
    
    const previousValues = [...(this.state.values || [])];
    
    // Обновляем массив напрямую (если есть связь с полем)
    if (this.state._valuesDescriptor && Array.isArray(this.state.values)) {
      // Очищаем массив и добавляем новые значения
      this.state.values.length = 0;
      this.state.values.push(...newValues);
    } else {
      this.setState({ values: newValues });
    }
    
    // Обновляем derived state и UI
    this._deriveState();
    this.render();
    
    const valuesChanged = 
      previousValues.length !== newValues.length ||
      previousValues.some(v => !newValues.includes(v)) ||
      newValues.some(v => !previousValues.includes(v));
    
    if (valuesChanged) {
      this.setState({ dirty: true });
      this._emit(EVENT_PREFIX + ':change', { 
        values: [...newValues], 
        previousValues 
      });
    }
    
    return this;
  }

  /**
   * Сбросить к дефолтным значениям
   * @returns {this}
   */
  reset() {
    this.setValue([]);
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

  /**
   * Выбрать все доступные опции
   * @returns {this}
   */
  selectAll() {
    const options = this.state.options || [];
    const allValues = options
      .filter(opt => !opt.disabled)
      .map(opt => String(opt.value));
    
    if (this.state.maxSelections && allValues.length > this.state.maxSelections) {
      this.setValue(allValues.slice(0, this.state.maxSelections));
    } else {
      this.setValue(allValues);
    }
    
    return this;
  }

  /**
   * Очистить все выбранные значения
   * @returns {this}
   */
  clear() {
    return this.setValue([]);
  }
}

customElements.define('ui-select-multi', UISelectMulti);

