# Рефакторинг ссылок на таксономии в каталог

## Цель
Переделать все ссылки на таксономии WordPress (`/taxonomy/.../`, `/?search=1&...`) на ссылки в каталог с выбранным фильтром (`/catalog/?category-of-toys=71&material=1`).

## Контекст
- **URL каталога**: `/catalog/` (из `elkaretro_get_catalog_page_url()`)
- **Формат фильтров в URL**: плоский `key=value1,value2` (как реализовано в `catalog-url-state.js`)
- **Примеры ссылок**:
  - Категория: `/catalog/?category-of-toys=71,80`
  - Материал: `/catalog/?material=1,2`
  - Несколько фильтров: `/catalog/?category-of-toys=71&material=1&year_of_production=1930s`

## Обнаруженные места с ссылками на таксономии

### 1. Страница типа игрушки (`toy-type-single`)
**Файл**: `components/toy-type/toy-type-single/toy-type-single-template.js`
- **Функция**: `getTaxonomyUrl(taxonomySlug, termSlug, termId = null)`
- **Текущий формат**: `/?search=1&${taxonomySlug}=${filterValue}`
- **Нужно**: `/catalog/?${taxonomySlug}=${termId}`
- **Используется в**: `formatTaxonomyValue()` для всех таксономий (categories, material, mounting_type, year_of_production, factory, occurrence)

### 2. Модальное окно экземпляра (`toy-instance-modal`)
**Файл**: `components/toy-instance/toy-instance-modal/toy-instance-modal-template.js`
- **Функция**: `getTaxonomyUrl(taxonomySlug, termSlug)`
- **Текущий формат**: `/taxonomy/${taxonomySlug}/${termSlug}/`
- **Нужно**: `/catalog/?${taxonomySlug}=${termId}`
- **Используется в**: `formatTaxonomyValue()` для таксономий экземпляра (material, mounting_type, condition, tube_condition и т.д.)

### 3. Страница аксессуара (`ny-accessory-single`)
**Файл**: `components/ny-accessory/ny-accessory-single/ny-accessory-single-template.js`
- **Функция**: `getTaxonomyUrl(taxonomySlug, termSlug, termId = null)`
- **Текущий формат**: `/?search=1&${taxonomySlug}=${filterValue}`
- **Нужно**: `/catalog/?${taxonomySlug}=${termId}` (но аксессуары не в каталоге игрушек, возможно нужен отдельный каталог?)
- **Используется в**: `renderTermLinks()` для всех таксономий аксессуара

### 4. Хлебные крошки категорий (`category-breadcrumbs`)
**Файл**: `components/category-breadcrumbs/category-breadcrumbs-template.js`
- **Текущий формат**: `/?search=1&category-of-toys=${category.id}`
- **Нужно**: `/catalog/?category-of-toys=${category.id}`
- **Используется в**: шаблоне для каждого элемента хлебных крошек

### 5. Карточки типов и экземпляров
**Файлы**: 
- `components/toy-type/toy-type-card/toy-type-card-template.js`
- `components/toy-instance/toy-instance-card/toy-instance-card-template.js`
- **Статус**: ✅ Не требуют изменений — там только ссылки на страницы типов/экземпляров, не на таксономии

## План работ

### Этап 1: Создание общей утилиты для формирования ссылок каталога
**Приоритет**: Высокий

#### 1.1. Создать файл `components/catalog/catalog-link-utils.js`
**Задачи**:
- [ ] Создать функцию `getCatalogUrl(filters = {}, options = {})`
  - Параметры:
    - `filters`: объект с фильтрами `{ 'category-of-toys': [71, 80], 'material': [1] }`
    - `options`: объект с опциями `{ mode: 'type', baseUrl: '/catalog/' }`
  - Возвращает: строку URL типа `/catalog/?mode=type&category-of-toys=71,80&material=1`
