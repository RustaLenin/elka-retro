# План рефакторинга компонентов UI-Kit: Публичный API

## Цель

Привести все компоненты UI-Kit к единому стандарту публичного API для внешнего взаимодействия, обеспечивая инкапсуляцию, контроль состояния и правильную синхронизацию.

## Статус рефакторинга

### ✅ Реализовано (ВСЕ КОМПОНЕНТЫ)

1. **`ui-form-controller`** - полностью реализован
   - ✅ `getValues()` - получить все значения формы
   - ✅ `getFieldValue(fieldId)` - получить значение поля
   - ✅ `setFieldValue(fieldId, value)` - установить значение поля
   - ✅ `getField(fieldId)` - получить поле по ID
   - ✅ `getFields()` - получить все поля
   - ✅ `reset()` - сбросить форму
   - ✅ `isValid()` - проверить валидность
   - ✅ `isDirty()` - проверить, изменена ли форма
   - ✅ `submit()` - отправить форму
   - ✅ `clear()` - очистить форму (алиас для reset)

2. **`ui-form-field`** - полностью реализован
   - ✅ `value()` - получить значение поля
   - ✅ `setValue(value)` - установить значение
   - ✅ `reset()` - сбросить поле
   - ✅ `isValid()` - проверить валидность
   - ✅ `isDirty()` - проверить, изменено ли поле
   - ✅ `setError(message)` - установить ошибку
   - ✅ `clearError()` - очистить ошибку

3. **`ui-input-text`** - ✅ реализован
   - ✅ `value()` - получить значение (string)
   - ✅ `setValue(value)` - установить значение
   - ✅ `reset()` - сбросить к пустой строке
   - ✅ `isValid()` - проверить валидность
   - ✅ `focus()` / `blur()` - управление фокусом

4. **`ui-input-number`** - ✅ реализован
   - ✅ `value()` - получить числовое значение (number|null)
   - ✅ `setValue(value)` - установить значение (с валидацией min/max/precision)
   - ✅ `reset()` - сбросить к null
   - ✅ `isValid()` - проверить валидность
   - ✅ `focus()` / `blur()` - управление фокусом

5. **`ui-input-range`** - ✅ реализован
   - ✅ `value()` - получить диапазон `{min: number|null, max: number|null}`
   - ✅ `setValue(value)` - установить диапазон (с валидацией min/max и взаимными ограничениями)
   - ✅ `reset()` - сбросить к `{min: null, max: null}`
   - ✅ `isValid()` - проверить валидность

6. **`ui-select-single`** - ✅ реализован
   - ✅ `value()` - получить значение (string|null)
   - ✅ `setValue(value)` - установить значение (с проверкой опций)
   - ✅ `reset()` - сбросить к null
   - ✅ `isValid()` - проверить валидность
   - ✅ `open()` / `close()` - управление выпадающим списком

7. **`ui-select-multi`** - ✅ реализован
   - ✅ `value()` - получить массив значений (string[])
   - ✅ `setValue(value)` - установить значения (массив или одиночное значение)
   - ✅ `reset()` - сбросить к пустому массиву
   - ✅ `isValid()` - проверить валидность
   - ✅ `open()` / `close()` - управление выпадающим списком
   - ✅ `selectAll()` - выбрать все опции
   - ✅ `clear()` - очистить все значения

8. **`ui-form-checkbox`** - ✅ реализован
   - ✅ `value()` - получить состояние (boolean)
   - ✅ `setValue(value)` - установить состояние
   - ✅ `reset()` - сбросить к false
   - ✅ `isValid()` - проверить валидность
   - ✅ `toggle()` - переключить состояние
   - ✅ `check()` / `uncheck()` - установить в нужное состояние

9. **`ui-segmented-toggle`** - ✅ реализован
   - ✅ `value()` - получить значение (string|null)
   - ✅ `setValue(value)` - установить значение (с проверкой опций)
   - ✅ `reset()` - сбросить к null
   - ✅ `isValid()` - проверить валидность

