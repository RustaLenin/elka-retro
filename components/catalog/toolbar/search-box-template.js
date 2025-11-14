/**
 * Template for search box component.
 *
 * Responsibilities:
 * - Генерация HTML разметки для поля поиска
 * - Использование ui-input-text из UI Kit
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
 * Рендеринг поля поиска каталога
 * @param {Object} options - Опции рендеринга
 * @param {string} options.currentValue - Текущее значение поиска
 * @param {number} [options.countdown=0] - Обратный отсчёт секунд до автопередачи (0 = нет таймера)
 * @returns {string} HTML разметка
 */
export const renderSearchBox = ({ currentValue = '', countdown = 0 } = {}) => {
  const escapedValue = escapeAttr(currentValue);
  const showCountdown = countdown > 0;
  const buttonLabel = showCountdown ? `Найти (${countdown})` : 'Найти';
  // Кнопка активна только если есть обратный отсчёт (есть незавершённый ввод)
  // Иначе она будет обновлена через updateSubmitButton после инициализации
  const buttonDisabled = '';

  return `
    <div class="catalog-search-box" data-search-box>
      <ui-input-text
        name="catalog_search"
        value="${escapedValue}"
        placeholder="Поиск по названию..."
        autocomplete="off"
      ></ui-input-text>
      <ui-button
        type="primary"
        label="${buttonLabel}"
        event="catalog-search:submit-click"
        class="catalog-search-box__submit"
        data-search-submit
        ${buttonDisabled ? 'disabled' : ''}
        ${showCountdown ? 'data-countdown="true"' : ''}
      ></ui-button>
    </div>
  `;
};

