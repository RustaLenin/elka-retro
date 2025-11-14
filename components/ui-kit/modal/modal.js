import { BaseElement } from '../../base-element.js';

// Загружаем стили при импорте модуля (top-level)
// Это гарантирует, что базовые стили всегда доступны для всех наследников
if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./modal-styles.css', import.meta.url));
}

let modalOverlayArea = null;
let modalOverlayIdCounter = 0;

function ensureArea() {
  if (!document.querySelector('.UIModalArea')) {
    const area = document.createElement('div');
    area.className = 'UIModalArea';
    document.body.appendChild(area);
  }
}

function ensureOverlayArea() {
  if (!modalOverlayArea || !modalOverlayArea.isConnected) {
    modalOverlayArea = document.querySelector('.UIModalOverlayArea');
    if (!modalOverlayArea) {
      modalOverlayArea = document.createElement('div');
      modalOverlayArea.className = 'UIModalOverlayArea';
      document.body.appendChild(modalOverlayArea);
    }
  }
  return modalOverlayArea;
}

export class UIModal extends BaseElement {
  static stateSchema = {
    title: { type: 'string', default: '', attribute: { name: 'title', observed: true, reflect: true } },
    size: { type: 'string', default: 'medium', attribute: { name: 'size', observed: true, reflect: true } },
    closable: { type: 'boolean', default: true, attribute: { name: 'closable', observed: true, reflect: true } },
    apiUrl: { type: 'string', default: '', attribute: { name: 'api-url', observed: true, reflect: true } },
    loading: { type: 'boolean', default: false, attribute: null, internal: true },
    visible: { type: 'boolean', default: false, attribute: null, internal: true },
  };

  constructor() {
    super();
    this._onOverlayClick = this._onOverlayClick.bind(this);
    this._onEscape = this._onEscape.bind(this);
    this._overlayId = `ui-modal-overlay-${++modalOverlayIdCounter}`;
    this._overlayElement = null;
    this._containerElement = null;
  }

  _removeOverlayFromBody() {
    if (this._overlayElement && this._overlayElement.parentNode) {
      this._overlayElement.remove();
    }
    if (this._containerElement && this._containerElement.parentNode) {
      this._containerElement.remove();
    }
    this._overlayElement = null;
    this._containerElement = null;
  }

  _mountOverlayToBody() {
    if (!this.state.visible) {
      this._removeOverlayFromBody();
      return;
    }

    const overlayInComponent = this.querySelector('.modal_overlay');
    const containerInComponent = this.querySelector('.modal_container');
    if (!overlayInComponent || !containerInComponent) {
      return;
    }

    overlayInComponent.dataset.modalOverlayId = this._overlayId;
    containerInComponent.dataset.modalOverlayId = this._overlayId;

    const host = ensureOverlayArea();

    this._removeOverlayFromBody();

    host.appendChild(overlayInComponent);
    host.appendChild(containerInComponent);

    this._overlayElement = overlayInComponent;
    this._containerElement = containerInComponent;
  }

  _getOverlayElement() {
    if (this._overlayElement && this._overlayElement.isConnected) {
      return this._overlayElement;
    }

    const host = modalOverlayArea && modalOverlayArea.isConnected
      ? modalOverlayArea
      : document.querySelector('.UIModalOverlayArea');

    if (host) {
      const overlay = host.querySelector(`.modal_overlay[data-modal-overlay-id="${this._overlayId}"]`);
      if (overlay) {
        this._overlayElement = overlay;
        return overlay;
      }
    }

    const inlineOverlay = this.querySelector('.modal_overlay');
    if (inlineOverlay) {
      this._overlayElement = inlineOverlay;
      return inlineOverlay;
    }

    return null;
  }

  _getContainerElement() {
    if (this._containerElement && this._containerElement.isConnected) {
      return this._containerElement;
    }

    const host = modalOverlayArea && modalOverlayArea.isConnected
      ? modalOverlayArea
      : document.querySelector('.UIModalOverlayArea');

    if (host) {
      const container = host.querySelector(`.modal_container[data-modal-overlay-id="${this._overlayId}"]`);
      if (container) {
        this._containerElement = container;
        return container;
      }
    }

    const inlineContainer = this.querySelector('.modal_container');
    if (inlineContainer) {
      this._containerElement = inlineContainer;
      return inlineContainer;
    }

    return null;
  }

