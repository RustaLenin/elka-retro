import { BaseElement } from '../../base-element.js';

function resolvePath(root, path) {
  if (!path) return null;
  const parts = String(path).split('.');
  let ctx = root;
  for (const p of parts) {
    if (ctx && p in ctx) ctx = ctx[p];
    else return null;
  }
  return ctx;
}

export class UIButton extends BaseElement {
  static stateSchema = {
    label:   { type: 'string',  default: '', attribute: { name: 'label', observed: true, reflect: true } },
    type:    { type: 'string',  default: 'primary', attribute: { name: 'type', observed: true, reflect: true } },
    disabled:{ type: 'boolean', default: false, attribute: { name: 'disabled', observed: true, reflect: true } },
    icon:    { type: 'string',  default: '', attribute: { name: 'icon', observed: true, reflect: true } },
    action:  { type: 'string',  default: '', attribute: { name: 'action', observed: true, reflect: true } },
    href:    { type: 'string',  default: '', attribute: { name: 'href', observed: true, reflect: true } },
    args:    { type: 'json',    default: null, attribute: { name: 'args', observed: true, reflect: true } },
    event:   { type: 'string',  default: '', attribute: { name: 'event', observed: true, reflect: true } },
    width:   { type: 'string',  default: 'fit-content', attribute: { name: 'width', observed: true, reflect: true } },
    loading: { type: 'boolean', default: false, attribute: null, internal: true },
    success: { type: 'boolean', default: false, attribute: null, internal: true },
  };

  constructor() {
    super();
    this._onClick = this._onClick.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
  }

  connectedCallback() {
    window.app.toolkit.loadCSSOnce(new URL('./button-styles.css', import.meta.url));
    super.connectedCallback();
    this.render();
    this.addEventListener('click', this._onClick);
    this.addEventListener('keydown', this._onKeyDown);
  }

  disconnectedCallback() {
    this.removeEventListener('click', this._onClick);
    this.removeEventListener('keydown', this._onKeyDown);
  }

  _onKeyDown(e) {
    // Handle Enter and Space for link actions
    if ((e.key === 'Enter' || e.key === ' ') && (this.state.action === 'link' || this.state.action === 'link_blank')) {
      e.preventDefault();
      this._onClick(e);
    }
  }

  async _onClick(e) {
    if (this.state.disabled || this.state.loading) return;

    const { action, href, args, event } = this.state;

    // Handle link actions
    if (action === 'link' || action === 'link_blank') {
      if (!href) {
        console.warn('[ui-button] href is required for link actions');
        return;
      }

      // Dispatch custom event first if provided
      if (event) {
        this.dispatchEvent(new CustomEvent(event, { bubbles: true, detail: { source: this, href, args } }));
      }

      // Open link
      if (action === 'link_blank') {
        window.open(href, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = href;
      }

      // Visual feedback
      this.classList.add('pressed');
      setTimeout(() => this.classList.remove('pressed'), 150);
      return;
    }

    // Dispatch custom event first if provided
    if (event) {
      this.dispatchEvent(new CustomEvent(event, { bubbles: true, detail: { source: this, args } }));
    }

    // Invoke global action if provided
    if (action) {
      const fn = resolvePath(window, action);
      if (typeof fn === 'function') {
        try {
          this.setState({ loading: true, disabled: true, success: false });
          const result = fn.apply(null, Array.isArray(args) ? args : args != null ? [args] : []);
          if (result && typeof result.then === 'function') {
            await result;
          }
          this.setState({ loading: false, success: true });
          // keep disabled after success to prevent repeat
        } catch (err) {
          this.setState({ loading: false, disabled: false, success: false });
          if (window.notify) window.notify('error', 'Ошибка выполнения действия');
          console.error('[ui-button] action error:', err);
        }
        return;
      }
    }

    // Default behavior: toggle pressed visual briefly
    this.classList.add('pressed');
    setTimeout(() => this.classList.remove('pressed'), 150);
  }

  render() {
    const { type, disabled, loading, success, label, icon, width, action, href } = this.state;
    this.className = `ui-button ${type}`;
    if (width === 'full_width') {
      this.classList.add('full-width');
    } else {
      this.classList.remove('full-width');
    }
    
    // Set role and accessibility attributes for link actions
    if (action === 'link' || action === 'link_blank') {
      this.setAttribute('role', 'link');
      if (href) {
        this.setAttribute('aria-label', label || href);
      }
    } else {
      this.setAttribute('role', 'button');
      this.removeAttribute('aria-label');
    }
    
    if (disabled) {
      this.setAttribute('aria-disabled', 'true');
    } else {
      this.removeAttribute('aria-disabled');
    }

    if (loading) {
      this.innerHTML = `<span class="content"><ui-icon name="loader" size="small" spin></ui-icon></span>`;
      return;
    }
    if (success) {
      this.innerHTML = `<span class="content"><ui-icon name="notification_success" size="small"></ui-icon><span class="label">${label || ''}</span></span>`;
      return;
    }

    const leftIcon = icon ? `<ui-icon name="${icon}" size="small"></ui-icon>` : '';
    this.innerHTML = `<span class="content">${leftIcon}${label ? `<span class="label">${label}</span>` : ''}</span>`;
  }
}

customElements.define('ui-button', UIButton);


