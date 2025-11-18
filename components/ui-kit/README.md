# UI Kit Components

Структура компонентов UI-кита для интернет-магазина антикварных елочных игрушек.

## Принципы

- Zero-dependency (без внешних библиотек)
- Web Components без Shadow DOM
- ES6 модули
- Каждый компонент в отдельной папке с JS/CSS/Template файлами
- Инкапсуляция через CSS селекторы кастомных элементов
- Переиспользуемые компоненты выносятся по мере разработки
- **Классы расширяются, а не перезаписываются** - компоненты сохраняют дополнительные классы, установленные через атрибут `class`
- **Публичный API обязателен** - все компоненты предоставляют единый набор методов для внешнего взаимодействия (см. [Публичный API компонентов](#публичный-api-компонентов-критически-важное-правило))

## Структура компонентов

Каждый компонент должен иметь:
```
component-name/
  ├── component-name.js         # Web Component класс
  ├── component-name-template.js # Функция рендеринга HTML
  ├── component-name-style.css   # Стили компонента
```

## Планируемые компоненты

### Core (приоритет 1)
1. **loader** - Два типа загрузчиков:
   - `site-loader` - на всю страницу
   - `container-loader` - для конкретной области/блоков

2. **notify** + **notify-area** - Система уведомлений:
   - `notify-area` - контейнер для уведомлений
   - `notify` - отдельное уведомление (error, info, success)

3. **icon** - Уже есть, нужно доработать
   - Использует sprite из icon-sprite.js
   - Принимает атрибут `type`

4. **modal** - Модальные окна:
   - Header с заголовком
   - Content для контента
   - Footer с кнопками (confirm, cancel)
   - Событие `ui-modal:rendered` (срабатывает после рендера контейнера, удобно для отложенного `setBodyContent`)
   - Используется через глобальный менеджер `app.modal` (см. `app/modal-manager.js`)
   - Действия внутри модалок рекомендуется описывать декларативно через `data-app-action` и глобальную шину событий (см. [app/events/README.md](../../app/events/README.md))

5. **button** - Кнопки различных типов
   - Типы: `primary`, `secondary`, `warning`, `ghost`, `danger`
   - Поддержка иконок: `icon` (название иконки), `icon-position` (`left` или `right`)
   - Поддержка действий: `action`, `href`, `event`
   - Состояния: `loading`, `success`, `disabled`
6. **input** - Поля ввода
7. **form** - Обёртка для форм с валидацией

### Вспомогательные (приоритет 2)
8. **breadcrumbs** - Навигационная цепочка
9. **tag** / **badge** - Теги и бейджи
10. **select** - Выпадающие списки
11. **checkbox** / **radio** - Переключатели

## Использование

Все компоненты импортируются в `components/components.js` и автоматически регистрируются.

Пример использования:
```html
<ui-button type="primary">Купить</ui-button>
<ui-loader type="site"></ui-loader>
<ui-notify type="success">Товар добавлен в корзину</ui-notify>
```

## Стилизация Web Component как контейнера (КРИТИЧЕСКИ ВАЖНОЕ ПРАВИЛО)

**ПРАВИЛО**: Web Component сам является HTML элементом и контейнером для всего своего содержимого. Все стили контейнера (display, position, padding, border, background, width, max-width и т.д.) **ОБЯЗАТЕЛЬНО** должны применяться непосредственно к самому кастомному элементу (например, `ui-input-text`), а не к внутренним обёрткам.

**⚠️ КРИТИЧЕСКИ ВАЖНО:**
- **НЕ используй тот же класс, что и имя компонента, внутри компонента!**
  - ❌ `<ui-form-checkbox>` с `<label class="ui-form-checkbox">` внутри - **НЕПРАВИЛЬНО**
  - ✅ `<ui-form-checkbox>` с `<label class="ui-form-checkbox__label-wrapper">` внутри - **ПРАВИЛЬНО**
- Если нужен семантический элемент (`<label>`, `<article>`, `<button>`), используй `display: contents` для него, чтобы он не создавал дополнительный контейнер

**Почему это важно:**
- Web Component занимает место в DOM дереве и должен быть правильно стилизован как контейнер
- Избегаем лишней вложенности и дополнительных обёрток
- Компонент становится более гибким и предсказуемым в использовании
- Предотвращаем путаницу: стили применяются не к тому элементу

**Неправильно:**
```css
/* ❌ Плохо: стили контейнера на внутреннем элементе */
.ui-input-text {
  /* пусто или только max-width */
}

.ui-input-text__wrapper {
  display: flex;
  padding: 12px;
  border: 1px solid #000;
  background: #fff;
  /* стили контейнера здесь - НЕПРАВИЛЬНО */
}
```

**Правильно:**
```css
/* ✅ Хорошо: стили контейнера на самом компоненте */
/* ⚠️ ВАЖНО: Web Component - это элемент, а не класс! Селектор БЕЗ точки */
ui-input-text {
  display: flex;
  position: relative;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  background: var(--color-card);
  max-width: 600px;
  width: 100%;
  /* все стили контейнера здесь */
}

/* Внутренние классы используют точку (это действительно классы) */
.ui-input-text__control {
  flex: 1;
  border: none;
  /* стили для input */
}
```

**Если нужен семантический элемент (label, article, button):**
```html
<!-- ✅ ПРАВИЛЬНО: семантический label с display: contents -->
<ui-form-checkbox>
  <label class="ui-form-checkbox__label-wrapper">
    <input class="ui-form-checkbox__control" />
    <span class="ui-form-checkbox__box"></span>
  </label>
</ui-form-checkbox>
```

```css
/* ✅ ПРАВИЛЬНО: стили на веб-компоненте */
ui-form-checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Семантический label не создает контейнер */
ui-form-checkbox .ui-form-checkbox__label-wrapper {
  display: contents; /* ⚠️ Важно: label не создает дополнительный контейнер */
}
```

**⚠️ КРИТИЧЕСКИ ВАЖНО: Селекторы в CSS**

- **Web Component (кастомный элемент)**: БЕЗ точки
  ```css
  ui-input-text { }  /* ✅ Правильно - это элемент <ui-input-text> */
  .ui-input-text { } /* ❌ Неправильно - это класс, а не элемент */
  ```

- **Классы внутри компонента**: С точкой
  ```css
  .ui-input-text__wrapper { }  /* ✅ Правильно - это класс */
  .ui-input-text__control { }  /* ✅ Правильно - это класс */
  ```

**Если нужна обёртка:**
- Используйте обёртку только если она семантически необходима (например, `<label>` для связки с input)
- Но стили контейнера всё равно должны быть на самом Web Component

-**Проверенные компоненты:**
- ✅ `ui-button` - стили контейнера на элементе
- ✅ `ui-icon` - стили контейнера на элементе
- ✅ `ui-input-text` - стили контейнера на элементе (обёртка использует `display: contents`)
- ✅ `ui-input-number` - стили контейнера на элементе (обёртка использует `display: contents`)
- ✅ `ui-input-range` - стили контейнера на элементе (обёртка использует `display: contents`)
- ✅ `ui-select-single` - стили контейнера на элементе (триггер — flex-контейнер с `role="combobox"`)
- ✅ `ui-select-multi` - стили контейнера на элементе (триггер — flex-контейнер с `role="combobox"`)
- ✅ `ui-form-checkbox` - стили контейнера на элементе (уже правильно)
- ✅ `ui-segmented-toggle` - стили контейнера на элементе (обёртка использует `display: contents`)
- ✅ `ui-filter-chip` - стили контейнера на элементе (обёртка использует `display: contents`)

### ❗ Запрещены вложенные `<button>`

HTML не допускает кнопку внутри кнопки — браузер автоматически «выталкивает» вложенный `<button>` из DOM, что ломает структуру и стили (мы столкнулись с этим в `ui-select-multi`, когда кнопка удаления чипса оказывалась вне триггера). Поэтому:

- Триггеры селектов (`ui-select-single` и `ui-select-multi`) реализованы на нейтральных контейнерах (`<div role="combobox">`) с `tabindex`, а не на `<button>`.
- Внутри триггера можно безопасно размещать другие интерактивные элементы (`<button>` для удаления чипса и пр.) без риска, что браузер изменит DOM.
- При создании новых компонентов убедитесь, что ни один `<button>` не попадает внутрь другого. Если нужен кликабельный контейнер, используйте `div/span` с `role` и `tabindex`.

## Подключение стилей (ОБЯЗАТЕЛЬНОЕ ПРАВИЛО)

### ⚠️ КРИТИЧЕСКИ ВАЖНО: Стили должны загружаться СРАЗУ при импорте JS модуля

**ПРАВИЛО**: Стили **ВСЕГДА** загружаются при импорте модуля (top-level код), а **НИКОГДА** в `connectedCallback`, `constructor` или других методах жизненного цикла компонента.

Мы используем подход без Shadow DOM, а стили каждого компонента подключаются в `<head>` по требованию, один раз на страницу через хелпер `window.app.toolkit.loadCSSOnce(href)` (см. `app/app.js`).

### Правильная структура компонента:

```js
// component-name.js
import { BaseElement } from '../base-element.js';

// ✅ ПРАВИЛЬНО: Загружаем стили при импорте модуля (top-level)
if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./component-name-styles.css', import.meta.url));
}

export class UIComponentName extends BaseElement {
  static stateSchema = {
    // ... schema
  };

  constructor() {
    super();
  }

  connectedCallback() {
    // ❌ НЕПРАВИЛЬНО: window.app.toolkit.loadCSSOnce(...) здесь
    // Стили уже должны быть загружены к этому моменту!
    super.connectedCallback();
    this.render();
  }

  render() {
    // ... render logic
  }
}

customElements.define('ui-component-name', UIComponentName);
```

### ✅ Что правильно:

1. **Загрузка стилей при импорте (top-level)**:
   ```js
   // В начале файла, сразу после импортов
   if (window.app?.toolkit?.loadCSSOnce) {
     window.app.toolkit.loadCSSOnce(new URL('./component-styles.css', import.meta.url));
   }
   ```

2. **Опциональная проверка с optional chaining**:
   ```js
   if (window.app?.toolkit?.loadCSSOnce) { ... }
   ```

### ❌ Что неправильно:

1. **Загрузка стилей в `connectedCallback`**:
   ```js
   connectedCallback() {
     // ❌ НЕПРАВИЛЬНО
     window.app.toolkit.loadCSSOnce(new URL('./component-styles.css', import.meta.url));
     super.connectedCallback();
   }
   ```

2. **Загрузка стилей в `constructor`**:
   ```js
   constructor() {
     // ❌ НЕПРАВИЛЬНО
     window.app.toolkit.loadCSSOnce(...);
     super();
   }
   ```

3. **Загрузка стилей в методах класса**:
   ```js
   show() {
     // ❌ НЕПРАВИЛЬНО
     window.app.toolkit.loadCSSOnce(...);
   }
   ```

### Почему это критически важно:

1. **Динамическое создание компонентов**: Если компонент создается через `document.createElement()` и сразу используется, стили могут не успеть загрузиться к моменту рендера, что приведет к FOUC (Flash of Unstyled Content).

2. **Гарантированная доступность**: При импорте модуля top-level код выполняется сразу, гарантируя наличие стилей до первого использования компонента.

3. **Производительность**: Стили загружаются один раз при импорте, а не при каждом подключении компонента к DOM.

4. **Предсказуемость**: Все стили загружены заранее, нет риска race conditions между загрузкой стилей и рендерингом компонента.

### Проверка всех компонентов:

Все компоненты UI-Kit должны загружать стили при импорте. Проверка выполнена для:
- ✅ `button.js`
- ✅ `icon.js`
- ✅ `loader.js`
- ✅ `tooltip.js`
- ✅ `notification.js`
- ✅ `modal.js`
- ✅ `image-gallery.js`
- ✅ Все компоненты формы (`form-controller`, `form-field`, `text-input`, `number-input`, и т.д.)

### UI‑Kit компоненты:

- UI‑Kit компоненты подключаются на всех страницах в `components/components.js`.
- Специфичные для страниц компоненты подключаются условно на уровне PHP (шаблоны/`functions.php`).

Подключение компонентов из PHP:
- На стороне PHP формируется список нужных компонентов через фильтр `elkaretro_required_components`.
- Список попадает в DOM как JSON (`<script id="elkaretro-required-components" type="application/json">[...]</script>`).
- В `components/components.js` есть реестр и загрузчик, который импортирует только перечисленные компоненты.

## Декларативные действия и шина событий

Для единообразного управления поведением UI используем `data-app-action` + `app.events`:

- Любой интерактивный элемент объявляет действие:  
  `<button data-app-action="user.showSignInModal">Войти</button>`
- Формат значения: `namespace.action`. Обработчики регистрируются в сервисах:  
  `app.events.register('user', { showSignInModal(context) { ... } });`
- Дополнительные атрибуты:
  - `data-app-payload='{"source":"header"}'` — JSON, доступный как `context.payload`;
  - `data-app-prevent-default="false"` — если нужно оставить нативное поведение ссылки;
  - `data-app-stop="true"` — останавливает всплытие события.
- Глобальный делегат (`app/app.js`) сам перехватывает клики по элементам с `data-app-action` и вызывает шину, поэтому внутри компонентов UI не навешиваем `addEventListener` ради вызова сервисов/модалок.
- Если действие требуется до инициализации `app.events`, допускается fallback на прямой вызов сервиса, но основное взаимодействие должно быть через событие.

Полный список правил и API: [`app/events/README.md`](../../app/events/README.md).

## Стили

Каждый компонент использует CSS переменные из `style.css`:
- Цвета: `--color-primary`, `--color-accent`, etc.
- Отступы, размеры и т.д.

## Типы компонентов и контракт

Мы используем единую схему состояния (state schema) и базовый контракт для двух типов компонентов:
- Статичные: данные из атрибутов или дефолтов
- Автономные: минимальные атрибуты (например, `id`) + данные из WP REST API

### Схема состояния
Свойства описываются в `static stateSchema` как единый источник правды:
```js
static stateSchema = {
  type:     { type: 'string',  default: 'primary',
              attribute: { name: 'type', observed: true, reflect: true } },
  disabled: { type: 'boolean', default: false,
              attribute: { name: 'disabled', observed: true, reflect: true } },
  options:  { type: 'json',    default: [], attribute: null }, // только JS
  loading:  { type: 'boolean', default: false, attribute: null, internal: true },
};
```
- `type`: 'string' | 'number' | 'boolean' | 'json'
- `attribute`: null или `{ name, observed, reflect }`
- `internal: true` — свойство не управляется извне

### Базовый контракт (суть)
- `observedAttributes` формируется автоматически из схемы
- Инициализация: атрибуты → state (с приведением типов)
- `setState(partial)` обновляет state и, при `reflect`, синхронизирует атрибут
- Рендер вызывается при изменениях state

Минимальный шаблон использования:
```js
class UIButton extends BaseElement {
  static stateSchema = {
    type: { type: 'string', default: 'primary',
            attribute: { name: 'type', observed: true, reflect: true } },
    disabled: { type: 'boolean', default: false,
                attribute: { name: 'disabled', observed: true, reflect: true } },
    text: { type: 'string', default: '',
            attribute: { name: 'text', observed: true, reflect: true } },
  };

  // Стили загружаются при импорте модуля (см. начало файла)
  connectedCallback() {
    super.connectedCallback();
    this.render();
  }

  render() {
    // this.state: { type, disabled, text }
  }
}
customElements.define('ui-button', UIButton);
```

### Автономный компонент (REST)
```js
class UINewsPage extends BaseElement {
  static stateSchema = {
    id: { type: 'number', default: null,
          attribute: { name: 'id', observed: true, reflect: true } },
    data: { type: 'json', default: null, attribute: null, internal: true },
    loading: { type: 'boolean', default: false, attribute: null, internal: true },
    error: { type: 'string', default: null, attribute: null, internal: true },
  };

  // Стили загружаются при импорте модуля (см. начало файла)
  connectedCallback() {
    super.connectedCallback();
    this.loadData();
  }

  async loadData() {
    const { id } = this.state; if (!id) return;
    this.setState({ loading: true, error: null });
    try {
      const res = await fetch(`/wp-json/wp/v2/posts/${id}`, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      this.setState({ data: json });
    } catch (e) {
      this.setState({ error: e.message || 'Error' });
    } finally {
      this.setState({ loading: false });
    }
  }

  onStateChanged(key) { if (key === 'id') this.loadData(); }
  render() { /* loading/error/data UI */ }
}
customElements.define('news-page', UINewsPage);
```

## State и Props

Компоненты получают данные через:
1. HTML атрибуты (статичные данные)
2. JavaScript state (динамические данные)
3. Event listeners для интерактивности

## Публичный API компонентов (КРИТИЧЕСКИ ВАЖНОЕ ПРАВИЛО)

### ⚠️ Обязательное правило: Все компоненты должны предоставлять публичный API

**ПРАВИЛО**: Компоненты UI-Kit **ВСЕГДА** должны предоставлять публичные методы для внешнего взаимодействия, вместо прямого доступа к внутреннему `state`.

### Зачем нужен публичный API

1. **Инкапсуляция**: Внутренняя реализация скрыта от внешнего кода
2. **Контроль**: Компонент сам управляет своим состоянием и валидацией
3. **Синхронизация**: Публичные методы гарантируют корректную синхронизацию состояния
4. **Расширяемость**: Легко добавлять новую логику без изменения внешнего API
5. **Отладка**: Централизованное место для логирования и отладки

### ✅ Правильно: Используйте публичный API

```javascript
// ✅ ПРАВИЛЬНО: Использование публичного API
const form = document.querySelector('ui-form-controller');
const allValues = form.getValues();              // Получить все значения
const emailValue = form.getFieldValue('email');  // Получить значение поля
form.setFieldValue('email', 'new@example.com');  // Установить значение
form.reset();                                     // Сбросить форму
if (form.isValid()) {                            // Проверить валидность
  form.submit();                                 // Отправить форму
}

const field = document.querySelector('ui-form-field[field-id="email"]');
const value = field.value();                     // Получить значение
field.setValue('new@example.com');              // Установить значение
field.setError('Некорректный email');           // Установить ошибку
field.clearError();                              // Очистить ошибку
field.reset();                                   // Сбросить поле
```

### ❌ Неправильно: Прямой доступ к state

```javascript
// ❌ НЕПРАВИЛЬНО: Прямой доступ к state
const form = document.querySelector('ui-form-controller');
form.state.values.email = 'new@example.com';  // Может не синхронизироваться!
form.setState({ values: { email: 'new@example.com' } });  // Нарушает архитектуру!

const field = document.querySelector('ui-form-field[field-id="email"]');
field.state.value = 'new@example.com';  // Может не синхронизироваться с формой!
```

### Стандартные методы для компонентов UI-Kit

#### Для компонентов с значениями (inputs, selects, etc.)

```javascript
class UIInputText extends BaseElement {
  // ✅ Публичный API
  value() {
    // Получить текущее значение
    return this.state.value ?? '';
  }

  setValue(value) {
    // Установить значение (с валидацией и синхронизацией)
    this.state.value = value;
    this._updateDOM();
    return this; // Возвращаем this для цепочки вызовов
  }

  reset() {
    // Сбросить к дефолтному значению
    this.setValue(this.state.defaultValue ?? '');
    this.setState({ dirty: false, touched: false });
    return this;
  }

  isValid() {
    // Проверить валидность
    return !this.state.status || this.state.status !== 'error';
  }

  // ❌ НЕ делать методы приватными, если они нужны снаружи
  // _value() { ... }  // ❌ Неправильно
}
```

#### Для контейнерных компонентов (forms, field wrappers)

```javascript
class UIFormController extends BaseElement {
  // ✅ Публичный API
  getValues() {
    // Получить все значения
    return this._getFieldValues();
  }

  getFieldValue(fieldId) {
    // Получить значение конкретного поля
    const field = this.getField(fieldId);
    return field ? field.value() : null;
  }

  setFieldValue(fieldId, value) {
    // Установить значение поля
    const field = this.getField(fieldId);
    if (field) {
      field.setValue(value);
    }
    return this; // Возвращаем this для цепочки вызовов
  }

  getField(fieldId) {
    // Получить поле по ID
    return this.querySelector(`ui-form-field[field-id="${fieldId}"]`) || null;
  }

  getFields() {
    // Получить все поля
    return Array.from(this.querySelectorAll('ui-form-field'));
  }

  reset() {
    // Сбросить все поля
    this.getFields().forEach(field => field.reset());
    return this;
  }

  isValid() {
    // Проверить валидность всех полей
    return this.getFields().every(field => field.isValid());
  }

  async submit() {
    // Отправить форму
    // ...
  }
}
```

### Правила именования публичных методов

1. **Геттеры**: `value()`, `getValue()`, `getValues()`, `getField()`, `getFields()`
   - Имена с `get` предпочтительны для коллекций или сложных объектов
   - Имена без префикса для простых значений (`value()`)

2. **Сеттеры**: `setValue(value)`, `setFieldValue(fieldId, value)`, `setError(message)`
   - Всегда с префиксом `set`
   - Принимают параметры

3. **Проверки**: `isValid()`, `isDirty()`, `isLoading()`, `hasError()`
   - Префикс `is` для boolean значений
   - Префикс `has` для проверки наличия чего-либо

4. **Действия**: `reset()`, `submit()`, `clear()`, `focus()`, `blur()`
   - Глаголы без префикса
   - Возвращают `this` для цепочки вызовов (chaining)

### Возвращаемые значения

- **Геттеры**: Возвращают значение (примитив, объект, массив, null/undefined)
- **Сеттеры**: Возвращают `this` для цепочки вызовов
- **Действия**: Возвращают `this` или `Promise` (для асинхронных операций)
- **Проверки**: Возвращают `boolean`

### Примеры цепочки вызовов (method chaining)

```javascript
// ✅ Цепочка вызовов благодаря return this
form
  .setFieldValue('email', 'user@example.com')
  .setFieldValue('password', '123456')
  .reset();

field
  .setValue('new@example.com')
  .setError('Некорректный email')
  .clearError();
```

### События vs Публичный API

**События** нужны для **явных реакций** (уведомления, логирование, UI обновления):

```javascript
// ✅ Правильно: События для реакций
form.addEventListener('ui-form:success', (e) => {
  console.log('Форма отправлена!', e.detail);
  showNotification('Успешно!');
});

input.addEventListener('ui-input-text:change', (e) => {
  console.log('Пользователь изменил значение:', e.detail.value);
});
```

**Публичный API** нужен для **управления компонентом**:

```javascript
// ✅ Правильно: API для управления
form.setFieldValue('email', 'user@example.com');
form.submit();
field.reset();
```

**❌ НЕ используйте события для синхронизации состояния** - состояние синхронизируется автоматически через ссылки (см. [ARCHITECTURE.md](./form/controller/ARCHITECTURE.md)).

### Anti-patterns

#### ❌ 1. Прямое изменение state

```javascript
// ❌ НЕПРАВИЛЬНО
component.state.value = 'new value';
component.setState({ value: 'new value' }); // Для значений - использовать API
```

#### ❌ 2. Доступ к приватным методам

```javascript
// ❌ НЕПРАВИЛЬНО
component._internalMethod(); // Приватные методы с _ не должны вызываться извне
```

#### ❌ 3. Использование событий для синхронизации

```javascript
// ❌ НЕПРАВИЛЬНО
input.addEventListener('ui-input-text:input', (e) => {
  field.setState({ value: e.detail.value }); // Состояние уже синхронизировано!
});
```

### Статус рефакторинга компонентов

#### ✅ Компоненты форм (РЕАЛИЗОВАНЫ)

Все компоненты форм имеют единый публичный API:

1. ✅ **`ui-form-controller`** - реализован
   - `getValues()`, `getFieldValue()`, `setFieldValue()`, `getField()`, `getFields()`
   - `reset()`, `isValid()`, `isDirty()`, `submit()`, `clear()`

2. ✅ **`ui-form-field`** - реализован
   - `value()`, `setValue()`, `reset()`, `isValid()`, `isDirty()`
   - `setError()`, `clearError()`

3. ✅ **`ui-input-text`** - реализован
   - `value()`, `setValue()`, `reset()`, `isValid()`, `focus()`, `blur()`

4. ✅ **`ui-input-number`** - реализован
   - `value()`, `setValue()`, `reset()`, `isValid()`, `focus()`, `blur()`

5. ✅ **`ui-input-range`** - реализован
   - `value()`, `setValue()`, `reset()`, `isValid()`

6. ✅ **`ui-select-single`** - реализован
   - `value()`, `setValue()`, `reset()`, `isValid()`, `open()`, `close()`

7. ✅ **`ui-select-multi`** - реализован
   - `value()`, `setValue()`, `reset()`, `isValid()`, `open()`, `close()`, `selectAll()`, `clear()`

8. ✅ **`ui-form-checkbox`** - реализован
   - `value()`, `setValue()`, `reset()`, `isValid()`, `toggle()`, `check()`, `uncheck()`

9. ✅ **`ui-segmented-toggle`** - реализован
   - `value()`, `setValue()`, `reset()`, `isValid()`

10. ✅ **`ui-filter-chip`** - реализован
    - `value()`, `setValue()`, `reset()`, `remove()`

11. ✅ **`ui-filters-summary`** - реализован
    - `getFilters()`, `clear()`, `hasFilters()`, `update()`

#### ✅ Компоненты общего назначения (РЕАЛИЗОВАНЫ)

Все компоненты UI-Kit имеют единый публичный API:

1. ✅ **`ui-button`** - реализован
   - `click()`, `setLoading()`, `setSuccess()`, `setDisabled()`
   - `reset()`, `isLoading()`, `isSuccess()`, `isDisabled()`

2. ✅ **`ui-modal`** - реализован
   - `isVisible()`, `isLoading()`, `title()`, `setTitle()`, `size()`, `setSize()`
   - `setClosable()`, `setApiUrl()`, `reset()`

3. ✅ **`ui-image-gallery`** - реализован
   - `getCurrentImage()`, `getCurrentIndex()`, `getImages()`, `getImageCount()`
   - `next()`, `prev()`, `goTo()`
   - `openFullscreen()`, `closeFullscreen()`, `toggleFullscreen()`, `isFullscreen()`
   - `isLoading()`, `reset()`

4. ✅ **`ui-notification`** - реализован
   - `type()`, `message()`, `setType()`, `setMessage()`, `update()`
   - `close()`, `extendDuration()`

5. ✅ **`ui-icon`** - реализован
   - `name()`, `setName()`, `setSize()`, `setSpin()`, `toggleSpin()`, `reset()`

6. ✅ **`block-loader`** - реализован
   - `isVisible()`, `label()`, `spinDuration()`, `fadeInDuration()`, `fadeOutDuration()`
   - `reset()`

**Подробнее о рефакторинге**:
- **Компоненты форм**: См. [REFACTORING_API.md](./REFACTORING_API.md)
- **Компоненты общего назначения**: См. [REFACTORING_API_OTHER.md](./REFACTORING_API_OTHER.md)

### Примеры использования публичного API

#### Работа с компонентами форм

```javascript
// Форма
const form = document.querySelector('ui-form-controller');
const values = form.getValues();
form.setFieldValue('email', 'user@example.com');
if (form.isValid()) {
  await form.submit();
}

// Поля
const field = form.getField('email');
const value = field.value();
field.setValue('new@example.com').setError('Некорректный email');

// Инпуты
const input = document.querySelector('ui-input-text');
input.setValue('text').focus();
const number = document.querySelector('ui-input-number');
number.setValue(100).reset();

// Селекты
const select = document.querySelector('ui-select-single');
select.setValue('option1').open();
const multiSelect = document.querySelector('ui-select-multi');
multiSelect.setValue(['opt1', 'opt2']).selectAll();

// Чекбоксы и переключатели
const checkbox = document.querySelector('ui-form-checkbox');
checkbox.toggle().check();
const toggle = document.querySelector('ui-segmented-toggle');
toggle.setValue('mode1');
```

#### Работа с компонентами общего назначения

```javascript
// Кнопки
const button = document.querySelector('ui-button');
button.setLoading(true);
await button.click();
button.setSuccess(true).reset();

// Модальные окна
const modal = document.querySelector('ui-modal');
modal.setTitle('Заголовок').setSize('large').show();
if (modal.isVisible()) {
  await modal.setApiUrl('/api/data');
}

// Галерея изображений
const gallery = document.querySelector('ui-image-gallery');
const currentImage = gallery.getCurrentImage();
gallery.next().openFullscreen();
gallery.goTo(5).closeFullscreen();

// Уведомления
const notification = notify('success', 'Операция выполнена!');
notification.update('error', 'Ошибка!').extendDuration(3000);
notification.close();

// Иконки
const icon = document.querySelector('ui-icon');
icon.setName('check').setSize('large').toggleSpin();

// Лоадеры
const loader = document.querySelector('block-loader');
loader.setLabel('Загрузка...').show();
if (loader.isVisible()) {
  console.log('Лоадер активен');
}
```

### Связанная документация

- **Архитектура форм**: См. [form/controller/ARCHITECTURE.md](./form/controller/ARCHITECTURE.md)
- **Best Practices**: См. [form/controller/ARCHITECTURE.md#best-practices](./form/controller/ARCHITECTURE.md#best-practices)
- **Anti-patterns**: См. [form/controller/ARCHITECTURE.md#anti-patterns](./form/controller/ARCHITECTURE.md#anti-patterns)
- **Рефакторинг форм**: См. [REFACTORING_API.md](./REFACTORING_API.md)
- **Рефакторинг общего назначения**: См. [REFACTORING_API_OTHER.md](./REFACTORING_API_OTHER.md)

## Кастомизация через классы

### ⚠️ КРИТИЧЕСКИ ВАЖНО: Классы должны расширяться, а не перезаписываться

**Правило:** При реализации метода `render()` в компонентах UI-Kit **всегда сохраняйте дополнительные классы**, установленные через атрибут `class`.

Это позволяет использовать компоненты UI-Kit с кастомными классами для специфичной стилизации:

```html
<ui-button type="primary" class="cart-item_remove-btn">Удалить</ui-button>
```

### Правильная реализация

```javascript
render() {
  const { type } = this.state;
  
  // 1. Сохраняем дополнительные классы перед установкой базовых
  const preservedClasses = Array.from(this.classList).filter(cls => 
    cls !== 'ui-button' &&           // базовый класс компонента
    cls !== 'primary' &&              // типы кнопок
    cls !== 'secondary' &&
    cls !== 'warning' &&
    cls !== 'ghost' &&
    cls !== 'danger' &&
    !cls.startsWith('ui-button--')   // модификаторы компонента
  );
  
  // 2. Устанавливаем базовые классы
  this.className = `ui-button ${type}`;
  
  // 3. Восстанавливаем сохраненные классы
  preservedClasses.forEach(cls => {
    if (cls) {
      this.classList.add(cls);
    }
  });
  
  // ... остальной код рендеринга
}
```

### ❌ Неправильно

```javascript
render() {
  const { type } = this.state;
  // ❌ Перезаписывает все классы, включая кастомные
  this.className = `ui-button ${type}`;
}
```

### Почему это важно

1. **Гибкость стилизации** - позволяет добавлять специфичные стили для конкретных контекстов
2. **Не нарушает функциональность** - базовые классы компонента сохраняются
3. **Соответствует принципам UI-Kit** - компоненты должны быть расширяемыми

### Примеры использования

```html
<!-- Кастомная стилизация кнопки в контексте корзины -->
<ui-button type="danger" class="cart-item_remove-btn">Удалить</ui-button>

<!-- Кастомная стилизация модального окна -->
<ui-modal size="large" class="custom-modal">Содержимое</ui-modal>
```

В CSS можно использовать специфичные селекторы:

```css
/* Стили для кнопки в контексте cart-item */
cart-item ui-button.cart-item_remove-btn {
  margin-right: 1rem;
  font-size: 0.875rem;
}
```
