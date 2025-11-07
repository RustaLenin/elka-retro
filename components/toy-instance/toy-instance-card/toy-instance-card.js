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
      // TODO: Раскомментировать когда будет готова функция добавления в корзину
      // this.addToCart();
    };
    
    this._handleDetailsClick = (e) => {
      e.stopPropagation();
      // Открываем модальное окно с деталями экземпляра
      this.openInstanceModal();
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this.render();
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Клик по кнопке "Добавить в корзину" (иконка)
    const cartBtn = this.querySelector('.toy-instance-card_cart-btn');
    if (cartBtn) {
      cartBtn.removeEventListener('click', this._handleBuyClick);
      cartBtn.addEventListener('click', this._handleBuyClick);
    }
    
    // Клик по кнопке "Больше подробностей"
    const detailsBtn = this.querySelector('.toy-instance-card_details-btn');
    if (detailsBtn) {
      detailsBtn.removeEventListener('click', this._handleDetailsClick);
      detailsBtn.addEventListener('click', this._handleDetailsClick);
    }
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

  // TODO: Раскомментировать когда будет готова функция добавления в корзину
  // addToCart() {
  //   if (window.app && window.app.cart && window.app.cart.add) {
  //     window.app.cart.add(this.state.id);
  //   }
  // }

  render() {
    this.innerHTML = toy_instance_card_template(this.state);
    // После рендера нужно переподключить слушатели для новой кнопки
    if (this.isConnected) {
      this.setupEventListeners();
    }
  }
}

customElements.define('toy-instance-card', ToyInstanceCard);

