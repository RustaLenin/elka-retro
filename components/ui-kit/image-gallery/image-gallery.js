import { BaseElement } from '../../base-element.js';
import { image_gallery_template } from './image-gallery-template.js';

/**
 * Image Gallery Component
 * Галерея изображений с миниатюрами и переключением
 * 
 * Использование:
 * 1. Через глобальный стейт (приоритет 1):
 *    <ui-image-gallery state-path="toyInstance.images"></ui-image-gallery>
 *    <ui-image-gallery state-path="toyType.images"></ui-image-gallery>
 * 
 * 2. Через атрибут images (JSON) (приоритет 2):
 *    <ui-image-gallery images='[{"url": "...", "alt": "..."}, ...]'></ui-image-gallery>
 * 
 * 3. Через метод setImages():
 *    const gallery = document.querySelector('ui-image-gallery');
 *    gallery.setImages([{url: '...', alt: '...'}, ...]);
 * 
 * 4. Через image-ids (JSON массив ID WordPress медиа):
 *    <ui-image-gallery image-ids='[123, 456, 789]'></ui-image-gallery>
 * 
 * Каскадирование: стейт → атрибуты → empty state
 */
export class ImageGallery extends BaseElement {
  static stateSchema = {
    statePath: {
      type: 'string',
      default: '',
      attribute: { name: 'state-path', observed: true, reflect: false },
      internal: false
    },
    images: { 
      type: 'json', 
      default: [], 
      attribute: { name: 'images', observed: true, reflect: false },
      internal: false
    },
    imageIds: {
      type: 'json',
      default: [],
      attribute: { name: 'image-ids', observed: true, reflect: false },
      internal: false
    },
    currentIndex: { 
      type: 'number', 
      default: 0, 
      attribute: null, 
      internal: true 
    },
    loading: {
      type: 'boolean',
      default: false,
      attribute: null,
      internal: true
    }
  };

  constructor() {
    super();
    this._handleThumbnailClick = this._handleThumbnailClick.bind(this);
    this._handlePrevClick = this._handlePrevClick.bind(this);
    this._handleNextClick = this._handleNextClick.bind(this);
    this._handleKeyDown = this._handleKeyDown.bind(this);
  }

  connectedCallback() {
    window.app.toolkit.loadCSSOnce(new URL('./image-gallery-styles.css', import.meta.url));
    super.connectedCallback();
    
    // Каскадирование: сначала пробуем получить из стейта, потом из атрибутов
    this.loadImagesFromSources();
    
    this.render();
    this.setupEventListeners();
    
    // Подписываемся на изменения глобального стейта если используется state-path
    if (this.state.statePath) {
      this._setupStateListener();
    }
  }
  
  loadImagesFromSources() {
    // Приоритет 1: Глобальный стейт
    if (this.state.statePath && window.app && window.app.state) {
      const stateImages = window.app.state.get(this.state.statePath);
      if (stateImages && Array.isArray(stateImages) && stateImages.length > 0) {
        this.setState({ images: stateImages, currentIndex: 0 });
        return;
      }
    }
    
    // Приоритет 2: Атрибут images
    if (this.state.images && Array.isArray(this.state.images) && this.state.images.length > 0) {
      return; // Уже установлено
    }
    
    // Приоритет 3: Загрузка по image-ids
    if (this.state.imageIds && Array.isArray(this.state.imageIds) && this.state.imageIds.length > 0) {
      this.loadImagesByIds(this.state.imageIds);
      return;
    }
    
    // Если ничего не найдено - будет показан empty state
  }
  
  _setupStateListener() {
    // Слушаем общее событие изменения стейта
    this._handleStateChanged = (e) => {
      const { path, fullPath } = e.detail;
      
      // Если путь соответствует нашему state-path, обновляем изображения
      if (this.state.statePath) {
        // Проверяем точное совпадение пути или что изменение затрагивает наш путь
        if (path === this.state.statePath || 
            (fullPath && fullPath.startsWith(this.state.statePath.split('.')[0]))) {
          const stateImages = window.app.state.get(this.state.statePath);
          if (stateImages && Array.isArray(stateImages) && stateImages.length > 0) {
            // Проверяем, изменились ли данные
            const currentImagesStr = JSON.stringify(this.state.images);
            const newImagesStr = JSON.stringify(stateImages);
            if (currentImagesStr !== newImagesStr) {
              this.setState({ images: stateImages, currentIndex: 0 });
              this.render();
            }
          }
        }
      }
    };
    
    window.addEventListener('app-state-changed', this._handleStateChanged);
    
    // Также слушаем специфичные события загрузки данных
    if (this.state.statePath.startsWith('toyInstance')) {
      this._handleInstanceLoaded = (e) => {
        const { images } = e.detail;
        if (images && Array.isArray(images) && images.length > 0) {
          this.setState({ images, currentIndex: 0 });
          this.render();
        }
      };
      window.addEventListener('app-state-toy-instance-loaded', this._handleInstanceLoaded);
    }
    
    if (this.state.statePath.startsWith('toyType')) {
      this._handleTypeLoaded = (e) => {
        const { images } = e.detail;
        if (images && Array.isArray(images) && images.length > 0) {
          this.setState({ images, currentIndex: 0 });
          this.render();
        }
      };
      window.addEventListener('app-state-toy-type-loaded', this._handleTypeLoaded);
    }
  }
  