10. **`ui-filter-chip`** - ✅ реализован
    - ✅ `value()` - получить значение чипа `{filterId: string, value: string, label: string}`
    - ✅ `setValue(value)` - установить значение чипа
    - ✅ `reset()` - сбросить к дефолтным значениям
    - ✅ `remove()` - удалить чип (эмитирует событие remove)

11. **`ui-filters-summary`** - ✅ реализован
    - ✅ `getFilters()` - получить все фильтры из чипов
    - ✅ `clear()` - очистить все чипы (удалить их из DOM)
    - ✅ `hasFilters()` - проверить, есть ли активные фильтры
    - ✅ `update(filters)` - обновить все фильтры (заменить существующие чипы новыми)

### ✅ Рефакторинг завершен

**Все компоненты UI-Kit теперь имеют единый публичный API!**

## Примеры использования

### Базовые операции с компонентами

#### Работа с инпутами

```javascript
class UIInputText extends BaseElement {
  // ✅ Публичный API
  value() {
    return this.state.value ?? '';
  }

  setValue(value) {
    const previousValue = this.state.value;
    const newValue = String(value ?? '');
    
    // Обновляем через setter (если есть связь с полем)
    if (this.state._valueDescriptor) {
      this.state.value = newValue;
    } else {
      this.setState({ value: newValue });
    }
    
    // Обновляем DOM напрямую (не перерисовываем!)
    if (this._inputEl) {
      this._inputEl.value = newValue;
    }
    
    // Устанавливаем dirty флаг
    if (previousValue !== newValue) {
      this.setState({ dirty: true });
      this._emitEvent('change', { value: newValue, previousValue });
    }
    
    return this;
  }

  reset() {
    const defaultValue = this.state.defaultValue ?? '';
    this.setValue(defaultValue);
    this.setState({ dirty: false, touched: false });
    this._updateStatus('idle', []);
    return this;
  }

  isValid() {
    return !this.state.status || this.state.status !== 'error';
  }

  focus() {
    if (this._inputEl) {
      this._inputEl.focus();
    }
    return this;
  }

  blur() {
    if (this._inputEl) {
      this._inputEl.blur();
    }
    return this;
  }
}
```

**Примечания:**
- Учитывать связь с `ui-form-field` через `_valueDescriptor`
- Не вызывать `render()` при изменении значения (обновлять DOM напрямую)
- Возвращать `this` для цепочки вызовов

---

#### 4. **`ui-input-number`**

**Текущее состояние:**
- ❌ Нет публичного API

**Требуется добавить:**

```javascript
class UIInputNumber extends BaseElement {
  // ✅ Публичный API
  value() {
    const val = this.state.value;
    if (val === null || val === undefined) return null;
    return Number(val);
  }

  setValue(value) {
    let newValue = null;
    
    if (value !== null && value !== undefined && value !== '') {
      newValue = Number(value);
      
      // Применяем min/max
      if (this.state.min !== null && newValue < this.state.min) {
        newValue = this.state.min;
      }
      if (this.state.max !== null && newValue > this.state.max) {
        newValue = this.state.max;
      }
      
      // Применяем precision
      if (this.state.precision !== null) {
        newValue = Number(newValue.toFixed(this.state.precision));
      }
    }
    
    const previousValue = this.state.value;
    
    // Обновляем через setter (если есть связь с полем)
    if (this.state._valueDescriptor) {
      this.state.value = newValue;
    } else {
      this.setState({ value: newValue });
    }
    
    // Обновляем DOM напрямую
    if (this._inputEl) {
      this._inputEl.value = newValue === null ? '' : newValue;
    }
    
    if (previousValue !== newValue) {
      this.setState({ dirty: true });
      this._emitEvent('change', { value: newValue, previousValue });
    }
    
    return this;
  }

  reset() {
    const defaultValue = this.state.defaultValue ?? null;
    this.setValue(defaultValue);
    this.setState({ dirty: false, touched: false });
    this._updateStatus('idle', []);
    return this;
  }

  isValid() {
    return !this.state.status || this.state.status !== 'error';
  }

  focus() {
    if (this._inputEl) {
      this._inputEl.focus();
    }
    return this;
  }

  blur() {
    if (this._inputEl) {
      this._inputEl.blur();
    }
    return this;
  }
}
```

