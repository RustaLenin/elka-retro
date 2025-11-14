import { BaseElement } from '../../base-element.js';

// Загружаем стили сразу при импорте модуля
if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./button-styles.css', import.meta.url));
}

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
    iconPosition: { type: 'string', default: 'left', attribute: { name: 'icon-position', observed: true, reflect: true } },
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
    const { type, disabled, loading, success, label, icon, iconPosition, width, action, href } = this.state;
    // Сохраняем дополнительные классы перед установкой базовых
    const preservedClasses = Array.from(this.classList).filter(cls => 
      cls !== 'ui-button' && 
      !cls.startsWith('ui-button--') &&
      cls !== 'primary' && 
      cls !== 'secondary' && 
      cls !== 'warning' && 
      cls !== 'ghost' && 
      cls !== 'danger' &&
      cls !== 'full-width' &&
      cls !== 'pressed'
    );
    // Устанавливаем базовые классы
    this.className = `ui-button ${type}`;
    // Восстанавливаем сохраненные дополнительные классы
    preservedClasses.forEach(cls => {
      if (cls) {
        this.classList.add(cls);
      }
    });
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
      if (label) {
        this.setAttribute('aria-label', label);
      } else {
        this.removeAttribute('aria-label');
      }
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

    const iconElement = icon ? `<ui-icon name="${icon}" size="small"></ui-icon>` : '';
    const labelElement = label ? `<span class="label">${label}</span>` : '';
    
    // Размещаем иконку слева или справа в зависимости от iconPosition
    if (iconPosition === 'right') {
      this.innerHTML = `<span class="content">${labelElement}${iconElement}</span>`;
    } else {
      this.innerHTML = `<span class="content">${iconElement}${labelElement}</span>`;
    }
  }

  // Публичный API

  /**
   * Выполнить программный клик
   * @returns {Promise}
   */
  async click() {
    if (this.state.disabled) return Promise.resolve();
    return this._onClick({ 
      preventDefault: () => {}, 
      stopPropagation: () => {} 
    });
  }

  /**
   * Установить состояние загрузки
   * @param {boolean} loading - состояние загрузки
   * @returns {this}
   */
  setLoading(loading) {
    this.setState({ 
      loading: Boolean(loading),
      disabled: loading ? true : (this._previousDisabled !== undefined ? this._previousDisabled : this.state.disabled)
    });
    if (loading) {
      // Сохраняем предыдущее состояние disabled перед установкой loading
      this._previousDisabled = this.state.disabled;
    } else {
      // Восстанавливаем предыдущее состояние disabled после снятия loading
      this._previousDisabled = undefined;
    }
    return this;
  }

  /**
   * Установить состояние успеха
   * @param {boolean} success - состояние успеха
   * @returns {this}
   */
  setSuccess(success) {
    this.setState({ success: Boolean(success) });
    // Автоматически сбрасываем success через 1.5 секунды
    if (success) {
      setTimeout(() => {
        if (this.state.success) {
          this.setState({ success: false });
        }
      }, 1500);
    }
    return this;
  }

  /**
   * Установить disabled состояние
   * @param {boolean} disabled - disabled состояние
   * @returns {this}
   */
  setDisabled(disabled) {
    this.setState({ disabled: Boolean(disabled) });
    return this;
  }

  /**
   * Сбросить все состояния к дефолтным
   * @returns {this}
   */
  reset() {
    this.setState({ 
      loading: false, 
      success: false, 
      disabled: false 
    });
    return this;
  }

  /**
   * Проверить, находится ли кнопка в состоянии загрузки
   * @returns {boolean}
   */
  isLoading() {
    return Boolean(this.state.loading);
  }

  /**
   * Проверить, находится ли кнопка в состоянии успеха
   * @returns {boolean}
   */
  isSuccess() {
    return Boolean(this.state.success);
  }

  /**
   * Проверить, отключена ли кнопка
   * @returns {boolean}
   */
  isDisabled() {
    return Boolean(this.state.disabled);
  }
}

customElements.define('ui-button', UIButton);


