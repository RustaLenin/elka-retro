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
    this.setState({ loading: true });
    // Стили уже загружены при импорте модуля
    // window.app.toolkit.loadCSSOnce(new URL('./toy-instance-modal-styles.css', import.meta.url));
    super.connectedCallback();
    if (this.state.instanceId) {
      this.loadInstanceData();
    }
  }

  render() {
    super.render();
    const overlay = this._getOverlayElement();
    if (overlay) {
      overlay.classList.add('toy-instance-modal_overlay');
    }
    const container = this._getContainerElement();
    if (container) {
      container.classList.add('toy-instance-modal_container');
    }
  }

  async loadInstanceData() {
    const { instanceId } = this.state;
    if (!instanceId) return;
    
    this.setState({ loading: true, error: null });
    try {
      // TODO: cache loaded instance data locally to avoid refetching on subsequent openings
      const res = await fetch(`/wp-json/wp/v2/toy_instance/${instanceId}?_embed=1`, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      this.setState({ data: json });
      
      if (window.app && window.app.state) {
        const photosRaw = json.photos_of_the_toy_instance || json.meta?.photos_of_the_toy_instance || [];
        const featuredMediaArray = json._embedded?.['wp:featuredmedia'] || [];
        const attachments = json._embedded?.['wp:attachment'] || [];

        const seen = new Set();
        const images = [];
        const mediaCache = new Map();
        const pendingPromises = [];

        const pushMedia = (media) => {
          if (!media) return;
          const id = media.id || media.ID || media.media_details?.id || null;
          if (id && seen.has(Number(id))) return;
          if (id) seen.add(Number(id));
          const url = media.source_url || media.guid?.rendered || '';
          if (!url) return;
          images.push({
            id: id ? Number(id) : null,
            url,
            thumbnail: media.media_details?.sizes?.thumbnail?.source_url || url,
            alt: media.alt_text || media.title?.rendered || media.post_title || '',
            caption: media.caption?.rendered || media.post_excerpt || ''
          });
        };

        const getMediaById = (id) => {
          if (!id) return Promise.resolve(null);
          if (mediaCache.has(id)) return Promise.resolve(mediaCache.get(id));
          const mediaObj = attachments.find(m => {
            const mediaId = m.id || m.media_details?.id || parseInt(m.ID || 0, 10);
            return mediaId === id;
          });
          if (mediaObj) {
            mediaCache.set(id, mediaObj);
            return Promise.resolve(mediaObj);
          }
          return fetch(`/wp-json/wp/v2/media/${id}`, { credentials: 'same-origin' })
            .then(resp => (resp.ok ? resp.json() : null))
            .then(mediaData => {
              if (mediaData) mediaCache.set(id, mediaData);
              return mediaData;
            })
            .catch(err => {
              console.warn('[ToyInstanceModal] Failed to load media', id, err);
              return null;
            });
        };

        const featuredMedia = featuredMediaArray[0];
        if (featuredMedia) {
          pushMedia(featuredMedia);
        }

        photosRaw.forEach(photo => {
          const rawId = photo?.ID || photo?.id || photo;
          const id = parseInt(rawId, 10);
          if (!id || seen.has(id)) return;
          const promise = getMediaById(id).then(media => {
            if (media) {
              pushMedia(media);
            } else {
              seen.add(id);
              const fallbackUrl = photo?.guid?.rendered || photo?.guid || '';
              if (fallbackUrl) {
                images.push({ id, url: fallbackUrl, thumbnail: fallbackUrl, alt: photo?.post_title || '', caption: photo?.post_excerpt || '' });
              }
            }
          });
          pendingPromises.push(promise);
        });

        await Promise.all(pendingPromises);

        if (!images.length && featuredMedia) {
          pushMedia(featuredMedia);
        }
        
        window.app.state.currentPageData.toyInstance = json;
        window.app.state.set('toyInstance.images', images);
        
        const event = new CustomEvent('app-state-toy-instance-loaded', {
          detail: {
            toyInstance: json,
            images
          }
        });
        window.dispatchEvent(event);
      }
      
      if (json.title?.rendered || json.title) {
        this.setState({ title: json.title.rendered || json.title });
      }
      
      this.setState({ loading: false });
      requestAnimationFrame(() => {
        this.renderInstanceContent(json);
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
      const container = this._getContainerElement();
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

  hide() {
    if (!this.state.visible) return;
    super.hide();
    setTimeout(() => {
      // Удаляем компонент после закрытия, чтобы не копились экземпляры
      if (!this.isConnected) return;
      this.remove();
    }, 350);
  }

  _onCloseClick() {
    if (!this.state.closable) return;
    this.hide();
  }

  _onOverlayClick(e) {
    if (e.target === e.currentTarget && this.state.closable) {
      this.hide();
    }
  }
}

customElements.define('toy-instance-modal', ToyInstanceModal);

