import { image_gallery_template } from './image-gallery-template.js';

// Загружаем стили на верхнем уровне модуля (не в connectedCallback)
if (window.app && window.app.toolkit && window.app.toolkit.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./image-gallery-styles.css', import.meta.url));
}

let imageGalleryOverlayArea = null;
let imageGalleryOverlayIdCounter = 0;

function ensureImageGalleryOverlayArea() {
  if (!imageGalleryOverlayArea || !imageGalleryOverlayArea.isConnected) {
    imageGalleryOverlayArea = document.querySelector('.ImageGalleryOverlayArea');
    if (!imageGalleryOverlayArea) {
      imageGalleryOverlayArea = document.createElement('div');
      imageGalleryOverlayArea.className = 'ImageGalleryOverlayArea';
      document.body.appendChild(imageGalleryOverlayArea);
    }
  }
  return imageGalleryOverlayArea;
}

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
export class ImageGallery extends HTMLElement {
  static get observedAttributes() {
    return ['state-path', 'images', 'image-ids'];
  }

  constructor() {
    super();
    
    // Внутреннее состояние (не используем BaseElement)
    this._data = {
      statePath: '',
      images: [],
      imageIds: [],
      currentIndex: 0,
      loading: false,
      fullscreen: false
    };
    
    // Флаг для предотвращения конфликтов при переключении изображений
    this._isChangingImage = false;
    
    // Кеш предзагруженных изображений
    this._preloadedImages = [];
    
    // Уникальный идентификатор и ссылка на overlay (используется при переносе в конец DOM)
    this._overlayId = `image-gallery-overlay-${++imageGalleryOverlayIdCounter}`;
    this._overlayElement = null;
    
    // Привязка методов
    this._handleThumbnailClick = this._handleThumbnailClick.bind(this);
    this._handlePrevClick = this._handlePrevClick.bind(this);
    this._handleNextClick = this._handleNextClick.bind(this);
    this._handleKeyDown = this._handleKeyDown.bind(this);
    this._handleMainImageClick = this._handleMainImageClick.bind(this);
    this._handleFullscreenClose = this._handleFullscreenClose.bind(this);
    this._handleFullscreenOverlayClick = this._handleFullscreenOverlayClick.bind(this);
    this._handleEscapeKey = this._handleEscapeKey.bind(this);
    this._handleStateChanged = this._handleStateChanged.bind(this);
    this._handleInstanceLoaded = this._handleInstanceLoaded.bind(this);
    this._handleTypeLoaded = this._handleTypeLoaded.bind(this);
  }

