import { BaseElement } from '../../../../base-element.js';
import './order-card/order-card.js';

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
    },
    orders: {
      type: 'json',
      default: null,
      attribute: null,
      internal: true
    },
    error: {
      type: 'string',
      default: null,
      attribute: null,
      internal: true
    },
    sortOrder: {
      type: 'string',
      default: 'desc',
      attribute: { name: 'sort-order', observed: true, reflect: true }
    }
  };

  constructor() {
    super();
    this._orders = [];
  }

  connectedCallback() {
    super.connectedCallback();
    
    // Загружаем заказы сразу, order-card загрузится позже при рендеринге
    this._loadOrders();
    
    // order-card уже загружен статически через components.js
    // Компонент будет доступен при рендеринге, дополнительное ожидание не требуется
  }

  async _loadOrders() {
    console.log('[OrderHistoryTab] Starting to load orders...');
    this.setState({ loading: true, error: null });

    try {
      const apiUrl = window.wpApiSettings?.root || '/wp-json/';
      const nonce = window.wpApiSettings?.nonce || '';

      console.log('[OrderHistoryTab] API URL:', `${apiUrl}elkaretro/v1/orders`);
      console.log('[OrderHistoryTab] Nonce available:', !!nonce);

      const response = await fetch(`${apiUrl}elkaretro/v1/orders`, {
        method: 'GET',
        headers: {
          'X-WP-Nonce': nonce,
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin'
      });

      console.log('[OrderHistoryTab] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[OrderHistoryTab] Response error:', errorData);
        throw new Error(errorData.message || 'Не удалось загрузить заказы');
      }

      const data = await response.json();
      console.log('[OrderHistoryTab] Response data:', data);
      
      // Handle response with debug info or plain array
      const orders = data?.orders || data;
      console.log('[OrderHistoryTab] Orders received:', orders?.length || 0);
      if (data?.debug) {
        console.log('[OrderHistoryTab] Debug info:', data.debug);
      }
      
      this._orders = Array.isArray(orders) ? orders : [];
      
      // Сортируем заказы
      this._sortOrders();
      
      this.setState({ 
        loading: false, 
        orders: this._orders,
        error: null 
      });
    } catch (error) {
      console.error('[OrderHistoryTab] Load error:', error);
      this.setState({ 
        loading: false, 
        error: error.message || 'Ошибка загрузки заказов',
        orders: null 
      });
    }
  }

  _sortOrders() {
    if (!this._orders || this._orders.length === 0) return;

    this._orders.sort((a, b) => {
      const dateA = new Date(a.created_at || a.id || 0);
      const dateB = new Date(b.created_at || b.id || 0);
      
      if (this.state.sortOrder === 'asc') {
        return dateA - dateB;
      } else {
        return dateB - dateA;
      }
    });
  }

  render() {
    if (this.state.loading) {
      this.innerHTML = `
        <div class="order-history-tab">
          <div class="order-history-tab__content">
            <div class="order-history-tab__loading">
              <ui-loader></ui-loader>
              <p class="order-history-tab__loading-text">Загрузка заказов...</p>
            </div>
          </div>
        </div>
      `;
      return;
    }

    if (this.state.error) {
      this.innerHTML = `
        <div class="order-history-tab">
          <div class="order-history-tab__content">
            <div class="order-history-tab__error">
              <p class="order-history-tab__error-message">${this._escapeHtml(this.state.error)}</p>
              <ui-button 
                type="primary" 
                label="Попробовать снова" 
                icon="refresh"
                data-app-action="order-history:reload"
              ></ui-button>
            </div>
          </div>
        </div>
      `;
      
      // Привязываем обработчик для перезагрузки
      requestAnimationFrame(() => {
        const reloadBtn = this.querySelector('[data-app-action="order-history:reload"]');
        if (reloadBtn) {
          reloadBtn.addEventListener('click', () => this._loadOrders());
        }
      });
      return;
    }

    const orders = this.state.orders || [];
    
    if (orders.length === 0) {
      this.innerHTML = `
        <div class="order-history-tab">
          <div class="order-history-tab__content">
            <div class="order-history-tab__empty">
              <ui-icon name="cart" size="large" style="color: var(--color-muted-foreground); margin-bottom: 1rem;"></ui-icon>
              <p class="order-history-tab__empty-message">У вас пока нет заказов</p>
              <p class="order-history-tab__empty-note">После оформления заказа он появится здесь</p>
            </div>
          </div>
        </div>
      `;
      return;
    }

    // Сначала убеждаемся, что order-card загружен
    // Рендерим список заказов
    // Передаем данные заказа через JSON в data-атрибут
    // Используем одинарные кавычки для атрибута и экранируем специальные символы
    const ordersHtml = orders.map((order, index) => {
      // Передаем данные заказа через JSON в data-атрибут
      // JSON.stringify создаёт валидный JSON, но для использования в HTML атрибуте
      // нужно экранировать специальные символы
      const orderJson = JSON.stringify(order);
      // Используем двойные кавычки для атрибута, экранируем двойные кавычки в JSON
      const orderData = orderJson.replace(/"/g, '&quot;');
      return `<order-card data-order="${orderData}"></order-card>`;
    }).join('');

    this.innerHTML = `
      <div class="order-history-tab">
        <div class="order-history-tab__header">
          <h2 class="order-history-tab__title">История заказов</h2>
          ${orders.length > 0 ? `
            <div class="order-history-tab__sort">
              <ui-button 
                type="ghost" 
                icon="${this.state.sortOrder === 'desc' ? 'arrow-down' : 'arrow-up'}"
                label="${this.state.sortOrder === 'desc' ? 'Сначала новые' : 'Сначала старые'}"
                data-app-action="order-history:toggle-sort"
              ></ui-button>
            </div>
          ` : ''}
        </div>
        <div class="order-history-tab__content">
          <div class="order-history-tab__orders">
            ${ordersHtml}
          </div>
        </div>
      </div>
    `;

      // Инициализируем карточки заказов
      // order-card уже загружен статически через components.js
      customElements.whenDefined('order-card')
        .then(() => {
          requestAnimationFrame(() => {
            const orderCards = this.querySelectorAll('order-card');
            console.log('[OrderHistoryTab] Found', orderCards.length, 'order cards');
            
            orderCards.forEach((card, index) => {
              // Данные уже должны быть в data-order атрибуте и обработаны в connectedCallback
              // Но дополнительно устанавливаем через setOrder для надёжности
              if (orders[index]) {
                // Используем метод setOrder для установки данных
                if (typeof card.setOrder === 'function') {
                  card.setOrder(orders[index]);
                } else {
                  console.warn('[OrderHistoryTab] order-card does not have setOrder method');
                }
              }
              
              // Подписываемся на событие отмены заказа
              card.addEventListener('order-card:cancelled', (e) => {
                // Обновляем список заказов после отмены
                this._loadOrders();
              });
            });

            // Привязываем обработчик для сортировки
            const sortBtn = this.querySelector('[data-app-action="order-history:toggle-sort"]');
            if (sortBtn) {
              sortBtn.addEventListener('click', () => {
                const newSortOrder = this.state.sortOrder === 'desc' ? 'asc' : 'desc';
                this.setState({ sortOrder: newSortOrder });
                this._sortOrders();
                this.setState({ orders: this._orders });
              });
            }
          });
        })
        .catch(err => {
          console.error('[OrderHistoryTab] Failed to initialize order cards:', err);
        });
  }

  onStateChanged(key) {
    if (key === 'loading' || key === 'orders' || key === 'error' || key === 'sortOrder') {
      this.render();
    }
  }

  _escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

customElements.define('order-history-tab', OrderHistoryTab);

