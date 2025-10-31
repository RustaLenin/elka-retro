/**
 * Page Template
 * Шаблон для отображения страницы WordPress
 */

// Экранируем HTML для безопасности (для текста)
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function page_template(state) {
  const { data, loading, error } = state;
  
  // Если загрузка - показываем loader поверх контента
  if (loading) {
    return `
      <div class="wp-page_content">
        <block-loader></block-loader>
      </div>
    `;
  }
  
  // Если ошибка
  if (error) {
    return `
      <div class="wp-page_content">
        <div class="wp-page_error">
          <p>Ошибка загрузки страницы: ${escapeHtml(error)}</p>
        </div>
      </div>
    `;
  }
  
  // Если данных нет
  if (!data) {
    return `
      <div class="wp-page_content">
        <div class="wp-page_empty">
          <p>Страница не найдена</p>
        </div>
      </div>
    `;
  }
  
  // Форматируем дату
  let formattedDate = '';
  if (data.date) {
    try {
      const dateObj = new Date(data.date);
      if (!isNaN(dateObj.getTime())) {
        formattedDate = dateObj.toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      }
    } catch (e) {
      formattedDate = data.date;
    }
  }
  
  // Title приходит как объект с rendered, нужно экранировать только текст
  // Но на самом деле title.rendered уже может содержать HTML от WordPress, так что лучше не экранировать
  const title = data.title?.rendered || '';
  // Content приходит уже как HTML от WordPress, не экранируем
  const content = data.content?.rendered || '';
  const date = data.date || '';
  
  // Извлекаем featured image из _embedded
  let featuredImageUrl = '';
  let featuredImageAlt = '';
  if (data._embedded && data._embedded['wp:featuredmedia'] && data._embedded['wp:featuredmedia'][0]) {
    const featuredMedia = data._embedded['wp:featuredmedia'][0];
    if (featuredMedia.media_details && featuredMedia.media_details.sizes) {
      // Приоритет: large -> medium_large -> medium -> full
      featuredImageUrl = featuredMedia.media_details.sizes.large?.source_url ||
                        featuredMedia.media_details.sizes.medium_large?.source_url ||
                        featuredMedia.media_details.sizes.medium?.source_url ||
                        featuredMedia.media_details.sizes.full?.source_url ||
                        featuredMedia.source_url ||
                        '';
    } else if (featuredMedia.source_url) {
      featuredImageUrl = featuredMedia.source_url;
    }
    featuredImageAlt = featuredMedia.alt_text || title || '';
  }
  
  return `
    <article class="wp-page_content">
      ${featuredImageUrl ? `
        <div class="wp-page_featured-image">
          <img src="${escapeHtml(featuredImageUrl)}" alt="${escapeHtml(featuredImageAlt)}" loading="eager" />
        </div>
      ` : ''}
      ${title ? `
        <header class="wp-page_header">
          <h1 class="wp-page_title">${title}</h1>
          ${formattedDate ? `
            <time class="wp-page_date" datetime="${escapeHtml(date)}">${escapeHtml(formattedDate)}</time>
          ` : ''}
        </header>
      ` : ''}
      ${content ? `
        <div class="wp-page_body">
          ${content}
        </div>
      ` : ''}
    </article>
  `;
}

