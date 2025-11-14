# План рефакторинга форм каталога на новую архитектуру

## Обзор изменений

Каталог использует старый подход к работе с формами:
- Программное создание `ui-form-controller` через `document.createElement`
- Установка конфигурации через `setState({ fields, values, autosubmit, pipeline })`
- Ручное создание `ui-form-field` элементов и контролов в JavaScript
- Прямая работа с `state.values` для синхронизации

**Новая архитектура требует:**
- Конфигурации форм в `app/forms/` или динамическая регистрация в `window.app.forms`
- Использование атрибута `config-path` для загрузки конфигурации
- Автоматический рендеринг полей из конфигурации (без ручного создания)
- Использование публичного API (`getField()`, `setFieldValue()`, `getValues()`) вместо прямого доступа к `state.values`
- Синхронизация через ссылки (Object.defineProperty), а не через события

## Детальный план рефакторинга

### Этап 1: Создание фабрики конфигураций

**Файл:** `app/forms/catalog-filters-factory.js`

Создать модуль, который динамически генерирует конфигурацию формы фильтров на основе:
- Режима каталога (`type` | `instance`)
- Конфигураций фильтров из `filter-registry.js`
- Текущих значений фильтров из `window.app.catalog.getState()`

**Структура:**
```javascript
/**
 * Фабрика конфигураций форм фильтров каталога
 * 
 * Генерирует конфигурацию формы динамически на основе:
 * - Режима каталога (type/instance)
 * - Доступных полей из data-model.json
 * - Текущих значений фильтров
 */
export async function createCatalogFiltersFormConfig(mode, currentFilters = {}) {
  // 1. Загрузить конфигурации фильтров для режима
  // 2. Преобразовать в конфигурацию полей формы
  // 3. Нормализовать текущие значения фильтров
  // 4. Создать pipeline с интеграцией window.app.catalog
  // 5. Вернуть полную конфигурацию
}
```

**Особенности:**
- Асинхронная загрузка опций для `relationship` полей
- Нормализация значений (массивы для select-multi, строки для select-single)
- Pipeline использует `window.app.catalog.setFilters()` вместо прямого доступа к `state.values`

### Этап 2: Регистрация конфигурации в window.app.forms

**Файл:** `components/catalog/sidebar/catalog-sidebar.js`

В методе `updateFiltersForMode()`:
1. Сгенерировать конфигурацию через фабрику
2. Зарегистрировать в `window.app.forms.catalogFilters` (или динамический ключ)
3. Использовать `config-path` в шаблоне формы

**Изменения:**
```javascript
// БЫЛО:
const formController = document.createElement('ui-form-controller');
formController.setState({ fields, values, autosubmit, pipeline });

// СТАНЕТ:
// 1. Генерируем конфигурацию
const config = await createCatalogFiltersFormConfig(mode, currentFilters);
// 2. Регистрируем в window.app.forms
window.app.forms.catalogFilters = config;
// 3. Рендерим с config-path
this.filtersContainer.innerHTML = `
  <ui-form-controller config-path="window.app.forms.catalogFilters"></ui-form-controller>
`;
```

### Этап 3: Удаление ручного создания полей и контролов

**Файл:** `components/catalog/sidebar/catalog-sidebar.js`

**Удалить:**
- Метод `_createFieldControl()` - поля рендерятся автоматически из конфигурации
- Ручное создание `ui-form-field` элементов
- Ручное добавление контролов в поля
- Логику ожидания инициализации кастомных элементов для полей

**Оставить:**
- Ожидание инициализации `ui-form-controller` (для подключения обработчиков событий)

### Этап 4: Переделка syncFormValues через публичный API

**Файл:** `components/catalog/sidebar/catalog-sidebar.js`

**БЫЛО:**
```javascript
syncFormValues(filters) {
  // Прямая работа с state.values
  this.formController.setState({ values: { ... } });
}
```

**СТАНЕТ:**
```javascript
syncFormValues(filters) {
  if (!this.formController) return;
  
  // Используем публичный API
  Object.entries(filters).forEach(([filterKey, values]) => {
    const fieldId = getFieldIdFromFilterKey(filterKey);
    const field = this.formController.getField(fieldId);
    
    if (field) {
      // Нормализуем значение в зависимости от типа поля
      const normalizedValue = normalizeFilterValue(values, fieldConfig.type);
      field.setValue(normalizedValue);
    }
  });
}
```

### Этап 5: Переделка loadRelationshipOptions через публичный API

