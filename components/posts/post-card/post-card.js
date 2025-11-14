import { BaseElement } from '../../base-element.js';
import { post_card_template } from './post-card-template.js';

/**
 * Post Card Component
 * Карточка новости/поста для отображения в ленте
 * Статичный компонент: данные из атрибутов
 */
export class PostCard extends BaseElement {
  static stateSchema = {
    id: { type: 'number', default: null, attribute: { name: 'id', observed: true, reflect: true } },
    title: { type: 'string', default: '', attribute: { name: 'title', observed: true, reflect: true } },
    excerpt: { type: 'string', default: '', attribute: { name: 'excerpt', observed: true, reflect: true } },
    content: { type: 'string', default: '', attribute: { name: 'content', observed: true, reflect: true } },
    date: { type: 'string', default: '', attribute: { name: 'date', observed: true, reflect: true } },
    image: { type: 'string', default: '', attribute: { name: 'image', observed: true, reflect: true } },
    link: { type: 'string', default: '', attribute: { name: 'link', observed: true, reflect: true } },
  };

  constructor() {
    super();
  }

  connectedCallback() {
    window.app.toolkit.loadCSSOnce(new URL('./post-card-styles.css', import.meta.url));
    super.connectedCallback();
    
    // Устанавливаем data-post-id на сам компонент (раньше было на article)
    if (this.state.id) {
      this.setAttribute('data-post-id', String(this.state.id));
    }
    
    this.render();
  }
  
  onStateChanged(key) {
    if (key === 'id') {
      if (this.state.id) {
        this.setAttribute('data-post-id', String(this.state.id));
      } else {
        this.removeAttribute('data-post-id');
      }
    }
  }

  render() {
    this.innerHTML = post_card_template(this.state);
  }
}

customElements.define('post-card', PostCard);

