# Архитектурные различия между каталогами игрушек и аксессуаров

## Обзор

Система каталогов построена на гибридном подходе: общие утилиты используются обоими каталогами, но каждый каталог имеет свои специализированные компоненты для изоляции и независимой разработки.

## Общая архитектура

### Принципы
- ✅ **Изоляция:** Каждый каталог имеет свои компоненты, что исключает взаимное влияние
- ✅ **Переиспользование:** Общие утилиты вынесены в `catalog-shared/`
- ✅ **Конфигурируемость:** Компоненты настраиваются через атрибуты и параметры
- ✅ **Единообразие:** Оба каталога используют одинаковые паттерны и API

---

## Сравнительная таблица

| Аспект | Каталог игрушек | Каталог аксессуаров |
|--------|----------------|---------------------|
| **Post Types** | `toy_type`, `toy_instance` | `ny_accessory` |
| **Режимы** | `type` / `instance` (переключение) | Один режим (без переключения) |
| **Store** | `CatalogStore` | `AccessoryCatalogStore` |
| **REST Endpoints** | `/catalog/types`, `/catalog/instances` | `/catalog/accessories` |
| **События** | `elkaretro:catalog:updated` | `elkaretro:accessory-catalog:updated` |
| **LocalStorage** | `elkaretro_catalog_state` | `elkaretro_accessory_catalog_state` |
| **Категории** | `category-of-toys` (иерархическая) | `ny_category` (иерархическая) |
| **Логика наличия** | Блокировка категорий с нулевым счетчиком | Все категории доступны |
| **Счетчики категорий** | Показываются `toy_types_count` | Скрыты |
| **Остатки (stock)** | Не показываются | Показываются на карточках |
| **Web Component** | `<catalog-page>` | `<accessory-catalog-page>` |
| **Template** | `page-catalog.php` | `page-accessory-catalog.php` |

---

## Структура компонентов

### Общие компоненты (catalog-shared/)

#### `catalog-url-state.js`
**Использование:** Оба каталога
**Назначение:** Парсинг и сериализация состояния каталога в/из URL

**Особенности:**
- Поддерживает параметры: `limit`, `search`, `sort`, `filters[key]=value1,value2`
- Формат фильтров: плоский (`key=value1,value2`), а не вложенный
- Для каталога игрушек добавляет параметр `mode` в URL
- Для каталога аксессуаров параметр `mode` исключается

---

### Каталог игрушек (components/catalog/)

#### Store: `catalog-store.js`
**Ключевые особенности:**
- Поддерживает `mode: 'type' | 'instance'`
- Состояние: `{ mode, limit, search, sort, filters }`
- Событие: `elkaretro:catalog:updated`
- LocalStorage: `elkaretro_catalog_state`
- API: `window.app.catalog`

**Методы:**
```javascript
window.app.catalog.setMode('type' | 'instance')
window.app.catalog.setSearch(query)
window.app.catalog.setSort(sort)
window.app.catalog.setFilters(filters)
window.app.catalog.updateFilter(key, values)
window.app.catalog.resetFilters()
window.app.catalog.reset()
```

#### Page: `catalog-page.js`
**Ключевые особенности:**
- Оркестрирует sidebar, toolbar, results
- Поддерживает переключение режимов
- Использует `CatalogSidebar`, `CatalogToolbar`, `CatalogResults`
- Использует разные endpoints в зависимости от режима: `/catalog/types` или `/catalog/instances`

#### Sidebar: `catalog-sidebar.js`
**Ключевые особенности:**
- Содержит переключатель режимов (`mode-toggle`)
- Иерархический фильтр категорий (`category-tree-filter` для `category-of-toys`)
- Динамические фильтры через `ui-form-controller`:
  - Для режима `type`: фильтры из `type-filters.js`
  - Для режима `instance`: фильтры из `instance-filters.js`
- Кнопка "Применить фильтры" (debounce 10 секунд)

#### Toolbar: `catalog-toolbar.js`
**Компоненты:**
- Поиск (`search-box.js`)
- Сортировка (`sort-control.js`)
- Активные фильтры-чипсы (`filters-summary.js`)

#### Results: `catalog-results.js`
**Ключевые особенности:**
- Рендерит карточки `toy-type-card` или `toy-instance-card` в зависимости от режима
- Infinite scroll через `IntersectionObserver`
- Скелетон загрузки
- Сообщение "Больше загружать нечего"

