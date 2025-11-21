# UI Tabs Component

Универсальный компонент табов для использования на любых страницах проекта.

## Особенности

- ✅ **Не перетирает контент** - использует `autoRender = false`
- ✅ **Универсальный** - без дефолтных значений, работает с любыми табами
- ✅ **Публичный API** - методы `showTab()` и `getActiveTab()`
- ✅ **События** - отправляет `ui-tabs:change` при смене таба

## Использование

### Базовый пример

```html
<ui-tabs active-tab="tab1">
  <ui-tab-item id="tab1" label="Первая вкладка"></ui-tab-item>
  <ui-tab-item id="tab2" label="Вторая вкладка"></ui-tab-item>
  <ui-tab-item id="tab3" label="Третья вкладка"></ui-tab-item>
</ui-tabs>
```

### С обработкой события

```javascript
const tabs = document.querySelector('ui-tabs');
tabs.addEventListener('ui-tabs:change', (e) => {
  console.log('Активный таб:', e.detail.activeTab);
  console.log('Предыдущий таб:', e.detail.previousTab);
});
```

### Программное переключение

```javascript
const tabs = document.querySelector('ui-tabs');
tabs.showTab('tab2'); // Переключить на таб с id="tab2"
const activeTab = tabs.getActiveTab(); // Получить текущий активный таб
```

## Структура

```
ui-kit/tabs/
  ├── ui-tabs.js              # Основной компонент
  ├── ui-tabs-template.js     # Шаблон рендеринга
  ├── ui-tabs-styles.css      # Стили
  └── README.md               # Документация
```

## Атрибуты

### `ui-tabs`

- `active-tab` (string) - ID активного таба
- `size` (string, опциональный) - Размер табов. Варианты: `small`, `medium` (по умолчанию), `large`

### `ui-tab-item`

- `id` (string, обязательный) - Уникальный идентификатор таба
- `label` (string, обязательный) - Текст кнопки таба

## События

### `ui-tabs:change`

Отправляется при смене активного таба.

```javascript
{
  detail: {
    activeTab: 'tab2',      // ID нового активного таба
    previousTab: 'tab1'     // ID предыдущего активного таба
  }
}
```

## Публичный API

### `showTab(tabId: string)`

Программно переключить таб.

### `getActiveTab(): string`

Получить ID текущего активного таба.

## Стили

Компонент использует CSS переменные из глобальной темы:
- `--color-border-accent` - цвет границы
- `--color-card` - цвет фона активного таба
- `--color-primary` - цвет текста активного таба
- `--color-muted-foreground` - цвет текста неактивного таба
- `--color-foreground` - цвет текста при наведении

## Примеры использования

### В профиле пользователя

```html
<ui-tabs active-tab="settings">
  <ui-tab-item id="settings" label="Настройки профиля"></ui-tab-item>
  <ui-tab-item id="orders" label="История заказов"></ui-tab-item>
  <ui-tab-item id="contact" label="Обратная связь"></ui-tab-item>
</ui-tabs>
```

### На главной странице

```html
<ui-tabs active-tab="toys" size="large">
  <ui-tab-item id="toys" label="Новинки ёлочных игрушек"></ui-tab-item>
  <ui-tab-item id="accessories" label="Новинки новогодних аксессуаров"></ui-tab-item>
  <ui-tab-item id="sale" label="Распродажа"></ui-tab-item>
  <ui-tab-item id="auction" label="Аукцион"></ui-tab-item>
</ui-tabs>
```

## Размеры табов

Компонент поддерживает три размера через атрибут `size`:

- **`small`** - Компактные табы (padding: 0.75rem 1rem, font-size: 0.875rem)
- **`medium`** - Стандартные табы (padding: 1rem 1.5rem, font-size: 0.95rem) - по умолчанию
- **`large`** - Крупные табы (padding: 1.25rem 2rem, font-size: 1.125rem, font-weight: 500)

Размеры адаптивны и уменьшаются на мобильных устройствах.

## Миграция со старого компонента

Если вы использовали старый `tab-navigation`:

1. Замените `<tab-navigation>` на `<ui-tabs>`
2. Замените `<tab-nav-item>` на `<ui-tab-item>`
3. Замените обработчик события `tab-navigation:change` на `ui-tabs:change`

