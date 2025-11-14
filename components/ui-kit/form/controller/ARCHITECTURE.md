# Архитектура системы форм

## 📋 Содержание

1. [Обзор архитектуры](#обзор-архитектуры)
2. [Принципы работы](#принципы-работы)
3. [Связь компонентов](#связь-компонентов)
4. [Best Practices](#best-practices)
5. [Anti-patterns](#anti-patterns)
6. [Примеры использования](#примеры-использования)

---

## Обзор архитектуры

Система форм построена на принципе **единого источника истины** с автоматической синхронизацией состояния через ссылки. Все компоненты связаны в иерархию:

```
ui-form-controller (форма)
  └── state.values = { fieldId: value }
      ↓ (getter/setter через Object.defineProperty)
  ui-form-field (поле)
    └── state.value → ссылка на form.state.values.fieldId
        ↓ (getter/setter или прямая ссылка)
    ui-input-* (инпут)
      └── state.value → ссылка на field.state.value
          ↓ (DOM)
      <input value="...">
```

### Ключевые принципы

1. **Единый источник истины**: Все значения хранятся в `form.state.values`
2. **Синхронизация через ссылки**: Дочерние компоненты получают прямые ссылки на части стейта родителя
3. **Автоматическая синхронизация**: Изменения автоматически распространяются по всей цепочке
4. **Публичный API**: Компоненты предоставляют методы для внешнего взаимодействия
5. **Автономность**: Компоненты находят родителей через `closest()`, не требуют внешнего управления

---

## Принципы работы

### 1. Инициализация формы

Форма загружает конфигурацию из глобального реестра по пути:

```javascript
// HTML
<ui-form-controller config-path="app.forms.signIn"></ui-form-controller>

// JavaScript
// app/forms/sign-in.js
export const signInFormConfig = {
  fields: [
    { id: 'email', type: 'text', required: true },
    { id: 'password', type: 'text', required: true }
  ],
  actions: { submit: { label: 'Войти' } },
  pipeline: { /* ... */ }
};

// app/forms/index.js
window.app.forms.signIn = signInFormConfig;
```

**Процесс инициализации:**

1. `form-controller` загружает конфигурацию из `window.app.forms.signIn`
2. Инициализирует `state.values` с дефолтными значениями для всех полей
3. Рендерит поля напрямую из конфигурации через `renderField()` в `form-controller-template-utils.js`
   - **ВАЖНО**: `renderField()` вставляет контролы (например, `<ui-input-text>`) **внутрь** `<ui-form-field>` как дочерние элементы
   - Контролы вставляются через HTML шаблона, а не создаются полями динамически
4. `ui-form-field` при `connectedCallback()` вызывает `render()`, который:
   - **ВАЖНО**: Сохраняет существующие дочерние элементы (контролы) перед перезаписью `innerHTML`
   - Рендерит шаблон поля с `<slot></slot>` для проецирования контролов
   - Вставляет сохранённые контролы обратно как прямые дочерние элементы, чтобы `<slot>` мог их проецировать
5. Каждое поле находит форму через `closest('ui-form-controller')` и создает ссылку на `form.state.values[fieldId]`
6. Каждый инпут находит поле через `closest('ui-form-field')` и создает ссылку на `field.state.value`

### 2. Связь через ссылки

#### Для примитивных значений (string, number, boolean)

Используется `Object.defineProperty` с getter/setter:

```javascript
// form-field.js
Object.defineProperty(this.state, 'value', {
  get: () => formController.state.values[fieldId],
  set: (val) => {
    formController.state.values[fieldId] = val;
    // Обновляем контрол, если нужно
  },
  enumerable: true,
  configurable: true
});
```

#### Для объектов и массивов

Используется прямая ссылка на объект/массив:

```javascript
// select-multi.js
// field.state.value должен быть массивом
if (!Array.isArray(field.state.value)) {
  field.state.value = [];
}
// Создаем прямую ссылку
this.state.values = field.state.value;

// При изменении обновляем массив напрямую
this.state.values.length = 0;
this.state.values.push(...newValues);
```

### 3. Типы значений по типам полей

Форма автоматически инициализирует правильные типы значений:

```javascript
// form-controller.js: _initFieldsState()
if (field.type === 'checkbox' || field.type === 'boolean') {
  values[field.id] = false;  // boolean
} else if (field.type === 'range') {
  values[field.id] = { min: null, max: null };  // object
} else if (field.type === 'select-multi') {
  values[field.id] = [];  // array
} else {
  values[field.id] = null;  // string/number
}
```

---

## Связь компонентов

### Цепочка связи

```
form.state.values.email = 'user@example.com'
  ↓ (getter/setter)
field.state.value → 'user@example.com'
  ↓ (getter/setter)
input.state.value → 'user@example.com'
  ↓ (DOM)
<input value="user@example.com">
```

### Инициализация связи

Все связи устанавливаются в `connectedCallback()` с использованием `requestAnimationFrame` для гарантии готовности родителя:

```javascript
// text-input.js
connectedCallback() {
  super.connectedCallback();
  this.render();
  
  // Ждем следующий кадр, чтобы поле успело инициализировать ссылку на форму
  requestAnimationFrame(() => {
    this._initStateLink();
  });
}

_initStateLink() {
  const field = this.closest('ui-form-field');
  if (!field || !field.state) return;
  
  // Ждем, пока поле создаст ссылку на форму
  if (field.state.value === undefined || !field.state._valueDescriptor) {
    requestAnimationFrame(() => {
      this._initStateLink();
    });
    return;
  }
  
  // Создаем ссылку
  Object.defineProperty(this.state, 'value', {
    get: () => field.state.value ?? '',
    set: (val) => {
      field.state.value = val ?? '';
      // Обновляем DOM
      if (this._inputEl) {
        this._inputEl.value = val ?? '';
      }
    },
    enumerable: true,
    configurable: true
  });
  this.state._valueDescriptor = true;
}
```

### Обновление значений

При изменении значения пользователем:

```javascript
// text-input.js: _onInput()
_onInput(event) {
  const raw = event.target.value ?? '';
  
  // Обновляем через setter (автоматически синхронизируется с полем и формой)
  this.state.value = raw;
  
  // Обновляем локальные флаги
  this.setState({ dirty: true });
  
  // Отправляем событие для других слушателей (если нужно)
  this._emitEvent('ui-input-text:input', { value: raw });
}
```

---

## Best Practices

### ✅ 1. Используйте публичный API компонентов

**Правильно:**

```javascript
// Получить значение поля
const emailField = document.querySelector('ui-form-field[field-id="email"]');
const emailValue = emailField.value();

// Установить значение
emailField.setValue('new@example.com');

// Сбросить поле
emailField.reset();

// Получить все значения формы
const form = document.querySelector('ui-form-controller');
const allValues = form.getValues();

// Сбросить форму
form.reset();

// Проверить валидность
if (form.isValid()) {
  form.submit();
}
```

**Неправильно:**

```javascript
// ❌ НЕ обращайтесь напрямую к state
form.state.values.email = 'new@example.com';  // Может не синхронизироваться!

// ❌ НЕ используйте setState для значений
form.setState({ values: { email: 'new@example.com' } });  // Нарушает архитектуру!
```

### ✅ 2. Слушайте события только для явных реакций

**Правильно:**

```javascript
// Слушаем событие успешной отправки
form.addEventListener('ui-form-controller:success', (e) => {
  console.log('Форма отправлена!', e.detail);
  // Показываем уведомление, перенаправляем и т.д.
});

// Слушаем событие ошибки валидации
form.addEventListener('ui-form-controller:validation-error', (e) => {
  console.log('Ошибки валидации:', e.detail.errors);
});
```

**Неправильно:**

```javascript
// ❌ НЕ слушайте события для синхронизации состояния
// Состояние синхронизируется автоматически через ссылки!
input.addEventListener('ui-input-text:input', (e) => {
  // ❌ НЕ делайте так - значение уже синхронизировано
  field.setState({ value: e.detail.value });
});
```

### ✅ 3. Используйте конфигурации форм

**Правильно:**

```javascript
// app/forms/my-form.js
export const myFormConfig = {
  fields: [
    {
      id: 'email',
      type: 'text',
      label: 'Email',
      required: true,
      validation: {
        rules: ['required', 'email']
      }
    }
  ],
  actions: {
    submit: { label: 'Отправить' }
  },
  pipeline: {
    sanitize: true,
    validate: true,
    submit: async (values) => {
      // Отправка данных
    }
  }
};

// HTML
<ui-form-controller config-path="app.forms.myForm"></ui-form-controller>
```

**Неправильно:**

```javascript
// ❌ НЕ создавайте формы вручную в JavaScript
const form = document.createElement('ui-form-controller');
form.setState({ fields: [...] });  // Нарушает принцип декларативности
```

### ✅ 4. Работайте с полями через их API

**Правильно:**

```javascript
// Найти поле и работать с ним
const field = form.getField('email');
field.setValue('new@example.com');
field.setError('Некорректный email');
field.clearError();

// Или через DOM
const fieldEl = document.querySelector('ui-form-field[field-id="email"]');
fieldEl.setValue('new@example.com');
```

**Неправильно:**

```javascript
// ❌ НЕ обращайтесь напрямую к инпуту внутри поля
const input = document.querySelector('ui-input-text[name="email"]');
input.setState({ value: 'new@example.com' });  // Может не синхронизироваться с формой!
```

### ✅ 5. Очищайте ссылки при удалении компонента

**Правильно:**

```javascript
// text-input.js
disconnectedCallback() {
  // Очищаем ссылку на стейт родителя
  if (this.state._valueDescriptor) {
    delete this.state.value;
    delete this.state._valueDescriptor;
  }
  
  this._detachEvents();
}
```

---

## Anti-patterns

### ❌ 1. Прямое изменение state.values

**Проблема:**

```javascript
// ❌ НЕПРАВИЛЬНО
const form = document.querySelector('ui-form-controller');
form.state.values.email = 'new@example.com';
// Значение может не синхронизироваться с полями и инпутами!
```

**Решение:**

```javascript
// ✅ ПРАВИЛЬНО
const form = document.querySelector('ui-form-controller');
form.setFieldValue('email', 'new@example.com');
// Или
const field = form.getField('email');
field.setValue('new@example.com');
```

### ❌ 2. Использование событий для синхронизации состояния

**Проблема:**

```javascript
// ❌ НЕПРАВИЛЬНО
input.addEventListener('ui-input-text:input', (e) => {
  // Пытаемся синхронизировать вручную
  field.setState({ value: e.detail.value });
  form.setState({ values: { ...form.state.values, email: e.detail.value } });
});
// Это создает дублирование и риск рассинхронизации!
```

**Решение:**

```javascript
// ✅ ПРАВИЛЬНО
// Состояние синхронизируется автоматически через ссылки
// События нужны только для явных реакций (уведомления, логирование и т.д.)
input.addEventListener('ui-input-text:input', (e) => {
  console.log('Пользователь вводит:', e.detail.value);
  // Состояние уже синхронизировано автоматически!
});
```

### ❌ 3. Управление формой извне через setState

**Проблема:**

```javascript
// ❌ НЕПРАВИЛЬНО
const formController = document.querySelector('ui-form-controller');
formController.setState({
  values: { email: 'user@example.com', password: '123456' }
});
// Это нарушает архитектуру и может привести к рассинхронизации!
```

**Решение:**

```javascript
// ✅ ПРАВИЛЬНО
const formController = document.querySelector('ui-form-controller');
formController.setFieldValue('email', 'user@example.com');
formController.setFieldValue('password', '123456');

// Или через API полей
formController.getField('email').setValue('user@example.com');
formController.getField('password').setValue('123456');
```

### ❌ 4. Создание полей вручную в HTML

**Проблема:**

```html
<!-- ❌ НЕПРАВИЛЬНО -->
<ui-form-controller config-path="app.forms.signIn">
  <ui-form-field field-id="email">
    <ui-input-text name="email"></ui-input-text>
  </ui-form-field>
</ui-form-controller>
<!-- Поля должны рендериться автоматически из конфигурации! -->
```

**Решение:**

```html
<!-- ✅ ПРАВИЛЬНО -->
<ui-form-controller config-path="app.forms.signIn"></ui-form-controller>
<!-- Поля рендерятся автоматически из конфигурации -->
```

### ❌ 5. Обращение к инпутам напрямую, минуя поле

**Проблема:**

```javascript
// ❌ НЕПРАВИЛЬНО
const input = document.querySelector('ui-input-text[name="email"]');
input.setState({ value: 'new@example.com' });
// Это может не синхронизироваться с формой!
```

**Решение:**

```javascript
// ✅ ПРАВИЛЬНО
const field = document.querySelector('ui-form-field[field-id="email"]');
field.setValue('new@example.com');
// Или через форму
const form = document.querySelector('ui-form-controller');
form.setFieldValue('email', 'new@example.com');
```

### ❌ 6. Игнорирование типов значений

**Проблема:**

```javascript
// ❌ НЕПРАВИЛЬНО
// Для checkbox пытаемся установить строку
form.setFieldValue('remember', 'true');  // Должно быть boolean!

// Для select-multi пытаемся установить строку
form.setFieldValue('categories', 'cat1');  // Должно быть массив!
```

**Решение:**

```javascript
// ✅ ПРАВИЛЬНО
// Для checkbox
form.setFieldValue('remember', true);  // boolean

// Для select-multi
form.setFieldValue('categories', ['cat1', 'cat2']);  // array

// Для range
form.setFieldValue('priceRange', { min: 100, max: 500 });  // object
```

### ❌ 7. Перерисовка инпутов при вводе

**Проблема:**

```javascript
// ❌ НЕПРАВИЛЬНО
onStateChanged(key) {
  if (key === 'value') {
    this.render();  // Это приведет к потере фокуса!
  }
}
```

**Решение:**

```javascript
// ✅ ПРАВИЛЬНО
onStateChanged(key) {
  if (key === 'value' && this._inputEl) {
    // Обновляем только значение DOM элемента
    this._inputEl.value = this.state.value ?? '';
  }
  
  // Перерисовываем только при структурных изменениях
  if (['disabled', 'readonly', 'clearable'].includes(key)) {
    this.render();
  }
}
```

---

## Примеры использования

### Пример 1: Простая форма входа

```javascript
// app/forms/sign-in.js
export const signInFormConfig = {
  fields: [
    {
      id: 'email',
      type: 'text',
      label: 'Email',
      placeholder: 'Введите email',
      required: true,
      validation: {
        rules: ['required', 'email']
      }
    },
    {
      id: 'password',
      type: 'text',
      label: 'Пароль',
      placeholder: 'Введите пароль',
      required: true,
      validation: {
        rules: ['required', 'minLength:6']
      }
    }
  ],
  actions: {
    submit: { label: 'Войти' }
  },
  pipeline: {
    sanitize: true,
    validate: true,
    submit: async (values) => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(values)
      });
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Успешный вход!', data);
      window.location.href = '/dashboard';
    },
    onError: (error) => {
      console.error('Ошибка входа:', error);
    }
  }
};
```

```html
<!-- HTML -->
<ui-form-controller config-path="app.forms.signIn"></ui-form-controller>
```

### Пример 2: Работа с формой из JavaScript

```javascript
// Получить форму
const form = document.querySelector('ui-form-controller');

// Получить все значения
const values = form.getValues();
console.log(values); // { email: 'user@example.com', password: '123456' }

// Установить значение поля
form.setFieldValue('email', 'new@example.com');

// Получить конкретное поле
const emailField = form.getField('email');
console.log(emailField.value()); // 'new@example.com'

// Проверить валидность
if (form.isValid()) {
  form.submit();
} else {
  console.log('Форма невалидна');
}

// Сбросить форму
form.reset();

// Слушать события
form.addEventListener('ui-form-controller:success', (e) => {
  console.log('Форма отправлена!', e.detail);
});

form.addEventListener('ui-form-controller:validation-error', (e) => {
  console.log('Ошибки валидации:', e.detail.errors);
});
```

### Пример 3: Динамическое изменение формы

```javascript
// Получить форму
const form = document.querySelector('ui-form-controller');

// Добавить новое поле (если поддерживается API)
// Внимание: это может потребовать перерендера формы

// Изменить значение существующего поля
form.setFieldValue('email', 'new@example.com');

// Установить ошибку на поле
const emailField = form.getField('email');
emailField.setError('Некорректный email');

// Очистить ошибку
emailField.clearError();

// Отключить/включить поле
emailField.setState({ disabled: true });
emailField.setState({ disabled: false });
```

### Пример 4: Форма с разными типами полей

```javascript
// app/forms/registration.js
export const registrationFormConfig = {
  fields: [
    {
      id: 'email',
      type: 'text',
      label: 'Email',
      required: true
    },
    {
      id: 'age',
      type: 'number',
      label: 'Возраст',
      min: 18,
      max: 100
    },
    {
      id: 'remember',
      type: 'checkbox',
      label: 'Запомнить меня'
    },
    {
      id: 'priceRange',
      type: 'range',
      label: 'Диапазон цен',
      min: 0,
      max: 10000
    },
    {
      id: 'category',
      type: 'select-single',
      label: 'Категория',
      options: [
        { value: 'cat1', label: 'Категория 1' },
        { value: 'cat2', label: 'Категория 2' }
      ]
    },
    {
      id: 'tags',
      type: 'select-multi',
      label: 'Теги',
      options: [
        { value: 'tag1', label: 'Тег 1' },
        { value: 'tag2', label: 'Тег 2' }
      ]
    }
  ],
  actions: {
    submit: { label: 'Зарегистрироваться' }
  },
  pipeline: {
    sanitize: true,
    validate: true,
    submit: async (values) => {
      // values будет содержать:
      // {
      //   email: 'user@example.com',        // string
      //   age: 25,                          // number
      //   remember: true,                   // boolean
      //   priceRange: { min: 100, max: 500 }, // object
      //   category: 'cat1',                 // string
      //   tags: ['tag1', 'tag2']            // array
      // }
      return await fetch('/api/register', {
        method: 'POST',
        body: JSON.stringify(values)
      }).then(r => r.json());
    }
  }
};
```

---

## Использование форм в модальных окнах

### Атрибут `mode="modal"`

При использовании формы внутри модального окна используйте атрибут `mode="modal"`:

```html
<ui-modal title="Вход в аккаунт" size="medium">
  <ui-form-controller 
    config-path="window.app.forms.signIn"
    mode="modal"
  ></ui-form-controller>
</ui-modal>
```

**Что делает `mode="modal"`:**

1. ✅ **Не рендерит header** - использует title модального окна
2. ✅ **Рендерит actions как отдельный элемент** - автоматически перемещается в footer модального окна
3. ✅ **Рендерит только body с полями** и status

**Структура:**

```
ui-modal
├── header (title из модального окна, close button)
├── body
│   └── ui-form-controller
│       ├── status (сообщения)
│       └── body (поля)
└── footer (кнопки из формы автоматически перемещаются сюда)
```

**Подробнее:** См. [MODAL_INTEGRATION.md](./MODAL_INTEGRATION.md)

---

## Резюме

### Ключевые правила

1. ✅ **Используйте публичный API** компонентов (`getValue()`, `setValue()`, `reset()` и т.д.)
2. ✅ **Слушайте события только для явных реакций**, не для синхронизации состояния
3. ✅ **Используйте конфигурации форм** вместо ручного создания DOM
4. ✅ **Работайте с полями через их API**, не напрямую с инпутами
5. ✅ **Учитывайте типы значений** (boolean для checkbox, array для select-multi, object для range)
6. ✅ **Не перерисовывайте инпуты при вводе** - обновляйте только DOM элемент
7. ✅ **Используйте `mode="modal"`** для форм в модальных окнах

### Что НЕ делать

1. ❌ **НЕ изменяйте `state.values` напрямую** - используйте `setFieldValue()`
2. ❌ **НЕ используйте события для синхронизации** - состояние синхронизируется автоматически
3. ❌ **НЕ управляйте формой через `setState`** - используйте публичный API
4. ❌ **НЕ создавайте поля вручную в HTML** - они рендерятся из конфигурации
5. ❌ **НЕ обращайтесь к инпутам напрямую** - работайте через поля
6. ❌ **НЕ игнорируйте типы значений** - используйте правильные типы
7. ❌ **НЕ перерисовывайте инпуты при вводе** - обновляйте только DOM
8. ❌ **НЕ забывайте `mode="modal"`** при использовании формы в модальном окне

---

**Документ актуален на:** 2024  
**Версия архитектуры:** 2.0 (State Sharing by Reference)