#### Filter Registry: `filter-registry.js`
**Фильтры для режима `type`:**
- `category-of-toys` (иерархический, через `category-tree-filter`)
- `occurrence` (множественный выбор)
- `year_of_production`, `material`, `manufacturer`, `size`, `glass_thickness`, `mounting_type`

**Фильтры для режима `instance`:**
- `category-of-toys` (иерархический, через `category-tree-filter`)
- `authenticity`, `lot_configurations`, `condition`, `tube_condition` (множественный выбор)
- `paint_type`, `color_type`, `back_color`

---

### Каталог аксессуаров (components/accessory-catalog/)

#### Store: `accessory-catalog-store.js`
**Ключевые особенности:**
- **НЕ** поддерживает `mode` (один режим)
- Состояние: `{ limit, search, sort, filters }` (без `mode`)
- Событие: `elkaretro:accessory-catalog:updated`
- LocalStorage: `elkaretro_accessory_catalog_state`
- API: `window.app.accessoryCatalog`

**Методы:**
```javascript
window.app.accessoryCatalog.setSearch(query)
window.app.accessoryCatalog.setSort(sort)
window.app.accessoryCatalog.setFilters(filters)
window.app.accessoryCatalog.updateFilter(key, values)
window.app.accessoryCatalog.resetFilters()
window.app.accessoryCatalog.reset()
```

#### Page: `accessory-catalog-page.js`
**Ключевые особенности:**
- Оркестрирует sidebar, toolbar, results
- **БЕЗ** переключения режимов
- Использует `AccessoryCatalogSidebar`, `AccessoryCatalogToolbar`, `AccessoryCatalogResults`
- Использует endpoint: `/catalog/accessories`

#### Sidebar: `accessory-catalog-sidebar.js`
**Ключевые особенности:**
- **БЕЗ** переключателя режимов
- Иерархический фильтр категорий (`category-tree-filter` для `ny_category`)
- Динамические фильтры через `ui-form-controller` из `accessory-filter-registry.js`
- Кнопка "Применить фильтры" (debounce 10 секунд)

#### Toolbar: `accessory-catalog-toolbar.js`
**Компоненты:**
- Поиск (`search-box.js`) - использует `window.app.accessoryCatalog`
- Сортировка (`sort-control.js`) - использует `window.app.accessoryCatalog`
- Активные фильтры-чипсы (`filters-summary.js`)

#### Results: `accessory-catalog-results.js`
**Ключевые особенности:**
- Рендерит карточки `ny-accessory-card`
- Отображает поле `stock` (остатки) на карточках
- Infinite scroll через `IntersectionObserver`
- Скелетон загрузки
- Сообщение "Больше загружать нечего"

#### Filter Registry: `accessory-filter-registry.js`
**Фильтры:**
- `ny_category` (иерархический, через `category-tree-filter`)
- `lot_configurations`, `condition`, `material`, `year_of_production` (множественный выбор)
- **БЕЗ** `property` (согласно требованиям)

---

## Различия в логике

### 1. Режимы (Mode)

#### Каталог игрушек
- Поддерживает два режима: `type` и `instance`
- Переключение режима меняет:
  - REST endpoint (`/catalog/types` ↔ `/catalog/instances`)
  - Набор фильтров в sidebar
  - Тип карточек (`toy-type-card` ↔ `toy-instance-card`)
  - Опции сортировки

#### Каталог аксессуаров
- Один режим (без переключения)
- Всегда использует:
  - REST endpoint: `/catalog/accessories`
  - Фиксированный набор фильтров
  - Карточки: `ny-accessory-card`
  - Опции сортировки для аксессуаров

### 2. Категории

#### Каталог игрушек (`category-of-toys`)
- Иерархическая таксономия
- Логика наличия: категории с `toy_types_count = 0` блокируются
- Показываются счетчики: `(toy_types_count)`
- Суммирование счетчиков: родительские категории показывают сумму всех дочерних
- Индекс категории: сортировка по `category_index`

#### Каталог аксессуаров (`ny_category`)
- Иерархическая таксономия (как и для игрушек)
- **БЕЗ** логики наличия: все категории доступны для выбора
- Счетчики скрыты
- **БЕЗ** суммирования счетчиков
- Индекс категории: сортировка по `category_index` (если добавлен)

### 3. Остатки (Stock)

#### Каталог игрушек
- Не отображаются остатки на карточках
- Используется `available_instances_count` для сортировки "Сначала с экземплярами"