**Примечания:**
- Возвращать `null` для пустых значений (не `0`)
- Применять `min`, `max`, `precision` автоматически
- Форматировать значение при выводе в DOM

---

#### 5. **`ui-input-range`**

**Текущее состояние:**
- ❌ Нет публичного API

**Требуется добавить:**

```javascript
class UIInputRange extends BaseElement {
  // ✅ Публичный API
  value() {
    return {
      min: this.state.minValue !== null ? Number(this.state.minValue) : null,
      max: this.state.maxValue !== null ? Number(this.state.maxValue) : null
    };
  }

  setValue(value) {
    let minValue = null;
    let maxValue = null;
    
    if (value && typeof value === 'object') {
      if (value.min !== null && value.min !== undefined && value.min !== '') {
        minValue = Number(value.min);
      }
      if (value.max !== null && value.max !== undefined && value.max !== '') {
        maxValue = Number(value.max);
      }
      
      // Применяем min/max ограничения
      const minLimit = this.state.min ?? null;
      const maxLimit = this.state.max ?? null;
      
      if (minLimit !== null && minValue !== null && minValue < minLimit) {
        minValue = minLimit;
      }
      if (maxLimit !== null && maxValue !== null && maxValue > maxLimit) {
        maxValue = maxLimit;
      }
      
      // Проверяем, что min <= max
      if (minValue !== null && maxValue !== null && minValue > maxValue) {
        [minValue, maxValue] = [maxValue, minValue];
      }
    }
    
    const previousValue = { min: this.state.minValue, max: this.state.maxValue };
    
    // Обновляем через setter (если есть связь с полем)
    if (this.state._valueDescriptor) {
      this.state.value = { min: minValue, max: maxValue };
    } else {
      this.setState({ minValue, maxValue });
    }
    
    // Обновляем DOM напрямую
    if (this._minInputEl) {
      this._minInputEl.value = minValue === null ? '' : minValue;
    }
    if (this._maxInputEl) {
      this._maxInputEl.value = maxValue === null ? '' : maxValue;
    }
    
    if (previousValue.min !== minValue || previousValue.max !== maxValue) {
      this.setState({ dirty: true });
      this._emitEvent('change', { 
        value: { min: minValue, max: maxValue }, 
        previousValue 
      });
    }
    
    return this;
  }

  reset() {
    const defaultValue = this.state.defaultValue ?? { min: null, max: null };
    this.setValue(defaultValue);
    this.setState({ dirty: false, touched: false });
    this._updateStatus('idle', []);
    return this;
  }

  isValid() {
    return !this.state.status || this.state.status !== 'error';
  }
}
```

**Примечания:**
- Возвращать объект `{ min, max }`
- Автоматически валидировать, что min <= max
- Обновлять оба инпута (min и max)

---

#### 6. **`ui-select-single`**

**Текущее состояние:**
- ❌ Нет публичного API

**Требуется добавить:**

