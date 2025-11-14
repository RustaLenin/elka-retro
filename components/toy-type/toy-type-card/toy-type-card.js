import { BaseElement } from '../../base-element.js';
import { toy_type_card_template } from './toy-type-card-template.js';

/**
 * Toy Type Card Component
 * Карточка типа игрушки для отображения в каталоге/поиске
 * Статичный компонент: данные из атрибутов
 */
export class ToyTypeCard extends BaseElement {
  static stateSchema = {
    id: { type: 'number', default: null, attribute: { name: 'id', observed: true, reflect: true } },
    title: { type: 'string', default: '', attribute: { name: 'title', observed: true, reflect: true } },
    year: { type: 'string', default: '', attribute: { name: 'year', observed: true, reflect: true } },
    factory: { type: 'string', default: '', attribute: { name: 'factory', observed: true, reflect: true } },
    rarityName: { type: 'string', default: '', attribute: { name: 'rarity-name', observed: true, reflect: true } },
    rarity: { type: 'string', default: '', attribute: { name: 'rarity', observed: true, reflect: true } },
    image: { type: 'string', default: '', attribute: { name: 'image', observed: true, reflect: true } },
    link: { type: 'string', default: '', attribute: { name: 'link', observed: true, reflect: true } },
    availableCount: { type: 'number', default: 0, attribute: { name: 'available-count', observed: true, reflect: true } },
    minPrice: { type: 'number', default: null, attribute: { name: 'min-price', observed: true, reflect: true } },
    maxPrice: { type: 'number', default: null, attribute: { name: 'max-price', observed: true, reflect: true } },
  };

  constructor() {
    super();
  }

  connectedCallback() {
    window.app.toolkit.loadCSSOnce(new URL('./toy-type-card-styles.css', import.meta.url));
    super.connectedCallback();
    
    // Устанавливаем data-toy-type-id на сам компонент (раньше было на article)
    if (this.state.id) {
      this.setAttribute('data-toy-type-id', String(this.state.id));
    }
    
    this.render();
  }
  
  onStateChanged(key) {
    if (key === 'id') {
      if (this.state.id) {
        this.setAttribute('data-toy-type-id', String(this.state.id));
      } else {
        this.removeAttribute('data-toy-type-id');
      }
    }
  }

  render() {
    this.innerHTML = toy_type_card_template(this.state);
  }
}

customElements.define('toy-type-card', ToyTypeCard);

