/**
 * Accessory Catalog Sort Control Template
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

export const renderSortControl = ({ currentValue = 'newest', options = [] } = {}) => {
  if (!Array.isArray(options) || options.length === 0) {
    return '';
  }

  const escapedValue = escapeAttr(currentValue);
  // Для JSON атрибутов используем одинарные кавычки в HTML
  // Это позволяет передавать JSON с двойными кавычками без экранирования
  // BaseElement сам парсит JSON через JSON.parse()
  const optionsJson = JSON.stringify(options);

  // Убираем ui-form-field, так как сортировка не является частью формы
  // Работаем напрямую с ui-select-single
  return `
    <div class="accessory-catalog-sort-control" data-sort-control>
      <ui-select-single
        name="accessory_sort"
        value="${escapedValue}"
        options='${optionsJson}'
        placeholder="Выберите сортировку"
      ></ui-select-single>
    </div>
  `;
};

