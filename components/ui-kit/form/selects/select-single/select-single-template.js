import { escapeHTML } from '../select-utils.js';

function renderIcon(icon) {
  if (!icon || !icon.key) return '';
  const name = escapeHTML(icon.key);
  const color = icon.color ? ` style="color:${icon.color}"` : '';
  return `<ui-icon class="ui-select-single__option-icon" name="${name}"${color}></ui-icon>`;
}

function renderOption(option, isSelected, highlighted, decorators) {
  const { value, label, description, disabled } = option;
  const iconMarkup = decorators?.optionIcon ? renderIcon(option.icon) : '';
  const colorStyle = decorators?.optionColor && option.color ? ` style="--ui-select-option-color:${escapeHTML(option.color)}"` : '';
  const badgeMarkup = Array.isArray(option.badges)
    ? `<span class="ui-select-single__option-badges">${option.badges
        .map(badge => `<span class="ui-select-single__option-badge">${escapeHTML(badge)}</span>`).join('')}</span>`
    : '';

  return `
    <li
      class="ui-select-single__option${isSelected ? ' is-selected' : ''}${highlighted ? ' is-highlighted' : ''}${disabled ? ' is-disabled' : ''}"
      data-value="${escapeHTML(value)}"
      role="option"
      aria-selected="${isSelected ? 'true' : 'false'}"
      ${disabled ? 'aria-disabled="true"' : ''}
      ${colorStyle}
    >
      ${iconMarkup}
      <span class="ui-select-single__option-content">
        <span class="ui-select-single__option-label">${escapeHTML(label)}</span>
      </span>
      ${badgeMarkup}
    </li>
  `;
}

export function renderSelectSingleTemplate(state) {
  // Стили контейнера применяются к самому элементу, здесь только структура содержимого
  const placeholder = state?.placeholder ?? 'Выберите значение';
  const current = state?.selectedOption;
  const triggerLabel = current ? escapeHTML(current.label) : escapeHTML(placeholder);
  const caret = `<span class="ui-select-single__caret"${state?.disabled ? ' aria-hidden="true"' : ''}></span>`;
  const triggerAttrs = [
    'class="ui-select-single__trigger"',
    'role="combobox"',
    'aria-haspopup="listbox"',
    `aria-expanded="${state?.dropdownOpen ? 'true' : 'false'}"`,
    state?.disabled ? 'aria-disabled="true"' : '',
    state?.disabled ? 'tabindex="-1"' : 'tabindex="0"'
  ].filter(Boolean).join(' ');

  const decorators = state?.decorators || {};
  const filtered = Array.isArray(state?.filteredOptions) ? state.filteredOptions : Array.isArray(state?.options) ? state.options : [];
  const optionsMarkup = filtered.length
    ? filtered.map((option, idx) =>
        renderOption(
          option,
          state?.value === option.value,
          state?.highlightedIdx === idx,
          decorators
        )
      ).join('')
    : `<li class="ui-select-single__empty">${escapeHTML(state?.emptyMessage || 'Нет данных')}</li>`;

  const searchMarkup = state?.showSearch
    ? `<div class="ui-select-single__search-wrapper">
         <input class="ui-select-single__search" type="search" placeholder="${escapeHTML(state?.searchPlaceholder || 'Поиск...')}" value="${escapeHTML(state?.searchQuery || '')}" />
       </div>`
    : '';

  // Стили контейнера применяются к самому элементу, здесь только структура содержимого
  // Классы is-open и is-disabled будут применяться к самому элементу в JS
  return `
    <div ${triggerAttrs}>
      <span class="ui-select-single__trigger-label">${triggerLabel}</span>
      ${caret}
    </div>
    <div class="ui-select-single__dropdown"${state?.dropdownOpen ? '' : ' hidden'}>
      ${searchMarkup}
      <ul class="ui-select-single__options" role="listbox">
        ${optionsMarkup}
      </ul>
    </div>
  `;
}