- [ ] Создать функцию `getCatalogTaxonomyUrl(taxonomySlug, termId, options = {})`
  - Параметры:
    - `taxonomySlug`: slug таксономии (например, `'category-of-toys'`)
    - `termId`: ID термина (число или строка)
    - `options`: объект с опциями `{ mode: 'type', baseUrl: '/catalog/', multiple: false }`
  - Возвращает: строку URL типа `/catalog/?category-of-toys=71`
  - Поддержка множественных значений: если `multiple: true` и уже есть фильтр, добавляет к существующему
- [ ] Экспортировать обе функции

**Зависимости**: `catalog-url-state.js` для формата сериализации

---

### Этап 2: Рефакторинг страницы типа игрушки
**Приоритет**: Высокий

#### 2.1. Обновить `toy-type-single-template.js`
**Файл**: `components/toy-type/toy-type-single/toy-type-single-template.js`
**Задачи**:
- [ ] Импортировать `getCatalogTaxonomyUrl` из `catalog-link-utils.js`
- [ ] Заменить функцию `getTaxonomyUrl()`:
  - Удалить текущую реализацию
  - Использовать `getCatalogTaxonomyUrl(taxonomySlug, termId, { mode: 'type' })`
- [ ] Обновить `formatTaxonomyValue()`:
  - Использовать `termId` вместо `termSlug` в `getCatalogTaxonomyUrl()`
  - Убедиться, что ID термина всегда передаётся (из `term.id` или `term.term_id`)
- [ ] Протестировать все ссылки на таксономии:
  - Категории (`category-of-toys`)
  - Материал (`material`)
  - Тип крепления (`mounting_type`)
  - Год производства (`year_of_production`)
  - Фабрика (`factory`)
  - Встречаемость (`occurrence`)

**Зависимости**: Этап 1

---

### Этап 3: Рефакторинг модального окна экземпляра
**Приоритет**: Высокий

#### 3.1. Обновить `toy-instance-modal-template.js`
**Файл**: `components/toy-instance/toy-instance-modal/toy-instance-modal-template.js`
**Задачи**:
- [ ] Импортировать `getCatalogTaxonomyUrl` из `catalog-link-utils.js`
- [ ] Заменить функцию `getTaxonomyUrl()`:
  - Удалить текущую реализацию `/taxonomy/${taxonomySlug}/${termSlug}/`
  - Использовать `getCatalogTaxonomyUrl(taxonomySlug, termId, { mode: 'type' })`
  - **Внимание**: нужно определить правильный `mode` — для фильтров типов игрушек это `'type'`, для фильтров экземпляров возможно нужен другой режим или фильтрация через тип
- [ ] Обновить `formatTaxonomyValue()`:
  - Использовать `termId` вместо `termSlug` в `getCatalogTaxonomyUrl()`
  - Убедиться, что ID термина всегда передаётся
- [ ] Протестировать все ссылки на таксономии экземпляра:
  - Материал (`material`)
  - Тип крепления (`mounting_type`)
  - Состояние (`condition`)
  - Состояние трубочки (`tube_condition`)
  - И другие таксономии экземпляра

**Зависимости**: Этап 1, возможно нужна консультация по режиму каталога для экземпляров

---

### Этап 4: Рефакторинг страницы аксессуара
**Приоритет**: Средний (аксессуары не в основном каталоге игрушек)

#### 4.1. Обновить `ny-accessory-single-template.js`
**Файл**: `components/ny-accessory/ny-accessory-single/ny-accessory-single-template.js`
**Задачи**:
- [ ] Определить: нужен ли каталог для аксессуаров или ссылки остаются как есть?
- [ ] Если нужен каталог аксессуаров:
  - Импортировать `getCatalogTaxonomyUrl` из `catalog-link-utils.js`
  - Заменить функцию `getTaxonomyUrl()` на использование `getCatalogTaxonomyUrl()`
  - Обновить `renderTermLinks()` для использования ID вместо slug
- [ ] Если каталог не нужен:
  - Оставить текущую реализацию или убрать ссылки на таксономии

**Зависимости**: Решение о каталоге аксессуаров

---

### Этап 5: Рефакторинг хлебных крошек
**Приоритет**: Средний