  disconnectedCallback() {
    document.removeEventListener('keydown', this._handleKeyDown);
    
    // Удаляем слушатели событий стейта
    if (this._handleStateChanged) {
      window.removeEventListener('app-state-changed', this._handleStateChanged);
    }
    if (this._handleInstanceLoaded) {
      window.removeEventListener('app-state-toy-instance-loaded', this._handleInstanceLoaded);
    }
    if (this._handleTypeLoaded) {
      window.removeEventListener('app-state-toy-type-loaded', this._handleTypeLoaded);
    }
  }

  setupEventListeners() {
    // Навигация стрелками
    document.removeEventListener('keydown', this._handleKeyDown);
    document.addEventListener('keydown', this._handleKeyDown);
    
    // Клики по миниатюрам
    const thumbnails = this.querySelectorAll('.image-gallery_thumbnail');
    thumbnails.forEach((thumb, index) => {
      thumb.removeEventListener('click', this._handleThumbnailClick);
      thumb.addEventListener('click', () => this._handleThumbnailClick(index));
    });
    
    // Кнопки навигации
    const prevBtn = this.querySelector('.image-gallery_prev');
    const nextBtn = this.querySelector('.image-gallery_next');
    
    if (prevBtn) {
      prevBtn.removeEventListener('click', this._handlePrevClick);
      prevBtn.addEventListener('click', this._handlePrevClick);
    }
    
    if (nextBtn) {
      nextBtn.removeEventListener('click', this._handleNextClick);
      nextBtn.addEventListener('click', this._handleNextClick);
    }
  }

  async loadImagesByIds(ids) {
    if (!ids || !Array.isArray(ids) || ids.length === 0) return;
    
    this.setState({ loading: true });
    
    try {
      // Загружаем изображения через WordPress Media API
      const images = await Promise.all(
        ids.map(async (id) => {
          try {
            const res = await fetch(`/wp-json/wp/v2/media/${id}`, { credentials: 'same-origin' });
            if (!res.ok) return null;
            const media = await res.json();
            return {
              url: media.source_url || '',
              thumbnail: media.media_details?.sizes?.thumbnail?.source_url || media.source_url || '',
              alt: media.alt_text || media.title?.rendered || '',
              caption: media.caption?.rendered || ''
            };
          } catch (e) {
            console.error(`[ImageGallery] Failed to load media ${id}:`, e);
            return null;
          }
        })
      );
      
      // Фильтруем null значения
      const validImages = images.filter(img => img !== null);
      this.setState({ images: validImages, loading: false, currentIndex: 0 });
      this.render();
    } catch (e) {
      console.error('[ImageGallery] Failed to load images:', e);
      this.setState({ loading: false });
    }
  }

  setImages(images) {
    // Устанавливаем изображения программно
    if (!Array.isArray(images)) {
      console.warn('[ImageGallery] setImages expects an array');
      return;
    }
    
    // Нормализуем формат изображений
    const normalizedImages = images.map(img => {
      if (typeof img === 'string') {
        // Если строка - это URL
        return { url: img, alt: '', thumbnail: img };
      } else if (img && typeof img === 'object') {
        // Объект с url, alt и т.д.
        return {
          url: img.url || img.source_url || '',
          thumbnail: img.thumbnail || img.media_details?.sizes?.thumbnail?.source_url || img.url || img.source_url || '',
          alt: img.alt || img.alt_text || '',
          caption: img.caption || ''
        };
      }
      return null;
    }).filter(img => img !== null && img.url);
    
    this.setState({ images: normalizedImages, currentIndex: 0 });
    this.render();
  }

  _handleThumbnailClick(index) {
    if (index >= 0 && index < this.state.images.length) {
      this.setState({ currentIndex: index });
      this.render();
    }
  }

  _handlePrevClick(e) {
    e.stopPropagation();
    const { currentIndex, images } = this.state;
    const newIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
    this.setState({ currentIndex: newIndex });
    this.render();
  }

  _handleNextClick(e) {
    e.stopPropagation();
    const { currentIndex, images } = this.state;
    const newIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
    this.setState({ currentIndex: newIndex });
    this.render();
  }

  _handleKeyDown(e) {
    // Навигация стрелками только если компонент виден и в фокусе
    if (!this.isConnected || !document.contains(this)) return;
    
    if (e.key === 'ArrowLeft') {
      this._handlePrevClick(e);
    } else if (e.key === 'ArrowRight') {
      this._handleNextClick(e);
    }
  }

  onStateChanged(key) {
    if (key === 'statePath') {
      // Перезагружаем изображения из нового источника
      this.loadImagesFromSources();
      this.render();
    } else if (key === 'images' || key === 'currentIndex') {
      this.render();
    } else if (key === 'imageIds' && this.state.imageIds.length > 0 && this.state.images.length === 0) {
      // Загружаем по ID только если нет изображений из других источников
      this.loadImagesByIds(this.state.imageIds);
    }
  }

  render() {
    this.innerHTML = image_gallery_template(this.state);
    this.setupEventListeners();
  }
}

customElements.define('ui-image-gallery', ImageGallery);

