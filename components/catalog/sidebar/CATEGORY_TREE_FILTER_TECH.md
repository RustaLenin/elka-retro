# Category Tree Filter - Техническая документация

## Обзор

Компонент `category-tree-filter` - это веб-компонент для иерархической фильтрации категорий товаров в каталоге. Компонент работает напрямую с `catalog-store`, не является полем формы.

**Основные возможности:**
- Иерархическое дерево категорий с раскрытием/сворачиванием узлов
- Множественный выбор категорий (рекурсивный выбор дочерних)
- Поиск по названиям категорий с автоматическим раскрытием пути
- Разворот на весь экран с скрытием других фильтров
- CSS-управляемая видимость без полной перерисовки DOM
- Сохранение состояния раскрытия в `localStorage`
- Отображение количества доступных товаров в каждой категории

## Архитектура

### Файлы компонента

```
components/catalog/sidebar/
├── category-tree-filter.js          # Основная логика компонента
├── category-tree-filter-template.js # HTML шаблоны
├── category-tree-filter-styles.css  # Стили и CSS логика видимости
└── shared-category-filter.js        # Обёртка для интеграции в sidebar
```

### Базовая структура

Компонент наследуется от `BaseElement` с отключенным автоматическим рендером (`static autoRender = false`) для оптимизации производительности.

```javascript
export class CategoryTreeFilter extends BaseElement {
  static autoRender = false; // Ручное управление рендером
  
  static stateSchema = {
    selectedCategories: { type: 'json', default: [] },
    expandedNodes: { type: 'json', default: [] },
    searchQuery: { type: 'string', default: '' },
    isExpanded: { type: 'boolean', default: false },
    categoryTree: { type: 'json', default: [] },
  };
}
```

### Источник данных

Компонент получает категории из `window.taxonomy_terms['category-of-toys']` в формате:
```javascript
{
  term_id: {
    id: number,
    name: string,
    slug: string,
    parent: number, // 0 для корневых
    toy_types_count: number, // Количество доступных товаров
  }
}
```

Компонент автоматически строит иерархическое дерево из плоской структуры.

## Основные методы

### Инициализация и жизненный цикл

#### `connectedCallback()`
- Загружает дерево категорий из `window.taxonomy_terms`
- Загружает состояние раскрытия из `localStorage`
- Загружает выбранные категории из `catalog-store`
- Подписывается на события `elkaretro:catalog:updated`
- Выполняет начальный рендер

#### `disconnectedCallback()`
- Отписывается от событий
- Сохраняет состояние раскрытия в `localStorage`

### Работа с данными

#### `_loadCategoryTree()`
Загружает плоскую структуру категорий из `window.taxonomy_terms['category-of-toys']` и строит иерархическое дерево.

#### `_buildTree(flatTerms)`
Преобразует плоскую структуру в иерархическое дерево:
- Создаёт `_categoriesMap` для быстрого доступа по ID
- Рекурсивно суммирует `toy_types_count` от дочерних к родительским
- Возвращает массив корневых узлов

```javascript
// Результат:
[
  {
    id: 1,
    name: "Категория 1",
    parent: 0,
    toy_types_count: 100, // Включает дочерние
    children: [
      {
        id: 2,
        name: "Подкатегория 1.1",
        parent: 1,
        toy_types_count: 50,
        children: []
      }
    ]
  }
]
```

### Выбор категорий

#### `_selectCategory(categoryId)`
Выбирает категорию и все её дочерние (рекурсивно):
- Добавляет категорию и все дочерние в `selectedCategories`
- Автоматически раскрывает все дочерние узлы
- Обновляет состояние без полного рендера
- Синхронизирует с `catalog-store`

#### `_deselectCategory(categoryId)`
Снимает выбор с категории и всех дочерних:
- Удаляет категорию и все дочерние из `selectedCategories`
- Если все дочерние сняты, автоматически снимает выбор с родителя
- Обновляет состояние без полного рендера
- Синхронизирует с `catalog-store`

#### `_syncWithStore()`
Синхронизирует выбранные категории с `catalog-store`:
```javascript
window.app.catalogStore.updateState({
  filters: {
    ...currentFilters,
    'category-of-toys': selectedIdsAsStrings // ['1', '2', '3']
  }
});
```

### Управление видимостью через CSS

#### `_updateNodeAttributes()`
Обновляет атрибуты видимости на DOM узлах без полного рендера:
- `selected="true"` - на выбранных узлах
- `has-selected-descendant="true"` - на родительских узлах выбранных (для показа пути)

Алгоритм:
1. Рекурсивно проходит по всему дереву
2. Находит все узлы с выбранными потомками
3. Устанавливает соответствующие атрибуты на DOM элементах

