import { BaseElement } from '../../base-element.js';

// Загружаем стили при импорте модуля (top-level)
// Это гарантирует, что базовые стили всегда доступны для всех наследников
if (window.app && window.app.toolkit && window.app.toolkit.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./modal-styles.css', import.meta.url));
}

function ensureArea() {
  if (!document.querySelector('.UIModalArea')) {
    const area = document.createElement('div');
    area.className = 'UIModalArea';
    document.body.appendChild(area);
  }
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
    const overlay = this.querySelector('.modal_overlay');
    if (overlay) overlay.addEventListener('click', this._onOverlayClick);
    
    // Trigger focus trap if needed
    const firstFocusable = this.querySelector('button, a, input, textarea, select, [tabindex]:not([tabindex="-1"])');
    if (firstFocusable) firstFocusable.focus();
  }

  hide() {
    this.setState({ visible: false });
    document.body.style.overflow = '';
    document.removeEventListener('keydown', this._onEscape);
    const overlay = this.querySelector('.modal_overlay');
    if (overlay) overlay.removeEventListener('click', this._onOverlayClick);
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
    this.className = `modal modal--${size} ${visible ? 'modal--visible' : ''}`;
    
    const header = title ? `
      <div class="modal_header">
        <h2 class="modal_title">${title}</h2>
        ${closable ? `<button class="modal_close" aria-label="Close">×</button>` : ''}
      </div>
    ` : '';
    
    // Сохраняем существующий контент body перед перерисовкой
    const body = this.querySelector('.modal_body');
    const existingContent = body ? body.innerHTML : '';
    
    this.innerHTML = `
      <div class="modal_overlay"></div>
      <div class="modal_container">
        ${header}
        <div class="modal_body">
          ${loading ? `<block-loader label="Загрузка..." spinduration="1200"></block-loader>` : existingContent}
        </div>
      </div>
    `;
    
    // Attach close handler
    const closeBtn = this.querySelector('.modal_close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this._onCloseClick());
    }
  }
  
  setBodyContent(html) {
    const body = this.querySelector('.modal_body');
    if (body) {
      body.innerHTML = html;
    }
  }
  
  appendBodyContent(element) {
    const body = this.querySelector('.modal_body');
    if (body && element) {
      body.appendChild(element);
    }
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