#### Каталог аксессуаров
- Отображается бейдж "Остаток: ${stock}" на карточках (если `stock > 0`)
- Поле `stock` передаётся из API в `ny-accessory-card`
- Сортировка `stock_desc` ("Сначала в наличии")

### 4. Фильтры

#### Каталог игрушек
**Режим `type`:**
- `category-of-toys` (иерархический)
- `occurrence` (множественный)
- `year_of_production`, `material`, `manufacturer`, `size`, `glass_thickness`, `mounting_type`

**Режим `instance`:**
- `category-of-toys` (иерархический)
- `authenticity`, `lot_configurations`, `condition`, `tube_condition` (множественный)
- `paint_type`, `color_type`, `back_color`
- `property` (собственность)

#### Каталог аксессуаров
**Один набор фильтров:**
- `ny_category` (иерархический)
- `lot_configurations`, `condition`, `material`, `year_of_production` (множественный)
- **БЕЗ** `property` (исключён по требованию)

### 5. Сортировка

#### Каталог игрушек
**Режим `type`:**
- `default` (Новые поступления)
- `newest` (Сначала новые)
- `oldest` (Сначала старые)
- `alphabetical` (По алфавиту)
- `available_desc` (Сначала с экземплярами)

**Режим `instance`:**
- `default` (Новые)
- `newest` (Сначала новые)
- `oldest` (Сначала старые)
- `price_low_high` (Сначала дешёвые)
- `price_high_low` (Сначала дорогие)
- `alphabetical` (По алфавиту)

#### Каталог аксессуаров
**Единый набор опций:**
- `default` (Новые поступления)
- `newest` (Сначала новые)
- `oldest` (Сначала старые)
- `price_low_high` (Сначала дешёвые)
- `price_high_low` (Сначала дорогие)
- `alphabetical` (По алфавиту)
- `stock_desc` (Сначала в наличии)

---

## Общие компоненты

### `category-tree-filter`
**Конфигурируемый компонент** для иерархических категорий

**Атрибуты:**
- `taxonomy` - слаг таксономии (по умолчанию `category-of-toys`)
- `filter-key` - ключ фильтра в сторе (по умолчанию `category-of-toys`)
- `store-api` - API стора (по умолчанию `catalog`)
- `update-event` - событие обновления (по умолчанию `elkaretro:catalog:updated`)
- `storage-key` - ключ localStorage (по умолчанию `elkaretro_category_filter_expanded`)

**Использование в каталоге игрушек:**
```html
<category-tree-filter></category-tree-filter>
<!-- Использует: taxonomy="category-of-toys", store-api="catalog" -->
```

**Использование в каталоге аксессуаров:**
```html
<category-tree-filter
  taxonomy="ny_category"
  filter-key="ny_category"
  store-api="accessoryCatalog"
  update-event="elkaretro:accessory-catalog:updated"
  storage-key="elkaretro_accessory_category_filter_expanded"
></category-tree-filter>
```

**Различия в логике:**
- Для `category-of-toys`: логика наличия включена, счетчики показываются
- Для `ny_category`: логика наличия отключена, счетчики скрыты

---

## Backend различия

### REST Endpoints

#### Каталог игрушек
```
GET /wp-json/elkaretro/v1/catalog/types?limit=30&offset=0&search=...&sort=...&filters[...]=...
GET /wp-json/elkaretro/v1/catalog/instances?limit=30&offset=0&search=...&sort=...&filters[...]=...
```

#### Каталог аксессуаров
```
GET /wp-json/elkaretro/v1/catalog/accessories?limit=30&offset=0&search=...&sort=...&filters[...]=...
```

### PHP Services

#### Каталог игрушек
- `Catalog_Toy_Type_Service` - сервис для типов игрушек
- `Catalog_Toy_Instance_Service` - сервис для экземпляров игрушек
- Методы в `Catalog_Query_Manager`:
  - `build_toy_type_query_args()`
  - `build_toy_instance_query_args()`

#### Каталог аксессуаров
- `Catalog_Accessory_Service` - сервис для аксессуаров
- Методы в `Catalog_Query_Manager`:
  - `build_accessory_query_args()`

### Константы фильтров

#### `Catalog_Query_Manager`
```php
private const TYPE_TAXONOMY_FILTERS = [...]; // Для toy_type
private const INSTANCE_TAXONOMY_FILTERS = [...]; // Для toy_instance
private const ACCESSORY_TAXONOMY_FILTERS = [...]; // Для ny_accessory
```

