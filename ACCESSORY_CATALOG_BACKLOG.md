# Беклог: Каталог новогодних аксессуаров

## Цель

Реализовать каталог новогодних аксессуаров (`ny_accessory`) с фильтрацией, поиском, сортировкой и infinite scroll, аналогично каталогу игрушек, но без переключения режимов (type/instance).

## Архитектура

**Вариант 3 (Гибридный):** Базовые классы/утилиты + отдельные компоненты для аксессуаров.

**Принципы:**
- ✅ Полная изоляция от каталога игрушек
- ✅ Переиспользование общих утилит
- ✅ Отдельный REST endpoint и Store

---

## Этап 1: Backend API

### 1.1. Создать сервис для аксессуаров
**Файл:** `core/catalog/catalog-accessory-service.php` (новый)

**Задачи:**
- [ ] Создать класс `Catalog_Accessory_Service`
- [ ] Реализовать метод `search($state)` аналогично `Catalog_Toy_Type_Service`
- [ ] Использовать `Catalog_Query_Manager::build_accessory_query_args()` для построения запроса
- [ ] Возвращать результаты в формате `['items' => [], 'meta' => []]`

**Зависимости:** `Catalog_Query_Manager` (нужно добавить метод)

---

### 1.2. Расширить Catalog_Query_Manager
**Файл:** `core/catalog/catalog-query-manager.php`

**Задачи:**
- [ ] Добавить константу `ACCESSORY_TAXONOMY_FILTERS` с маппингом фильтров:
  ```php
  private const ACCESSORY_TAXONOMY_FILTERS = array(
    'ny_category'         => 'ny_category',
    'lot_configurations'  => 'lot_configurations',
    'condition'           => 'condition',
    'material'            => 'material',
    'year_of_production'  => 'year_of_production',
  );
  ```
- [ ] Добавить метод `build_accessory_query_args($state)` аналогично `build_type_query_args()`
- [ ] Использовать `build_tax_query()` с `ACCESSORY_TAXONOMY_FILTERS`
- [ ] Добавить сортировки для аксессуаров (если нужны специфичные)

**Зависимости:** Нет

---

### 1.3. Расширить Catalog_REST_Controller
**Файл:** `core/catalog/catalog-rest-controller.php`

**Задачи:**
- [ ] Добавить свойство `$accessory_service` в конструктор
- [ ] Зарегистрировать новый route `/catalog/accessories` в `register_routes()`
- [ ] Реализовать метод `handle_accessories($request)` аналогично `handle_types()`
- [ ] Использовать `normalize_state($request, 'accessory')` (режим для валидации)
- [ ] Возвращать результаты через `Catalog_Response_Adapter::adapt_accessory_list()`

**Зависимости:** Этап 1.1, 1.2

---

### 1.4. Расширить Catalog_Response_Adapter
**Файл:** `core/catalog/catalog-response-adapter.php`

**Задачи:**
- [ ] Добавить метод `adapt_accessory_list($posts)` для адаптации постов аксессуаров
- [ ] Включить поле `stock` в ответ (из meta поля `stock`)
- [ ] Формат ответа:
  ```php
  [
    'id' => int,
    'title' => string,
    'link' => string,
    'image' => string,
    'price' => float|null,
    'stock' => int, // Количество остатков
    'index' => string, // ny_accecory_index
    // ... другие поля
  ]
  ```

**Зависимости:** Нет

---

## Этап 2: Frontend - Общие утилиты

### 2.1. Вынести catalog-url-state.js в общую папку
**Файл:** `components/catalog-shared/catalog-url-state.js` (новый)

**Задачи:**
- [ ] Скопировать `components/catalog/catalog-url-state.js` в `components/catalog-shared/`
- [ ] Обновить импорты в `catalog-store.js` (каталог игрушек)
- [ ] Убедиться, что логика работает для обоих каталогов

**Зависимости:** Нет

---

### 2.2. Создать базовый класс для результатов
**Файл:** `components/catalog-shared/catalog-base-results.js` (новый)

**Задачи:**
- [ ] Вынести общую логику из `catalog-results.js`:
  - Infinite scroll (IntersectionObserver)
  - Методы `renderInitial()`, `appendItems()`, `showEmpty()`, `hideEmpty()`
  - Управление sentinel элементом
- [ ] Сделать класс расширяемым (можно наследовать или использовать композицию)
- [ ] Оставить специфичную логику (адаптация карточек) в дочерних классах

**Зависимости:** Нет

---

## Этап 3: Frontend - Store для аксессуаров

### 3.1. Создать AccessoryCatalogStore
**Файл:** `components/accessory-catalog/accessory-catalog-store.js` (новый)

