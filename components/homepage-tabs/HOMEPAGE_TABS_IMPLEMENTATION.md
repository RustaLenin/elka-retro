# Реализация табов на главной странице (Steam-стиль)

## Договорённости

### Архитектура
- **Вариант 1C (гибридный)**: PHP рендерит контент, JS компонент управляет видимостью
- Используем существующий компонент `tab-navigation` из профиля
- Создаём новый компонент `homepage-tabs-content` для управления контентом табов

### Структура компонентов

#### 1. `tab-navigation` (переиспользуем)
- Уже существует в `components/user-profile/profile-page/tab-navigation/`
- Отправляет событие `tab-navigation:change` при смене таба
- Не требует изменений

#### 2. `homepage-tabs-content` (новый компонент)
- **Наследование**: `HTMLElement` (НЕ BaseElement, чтобы не перезаписывать PHP-контент)
- **Функционал**: 
  - Слушает событие `tab-navigation:change`
  - Управляет видимостью `.tab-panel` элементов
  - НЕ перезаписывает innerHTML (работает с существующим DOM)

### Структура разметки

```html
<div class="homepage-tabs-wrapper">
  <tab-navigation active-tab="toys">
    <tab-nav-item id="toys" label="Новинки ёлочных игрушек"></tab-nav-item>
    <tab-nav-item id="accessories" label="Новинки новогодних аксессуаров"></tab-nav-item>
    <tab-nav-item id="sale" label="Распродажа"></tab-nav-item>
    <tab-nav-item id="auction" label="Аукцион"></tab-nav-item>
  </tab-navigation>
  
  <homepage-tabs-content active-tab="toys">
    <div class="tab-panel" data-tab-id="toys">
      <!-- Контент с toy-type-card -->
    </div>
    <div class="tab-panel" data-tab-id="accessories" style="display: none;">
      <!-- Контент с ny-accessory-card -->
    </div>
    <div class="tab-panel" data-tab-id="sale" style="display: none;">
      <!-- Заглушка -->
    </div>
    <div class="tab-panel" data-tab-id="auction" style="display: none;">
      <!-- Заглушка -->
    </div>
  </homepage-tabs-content>
</div>
```

### Табы

1. **"Новинки ёлочных игрушек"** (`id="toys"`)
   - Использует существующий `template-parts/latest-toy-types.php`
   - Показывает 9 последних типов игрушек
   - Компонент: `toy-type-card`

2. **"Новинки новогодних аксессуаров"** (`id="accessories"`)
   - Использует существующий `template-parts/latest-ny-accessories.php`
   - Показывает 6 последних аксессуаров
   - Компонент: `ny-accessory-card`

3. **"Распродажа"** (`id="sale"`)
   - Заглушка: "Распродажа - скоро"

4. **"Аукцион"** (`id="auction"`)
   - Заглушка: "Аукцион - скоро"

### Расположение

- Заменяет текущий блок "Новые поступления" в `index.php`
- Удаляем старый вызов `get_template_part('template-parts/latest-toy-types')`
- Старый блок "Новогодние аксессуары" также удаляется (он будет в табах)

### Стили

- Переиспользуем стили `tab-navigation` из профиля
- Добавляем стили для `.homepage-tabs-wrapper` и `.tab-panel`
- Стили карточек остаются без изменений

### Загрузка данных

- **Все данные загружаются сразу** при рендере PHP
- JS только управляет видимостью (display: block/none)
- Нет lazy loading (данных немного: 9 игрушек + 6 аксессуаров)

### Регистрация компонента

- Компонент `homepage-tabs-content` регистрируется в `components/components.js`
- Компонент `tab-navigation` уже зарегистрирован

## Файловая структура

```
components/
  homepage-tabs/
    homepage-tabs-content.js
    homepage-tabs-content-styles.css
    HOMEPAGE_TABS_IMPLEMENTATION.md

template-parts/
  homepage-tab-toys.php (новый, обёртка над latest-toy-types.php)
  homepage-tab-accessories.php (новый, обёртка над latest-ny-accessories.php)
```

## Порядок реализации

1. ✅ Создать документацию (этот файл)
2. Создать компонент `homepage-tabs-content`
3. Создать template-parts для табов
4. Обновить `index.php` (заменить старые секции)
5. Добавить стили
6. Зарегистрировать компонент
7. Протестировать переключение табов

