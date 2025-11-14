# План рефакторинга компонентов UI-Kit: Публичный API (Не формы)

## Цель

Привести все компоненты UI-Kit (не относящиеся к формам) к единому стандарту публичного API для внешнего взаимодействия, обеспечивая инкапсуляцию, контроль состояния и предсказуемое поведение.

## Статус рефакторинга

### ✅ Реализовано (ВСЕ КОМПОНЕНТЫ)

1. **`ui-button`** - ✅ реализован
   - ✅ `click()` - выполнить программный клик
   - ✅ `setLoading(loading)` - установить состояние загрузки
   - ✅ `setSuccess(success)` - установить состояние успеха
   - ✅ `setDisabled(disabled)` - установить disabled состояние
   - ✅ `reset()` - сбросить все состояния к дефолтным
   - ✅ `isLoading()` - проверить состояние загрузки
   - ✅ `isSuccess()` - проверить состояние успеха
   - ✅ `isDisabled()` - проверить disabled состояние

2. **`ui-modal`** - ✅ реализован
   - ✅ `isVisible()` - проверить, видимо ли модальное окно
   - ✅ `isLoading()` - проверить, идет ли загрузка данных
   - ✅ `title()` - получить заголовок
   - ✅ `setTitle(title)` - установить заголовок
   - ✅ `size()` - получить размер
   - ✅ `setSize(size)` - установить размер
   - ✅ `setClosable(closable)` - установить можно ли закрывать
   - ✅ `setApiUrl(apiUrl)` - установить URL для загрузки данных
   - ✅ `reset()` - сбросить к дефолтным значениям

3. **`ui-image-gallery`** - ✅ реализован
   - ✅ `getCurrentImage()` - получить текущее изображение
   - ✅ `getCurrentIndex()` - получить текущий индекс
   - ✅ `getImages()` - получить все изображения
   - ✅ `getImageCount()` - получить количество изображений
   - ✅ `next()` - перейти к следующему изображению
   - ✅ `prev()` - перейти к предыдущему изображению
   - ✅ `goTo(index)` - перейти к изображению по индексу
   - ✅ `openFullscreen()` - открыть полноэкранный режим
   - ✅ `closeFullscreen()` - закрыть полноэкранный режим
   - ✅ `toggleFullscreen()` - переключить полноэкранный режим
   - ✅ `isFullscreen()` - проверить, открыт ли полноэкранный режим
   - ✅ `isLoading()` - проверить, идет ли загрузка изображений
   - ✅ `reset()` - сбросить к дефолтным значениям

4. **`ui-notification`** - ✅ реализован
   - ✅ `type()` - получить тип уведомления
   - ✅ `message()` - получить сообщение
   - ✅ `setType(type)` - обновить тип уведомления
   - ✅ `setMessage(message)` - обновить сообщение
   - ✅ `update(type, message)` - обновить уведомление (тип и сообщение)
   - ✅ `close()` - закрыть уведомление немедленно
   - ✅ `extendDuration(durationMs)` - увеличить время показа

5. **`ui-icon`** - ✅ реализован
   - ✅ `name()` - получить имя иконки
   - ✅ `setName(name)` - установить имя иконки
   - ✅ `setSize(size)` - установить размер
   - ✅ `setSpin(spin)` - установить/убрать анимацию вращения
   - ✅ `toggleSpin()` - переключить анимацию вращения
   - ✅ `reset()` - сбросить к дефолтным значениям
   - ✅ `changeIcon(newName)` - оставлен для обратной совместимости

6. **`block-loader`** - ✅ реализован
   - ✅ `isVisible()` - проверить, видим ли лоадер
   - ✅ `label()` - получить текущую метку
   - ✅ `spinDuration()` - получить текущую длительность вращения
   - ✅ `fadeInDuration()` - получить текущую длительность появления
   - ✅ `fadeOutDuration()` - получить текущую длительность исчезновения
   - ✅ `reset()` - сбросить к дефолтным значениям

### ✅ Рефакторинг завершен

**Все компоненты UI-Kit (не формы) теперь имеют единый публичный API!**

## Примеры использования

### Работа с кнопками

```javascript
const button = document.querySelector('ui-button');
button.setLoading(true);          // Включить загрузку
button.setSuccess(true);          // Показать успех (автоматически скроется через 1.5 сек)
button.setDisabled(true);         // Отключить кнопку
button.reset();                   // Сбросить все состояния

if (button.isLoading()) {
  console.log('Кнопка загружается');
}

// Программный клик
await button.click();
```

### Работа с модальными окнами