**Задачи:**
- [ ] Скопировать структуру `CatalogStore` как основу
- [ ] Убрать логику `mode` (только один режим)
- [ ] Использовать `catalog-url-state.js` из `catalog-shared/`
- [ ] Использовать отдельный ключ localStorage: `elkaretro_accessory_catalog_state`
- [ ] Использовать отдельный ключ URL: `/accessories/` вместо `/catalog/`
- [ ] Реализовать те же методы: `getState()`, `updateState()`, `subscribe()`, etc.

**Зависимости:** Этап 2.1

---

### 3.2. Создать публичный API для аксессуаров
**Файл:** `app/app.js`

**Задачи:**
- [ ] Добавить `window.app.accessoryCatalog` API аналогично `window.app.catalog`
- [ ] Методы: `getState()`, `setSearch()`, `setSort()`, `setFilters()`, `resetFilters()`, `setLimit()`
- [ ] Инициализировать `window.app.accessoryCatalogStore` только на страницах с `<accessory-catalog-page>`

**Зависимости:** Этап 3.1

---

## Этап 4: Frontend - Компоненты каталога аксессуаров

### 4.1. Создать AccessoryCatalogPage
**Файл:** `components/accessory-catalog/accessory-catalog-page.js` (новый)

**Задачи:**
- [ ] Создать класс `AccessoryCatalogPage` аналогично `CatalogPage`
- [ ] Использовать `AccessoryCatalogStore` вместо `CatalogStore`
- [ ] Использовать `AccessoryCatalogSidebar` (без mode-toggle)
- [ ] Использовать `AccessoryCatalogResults` (с поддержкой остатков)
- [ ] Использовать общий `CatalogToolbar` или создать свой
- [ ] Endpoint: `/wp-json/elkaretro/v1/catalog/accessories`

**Зависимости:** Этап 3.1, 4.2, 4.3, 4.4

---

### 4.2. Создать AccessoryCatalogSidebar
**Файл:** `components/accessory-catalog/sidebar/accessory-catalog-sidebar.js` (новый)

**Задачи:**
- [ ] Создать класс `AccessoryCatalogSidebar` аналогично `CatalogSidebar`
- [ ] **Убрать mode-toggle** (нет переключения режимов)
- [ ] Использовать `AccessoryFilterRegistry` для получения фильтров
- [ ] Использовать общий `ui-form-controller` для рендеринга фильтров
- [ ] Синхронизация с `AccessoryCatalogStore`

**Зависимости:** Этап 4.5

---

### 4.3. Создать AccessoryCatalogResults
**Файл:** `components/accessory-catalog/results/accessory-catalog-results.js` (новый)

**Задачи:**
- [ ] Создать класс `AccessoryCatalogResults` на основе `CatalogBaseResults`
- [ ] Использовать `ny-accessory-card` компонент для рендеринга
- [ ] Адаптировать данные из API в формат для карточек
- [ ] Прокидывать `stock` в карточки для отображения остатков

**Зависимости:** Этап 2.2, 4.6

---

### 4.4. Создать AccessoryCatalogToolbar
**Файл:** `components/accessory-catalog/toolbar/accessory-catalog-toolbar.js` (новый)

**Задачи:**
- [ ] Создать класс `AccessoryCatalogToolbar` аналогично `CatalogToolbar`
- [ ] Использовать общие компоненты: `SearchBox`, `SortControl`
- [ ] Использовать `AccessoryFiltersSummary` для отображения активных фильтров
- [ ] Синхронизация с `AccessoryCatalogStore`

**Зависимости:** Этап 4.7

---

### 4.5. Создать AccessoryFilterRegistry
**Файл:** `components/accessory-catalog/sidebar/accessory-filter-registry.js` (новый)

**Задачи:**
- [ ] Создать класс/модуль для регистрации фильтров аксессуаров
- [ ] Фильтры из `data-model.json` для `ny_accessory`:
  - `ny_category` (плоская таксономия, single-select)
  - `lot_configurations` (multi-select)
  - `condition` (multi-select)
  - `material` (multi-select)
  - `year_of_production` (multi-select)
- [ ] Использовать `window.taxonomy_terms` для опций
- [ ] Использовать `window.data_model` для конфигурации полей

**Зависимости:** Нет

---

### 4.6. Расширить ny-accessory-card для отображения остатков
**Файл:** `components/ny-accessory/ny-accessory-card/ny-accessory-card.js` или `.template.js`

**Задачи:**
- [ ] Добавить атрибут `stock` в компонент
- [ ] Добавить бейдж "Остаток: ${stock}" в шаблон карточки
- [ ] Стилизовать бейдж (визуально выделить)
- [ ] Обработать случай `stock = 0` (возможно, визуально заблокировать карточку)

**Зависимости:** Нет

---

### 4.7. Создать AccessoryFiltersSummary
**Файл:** `components/accessory-catalog/toolbar/accessory-filters-summary.js` (новый)

