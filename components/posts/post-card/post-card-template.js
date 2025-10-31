/**
 * Post Card Template
 * Шаблон для карточки новости
 */

// Экранируем HTML для безопасности
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function post_card_template(state) {
  const { id, title, excerpt, content, date, image, link } = state;
  
  // Извлекаем первый абзац из content, если нет excerpt
  let description = excerpt ? excerpt.trim() : '';
  if (!description && content) {
    // Создаём временный элемент для парсинга HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    // Ищем первый параграф или первый текстовый блок
    const firstParagraph = tempDiv.querySelector('p');
    if (firstParagraph) {
      description = firstParagraph.textContent.trim();
    } else {
      // Если нет параграфов, берём весь текст
      description = tempDiv.textContent.trim();
    }
    
    // Обрезаем если слишком длинный (примерно 150 символов)
    if (description.length > 150) {
      description = description.substring(0, 150).trim() + '...';
    }
  }
  
  const safeTitle = title ? escapeHtml(title) : '';
  const safeDescription = description ? escapeHtml(description) : '';
  
  // Форматируем дату
  let formattedDate = date;
  if (date) {
    try {
      const dateObj = new Date(date);
      if (!isNaN(dateObj.getTime())) {
        formattedDate = dateObj.toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      }
    } catch (e) {
      // Оставляем исходную дату если ошибка парсинга
    }
  }
  
  return `
    <article class="post-card" data-post-id="${id || ''}">
      ${link ? `
        <a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="post-card_link">
      ` : ''}
        ${image ? `
          <div class="post-card_image">
            <img src="${escapeHtml(image)}" alt="${safeTitle}" loading="lazy" />
          </div>
        ` : ''}
        <div class="post-card_content">
          ${safeTitle ? `
            <h3 class="post-card_title">${safeTitle}</h3>
          ` : ''}
          ${formattedDate ? `
            <time class="post-card_date" datetime="${date || ''}">${escapeHtml(formattedDate)}</time>
          ` : ''}
          ${safeDescription ? `
            <p class="post-card_excerpt">${safeDescription}</p>
          ` : ''}
        </div>
      ${link ? `
        </a>
      ` : ''}
      ${link ? `
        <div class="post-card_actions">
          <a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="post-card_read-more-link">
            <ui-button 
              type="secondary" 
              label="Читать целиком">
            </ui-button>
          </a>
        </div>
      ` : ''}
    </article>
  `;
}

