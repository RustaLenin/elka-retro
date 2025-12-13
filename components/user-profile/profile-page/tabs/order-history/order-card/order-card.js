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
    console.log('[OrderCard] connectedCallback called');
    super.connectedCallback();
    
    // Читаем данные из data-order атрибута (если передан)
    const dataOrderAttr = this.getAttribute('data-order');
    console.log('[OrderCard] data-order attribute:', dataOrderAttr ? 'present' : 'missing');
    
    if (dataOrderAttr && !this.state.order && !this._orderData) {
      try {
        // Распарсим JSON из атрибута
        const orderData = JSON.parse(dataOrderAttr);
        console.log('[OrderCard] Parsed order data:', orderData);
        this._orderData = orderData;
        this.setState({ order: orderData });
        // Также устанавливаем orderId для совместимости
        if (orderData.id) {
          this.setState({ orderId: orderData.id });
        }
      } catch (error) {
        console.error('[OrderCard] Failed to parse data-order attribute:', error);
      }
    }
    
    // Если передан order-id, загружаем заказ
    if (this.state.orderId && !this.state.order && !this._orderData) {
      console.log('[OrderCard] Loading order by orderId:', this.state.orderId);
      this._loadOrder();
    } else if (this.state.order || this._orderData) {
      // Если данные уже есть, рендерим
      console.log('[OrderCard] Order data present, rendering...');
      this.render();
    } else {
      // Иначе пытаемся загрузить по orderId
      const orderIdAttr = this.getAttribute('data-order-id') || this.getAttribute('order-id');
      if (orderIdAttr) {
        console.log('[OrderCard] Loading order by data-order-id:', orderIdAttr);
        this.setState({ orderId: parseInt(orderIdAttr, 10) });
        this._loadOrder();
      } else {
        // Нет данных - рендерим пустую карточку или сообщение об ошибке
        console.warn('[OrderCard] No order data available, rendering empty card');
        this.render();
      }
    }

    // Привязываем обработчики действий
    requestAnimationFrame(() => {
      this._attachActionHandlers();
    });
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
    const order = this.state.order || this._orderData;
    console.log('[OrderCard] render() called with order:', order ? { id: order.id, order_number: order.order_number } : 'null');
    
    if (!order) {
      console.warn('[OrderCard] No order data to render');
      this.innerHTML = '<div class="order-card"><p>Данные заказа не загружены</p></div>';
      return;
    }
    
    this.innerHTML = renderOrderCardTemplate({
      order: order
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

