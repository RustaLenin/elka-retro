import { BaseElement } from '../../base-element.js';
import { notificationTemplate } from './notification-template.js';

// Загружаем стили - отложенно, так как window.app может быть ещё не создан при импорте
let stylesLoaded = false;
function loadNotificationStyles() {
  if (stylesLoaded) return;
  
  if (window.app?.toolkit?.loadCSSOnce) {
    try {
      const cssUrl = new URL('./notification-styles.css', import.meta.url);
      window.app.toolkit.loadCSSOnce(cssUrl);
      stylesLoaded = true;
    } catch (err) {
      console.error('[notification] Failed to load CSS:', err);
    }
  }
}

// Создаём область для уведомлений сразу при регистрации компонента
function initNotificationArea() {
  if (!document.querySelector('.UINotificationArea')) {
    const area = document.createElement('div');
    area.className = 'UINotificationArea';
    document.body.appendChild(area);
  }
}

// Инициализируем область сразу при импорте модуля
if (document.body) {
  initNotificationArea();
} else {
  // Если body ещё не готов, ждём DOMContentLoaded
  document.addEventListener('DOMContentLoaded', initNotificationArea, { once: true });
}

export class UINotification extends BaseElement {
  static stateSchema = {
    type: { type: 'string', default: 'info', attribute: { name: 'type', observed: true, reflect: true } },
    message: { type: 'string', default: 'Какой-то текст уведомления', attribute: { name: 'message', observed: true, reflect: true } },
    duration: { type: 'number', default: 5000, attribute: null, internal: true },
  };

  constructor() {
    super();
  }

  connectedCallback() {
    super.connectedCallback();
    this.render();
    this.classList.add('notify_start');
    setTimeout(() => {
      this.classList.remove('notify_start');
      this.classList.add('notify_rest');
    }, 100);
    setTimeout(() => {
      this.classList.remove('notify_rest');
      this.classList.add('notify_end');
    }, this.state.duration);
    setTimeout(() => { this.remove(); }, this.state.duration + 1000);
  }

  render() {
    this.innerHTML = notificationTemplate(this.state.type, this.state.message);
  }

  // Публичный API

  /**
   * Получить тип уведомления
   * @returns {string}
   */
  type() {
    return this.state.type || 'info';
  }

  /**
   * Получить сообщение
   * @returns {string}
   */
  message() {
    return this.state.message || '';
  }

  /**
   * Обновить тип уведомления
   * @param {string} type - новый тип (info, success, error, warning)
   * @returns {this}
   */
  setType(type) {
    this.setState({ type: String(type || 'info') });
    this.render();
    return this;
  }

  /**
   * Обновить сообщение
   * @param {string} message - новое сообщение
   * @returns {this}
   */
  setMessage(message) {
    this.setState({ message: String(message || '') });
    this.render();
    return this;
  }

  /**
   * Обновить уведомление (тип и сообщение)
   * @param {string} type - новый тип
   * @param {string} message - новое сообщение
   * @returns {this}
   */
  update(type, message) {
    if (type) this.setType(type);
    if (message !== undefined) this.setMessage(message);
    return this;
  }

  /**
   * Закрыть уведомление немедленно
   * @returns {this}
   */
  close() {
    this.classList.add('notify_end');
    setTimeout(() => {
      if (this.parentNode) {
        this.remove();
      }
    }, 300);
    return this;
  }

  /**
   * Увеличить время показа (сбросить таймер)
   * @param {number} durationMs - дополнительное время в миллисекундах
   * @returns {this}
   */
  extendDuration(durationMs) {
    // Очищаем старые таймеры и устанавливаем новые
    this.classList.remove('notify_end');
    const duration = (this.state.duration || 5000) + (durationMs || 0);
    this.state.duration = duration;
    
    setTimeout(() => {
      this.classList.remove('notify_rest');
      this.classList.add('notify_end');
    }, duration);
    
    setTimeout(() => {
      if (this.isConnected) {
        this.remove();
      }
    }, duration + 1000);
    
    return this;
  }
}

customElements.define('ui-notification', UINotification);

export function notify(type = 'info', message = 'Какой-то текст уведомления', durationMs = 5000) {
  // Загружаем стили при первом вызове notify (когда window.app уже точно существует)
  loadNotificationStyles();
  
  // Убеждаемся, что область существует
  let area = document.querySelector('.UINotificationArea');
  if (!area) {
    // Если области нет, создаём её
    initNotificationArea();
    area = document.querySelector('.UINotificationArea');
  }
  
  if (!area) {
    console.error('[notification] Failed to create notification area');
    return null;
  }
  
  // Убеждаемся, что компонент ui-notification определён
  if (!customElements.get('ui-notification')) {
    console.error('[notification] ui-notification component not defined');
    return null;
  }
  
  const el = document.createElement('ui-notification');
  el.setAttribute('type', type);
  el.setAttribute('message', message);
  // set internal duration before connect
  el.state = el.state || {};
  el.state.duration = durationMs;
  area.prepend(el);
  return el;
}


