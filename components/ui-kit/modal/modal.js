import { BaseElement } from '../../base-element.js';

// Загружаем стили при импорте модуля (top-level)
// Это гарантирует, что базовые стили всегда доступны для всех наследников
if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./modal-styles.css', import.meta.url));
}

let openModalsCount = 0;

function ensureArea() {
  let area = document.querySelector('.UIModalArea');
  if (!area) {
    area = document.createElement('div');
    area.className = 'UIModalArea';
    area.style.pointerEvents = 'none';
    document.body.appendChild(area);
  }
  return area;
}

function updateAreaPointerEvents() {
  const area = document.querySelector('.UIModalArea');
  if (area) {
    area.style.pointerEvents = openModalsCount > 0 ? 'auto' : 'none';
  }
}

export class UIModal extends BaseElement {
  static stateSchema = {
    title: { type: 'string', default: '', attribute: { name: 'title', observed: true, reflect: true } },
    size: { type: 'string', default: 'medium', attribute: { name: 'size', observed: true, reflect: true } },
    closable: { type: 'boolean', default: true, attribute: { name: 'closable', observed: true, reflect: true } },
    apiUrl: { type: 'string', default: '', attribute: { name: 'api-url', observed: true, reflect: true } },
    footer: { type: 'string', default: 'auto', attribute: { name: 'footer', observed: true, reflect: true } },
    bodyPadding: { type: 'string', default: 'default', attribute: { name: 'body-padding', observed: true, reflect: true } },
    loading: { type: 'boolean', default: false, attribute: null, internal: true },
    visible: { type: 'boolean', default: false, attribute: null, internal: true },
  };

  constructor() {
    super();
    this._onOverlayClick = this._onOverlayClick.bind(this);
    this._onEscape = this._onEscape.bind(this);
    this._bodyContent = null;
    this._footerContent = '';
    this._defaultBodyContent = null;
  }

  connectedCallback() {
    const area = ensureArea();
    super.connectedCallback();
    if (this.parentElement !== area) {
      area.appendChild(this);
    }
    this.render();
    if (this.state.apiUrl) {
      this.loadData();
    }
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this._onEscape);
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
    if (!this.isVisible()) {
      openModalsCount += 1;
      updateAreaPointerEvents();
    }
    this.setState({ visible: true });
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', this._onEscape);
    