#### `_updateRootAttributes()`
Обновляет атрибуты корневого элемента:
- `any-selected="true"` - если есть выбранные категории
- `expanded="true"` - если компонент развёрнут на весь экран

#### CSS логика видимости

```css
/* По умолчанию все узлы видны */
.category-tree-filter .category-tree-filter__node {
  display: flex;
}

/* Если что-то выбрано и компонент не развёрнут - скрываем все */
.category-tree-filter[any-selected="true"]:not([expanded="true"]) .category-tree-filter__node {
  display: none;
}

/* Показываем выбранные узлы */
.category-tree-filter[any-selected="true"]:not([expanded="true"]) .category-tree-filter__node[selected="true"] {
  display: flex;
}

/* Показываем родительские узлы выбранных (путь) */
.category-tree-filter[any-selected="true"]:not([expanded="true"]) .category-tree-filter__node[has-selected-descendant="true"] {
  display: flex;
}

/* Если компонент развёрнут - показываем всё */
.category-tree-filter[expanded="true"] .category-tree-filter__node {
  display: flex;
}
```

### Раскрытие/сворачивание узлов

#### `_toggleNode(categoryId)`
Переключает состояние раскрытия узла:
- Обновляет `expandedNodes` в состоянии
- Вызывает `_updateNodeExpandedState()` для обновления DOM без рендера
- Сохраняет состояние в `localStorage`

#### `_updateNodeExpandedState(categoryId, isExpanded)`
Обновляет видимость дочерних узлов через CSS:
- Устанавливает `display: none/flex` на `.category-tree-filter__children`
- Обновляет иконку в кнопке раскрытия
- Обновляет `aria-expanded` и `aria-label`

**Важно:** Все дочерние узлы всегда рендерятся в DOM, но скрываются через CSS для оптимизации.

### Поиск

#### `_onSearchInput(event)`
Обрабатывает ввод поискового запроса:
- Debounce 300ms
- Обновляет `searchQuery` в состоянии
- Вызывает `render()` (полный рендер, так как меняется структура дерева)

#### `_filterTreeForSearch(nodes, query, expanded)`
Фильтрует дерево по поисковому запросу:
- Рекурсивно проходит по дереву
- Находит узлы, совпадающие по названию или имеющие совпадающих потомков
- Автоматически раскрывает путь к найденным узлам

### Разворот на весь экран

#### `toggleExpanded()`
Переключает состояние разворота:
- Обновляет `isExpanded` в состоянии
- Вызывает `_updateExpandedState()` для обновления CSS классов и атрибутов
- Эмитит событие `category-filter:expanded` для сайдбара

#### `_updateExpandedState(isExpanded)`
Обновляет CSS классы и атрибуты без полного рендера:
- Добавляет/удаляет класс `category-tree-filter--expanded`
- Обновляет атрибут `expanded` на корневом элементе (для CSS)
- Обновляет иконку в кнопке разворота

### Рендеринг

#### `render()`
Выполняет полный рендер компонента:
- Для поиска использует фильтрованное дерево (`_filterTreeForSearch`)
- Для остальных случаев рендерит **полное дерево** (видимость управляется CSS)
- После рендера вызывает `_updateNodeAttributes()` и `_updateRootAttributes()`

**Важно:** Полный рендер выполняется только при:
- Инициализации
- Поиске (меняется структура дерева)
- Очистке поиска

### Оптимизации производительности

1. **Отключен автоматический рендер** - `static autoRender = false`
2. **CSS-управляемая видимость** - вместо пересоздания DOM используются CSS атрибуты
3. **Точечные обновления DOM** - при выборе/раскрытии обновляются только необходимые элементы
4. **Дочерние узлы всегда в DOM** - скрываются через `display: none`, не удаляются
5. **Debounce для поиска** - 300ms для уменьшения количества рендеров

## События

### Входящие события

#### `elkaretro:catalog:updated`
Подписка на обновления каталога для синхронизации выбранных категорий:
```javascript
window.addEventListener('elkaretro:catalog:updated', this._onCatalogUpdate);
```

### Исходящие события

#### `category-filter:expanded`
Эмитится при развороте/сворачивании компонента:
```javascript
this.dispatchEvent(new CustomEvent('category-filter:expanded', {
  bubbles: true,
  composed: true,
  detail: { isExpanded }
}));
```

Слушатель в `catalog-sidebar.js` скрывает/показывает другие фильтры при развороте.

## Интеграция

### Использование в sidebar

Компонент интегрируется через `shared-category-filter.js`:

