import { BaseElement } from '../../base-element.js';
import { cart_item_template } from './cart-item-template.js';
import { formatPrice } from '../helpers/price-formatter.js';

// Загружаем стили на верхнем уровне модуля
if (window.app && window.app.toolkit && window.app.toolkit.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./cart-item-styles.css', import.meta.url));
}

/**
 * Cart Item Component
 * Компонент для отображения отдельного товара в корзине
 * Статичный компонент: данные из атрибутов
 */
export class CartItem extends BaseElement {
  static stateSchema = {
    id: { type: 'number', default: null, attribute: { name: 'id', observed: true, reflect: true } },
    type: { type: 'string', default: '', attribute: { name: 'type', observed: true, reflect: true } },
    title: { type: 'string', default: '', attribute: { name: 'title', observed: true, reflect: true } },
    price: { type: 'number', default: null, attribute: { name: 'price', observed: true, reflect: true } },
    image: { type: 'string', default: '', attribute: { name: 'image', observed: true, reflect: true } },
    index: { type: 'string', default: '', attribute: { name: 'index', observed: true, reflect: true } },
    condition: { type: 'string', default: '', attribute: { name: 'condition', observed: true, reflect: true } },
  };

  constructor() {
    super();
    this._handleItemClick = () => {
      if (this.state.type === 'toy_instance') {
        this.openInstanceModal();
      }
    };
    this._handleButtonClick = (e) => {
      // Обрабатываем кастомное событие от ui-button для удаления товара
      e.stopPropagation();
      this.removeFromCart();
    };
    this._handleCartItemRemoved = (e) => {
      // Слушаем событие об удалении товара и удаляем себя, если это наш товар
      const { itemId, itemType } = e.detail;
      if (itemId === this.state.id && itemType === this.state.type) {
        this.remove();
      }
    };
  }

  connectedCallback() {
    super.connectedCallback();
    // Добавляем класс cart-item к самому элементу
    this.classList.add('cart-item');
    // Добавляем data-атрибуты
    if (this.state.id) {
      this.setAttribute('data-item-id', String(this.state.id));
    }
    if (this.state.type) {
      this.setAttribute('data-item-type', this.state.type);
    }
    this.render();
    this.attachEventListeners();
    // Подписываемся на события корзины для автоматического удаления
    window.addEventListener('elkaretro:cart:item-removed', this._handleCartItemRemoved);
  }

  disconnectedCallback() {
    // Отписываемся от событий при удалении компонента
    window.removeEventListener('elkaretro:cart:item-removed', this._handleCartItemRemoved);
  }

  render() {
    const { id, type, title, price, image, index, condition } = this.state;

    // Форматируем цену
    const formattedPrice = price !== null && price !== undefined ? formatPrice(price) : '';

    this.innerHTML = cart_item_template({
      id,
      type,
      title,
      price: formattedPrice,
      image,
      index,
      condition,
    });
  }

  /**
   * Открыть модальное окно экземпляра игрушки
   */
  openInstanceModal() {
    if (this.state.type !== 'toy_instance' || !this.state.id) {
      return;
    }

    // Импортируем компонент динамически
    import('../../toy-instance/toy-instance-modal/toy-instance-modal.js').then(() => {
      const instanceModal = document.createElement('toy-instance-modal');
      instanceModal.setAttribute('instance-id', String(this.state.id));
      instanceModal.setAttribute('size', 'large');
      instanceModal.setAttribute('closable', '');
      
      // Убеждаемся что область существует
      if (!document.querySelector('.UIModalArea')) {
        const area = document.createElement('div');
        area.className = 'UIModalArea';
        document.body.appendChild(area);
      }
      
      const area = document.querySelector('.UIModalArea');
      area.appendChild(instanceModal);
      
      // Показываем после небольшой задержки для инициализации
      requestAnimationFrame(() => {
        instanceModal.show();
      });
    }).catch(err => {
      console.error('[CartItem] Failed to load modal:', err);
    });
  }

  attachEventListeners() {
    // Подписываемся на кастомное событие от ui-button
    this.addEventListener('cart-item:remove-click', this._handleButtonClick);

    // Делаем карточку кликабельной (кроме кнопки удаления)
    if (this.state.type === 'toy_instance') {
      this.style.cursor = 'pointer';
      this.addEventListener('click', (e) => {
        // Не открываем модалку, если клик по кнопке удаления
        if (!e.target.closest('.cart-item_remove-btn') && !e.target.closest('ui-button')) {
          this._handleItemClick();
        }
      });
    }
  }

  /**
   * Удалить товар из корзины
   * Вызывает публичный API корзины, который сам обновит состояние и отправит события
   */
  removeFromCart() {
    const { id, type } = this.state;
    if (id && type && window.app && window.app.cart) {
      this.dispatchEvent(
        new CustomEvent('cart-item:removal-start', {
          bubbles: true,
          composed: true,
          detail: { id, type },
        })
      );
      window.app.cart.remove(id, type);
    }
  }

  /**
   * Удалить компонент из DOM
   * Вызывается автоматически при получении события elkaretro:cart:item-removed
   */
  remove() {
    if (this.parentElement) {
      this.parentElement.removeChild(this);
    }
  }
}

customElements.define('cart-item', CartItem);

