/**
 * Accessory Catalog Results Component
 * 
 * Отвечает за отображение результатов каталога аксессуаров
 */

import { adaptAccessoryList } from './result-card-adapter.js';

export default class AccessoryCatalogResults {
  constructor(options = {}) {
    this.container = options.container || null;
    this.emptyElement = options.emptyElement || null;
    this.errorElement = options.errorElement || null;
    this.endMessageElement = options.endMessageElement || null;
    this.meta = {};
    this._skeletonActive = false;
  }

  renderInitial(items = []) {
    if (!this.container) {
      console.warn('[accessory-catalog-results] Container not initialized');
      return;
    }

    this.hideError();
    this.hideEmpty();
    this.hideEndMessage();

    const nodes = adaptAccessoryList(items);
    
    console.log('[accessory-catalog-results] Items:', items.length, items);
    console.log('[accessory-catalog-results] Adapted nodes:', nodes.length, nodes);

    this.container.innerHTML = '';

    if (!nodes.length) {
      console.warn('[accessory-catalog-results] No nodes to render, showing empty');
      this.showEmpty();
      return;
    }

    const wrapper = this.ensureWrapper();
    if (!wrapper) {
      console.error('[accessory-catalog-results] Failed to create wrapper');
      return;
    }
    
    nodes.forEach((node) => wrapper.appendChild(node));
    console.log('[accessory-catalog-results] Rendered', nodes.length, 'items');
  }

  appendItems(items = []) {
    if (!this.container || !items.length) {
      return;
    }

    const wrapper = this.ensureWrapper();

    const nodes = adaptAccessoryList(items);
    nodes.forEach((node) => wrapper.appendChild(node));
  }

  showSkeleton(markup) {
    if (!this.container || this._skeletonActive) {
      return;
    }

    if (typeof markup === 'string' && markup.trim().length > 0) {
      this.container.innerHTML = markup;
      this._skeletonActive = true;
    }
  }

  hideSkeleton() {
    if (!this.container || !this._skeletonActive) {
      return;
    }

    this.container.innerHTML = '';
    this._skeletonActive = false;
  }

  showError(message) {
    if (this.container) {
      this.container.innerHTML = '';
    }

    this.hideEmpty();

    if (this.errorElement) {
      this.errorElement.hidden = false;
      const messageNode = this.errorElement.querySelector('p');
      if (messageNode) {
        messageNode.textContent = message;
      }
    }
  }

  hideError() {
    if (this.errorElement) {
      this.errorElement.hidden = true;
      const messageNode = this.errorElement.querySelector('p');
      if (messageNode) {
        messageNode.textContent = '';
      }
    }
  }

  showEmpty() {
    if (this.container) {
      this.container.innerHTML = '';
    }

    this.hideError();

    if (this.emptyElement) {
      this.emptyElement.hidden = false;
    }
  }

  hideEmpty() {
    if (this.emptyElement) {
      this.emptyElement.hidden = true;
    }
  }

  showEndMessage() {
    if (!this.container) {
      return;
    }

    this.hideEmpty();
    this.hideError();

    if (this.endMessageElement) {
      this.endMessageElement.hidden = false;
    }
  }

  hideEndMessage() {
    if (this.endMessageElement) {
      this.endMessageElement.hidden = true;
    }
  }

  updateMeta(meta = {}) {
    this.meta = { ...meta };
  }

  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.hideEmpty();
    this.hideError();
  }

  ensureWrapper() {
    if (!this.container) {
      return null;
    }

    // Для accessory-catalog-results контейнер - это .accessory-catalog-results__grid
    // Ищем grid-inner внутри него
    const gridContainer = this.container;
    let wrapper = gridContainer.querySelector('.accessory-catalog-results__grid-inner');

    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.className = 'accessory-catalog-results__grid-inner';
      gridContainer.appendChild(wrapper);
    }

    // Переносим любые карточки аксессуаров в wrapper
    const strayCards = Array.from(gridContainer.querySelectorAll('ny-accessory-card')).filter(
      (card) => !wrapper.contains(card)
    );

    strayCards.forEach((card) => wrapper.appendChild(card));

    return wrapper;
  }
}