```javascript
class UISelectSingle extends BaseElement {
  // ✅ Публичный API
  value() {
    return this.state.value ?? null;
  }

  setValue(value) {
    // Проверяем, что значение есть в опциях
    const option = this._findOptionByValue(value);
    if (value !== null && !option) {
      console.warn(`[ui-select-single] Value "${value}" not found in options`);
      return this;
    }
    
    const previousValue = this.state.value;
    
    // Обновляем через setter (если есть связь с полем)
    if (this.state._valueDescriptor) {
      this.state.value = value ?? null;
    } else {
      this.setState({ value: value ?? null });
    }
    
    // Обновляем UI
    this._updateSelectedState();
    
    if (previousValue !== value) {
      this.setState({ dirty: true });
      this._emitEvent('change', { value, previousValue });
    }
    
    return this;
  }

  reset() {
    const defaultValue = this.state.defaultValue ?? null;
    this.setValue(defaultValue);
    this.setState({ dirty: false, touched: false });
    this._updateStatus('idle', []);
    return this;
  }

  isValid() {
    return !this.state.status || this.state.status !== 'error';
  }

  open() {
    if (!this.state.disabled && !this.state.isOpen) {
      this._open();
    }
    return this;
  }

  close() {
    if (this.state.isOpen) {
      this._close();
    }
    return this;
  }

  _findOptionByValue(value) {
    if (value === null || value === undefined) return null;
    const options = this.state.options || [];
    return options.find(opt => opt.value === value || String(opt.value) === String(value));
  }
}
```

**Примечания:**
- Проверять наличие значения в опциях перед установкой
- Использовать `_updateSelectedState()` для обновления UI
- Добавить методы `open()` и `close()` для программного управления

---

#### 7. **`ui-select-multi`**

**Текущее состояние:**
- ❌ Нет публичного API

**Требуется добавить:**

```javascript
class UISelectMulti extends BaseElement {
  // ✅ Публичный API
  value() {
    // Возвращаем копию массива, чтобы предотвратить внешние изменения
    const values = this.state.values || [];
    return [...values];
  }

  setValue(value) {
    let newValues = [];
    
    if (Array.isArray(value)) {
      // Фильтруем только валидные значения из опций
      const options = this.state.options || [];
      const optionValues = options.map(opt => String(opt.value));
      newValues = value
        .map(v => String(v))
        .filter(v => optionValues.includes(v));
    } else if (value !== null && value !== undefined) {
      // Одиночное значение превращаем в массив
      const options = this.state.options || [];
      const optionValues = options.map(opt => String(opt.value));
      const strValue = String(value);
      if (optionValues.includes(strValue)) {
        newValues = [strValue];
      }
    }
    
    const previousValues = [...(this.state.values || [])];
    
    // Обновляем через setter (если есть связь с полем)
    if (this.state._valueDescriptor) {
      // Для массивов работаем напрямую
      this.state.values.length = 0;
      this.state.values.push(...newValues);
    } else {
      this.setState({ values: newValues });
    }
    
    // Обновляем UI
    this._updateSelectedState();
    
    const valuesChanged = 
      previousValues.length !== newValues.length ||
      previousValues.some(v => !newValues.includes(v));
    
    if (valuesChanged) {
      this.setState({ dirty: true });
      this._emitEvent('change', { 
        values: [...newValues], 
        previousValues 
      });
    }
    
    return this;
  }

  reset() {
    const defaultValue = this.state.defaultValue ?? [];
    this.setValue(Array.isArray(defaultValue) ? defaultValue : []);
    this.setState({ dirty: false, touched: false });
    this._updateStatus('idle', []);
    return this;
  }

  isValid() {
    return !this.state.status || this.state.status !== 'error';
  }

  open() {
    if (!this.state.disabled && !this.state.isOpen) {
      this._open();
    }
    return this;
  }

  close() {
    if (this.state.isOpen) {
      this._close();
    }
    return this;
  }

  selectAll() {
    const options = this.state.options || [];
    const allValues = options.map(opt => String(opt.value));
    this.setValue(allValues);
    return this;
  }

  clear() {
    this.setValue([]);
    return this;
  }
}
```

**Примечания:**
- Возвращать копию массива в `value()`, чтобы предотвратить внешние изменения
- Для массивов работать напрямую через ссылку (если есть `_valueDescriptor`)
- Добавить методы `selectAll()` и `clear()`

---

#### 8. **`ui-form-checkbox`**

**Текущее состояние:**
- ❌ Нет публичного API

**Требуется добавить:**