  _queryContainer(selector) {
    const container = this._getContainerElement();
    return container ? container.querySelector(selector) : null;
  }

  _queryAllContainer(selector) {
    const container = this._getContainerElement();
    return container ? container.querySelectorAll(selector) : [];
  }

  _syncOverlayState() {
    const overlay = this._getOverlayElement() || this.querySelector('.modal_overlay');
    const container = this._getContainerElement() || this.querySelector('.modal_container');
    const isVisible = !!this.state.visible;
    if (overlay) {
      overlay.classList.toggle('modal_overlay--visible', isVisible);
    }
    if (container) {
      container.classList.toggle('modal_container--visible', isVisible);
    }
  }

  connectedCallback() {
    // Стили уже загружены при импорте модуля
    // window.app.toolkit.loadCSSOnce(new URL('./modal-styles.css', import.meta.url));
    ensureArea();
    super.connectedCallback();
    this.render();
    if (this.state.apiUrl) {
      this.loadData();
    }
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this._onEscape);
    this._removeOverlayFromBody();
  }

  async loadData() {
    const { apiUrl } = this.state;
    if (!apiUrl) return;
    
    this.setState({ loading: true });
    try {
      const res = await fetch(apiUrl, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      
      // Небольшая задержка для плавного фейда
      await new Promise(resolve => setTimeout(resolve, 200));
      
      let htmlContent = '';
      // Если вернулся HTML строкой
      if (typeof json === 'string') {
        htmlContent = json;
      } else if (json.content || json.html) {
        htmlContent = json.content || json.html;
      } else if (json.content && json.content.rendered) {
        // Стандартный формат WP REST
        htmlContent = json.content.rendered;
      } else {
        htmlContent = '<p>Данные загружены, но формат не распознан.</p>';
      }
      
      // Убираем loader и вставляем контент
      this.setState({ loading: false });
      this.setBodyContent(htmlContent);
    } catch (e) {
      this.setState({ loading: false });
      this.setBodyContent(`<p style="color: var(--color-error, #ef4444);">Ошибка загрузки: ${e.message}</p>`);
    }
  }

  show() {
    this.setState({ visible: true });
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', this._onEscape);
    
    requestAnimationFrame(() => {
      this._syncOverlayState();
      const overlay = this._getOverlayElement();
      if (overlay) overlay.addEventListener('click', this._onOverlayClick);
      
      const firstFocusable = this._queryContainer('button, a, input, textarea, select, [tabindex]:not([tabindex="-1"])');
      if (firstFocusable) firstFocusable.focus();
    });
  }

  hide() {
    this.setState({ visible: false });
    document.body.style.overflow = '';
    document.removeEventListener('keydown', this._onEscape);
    const overlay = this._getOverlayElement();
    if (overlay) overlay.removeEventListener('click', this._onOverlayClick);
    
    requestAnimationFrame(() => this._syncOverlayState());
  }

  destroy() {
    this.hide();
    setTimeout(() => this.remove(), 300);
  }

  _onOverlayClick(e) {
    if (e.target === e.currentTarget && this.state.closable) {
      this.hide();
    }
  }

  _onEscape(e) {
    if (e.key === 'Escape' && this.state.visible && this.state.closable) {
      this.hide();
    }
  }

  _onCloseClick() {
    if (this.state.closable) this.hide();
  }

  render() {
    const { title, size, closable, loading, visible } = this.state;
    // Сохраняем дополнительные классы перед установкой базовых
    const preservedClasses = Array.from(this.classList).filter(cls => 
      cls !== 'modal' && 
      !cls.startsWith('modal--') &&
      cls !== 'modal--visible'
    );
    // Устанавливаем базовые классы
    this.className = `modal modal--${size} ${visible ? 'modal--visible' : ''}`;
    // Восстанавливаем сохраненные дополнительные классы
    preservedClasses.forEach(cls => {
      if (cls) {
        this.classList.add(cls);
      }
    });
    
    const existingBody = this._queryContainer('.modal_body') || this.querySelector('.modal_body');
    let existingContent = existingBody ? existingBody.innerHTML : '';

    // Проверяем, есть ли actions формы для перемещения в footer
    let footerContent = '';
    if (existingBody) {
      const formActions = existingBody.querySelector('[data-form-actions]');
      if (formActions) {
        // Сохраняем содержимое actions
        footerContent = formActions.outerHTML;
        // Удаляем actions из body
        formActions.remove();
        // Обновляем existingContent без actions
        existingContent = existingBody.innerHTML;
      }
    }

    this._removeOverlayFromBody();

    const header = title ? `
      <div class="modal_header">
        <h2 class="modal_title">${title}</h2>
        ${closable ? `<button class="modal_close" aria-label="Close">×</button>` : ''}
      </div>
    ` : '';
    
    this.innerHTML = `
      <div class="modal_overlay"></div>
      <div class="modal_container">
        ${header}
        <div class="modal_body">
          ${loading ? `<block-loader label="Загрузка..." spinduration="1200"></block-loader>` : existingContent}
        </div>
        ${footerContent ? `<div class="modal_footer">${footerContent}</div>` : ''}
      </div>
    `;
    
    this._mountOverlayToBody();
    this._syncOverlayState();

    // Attach close handler
    const closeBtn = this._queryContainer('.modal_close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this._onCloseClick());
    }
  }
  
  setBodyContent(html) {
    const body = this._queryContainer('.modal_body');
    if (body) {
      body.innerHTML = html;
    }
  }
  
  appendBodyContent(element) {
    const body = this._queryContainer('.modal_body');
    if (body && element) {
      body.appendChild(element);
    }
  }

  // Публичный API

  /**
   * Проверить, видимо ли модальное окно
   * @returns {boolean}
   */
  isVisible() {
    return Boolean(this.state.visible);
  }

  /**
   * Проверить, идет ли загрузка данных
   * @returns {boolean}
   */
  isLoading() {
    return Boolean(this.state.loading);
  }

  /**
   * Получить заголовок
   * @returns {string}
   */
  title() {
    return this.state.title || '';
  }

  /**
   * Установить заголовок
   * @param {string} title - новый заголовок
   * @returns {this}
   */
  setTitle(title) {
    this.setState({ title: String(title || '') });
    return this;
  }

  /**
   * Получить размер
   * @returns {string}
   */
  size() {
    return this.state.size || 'medium';
  }

  /**
   * Установить размер
   * @param {string} size - новый размер (small, medium, large)
   * @returns {this}
   */
  setSize(size) {
    this.setState({ size: String(size || 'medium') });
    return this;
  }

  /**
   * Установить можно ли закрывать
   * @param {boolean} closable - можно ли закрывать
   * @returns {this}
   */
  setClosable(closable) {
    this.setState({ closable: Boolean(closable) });
    return this;
  }

  /**
   * Установить URL для загрузки данных
   * @param {string} apiUrl - URL для загрузки
   * @returns {Promise}
   */
  setApiUrl(apiUrl) {
    this.setState({ apiUrl: String(apiUrl || '') });
    if (apiUrl && this.isConnected) {
      return this.loadData();
    }
    return Promise.resolve();
  }

  /**
   * Сбросить к дефолтным значениям
   * @returns {this}
   */
  reset() {
    this.setState({
      title: '',
      size: 'medium',
      closable: true,
      apiUrl: '',
      loading: false,
      visible: false
    });
    this.setBodyContent('');
    this.hide();
    return this;
  }
}

customElements.define('ui-modal', UIModal);

// Helper function to create and show modal
export function showModal(options = {}) {
  ensureArea();
  // Стили уже загружены при импорте модуля
  // window.app.toolkit.loadCSSOnce(new URL('./modal-styles.css', import.meta.url));
  
  const {
    title = '',
    size = 'medium',
    closable = true,
    apiUrl = '',
    content = '',
  } = options;
  
  const modal = document.createElement('ui-modal');
  modal.setAttribute('title', title);
  modal.setAttribute('size', size);
  if (!closable) modal.removeAttribute('closable');
  if (apiUrl) modal.setAttribute('api-url', apiUrl);
  
  if (content) {
    modal.innerHTML = content;
  }
  
  const area = document.querySelector('.UIModalArea');
  area.appendChild(modal);
  
  // Show after render
  requestAnimationFrame(() => {
    modal.show();
  });
  
  return modal;
}

