# Требования к доработке UI Form Kit для каталога

## Контекст использования

Каталог елочных игрушек (`components/catalog/`) использует UI Form Kit для построения фильтров в боковой панели. Фильтры должны:
- Автоматически обновлять результаты при изменении (без кнопки "Применить")
- Поддерживать диапазоны значений (год производства, цена)
- Переключаться между режимами "Типы игрушек" и "Экземпляры игрушек"
- Отображать активные фильтры в виде чипсов с возможностью удаления
- Работать с большими списками таксономий (100+ терминов) с поиском по вводу (все опции предзагружены в `window.taxonomy_terms`)
- Синхронизироваться с URL (через `catalog-url-state.js`)

### Архитектура каталога

- **`catalog-page.js`** — главный оркестратор, управляет состоянием через URL
- **`catalog-sidebar.js`** — рендерит фильтры на основе `core/data-model.json`
- **`catalog-toolbar.js`** — поиск, сортировка, отображение активных фильтров
- **`catalog-url-state.js`** — парсит/сериализует GET-параметры

### Источники данных фильтров

Фильтры генерируются динамически из `core/data-model.json`:
- Поля с `show_in_filters: true` становятся фильтрами
- Таксономии доступны через `window.taxonomy_terms`
- Для типов игрушек: `occurrence`, `year_of_production`, `material`, `manufacturer`, `size`, `glass_thickness`, `mounting_type`, `category-of-toys` (иерархическая)
- Для экземпляров: `authenticity`, `lot_configurations`, `property`, `condition`, `tube_condition`, `paint_type`, `color_type`, `back_color`

---

## Требование 1: Autosubmit — доработка и документация

### Контекст
Autosubmit уже реализован в `form-controller.js` (методы `_scheduleAutosubmit`, `_clearAutosubmitTimer`), но:
- В README помечен как "planned" (строка 206)
- Нет примеров использования в документации
- Нет публичных методов для программного управления

### Что нужно сделать

1. **Обновить README.md** (`components/ui-kit/form/README.md`):
   - Переместить секцию "Autosubmit" из "planned" в основной раздел
   - Добавить пример конфигурации для каталога:
     ```json
     {
       "autosubmit": {
         "enabled": true,
         "debounceMs": 500,
         "events": ["change"],
         "excludeFields": []
       }
     }
     ```
   - Описать поведение: таймер сбрасывается при каждом новом событии из `events`, `submit()` вызывается после `debounceMs` бездействия
   - Указать, что `submit` должен вызывать `pipeline.submit`, который в каталоге обновит URL и загрузит новые результаты

2. **Добавить публичные методы в `form-controller.js`**:
   ```javascript
   enableAutosubmit(config?: AutosubmitConfig): void
   disableAutosubmit(): void
   isAutosubmitEnabled(): boolean
   ```
   - `enableAutosubmit` — включает/обновляет конфигурацию (если передана)
   - `disableAutosubmit` — отключает и очищает таймер
   - `isAutosubmitEnabled` — возвращает текущий статус

3. **Добавить событие `ui-form:autosubmit-scheduled`**:
   - Эмитится при установке таймера (для отладки/аналитики)
   - Detail: `{ fieldId, delayMs, eventType }`

### Пример использования в каталоге

```javascript
// В catalog-sidebar.js
const formConfig = {
  id: 'catalog-filters',
  autosubmit: {
    enabled: true,
    debounceMs: 500,
    events: ['change']
  },
  pipeline: {
    submit: (context) => {
      const values = context.values;
      // Обновляем URL через catalog-url-state
      catalogPage.updateState({ filters: values });
      return Promise.resolve();
    }
  },
  fields: [
    {
      id: 'occurrence',
      type: 'select-single',
      label: 'Встречаемость',
      dataSource: { type: 'global', path: 'taxonomy_terms.occurrence' }
    }
  ]
};
```

---

## Требование 2: Компонент диапазона значений (Range Input)

### Контекст
В каталоге нужны фильтры по диапазонам:
- **Год производства**: от 1950 до 2000 (два поля: "от" и "до")
- **Цена** (для экземпляров): от 1000 до 50000 рублей
- **Количество доступных экземпляров** (для типов): от 1 до 50