```javascript
const modal = document.querySelector('ui-modal');
modal.setTitle('Новый заголовок').setSize('large').show();

if (modal.isVisible()) {
  console.log('Модальное окно открыто');
}

if (modal.isLoading()) {
  console.log('Идет загрузка данных');
}

// Загрузить данные и показать
await modal.setApiUrl('/api/data');
```

### Работа с галереей изображений

```javascript
const gallery = document.querySelector('ui-image-gallery');
const currentImage = gallery.getCurrentImage();
const currentIndex = gallery.getCurrentIndex();
const imageCount = gallery.getImageCount();

// Навигация
gallery.next();                   // Следующее изображение
gallery.prev();                   // Предыдущее изображение
gallery.goTo(5);                  // Перейти к изображению с индексом 5

// Полноэкранный режим
gallery.openFullscreen();         // Открыть
gallery.closeFullscreen();        // Закрыть
gallery.toggleFullscreen();       // Переключить

if (gallery.isFullscreen()) {
  console.log('Полноэкранный режим активен');
}
```

### Работа с уведомлениями

```javascript
// Создать уведомление
const notification = notify('success', 'Операция выполнена!');

// Обновить
notification.update('error', 'Произошла ошибка');

// Продлить время показа
notification.extendDuration(3000);

// Закрыть немедленно
notification.close();
```

### Работа с иконками

```javascript
const icon = document.querySelector('ui-icon');
icon.setName('check').setSize('large').setSpin(true);
icon.toggleSpin();                // Переключить вращение
icon.reset();                     // Сбросить к дефолтам

const iconName = icon.name();     // Получить имя иконки
```

### Работа с лоадерами

```javascript
const loader = document.querySelector('block-loader');
loader.setLabel('Загрузка...').show();

if (loader.isVisible()) {
  console.log('Лоадер видим');
}

const label = loader.label();     // Получить текущую метку
loader.reset();                   // Сбросить к дефолтам
```

## Устаревшие примеры (для справки)

#### 1. **`ui-button`** (УСТАРЕЛО - РЕАЛИЗОВАНО)

**Текущее состояние:**
- ✅ Все методы реализованы

```javascript
class UIButton extends BaseElement {
  // ✅ Публичный API
  
  /**
   * Выполнить программный клик
   * @returns {Promise}
   */
  async click() {
    if (this.state.disabled) return Promise.resolve();
    return this._onClick({ preventDefault: () => {}, stopPropagation: () => {} });
  }

  /**
   * Установить состояние загрузки
   * @param {boolean} loading - состояние загрузки
   * @returns {this}
   */
  setLoading(loading) {
    this.setState({ 
      loading: Boolean(loading),
      disabled: loading ? true : this.state.disabled
    });
    return this;
  }

  /**
   * Установить состояние успеха
   * @param {boolean} success - состояние успеха
   * @returns {this}
   */
  setSuccess(success) {
    this.setState({ success: Boolean(success) });
    // Автоматически сбрасываем success через 1.5 секунды
    if (success) {
      setTimeout(() => {
        if (this.state.success) {
          this.setState({ success: false });
        }
      }, 1500);
    }
    return this;
  }

  /**
   * Установить disabled состояние
   * @param {boolean} disabled - disabled состояние
   * @returns {this}
   */
  setDisabled(disabled) {
    this.setState({ disabled: Boolean(disabled) });
    return this;
  }

  /**
   * Сбросить все состояния к дефолтным
   * @returns {this}
   */
  reset() {
    this.setState({ 
      loading: false, 
      success: false, 
      disabled: false 
    });
    return this;
  }

  /**
   * Проверить, находится ли кнопка в состоянии загрузки
   * @returns {boolean}
   */
  isLoading() {
    return Boolean(this.state.loading);
  }

  /**
   * Проверить, находится ли кнопка в состоянии успеха
   * @returns {boolean}
   */
  isSuccess() {
    return Boolean(this.state.success);
  }

  /**
   * Проверить, отключена ли кнопка
   * @returns {boolean}
   */
  isDisabled() {
    return Boolean(this.state.disabled);
  }
}
```

**Приоритет:** Высокий (часто используется)

---

#### 2. **`ui-icon`**

**Текущее состояние:**
- ✅ Есть метод `changeIcon(newName)` (но не соответствует стандарту)
- ❌ Нет геттера `name()`
- ❌ Нет метода `setName()` (вместо `changeIcon()`)

**Требуется добавить/изменить:**

