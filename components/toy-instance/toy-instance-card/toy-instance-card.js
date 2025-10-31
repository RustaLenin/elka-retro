import { BaseElement } from '../../base-element.js';
import { toy_instance_card_template } from './toy-instance-card-template.js';

/**
 * Toy Instance Card Component
 * Карточка экземпляра игрушки для отображения под страницей типа
 * Статичный компонент: данные из атрибутов
 */
export class ToyInstanceCard extends BaseElement {
  static stateSchema = {
    id: { type: 'number', default: null, attribute: { name: 'id', observed: true, reflect: true } },
    title: { type: 'string', default: '', attribute: { name: 'title', observed: true, reflect: true } },
    price: { type: 'number', default: null, attribute: { name: 'price', observed: true, reflect: true } },
    image: { type: 'string', default: '', attribute: { name: 'image', observed: true, reflect: true } },
    rarity: { type: 'string', default: '', attribute: { name: 'rarity', observed: true, reflect: true } },
    tubeCondition: { type: 'string', default: '', attribute: { name: 'tube-condition', observed: true, reflect: true } },
    available: { type: 'boolean', default: true, attribute: { name: 'available', observed: true, reflect: true } },
  };

  constructor() {
    super();
    // Создаём обработчики один раз, чтобы не дублировать
    this._handleCardClick = (e) => {
      // Не открываем модалку если клик по кнопке "Купить"
      if (e.target.closest('.toy-instance-card_buy-btn')) {
        return;
      }
      // Открываем модальное окно с деталями экземпляра
      this.openInstanceModal();
    };
    
    this._handleBuyClick = (e) => {
      e.stopPropagation();
      // TODO: Раскомментировать когда будет готова функция добавления в корзину
      // this.addToCart();
    };
  }

  connectedCallback() {
    window.app.toolkit.loadCSSOnce(new URL('./toy-instance-card-styles.css', import.meta.url));
    super.connectedCallback();
    this.render();
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Клик по всей карточке - открывает модалку
    // Используем делегирование для избежания проблем при ререндере
    this.removeEventListener('click', this._handleCardClick);
    this.addEventListener('click', this._handleCardClick);
    
    // Клик по кнопке "Купить" - используем делегирование через родителя
    const buyBtn = this.querySelector('.toy-instance-card_buy-btn');
    if (buyBtn) {
      buyBtn.removeEventListener('click', this._handleBuyClick);
      buyBtn.addEventListener('click', this._handleBuyClick);
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

