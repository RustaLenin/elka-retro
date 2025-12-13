import { BaseElement } from '../../base-element.js';
import { ny_accessory_card_template } from './ny-accessory-card-template.js';

/**
 * Ny Accessory Card Component
 * Карточка новогоднего аксессуара для списков и каталогов
 */
export class NyAccessoryCard extends BaseElement {
  static stateSchema = {
    id: { type: 'number', default: null, attribute: { name: 'id', observed: true, reflect: true } },
    title: { type: 'string', default: '', attribute: { name: 'title', observed: true, reflect: true } },
    index: { type: 'string', default: '', attribute: { name: 'index', observed: true, reflect: true } },
    price: { type: 'number', default: null, attribute: { name: 'price', observed: true, reflect: true } },
    stock: { type: 'number', default: 0, attribute: { name: 'stock', observed: true, reflect: true } },
    condition: { type: 'string', default: '', attribute: { name: 'condition', observed: true, reflect: true } },
    conditionSlug: { type: 'string', default: '', attribute: { name: 'condition-slug', observed: true, reflect: true } },
    material: { type: 'string', default: '', attribute: { name: 'material', observed: true, reflect: true } },
    excerpt: { type: 'string', default: '', attribute: { name: 'excerpt', observed: true, reflect: true } },
    image: { type: 'string', default: '', attribute: { name: 'image', observed: true, reflect: true } },
    link: { type: 'string', default: '', attribute: { name: 'link', observed: true, reflect: true } }
  };

  constructor() {
    super();
    this._handleCartClick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.addToCart();
    };
  }

  connectedCallback() {
    window.app.toolkit.loadCSSOnce(new URL('./ny-accessory-card-styles.css', import.meta.url));
    super.connectedCallback();
    
    // Устанавливаем data-accessory-id на сам компонент (раньше было на article)
    if (this.state.id) {
      this.setAttribute('data-accessory-id', String(this.state.id));
    }
    
    this.render();
    this.setupEventListeners();
  }
  
  onStateChanged(key) {
    if (key === 'id') {
      if (this.state.id) {
        this.setAttribute('data-accessory-id', String(this.state.id));
      } else {
        this.removeAttribute('data-accessory-id');
      }
    }
  }

  setupEventListeners() {
    // Обработка клика по кнопке корзины через кастомное событие от ui-button
    this.removeEventListener('ny-accessory-card:cart-click', this._handleCartClick);
    this.addEventListener('ny-accessory-card:cart-click', this._handleCartClick);

    // Подписываемся на обновления корзины - просто перерисовываем карточку
    if (!this._cartUpdateHandler) {
      this._cartUpdateHandler = () => {
        this.render();
      };
      window.addEventListener('elkaretro:cart:updated', this._cartUpdateHandler);
    }
  }

  disconnectedCallback() {
    // Удаляем обработчик при отключении компонента
    if (this._cartUpdateHandler) {
      window.removeEventListener('elkaretro:cart:updated', this._cartUpdateHandler);
      this._cartUpdateHandler = null;
    }
    super.disconnectedCallback();
  }

  /**
   * Добавить товар в корзину
   */
  async addToCart() {
    const { id, price } = this.state;

    // Проверяем доступность товара
    if (!id || !price || price <= 0) {
      if (window.app?.ui?.showNotification) {
        window.app.ui.showNotification('Товар недоступен для добавления в корзину', 'error');
      }
      return;
    }

    // Если товар уже в корзине, удаляем его
    if (this.isInCart()) {
      await this.removeFromCart();
      return;
    }

    try {
      if (window.app?.cart) {
        window.app.cart.addItem({ id, type: 'ny_accessory', price });
        // Карточка обновится через событие elkaretro:cart:updated
      } else {
        console.warn('[NyAccessoryCard] Cart not available');
        if (window.app?.ui?.showNotification) {
          window.app.ui.showNotification('Не удалось добавить товар в корзину', 'error');
        }
      }
    } catch (error) {
      console.error('[NyAccessoryCard] Add to cart error:', error);
      if (window.app?.ui?.showNotification) {
        window.app.ui.showNotification('Ошибка при добавлении товара в корзину', 'error');
      }
    }
  }

  /**
   * Проверить, находится ли товар в корзине
   */
  isInCart() {
    if (!window.app?.cart) {
      return false;
    }
    const items = window.app.cart.getItems();
    return items.some(item => item.id === this.state.id && item.type === 'ny_accessory');
  }

  /**
   * Убрать товар из корзины
   */
  async removeFromCart() {
    const { id } = this.state;

    try {
      if (window.app?.cart) {
        window.app.cart.removeItem(id, 'ny_accessory');
        // Карточка обновится через событие elkaretro:cart:updated
      } else {
        console.warn('[NyAccessoryCard] Cart not available');
      }
    } catch (error) {
      console.error('[NyAccessoryCard] Remove from cart error:', error);
      if (window.app?.ui?.showNotification) {
        window.app.ui.showNotification('Ошибка при удалении товара из корзины', 'error');
      }
    }
  }

  render() {
    // Добавляем информацию о наличии в корзине в state для шаблона
    const renderState = {
      ...this.state,
      inCart: this.isInCart()
    };
    this.innerHTML = ny_accessory_card_template(renderState);
    // После рендера нужно переподключить слушатели
    if (this.isConnected) {
      this.setupEventListeners();
    }
  }
}

customElements.define('ny-accessory-card', NyAccessoryCard);


