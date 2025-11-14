import { BaseElement } from '../../../../base-element.js';

if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./order-history-styles.css', import.meta.url));
}

export class OrderHistoryTab extends BaseElement {
  static stateSchema = {
    userId: {
      type: 'number',
      default: null,
      attribute: { name: 'user-id', observed: true, reflect: true }
    },
    loading: {
      type: 'boolean',
      default: true,
      attribute: null,
      internal: true
    }
  };

  connectedCallback() {
    super.connectedCallback();
    this.render();
  }

  render() {
    this.innerHTML = `
      <div class="order-history-tab">
        <div class="order-history-tab__content">
          <p class="order-history-tab__placeholder">Компонент истории заказов в разработке</p>
          <p class="order-history-tab__note">Сущность "заказ" ещё не реализована в системе</p>
        </div>
      </div>
    `;
  }
}

customElements.define('order-history-tab', OrderHistoryTab);