### Response Adapter

#### `Catalog_Response_Adapter`
- Метод `from_query()` определяет тип поста и использует соответствующий адаптер:
  - Для `toy_type`: `map_toy_type_post()`
  - Для `toy_instance`: `map_toy_instance_post()`
  - Для `ny_accessory`: `map_accessory_post()`

---

## Frontend различия

### Инициализация

#### Каталог игрушек
```javascript
// app/app.js
if (document.querySelector('catalog-page')) {
  import('../components/catalog/catalog-store.js').then(module => {
    window.app.catalogStore = module.getCatalogStore();
  });
}
```

#### Каталог аксессуаров
```javascript
// app/app.js
if (document.querySelector('accessory-catalog-page')) {
  import('../components/accessory-catalog/accessory-catalog-store.js').then(module => {
    window.app.accessoryCatalogStore = module.getAccessoryCatalogStore();
  });
}
```

### Публичный API

#### `window.app.catalog`
```javascript
window.app.catalog.setMode('type' | 'instance')  // Только для игрушек
window.app.catalog.setSearch(query)
window.app.catalog.setSort(sort)
window.app.catalog.setFilters(filters)
// ...
```

#### `window.app.accessoryCatalog`
```javascript
window.app.accessoryCatalog.setSearch(query)
window.app.accessoryCatalog.setSort(sort)
window.app.accessoryCatalog.setFilters(filters)
// БЕЗ setMode()
```

### Форма фильтров

#### Каталог игрушек
- Config path: `window.app.forms.catalogFilters`
- Фабрика: `app/forms/catalog-filters-factory.js`
- Регистрация: `components/catalog/sidebar/filter-registry.js`

#### Каталог аксессуаров
- Config path: `window.app.forms.accessoryCatalogFilters` (camelCase)
- Фабрика: `app/forms/accessory-catalog-filters-factory.js`
- Регистрация: `components/accessory-catalog/sidebar/accessory-filter-registry.js`

---

## URL State

### Формат URL

#### Каталог игрушек
```
/catalog/?mode=type&limit=30&search=...&sort=...&category-of-toys=1,2&occurrence=3
```

#### Каталог аксессуаров
```
/accessories/?limit=30&search=...&sort=...&ny_category=1,2&material=3,4
```

**Различия:**
- Каталог игрушек: включает `mode=type|instance`
- Каталог аксессуаров: **БЕЗ** параметра `mode`

### Парсинг URL

Оба каталога используют `catalog-url-state.js`:
- Для каталога игрушек: параметр `mode` обрабатывается и сохраняется
- Для каталога аксессуаров: параметр `mode` игнорируется и исключается из состояния

---

## LocalStorage

### Каталог игрушек
- Ключ: `elkaretro_catalog_state`
- Содержит: `{ mode, limit, search, sort, filters }`

### Каталог аксессуаров
- Ключ: `elkaretro_accessory_catalog_state`
- Содержит: `{ limit, search, sort, filters }` (без `mode`)

---

## Данные из PHP

### `window.taxonomy_terms`

**Источник:** `functions.php` → `elkaretro_get_catalog_filter_taxonomies()`

**Содержит таксономии для:**
- `toy_type` и `toy_instance` - все фильтры для каталога игрушек
- `ny_accessory` - все фильтры для каталога аксессуаров
- `category-of-toys` - иерархическая категория игрушек
- `ny_category` - иерархическая категория аксессуаров

**Формат:**
```javascript
window.taxonomy_terms = {
  'category-of-toys': {
    term_id: { id, name, slug, description, parent, toy_types_count, category_index },
    // ...
  },
  'ny_category': {
    term_id: { id, name, slug, description, parent },
    // ...
  },
  // другие таксономии...
}
```

**Различия:**
- `category-of-toys`: содержит `toy_types_count` и `category_index`
- `ny_category`: содержит только базовые поля (без счетчиков)

---

## Карточки

### Каталог игрушек
- `toy-type-card` - для режима `type`
- `toy-instance-card` - для режима `instance`

### Каталог аксессуаров
- `ny-accessory-card` - для аксессуаров
- Отображает бейдж "Остаток: ${stock}" (если `stock > 0`)

---

## Infinite Scroll

### Общая логика

