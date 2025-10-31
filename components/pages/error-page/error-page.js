import { BaseElement } from '../../base-element.js';
import { error_page_template } from './error-page-template.js';

/**
 * Error Page Component
 * Отображение страниц ошибок (404, 403, 500 и т.д.)
 * Статичный компонент: получает код ошибки через атрибут error-code
 */
export class ErrorPage extends BaseElement {
  static stateSchema = {
    errorCode: { 
      type: 'string', 
      default: '404', 
      attribute: { name: 'error-code', observed: true, reflect: true } 
    },
  };

  constructor() {
    super();
  }

  connectedCallback() {
    window.app.toolkit.loadCSSOnce(new URL('./error-page-styles.css', import.meta.url));
    super.connectedCallback();
    this.render();
  }

  onStateChanged(key) {
    if (key === 'errorCode') {
      this.render();
    }
  }

  render() {
    this.innerHTML = error_page_template(this.state);
  }
}

customElements.define('error-page', ErrorPage);

