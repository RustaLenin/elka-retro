# Интеграция форм в модальные окна

## Проблема

При использовании `ui-form-controller` внутри `ui-modal` возникают проблемы:

1. **Дублирование заголовка**: Форма рендерит свой header с title, но модальное окно уже имеет title в своем header
2. **Кнопки не в footer**: Кнопки формы находятся в `actions` внутри формы, а должны быть в footer модального окна
3. **Неправильная структура**: Форма не знает, что она в модальном окне, и рендерит полную структуру

## Решение

### 1. Атрибут `mode="modal"` для формы

Форма поддерживает атрибут `mode="modal"`, который меняет шаблон:

- **Не рендерит header** (использует title модального окна)
- **Рендерит actions как отдельный элемент** с `data-form-actions` для перемещения в footer
- **Рендерит только body с полями** и status

### 2. Поддержка footer в модальном окне

Модальное окно рендерит footer, если в body есть элемент с `data-form-actions`.

### 3. Автоматическое перемещение actions

При рендере модального окна, если в body есть элемент с `data-form-actions`, он автоматически перемещается в footer.

## Использование

```html
<ui-modal title="Вход в аккаунт" size="medium">
  <ui-form-controller 
    config-path="window.app.forms.signIn"
    mode="modal"
  ></ui-form-controller>
</ui-modal>
```

## Структура

### Обычная форма (mode не указан или mode="page")

```
ui-form-controller
├── header (title, description, icon)
├── status (сообщения)
├── body (поля)
├── actions (кнопки)
└── debug (опционально)
```

### Форма в модальном окне (mode="modal")

```
ui-modal
├── header (title, close button)
├── body
│   └── ui-form-controller
│       ├── status (сообщения)
│       └── body (поля)
└── footer
    └── [data-form-actions] (кнопки из формы)
```

## Реализация

### Структура файлов

Шаблоны разделены на отдельные файлы для ясности:

- **`form-controller-template-utils.js`** - общие утилиты (escapeHTML, renderIcon, renderControl, renderField, renderFields, renderLayoutScaffolding, renderFormBody, renderStatus, renderDebugPanel)
- **`form-controller-page-template.js`** - шаблон для обычных форм (mode="page")
- **`form-controller-modal-template.js`** - шаблон для модальных форм (mode="modal")

### form-controller.js

```javascript
render() {
  const mode = this.state.mode || 'page';
  const template = mode === 'modal' 
    ? renderFormControllerModalTemplate(this.state)
    : renderFormControllerPageTemplate(this.state);
  
  this.innerHTML = template;
  this._bindActions();
}
```

### form-controller-page-template.js

```javascript
export function renderFormControllerPageTemplate(state) {
  return `
    <form class="ui-form-controller" novalidate>
      ${renderHeader(state)}
      ${renderStatus(state)}
      ${renderFormBody(state)}
      ${renderActions(state)}  <!-- footer -->
      ${renderDebugPanel(state)}
    </form>
  `;
}
```

### form-controller-modal-template.js

```javascript
export function renderFormControllerModalTemplate(state) {
  return `
    <form class="ui-form-controller" novalidate>
      ${renderStatus(state)}
      ${renderFormBody(state)}
      ${renderActions(state)}  <!-- div[data-form-actions] -->
      ${renderDebugPanel(state)}
    </form>
  `;
}
```

### modal.js

```javascript
render() {
  // ... существующий код ...
  
  const existingBody = this._queryContainer('.modal_body') || this.querySelector('.modal_body');
  const existingContent = existingBody ? existingBody.innerHTML : '';
  
  // Проверяем, есть ли actions формы для перемещения в footer
  const formActions = existingBody?.querySelector('[data-form-actions]');
  const footerContent = formActions ? formActions.outerHTML : '';
  
  // Удаляем actions из body, если они есть
  if (formActions) {
    formActions.remove();
  }

  this.innerHTML = `
    <div class="modal_overlay"></div>
    <div class="modal_container">
      ${header}
      <div class="modal_body">
        ${loading ? `<block-loader label="Загрузка..." spinduration="1200"></block-loader>` : existingContent}
      </div>
      ${footerContent ? `<div class="modal_footer">${footerContent}</div>` : ''}
    </div>
  `;
  
  // ... остальной код ...
}
```

## Преимущества

1. ✅ **Нет дублирования**: Header формы не рендерится в модальном режиме
2. ✅ **Правильная структура**: Кнопки в footer модального окна
3. ✅ **Обратная совместимость**: Обычные формы работают как раньше
4. ✅ **Простота**: Один атрибут `mode="modal"` решает все проблемы
5. ✅ **Автоматизация**: Actions автоматически перемещаются в footer

## ✅ Реализовано

- [x] Атрибут `mode="modal"` в `ui-form-controller`
- [x] Условный рендеринг header в шаблоне формы
- [x] Рендеринг actions как `[data-form-actions]` в модальном режиме
- [x] Автоматическое перемещение actions в footer модального окна
- [x] Поиск кнопок в footer модального окна при привязке обработчиков
- [x] Обновлены все модальные окна с формами (auth-modal, register-modal, password-reset-modal)
- [x] Документация обновлена

## Важные детали

### Привязка обработчиков

Форма автоматически находит кнопки в footer модального окна при привязке обработчиков:

```javascript
// form-controller.js: _bindActions()
if (isModal) {
  const modal = this.closest('ui-modal');
  if (modal) {
    const modalFooter = modal.querySelector('.modal_footer');
    const footerButton = modalFooter?.querySelector('ui-button[data-role="submit"]');
    this._submitButton = footerButton || formButton;
    // ...
  }
}
```

Это гарантирует, что обработчики работают корректно даже после перемещения кнопок в footer.