Оба каталога используют одинаковую логику:
- `IntersectionObserver` для обнаружения прокрутки
- `offset` / `limit` пагинация (не `page` / `per_page`)
- `AbortController` для отмены предыдущих запросов
- Проверка `MAX_LIMIT` (1000) для предотвращения рекурсии

### Различия

- Каталог игрушек: отправляет параметр `mode` в запросе
- Каталог аксессуаров: **БЕЗ** параметра `mode` в запросе

---

## События

### Каталог игрушек
```javascript
window.addEventListener('elkaretro:catalog:updated', (event) => {
  const { state, meta, isLoading, error, draftFilters, prevState } = event.detail;
  // state содержит mode, filters, search, sort, limit
});
```

### Каталог аксессуаров
```javascript
window.addEventListener('elkaretro:accessory-catalog:updated', (event) => {
  const { state, meta, isLoading, error, draftFilters, prevState } = event.detail;
  // state НЕ содержит mode, только filters, search, sort, limit
});
```

---

## Поля данных

### Каталог игрушек
**Toy Type:**
- `id`, `title`, `link`, `image`, `price`, `occurrence`, `taxonomies`, `available_instances_count`

**Toy Instance:**
- `id`, `title`, `link`, `image`, `price`, `taxonomies`, `parent_type_id`

### Каталог аксессуаров
**Accessory:**
- `id`, `title`, `link`, `image`, `price`, `stock`, `taxonomies`

**Различия:**
- Аксессуары: поле `stock` (остатки)
- Игрушки: поле `available_instances_count` (количество доступных экземпляров)

---

## Итоговая таблица компонентов

| Компонент | Каталог игрушек | Каталог аксессуаров | Общий |
|-----------|----------------|---------------------|-------|
| **Store** | `CatalogStore` | `AccessoryCatalogStore` | ❌ |
| **Page** | `CatalogPage` | `AccessoryCatalogPage` | ❌ |
| **Sidebar** | `CatalogSidebar` | `AccessoryCatalogSidebar` | ❌ |
| **Toolbar** | `CatalogToolbar` | `AccessoryCatalogToolbar` | ❌ |
| **Results** | `CatalogResults` | `AccessoryCatalogResults` | ❌ |
| **Filter Registry** | `FilterRegistry` | `AccessoryFilterRegistry` | ❌ |
| **Category Filter** | `CategoryTreeFilter` | `CategoryTreeFilter` | ✅ |
| **URL State** | `catalog-url-state.js` | `catalog-url-state.js` | ✅ |
| **Search Box** | `SearchBox` | `SearchBox` | ❌ |
| **Sort Control** | `SortControl` | `SortControl` | ❌ |
| **Filters Summary** | `FiltersSummary` | `FiltersSummary` | ❌ |

**Примечание:** Компоненты Search Box, Sort Control и Filters Summary имеют отдельные реализации для каждого каталога, но используют одинаковую логику и отличаются только API стора (`window.app.catalog` vs `window.app.accessoryCatalog`).

---

## Рекомендации по расширению

### Добавление нового каталога

Если в будущем понадобится добавить третий каталог, рекомендуется:

1. **Создать новый Store:**
   - Скопировать структуру `AccessoryCatalogStore`
   - Адаптировать под новые требования

2. **Создать новые компоненты:**
   - Page, Sidebar, Toolbar, Results в отдельной папке

3. **Использовать общие утилиты:**
   - `catalog-url-state.js` из `catalog-shared/`
   - `category-tree-filter` с соответствующими атрибутами

4. **Добавить Backend:**
   - Новый сервис в `core/catalog/`
   - Новый endpoint в `Catalog_REST_Controller`
   - Константы фильтров в `Catalog_Query_Manager`

5. **Обновить `functions.php`:**
   - Добавить новый тип поста в `elkaretro_get_catalog_filter_taxonomies()`

---

## Заключение

Архитектура каталогов построена на принципе **изоляции с переиспользованием**:
- Каждый каталог имеет свои компоненты для предотвращения взаимного влияния
- Общие утилиты вынесены в `catalog-shared/` для переиспользования
- Компоненты конфигурируются через атрибуты для гибкости
- Оба каталога используют одинаковые паттерны и API для единообразия

Это позволяет:
- ✅ Независимо разрабатывать и поддерживать каталоги
- ✅ Избежать регрессий при изменениях
- ✅ Легко добавлять новые каталоги в будущем
- ✅ Переиспользовать проверенный код

