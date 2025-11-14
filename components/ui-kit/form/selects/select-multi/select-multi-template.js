import { escapeHTML, formatSelectedLabels } from '../select-utils.js';

function renderIcon(icon) {
  if (!icon || !icon.key) return '';
  const name = escapeHTML(icon.key);
  const color = icon.color ? ` style="color:${icon.color}"` : '';
  return `<ui-icon class="ui-select-multi__option-icon" name="${name}"${color}></ui-icon>`;
}

function renderSelectedChips(state) {
  const labels = formatSelectedLabels(state?.options, state?.values);
  if (!labels.length) {
    return `<span class="ui-select-multi__placeholder">${escapeHTML(state?.placeholder || 'Выберите значения')}</span>`;
  }

  // Ограничиваем отображение: максимум 2 чипса + чипс "+N" если больше 2
  const MAX_VISIBLE_CHIPS = 2;
  const visibleLabels = labels.slice(0, MAX_VISIBLE_CHIPS);
  const remainingCount = labels.length > MAX_VISIBLE_CHIPS ? labels.length - MAX_VISIBLE_CHIPS : 0;

  const chipMarkup = visibleLabels.map((label, idx) => {
    // Получаем реальный индекс для правильной идентификации
    const realIndex = idx;
    const option = Array.isArray(state?.options) 
      ? state.options.find(opt => opt.label === label)
      : null;
    const value = option ? option.value : label;

    return `
      <span class="ui-select-multi__chip" data-value="${escapeHTML(String(value))}" data-label="${escapeHTML(label)}">
        <span class="ui-select-multi__chip-inner">
          <span class="ui-select-multi__chip-label">${escapeHTML(label)}</span>
          <button type="button" class="ui-select-multi__chip-remove" data-action="remove" aria-label="Удалить ${escapeHTML(label)}">
            <ui-icon name="close" size="xsmall"></ui-icon>
          </button>
        </span>
      </span>
    `;
  }).join('');

  // Добавляем чипс "+N" если есть еще выбранные элементы
  const moreChipMarkup = remainingCount > 0
    ? `
      <span class="ui-select-multi__chip ui-select-multi__chip--more" data-action="more">
        <span class="ui-select-multi__chip-inner">
          <span class="ui-select-multi__chip-label">+${remainingCount}</span>
        </span>
      </span>
    `
    : '';

  return `
    <span class="ui-select-multi__chips">
      ${chipMarkup}
      ${moreChipMarkup}
    </span>
  `;
}

function renderOption(option, selected, highlighted, decorators) {
  const iconMarkup = decorators?.optionIcon ? renderIcon(option.icon) : '';
  const colorStyle = decorators?.optionColor && option.color ? ` style="--ui-select-option-color:${escapeHTML(option.color)}"` : '';
  const badgeMarkup = Array.isArray(option.badges)
    ? `<span class="ui-select-multi__option-badges">${option.badges
        .map(badge => `<span class="ui-select-multi__option-badge">${escapeHTML(badge)}</span>`).join('')}</span>`
    : '';

  return `
    <li
      class="ui-select-multi__option${selected ? ' is-selected' : ''}${highlighted ? ' is-highlighted' : ''}${option.disabled ? ' is-disabled' : ''}"
      data-value="${escapeHTML(option.value)}"
      role="option"
      aria-selected="${selected ? 'true' : 'false'}"
      ${option.disabled ? 'aria-disabled="true"' : ''}
      ${colorStyle}
    >
      <span class="ui-select-multi__option-checkbox" aria-hidden="true">
        <span class="ui-select-multi__option-checkbox-mark"></span>
      </span>
      ${iconMarkup}
      <span class="ui-select-multi__option-content">
        <span class="ui-select-multi__option-label">${escapeHTML(option.label)}</span>
        ${option.description ? `<span class="ui-select-multi__option-description">${escapeHTML(option.description)}</span>` : ''}
      </span>
      ${badgeMarkup}
    </li>
  `;
}

export function renderSelectMultiTemplate(state) {
  // Стили контейнера применяются к самому элементу, здесь только структура содержимого
  const caret = `<span class="ui-select-multi__caret"${state?.disabled ? ' aria-hidden="true"' : ''}></span>`;
  const decorators = state?.decorators || {};

  const filtered = Array.isArray(state?.filteredOptions) ? state.filteredOptions : Array.isArray(state?.options) ? state.options : [];
  const valueSet = new Set(Array.isArray(state?.values) ? state.values : []);
  const optionsMarkup = filtered.length
    ? filtered.map((option, idx) =>
        renderOption(
          option,
          valueSet.has(option.value),
          state?.highlightedIdx === idx,
          decorators
        )
      ).join('')
    : `<li class="ui-select-multi__empty">${escapeHTML(state?.emptyMessage || 'Нет данных')}</li>`;

  const searchMarkup = state?.showSearch
    ? `<div class="ui-select-multi__search-wrapper">
         <input class="ui-select-multi__search" type="search" placeholder="${escapeHTML(state?.searchPlaceholder || 'Поиск...')}" value="${escapeHTML(state?.searchQuery || '')}" />
       </div>`
    : '';

  const selectAllMarkup = state?.allowSelectAll
    ? `<button type="button" class="ui-select-multi__select-all" data-action="toggle-all">
         ${valueSet.size === filtered.filter(opt => !opt.disabled).length && filtered.length ? 'Снять все' : 'Выбрать все'}
       </button>`
    : '';

  const counterMarkup = state?.maxSelections
    ? `<div class="ui-select-multi__counter">Выбрано ${valueSet.size} из ${state.maxSelections}</div>`
    : '';

  // Стили контейнера применяются к самому элементу, здесь только структура содержимого
  // Классы is-open и is-disabled будут применяться к самому элементу в JS
  const triggerAttrs = [
    'class="ui-select-multi__trigger"',
    'role="combobox"',
    'aria-haspopup="listbox"',
    'aria-multiselectable="true"',
    `aria-expanded="${state?.dropdownOpen ? 'true' : 'false'}"`,
    state?.disabled ? 'aria-disabled="true"' : '',
    state?.disabled ? 'tabindex="-1"' : 'tabindex="0"'
  ].filter(Boolean).join(' ');

  return `
    <div ${triggerAttrs}>
      ${renderSelectedChips(state)}
      ${caret}
    </div>
    <div class="ui-select-multi__dropdown"${state?.dropdownOpen ? '' : ' hidden'}>
      ${searchMarkup}
      ${selectAllMarkup}
      <ul class="ui-select-multi__options" role="listbox" aria-multiselectable="true">
        ${optionsMarkup}
      </ul>
      ${counterMarkup}
    </div>
  `;
}