```javascript
class UIFormCheckbox extends BaseElement {
  // ✅ Публичный API
  value() {
    return Boolean(this.state.value);
  }

  setValue(value) {
    const newValue = Boolean(value);
    const previousValue = Boolean(this.state.value);
    
    // Обновляем через setter (если есть связь с полем)
    if (this.state._valueDescriptor) {
      this.state.value = newValue;
    } else {
      this.setState({ value: newValue });
    }
    
    // Обновляем DOM напрямую
    if (this._inputEl) {
      this._inputEl.checked = newValue;
    }
    
    if (previousValue !== newValue) {
      this.setState({ dirty: true });
      this._emitEvent('change', { value: newValue, previousValue });
    }
    
    return this;
  }

  reset() {
    const defaultValue = Boolean(this.state.defaultValue ?? false);
    this.setValue(defaultValue);
    this.setState({ dirty: false, touched: false });
    this._updateStatus('idle', []);
    return this;
  }

  isValid() {
    return !this.state.status || this.state.status !== 'error';
  }

  toggle() {
    this.setValue(!this.value());
    return this;
  }

  check() {
    this.setValue(true);
    return this;
  }

  uncheck() {
    this.setValue(false);
    return this;
  }
}
```

**Примечания:**
- Всегда возвращать `boolean` в `value()`
- Добавить методы `toggle()`, `check()`, `uncheck()` для удобства

---

#### 9. **`ui-segmented-toggle`**

**Текущее состояние:**
- ❌ Нет публичного API

**Требуется добавить:**

```javascript
class UISegmentedToggle extends BaseElement {
  // ✅ Публичный API
  value() {
    return this.state.value ?? null;
  }

  setValue(value) {
    // Проверяем, что значение есть в опциях
    const options = this.state.options || [];
    const option = options.find(opt => 
      opt.value === value || String(opt.value) === String(value)
    );
    
    if (value !== null && !option) {
      console.warn(`[ui-segmented-toggle] Value "${value}" not found in options`);
      return this;
    }
    
    const previousValue = this.state.value;
    
    // Обновляем через setter (если есть связь с полем)
    if (this.state._valueDescriptor) {
      this.state.value = value ?? null;
    } else {
      this.setState({ value: value ?? null });
    }
    
    // Обновляем UI
    this._updateActiveState();
    
    if (previousValue !== value) {
      this.setState({ dirty: true });
      this._emitEvent('change', { value, previousValue });
    }
    
    return this;
  }

  reset() {
    const defaultValue = this.state.defaultValue ?? null;
    this.setValue(defaultValue);
    this.setState({ dirty: false, touched: false });
    this._updateStatus('idle', []);
    return this;
  }

  isValid() {
    return !this.state.status || this.state.status !== 'error';
  }
}
```

**Примечания:**
- Похож на `ui-select-single`, но с другим UI
- Использовать `_updateActiveState()` для обновления визуального состояния

---

#### 10. **`ui-filter-chip`**

**Текущее состояние:**
- ❌ Нет публичного API

**Требуется добавить:**

```javascript
class UIFilterChip extends BaseElement {
  // ✅ Публичный API
  value() {
    return {
      fieldId: this.state.fieldId,
      value: this.state.value,
      label: this.state.label
    };
  }

  setValue(value) {
    // Для фильтр-чипа значение - это объект с fieldId, value и label
    if (value && typeof value === 'object') {
      this.setState({
        fieldId: value.fieldId ?? this.state.fieldId,
        value: value.value,
        label: value.label ?? this.state.label
      });
      this.render();
    }
    return this;
  }

  reset() {
    this.setValue({ 
      fieldId: null, 
      value: null, 
      label: null 
    });
    return this;
  }

  remove() {
    // Эмитируем событие удаления
    this._emitEvent('remove', {
      fieldId: this.state.fieldId,
      value: this.state.value
    });
    return this;
  }
}
```

**Примечания:**
- Значение - это объект с `fieldId`, `value` и `label`
- Добавить метод `remove()` для удаления чипа

---

#### 11. **`ui-filters-summary`**

