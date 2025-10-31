# Глобальное Управление Стейтом (Global State Management)

## Обзор

В проекте используется централизованное управление состоянием через `window.app.state`, которое позволяет компонентам обмениваться данными без необходимости прокидывать их через атрибуты HTML или PHP.

## Архитектура

### Глобальный стейт (`window.app.state`)

Расположен в `app/app.js`. Предоставляет:

```javascript
window.app.state = {
  currentPageData: {
    toyType: null,      // Данные типа игрушки
    toyInstance: null,   // Данные экземпляра игрушки
    page: null,         // Данные страницы WordPress
    post: null          // Данные поста WordPress
  },
  
  // Получить значение по пути
  get(path: string): any,
  
  // Установить значение по пути (с dispatch события)
  set(path: string, value: any): boolean,
  
  // Массовое обновление объекта
  setData(data: object): boolean
}
```

## События (Events)

### Общие события

#### `app-state-changed`

Срабатывает при любом изменении стейта через `state.set()` или `state.setData()`.

**Payload:**
```javascript
{
  path: string | null,      // Путь изменённого свойства (например, "toyInstance.images")
  value: any,               // Новое значение
  fullPath: string | null   // Полный путь
}
```

**Пример использования:**
```javascript
window.addEventListener('app-state-changed', (e) => {
  const { path, value } = e.detail;
  if (path === 'toyInstance.images') {
    // Обновить галерею изображений
  }
});
```

### Специфичные события загрузки данных

#### `app-state-toy-type-loaded`

Срабатывает после загрузки данных типа игрушки из WordPress REST API.

**Payload:**
```javascript
{
  toyType: object,    // Полные данные типа игрушки из REST API
  images: array       // Массив изображений в формате [{url, thumbnail, alt, caption}]
}
```

#### `app-state-toy-instance-loaded`

Срабатывает после загрузки данных экземпляра игрушки из WordPress REST API.

**Payload:**
```javascript
{
  toyInstance: object,  // Полные данные экземпляра из REST API
  images: array         // Массив изображений в формате [{url, thumbnail, alt, caption}]
}
```

## Использование

### Сохранение данных в стейт

#### 1. Сохранение данных типа игрушки

```javascript
// В компоненте toy-type-single.js после загрузки из REST API

// Сохраняем основные данные
window.app.state.currentPageData.toyType = json;

// Сохраняем изображения через set() (автоматически dispatch события)
window.app.state.set('toyType.images', images);

// Dispatch специфичного события
const event = new CustomEvent('app-state-toy-type-loaded', {
  detail: {
    toyType: json,
    images: images
  }
});
window.dispatchEvent(event);
```

#### 2. Сохранение данных экземпляра

```javascript
// В компоненте toy-instance-modal.js после загрузки из REST API

// Сохраняем основные данные
window.app.state.currentPageData.toyInstance = json;

// Сохраняем изображения через set()
window.app.state.set('toyInstance.images', images);

// Dispatch специфичного события
const event = new CustomEvent('app-state-toy-instance-loaded', {
  detail: {
    toyInstance: json,
    images: images
  }
});
window.dispatchEvent(event);
```

### Получение данных из стейта

#### 1. Через метод `get()`

```javascript
// Получить изображения экземпляра
const images = window.app.state.get('toyInstance.images');

// Получить полные данные типа
const toyType = window.app.state.get('toyType');
```

#### 2. Через атрибут компонента (state-path)

```html
<!-- В HTML шаблоне -->
<ui-image-gallery state-path="toyInstance.images"></ui-image-gallery>
<ui-image-gallery state-path="toyType.images"></ui-image-gallery>
```

Компонент автоматически получает данные из стейта по указанному пути.

### Подписка на изменения стейта

#### 1. Общее событие `app-state-changed`

```javascript
export class MyComponent extends BaseElement {
  connectedCallback() {
    super.connectedCallback();
    
    // Сохраняем обработчик для последующего удаления
    this._handleStateChanged = (e) => {
      const { path, value } = e.detail;
      
      // Проверяем, что изменение касается наших данных
      if (path === 'toyInstance.images') {
        this.updateGallery(value);
      }
    };
    
    window.addEventListener('app-state-changed', this._handleStateChanged);
  }
  
  disconnectedCallback() {
    // Обязательно удаляем слушатель!
    if (this._handleStateChanged) {
      window.removeEventListener('app-state-changed', this._handleStateChanged);
    }
  }
}
```

#### 2. Специфичные события загрузки

```javascript
export class MyComponent extends BaseElement {
  connectedCallback() {
    super.connectedCallback();
    
    // Слушаем загрузку экземпляра
    this._handleInstanceLoaded = (e) => {
      const { toyInstance, images } = e.detail;
      // Обновляем компонент
      this.updateWithData(toyInstance, images);
    };
    
    window.addEventListener('app-state-toy-instance-loaded', this._handleInstanceLoaded);
  }
  
  disconnectedCallback() {
    if (this._handleInstanceLoaded) {
      window.removeEventListener('app-state-toy-instance-loaded', this._handleInstanceLoaded);
    }
  }
}
```

## Пример: Корзина (Cart)

