# Анализ Legacy кода от старого подхода к формам

## Обнаруженные проблемы

### 1. **sort-control.js** - Старый подход ❌

**Проблемы:**
- Использует `innerHTML` для рендеринга, затем ищет элементы через `querySelector`
- Использует `setState()` для установки опций и значений (строки 86-87, 146-150)
- Сложная логика ожидания инициализации через Promise и retry
- Ручное управление элементами вместо автоматической синхронизации

**Проблема в шаблоне:**
- `sort-control-template.js` рендерит `<ui-form-field>` с `<ui-select-single>` внутри
- Но это **НЕ** внутри `<ui-form-controller>`!
- Это может вызывать проблемы с инициализацией, так как `ui-form-field` ожидает родительскую форму

**Что делать:**
1. **Вариант А (рекомендуемый):** Убрать `ui-form-field`, оставить только `ui-select-single` напрямую
   - Сортировка не является частью формы фильтров
   - Это отдельный компонент в toolbar
   - Упростит код и исправит проблему с инициализацией

2. **Вариант Б:** Обернуть в отдельную форму с `ui-form-controller`
   - Создать конфигурацию формы для сортировки в `app/forms/`
   - Использовать `config-path`
   - Но это может быть избыточно для одного поля

**Рекомендация:** Вариант А - убрать `ui-form-field`, работать напрямую с `ui-select-single`

---

### 2. **search-box.js** - Частично старый подход ⚠️

**Проблемы:**
- Использует `setState()` для `inputElement` (строка 236-237)
- Использует `setState()` для `submitButton` (строки 90-91, 119-120, 130-131)

**Анализ:**
- `ui-input-text` и `ui-button` - это не формы, а отдельные компоненты
- Использование `setState()` для отдельных компонентов может быть допустимо
- Но лучше использовать публичный API или атрибуты напрямую

**Что делать:**
- Проверить, есть ли у `ui-input-text` и `ui-button` публичные методы `setValue()` или лучше использовать `setAttribute()`

---

### 3. **mode-toggle.js** - Частично старый подход ⚠️

**Проблемы:**
- Использует `setState()` для `toggleElement` (строки 89-90)

**Анализ:**
- `ui-segmented-toggle` - отдельный компонент
- Использование `setState()` может быть допустимо для отдельных компонентов
- Но лучше проверить, есть ли публичный API

---

### 4. **filters-summary.js** - Старый подход ❌

**Проблемы:**
- Использует `createElement()` и `appendChild()` для создания `ui-filters-summary` (строки 235, 244)
- Ручное управление элементом

**Анализ:**
- Это Web Component, который можно просто добавить через `innerHTML`
- Не нужно использовать `createElement()` и `appendChild()`

**Что делать:**
- Заменить на `innerHTML` с шаблоном

---

## Проблема с фильтрами в sidebar

**По скриншоту:**
- Фильтры не отображаются, хотя логи говорят "Filters rendered successfully"
- В консоли есть ошибка с `ui-select-single` в sort-control

**Возможные причины:**
1. `ui-form-controller` не рендерит поля автоматически (нужно проверить метод `render()`)
2. Поля рендерятся, но невидимы из-за CSS
3. Ошибка при инициализации конфигурации

**Что проверить:**
1. Проверить метод `render()` в `ui-form-controller.js`
2. Проверить, правильно ли работает `config-path` загрузка
3. Проверить консоль на ошибки при рендеринге полей

---

## План исправлений

### Приоритет 1 (Критично):
1. ✅ Исправить `sort-control.js` - убрать `ui-form-field`, работать напрямую с `ui-select-single`
2. ✅ Проверить и исправить рендеринг фильтров в `catalog-sidebar.js`

### Приоритет 2 (Важно):
3. ✅ Исправить `filters-summary.js` - использовать `innerHTML` вместо `createElement`
4. ⚠️ Проверить `search-box.js` и `mode-toggle.js` - возможно оставить как есть, если работает

---

## Детальные исправления

### 1. sort-control.js

**Текущий код:**
```javascript
// Шаблон рендерит:
<ui-form-field field-id="catalog_sort" label="Сортировка">
  <ui-select-single ...></ui-select-single>
</ui-form-field>

// Код ищет:
selectElement = container.querySelector('ui-select-single');
selectElement.setState({ options: sortOptions });
```

**Исправление:**
```javascript
// Шаблон должен рендерить:
<div class="catalog-sort-control" data-sort-control>
  <label>Сортировка</label>
  <ui-select-single ...></ui-select-single>
</div>

// Или просто:
<ui-select-single label="Сортировка" ...></ui-select-single>

// Код использует атрибуты:
selectElement.setAttribute('options', JSON.stringify(sortOptions));
selectElement.setAttribute('value', currentSort);
```

### 2. filters-summary.js

**Текущий код:**
```javascript
summaryElement = document.createElement('ui-filters-summary');
container.appendChild(summaryElement);
```

**Исправление:**
```javascript
container.innerHTML = '<ui-filters-summary></ui-filters-summary>';
summaryElement = container.querySelector('ui-filters-summary');
```

