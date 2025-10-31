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
  const { images, currentIndex, loading } = state;
  
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
            class="image-gallery_main-image" 
            src="${escapeHtml(currentUrl)}" 
            alt="${currentAlt}"
            loading="lazy"
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
  `;
}

