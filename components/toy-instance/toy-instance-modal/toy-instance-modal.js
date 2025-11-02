import { BaseElement } from '../../base-element.js';
import { UIModal } from '../../ui-kit/modal/modal.js';
import { toy_instance_modal_template } from './toy-instance-modal-template.js';

// Загружаем стили при импорте модуля (top-level)
// Это гарантирует, что стили всегда доступны, даже если компонент еще не подключен к DOM
if (window.app && window.app.toolkit && window.app.toolkit.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./toy-instance-modal-styles.css', import.meta.url));
}

/**
 * Toy Instance Modal Component
 * Модальное окно с детальной информацией об экземпляре игрушки
 * Автономный компонент: загружает данные по ID через WP REST API
 * Наследуется от UIModal для базовой функциональности модалки
 */
export class ToyInstanceModal extends UIModal {
  static stateSchema = {
    title: UIModal.stateSchema.title,
    size: UIModal.stateSchema.size,
    closable: UIModal.stateSchema.closable,
    apiUrl: UIModal.stateSchema.apiUrl,
    loading: UIModal.stateSchema.loading,
    visible: UIModal.stateSchema.visible,
    instanceId: { type: 'number', default: null, attribute: { name: 'instance-id', observed: true, reflect: true } },
    data: { type: 'json', default: null, attribute: null, internal: true },
  };

  constructor() {
    super();
  }

  connectedCallback() {
    // Стили уже загружены при импорте модуля
    // window.app.toolkit.loadCSSOnce(new URL('./toy-instance-modal-styles.css', import.meta.url));
    super.connectedCallback();
    if (this.state.instanceId) {
      this.loadInstanceData();
    }
  }

  async loadInstanceData() {
    const { instanceId } = this.state;
    if (!instanceId) return;
    
    this.setState({ loading: true, error: null });
    try {
      // Загружаем экземпляр с embedded данными (для таксономий и изображений)
      const res = await fetch(`/wp-json/wp/v2/toy_instance/${instanceId}?_embed=1`, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      this.setState({ data: json });
      
      // Сохраняем данные в глобальный стейт для доступа других компонентов (например, галереи)
      if (window.app && window.app.state) {
        // Извлекаем изображения для галереи и сохраняем отдельно
        const photos = json.meta?.photos_of_the_toy_instance || [];
        const embeddedMedia = json._embedded?.['wp:attachment'] || [];
        const featuredMedia = json._embedded?.['wp:featuredmedia'] || [];
        const allMedia = [...embeddedMedia, ...featuredMedia];
        
        const images = photos.map(photoId => {
          const id = Array.isArray(photoId) && photoId.ID ? photoId.ID : photoId;
          const mediaObj = allMedia.find(m => m.id === id || m.media_details?.id === id);
          if (mediaObj) {
            return {
              url: mediaObj.source_url || '',
              thumbnail: mediaObj.media_details?.sizes?.thumbnail?.source_url || mediaObj.source_url || '',
              alt: mediaObj.alt_text || mediaObj.title?.rendered || '',
              caption: mediaObj.caption?.rendered || ''
            };
          }
          return null;
        }).filter(img => img !== null);
        
        // Если нет фото из meta, но есть featured_media
        if (images.length === 0 && featuredMedia[0]) {
          images.push({
            url: featuredMedia[0].source_url || '',
            thumbnail: featuredMedia[0].media_details?.sizes?.thumbnail?.source_url || featuredMedia[0].source_url || '',
            alt: featuredMedia[0].alt_text || featuredMedia[0].title?.rendered || '',
            caption: featuredMedia[0].caption?.rendered || ''
          });
        }
        
        // Сохраняем данные экземпляра в стейт
        window.app.state.currentPageData.toyInstance = json;
        // Сохраняем изображения отдельно через set для dispatch события
        window.app.state.set('toyInstance.images', images);
        
        // Dispatch события о загрузке данных экземпляра
        const event = new CustomEvent('app-state-toy-instance-loaded', {
          detail: {
            toyInstance: json,
            images: images
          }
        });
        window.dispatchEvent(event);
      }
      
      // Обновляем заголовок модалки на индекс экземпляра
      if (json.title?.rendered || json.title) {
        this.setState({ title: json.title.rendered || json.title });
      }
      
      // Сбрасываем loading после загрузки данных
      this.setState({ loading: false });
      
      // Рендерим контент в body модалки (после установки loading: false)
      requestAnimationFrame(() => {
        this.renderInstanceContent(json);
        // Подключаем обработчик кнопки "Купить" после рендера
        this.setupBuyButton();
      });
    } catch (e) {
      this.setState({ error: e.message || 'Ошибка загрузки', loading: false });
      this.setBodyContent(`<p style="color: var(--color-error, #ef4444);">Ошибка: ${e.message}</p>`);
    }
  }

  renderInstanceContent(data) {
    const content = toy_instance_modal_template(data);
    
    // Разделяем content на body и footer
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${content}</div>`, 'text/html');
    const wrapper = doc.body.firstChild;
    const bodyContent = wrapper.querySelector('.toy-instance-modal_content');
    const footerContent = wrapper.querySelector('.toy-instance-modal_footer');
    
    // Устанавливаем контент body
    if (bodyContent) {
      this.setBodyContent(bodyContent.outerHTML);
    }
    
    // Добавляем footer в modal_container (после modal_body)
    if (footerContent) {
      const container = this.querySelector('.modal_container');
      if (container) {
        // Удаляем старый footer если есть
        const oldFooter = container.querySelector('.toy-instance-modal_footer');
        if (oldFooter) oldFooter.remove();
        // Добавляем новый footer после modal_body
        const body = container.querySelector('.modal_body');
        if (body && body.nextSibling) {
          container.insertBefore(footerContent.cloneNode(true), body.nextSibling);
        } else {
          container.appendChild(footerContent.cloneNode(true));
        }
      }
    }
  }

  setupBuyButton() {
    // Подключаем обработчик кнопки "Купить" после рендера
    setTimeout(() => {
      const buyBtn = this.querySelector('.toy-instance-modal_buy-btn');
      if (buyBtn) {
        // Удаляем старый обработчик если есть
        buyBtn.replaceWith(buyBtn.cloneNode(true));
        const newBuyBtn = this.querySelector('.toy-instance-modal_buy-btn');
        newBuyBtn.addEventListener('click', () => {
          // TODO: Раскомментировать когда будет готова функция добавления в корзину
          // const instanceId = newBuyBtn.getAttribute('data-instance-id');
          // if (window.app && window.app.cart && window.app.cart.add) {
          //   window.app.cart.add(instanceId);
          // }
        });
      }
    }, 100);
  }

  onStateChanged(key) {
    if (key === 'instanceId') this.loadInstanceData();
    super.onStateChanged?.(key);
  }
}

customElements.define('toy-instance-modal', ToyInstanceModal);

