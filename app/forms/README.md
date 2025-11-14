# Конфигурации форм приложения

**Документация по архитектуре:** [`../components/ui-kit/form/controller/ARCHITECTURE.md`](../components/ui-kit/form/controller/ARCHITECTURE.md)  
**План рефакторинга:** [`REFACTORING_PLAN.md`](./REFACTORING_PLAN.md)  
**TODO список:** [`TODO.md`](./TODO.md)

Конфигурации форм — это декларативное описание поведения форм, которое является частью логики приложения, а не компонентов.

## Принципы

1. **Разделение ответственности**:
   - Компонент (`ui-form-controller`) — реализует поведение формы (рендеринг, валидация, отправка)
   - Конфигурация формы — декларирует структуру, поля, валидацию и pipeline

2. **Централизованное хранение**:
   - Все конфигурации форм хранятся в `app/forms/`
   - Каждая форма — отдельный файл с именем, отражающим её назначение
   - Регистрация в `window.app.forms` происходит через `app/forms/index.js`

3. **Автономная инициализация**:
   - Формы инициализируются самостоятельно через атрибут `config-path` в шаблоне
   - Компонент не должен программно управлять формой после её создания в DOM

## Структура

```
app/
  forms/
    index.js           # Регистрация всех форм в window.app.forms
    sign-in.js         # Конфигурация формы авторизации
    register.js        # Конфигурация формы регистрации (TODO)
    password-reset.js  # Конфигурация формы восстановления пароля (TODO)
    ...
```

## Использование

### 1. Создание конфигурации формы

Создайте файл `app/forms/my-form.js`:

```javascript
/**
 * Конфигурация формы [название]
 */

import { service } from '../../components/path/to/service.js';

export const myFormConfig = {
  formId: 'my-form-id',
  title: 'Заголовок формы',
  description: 'Описание формы',
  fields: [
    {
      id: 'field_id',
      type: 'text',
      label: 'Название поля',
      placeholder: 'Плейсхолдер',
      required: true,
      validation: [
        { rule: 'required', value: true, message: 'Обязательное поле', severity: 'error' }
      ]
    }
    // ... другие поля
  ],
  actions: {
    submit: {
      label: 'Отправить',
      type: 'primary',
      loadingLabel: 'Отправка...',
      successLabel: 'Отправлено'
    }
  },
  pipeline: {
    sanitize: (context) => {
      // Очистка и нормализация данных
      const values = context.values || {};
      return {
        field_id: String(values.field_id || '').trim()
      };
    },
    validate: async (context) => {
      // Валидация данных
      const values = context.values || {};
      const errors = [];
      
      // ... логика валидации
      
      return {
        valid: errors.length === 0,
        errors,
        fieldMessages: {},
        formMessages: errors.length > 0 ? {
          message: 'Ошибка валидации',
          details: errors.map(e => e.message)
        } : null
      };
    },
    submit: async (context) => {
      // Отправка данных на сервер
      const values = context.values || {};
      const result = await service.method(values);
      
      if (!result.success) {
        throw new Error(result.error || 'Ошибка отправки');
      }
      
      return result;
    },
    onSuccess: (context) => {
      // Обработка успешной отправки
      // Можно отправлять события, закрывать модальные окна и т.д.
      window.dispatchEvent(new CustomEvent('my-form:success', {
        detail: { result: context.result }
      }));
    },
    onError: (context, error) => {
      // Обработка ошибок
      window.dispatchEvent(new CustomEvent('my-form:error', {
        detail: { error: error.message || 'Ошибка отправки' }
      }));
    }
  }
};
```

### 2. Регистрация формы

Импортируйте и зарегистрируйте в `app/forms/index.js`:

```javascript
/**
 * Регистрация всех конфигураций форм в window.app.forms
 */

import { signInFormConfig } from './sign-in.js';
import { myFormConfig } from './my-form.js'; // <-- Добавьте импорт

// Инициализируем объект форм в window.app, если его нет
if (!window.app) {
  window.app = {};
}

if (!window.app.forms) {
  window.app.forms = {};
}

// Регистрируем конфигурации форм
window.app.forms.signIn = signInFormConfig;
window.app.forms.myForm = myFormConfig; // <-- Добавьте регистрацию
```

### 3. Использование в шаблоне компонента

В шаблоне компонента (например, модального окна):

```html
<ui-form-controller config-path="window.app.forms.myForm"></ui-form-controller>
```

**Важно**: Форма инициализируется автоматически при добавлении в DOM. Не нужно программно искать элемент и вызывать методы инициализации.

### 4. Обработка событий формы

Компонент может подписаться на события формы (если они определены в `pipeline.onSuccess`/`onError`):

```javascript
connectedCallback() {
  super.connectedCallback();
  this.render();
  
  // Подписываемся на события формы
  window.addEventListener('my-form:success', this._onFormSuccess);
  window.addEventListener('my-form:error', this._onFormError);
}

disconnectedCallback() {
  window.removeEventListener('my-form:success', this._onFormSuccess);
  window.removeEventListener('my-form:error', this._onFormError);
}
```

## Pipeline формы

Pipeline — это последовательность обработки данных формы:

1. **sanitize** (синхронная) — очистка и нормализация данных
   - Принимает: `context.values`
   - Возвращает: очищенные значения

2. **validate** (асинхронная) — валидация данных
   - Принимает: `context.values`
   - Возвращает: `{ valid: boolean, errors: Array, fieldMessages: Object, formMessages: Object }`

3. **submit** (асинхронная) — отправка данных
   - Принимает: `context.values`
   - Возвращает: результат отправки или выбрасывает ошибку

4. **onSuccess** (синхронная) — обработка успешной отправки
   - Принимает: `context` (содержит `result` из `submit`)
   - Выполняется после успешной отправки

5. **onError** (синхронная) — обработка ошибок
   - Принимает: `context`, `error`
   - Выполняется при ошибке в любом из предыдущих этапов

## Миграция старых форм

Если у вас есть формы, которые инициализируются программно (через `setState()` и `configure()`), их нужно мигрировать:

### До (неправильно):

```javascript
render() {
  this.innerHTML = `
    <ui-form-controller></ui-form-controller>
  `;
  
  // Программная инициализация
  const formController = this.querySelector('ui-form-controller');
  formController.setState({ fields: [...] });
  formController.configure({ pipeline: {...} });
}
```

### После (правильно):

1. Создайте `app/forms/my-form.js` с конфигурацией
2. Зарегистрируйте в `app/forms/index.js`
3. Используйте в шаблоне:

```javascript
render() {
  this.innerHTML = `
    <ui-form-controller config-path="window.app.forms.myForm"></ui-form-controller>
  `;
  
  // Форма инициализируется сама, никакой дополнительной логики не требуется
}
```

## Примеры конфигураций

- `app/forms/sign-in.js` — форма авторизации
- `app/forms/register.js` — форма регистрации (TODO)
- `app/forms/password-reset.js` — форма восстановления пароля (TODO)

## См. также

- `components/ui-kit/form/README.md` — документация UI Form Kit
- `components/ui-kit/form/controller/form-controller.js` — реализация `ui-form-controller`

