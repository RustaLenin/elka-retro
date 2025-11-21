/**
 * Accessory Catalog Search Box Template
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

export const renderSearchBox = ({ currentValue = '', countdown = 0 } = {}) => {
  const escapedValue = escapeAttr(currentValue);
  const showCountdown = countdown > 0;
  const buttonLabel = showCountdown ? `Найти (${countdown})` : 'Найти';
  
  return `
    <div class="accessory-catalog-search-box" data-search-box>
      <ui-input-text
        name="accessory_search"
        value="${escapedValue}"
        placeholder="Введите название аксессуара..."
        autocomplete="off"
        clearable
      ></ui-input-text>
      <ui-button
        type="primary"
        label="${escapeAttr(buttonLabel)}"
        event="accessory-catalog-search:submit-click"
        class="accessory-catalog-search-box__submit"
        data-search-submit
        ${showCountdown ? 'data-countdown="true"' : ''}
      ></ui-button>
    </div>
  `;
};