**Текущее состояние:**
- ❌ Нет публичного API

**Требуется добавить:**

```javascript
class UIFiltersSummary extends BaseElement {
  // ✅ Публичный API
  getFilters() {
    const chips = Array.from(this.querySelectorAll('ui-filter-chip'));
    return chips.map(chip => chip.value());
  }

  clear() {
    const chips = Array.from(this.querySelectorAll('ui-filter-chip'));
    chips.forEach(chip => chip.remove());
    return this;
  }

  hasFilters() {
    return this.querySelectorAll('ui-filter-chip').length > 0;
  }

  update(filters) {
    // Очищаем существующие чипы
    this.clear();
    
    // Добавляем новые чипы
    if (Array.isArray(filters)) {
      filters.forEach(filter => {
        const chip = document.createElement('ui-filter-chip');
        chip.setValue(filter);
        this.appendChild(chip);
      });
    }
    
    return this;
  }
}
```

**Примечания:**
- Контейнерный компонент, управляет коллекцией `ui-filter-chip`
- Метод `update(filters)` для обновления всех фильтров сразу

---

## Общие принципы рефакторинга

### 1. Возвращаемые значения

- **Геттеры** (`value()`, `getValues()`): возвращают значение (примитив, объект, массив, null/undefined)
- **Сеттеры** (`setValue()`, `setFieldValue()`): возвращают `this` для цепочки вызовов
- **Действия** (`reset()`, `clear()`): возвращают `this`
- **Асинхронные** (`submit()`): возвращают `Promise`
- **Проверки** (`isValid()`, `hasError()`): возвращают `boolean`

### 2. Обновление DOM

- **НЕ вызывать `render()`** при изменении значения (это приведет к потере фокуса)
- **Обновлять DOM напрямую** через `this._inputEl.value = ...`
- Вызывать `render()` только при структурных изменениях (`disabled`, `readonly`, `options` и т.д.)

### 3. Связь с родительскими компонентами

- Проверять наличие `this.state._valueDescriptor` - это признак связи с `ui-form-field`
- Если связь есть, использовать `this.state.value = ...` (setter)
- Если связи нет, использовать `this.setState({ value: ... })`

### 4. Валидация

- Метод `isValid()` должен проверять `this.state.status !== 'error'`
- Сеттеры могут применять базовую валидацию (min/max, тип данных)
- Валидация через события передается родителю (`ui-form-field`)

### 5. События

- Эмитировать события при изменении значения (`change`, `input`)
- События содержат `{ value, previousValue }` или `{ values, previousValues }`
- **НЕ использовать события для синхронизации состояния** - только для реакций (логирование, UI обновления)

---

## Порядок выполнения рефакторинга

1. **Приоритет 1** (критично):
   - `ui-input-text`
   - `ui-input-number`
   - `ui-select-single`
   - `ui-select-multi`

2. **Приоритет 2** (важно):
   - `ui-input-range`
   - `ui-form-checkbox`
   - `ui-segmented-toggle`

3. **Приоритет 3** (желательно):
   - `ui-filter-chip`
   - `ui-filters-summary`

---

## Чек-лист для каждого компонента

- [ ] Добавлен метод `value()` (геттер)
- [ ] Добавлен метод `setValue(value)` (сеттер с валидацией)
- [ ] Добавлен метод `reset()` (сброс к дефолту)
- [ ] Добавлен метод `isValid()` (проверка валидности)
- [ ] Методы возвращают `this` для цепочки вызовов (кроме геттеров)
- [ ] Учитывается связь с `ui-form-field` через `_valueDescriptor`
- [ ] DOM обновляется напрямую (без `render()`) при изменении значения
- [ ] Эмитируются события `change` при изменении значения
- [ ] Добавлены методы для специфичных действий (если нужно)
- [ ] Обновлена документация компонента
- [ ] Написаны примеры использования

---

**Дата создания**: 2024  
**Статус**: В процессе  
**Версия**: 1.0

