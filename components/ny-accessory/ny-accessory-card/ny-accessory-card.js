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
    condition: { type: 'string', default: '', attribute: { name: 'condition', observed: true, reflect: true } },
    conditionSlug: { type: 'string', default: '', attribute: { name: 'condition-slug', observed: true, reflect: true } },
    material: { type: 'string', default: '', attribute: { name: 'material', observed: true, reflect: true } },
    excerpt: { type: 'string', default: '', attribute: { name: 'excerpt', observed: true, reflect: true } },
    image: { type: 'string', default: '', attribute: { name: 'image', observed: true, reflect: true } },
    link: { type: 'string', default: '', attribute: { name: 'link', observed: true, reflect: true } }
  };

  constructor() {
    super();
  }

  connectedCallback() {
    window.app.toolkit.loadCSSOnce(new URL('./ny-accessory-card-styles.css', import.meta.url));
    super.connectedCallback();
    this.render();
  }

  render() {
    this.innerHTML = ny_accessory_card_template(this.state);
  }
}

customElements.define('ny-accessory-card', NyAccessoryCard);


