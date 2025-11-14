import { BaseElement } from '../../../../base-element.js';
import { renderFiltersSummaryTemplate } from './filters-summary-template.js';

if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./filters-summary-styles.css', import.meta.url));
}

export class UIFiltersSummary extends BaseElement {
  static stateSchema = {
    filters:    { type: 'json',    default: [], attribute: null },
    emptyLabel: { type: 'string',  default: '', attribute: { name: 'empty-label', observed: true, reflect: true } },
    meta:       { type: 'json',    default: null, attribute: null }
  };

  constructor() {
    super();
    this._onChipRemove = this._onChipRemove.bind(this);
    this._onChipClick = this._onChipClick.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    this.render();
    this._bindEvents();
  }

  _bindEvents() {
    this.addEventListener('ui-filter-chip:remove', this._onChipRemove);
    this.addEventListener('ui-filter-chip:click', this._onChipClick);
  }

  _onChipRemove(e) {
    const detail = e.detail || {};
    this._emitEvent('remove', detail);
  }

  _onChipClick(e) {
    const detail = e.detail || {};
    this._emitEvent('click', detail);
  }

  setFilters(filters) {
    const normalized = Array.isArray(filters) ? filters : [];
    this.setState({ filters: normalized });
    this.render();
    this._bindEvents();
  }

  _emitEvent(type, detail) {
    this.dispatchEvent(new CustomEvent(`ui-filters-summary:${type}`, {
      bubbles: true,
      composed: true,
      detail: {
        ...detail,
        component: 'ui-filters-summary'
      }
    }));
  }

  render() {
    this.innerHTML = renderFiltersSummaryTemplate(this.state);
  }

  // Публичный API

  /**
   * Получить все фильтры из чипов
   * @returns {Array<{filterId: string, value: string, label: string}>}
   */
  getFilters() {
    const chips = Array.from(this.querySelectorAll('ui-filter-chip'));
    return chips.map(chip => chip.value());
  }

  /**
   * Очистить все чипы (удалить их из DOM)
   * @returns {this}
   */
  clear() {
    const chips = Array.from(this.querySelectorAll('ui-filter-chip'));
    chips.forEach(chip => {
      // Эмитируем событие удаления для каждого чипа
      chip.remove();
      // Удаляем чип из DOM
      chip.remove();
    });
    
    // Очищаем состояние
    this.setState({ filters: [] });
    this.render();
    
    return this;
  }

  /**
   * Проверить, есть ли активные фильтры
   * @returns {boolean}
   */
  hasFilters() {
    return this.querySelectorAll('ui-filter-chip').length > 0;
  }

  /**
   * Обновить все фильтры (заменить существующие чипы новыми)
   * @param {Array<{filterId: string, value: string, label: string}>} filters - новые фильтры
   * @returns {this}
   */
  update(filters) {
    // Очищаем существующие чипы
    this.clear();
    
    // Добавляем новые чипы
    if (Array.isArray(filters)) {
      filters.forEach(filter => {
        const chip = document.createElement('ui-filter-chip');
        chip.setValue(filter);
        this.appendChild(chip);
      });
      
      // Обновляем состояние
      this.setState({ filters });
    }
    
    return this;
  }
}

customElements.define('ui-filters-summary', UIFiltersSummary);