Текущий `ui-input-number` поддерживает только одно значение, не подходит для диапазонов.

### Что нужно сделать

1. **Создать компонент `ui-input-range`** в `components/ui-kit/form/inputs/range-input/`:
   - Два связанных поля: `min` и `max`
   - Валидация: `min <= max`
   - Поддержка `step`, `precision`, `format`, `currency` (как у `number-input`)
   - События: `ui-input-range:change` (эмитится при изменении любого из полей)
   - Атрибуты: `min-value`, `max-value`, `min-placeholder`, `max-placeholder`, `min-label`, `max-label`

2. **Интегрировать в `ui-form-field`**:
   - Добавить тип `"range"` в `field-config-adapter.js`
   - Поддержка `defaultValue: { min: 1950, max: 2000 }`
   - Валидация через `validation` правила: `{ rule: "range", value: { min: 0, max: 3000 }, message: "Год должен быть от 0 до 3000" }`

3. **Добавить в README.md**:
   - Описание типа `range` в секции "Supported Field Types"
   - Пример конфигурации:
     ```json
     {
       "id": "year_range",
       "type": "range",
       "label": "Год производства",
       "min": 1950,
       "max": 2000,
       "step": 1,
       "defaultValue": { "min": null, "max": null },
       "validation": [
         { "rule": "range", "value": { "min": 1800, "max": 2100 }, "message": "Год должен быть от 1800 до 2100" }
       ]
     }
     ```

### Пример использования в каталоге

```javascript
// В type-filters.js
{
  id: 'year_of_production_range',
  type: 'range',
  label: 'Год производства',
  min: 1800,
  max: 2100,
  step: 1,
  defaultValue: { min: null, max: null },
  dataSource: {
    // Опционально: динамические min/max из бэкенда
    type: 'rest',
    endpoint: '/elkaretro/v1/catalog/metadata',
    path: 'year_range'
  }
}
```

### Визуальный дизайн
- Два поля рядом: `[от: ____] [до: ____]`
- Или два поля под лейблом: 
  ```
  Год производства
  ┌─────────┐  ┌─────────┐
  │ от:    │  │ до:    │
  └─────────┘  └─────────┘
  ```

---

## Требование 3: Segmented Toggle (переключатель режимов)

### Контекст
В каталоге нужен переключатель между режимами:
- **"Типы игрушек"** (поиск по типам)
- **"Экземпляры игрушек"** (поиск по конкретным экземплярам)

Это не обычный select, а визуально компактный переключатель (как в iOS/mobile UI), который:
- Показывает оба варианта одновременно
- Визуально выделяет активный вариант
- Эмитит событие при переключении

### Что нужно сделать

1. **Создать компонент `ui-segmented-toggle`** в `components/ui-kit/form/inputs/segmented-toggle/`:
   - Принимает массив опций: `[{ value: 'type', label: 'Типы' }, { value: 'instance', label: 'Экземпляры' }]`
   - Атрибуты: `value`, `options` (JSON), `disabled`
   - События: `ui-segmented-toggle:change` (detail: `{ value, previousValue }`)
   - Визуально: две кнопки рядом, активная подсвечена

2. **Интегрировать в `ui-form-field`**:
   - Добавить тип `"segmented-toggle"` в `field-config-adapter.js`
   - Поддержка `defaultValue`, `required`, `disabled`

3. **Добавить в README.md**:
   - Описание типа `segmented-toggle`
   - Пример:
     ```json
     {
       "id": "mode",
       "type": "segmented-toggle",
       "label": "Режим поиска",
       "defaultValue": "type",
       "options": [
         { "value": "type", "label": "Типы игрушек" },
         { "value": "instance", "label": "Экземпляры" }
       ]
     }
     ```

### Пример использования в каталоге

```javascript
// В catalog-sidebar.js, mode-toggle.js
{
  id: 'catalog_mode',
  type: 'segmented-toggle',
  label: '', // Скрываем лейбл, т.к. опции самодостаточны
  defaultValue: 'type',
  options: [
    { value: 'type', label: 'Типы игрушек' },
    { value: 'instance', label: 'Экземпляры' }
  ]
}
```