  // Утилита для парсинга JSON атрибутов
  _parseJSONAttribute(value) {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  // Утилита для получения значения из глобального стейта
  _getStateValue(path) {
    if (!path || !window.app || !window.app.state) return null;
    return window.app.state.get(path);
  }

  _removeOverlayFromBody() {
    if (this._overlayElement && this._overlayElement.parentNode) {
      this._overlayElement.remove();
    }
    this._overlayElement = null;
  }

  _mountOverlayToBody() {
    if (!this._data.fullscreen) {
      this._removeOverlayFromBody();
      return;
    }
    
    // Удаляем предыдущий overlay (если он ещё присутствует в области)
    if (this._overlayElement && this._overlayElement.isConnected) {
      this._overlayElement.remove();
      this._overlayElement = null;
    }
    
    const overlayInComponent = this.querySelector('.image-gallery_fullscreen-overlay');
    if (!overlayInComponent) {
      return;
    }
    
    overlayInComponent.dataset.galleryOverlayId = this._overlayId;
    const host = ensureImageGalleryOverlayArea();
    host.appendChild(overlayInComponent);
    this._overlayElement = overlayInComponent;
  }

  _getOverlayElement() {
    if (this._overlayElement && this._overlayElement.isConnected) {
      return this._overlayElement;
    }
    
    const host = imageGalleryOverlayArea && imageGalleryOverlayArea.isConnected
      ? imageGalleryOverlayArea
      : document.querySelector('.ImageGalleryOverlayArea');
    
    if (host) {
      const overlay = host.querySelector(`.image-gallery_fullscreen-overlay[data-gallery-overlay-id="${this._overlayId}"]`);
      if (overlay) {
        this._overlayElement = overlay;
        return overlay;
      }
    }
    
    const inlineOverlay = this.querySelector('.image-gallery_fullscreen-overlay');
    if (inlineOverlay) {
      this._overlayElement = inlineOverlay;
      return inlineOverlay;
    }
    
    return null;
  }

  _queryOverlay(selector) {
    const overlay = this._getOverlayElement();
    return overlay ? overlay.querySelector(selector) : null;
  }

  _queryAllOverlay(selector) {
    const overlay = this._getOverlayElement();
    return overlay ? overlay.querySelectorAll(selector) : [];
  }

  connectedCallback() {
    // Загружаем изображения из различных источников
    this._loadImagesFromSources();
    
    // Рендерим компонент
    this._render();
    
    // Подписываемся на изменения глобального стейта если используется state-path
    if (this._data.statePath) {
      this._setupStateListener();
    }
  }

  disconnectedCallback() {
    // Восстанавливаем скролл страницы при размонтировании
    if (this._data.fullscreen) {
      document.body.style.overflow = '';
    }
    this._removeOverlayFromBody();
    
    // Удаляем слушатели событий стейта
    window.removeEventListener('app-state-changed', this._handleStateChanged);
    window.removeEventListener('app-state-toy-instance-loaded', this._handleInstanceLoaded);
    window.removeEventListener('app-state-toy-type-loaded', this._handleTypeLoaded);
    
    // Удаляем слушатели клавиатуры
    document.removeEventListener('keydown', this._handleKeyDown);
    document.removeEventListener('keydown', this._handleEscapeKey);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    
    switch (name) {
      case 'state-path':
        this._data.statePath = newValue || '';
        if (this.isConnected) {
          this._loadImagesFromSources();
          this._render();
        }
        break;
      case 'images':
        const images = this._parseJSONAttribute(newValue);
        this._data.images = Array.isArray(images) ? images : [];
        if (this.isConnected) {
          this._data.currentIndex = 0;
          this._render();
        }
        break;
      case 'image-ids':
        const ids = this._parseJSONAttribute(newValue);
        this._data.imageIds = Array.isArray(ids) ? ids : [];
        if (this.isConnected && this._data.imageIds.length > 0 && this._data.images.length === 0) {
          this._loadImagesByIds(this._data.imageIds);
        }
        break;
    }
  }

  // Загрузка изображений из различных источников (каскадирование)
  _loadImagesFromSources() {
    // Приоритет 1: Глобальный стейт
    if (this._data.statePath) {
      const stateImages = this._getStateValue(this._data.statePath);
      if (Array.isArray(stateImages) && stateImages.length > 0) {
        this._data.images = stateImages;
        this._data.currentIndex = 0;
        return;
      }
    }
    
    // Приоритет 2: Атрибут images
    const imagesAttr = this.getAttribute('images');
    if (imagesAttr) {
      const images = this._parseJSONAttribute(imagesAttr);
      if (Array.isArray(images) && images.length > 0) {
        this._data.images = images;
        this._data.currentIndex = 0;
        return;
      }
    }
    
    // Приоритет 3: image-ids (загружаются асинхронно)
    const imageIdsAttr = this.getAttribute('image-ids');
    if (imageIdsAttr) {
      const ids = this._parseJSONAttribute(imageIdsAttr);
      if (Array.isArray(ids) && ids.length > 0) {
        this._data.imageIds = ids;
        if (this._data.images.length === 0) {
          this._loadImagesByIds(ids);
        }
      }
    }
  }

  // Настройка слушателей глобального стейта
  _setupStateListener() {
    window.removeEventListener('app-state-changed', this._handleStateChanged);
    window.removeEventListener('app-state-toy-instance-loaded', this._handleInstanceLoaded);
    window.removeEventListener('app-state-toy-type-loaded', this._handleTypeLoaded);
    
    window.addEventListener('app-state-changed', this._handleStateChanged);
    window.addEventListener('app-state-toy-instance-loaded', this._handleInstanceLoaded);
    window.addEventListener('app-state-toy-type-loaded', this._handleTypeLoaded);
  }

  _handleStateChanged(e) {
    if (!this._data.statePath) return;
    
    const { path } = e.detail || {};
    if (path && path.startsWith(this._data.statePath)) {
      const stateImages = this._getStateValue(this._data.statePath);
      if (Array.isArray(stateImages) && stateImages.length > 0) {
        // Сохраняем текущий индекс, если он валидный
        const oldIndex = this._data.currentIndex;
        this._data.images = stateImages;
        // Если старый индекс валиден для новых изображений, сохраняем его
        if (oldIndex >= 0 && oldIndex < stateImages.length) {
          this._data.currentIndex = oldIndex;
        } else {
          this._data.currentIndex = 0;
        }
        this._render();
      }
    }
  }

  _handleInstanceLoaded(e) {
    if (!this._data.statePath || !this._data.statePath.startsWith('toyInstance')) return;
    
    const { images } = e.detail || {};
    if (Array.isArray(images) && images.length > 0) {
      this._data.images = images;
      this._data.currentIndex = 0;
      this._render();
    }
  }

  _handleTypeLoaded(e) {
    if (!this._data.statePath || !this._data.statePath.startsWith('toyType')) return;
    
    const { images, all_images } = e.detail || {};
    const newImages = images || all_images;
    if (Array.isArray(newImages) && newImages.length > 0) {
      this._data.images = newImages;
      this._data.currentIndex = 0;
      this._render();
    }
  }

  async _loadImagesByIds(ids) {
    if (!ids || !Array.isArray(ids) || ids.length === 0) return;
    
    this._data.loading = true;
    this._updateLoadingState();
    
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
      // Сохраняем текущий индекс, если он валидный
      const oldIndex = this._data.currentIndex;
      this._data.images = validImages;
      this._data.loading = false;
      // Если старый индекс валиден для новых изображений, сохраняем его
      if (oldIndex >= 0 && oldIndex < validImages.length) {
        this._data.currentIndex = oldIndex;
      } else {
        this._data.currentIndex = 0;
      }
      this._render();
    } catch (e) {
      console.error('[ImageGallery] Failed to load images:', e);
      this._data.loading = false;
      this._updateLoadingState();
    }
  }

