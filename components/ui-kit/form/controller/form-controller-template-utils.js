/**
 * Общие утилиты для шаблонов форм
 * Используются как в page, так и в modal режимах
 */

export function escapeHTML(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function escapeAttribute(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderIcon(icon) {
  if (!icon || !icon.key) return '';
  const name = escapeHTML(icon.key);
  const position = icon.icon_position ? ` data-position="${escapeHTML(icon.icon_position)}"` : '';
  const color = icon.color ? ` data-color="${escapeHTML(icon.color)}"` : '';
  const onClick = icon.on_click ? ` data-on-click="${escapeHTML(icon.on_click)}"` : '';
  return `<ui-icon name="${name}"${position}${color}${onClick}></ui-icon>`;
}

export function renderStatus(state) {
  const status = state?.status || {};
  const message = status.message ? `<p class="ui-form-controller__status-message">${escapeHTML(status.message)}</p>` : '';
  const details = Array.isArray(status.details)
    ? `<ul class="ui-form-controller__status-details">${status.details
        .map(detail => `<li>${escapeHTML(detail)}</li>`)
        .join('')}</ul>`
    : '';

  return `
    <section class="ui-form-controller__status" aria-live="polite" data-status="${escapeHTML(status.type || 'idle')}">
      ${message || details ? `${message}${details}` : '<!-- status placeholder -->'}
    </section>
  `;
}

export function renderControl(fieldConfig) {
  const { id, type, placeholder, required, autocomplete, mask, icon, min, max, step } = fieldConfig;
  
  // Определяем тип контрола
  let controlTag = 'ui-input-text';
  let controlAttrs = [];
  
  if (type === 'number' || type === 'integer' || type === 'float') {
    controlTag = 'ui-input-number';
    if (min !== undefined) controlAttrs.push(`min="${escapeAttribute(min)}"`);
    if (max !== undefined) controlAttrs.push(`max="${escapeAttribute(max)}"`);
    if (step !== undefined) controlAttrs.push(`step="${escapeAttribute(step)}"`);
  } else if (type === 'checkbox' || type === 'boolean') {
    controlTag = 'ui-checkbox';
  } else if (type === 'select' || type === 'select-single') {
    controlTag = 'ui-select';
  } else if (type === 'select-multi') {
    controlTag = 'ui-select-multi';
  } else if (type === 'range') {
    controlTag = 'ui-input-range';
  }
  
  // Общие атрибуты
  controlAttrs.push(`name="${escapeAttribute(id)}"`);
  if (placeholder) controlAttrs.push(`placeholder="${escapeAttribute(placeholder)}"`);
  if (required) controlAttrs.push('required');
  if (autocomplete) controlAttrs.push(`autocomplete="${escapeAttribute(autocomplete)}"`);
  if (mask) controlAttrs.push(`mask="${escapeAttribute(mask)}"`);
  if (icon?.key) {
    controlAttrs.push(`icon="${escapeAttribute(icon.key)}"`);
    if (icon.icon_position) controlAttrs.push(`icon-position="${escapeAttribute(icon.icon_position)}"`);
  }
  
  return `<${controlTag} ${controlAttrs.join(' ')}></${controlTag}>`;
}

export function renderField(fieldConfig) {
  if (!fieldConfig || !fieldConfig.id) return '';
  
  const { id, label, description, required } = fieldConfig;
  
  const attrs = [`field-id="${escapeAttribute(id)}"`];
  if (label) attrs.push(`label="${escapeAttribute(label)}"`);
  if (description) attrs.push(`description="${escapeAttribute(description)}"`);
  if (required) attrs.push('required');
  
  // ВАЖНО: form-controller рендерит ТОЛЬКО ui-form-field (без контролов внутри)
  // Контролы будут рендериться самим ui-form-field на основе конфигурации поля
  // Передаём конфигурацию через data-атрибут для передачи в field
  const configJson = JSON.stringify(fieldConfig);
  attrs.push(`data-field-config='${configJson.replace(/'/g, '&#39;')}'`);
  
  return `<ui-form-field ${attrs.join(' ')}></ui-form-field>`;
}

export function renderFields(fields) {
  if (!Array.isArray(fields) || fields.length === 0) return '';
  return fields.map(field => renderField(field)).join('');
}

export function renderLayoutGroup(group, groupFields) {
  if (!group) return '';
  const id = group.id ? ` data-group-id="${escapeHTML(group.id)}"` : '';
  const label = group.label ? `<h3 class="ui-form-controller__group-title">${escapeHTML(group.label)}</h3>` : '';
  const description = group.description ? `<p class="ui-form-controller__group-description">${escapeHTML(group.description)}</p>` : '';
  const fields = Array.isArray(groupFields) ? groupFields : [];
  const fieldsAttr = fields.length > 0 ? ` data-fields="${fields.map(f => escapeHTML(f.id)).join(',')}"` : '';
  
  const fieldsHtml = renderFields(fields);
  
  return `
    <div class="ui-form-controller__group"${id}${fieldsAttr}>
      ${label || description ? `<div class="ui-form-controller__group-header">${label}${description}</div>` : ''}
      <div class="ui-form-controller__group-fields">
        ${fieldsHtml}
      </div>
    </div>
  `;
}

export function renderLayoutStep(step, index, currentStep, totalSteps, stepFields) {
  if (!step) return '';
  const id = step.id ? ` data-step-id="${escapeHTML(step.id)}"` : '';
  const stepNumber = index + 1;
  const isActive = currentStep === stepNumber ? ' data-active="true"' : '';
  const isCompleted = currentStep > stepNumber ? ' data-completed="true"' : '';
  const label = step.label ? `<span class="ui-form-controller__step-label">${escapeHTML(step.label)}</span>` : '';
  const description = step.description ? `<span class="ui-form-controller__step-description">${escapeHTML(step.description)}</span>` : '';
  
  // Рендерим группы внутри шага
  const groups = Array.isArray(step.groups) 
    ? step.groups.map(group => {
        const groupFields = Array.isArray(group.fields)
          ? (Array.isArray(stepFields) ? stepFields.filter(f => group.fields.includes(f.id)) : [])
          : [];
        return renderLayoutGroup(group, groupFields);
      }).join('')
    : '';
  
  // Рендерим поля, которые не в группах
  const groupedFieldIds = new Set();
  if (Array.isArray(step.groups)) {
    step.groups.forEach(group => {
      if (Array.isArray(group.fields)) {
        group.fields.forEach(id => groupedFieldIds.add(id));
      }
    });
  }
  const ungroupedFields = Array.isArray(stepFields) 
    ? stepFields.filter(f => !groupedFieldIds.has(f.id))
    : [];
  const ungroupedFieldsHtml = renderFields(ungroupedFields);
  
  return `
    <div class="ui-form-controller__step"${id}${isActive}${isCompleted} data-step-number="${stepNumber}">
      <div class="ui-form-controller__step-header">
        <div class="ui-form-controller__step-number">${stepNumber}</div>
        ${label || description ? `<div class="ui-form-controller__step-info">${label}${description}</div>` : ''}
      </div>
      <div class="ui-form-controller__step-content">
        ${groups}${ungroupedFieldsHtml}
      </div>
    </div>
  `;
}

export function renderLayoutScaffolding(layout, fields) {
  if (!layout) {
    // Если нет layout, просто рендерим поля
    return renderFields(fields);
  }

  const { columns = 1, groups = [], steps = [], type = 'default' } = layout;

  // Пошаговая форма (wizard)
  if (type === 'steps' || steps.length > 0) {
    const currentStep = layout.currentStep !== undefined ? Number(layout.currentStep) : 1;
    const stepsHtml = steps.map((step, index) => {
      // Определяем поля для этого шага
      const stepFields = Array.isArray(step.fields)
        ? fields.filter(f => step.fields.includes(f.id))
        : fields; // Если fields не указаны, используем все поля
      return renderLayoutStep(step, index, currentStep, steps.length, stepFields);
    }).join('');
    
    return `
      <div class="ui-form-controller__steps-wrapper">
        <div class="ui-form-controller__steps-header">
          ${steps.map((step, index) => {
            const stepNum = index + 1;
            const isActive = currentStep === stepNum ? ' data-active="true"' : '';
            const isCompleted = currentStep > stepNum ? ' data-completed="true"' : '';
            const label = step.label ? escapeHTML(step.label) : `Шаг ${stepNum}`;
            return `<div class="ui-form-controller__step-indicator" data-step="${stepNum}"${isActive}${isCompleted}>
              <span class="ui-form-controller__step-indicator-number">${stepNum}</span>
              <span class="ui-form-controller__step-indicator-label">${label}</span>
            </div>`;
          }).join('')}
        </div>
        <div class="ui-form-controller__steps-content">
          ${stepsHtml}
        </div>
      </div>
    `;
  }

  // Группированные поля с колонками
  if (groups.length > 0) {
    const columnsClass = columns > 1 ? ` ui-form-controller__layout--columns-${columns}` : '';
    // Рендерим поля внутри групп
    const groupsHtml = groups.map(group => {
      const groupFields = Array.isArray(group.fields) 
        ? fields.filter(f => group.fields.includes(f.id))
        : [];
      return renderLayoutGroup(group, groupFields);
    }).join('');
    
    // Рендерим поля, которые не в группах
    const groupedFieldIds = new Set();
    groups.forEach(group => {
      if (Array.isArray(group.fields)) {
        group.fields.forEach(id => groupedFieldIds.add(id));
      }
    });
    const ungroupedFields = fields.filter(f => !groupedFieldIds.has(f.id));
    const ungroupedFieldsHtml = renderFields(ungroupedFields);
    
    return `
      <div class="ui-form-controller__groups-wrapper${columnsClass}">
        ${groupsHtml}
        ${ungroupedFieldsHtml}
      </div>
    `;
  }

  // Простая колоночная раскладка без групп
  if (columns > 1) {
    return `
      <div class="ui-form-controller__columns-wrapper ui-form-controller__layout--columns-${columns}">
        ${renderFields(fields)}
      </div>
    `;
  }

  // По умолчанию - просто рендерим поля
  return renderFields(fields);
}

export function renderFormBody(state) {
  const layout = state?.layout || {};
  const layoutType = layout.type ? ` data-layout-type="${escapeHTML(layout.type)}"` : '';
  const fields = state?.fields || [];
  const scaffolding = renderLayoutScaffolding(layout, fields);
  
  return `
    <section class="ui-form-controller__body">
      <div class="ui-form-controller__layout"${layoutType}>
        ${scaffolding}
      </div>
    </section>
  `;
}

export function renderActionButton(action, role) {
  if (!action) return '';
  const id = action.id ? ` data-action-id="${escapeHTML(action.id)}"` : '';
  const type = action.type ? escapeHTML(action.type) : 'primary';
  const label = action.label ? escapeHTML(action.label) : '';
  const iconMarkup = renderIcon(action.icon);
  const loadingLabel = action.loadingLabel ? ` data-loading-label="${escapeHTML(action.loadingLabel)}"` : '';
  const successLabel = action.successLabel ? ` data-success-label="${escapeHTML(action.successLabel)}"` : '';
  const disabled = action.disabled ? ` disabled` : '';
  const visibility = action.visibleWhen ? ` data-visible-when="${escapeHTML(action.visibleWhen)}"` : '';

  return `
    <ui-button
      class="ui-form-controller__button"
      data-role="${escapeHTML(role)}"${id}${loadingLabel}${successLabel}${visibility}
      type="${type}"
      label="${label}"${disabled}
    >
      ${iconMarkup ? `<span class="ui-form-controller__button-icon">${iconMarkup}</span>` : ''}
      <span class="ui-form-controller__button-label">${label}</span>
    </ui-button>
  `;
}

export function renderActions(state, isModal = false) {
  const actions = state?.actions || {};
  const submitMarkup = renderActionButton(actions.submit, 'submit');
  const extraActions = Array.isArray(actions.extra)
    ? actions.extra.map(action => renderActionButton(action, 'extra')).join('')
    : '';

  const actionsContent = submitMarkup || extraActions
    ? `${submitMarkup || ''}${extraActions}`
    : '<!-- actions placeholder -->';

  if (isModal) {
    // В модальном режиме рендерим actions как отдельный элемент для перемещения в footer модального окна
    return `
      <div data-form-actions class="ui-form-controller__actions">
        ${actionsContent}
      </div>
    `;
  }

  return `
    <footer class="ui-form-controller__actions">
      ${actionsContent}
    </footer>
  `;
}

export function renderDebugPanel(state) {
  if (!state?.debug) return '';
  return `
    <aside class="ui-form-controller__debug">
      <details open class="ui-form-controller__debug-block">
        <summary>Текущее состояние</summary>
        <pre class="ui-form-controller__debug-state" data-debug="state"></pre>
      </details>
      <details class="ui-form-controller__debug-block">
        <summary>Sanitized payload</summary>
        <pre class="ui-form-controller__debug-payload" data-debug="payload"></pre>
      </details>
      <details class="ui-form-controller__debug-block">
        <summary>Лог валидации</summary>
        <pre class="ui-form-controller__debug-validation" data-debug="validation"></pre>
      </details>
    </aside>
  `;
}