### Текущая реализация (нужно обновить)

**Текущий код в `app/app.js`:**
```javascript
cart: {
  items: [],
  add: function(itemId) {
    // Добавляет товар
    // Обновляет счётчик через updateCount()
    // Сохраняет в localStorage
  }
}
```

### Рекомендуемая реализация с событиями

```javascript
// В app/app.js
cart: {
  items: [],
  
  add: function(itemId) {
    const existingItem = this.items.find(item => item.id === itemId);
    
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      this.items.push({ id: itemId, quantity: 1 });
    }
    
    // Сохраняем в стейт и dispatch события
    window.app.state.set('cart.items', this.items);
    
    // Dispatch специфичного события
    const event = new CustomEvent('app-state-cart-updated', {
      detail: {
        items: this.items,
        count: this.getCount()
      }
    });
    window.dispatchEvent(event);
    
    // Сохраняем в localStorage
    localStorage.setItem('cart', JSON.stringify(this.items));
  },
  
  remove: function(itemId) {
    this.items = this.items.filter(item => item.id !== itemId);
    
    // Обновляем стейт и dispatch события
    window.app.state.set('cart.items', this.items);
    
    const event = new CustomEvent('app-state-cart-updated', {
      detail: {
        items: this.items,
        count: this.getCount()
      }
    });
    window.dispatchEvent(event);
    
    localStorage.setItem('cart', JSON.stringify(this.items));
  },
  
  getCount: function() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }
}
```

### Подписка компонента на изменения корзины

```javascript
// В компоненте счётчика корзины (например, site-header)
export class SiteHeader extends BaseElement {
  connectedCallback() {
    super.connectedCallback();
    
    this._handleCartUpdated = (e) => {
      const { count } = e.detail;
      this.updateCartCount(count);
    };
    
    window.addEventListener('app-state-cart-updated', this._handleCartUpdated);
    
    // Инициализируем счётчик из стейта
    const items = window.app.state.get('cart.items') || [];
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    this.updateCartCount(count);
  }
  
  disconnectedCallback() {
    if (this._handleCartUpdated) {
      window.removeEventListener('app-state-cart-updated', this._handleCartUpdated);
    }
  }
  
  updateCartCount(count) {
    const counter = this.querySelector('.cart-count');
    if (counter) {
      counter.textContent = count;
    }
  }
}
```

## Паттерны использования

### 1. Каскадирование источников данных

Компонент может получать данные из нескольких источников с приоритетами:

```javascript
loadDataFromSources() {
  // Приоритет 1: Глобальный стейт (state-path)
  if (this.state.statePath) {
    const data = window.app.state.get(this.state.statePath);
    if (data) {
      this.useData(data);
      return;
    }
  }
  
  // Приоритет 2: Атрибуты компонента
  if (this.state.data) {
    this.useData(this.state.data);
    return;
  }
  
  // Приоритет 3: Загрузка через API
  if (this.state.apiUrl) {
    this.loadFromAPI(this.state.apiUrl);
    return;
  }
  
  // Если ничего не найдено - empty state
  this.showEmptyState();
}
```

**Пример:** `ui-image-gallery` компонент использует этот паттерн:
- Сначала пытается получить из стейта (`state-path="toyInstance.images"`)
- Потом из атрибута `images` (JSON)
- Потом загружает по `image-ids` через Media API
- Если ничего нет - показывает empty state

### 2. Автоматическое обновление через события

Компонент подписывается на события и автоматически обновляется при изменении стейта:

```javascript
_setupStateListener() {
  // Общее событие изменения стейта
  this._handleStateChanged = (e) => {
    const { path } = e.detail;
    if (path === this.state.statePath) {
      const data = window.app.state.get(this.state.statePath);
      this.updateWithData(data);
    }
  };
  window.addEventListener('app-state-changed', this._handleStateChanged);
  
  // Специфичное событие загрузки
  this._handleDataLoaded = (e) => {
    const { data } = e.detail;
    this.updateWithData(data);
  };
  window.addEventListener('app-state-some-data-loaded', this._handleDataLoaded);
}
```

### 3. Сохранение данных после загрузки

После успешной загрузки данных из REST API:

1. Сохраняем основные данные в стейт
2. Извлекаем и сохраняем производные данные (например, изображения)
3. Dispatch общее событие `app-state-changed`
4. Dispatch специфичное событие загрузки (опционально)

```javascript
async loadData() {
  const json = await fetch('/wp-json/wp/v2/something/123').then(r => r.json());
  
  // 1. Сохраняем основные данные
  window.app.state.currentPageData.something = json;
  
  // 2. Извлекаем производные данные
  const derivedData = this.extractDerivedData(json);
  
  // 3. Сохраняем через set() (автоматически dispatch app-state-changed)
  window.app.state.set('something.derivedData', derivedData);
  
  // 4. Dispatch специфичного события
  window.dispatchEvent(new CustomEvent('app-state-something-loaded', {
    detail: { something: json, derivedData }
  }));
}
```

## Преимущества подхода