    requestAnimationFrame(() => {
      const overlay = this._getOverlayElement();
      if (overlay) {
        overlay.removeEventListener('click', this._onOverlayClick);
        overlay.addEventListener('click', this._onOverlayClick);
      }
      const firstFocusable = this._queryContainer('button, a, input, textarea, select, [tabindex]:not([tabindex="-1"])');
      if (firstFocusable) firstFocusable.focus();
    });
  }

  hide() {
    if (this.isVisible() && openModalsCount > 0) {
      openModalsCount -= 1;
      updateAreaPointerEvents();
    }
    this.setState({ visible: false });
    if (openModalsCount === 0) {
      document.body.style.overflow = '';
    }
    document.removeEventListener('keydown', this._onEscape);
    const overlay = this._getOverlayElement();
    if (overlay) overlay.removeEventListener('click', this._onOverlayClick);
  }

  destroy() {
    this.hide();
    setTimeout(() => this.remove(), 300);
  }

  _requestClose(detail = {}) {
    const event = new CustomEvent('ui-modal:request-close', {
      bubbles: false,
      cancelable: true,
      detail,
    });
    this.dispatchEvent(event);
    return !event.defaultPrevented;
  }

  _onOverlayClick(e) {
    if (e.target === e.currentTarget && this.state.closable) {
      if (!this._requestClose({ reason: 'overlay' })) return;
      this.hide();
    }
  }

  _onEscape(e) {
    if (e.key === 'Escape' && this.state.visible && this.state.closable) {
      if (!this._requestClose({ reason: 'escape' })) return;
      this.hide();
    }
  }

  _onCloseClick() {
    if (!this.state.closable) return;
    if (!this._requestClose({ reason: 'close-button' })) return;
    this.hide();
  }

  render() {
    const { title, size, closable, loading, visible, bodyPadding, footer } = this.state;
    const preservedClasses = Array.from(this.classList).filter(cls => 
      cls !== 'modal' && 
      !cls.startsWith('modal--') &&
      cls !== 'modal--visible'
    );
    this.className = `modal modal--${size} ${visible ? 'modal--visible' : ''}`;
    preservedClasses.forEach(cls => {
      if (cls) this.classList.add(cls);
    });

    if (this._defaultBodyContent === null) {
      this._defaultBodyContent = this.innerHTML;
    }

    const existingBody = this.querySelector('.modal_body');
    const existingFooter = this.querySelector('.modal_footer');
    const currentBody = typeof this._bodyContent === 'string'
      ? this._bodyContent
      : (existingBody ? existingBody.innerHTML : this._defaultBodyContent || '');
    if (!this._bodyContent && existingBody) {
      this._bodyContent = existingBody.innerHTML;
    }
    if (!this._footerContent && existingFooter) {
      this._footerContent = existingFooter.innerHTML;
    }

    const header = title ? `
      <div class="modal_header">
        <h2 class="modal_title">${title}</h2>
        ${closable ? `<button class="modal_close" aria-label="Close">×</button>` : ''}
      </div>
    ` : '';

    const footerMode = (footer || 'auto').toString().toLowerCase();
    const shouldRenderFooter = footerMode === 'none' || footerMode === 'false'
      ? false
      : (footerMode === 'auto' ? Boolean(this._footerContent) : true);

    const bodyClass = ['modal_body', `modal_body--${bodyPadding || 'default'}`].join(' ');
    
    this.innerHTML = `
      <div class="modal_overlay ${visible ? 'modal_overlay--visible' : ''}"></div>
      <div class="modal_container ${visible ? 'modal_container--visible' : ''}" data-modal-id="${this.dataset.modalId || ''}">
        ${header}
        <div class="${bodyClass}">
          ${loading ? `<block-loader label="Загрузка..." spinduration="1200"></block-loader>` : currentBody}
        </div>
        ${shouldRenderFooter ? `<div class="modal_footer">${this._footerContent || ''}</div>` : ''}
      </div>
    `;
    
    this.dispatchEvent(new CustomEvent('ui-modal:rendered', { bubbles: false }));
    this._bindInteractiveElements();
  }
  
  setBodyContent(html) {
    this._bodyContent = html;
    const body = this._queryContainer('.modal_body');
    if (body) {
      body.innerHTML = html;
    }
  }
  
  appendBodyContent(element) {
    const body = this._queryContainer('.modal_body');
    if (body && element) {
      body.appendChild(element);
      this._bodyContent = body.innerHTML;
    }
  }

  setFooterContent(html) {
    this._footerContent = html;
    const footer = this._queryContainer('.modal_footer');
    if (footer) {
      footer.innerHTML = html;
    } else {
      this.render();
    }
  }

  _bindInteractiveElements() {
    const overlay = this._getOverlayElement();
    if (overlay) {
      overlay.removeEventListener('click', this._onOverlayClick);
      overlay.addEventListener('click', this._onOverlayClick);
    }
    const closeBtn = this._queryContainer('.modal_close');
    if (closeBtn) {
      closeBtn.removeEventListener('click', this._onCloseHandler);
      closeBtn.addEventListener('click', () => this._onCloseClick());
    }
  }

  _getOverlayElement() {
    return this.querySelector('.modal_overlay');
  }

  _getContainerElement() {
    return this.querySelector('.modal_container');
  }

  _queryContainer(selector) {
    const container = this._getContainerElement();
    return container ? container.querySelector(selector) : null;
  }

  _queryAllContainer(selector) {
    const container = this._getContainerElement();
    return container ? container.querySelectorAll(selector) : [];
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