#### 5.1. Обновить `category-breadcrumbs-template.js`
**Файл**: `components/category-breadcrumbs/category-breadcrumbs-template.js`
**Задачи**:
- [ ] Импортировать `getCatalogTaxonomyUrl` из `catalog-link-utils.js`
- [ ] Заменить формирование URL в шаблоне:
  - Удалить `/?search=1&category-of-toys=${category.id}`
  - Использовать `getCatalogTaxonomyUrl('category-of-toys', category.id, { mode: 'type' })`
- [ ] Протестировать работу хлебных крошек на страницах типов игрушек

**Зависимости**: Этап 1

---

### Этап 6: Тестирование и проверка
**Приоритет**: Высокий

#### 6.1. Функциональное тестирование
**Задачи**:
- [ ] Проверить все ссылки на таксономии на странице типа игрушки
- [ ] Проверить все ссылки в модальном окне экземпляра
- [ ] Проверить хлебные крошки на страницах типов игрушек
- [ ] Убедиться, что все ссылки ведут в каталог с корректными фильтрами
- [ ] Проверить, что фильтры применяются корректно при переходе по ссылкам
- [ ] Проверить работу с множественными значениями (если реализовано)

#### 6.2. Проверка формата URL
**Задачи**:
- [ ] Убедиться, что формат URL соответствует `catalog-url-state.js`:
  - Плоский формат `key=value1,value2`
  - Использование ID терминов, а не slug
  - Корректная работа с запятыми (без `%2C`)
- [ ] Проверить работу с существующими фильтрами в URL (если пользователь уже на странице каталога)

#### 6.3. Кросс-браузерное тестирование
**Задачи**:
- [ ] Проверить работу в Chrome, Firefox, Safari
- [ ] Проверить работу на мобильных устройствах

---

## Дополнительные соображения

### 1. Режим каталога для экземпляров
**Вопрос**: Какой режим использовать для ссылок на таксономии в модальном окне экземпляра?
- **Вариант 1**: Всегда `mode=type` (фильтрация по типам игрушек)
- **Вариант 2**: Использовать `mode=instance` (если такой режим поддерживается)
- **Вариант 3**: Фильтровать через связанные типы игрушек

**Решение**: Требуется консультация с пользователем

### 2. Множественные значения в URL
**Вопрос**: Как обрабатывать множественные значения одного фильтра при клике на ссылку?
- **Вариант 1**: Заменять существующий фильтр (простое решение)
- **Вариант 2**: Добавлять к существующему фильтру (более сложное, но удобное для пользователя)

**Решение**: Начать с варианта 1, при необходимости расширить до варианта 2

### 3. Базовая ссылка каталога
**Вопрос**: Как получать базовую ссылку каталога в JS?
- **Вариант 1**: Хардкод `/catalog/`
- **Вариант 2**: Использовать `window.ajaxurl` или `wp_localize_script` из PHP
- **Вариант 3**: Получать из `window.location` или `document.querySelector('catalog-page')`

**Решение**: Начать с варианта 1, при необходимости добавить поддержку динамического получения из PHP

### 4. Аксессуары
**Вопрос**: Нужен ли каталог для аксессуаров или ссылки на таксономии аксессуаров остаются без изменений?

**Решение**: Требуется консультация с пользователем

---

## Порядок выполнения

1. ✅ Этап 1: Создание общей утилиты
2. ✅ Этап 2: Рефакторинг страницы типа игрушки
3. ✅ Этап 5: Рефакторинг хлебных крошек (быстро и просто)
4. ✅ Этап 3: Рефакторинг модального окна экземпляра
5. ⏸️ Этап 4: Рефакторинг страницы аксессуара (после решения вопроса)
6. ✅ Этап 6: Тестирование и проверка

---

## Заметки

- Все ссылки должны использовать **ID терминов**, а не slug (как мы сделали в фильтрах каталога)
- Формат URL должен соответствовать формату `catalog-url-state.js`: плоский `key=value1,value2`
- Базовая ссылка каталога: `/catalog/` (можно получить через `elkaretro_get_catalog_page_url()` из PHP)