**Файл:** `components/catalog/sidebar/catalog-sidebar.js`

**БЫЛО:**
```javascript
const selectElement = this.formController.querySelector(`ui-select-single[data-field-id="${field.id}"]`);
selectElement.setState({ options });
```

**СТАНЕТ:**
```javascript
const field = this.formController.getField(field.id);
if (field) {
  const control = field.querySelector('ui-select-single, ui-select-multi');
  if (control && typeof control.setState === 'function') {
    control.setState({ options });
  }
}
```

**Альтернатива:** Загружать опции в фабрике конфигураций до регистрации формы.

### Этап 6: Обновление обработки событий

**Файл:** `components/catalog/sidebar/catalog-sidebar.js`

**Удалить:**
- Подписки на события для синхронизации состояния (состояние синхронизируется автоматически)

**Оставить:**
- Подписки на события для явных реакций (логирование, уведомления)

### Этап 7: Обработка динамической смены режима

**Проблема:** При смене режима нужно обновить конфигурацию формы.

**Вариант 1:** Пересоздавать форму с новой конфигурацией
```javascript
_onCatalogStateChange(detail) {
  if (detail.state.mode !== this._previousMode) {
    // Удаляем старую форму
    if (this.formController) {
      this.formController.remove();
    }
    // Создаём новую с другой конфигурацией
    await this.updateFiltersForMode(detail.state.mode);
  }
}
```

**Вариант 2:** Использовать API обновления конфигурации (если есть)
```javascript
// Проверить, есть ли метод updateConfig в ui-form-controller
if (this.formController.updateConfig) {
  const newConfig = await createCatalogFiltersFormConfig(newMode);
  window.app.forms.catalogFilters = newConfig;
  this.formController.updateConfig(newConfig);
}
```

## Порядок выполнения

1. ✅ **Создать фабрику конфигураций** (`app/forms/catalog-filters-factory.js`)
   - Импортировать `filter-registry.js`
   - Реализовать генерацию конфигурации для обоих режимов
   - Реализовать асинхронную загрузку опций для relationship полей

2. ✅ **Обновить catalog-sidebar.js: updateFiltersForMode()**
   - Убрать создание `ui-form-controller` через `createElement`
   - Убрать `setState` для установки конфигурации
   - Использовать фабрику для генерации конфигурации
   - Регистрировать конфигурацию в `window.app.forms`
   - Рендерить форму с `config-path`

3. ✅ **Удалить ручное создание полей и контролов**
   - Удалить метод `_createFieldControl()`
   - Удалить логику создания `ui-form-field` элементов
   - Удалить логику добавления контролов в поля

4. ✅ **Обновить syncFormValues()**
   - Использовать `form.getField()` вместо `querySelector`
   - Использовать `field.setValue()` вместо `setState`

5. ✅ **Обновить loadRelationshipOptions()**
   - Использовать `form.getField()` для получения полей
   - Обновлять опции через публичный API контролов

6. ✅ **Обработать динамическую смену режима**
   - При смене режима пересоздавать форму с новой конфигурацией

7. ✅ **Тестирование**
   - Проверить рендеринг фильтров при загрузке
   - Проверить смену режима (type ↔ instance)
   - Проверить синхронизацию значений при изменении извне
   - Проверить autosubmit и debounce

## Изменяемые файлы

1. **Новые файлы:**
   - `app/forms/catalog-filters-factory.js` - фабрика конфигураций

2. **Изменяемые файлы:**
   - `components/catalog/sidebar/catalog-sidebar.js` - основной рефакторинг
   - `components/catalog/sidebar/sidebar-template.js` - обновить шаблон формы (использовать `config-path`)

3. **Файлы без изменений (но использовать через фабрику):**
   - `components/catalog/sidebar/filter-registry.js` - используется как зависимость

## Риски и подводные камни

1. **Асинхронная загрузка опций для relationship полей**
   - Решение: Загружать опции в фабрике до возврата конфигурации

2. **Динамическая смена режима**
   - Решение: Пересоздавать форму при смене режима

3. **Синхронизация значений при изменении извне**
   - Решение: Использовать публичный API `field.setValue()` вместо прямого изменения `state.values`

4. **Типы значений (массивы для select-multi, объекты для range)**
   - Решение: Нормализовать значения в фабрике и в `syncFormValues()`

## Документация

После рефакторинга обновить:
- Комментарии в `catalog-sidebar.js`
- `components/catalog/DEVELOPMENT_PLAN.md` (если есть упоминание форм)