### Визуальный дизайн
```
┌─────────────────────┐
│ [Типы] [Экземпляры] │  ← активный вариант подсвечен
└─────────────────────┘
```

---

## Требование 4: Компонент Filter Chips (активные фильтры)

### Контекст
В каталоге нужно отображать активные фильтры в виде чипсов (tags) в тулбаре:
- Каждый чипс показывает название фильтра и значение
- При клике на крестик фильтр удаляется
- При клике на чипс открывается соответствующий фильтр в сайдбаре

Текущий UI Kit не предоставляет готового компонента для этого.

### Что нужно сделать

1. **Создать компонент `ui-filter-chip`** в `components/ui-kit/form/chips/filter-chip/`:
   - Атрибуты: `label`, `value`, `filter-id`, `removable` (boolean, default: true)
   - События: `ui-filter-chip:remove` (detail: `{ filterId, label, value }`), `ui-filter-chip:click` (detail: `{ filterId }`)
   - Визуально: `[label: value ×]` с крестиком справа

2. **Создать компонент `ui-filters-summary`** в `components/ui-kit/form/chips/filters-summary/`:
   - Контейнер для чипсов
   - Принимает массив фильтров: `[{ id, label, value, removable }]`
   - Метод `setFilters(filters[])` для обновления списка
   - События: `ui-filters-summary:remove` (проксирует `ui-filter-chip:remove`), `ui-filters-summary:click` (проксирует `ui-filter-chip:click`)

3. **Добавить утилиту `getActiveFilters(formController)`**:
   - Принимает экземпляр `ui-form-controller`
   - Возвращает массив активных фильтров (исключая пустые значения)
   - Формат: `[{ id, label, value, fieldConfig }]`

4. **Добавить в README.md**:
   - Секция "Filter Chips" с примерами использования

### Пример использования в каталоге

```javascript
// В catalog-toolbar.js
import { getActiveFilters } from '../ui-kit/form/helpers/filter-utils.js';

const filtersSummary = document.querySelector('ui-filters-summary');
const formController = document.querySelector('ui-form-controller');

formController.addEventListener('ui-form:change', () => {
  const activeFilters = getActiveFilters(formController);
  filtersSummary.setFilters(activeFilters.map(f => ({
    id: f.id,
    label: f.fieldConfig.label || f.id,
    value: Array.isArray(f.value) ? f.value.join(', ') : f.value,
    removable: true
  })));
});

filtersSummary.addEventListener('ui-filters-summary:remove', (e) => {
  const { filterId } = e.detail;
  // Очищаем поле в форме
  const field = formController.querySelector(`ui-form-field[data-field-id="${filterId}"]`);
  if (field) {
    field.setState({ value: field.state.fieldType === 'select-multi' ? [] : null });
  }
});
```

### Визуальный дизайн
```
Активные фильтры:
[Встречаемость: Редкая ×] [Год: 1950-1960 ×] [Материал: Стекло ×]
```

---

## Приоритеты реализации

1. **Высокий приоритет** (блокирует разработку каталога):
   - Требование 1: Autosubmit (документация и публичные методы)
   - Требование 2: Range Input
   - Требование 3: Segmented Toggle

2. **Средний приоритет** (улучшает UX):
   - Требование 4: Filter Chips

---

## Дополнительные замечания

- Все компоненты должны следовать архитектуре `BaseElement` (как существующие компоненты UI Kit)
- Стили должны быть адаптивными (mobile-first)
- Компоненты должны поддерживать accessibility (ARIA-атрибуты, keyboard navigation)
- При добавлении новых типов полей обновлять `field-config-adapter.js` и `validation-registry.js`

---

## Контакты для вопросов

Если возникнут вопросы по контексту использования в каталоге, см.:
- `components/catalog/README.md` — архитектура каталога
- `core/data-model.json` — модель данных
- `components/catalog/catalog-page.js` — пример интеграции

