/**
 * Order Card Component
 * Карточка заказа для отображения в истории заказов
 */

import { BaseElement } from '../../../../../base-element.js';
import { renderOrderCardTemplate } from './order-card-template.js';

if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./order-card-styles.css', import.meta.url));
}

export class OrderCard extends BaseElement {
  static stateSchema = {
    order: {
      type: 'json',
      default: null,
      attribute: null
    },
    orderId: {
      type: 'number',
      default: null,
      attribute: { name: 'order-id', observed: true, reflect: true }
    }
  };

  constructor() {
    super();
    this._orderData = null;
  }

  connectedCallback() {
    super.connectedCallback();
    
    // Если передан order-id, загружаем заказ
    if (this.state.orderId && !this.state.order) {
      this._loadOrder();
    } else {
      this.render();
    }

    // Привязываем обработчики действий
    this._attachActionHandlers();
  }

  _attachActionHandlers() {
    // Обработчик отмены заказа
    const cancelBtn = this.querySelector('[data-app-action="order-card:cancel"]');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', (e) => this._handleCancelOrder(e));
    }

    // Обработчик обращения по заказу
    const contactBtn = this.querySelector('[data-app-action="order-card:contact"]');
    if (contactBtn) {
      contactBtn.addEventListener('click', (e) => this._handleContactOrder(e));
    }
  }

  async _handleCancelOrder(event) {
    event.preventDefault();
    event.stopPropagation();

    const orderId = event.currentTarget.getAttribute('data-order-id');
    if (!orderId) return;

    const orderNumber = this.state.order?.order_number || orderId;
    
    // Подтверждение отмены
    const confirmed = confirm(`Вы уверены, что хотите отменить заказ ${orderNumber}?`);
    if (!confirmed) return;

    try {
      const apiUrl = window.wpApiSettings?.root || '/wp-json/';
      const nonce = window.wpApiSettings?.nonce || '';

      const response = await fetch(`${apiUrl}elkaretro/v1/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': nonce
        },
        credentials: 'same-origin'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Не удалось отменить заказ');
      }

      const result = await response.json();
      
      // Обновляем данные заказа
      if (result.order) {
        this.setState({ order: result.order });
      }

      // Показываем уведомление об успехе
      if (window.app?.notify?.success) {
        window.app.notify.success('Заказ успешно отменён');
      } else {
        alert('Заказ успешно отменён');
      }

      // Отправляем событие для обновления списка заказов
      this.dispatchEvent(new CustomEvent('order-card:cancelled', {
        bubbles: true,
        detail: { orderId, order: result.order }
      }));
    } catch (error) {
      console.error('[OrderCard] Cancel error:', error);
      
      // Показываем уведомление об ошибке
      if (window.app?.notify?.error) {
        window.app.notify.error(error.message || 'Ошибка при отмене заказа');
      } else {
        alert(error.message || 'Ошибка при отмене заказа');
      }
    }
  }

  _handleContactOrder(event) {
    event.preventDefault();
    event.stopPropagation();

    const orderId = event.currentTarget.getAttribute('data-order-id');
    const orderNumber = event.currentTarget.getAttribute('data-order-number') || orderId;

    // Открываем форму обратной связи с предзаполненной темой
    if (window.app?.events) {
      window.app.events.emit('user.openContactForm', {
        payload: {
          subject: `Вопрос по заказу ${orderNumber}`,
          orderId: orderId,
          orderNumber: orderNumber
        }
      });
    } else {
      // Fallback: открываем вкладку обратной связи в профиле
      const profilePage = document.querySelector('profile-page');
      if (profilePage) {
        profilePage.showTab('contact');
        // Сохраняем данные для предзаполнения
        if (orderNumber) {
          sessionStorage.setItem('contact-form-preset', JSON.stringify({
            subject: `Вопрос по заказу ${orderNumber}`,
            orderId: orderId,
            orderNumber: orderNumber
          }));
        }
        // Прокручиваем к форме
        requestAnimationFrame(() => {
          const contactTab = document.querySelector('contact-form-tab');
          if (contactTab) {
            contactTab.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Применяем предзаполнение
            if (typeof contactTab._applyPresetData === 'function') {
              contactTab._applyPresetData();
            }
          }
        });
      }
    }
  }

  async _loadOrder() {
    if (!this.state.orderId) return;

    try {
      const apiUrl = window.wpApiSettings?.root || '/wp-json/';
      const nonce = window.wpApiSettings?.nonce || '';

      const response = await fetch(`${apiUrl}elkaretro/v1/orders/${this.state.orderId}`, {
        headers: {
          'X-WP-Nonce': nonce
        },
        credentials: 'same-origin'
      });

      if (!response.ok) {
        throw new Error('Не удалось загрузить заказ');
      }

      const orderData = await response.json();
      this.setState({ order: orderData });
    } catch (error) {
      console.error('[OrderCard] Load error:', error);
      this.setState({ order: null });
    }
  }

  render() {
    this.innerHTML = renderOrderCardTemplate({
      order: this.state.order || this._orderData
    });

    // Привязываем обработчики после рендера
    requestAnimationFrame(() => {
      this._attachActionHandlers();
    });
  }

  onStateChanged(key) {
    if (key === 'order' || key === 'orderId') {
      this.render();
    }
  }

  /**
   * Установить данные заказа напрямую (без загрузки)
   */
  setOrder(orderData) {
    this._orderData = orderData;
    this.setState({ order: orderData });
  }
}

customElements.define('order-card', OrderCard);

