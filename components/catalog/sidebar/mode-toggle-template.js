/**
 * Template for mode toggle component.
 *
 * Responsibilities:
 * - Генерация HTML разметки для переключателя режимов
 * - Использование ui-segmented-toggle из UI Kit
 * - Подготовка опций для переключателя
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
 * Рендеринг переключателя режимов каталога
 * @param {Object} options - Опции рендеринга
 * @param {string} options.currentMode - Текущий режим ('type' | 'instance')
 * @returns {string} HTML разметка
 */
export const renderModeToggle = ({ currentMode = 'type' } = {}) => {
  // Опции для переключателя
  const options = [
    { value: 'type', label: 'Типы игрушек' },
    { value: 'instance', label: 'Экземпляры' },
  ];

  // Сериализуем опции в JSON для атрибута
  // BaseElement автоматически парсит JSON из атрибута, поэтому нужно только экранировать кавычки
  const optionsJson = JSON.stringify(options);
  const escapedOptions = escapeAttr(optionsJson);
  const escapedMode = escapeAttr(currentMode);

  return `
    <div class="catalog-mode-toggle" data-mode-toggle>
      <ui-segmented-toggle
        name="catalog_mode"
        value="${escapedMode}"
        options="${escapedOptions}"
      ></ui-segmented-toggle>
    </div>
  `;
};