**Задачи:**
- [ ] Создать компонент для отображения активных фильтров (чипсы)
- [ ] Аналогично `FiltersSummary` из каталога игрушек
- [ ] Использовать `ui-filter-chip` компоненты
- [ ] Синхронизация с `AccessoryCatalogStore`

**Зависимости:** Нет

---

## Этап 5: Интеграция в WordPress

### 5.1. Создать шаблон страницы каталога аксессуаров
**Файл:** `page-accessory-catalog.php` (новый, в корне темы)

**Задачи:**
- [ ] Создать WordPress шаблон страницы
- [ ] Добавить Web Component `<accessory-catalog-page>`
- [ ] Прокинуть атрибуты: `data-endpoint`, `data-per-page`
- [ ] Добавить контейнеры для sidebar, toolbar, results

**Зависимости:** Этап 4.1

---

### 5.2. Загрузка скриптов и стилей
**Файл:** `core/catalog/catalog-loader.php` или новый `accessory-catalog-loader.php`

**Задачи:**
- [ ] Создать `Accessory_Catalog_Loader` класс
- [ ] Регистрировать REST routes для аксессуаров
- [ ] Enqueue скрипты и стили для страницы каталога аксессуаров
- [ ] Условная загрузка только на нужных страницах

**Зависимости:** Этап 4.1

---

### 5.3. Регистрация Web Component
**Файл:** `components/components.js`

**Задачи:**
- [ ] Добавить `'accessory-catalog-page'` в registry
- [ ] Условная загрузка компонента (как сейчас для `catalog-page`)

**Зависимости:** Этап 4.1

---

## Этап 6: Прокидывание ссылок на каталог

### 6.1. Ссылки со страницы аксессуара
**Файл:** `components/ny-accessory/ny-accessory-single/ny-accessory-single-template.js`

**Задачи:**
- [ ] Импортировать `getCatalogTaxonomyUrl` из `catalog-link-utils.js`
- [ ] Обновить функцию `getTaxonomyUrl()` для таксономий аксессуаров:
  - Использовать `mode: 'accessory'` (или отдельный параметр)
  - Использовать базовый URL `/accessories/` вместо `/catalog/`
- [ ] Обновить все места, где формируются ссылки на таксономии

**Зависимости:** Этап 2.1 (или расширить `catalog-link-utils.js`)

---

### 6.2. Ссылки с главной страницы
**Файл:** Нужно найти, где на главной странице есть ссылки на аксессуары

**Задачи:**
- [ ] Найти компоненты/шаблоны главной страницы
- [ ] Обновить ссылки на аксессуары, чтобы они вели в каталог с фильтрами
- [ ] Использовать `getCatalogTaxonomyUrl()` или аналогичную функцию

**Зависимости:** Этап 6.1

---

### 6.3. Расширить catalog-link-utils.js для аксессуаров
**Файл:** `components/catalog/catalog-link-utils.js`

**Задачи:**
- [ ] Добавить функцию `getAccessoryCatalogUrl(filters, options)` или расширить существующую
- [ ] Добавить функцию `getAccessoryCatalogTaxonomyUrl(taxonomySlug, termId, options)`
- [ ] Использовать базовый URL `/accessories/` для аксессуаров

**Зависимости:** Нет

---

## Этап 7: Тестирование и проверка

### 7.1. Функциональное тестирование
**Задачи:**
- [ ] Проверить работу фильтров (все перечисленные)
- [ ] Проверить поиск
- [ ] Проверить сортировку
- [ ] Проверить infinite scroll
- [ ] Проверить отображение остатков на карточках
- [ ] Проверить работу ссылок на каталог со страницы аксессуара
- [ ] Проверить работу ссылок с главной страницы

---

### 7.2. Проверка изоляции
**Задачи:**
- [ ] Убедиться, что каталог игрушек не сломался
- [ ] Убедиться, что `CatalogStore` не используется на странице аксессуаров
- [ ] Убедиться, что URL параметры не конфликтуют
- [ ] Убедиться, что localStorage не конфликтует

---

## Приоритеты

**Высокий приоритет (MVP):**
- Этап 1: Backend API
- Этап 3: Store
- Этап 4: Основные компоненты (Page, Sidebar, Results, Toolbar)
- Этап 5: Интеграция в WordPress

**Средний приоритет:**
- Этап 2: Общие утилиты (можно делать параллельно)
- Этап 4.6: Отображение остатков на карточках
- Этап 6: Прокидывание ссылок

**Низкий приоритет:**
- Этап 7: Детальное тестирование (после MVP)

---

## Заметки

- Все компоненты каталога аксессуаров должны быть в отдельной папке `components/accessory-catalog/`
- Общие утилиты выносим в `components/catalog-shared/`
- Не трогаем существующий каталог игрушек (`components/catalog/`)
- Используем существующий компонент `ny-accessory-card`, только расширяем для остатков