```javascript
class UiIcon extends BaseElement {
  // ✅ Публичный API
  
  /**
   * Получить имя иконки
   * @returns {string}
   */
  name() {
    return this.state.name || '';
  }

  /**
   * Установить имя иконки
   * @param {string} name - имя иконки
   * @returns {this}
   */
  setName(name) {
    this.setState({ name: String(name || '') });
    return this;
  }

  /**
   * Установить размер
   * @param {string} size - размер (small, medium, large)
   * @returns {this}
   */
  setSize(size) {
    this.setState({ size: String(size || 'medium') });
    return this;
  }

  /**
   * Установить/убрать анимацию вращения
   * @param {boolean} spin - включить/выключить вращение
   * @returns {this}
   */
  setSpin(spin) {
    this.setState({ spin: Boolean(spin) });
    return this;
  }

  /**
   * Переключить анимацию вращения
   * @returns {this}
   */
  toggleSpin() {
    return this.setSpin(!this.state.spin);
  }

  /**
   * Сбросить к дефолтным значениям
   * @returns {this}
   */
  reset() {
    this.setState({ 
      name: '', 
      size: 'medium', 
      spin: false 
    });
    return this;
  }

  // Оставить для обратной совместимости
  changeIcon(newName) {
    return this.setName(newName);
  }
}
```

**Приоритет:** Средний (простой компонент)

---

#### 3. **`block-loader`**

**Текущее состояние:**
- ✅ Есть методы `show()`, `hide()`, `destroy()`
- ✅ Есть методы `setLabel()`, `setSpinDuration()`, `setFadeInDuration()`, `setFadeOutDuration()`
- ❌ Нет методов для проверки состояния
- ❌ Нет метода `isVisible()`

**Требуется добавить:**

```javascript
class BlockLoader extends BaseElement {
  // ✅ Публичный API (дополнить существующие)
  
  /**
   * Проверить, видим ли лоадер
   * @returns {boolean}
   */
  isVisible() {
    return !this.classList.contains('hiding') && this.isConnected;
  }

  /**
   * Получить текущую метку
   * @returns {string}
   */
  label() {
    return this.state.label || '';
  }

  /**
   * Получить текущую длительность вращения
   * @returns {number}
   */
  spinDuration() {
    return this.state.spinduration || 1200;
  }

  /**
   * Получить текущую длительность появления
   * @returns {number}
   */
  fadeInDuration() {
    return this.state.fadeinduration || 400;
  }

  /**
   * Получить текущую длительность исчезновения
   * @returns {number}
   */
  fadeOutDuration() {
    return this.state.fadeoutduration || 400;
  }

  /**
   * Сбросить к дефолтным значениям
   * @returns {this}
   */
  reset() {
    this.setLabel('Загрузка...');
    this.setSpinDuration(1200);
    this.setFadeInDuration(400);
    this.setFadeOutDuration(400);
    this.show();
    return this;
  }
}
```

**Приоритет:** Низкий (методы уже есть, нужны только геттеры)

---

#### 4. **`ui-modal`**

**Текущее состояние:**
- ✅ Есть методы `show()`, `hide()`, `destroy()`
- ✅ Есть методы `setBodyContent()`, `appendBodyContent()`, `loadData()`
- ❌ Нет методов для проверки состояния
- ❌ Нет методов для управления title, size
- ❌ Нет методов для проверки loading состояния

**Требуется добавить:**

```javascript
class UIModal extends BaseElement {
  // ✅ Публичный API (дополнить существующие)
  
  /**
   * Проверить, видимо ли модальное окно
   * @returns {boolean}
   */
  isVisible() {
    return Boolean(this.state.visible);
  }

  /**
   * Проверить, идет ли загрузка данных
   * @returns {boolean}
   */
  isLoading() {
    return Boolean(this.state.loading);
  }

  /**
   * Получить заголовок
   * @returns {string}
   */
  title() {
    return this.state.title || '';
  }

  /**
   * Установить заголовок
   * @param {string} title - новый заголовок
   * @returns {this}
   */
  setTitle(title) {
    this.setState({ title: String(title || '') });
    return this;
  }

  /**
   * Получить размер
   * @returns {string}
   */
  size() {
    return this.state.size || 'medium';
  }

  /**
   * Установить размер
   * @param {string} size - новый размер (small, medium, large)
   * @returns {this}
   */
  setSize(size) {
    this.setState({ size: String(size || 'medium') });
    return this;
  }

  /**
   * Установить можно ли закрывать
   * @param {boolean} closable - можно ли закрывать
   * @returns {this}
   */
  setClosable(closable) {
    this.setState({ closable: Boolean(closable) });
    return this;
  }

  /**
   * Установить URL для загрузки данных
   * @param {string} apiUrl - URL для загрузки
   * @returns {Promise}
   */
  setApiUrl(apiUrl) {
    this.setState({ apiUrl: String(apiUrl || '') });
    if (apiUrl && this.isConnected) {
      return this.loadData();
    }
    return Promise.resolve();
  }

  /**
   * Сбросить к дефолтным значениям
   * @returns {this}
   */
  reset() {
    this.setState({
      title: '',
      size: 'medium',
      closable: true,
      apiUrl: '',
      loading: false,
      visible: false
    });
    this.setBodyContent('');
    return this;
  }
}
```

