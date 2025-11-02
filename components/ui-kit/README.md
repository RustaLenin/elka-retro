# UI Kit Components

Структура компонентов UI-кита для интернет-магазина антикварных елочных игрушек.

## Принципы

- Zero-dependency (без внешних библиотек)
- Web Components без Shadow DOM
- ES6 модули
- Каждый компонент в отдельной папке с JS/CSS/Template файлами
- Инкапсуляция через CSS селекторы кастомных элементов
- Переиспользуемые компоненты выносятся по мере разработки

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

5. **button** - Кнопки различных типов
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

## Подключение стилей (принято)

Мы используем подход без Shadow DOM, а стили каждого компонента подключаются в `<head>` по требованию, один раз на страницу.

- Для этого есть хелпер `window.app.toolkit.loadCSSOnce(href)` (см. `app/app.js`).
- **ПРАВИЛО**: Стили загружаются при импорте модуля (top-level), а НЕ в `connectedCallback`.
- Это гарантирует, что стили всегда доступны, даже если компонент создается динамически до подключения к DOM.
- UI‑Kit компоненты подключаются на всех страницах в `components/components.js`.
- Специфичные для страниц компоненты подключаются условно на уровне PHP (шаблоны/`functions.php`).

Пример внутри компонента:
```js
// component-name.js
import { BaseElement } from '../base-element.js';

// ✅ ПРАВИЛЬНО: Загружаем стили при импорте модуля (top-level)
if (window.app && window.app.toolkit && window.app.toolkit.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./component-name-style.css', import.meta.url));
}

class UIComponentName extends BaseElement {
  connectedCallback() {
    // ❌ НЕПРАВИЛЬНО: window.app.toolkit.loadCSSOnce(...) здесь
    super.connectedCallback();
    // ... render
  }
}
customElements.define('ui-component-name', UIComponentName);
```

**Почему это важно:**
- Если компонент создается динамически через `document.createElement()` и сразу используется, стили могут не успеть загрузиться к моменту рендера.
- При импорте модуля top-level код выполняется сразу, гарантируя наличие стилей до первого использования.

Подключение компонентов из PHP:
- На стороне PHP формируется список нужных компонентов через фильтр `elkaretro_required_components`.
- Список попадает в DOM как JSON (`<script id="elkaretro-required-components" type="application/json">[...]</script>`).
- В `components/components.js` есть реестр и загрузчик, который импортирует только перечисленные компоненты.

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

  connectedCallback() {
    window.app.toolkit.loadCSSOnce(new URL('./button-style.css', import.meta.url));
    super.connectedCallback();
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

  connectedCallback() {
    window.app.toolkit.loadCSSOnce(new URL('./news-page-style.css', import.meta.url));
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
