import { BaseElement } from '../../base-element.js';
import { toy_instance_card_template } from './toy-instance-card-template.js';

// Загружаем стили на верхнем уровне модуля (не в connectedCallback)
if (window.app && window.app.toolkit && window.app.toolkit.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./toy-instance-card-styles.css', import.meta.url));
}

/**
 * Toy Instance Card Component
 * Карточка экземпляра игрушки для отображения под страницей типа
 * Статичный компонент: данные из атрибутов
 * 
 * Использует дата-модель для получения правильных названий полей из REST API
 */
export class ToyInstanceCard extends BaseElement {
  static stateSchema = {
    id: { type: 'number', default: null, attribute: { name: 'id', observed: true, reflect: true } },
    title: { type: 'string', default: '', attribute: { name: 'title', observed: true, reflect: true } },
    price: { type: 'number', default: null, attribute: { name: 'price', observed: true, reflect: true } },
    image: { type: 'string', default: '', attribute: { name: 'image', observed: true, reflect: true } },
    rarity: { type: 'string', default: '', attribute: { name: 'rarity', observed: true, reflect: true } },
    tubeCondition: { type: 'string', default: '', attribute: { name: 'tube-condition', observed: true, reflect: true } },
    condition: { type: 'string', default: '', attribute: { name: 'condition', observed: true, reflect: true } },
    authenticity: { type: 'string', default: '', attribute: { name: 'authenticity', observed: true, reflect: true } },
    available: { type: 'boolean', default: true, attribute: { name: 'available', observed: true, reflect: true } },
    // Дополнительные поля из дата-модели (для будущего использования)
    instanceIndex: { type: 'string', default: '', attribute: { name: 'instance-index', observed: true, reflect: true } },
    status: { type: 'string', default: 'publish', attribute: { name: 'status', observed: true, reflect: true } },
  };

  constructor() {
    super();
    // Создаём обработчики один раз, чтобы не дублировать
    this._handleBuyClick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.addToCart();
    };
    
    this._handleDetailsClick = (e) => {
      e.stopPropagation();
      // Открываем модальное окно с деталями экземпляра
      this.openInstanceModal();
    };
    