**Приоритет:** Высокий (важный компонент)

---

#### 5. **`ui-notification`**

**Текущее состояние:**
- ✅ Создается через функцию `notify(type, message, durationMs)`
- ✅ Автоматически удаляется через duration
- ❌ Нет методов для управления уже созданным уведомлением
- ❌ Нет методов для закрытия, обновления сообщения

**Требуется добавить:**

```javascript
class UINotification extends BaseElement {
  // ✅ Публичный API
  
  /**
   * Получить тип уведомления
   * @returns {string}
   */
  type() {
    return this.state.type || 'info';
  }

  /**
   * Получить сообщение
   * @returns {string}
   */
  message() {
    return this.state.message || '';
  }

  /**
   * Обновить тип уведомления
   * @param {string} type - новый тип (info, success, error, warning)
   * @returns {this}
   */
  setType(type) {
    this.setState({ type: String(type || 'info') });
    this.render();
    return this;
  }

  /**
   * Обновить сообщение
   * @param {string} message - новое сообщение
   * @returns {this}
   */
  setMessage(message) {
    this.setState({ message: String(message || '') });
    this.render();
    return this;
  }

  /**
   * Обновить уведомление (тип и сообщение)
   * @param {string} type - новый тип
   * @param {string} message - новое сообщение
   * @returns {this}
   */
  update(type, message) {
    if (type) this.setType(type);
    if (message !== undefined) this.setMessage(message);
    return this;
  }

  /**
   * Закрыть уведомление немедленно
   * @returns {this}
   */
  close() {
    this.classList.add('notify_end');
    setTimeout(() => {
      if (this.parentNode) {
        this.remove();
      }
    }, 300);
    return this;
  }

  /**
   * Увеличить время показа (сбросить таймер)
   * @param {number} durationMs - дополнительное время в миллисекундах
   * @returns {this}
   */
  extendDuration(durationMs) {
    // Очищаем старые таймеры и устанавливаем новые
    this.classList.remove('notify_end');
    const duration = (this.state.duration || 5000) + (durationMs || 0);
    this.state.duration = duration;
    
    setTimeout(() => {
      this.classList.remove('notify_rest');
      this.classList.add('notify_end');
    }, duration);
    
    setTimeout(() => {
      if (this.isConnected) {
        this.remove();
      }
    }, duration + 1000);
    
    return this;
  }
}
```

**Приоритет:** Средний (удобно для динамических уведомлений)

---

#### 6. **`ui-image-gallery`**

**Текущее состояние:**
- ✅ Есть метод `setImages(images)`
- ❌ Нет методов для навигации (`next()`, `prev()`, `goTo(index)`)
- ❌ Нет методов для управления fullscreen (`openFullscreen()`, `closeFullscreen()`, `isFullscreen()`)
- ❌ Нет методов для получения текущего изображения

**Требуется добавить:**

