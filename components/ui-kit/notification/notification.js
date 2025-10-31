import { BaseElement } from '../../base-element.js';
import { notificationTemplate } from './notification-template.js';

function ensureArea() {
  if (!document.querySelector('.UINotificationArea')) {
    document.body.insertAdjacentHTML('beforeend', `<div class="UINotificationArea"></div>`);
  }
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
    window.app.toolkit.loadCSSOnce(new URL('./notification-styles.css', import.meta.url));
    ensureArea();
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
}

customElements.define('ui-notification', UINotification);

export function notify(type = 'info', message = 'Какой-то текст уведомления', durationMs = 5000) {
  ensureArea();
  window.app.toolkit.loadCSSOnce(new URL('./notification-styles.css', import.meta.url));
  const area = document.querySelector('.UINotificationArea');
  const el = document.createElement('ui-notification');
  el.setAttribute('type', type);
  el.setAttribute('message', message);
  // set internal duration before connect
  el.state = el.state || {};
  el.state.duration = durationMs;
  area.prepend(el);
  return el;
}


