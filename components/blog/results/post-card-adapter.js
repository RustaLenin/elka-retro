const toStringOrEmpty = (value) => (value === undefined || value === null ? '' : String(value));

/**
 * Преобразует данные поста из WordPress REST API в элемент post-card
 * @param {Object} post - Объект поста из WordPress REST API
 * @returns {HTMLElement|null} Элемент post-card или null
 */
export const adaptPostCard = (post = {}) => {
  if (!post || typeof post !== 'object') {
    return null;
  }

  const element = document.createElement('post-card');

  if (post.id !== undefined) {
    element.setAttribute('id', toStringOrEmpty(post.id));
  }

  if (post.title?.rendered) {
    element.setAttribute('title', toStringOrEmpty(post.title.rendered));
  }

  if (post.excerpt?.rendered) {
    // Очищаем HTML из excerpt
    const excerptText = post.excerpt.rendered
      .replace(/<[^>]*>/g, '') // Удаляем HTML теги
      .replace(/\s+/g, ' ') // Нормализуем пробелы
      .trim();
    element.setAttribute('excerpt', excerptText);
  }

  if (post.content?.rendered) {
    // Очищаем HTML из content
    const contentText = post.content.rendered
      .replace(/<[^>]*>/g, '') // Удаляем HTML теги
      .replace(/\s+/g, ' ') // Нормализуем пробелы
      .trim();
    element.setAttribute('content', contentText);
  }

  if (post.date) {
    element.setAttribute('date', toStringOrEmpty(post.date));
  }

  // Получаем изображение из featured_media или _embedded
  let imageUrl = '';
  if (post.featured_media) {
    // Если есть _embedded, используем его
    if (post._embedded?.['wp:featuredmedia']?.[0]?.source_url) {
      imageUrl = post._embedded['wp:featuredmedia'][0].source_url;
    }
    // Если нет _embedded, но есть featured_media ID, можно будет загрузить отдельно
    // Пока оставляем пустым, если нет в _embedded
  }

  if (imageUrl) {
    element.setAttribute('image', imageUrl);
  }

  if (post.link) {
    element.setAttribute('link', toStringOrEmpty(post.link));
  }

  return element;
};

/**
 * Преобразует массив постов в массив элементов post-card
 * @param {Array} posts - Массив постов из WordPress REST API
 * @returns {Array<HTMLElement>} Массив элементов post-card
 */
export const adaptPostList = (posts = []) =>
  posts
    .map((post) => adaptPostCard(post))
    .filter((node) => node !== null);

