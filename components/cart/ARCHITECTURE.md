# Архитектура модуля корзины

## Принципы

### 1. Разделение ответственности

**Корзина - это глобальная сущность приложения**, которая управляется через публичный API `window.app.cart`.

**Компоненты - это только представление (View)**, они не содержат бизнес-логики и реагируют на события.

### 2. Публичный API

Все операции с корзиной выполняются через публичный API `window.app.cart`:

```javascript
// Добавить товар в корзину
window.app.cart.add(itemId, itemType, price);

// Удалить товар из корзины
window.app.cart.remove(itemId, itemType);

// Получить количество товаров
window.app.cart.getCount();

// Получить все товары
window.app.cart.getItems();

// Очистить корзину
window.app.cart.clear();
```

### 3. Событийная модель

После любого изменения корзины отправляется событие `elkaretro:cart:updated`:

```javascript
window.dispatchEvent(new CustomEvent('elkaretro:cart:updated', {
  detail: {
    cart: cartState,
    count: itemsCount,
    action: 'add' | 'remove' | 'clear',
    itemId: number | null,
    itemType: string | null
  }
}));
```

### 4. Реактивность компонентов

Компоненты **слушают события** и обновляются автоматически:

- **`cart-page`** - слушает `elkaretro:cart:updated` и перерисовывает список товаров
- **`cart-item`** - слушает `elkaretro:cart:item-removed` и удаляет себя из DOM, если его ID совпадает
- **`cart-summary`** - слушает `elkaretro:cart:updated` и пересчитывает итоги
- **`site-header`** - слушает `elkaretro:cart:updated` и обновляет счетчик

## Структура

```
┌─────────────────────────────────────────────────────────────┐
│                    window.app.cart                          │
│  Публичный API для работы с корзиной                        │
│  - add(id, type, price)                                     │
│  - remove(id, type)                                         │
│  - getCount()                                               │
│  - getItems()                                               │
│  - clear()                                                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    cart-store.js                            │
│  Централизованное управление состоянием                     │
│  - Хранение состояния                                       │
│  - Синхронизация с LocalStorage/UserMeta                    │
│  - Отправка событий elkaretro:cart:updated                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌───────────────┐              ┌───────────────┐
│  cart-page    │              │  cart-item    │
│  (слушает)    │              │  (слушает)    │
│  перерисовывает│              │  удаляет себя │
└───────────────┘              └───────────────┘
```

## Примеры использования

### Добавление товара в корзину

```javascript
// В компоненте товара (toy-instance-card, ny-accessory-card)
<ui-button 
  event="add-to-cart"
  onclick="window.app.cart.add(123, 'toy_instance', 5000)"
></ui-button>
```

Или через кастомное событие:

```javascript
// Компонент отправляет событие
this.dispatchEvent(new CustomEvent('add-to-cart', {
  detail: { id: 123, type: 'toy_instance', price: 5000 }
}));

// Глобальный обработчик в app.js
window.addEventListener('add-to-cart', (e) => {
  const { id, type, price } = e.detail;
  window.app.cart.add(id, type, price);
});
```

### Удаление товара из корзины

```javascript
// В cart-item компоненте
<ui-button 
  event="cart-item:remove-click"
  onclick="window.app.cart.remove(this.dataset.itemId, this.dataset.itemType)"
></ui-button>
```

Или через кастомное событие:

```javascript
// cart-item слушает событие от кнопки
this.addEventListener('cart-item:remove-click', () => {
  const { id, type } = this.state;
  window.app.cart.remove(id, type);
});
```

### Реакция компонентов на изменения

```javascript
// cart-page слушает события и перерисовывается
connectedCallback() {
  window.addEventListener('elkaretro:cart:updated', this._handleCartUpdate);
}

_handleCartUpdate = () => {
  this.updateItems(); // Перерисовывает список товаров
}

// cart-item слушает события и удаляет себя
connectedCallback() {
  window.addEventListener('elkaretro:cart:item-removed', this._handleItemRemoved);
}

_handleItemRemoved = (e) => {
  const { itemId, itemType } = e.detail;
  if (itemId === this.state.id && itemType === this.state.type) {
    this.remove(); // Удаляет себя из DOM
  }
}
```

## Правила

### ✅ Правильно

1. **Компоненты вызывают публичный API:**
   ```javascript
   window.app.cart.remove(id, type);
   ```

2. **Компоненты слушают события:**
   ```javascript
   window.addEventListener('elkaretro:cart:updated', handler);
   ```

3. **Компоненты не содержат бизнес-логики:**
   ```javascript
   // cart-item только отображает данные и вызывает API
   removeFromCart() {
     window.app.cart.remove(this.state.id, this.state.type);
   }
   ```

### ❌ Неправильно

1. **Компоненты напрямую работают с cart-store:**
   ```javascript
   // ❌ Плохо
   import { getCartStore } from '../cart-store.js';
   const store = getCartStore();
   store.removeItem(id, type);
   ```

2. **Компоненты содержат бизнес-логику:**
   ```javascript
   // ❌ Плохо
   removeFromCart() {
     const store = getCartStore();
     const items = store.getItems();
     const filtered = items.filter(item => item.id !== this.state.id);
     store._updateState({ items: filtered });
   }
   ```

3. **Компоненты напрямую обновляют DOM других компонентов:**
   ```javascript
   // ❌ Плохо
   removeFromCart() {
     window.app.cart.remove(id, type);
     // Напрямую удаляем элемент из DOM
     this.parentElement.removeChild(this);
   }
   ```

## Преимущества подхода

1. **Единая точка входа** - все операции через `window.app.cart`
2. **Разделение ответственности** - компоненты только отображают, API управляет
3. **Реактивность** - компоненты автоматически обновляются через события
4. **Тестируемость** - легко тестировать API отдельно от компонентов
5. **Расширяемость** - легко добавить новые компоненты, которые слушают события
6. **Отсутствие связей** - компоненты не знают друг о друге, только о событиях

## Миграция

При рефакторинге существующего кода:

1. Вынести все операции с корзиной в `window.app.cart`
2. Убрать прямые импорты `cart-store` из компонентов
3. Заменить прямые вызовы на вызовы через API
4. Добавить слушатели событий в компоненты
5. Убрать бизнес-логику из компонентов

