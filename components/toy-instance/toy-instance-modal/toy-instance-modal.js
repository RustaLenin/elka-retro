import { BaseElement } from '../../base-element.js';
import { UIModal } from '../../ui-kit/modal/modal.js';
import { toy_instance_modal_template } from './toy-instance-modal-template.js';

// Загружаем стили - отложенно, так как window.app может быть ещё не создан при импорте
let toyInstanceModalStylesLoaded = false;
function loadToyInstanceModalStyles() {
  if (toyInstanceModalStylesLoaded) return;
  
  if (window.app?.toolkit?.loadCSSOnce) {
    try {
      window.app.toolkit.loadCSSOnce(new URL('./toy-instance-modal-styles.css', import.meta.url));
      toyInstanceModalStylesLoaded = true;
    } catch (err) {
      console.error('[toy-instance-modal] Failed to load CSS:', err);
    }
  }
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
  };

  constructor() {
    super();
    this._instanceData = null;
  }

  connectedCallback() {
    // Загружаем стили при подключении компонента к DOM (когда window.app уже точно существует)
    loadToyInstanceModalStyles();
    
    this.setState({ loading: true });
    super.connectedCallback();
    if (this.state.instanceId) {
      this.loadInstanceData();
    }
    // Подписываемся на обновления корзины для обновления кнопки
    this._boundHandleCartUpdated = this._handleCartUpdated.bind(this);
    window.addEventListener('elkaretro:cart:updated', this._boundHandleCartUpdated);
  }
  
  disconnectedCallback() {
    super.disconnectedCallback();
    // Отписываемся от событий
    if (this._boundHandleCartUpdated) {
      window.removeEventListener('elkaretro:cart:updated', this._boundHandleCartUpdated);
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
      this._instanceData = json;
      
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
        this._updateBuyButtonText();
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
      if (buyBtn && this._instanceData) {
        // Удаляем старый обработчик если есть
        buyBtn.replaceWith(buyBtn.cloneNode(true));
        const newBuyBtn = this.querySelector('.toy-instance-modal_buy-btn');
        
        newBuyBtn.addEventListener('click', () => {
          const instanceId = this._instanceData.id;
          const price = this._instanceData.cost ? parseFloat(this._instanceData.cost) : (this._instanceData.meta?.cost ? parseFloat(this._instanceData.meta.cost) : null);
          const status = this._instanceData.status || 'publish';
          
          // Проверяем доступность товара
          if (status !== 'publish' || !instanceId || !price || price <= 0) {
            if (window.app?.ui?.showNotification) {
              window.app.ui.showNotification('Товар недоступен для добавления в корзину', 'error');
            }
            return;
          }
          
          // Проверяем, находится ли товар уже в корзине
          if (window.app?.cart) {
            const items = window.app.cart.getItems();
            const isInCart = items.some(item => Number(item.id) === Number(instanceId) && item.type === 'toy_instance');
            
            if (isInCart) {
              // Удаляем из корзины
              window.dispatchEvent(
                new CustomEvent('elkaretro:cart:remove-item', {
                  detail: { itemId: instanceId, itemType: 'toy_instance' },
                })
              );
            } else {
              // Добавляем в корзину
              window.dispatchEvent(
                new CustomEvent('elkaretro:cart:add-item', {
                  detail: { itemId: instanceId, itemType: 'toy_instance', price: price },
                })
              );
            }
          }
        });
      }
    }, 100);
  }

  /**
   * Обработчик обновления корзины - обновляет текст кнопки
   */
  _handleCartUpdated() {
    if (this._instanceData) {
      this._updateBuyButtonText();
    }
  }
  
  /**
   * Обновить текст кнопки "Купить" в зависимости от состояния корзины
   */
  _updateBuyButtonText() {
    if (!this._instanceData || !window.app?.cart) {
      return;
    }
    
    const instanceId = this._instanceData.id;
    const items = window.app.cart.getItems();
    const isInCart = items.some(item => Number(item.id) === Number(instanceId) && item.type === 'toy_instance');
    
    const buyBtn = this.querySelector('.toy-instance-modal_buy-btn');
    if (buyBtn) {
      buyBtn.textContent = isInCart ? 'Убрать из корзины' : 'Добавить в корзину';
    }
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

