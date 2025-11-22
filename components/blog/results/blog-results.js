import { adaptPostList } from './post-card-adapter.js';

export default class BlogResults {
  constructor(options = {}) {
    this.container = options.container || null;
    this.emptyElement = options.emptyElement || null;
    this.errorElement = options.errorElement || null;
    this.endMessageElement = options.endMessageElement || null;
    this.meta = {};
    this._skeletonActive = false;
  }

  renderInitial(posts = []) {
    if (!this.container) {
      console.warn('[blog-results] Container not initialized');
      return;
    }

    this.hideError();
    this.hideEmpty();
    this.hideEndMessage();

    const nodes = adaptPostList(posts);
    
    console.log('[blog-results] Posts:', posts.length, posts);
    console.log('[blog-results] Adapted nodes:', nodes.length, nodes);

    this.container.innerHTML = '';

    if (!nodes.length) {
      console.warn('[blog-results] No nodes to render, showing empty');
      this.showEmpty();
      return;
    }

    const wrapper = this.ensureWrapper();
    if (!wrapper) {
      console.error('[blog-results] Failed to create wrapper');
      return;
    }
    
    nodes.forEach((node) => wrapper.appendChild(node));
    console.log('[blog-results] Rendered', nodes.length, 'posts');
  }

  appendPosts(posts = []) {
    if (!this.container || !posts.length) {
      return;
    }

    const wrapper = this.ensureWrapper();

    const nodes = adaptPostList(posts);
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
    this.hideEndMessage();

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
    if (this.endMessageElement) {
      this.endMessageElement.hidden = false;
    }
  }

  hideEndMessage() {
    if (this.endMessageElement) {
      this.endMessageElement.hidden = true;
    }
  }

  updateMeta(meta) {
    this.meta = meta || {};
  }

  ensureWrapper() {
    if (!this.container) {
      return null;
    }

    // Ищем существующий wrapper или создаём новый
    let wrapper = this.container.querySelector('.blog-results__grid');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.className = 'blog-results__grid';
      this.container.appendChild(wrapper);
    }

    return wrapper;
  }

  destroy() {
    this.container = null;
    this.emptyElement = null;
    this.errorElement = null;
    this.endMessageElement = null;
    this.meta = {};
    this._skeletonActive = false;
  }
}