1. **Реактивность:** Компоненты автоматически обновляются при изменении данных
2. **Декомпозиция:** Компоненты не зависят от PHP атрибутов для передачи больших объёмов данных
3. **Производительность:** Нет polling, обновления происходят по событиям
4. **Масштабируемость:** Легко добавлять новые типы данных и события
5. **Отладка:** Можно легко отслеживать изменения стейта через события в DevTools

## Best Practices

1. **Всегда удаляйте слушатели событий** в `disconnectedCallback()`:
   ```javascript
   disconnectedCallback() {
     if (this._handleStateChanged) {
       window.removeEventListener('app-state-changed', this._handleStateChanged);
     }
   }
   ```

2. **Используйте специфичные события** для загрузки данных:
   - `app-state-toy-type-loaded` - более понятно, чем общий `app-state-changed`
   - Компоненты могут подписываться только на нужные события

3. **Проверяйте существование стейта** перед использованием:
   ```javascript
   if (window.app && window.app.state) {
     window.app.state.set('path', value);
   }
   ```

4. **Используйте каскадирование** для гибкости:
   - Сначала стейт (наиболее актуальные данные)
   - Потом атрибуты (статические данные)
   - Потом загрузка через API
   - В конце - empty state

5. **Сохраняйте обработчики событий** в переменных для последующего удаления:
   ```javascript
   this._handleStateChanged = (e) => { ... };
   window.addEventListener('app-state-changed', this._handleStateChanged);
   ```

## Примеры интеграции

### Пример 1: Компонент счётчика корзины

```javascript
export class CartCounter extends BaseElement {
  connectedCallback() {
    super.connectedCallback();
    
    // Слушаем изменения корзины
    this._handleCartUpdated = (e) => {
      const { count } = e.detail;
      this.updateCounter(count);
    };
    window.addEventListener('app-state-cart-updated', this._handleCartUpdated);
    
    // Инициализация из стейта
    const items = window.app.state.get('cart.items') || [];
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    this.updateCounter(count);
  }
  
  disconnectedCallback() {
    if (this._handleCartUpdated) {
      window.removeEventListener('app-state-cart-updated', this._handleCartUpdated);
    }
  }
  
  updateCounter(count) {
    this.textContent = count;
  }
}
```

### Пример 2: Компонент списка товаров в корзине

```javascript
export class CartList extends BaseElement {
  connectedCallback() {
    super.connectedCallback();
    
    this._handleCartUpdated = (e) => {
      const { items } = e.detail;
      this.renderCart(items);
    };
    window.addEventListener('app-state-cart-updated', this._handleCartUpdated);
    
    // Инициализация из стейта
    const items = window.app.state.get('cart.items') || [];
    this.renderCart(items);
  }
  
  disconnectedCallback() {
    if (this._handleCartUpdated) {
      window.removeEventListener('app-state-cart-updated', this._handleCartUpdated);
    }
  }
  
  renderCart(items) {
    this.innerHTML = items.map(item => `
      <div class="cart-item">
        Item ID: ${item.id}, Quantity: ${item.quantity}
      </div>
    `).join('');
  }
}
```

## Структура стейта для корзины (рекомендация)

```javascript
window.app.state.currentPageData = {
  // ... существующие данные
  cart: {
    items: [
      { id: 123, quantity: 2, price: 3000 },
      { id: 456, quantity: 1, price: 5000 }
    ],
    total: 11000,
    count: 3
  }
}
```

**Событие:** `app-state-cart-updated`
```javascript
{
  items: array,    // Массив товаров
  total: number,   // Общая сумма
  count: number    // Общее количество товаров
}
```

## Миграция существующего кода

### До (старый подход):

```javascript
// В компоненте корзины
cart.add = function(itemId) {
  this.items.push({ id: itemId });
  this.updateCount();
  localStorage.setItem('cart', JSON.stringify(this.items));
}

// В компоненте счётчика (polling или прямая зависимость)
setInterval(() => {
  const cart = JSON.parse(localStorage.getItem('cart') || '[]');
  updateCounter(cart.length);
}, 1000);
```

### После (новый подход):

```javascript
// В компоненте корзины
cart.add = function(itemId) {
  this.items.push({ id: itemId });
  
  // Сохраняем в стейт
  window.app.state.set('cart.items', this.items);
  
  // Dispatch события
  window.dispatchEvent(new CustomEvent('app-state-cart-updated', {
    detail: {
      items: this.items,
      count: this.items.length
    }
  }));
  
  localStorage.setItem('cart', JSON.stringify(this.items));
}

// В компоненте счётчика (через события)
this._handleCartUpdated = (e) => {
  updateCounter(e.detail.count);
};
window.addEventListener('app-state-cart-updated', this._handleCartUpdated);
```

## Отладка

### Просмотр текущего стейта

```javascript
// В консоли браузера
console.log(window.app.state.currentPageData);
```

### Отслеживание событий

```javascript
// В консоли браузера
window.addEventListener('app-state-changed', (e) => {
  console.log('State changed:', e.detail);
});

window.addEventListener('app-state-cart-updated', (e) => {
  console.log('Cart updated:', e.detail);
});
```

---

**Последнее обновление:** 2024

**Автор:** Разработка компонентов ElkaRetro Theme