```javascript
class ImageGallery extends HTMLElement {
  // ✅ Публичный API (дополнить существующие)
  
  /**
   * Получить текущее изображение
   * @returns {Object|null} {url, thumbnail, alt, caption} или null
   */
  getCurrentImage() {
    const index = this._data.currentIndex;
    return this._data.images && this._data.images[index] ? { ...this._data.images[index] } : null;
  }

  /**
   * Получить текущий индекс
   * @returns {number}
   */
  getCurrentIndex() {
    return this._data.currentIndex || 0;
  }

  /**
   * Получить все изображения
   * @returns {Array}
   */
  getImages() {
    return this._data.images ? [...this._data.images] : [];
  }

  /**
   * Получить количество изображений
   * @returns {number}
   */
  getImageCount() {
    return this._data.images ? this._data.images.length : 0;
  }

  /**
   * Перейти к следующему изображению
   * @returns {this}
   */
  next() {
    const { currentIndex, images } = this._data;
    if (images && images.length > 0) {
      const newIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
      this._changeImageWithFade(newIndex);
    }
    return this;
  }

  /**
   * Перейти к предыдущему изображению
   * @returns {this}
   */
  prev() {
    const { currentIndex, images } = this._data;
    if (images && images.length > 0) {
      const newIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
      this._changeImageWithFade(newIndex);
    }
    return this;
  }

  /**
   * Перейти к изображению по индексу
   * @param {number} index - индекс изображения
   * @returns {this}
   */
  goTo(index) {
    const numIndex = Number(index);
    if (numIndex >= 0 && numIndex < (this._data.images?.length || 0)) {
      this._changeImageWithFade(numIndex);
    }
    return this;
  }

  /**
   * Открыть полноэкранный режим
   * @returns {this}
   */
  openFullscreen() {
    if (!this._data.fullscreen && this._data.images && this._data.images.length > 0) {
      this._data.fullscreen = true;
      this._render();
      document.body.style.overflow = 'hidden';
    }
    return this;
  }

  /**
   * Закрыть полноэкранный режим
   * @returns {this}
   */
  closeFullscreen() {
    if (this._data.fullscreen) {
      this._data.fullscreen = false;
      this._render();
      document.body.style.overflow = '';
    }
    return this;
  }

  /**
   * Переключить полноэкранный режим
   * @returns {this}
   */
  toggleFullscreen() {
    return this._data.fullscreen ? this.closeFullscreen() : this.openFullscreen();
  }

  /**
   * Проверить, открыт ли полноэкранный режим
   * @returns {boolean}
   */
  isFullscreen() {
    return Boolean(this._data.fullscreen);
  }

  /**
   * Проверить, идет ли загрузка изображений
   * @returns {boolean}
   */
  isLoading() {
    return Boolean(this._data.loading);
  }

  /**
   * Сбросить к дефолтным значениям
   * @returns {this}
   */
  reset() {
    this._data.currentIndex = 0;
    this._data.images = [];
    this._data.loading = false;
    if (this._data.fullscreen) {
      this.closeFullscreen();
    }
    this._render();
    return this;
  }
}
```

**Приоритет:** Высокий (важный компонент для каталога)

---

#### 7. **`ui-tooltip`** (singleton manager)

**Текущее состояние:**
- ✅ Есть глобальные функции `window.app.ui.showHint()`, `window.app.ui.hideHint()`
- ✅ Работает через event delegation
- ❌ Нет методов для управления конкретным tooltip

**Примечание:** Tooltip работает как singleton manager и не является Web Component. Публичный API уже есть через `window.app.ui.showHint()` и `window.app.ui.hideHint()`. Можно оставить как есть или добавить методы для получения состояния.

**Приоритет:** Низкий (уже есть публичный API через window.app.ui)

---

## Порядок выполнения рефакторинга

1. **Приоритет 1** (критично):
   - `ui-button` - часто используется, нужны методы управления состоянием
   - `ui-modal` - важный компонент, нужны методы проверки состояния
   - `ui-image-gallery` - важный компонент для каталога, нужна навигация

2. **Приоритет 2** (важно):
   - `ui-notification` - удобно для динамических уведомлений
   - `ui-icon` - простой компонент, быстро добавить

3. **Приоритет 3** (желательно):
   - `block-loader` - методы уже есть, добавить только геттеры

---

## Общие принципы рефакторинга

### 1. Именование методов

- **Геттеры**: `name()`, `title()`, `message()`, `isVisible()`, `isLoading()` - возвращают значения
- **Сеттеры**: `setName()`, `setTitle()`, `setMessage()` - принимают параметры, возвращают `this`
- **Действия**: `show()`, `hide()`, `open()`, `close()`, `toggle()` - возвращают `this`
- **Проверки**: `isVisible()`, `isLoading()`, `isFullscreen()` - возвращают `boolean`

### 2. Возвращаемые значения

- **Геттеры**: Возвращают значение (примитив, объект, массив, null/undefined)
- **Сеттеры**: Возвращают `this` для цепочки вызовов
- **Действия**: Возвращают `this` или `Promise` (для асинхронных операций)
- **Проверки**: Возвращают `boolean`

### 3. Method chaining

Все сеттеры и действия должны возвращать `this` для цепочки вызовов:

```javascript
button.setLoading(true).setSuccess(false);
modal.setTitle('Заголовок').setSize('large').show();
gallery.next().openFullscreen();
```

### 4. Сохранение существующего функционала

- Все существующие методы должны оставаться работоспособными
- Новые методы добавляются, а не заменяют старые
- Для обратной совместимости старые методы могут вызывать новые

---

**Дата создания**: 2024  
**Статус**: В процессе  
**Версия**: 1.0

