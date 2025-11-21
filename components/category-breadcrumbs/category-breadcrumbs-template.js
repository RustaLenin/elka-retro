/**
 * Category Breadcrumbs Template
 * Шаблон для отображения хлебных крошек категорий
 */

// Импортируем утилиту для формирования ссылок каталога
import { getCatalogTaxonomyUrl } from '../catalog/catalog-link-utils.js';

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function category_breadcrumbs_template(state) {
  const { categories, loading, error } = state;
  
  if (loading) {
    return '<div class="category-breadcrumbs_loading">Загрузка...</div>';
  }
  
  if (error) {
    return `<div class="category-breadcrumbs_error">Ошибка: ${escapeHtml(error)}</div>`;
  }
  
  if (!categories || categories.length === 0) {
    return '';
  }
  
  // Формируем хлебные крошки
  // Все ссылки ведут в каталог с фильтром по категории
  // Все элементы - ссылки, даже последний
  const items = categories.map((category, index) => {
    const isLast = index === categories.length - 1;
    const safeName = escapeHtml(category.name || '');
    // Формируем URL каталога с фильтром по категории (используем ID)
    const catalogUrl = category.id 
      ? getCatalogTaxonomyUrl('category-of-toys', category.id, { mode: 'type' })
      : '/catalog/';
    const currentClass = isLast ? ' category-breadcrumbs_item--current' : '';
    
    return `<a href="${catalogUrl}" class="category-breadcrumbs_item${currentClass}">${safeName}</a>`;
  }).join('<span class="category-breadcrumbs_separator">/</span>');
  
  return `<nav class="category-breadcrumbs" aria-label="Хлебные крошки">
    ${items}
  </nav>`;
}

