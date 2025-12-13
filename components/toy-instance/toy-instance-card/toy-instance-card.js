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
      this.openInstanceModal().catch(err => {
        console.error('[ToyInstanceCard] Error opening modal:', err);
      });
    };
    
    // Обработчик клика на всю карточку
    this._handleCardClick = (e) => {
      console.log('[ToyInstanceCard] _handleCardClick called', { 
        target: e.target, 
        currentTarget: e.currentTarget,
        instanceId: this.state.id 
      });
      
      // Игнорируем клики на кнопку корзины и кнопку "Больше подробностей"
      // Проверяем как по классам, так и по тегу ui-button
      const clickedButton = e.target.closest('.toy-instance-card_cart-btn') || 
                            e.target.closest('.toy-instance-card_details-btn') ||
                            e.target.closest('ui-button');
      
      if (clickedButton) {
        // Если клик был на кнопке, не открываем модальное окно
        console.log('[ToyInstanceCard] Click on button ignored', clickedButton);
        return;
      }
      
      // Открываем модальное окно при клике на карточку
      console.log('[ToyInstanceCard] Card clicked, opening modal for instance:', this.state.id);
      this.openInstanceModal().catch(err => {
        console.error('[ToyInstanceCard] Error opening modal:', err);
      });
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
    // setupEventListeners() вызывается из render(), не нужно вызывать дважды
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
  }

  async openInstanceModal() {
    // toy-instance-modal уже загружен статически через components.js
    try {
      // Ждём, пока компонент будет определён в customElements
      await customElements.whenDefined('toy-instance-modal');
      
      const instanceModal = document.createElement('toy-instance-modal');
      instanceModal.setAttribute('instance-id', String(this.state.id));
      instanceModal.setAttribute('size', 'large');
      instanceModal.setAttribute('closable', '');
      
      // Добавляем в DOM - UIModal.connectedCallback автоматически создаст область и добавит модалку
      document.body.appendChild(instanceModal);
      
      // Ждём, пока элемент полностью инициализируется (connectedCallback выполнится)
      // connectedCallback вызовет render(), который создаст overlay и container
      await new Promise((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      });
      
      // Показываем модальное окно
      if (typeof instanceModal.show === 'function') {
        instanceModal.show();
      } else {
        console.error('[ToyInstanceCard] toy-instance-modal.show() method not available');
      }
    } catch (error) {
      console.error('[ToyInstanceCard] Failed to open instance modal:', error);
    }
  }

  /**
   * Добавить товар в корзину
   */
  async addToCart() {
    const { id, price, status } = this.state;

    // Проверяем доступность товара
    if (status !== 'publish' || !id || !price || price <= 0) {
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

    // Используем событийную модель для добавления товара в корзину
    window.dispatchEvent(
      new CustomEvent('elkaretro:cart:add-item', {
        detail: { itemId: id, itemType: 'toy_instance', price: price },
      })
    );
    // Карточка обновится через событие elkaretro:cart:updated
  }

  /**
   * Проверить, находится ли товар в корзине
   */
  isInCart() {
    if (!window.app?.cart) {
      return false;
    }
    const instanceId = Number(this.state.id);
    const items = window.app.cart.getItems();
    return items.some(item => Number(item.id) === instanceId && item.type === 'toy_instance');
  }

  /**
   * Убрать товар из корзины
   */
  async removeFromCart() {
    const { id } = this.state;

    // Используем событийную модель для удаления товара из корзины
    window.dispatchEvent(
      new CustomEvent('elkaretro:cart:remove-item', {
        detail: { itemId: id, itemType: 'toy_instance' },
      })
    );
    // Кнопка обновится через событие elkaretro:cart:updated
  }

  render() {
    // Добавляем информацию о наличии в корзине в state для шаблона
    const renderState = {
      ...this.state,
      inCart: this.isInCart()
    };
    
    this.innerHTML = toy_instance_card_template(renderState);
    
    // Переподключаем обработчики после рендера
    // Обработчики событий от ui-button всплывают, поэтому слушаем на самом компоненте
    if (this.isConnected) {
      this.setupEventListeners();
    }
  }
}

customElements.define('toy-instance-card', ToyInstanceCard);