    // Обработчик клика на всю карточку
    this._handleCardClick = (e) => {
      // Игнорируем клики на кнопку корзины и кнопку "Больше подробностей"
      // Проверяем как по классам, так и по тегу ui-button
      const clickedButton = e.target.closest('.toy-instance-card_cart-btn') || 
                            e.target.closest('.toy-instance-card_details-btn') ||
                            e.target.closest('ui-button');
      
      if (clickedButton) {
        // Если клик был на кнопке, не открываем модальное окно
        return;
      }
      
      // Открываем модальное окно при клике на карточку
      this.openInstanceModal();
    };
  }

  connectedCallback() {
    super.connectedCallback();
    
    // Устанавливаем data-instance-id на сам компонент (раньше было на article)
    if (this.state.id) {
      this.setAttribute('data-instance-id', String(this.state.id));
    }
    
    // Устанавливаем класс редкости на сам компонент (раньше было на article)
    this._updateRarityClass();
    
    this.render();
    this.setupEventListeners();
  }
  
  onStateChanged(key) {
    if (key === 'id') {
      if (this.state.id) {
        this.setAttribute('data-instance-id', String(this.state.id));
      } else {
        this.removeAttribute('data-instance-id');
      }
    }
    
    if (key === 'rarity') {
      this._updateRarityClass();
    }
  }
  
  _updateRarityClass() {
    // Удаляем все классы редкости
    this.classList.remove('rarity-rare', 'rarity-rarely', 'rarity-not-often', 'rarity-often');
    
    // Добавляем нужный класс
    if (this.state.rarity) {
      const rarity = this.state.rarity.toLowerCase();
      if (rarity === 'rare' || rarity.includes('rare')) {
        this.classList.add('rarity-rare');
      } else if (rarity === 'rarely' || rarity.includes('rarely')) {
        this.classList.add('rarity-rarely');
      } else if (rarity === 'not-often' || rarity.includes('not-often')) {
        this.classList.add('rarity-not-often');
      } else if (rarity === 'often' || rarity.includes('often')) {
        this.classList.add('rarity-often');
      }
    }
  }

  setupEventListeners() {
    // Обработка клика по кнопке корзины через кастомное событие от ui-button
    this.removeEventListener('toy-instance-card:cart-click', this._handleBuyClick);
    this.addEventListener('toy-instance-card:cart-click', this._handleBuyClick);
    
    // Обработка клика по кнопке "Больше подробностей" через кастомное событие от ui-button
    this.removeEventListener('toy-instance-card:details-click', this._handleDetailsClick);
    this.addEventListener('toy-instance-card:details-click', this._handleDetailsClick);
    
    // Обработка клика на всю карточку
    this.removeEventListener('click', this._handleCardClick);
    this.addEventListener('click', this._handleCardClick);

    // Подписываемся на обновления корзины для перерисовки кнопки
    if (window.app && window.app.cartStore) {
      const handleCartUpdate = () => {
        this.render();
      };
      window.addEventListener('elkaretro:cart:updated', handleCartUpdate);
      // Сохраняем обработчик для последующего удаления
      this._cartUpdateHandler = handleCartUpdate;
    }
  }

  disconnectedCallback() {
    // Удаляем обработчик при отключении компонента
    if (this._cartUpdateHandler) {
      window.removeEventListener('elkaretro:cart:updated', this._cartUpdateHandler);
    }
    // BaseElement не имеет disconnectedCallback, поэтому не вызываем super
  }

  openInstanceModal() {
    // Импортируем компонент динамически
    import('../toy-instance-modal/toy-instance-modal.js').then(() => {
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
      console.error('[ToyInstanceCard] Failed to load modal:', err);
    });
  }

  /**
   * Добавить товар в корзину
   */
  async addToCart() {
    const { id, price, status } = this.state;

    // Проверяем доступность товара
    if (status !== 'publish' || !id || !price || price <= 0) {
      this.showNotification('Товар недоступен для добавления в корзину', 'error');
      return;
    }

    // Если товар уже в корзине, удаляем его
    if (this.isInCart()) {
      await this.removeFromCart();
      return;
    }

    try {
      // Используем cartStore если доступен, иначе fallback на старый API
      if (window.app && window.app.cartStore) {
        const { addItem } = await import('../../cart/cart-service.js');
        addItem({
          id,
          type: 'toy_instance',
          price,
        });
        this.showNotification('Товар добавлен в корзину', 'success');
        this.render(); // Перерисовываем для обновления кнопки
      } else if (window.app && window.app.cart && window.app.cart.add) {
        // Fallback на старый API (для обратной совместимости)
        window.app.cart.add(id);
        this.showNotification('Товар добавлен в корзину', 'success');
        this.render();
      } else {
        console.warn('[ToyInstanceCard] Cart service not available');
        this.showNotification('Не удалось добавить товар в корзину', 'error');
      }
    } catch (error) {
      console.error('[ToyInstanceCard] Add to cart error:', error);
      this.showNotification('Ошибка при добавлении товара в корзину', 'error');
    }
  }

  /**
   * Показать уведомление
   */
  showNotification(message, type = 'info') {
    // Используем ui-notification через window.app.ui
    if (window.app && window.app.ui && window.app.ui.showNotification) {
      window.app.ui.showNotification(message, type);
    } else {
      // Fallback: просто в консоль
      console.log(`[ToyInstanceCard] ${type}: ${message}`);
    }
  }

  /**
   * Проверить, находится ли товар в корзине
   */
  isInCart() {
    if (!window.app || !window.app.cartStore) {
      return false;
    }
    const cartStore = window.app.cartStore;
    const items = cartStore.getItems();
    return items.some(item => item.id === this.state.id && item.type === 'toy_instance');
  }

  /**
   * Убрать товар из корзины
   */
  async removeFromCart() {
    const { id } = this.state;

    try {
      if (window.app && window.app.cartStore) {
        const { removeItem } = await import('../../cart/cart-service.js');
        removeItem(id, 'toy_instance');
        this.showNotification('Товар удален из корзины', 'info');
        this.render(); // Перерисовываем для обновления кнопки
      } else {
        console.warn('[ToyInstanceCard] Cart service not available');
      }
    } catch (error) {
      console.error('[ToyInstanceCard] Remove from cart error:', error);
      this.showNotification('Ошибка при удалении товара из корзины', 'error');
    }
  }

  render() {
    // Добавляем информацию о наличии в корзине в state для шаблона
    const renderState = {
      ...this.state,
      inCart: this.isInCart()
    };
    this.innerHTML = toy_instance_card_template(renderState);
    // После рендера нужно переподключить слушатели для новой кнопки
    if (this.isConnected) {
      this.setupEventListeners();
    }
  }
}

customElements.define('toy-instance-card', ToyInstanceCard);

