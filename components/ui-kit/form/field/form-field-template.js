function escapeHTML(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderIcon(icon) {
  if (!icon || !icon.key) return '';
  const name = escapeHTML(icon.key);
  const position = icon.icon_position ? ` data-position="${escapeHTML(icon.icon_position)}"` : '';
  const color = icon.color ? ` data-color="${escapeHTML(icon.color)}"` : '';
  const onClick = icon.on_click ? ` data-on-click="${escapeHTML(icon.on_click)}"` : '';
  return `<ui-icon class="ui-form-field__icon" name="${name}"${position}${color}${onClick}></ui-icon>`;
}

function renderLabel(state) {
  const label = state?.label;
  const required = state?.required;
  const description = state?.description;
  const hints = state?.hints || {};
  const iconMarkup = renderIcon(state?.icon);
  const fieldType = state?.config?.type;

  // Для чекбокса не рендерим внешний label, так как чекбокс сам рендерит свой label
  if (fieldType === 'checkbox' || fieldType === 'boolean') {
    return '<div class="ui-form-field__label-wrapper" hidden></div>';
  }

  if (!label && !description && !iconMarkup) {
    return '<div class="ui-form-field__label-wrapper" hidden></div>';
  }

  const hintPosition = state?.tooltip?.position || 'right';

  const descriptionHint = description
    ? `<ui-hint
          class="ui-form-field__description-hint"
          data-hint="${escapeAttribute(description)}"
          data-hint-placement="${escapeAttribute(hintPosition)}"
          data-hint-trigger="hover"
          aria-label="${escapeAttribute(description)}"
        >
          <ui-icon name="question" size="xsmall"></ui-icon>
        </ui-hint>`
    : '';

  return `
    <div class="ui-form-field__label-wrapper">
      <div class="ui-form-field__label-row">
        ${iconMarkup ? `<span class="ui-form-field__label-icon">${iconMarkup}</span>` : ''}
        ${
          label
            ? `<label class="ui-form-field__label">${escapeHTML(label)}${
                required ? '<span class="ui-form-field__required">*</span>' : ''
              }</label>`
            : ''
        }
        ${descriptionHint}
      </div>
      ${hints.field ? `<p class="ui-form-field__hint">${escapeHTML(hints.field)}</p>` : ''}
    </div>
  `;
}

function renderFeedback(messages) {
  if (!messages || (!messages.error?.length && !messages.success?.length && !messages.info?.length)) {
    return '<div class="ui-form-field__feedback" hidden></div>';
  }

  const sections = ['error', 'success', 'info']
    .map(type => {
      const list = Array.isArray(messages[type]) ? messages[type] : [];
      if (!list.length) return '';
      return `
        <ul class="ui-form-field__feedback-list ui-form-field__feedback-list--${type}">
          ${list.map(msg => `<li>${escapeHTML(msg)}</li>`).join('')}
        </ul>
      `;
    })
    .join('');

  return `
    <div class="ui-form-field__feedback">
      ${sections}
    </div>
  `;
}

function renderTooltip(tooltip) {
  if (!tooltip || !tooltip.content) return '';
  return `
    <ui-tooltip class="ui-form-field__tooltip"
      data-trigger="info"
      data-position="${escapeHTML(tooltip.position || 'right')}"
      data-variant="${escapeHTML(tooltip.variant || 'neutral')}"
    >
      ${escapeHTML(tooltip.content)}
    </ui-tooltip>
  `;
}

/**
 * Загрузить опции из dataSource
 * @param {Object} dataSource - Конфигурация источника данных
 * @returns {Array} Массив опций [{ value, label }]
 */
function loadOptionsFromDataSource(dataSource) {
  if (!dataSource) {
    return null;
  }
  
  // Для taxonomy из window.taxonomy_terms
  if (dataSource.type === 'global' && dataSource.path && dataSource.path.startsWith('taxonomy_terms.')) {
    const taxonomySlug = dataSource.path.replace('taxonomy_terms.', '');
    
    if (typeof window !== 'undefined' && window.taxonomy_terms && window.taxonomy_terms[taxonomySlug]) {
      const terms = window.taxonomy_terms[taxonomySlug];
      
      // Преобразуем структуру { term_id: { id, name, slug, description } } в опции
      // ВАЖНО: Используем ID как value, а не slug (для совместимости с бэкендом)
      const options = Object.values(terms).map(term => ({
        value: String(term.id), // Всегда используем ID, не slug
        label: term.name || String(term.id),
        ...(term.description && { description: term.description }),
      }));
      
      // Сортируем по названию
      options.sort((a, b) => a.label.localeCompare(b.label, 'ru'));
      
      return options;
    }
  }
  
  return null;
}

function renderControl(state) {
  const fieldConfig = state?.config;
  if (!fieldConfig) {
    return '<!-- no field config -->';
  }
  
  const { type, id, placeholder, required, autocomplete, mask, icon, min, max, step, options, dataSource, searchable, rows } = fieldConfig;
  
  // Определяем тип контрола
  let controlTag = 'ui-input-text';
  let controlAttrs = [];
  
  // Загружаем опции из dataSource, если они не переданы напрямую
  let finalOptions = options;
  if ((type === 'select-single' || type === 'select-multi') && !finalOptions && dataSource) {
    finalOptions = loadOptionsFromDataSource(dataSource);
  }
  
  // Поддержка textarea
  if (type === 'textarea') {
    // Для textarea рендерим нативный textarea элемент
    const textareaAttrs = [];
    textareaAttrs.push(`id="${escapeAttribute(id)}"`);
    textareaAttrs.push(`name="${escapeAttribute(id)}"`);
    textareaAttrs.push('class="ui-form-field__textarea"');
    if (placeholder) textareaAttrs.push(`placeholder="${escapeAttribute(placeholder)}"`);
    if (required) textareaAttrs.push('required');
    if (autocomplete) textareaAttrs.push(`autocomplete="${escapeAttribute(autocomplete)}"`);
    if (rows) textareaAttrs.push(`rows="${escapeAttribute(rows)}"`);
    
    return `<textarea ${textareaAttrs.join(' ')}></textarea>`;
  }
  
  if (type === 'number' || type === 'integer' || type === 'float') {
    controlTag = 'ui-input-number';
    if (min !== undefined) controlAttrs.push(`min="${escapeAttribute(min)}"`);
    if (max !== undefined) controlAttrs.push(`max="${escapeAttribute(max)}"`);
    if (step !== undefined) controlAttrs.push(`step="${escapeAttribute(step)}"`);
  } else if (type === 'checkbox' || type === 'boolean') {
    controlTag = 'ui-form-checkbox';
  } else if (type === 'select' || type === 'select-single') {
    controlTag = 'ui-select-single';
    if (finalOptions && Array.isArray(finalOptions) && finalOptions.length > 0) {
      controlAttrs.push(`options='${JSON.stringify(finalOptions).replace(/'/g, '&#39;')}'`);
    }
    if (searchable) controlAttrs.push('searchable');
  } else if (type === 'select-multi') {
    controlTag = 'ui-select-multi';
    if (finalOptions && Array.isArray(finalOptions) && finalOptions.length > 0) {
      controlAttrs.push(`options='${JSON.stringify(finalOptions).replace(/'/g, '&#39;')}'`);
    }
    if (searchable) controlAttrs.push('searchable');
  } else if (type === 'range') {
    controlTag = 'ui-input-range';
    if (min !== undefined) controlAttrs.push(`min="${escapeAttribute(min)}"`);
    if (max !== undefined) controlAttrs.push(`max="${escapeAttribute(max)}"`);
    if (step !== undefined) controlAttrs.push(`step="${escapeAttribute(step)}"`);
  }
  
  // Общие атрибуты
  controlAttrs.push(`name="${escapeAttribute(id)}"`);
  if (placeholder) controlAttrs.push(`placeholder="${escapeAttribute(placeholder)}"`);
  if (required) controlAttrs.push('required');
  if (autocomplete) controlAttrs.push(`autocomplete="${escapeAttribute(autocomplete)}"`);
  if (mask) controlAttrs.push(`mask="${escapeAttribute(mask)}"`);
  const allowedPatternAttr = fieldConfig?.allowedPattern || state?.allowedPattern;
  if (allowedPatternAttr) controlAttrs.push(`allowed-pattern="${escapeAttribute(allowedPatternAttr)}"`);
  if (icon?.key) {
    controlAttrs.push(`icon="${escapeAttribute(icon.key)}"`);
    if (icon.icon_position) controlAttrs.push(`icon-position="${escapeAttribute(icon.icon_position)}"`);
  }
  // Для чекбокса передаём label напрямую в компонент (так как он рендерит свой label)
  if ((type === 'checkbox' || type === 'boolean') && fieldConfig?.label) {
    // Проверяем, содержит ли label HTML
    const hasHTML = /<[^>]+>/.test(fieldConfig.label);
    if (hasHTML) {
      // Если содержит HTML, передаем через data-атрибут (не экранируя)
      controlAttrs.push(`data-label-html="${escapeAttribute(fieldConfig.label)}"`);
      // Также передаем экранированную версию для fallback
      controlAttrs.push(`label="${escapeAttribute(fieldConfig.label)}"`);
    } else {
      // Если нет HTML, передаем обычным способом
      controlAttrs.push(`label="${escapeAttribute(fieldConfig.label)}"`);
    }
  }
  
  return `<${controlTag} ${controlAttrs.join(' ')}></${controlTag}>`;
}

export function renderFormFieldTemplate(state) {
  const status = state?.status || 'default';
  const disabled = state?.disabled ? ' data-disabled="true"' : '';
  const messages = {
    error: state?.messages?.error || [],
    success: state?.messages?.success || [],
    info: state?.messages?.info || []
  };

  return `
    <div class="ui-form-field ui-form-field--${escapeHTML(status)}"${disabled}>
      ${renderLabel(state)}
      <div class="ui-form-field__control">
        ${renderControl(state)}
        ${renderTooltip(state?.tooltip)}
      </div>
      <div class="ui-form-field__status-message" aria-live="polite">${escapeHTML(state?.statusMessage || '')}</div>
      ${renderFeedback(messages)}
    </div>
  `;
}
