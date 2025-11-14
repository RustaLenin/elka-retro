/**
 * Image Gallery Template
 * Шаблон для галереи изображений
 */

// Экранируем HTML для безопасности
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function image_gallery_template(state) {
  const { images, currentIndex, loading, fullscreen } = state;
  
  if (loading) {
    return `
      <div class="image-gallery image-gallery--loading">
        <div class="image-gallery_main">
          <block-loader label="Загрузка изображений..." spinduration="1200"></block-loader>
        </div>
      </div>
    `;
  }
  
  if (!images || images.length === 0) {
    return `
      <div class="image-gallery image-gallery--empty">
        <div class="image-gallery_main">
          <p class="image-gallery_empty-message">Изображения не найдены</p>
        </div>
      </div>
    `;
  }
  
  const currentImage = images[currentIndex] || images[0];
  const currentUrl = currentImage.url || '';
  const currentAlt = escapeHtml(currentImage.alt || '');
  const hasMultipleImages = images.length > 1;
  
  return `
    <div class="image-gallery">
      <div class="image-gallery_main">
        <div class="image-gallery_main-image-wrapper">
          ${hasMultipleImages ? `
            <button class="image-gallery_nav image-gallery_prev" aria-label="Предыдущее изображение">
              <ui-icon name="chevron_left" size="medium"></ui-icon>
            </button>
          ` : ''}
          <img 
            class="image-gallery_main-image image-gallery_main-image--visible image-gallery_main-image--current" 
            src="${escapeHtml(currentUrl)}" 
            alt="${currentAlt}"
            loading="lazy"
          />
          <img 
            class="image-gallery_main-image image-gallery_main-image--next" 
            src=""
            alt=""
            loading="lazy"
            style="display: none;"
          />
          ${hasMultipleImages ? `
            <button class="image-gallery_nav image-gallery_next" aria-label="Следующее изображение">
              <ui-icon name="chevron_right" size="medium"></ui-icon>
            </button>
          ` : ''}
        </div>
        ${currentImage.caption ? `
          <div class="image-gallery_caption">
            ${currentImage.caption}
          </div>
        ` : ''}
      </div>
      
      ${hasMultipleImages ? `
        <div class="image-gallery_thumbnails">
          ${images.map((img, index) => {
            const isActive = index === currentIndex;
            const thumbnailUrl = img.thumbnail || img.url || '';
            const thumbnailAlt = escapeHtml(img.alt || '');
            
            return `
              <button 
                class="image-gallery_thumbnail ${isActive ? 'image-gallery_thumbnail--active' : ''}"
                aria-label="Показать изображение ${index + 1}"
                data-index="${index}"
              >
                <img 
                  src="${escapeHtml(thumbnailUrl)}" 
                  alt="${thumbnailAlt}"
                  loading="lazy"
                />
              </button>
            `;
          }).join('')}
        </div>
      ` : ''}
    </div>
    
    <div class="image-gallery_fullscreen-overlay ${fullscreen ? 'image-gallery_fullscreen-overlay--visible' : ''}">
        <div class="image-gallery_fullscreen-container">
          <button class="image-gallery_fullscreen-close" aria-label="Закрыть полноэкранный режим">
            <ui-icon name="close" size="large"></ui-icon>
          </button>
          
          <div class="image-gallery_fullscreen-main">
            ${hasMultipleImages ? `
              <button class="image-gallery_nav image-gallery_fullscreen-prev" aria-label="Предыдущее изображение">
                <ui-icon name="chevron_left" size="large"></ui-icon>
              </button>
            ` : ''}
            
            <div class="image-gallery_fullscreen-image-wrapper">
              <img 
                class="image-gallery_fullscreen-image image-gallery_main-image--visible image-gallery_main-image--current" 
                src="${escapeHtml(currentUrl)}" 
                alt="${currentAlt}"
                loading="eager"
              />
              <img 
                class="image-gallery_fullscreen-image image-gallery_main-image--next" 
                src=""
                alt=""
                loading="eager"
                style="display: none;"
              />
            </div>
            
            ${hasMultipleImages ? `
              <button class="image-gallery_nav image-gallery_fullscreen-next" aria-label="Следующее изображение">
                <ui-icon name="chevron_right" size="large"></ui-icon>
              </button>
            ` : ''}
          </div>
          
          ${hasMultipleImages ? `
            <div class="image-gallery_fullscreen-thumbnails">
              ${images.map((img, index) => {
                const isActive = index === currentIndex;
                const thumbnailUrl = img.thumbnail || img.url || '';
                const thumbnailAlt = escapeHtml(img.alt || '');
                
                return `
                  <button 
                    class="image-gallery_fullscreen-thumbnail ${isActive ? 'image-gallery_fullscreen-thumbnail--active' : ''}"
                    aria-label="Показать изображение ${index + 1}"
                    data-index="${index}"
                  >
                    <img 
                      src="${escapeHtml(thumbnailUrl)}" 
                      alt="${thumbnailAlt}"
                      loading="lazy"
                    />
                  </button>
                `;
              }).join('')}
            </div>
          ` : ''}
        </div>
      </div>
  `;
}