```javascript
// catalog-sidebar.js
import { initSharedCategoryFilter } from './shared-category-filter.js';

// Инициализация
this.categoryFilter = initSharedCategoryFilter(
  this.querySelector('[data-sidebar-category]')
);

// Получение значений
const selectedIds = this.categoryFilter.getValue(); // [1, 2, 3]

// Установка значений
this.categoryFilter.setValue([1, 2, 3]); // или ['slug-1', 'slug-2']
```

### API для sidebar

```javascript
// Получить выбранные категории (ID)
categoryFilter.getValue(): number[]

// Установить выбранные категории (ID или slug)
categoryFilter.setValue(values: number[] | string[]): void
```

## Хранение состояния

### localStorage

Состояние раскрытия узлов сохраняется в `localStorage`:
- Ключ: `elkaretro_category_filter_expanded`
- Формат: `JSON.stringify([1, 2, 3])` - массив ID раскрытых узлов
- Сохранение: при `disconnectedCallback()` и изменении `expandedNodes`
- Загрузка: при `connectedCallback()`

### catalog-store

Выбранные категории хранятся в `catalog-store`:
```javascript
{
  filters: {
    'category-of-toys': ['1', '2', '3'] // ID как строки
  }
}
```

Синхронизация выполняется автоматически при выборе/снятии категорий.

## Особенности реализации

### Подсчёт товаров

Рекурсивное суммирование `toy_types_count`:
```javascript
// В _buildTree
const sumCount = (node) => {
  if (node.children && node.children.length > 0) {
    node.toy_types_count = node.children.reduce((sum, child) => {
      return sum + (sumCount(child) || 0);
    }, node.toy_types_count || 0);
  }
  return node.toy_types_count || 0;
};
```

### Рекурсивный поиск потомков

Метод `_updateNodeAttributes()` использует рекурсивный обход для поиска узлов с выбранными потомками:
```javascript
const checkDescendants = (nodeId) => {
  const node = this._categoriesMap.get(nodeId);
  if (selected.has(nodeId)) return true;
  
  let hasSelectedChild = false;
  if (node.children) {
    for (const child of node.children) {
      if (checkDescendants(child.id)) {
        hasSelectedChild = true;
      }
    }
  }
  
  if (hasSelectedChild) {
    nodesWithSelectedDescendants.add(nodeId);
  }
  
  return hasSelectedChild || selected.has(nodeId);
};
```

### Раскрытие пути к категории

При загрузке выбранных категорий из стора автоматически раскрывается путь:
```javascript
selectedIds.forEach(id => {
  this._expandPathToCategory(id);
});

_expandPathToCategory(categoryId) {
  // Поднимаемся вверх по дереву, раскрывая всех родителей
  let current = node;
  while (current && current.parent !== 0) {
    expanded.add(current.parent);
    current = this._categoriesMap.get(current.parent);
  }
}
```

## Расширение функциональности

### Добавление новых действий

При добавлении новых действий нужно учитывать:
1. Обновлять атрибуты через `_updateNodeAttributes()` и `_updateRootAttributes()`
2. Не вызывать полный `render()` без необходимости
3. Сохранять состояние в `localStorage` если нужно

### Изменение логики видимости

Логика видимости находится в CSS (`category-tree-filter-styles.css`). Для изменения:
1. Обновить CSS правила для новых атрибутов
2. Обновить `_updateNodeAttributes()` для установки атрибутов

## Отладка

### Логирование

Компонент использует `console.warn` для предупреждений:
```javascript
console.warn('[category-tree-filter] window.taxonomy_terms not available');
```

### Проверка состояния

Можно проверить состояние через DevTools:
```javascript
// В консоли браузера
const filter = document.querySelector('category-tree-filter');
console.log(filter.state);
// { selectedCategories: [...], expandedNodes: [...], ... }
```

### Проверка атрибутов

Проверка CSS атрибутов в DOM:
```javascript
// Выбранные узлы
document.querySelectorAll('[selected="true"]');

// Родительские узлы выбранных
document.querySelectorAll('[has-selected-descendant="true"]');

// Корневой элемент
document.querySelector('.category-tree-filter').getAttribute('any-selected');
document.querySelector('.category-tree-filter').getAttribute('expanded');
```

## Известные ограничения

1. **Поиск делает полный рендер** - это необходимо, так как меняется структура дерева
2. **Все дочерние узлы всегда в DOM** - может быть проблемой при очень больших деревьях (1000+ узлов)
3. **Синхронизация только с catalog-store** - компонент не работает как обычное поле формы

## Будущие улучшения

- [ ] Виртуализация для больших деревьев (>500 узлов)
- [ ] Оптимизация `_updateNodeAttributes()` для очень глубоких деревьев
- [ ] Кэширование результатов поиска
- [ ] Поддержка клавиатурной навигации

