/**
 * Template for sort control component.
 *
 * Responsibilities:
 * - Генерация HTML разметки для селекта сортировки
 * - Использование ui-select-single из UI Kit
 */

/**
 * Экранирование значения для HTML атрибута
 * @param {string} value - Значение для экранирования
 * @returns {string} Экранированное значение
 */
function escapeAttr(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Рендеринг селекта сортировки каталога
 * @param {Object} options - Опции рендеринга
 * @param {string} options.currentValue - Текущее значение сортировки
 * @param {Array} options.options - Опции сортировки [{ value, label }]
 * @returns {string} HTML разметка
 */
export const renderSortControl = ({ currentValue = '', options = [] } = {}) => {
  const escapedValue = escapeAttr(currentValue);
  // Для JSON атрибутов используем одинарные кавычки в HTML
  // Это позволяет передавать JSON с двойными кавычками без экранирования
  // BaseElement сам парсит JSON через JSON.parse()
  const optionsJson = JSON.stringify(options);

  // Убираем ui-form-field, так как сортировка не является частью формы
  // Работаем напрямую с ui-select-single
  return `
    <div class="catalog-sort-control" data-sort-control>
      <ui-select-single
        name="catalog_sort"
        value="${escapedValue}"
        options='${optionsJson}'
        placeholder="Выберите сортировку"
      ></ui-select-single>
    </div>
  `;
};