  // Публичный метод для установки изображений программно
  setImages(images) {
    if (!Array.isArray(images)) {
      console.warn('[ImageGallery] setImages expects an array');
      return;
    }
    
    // Нормализуем формат изображений
    const normalizedImages = images.map(img => {
      if (typeof img === 'string') {
        return { url: img, alt: '', thumbnail: img };
      } else if (img && typeof img === 'object') {
        return {
          url: img.url || img.source_url || '',
          thumbnail: img.thumbnail || img.media_details?.sizes?.thumbnail?.source_url || img.url || img.source_url || '',
          alt: img.alt || img.alt_text || '',
          caption: img.caption || ''
        };
      }
      return null;
    }).filter(img => img !== null && img.url);
    
    // Сохраняем текущий индекс, если он валидный
    const oldIndex = this._data.currentIndex;
    this._data.images = normalizedImages;
    // Если старый индекс валиден для новых изображений, сохраняем его
    if (oldIndex >= 0 && oldIndex < normalizedImages.length) {
      this._data.currentIndex = oldIndex;
    } else {
      this._data.currentIndex = 0;
    }
    this._render();
  }

  // Обновление состояния загрузки (без полного рендера)
  _updateLoadingState() {
    const loader = this.querySelector('.image-gallery_loader');
    if (loader) {
      loader.style.display = this._data.loading ? 'block' : 'none';
    }
  }

  // Обработчики событий пользователя
  _handleThumbnailClick(index) {
    if (index >= 0 && index < this._data.images.length) {
      this._changeImageWithFade(index);
    }
  }

  _handlePrevClick(e) {
    if (e) e.stopPropagation();
    const { currentIndex, images } = this._data;
    const newIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
    this._changeImageWithFade(newIndex);
  }

  _handleNextClick(e) {
    if (e) e.stopPropagation();
    const { currentIndex, images } = this._data;
    const newIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
    this._changeImageWithFade(newIndex);
  }

