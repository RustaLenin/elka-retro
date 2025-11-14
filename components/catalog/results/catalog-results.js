import { adaptResultList } from './result-card-adapter.js';

export default class CatalogResults {
  constructor(options = {}) {
    this.container = options.container || null;
    this.emptyElement = options.emptyElement || null;
    this.errorElement = options.errorElement || null;
    this.meta = {};
    this._skeletonActive = false;
  }

  renderInitial(items = [], mode = 'type') {
    if (!this.container) {
      return;
    }

    this.hideError();
    this.hideEmpty();

    const nodes = adaptResultList(items, mode);

    this.container.innerHTML = '';

    if (!nodes.length) {
      this.showEmpty();
      return;
    }

    const wrapper = this.ensureWrapper();
    nodes.forEach((node) => wrapper.appendChild(node));
  }

  appendItems(items = [], mode = 'type') {
    if (!this.container || !items.length) {
      return;
    }

    const wrapper = this.ensureWrapper();

    const nodes = adaptResultList(items, mode);
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

    let wrapper = this.container.querySelector('.catalog-results__grid-inner');

    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.className = 'catalog-results__grid-inner';
      this.container.appendChild(wrapper);
    }

    const strayCards = Array.from(this.container.children).filter(
      (child) =>
        child !== wrapper &&
        (child.tagName === 'TOY-TYPE-CARD' || child.tagName === 'TOY-INSTANCE-CARD')
    );

    strayCards.forEach((card) => wrapper.appendChild(card));

    return wrapper;
  }
}