  _handleKeyDown(e) {
    if (!this._data.fullscreen) return;
    
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this._handlePrevClick(e);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      this._handleNextClick(e);
    }
  }

  _handleMainImageClick(e) {
    // Игнорируем клики на кнопки навигации
    if (e.target.closest('.image-gallery_nav')) {
      return;
    }
    
    // Открываем полноэкранный режим только если не в полноэкранном режиме
    if (!this._data.fullscreen && this._data.images && this._data.images.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      this._data.fullscreen = true;
      // Рендерим компонент, чтобы создать overlay в шаблоне
      this._render();
      // Блокируем скролл страницы
      document.body.style.overflow = 'hidden';
    }
  }

  _handleFullscreenClose(e) {
    if (e) e.stopPropagation();
    if (this._data.fullscreen) {
      this._data.fullscreen = false;
      // Рендерим компонент, чтобы скрыть overlay в шаблоне
      this._render();
      // Разблокируем скролл страницы
      document.body.style.overflow = '';
    }
  }

  _handleFullscreenOverlayClick(e) {
    // Закрываем при клике на overlay (но не на само изображение или кнопки)
    const target = e.target;
    if (target.classList.contains('image-gallery_fullscreen-overlay')) {
      this._handleFullscreenClose(e);
    }
  }

  _handleEscapeKey(e) {
    if (e.key === 'Escape' && this._data.fullscreen) {
      this._handleFullscreenClose(e);
    }
  }

  // Переключение изображения с fade-эффектом (простое решение с предзагрузкой)
  _changeImageWithFade(newIndex) {
    // Если уже идет переключение, игнорируем новый запрос
    if (this._isChangingImage) {
      return;
    }
    
    // Если индекс не изменился, ничего не делаем
    if (newIndex === this._data.currentIndex) {
      return;
    }
    
    // Устанавливаем флаг переключения
    this._isChangingImage = true;
    
    // Обновляем индекс сразу
    this._data.currentIndex = newIndex;
    
    // Обновляем миниатюры сразу (синхронизация)
    this._updateThumbnails(newIndex);
    
    // Обновляем подпись сразу
    const newImage = this._data.images[newIndex];
    if (newImage) {
      this._updateCaption(newImage);
    }
    
    // Обновляем изображения в обоих режимах (обычном и полноэкранном)
    const promises = [];
    
    // Обычный режим
    const normalPromise = this._updateImageInMode(false, newIndex);
    if (normalPromise) promises.push(normalPromise);
    
    // Полноэкранный режим (если открыт)
    if (this._data.fullscreen) {
      const fullscreenPromise = this._updateImageInMode(true, newIndex);
      if (fullscreenPromise) promises.push(fullscreenPromise);
    }
    
    // Сбрасываем флаг после завершения всех анимаций
    if (promises.length > 0) {
      Promise.all(promises).then(() => {
        // Финальное обновление миниатюр после завершения всех анимаций
        this._updateThumbnails(newIndex);
        this._isChangingImage = false;
      }).catch(() => {
        // Финальное обновление миниатюр даже при ошибке
        this._updateThumbnails(newIndex);
        this._isChangingImage = false;
      });
    } else {
      // Финальное обновление миниатюр если анимаций не было
      this._updateThumbnails(newIndex);
      this._isChangingImage = false;
    }
  }

  // Обновление изображения в конкретном режиме (обычном или полноэкранном)
  // Возвращает Promise, который резолвится после завершения анимации
  _updateImageInMode(isFullscreen, newIndex) {
    // В полноэкранном режиме используется класс .image-gallery_fullscreen-image.image-gallery_main-image--current
    // В обычном режиме используется класс .image-gallery_main-image--current
    const currentImg = isFullscreen 
      ? this._queryOverlay('.image-gallery_fullscreen-image.image-gallery_main-image--current')
      : this.querySelector('.image-gallery_main-image--current');
    
    if (!currentImg || !this._data.images || !this._data.images[newIndex]) {
      return Promise.resolve();
    }
    
    const newImage = this._data.images[newIndex];
    const newUrl = newImage.url || '';
    
    // Получаем предзагруженное изображение из кеша
    const preloadedImg = this._preloadedImages?.[newIndex];
    
    return new Promise((resolve) => {
      // Fade-out текущего изображения
      currentImg.style.opacity = '0';
      
      // После завершения fade-out меняем src (изображение уже в кеше браузера)
      const handleFadeOut = (e) => {
        // Проверяем, что это событие от текущего изображения
        if (e.target !== currentImg || e.propertyName !== 'opacity') {
          return;
        }
        
        // Удаляем обработчик
        currentImg.removeEventListener('transitionend', handleFadeOut);
        
        // Меняем src (изображение уже загружено в кеше)
        currentImg.src = newUrl;
        currentImg.alt = newImage.alt || '';
        
        // Fade-in нового изображения
        requestAnimationFrame(() => {
          currentImg.style.opacity = '1';
          
          // После fade-in резолвим Promise
          const handleFadeIn = (e) => {
            if (e.target !== currentImg || e.propertyName !== 'opacity') {
              return;
            }
            currentImg.removeEventListener('transitionend', handleFadeIn);
            resolve();
          };
          
          currentImg.addEventListener('transitionend', handleFadeIn, { once: true });
        });
      };
      
      // Если изображение уже предзагружено, сразу делаем fade
      if (preloadedImg && preloadedImg.complete) {
        currentImg.addEventListener('transitionend', handleFadeOut, { once: true });
      } else {
        // Если не предзагружено, ждем загрузки (но это редкость)
        const tempImg = new Image();
        tempImg.onload = () => {
          currentImg.addEventListener('transitionend', handleFadeOut, { once: true });
        };
        tempImg.onerror = () => {
          // Загружаем даже при ошибке
          currentImg.addEventListener('transitionend', handleFadeOut, { once: true });
        };
        tempImg.src = newUrl;
      }
    });
  }

  // Обновление миниатюр (без полного рендера)
  _updateThumbnails(newIndex) {
    // Обновляем обычные миниатюры
    const normalThumbnails = this.querySelectorAll('.image-gallery_thumbnail');
    normalThumbnails.forEach((thumb, index) => {
      if (index === newIndex) {
        thumb.classList.add('image-gallery_thumbnail--active');
      } else {
        thumb.classList.remove('image-gallery_thumbnail--active');
      }
    });
    
    // Обновляем полноэкранные миниатюры (даже если overlay скрыт, элементы в DOM)
    const fullscreenThumbnails = this._queryAllOverlay('.image-gallery_fullscreen-thumbnail');
    if (fullscreenThumbnails.length > 0) {
      fullscreenThumbnails.forEach((thumb, index) => {
        if (index === newIndex) {
          thumb.classList.add('image-gallery_fullscreen-thumbnail--active');
        } else {
          thumb.classList.remove('image-gallery_fullscreen-thumbnail--active');
        }
      });
    }
  }

  // Обновление подписи (без полного рендера)
  _updateCaption(image) {
    const caption = this.querySelector('.image-gallery_caption');
    if (caption) {
      if (image && image.caption) {
        caption.innerHTML = image.caption;
        caption.style.display = '';
      } else {
        caption.innerHTML = '';
        caption.style.display = 'none';
      }
    }
  }

  // Настройка обработчиков событий
  _setupEventListeners() {
    // Навигация стрелками
    document.removeEventListener('keydown', this._handleKeyDown);
    document.addEventListener('keydown', this._handleKeyDown);
    
    // Escape для закрытия полноэкранного режима
    document.removeEventListener('keydown', this._handleEscapeKey);
    document.addEventListener('keydown', this._handleEscapeKey);
    
    // Клик на основное изображение для открытия полноэкранного режима
    const mainImage = this.querySelector('.image-gallery_main-image--current');
    if (mainImage) {
      mainImage.removeEventListener('click', this._handleMainImageClick);
      mainImage.style.cursor = 'pointer';
      mainImage.addEventListener('click', this._handleMainImageClick);
    }
    
    // Клики по миниатюрам
    const thumbnails = this.querySelectorAll('.image-gallery_thumbnail');
    thumbnails.forEach((thumb, index) => {
      thumb.removeEventListener('click', this._handleThumbnailClick);
      thumb.addEventListener('click', () => this._handleThumbnailClick(index));
    });
    
    // Кнопки навигации (обычные)
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
    
    // Кнопки навигации (полноэкранные)
    const fullscreenPrevBtn = this._queryOverlay('.image-gallery_fullscreen-prev');
    const fullscreenNextBtn = this._queryOverlay('.image-gallery_fullscreen-next');
    
    if (fullscreenPrevBtn) {
      fullscreenPrevBtn.removeEventListener('click', this._handlePrevClick);
      fullscreenPrevBtn.addEventListener('click', this._handlePrevClick);
    }
    
    if (fullscreenNextBtn) {
      fullscreenNextBtn.removeEventListener('click', this._handleNextClick);
      fullscreenNextBtn.addEventListener('click', this._handleNextClick);
    }
    
    // Кнопка закрытия полноэкранного режима
    const closeBtn = this._queryOverlay('.image-gallery_fullscreen-close');
    if (closeBtn) {
      closeBtn.removeEventListener('click', this._handleFullscreenClose);
      closeBtn.addEventListener('click', this._handleFullscreenClose);
    }
    
    // Клик на overlay для закрытия
    const overlay = this._getOverlayElement();
    if (overlay) {
      overlay.removeEventListener('click', this._handleFullscreenOverlayClick);
      overlay.addEventListener('click', this._handleFullscreenOverlayClick);
    }
    
    // Клики по миниатюрам в полноэкранном режиме
    const fullscreenThumbnails = this._queryAllOverlay('.image-gallery_fullscreen-thumbnail');
    fullscreenThumbnails.forEach((thumb, index) => {
      thumb.removeEventListener('click', this._handleThumbnailClick);
      thumb.addEventListener('click', () => this._handleThumbnailClick(index));
    });
  }

  // Предзагрузка всех изображений в фоне
  _preloadImages() {
    if (!this._data.images || this._data.images.length === 0) {
      this._preloadedImages = [];
      return;
    }
    
    // Очищаем старые предзагруженные изображения
    this._preloadedImages = [];
    
    // Создаем скрытый контейнер для предзагрузки (если его еще нет)
    let preloadContainer = this.querySelector('.image-gallery_preload-container');
    if (!preloadContainer) {
      preloadContainer = document.createElement('div');
      preloadContainer.className = 'image-gallery_preload-container';
      preloadContainer.style.cssText = 'position: absolute; width: 0; height: 0; overflow: hidden; opacity: 0; pointer-events: none;';
      this.appendChild(preloadContainer);
    }
    
    // Предзагружаем все изображения
    this._data.images.forEach((image, index) => {
      const img = new Image();
      img.src = image.url || '';
      img.alt = image.alt || '';
      img.loading = 'lazy';
      
      // Сохраняем в кеш
      this._preloadedImages[index] = img;
      
      // Добавляем в скрытый контейнер (браузер загрузит изображение)
      preloadContainer.appendChild(img);
    });
  }

  // Полный рендер компонента (только при изменении структуры)
  _render() {
    this.innerHTML = image_gallery_template(this._data);
    
    // Если fullscreen активен, переносим overlay в глобальную область (в конец DOM)
    this._mountOverlayToBody();
    
    this._setupEventListeners();
    
    // Предзагружаем все изображения после рендера
    this._preloadImages();
    
    // После рендера убеждаемся, что изображения видимы (для первой загрузки)
    // Обычный режим
    const normalImg = this.querySelector('.image-gallery_main-image--current');
    if (normalImg) {
      normalImg.style.opacity = '1';
    }
    
    // Полноэкранный режим (если открыт)
    if (this._data.fullscreen) {
      // В шаблоне используется класс image-gallery_fullscreen-image.image-gallery_main-image--current
      const fullscreenImg = this._queryOverlay('.image-gallery_fullscreen-image.image-gallery_main-image--current');
      if (fullscreenImg) {
        fullscreenImg.style.opacity = '1';
      }
      // Показываем overlay
      const overlay = this._getOverlayElement();
      if (overlay) {
        overlay.style.display = 'block';
      }
    } else {
      // Скрываем overlay если полноэкранный режим закрыт
      const overlay = this._getOverlayElement();
      if (overlay) {
        overlay.style.display = 'none';
      }
    }
  }
}

customElements.define('ui-image-gallery', ImageGallery);
