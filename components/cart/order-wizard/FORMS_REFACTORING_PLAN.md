# План рефакторинга форм в Order Wizard

## Обзор

Согласно новой архитектуре `ui-form-controller` (см. `components/ui-kit/form/controller/ARCHITECTURE.md`), формы должны:

1. ✅ Загружаться из глобального реестра через `config-path` атрибут
2. ✅ Рендерить поля автоматически из конфигурации (без ручного создания в HTML)
3. ✅ Использовать публичный API (`getValues()`, `setFieldValue()`, `getField()`, `validate()`, `reset()`)
4. ✅ НЕ использовать `setState({ values: ... })` для установки значений
5. ✅ НЕ создавать конфигурации вручную в JavaScript компонентах

## Текущее состояние

### ✅ step-personal.js
- **Статус:** Частично соответствует новому подходу
- **Использует:** `config-path="window.app.forms.orderPersonal"` ✅
- **Проблемы:**
  - ❌ Использует `setState({ values: this.state.formData })` для восстановления значений (строка 70-72)
  - ❌ Использует `form.state.values` напрямую в `getData()` (строка 119)

### ❌ step-logistics.js
- **Статус:** Не соответствует новому подходу
- **Проблемы:**
  - ❌ Создает конфигурацию формы вручную в `initForm()` (строки 84-199)
  - ❌ Использует `setState({ ...formConfig, values: ... })` для установки конфигурации (строка 202-212)
  - ❌ Нет `config-path` в шаблоне
  - ❌ Использует `form.state.values` напрямую в `getData()` (строка 295)

### ❌ step-payment.js
- **Статус:** Не соответствует новому подходу
- **Проблемы:**
  - ❌ Создает конфигурацию формы вручную в `initForm()` (строки 52-86)
  - ❌ Использует `setState({ ...formConfig, values: ... })` для установки конфигурации (строка 89-94)
  - ❌ Нет `config-path` в шаблоне
  - ❌ Использует `form.state.values` напрямую в `getData()` (строка 198)

## План рефакторинга

### Этап 1: Создание конфигураций форм

#### 1.1. Создать `app/forms/order-logistics.js`

```javascript
export const orderLogisticsFormConfig = {
  fields: [
    {
      id: 'delivery_method',
      type: 'select-single',
      label: 'Способ доставки',
      required: true,
      options: [
        { value: 'courier', label: 'Курьером' },
        { value: 'pickup', label: 'Самовывоз' },
        { value: 'post', label: 'Почта России' },
      ],
      validation: {
        rules: ['required']
      },
      icon: {
        key: 'truck',
        icon_position: 'left',
        color: '#888888'
      }
    },
    {
      id: 'country',
      type: 'text',
      label: 'Страна',
      placeholder: 'Россия',
      autocomplete: 'country',
      required: true,
      defaultValue: 'Россия',
      validation: {
        rules: ['required']
      },
      icon: {
        key: 'map',
        icon_position: 'left',
        color: '#888888'
      }
    },
    {
      id: 'region',
      type: 'text',
      label: 'Регион / Область',
      placeholder: 'Введите регион или область',
      autocomplete: 'address-level1',
      required: true,
      validation: {
        rules: ['required']
      },
      icon: {
        key: 'map',
        icon_position: 'left',
        color: '#888888'
      }
    },
    {
      id: 'city',
      type: 'text',
      label: 'Город',
      placeholder: 'Введите город',
      autocomplete: 'address-level2',
      required: true,
      validation: {
        rules: ['required']
      },
      icon: {
        key: 'map',
        icon_position: 'left',
        color: '#888888'
      }
    },
    {
      id: 'street',
      type: 'text',
      label: 'Улица, дом, квартира',
      placeholder: 'Введите адрес',
      autocomplete: 'street-address',
      required: true,
      validation: {
        rules: ['required']
      },
      icon: {
        key: 'home',
        icon_position: 'left',
        color: '#888888'
      }
    },
    {
      id: 'postal_code',
      type: 'text',
      label: 'Почтовый индекс',
      placeholder: '123456',
      autocomplete: 'postal-code',
      required: false,
      validation: {
        rules: ['pattern:^[0-9]{6}$']
      },
      icon: {
        key: 'mail',
        icon_position: 'left',
        color: '#888888'
      }
    }
  ],
  actions: {
    submit: {
      label: 'Продолжить',
      variant: 'primary'
    }
  },
  pipeline: {
    sanitize: true,
    validate: true,
    submit: async (values) => {
      // Submit будет обрабатываться в step-logistics.js через событие
      return { success: true, values };
    },
    onSuccess: (data) => {
      // Уведомляем компонент шага
      const event = new CustomEvent('order-logistics:submit', {
        detail: data.values
      });
      window.dispatchEvent(event);
    }
  }
};
```

#### 1.2. Создать `app/forms/order-payment.js`

```javascript
export const orderPaymentFormConfig = {
  fields: [
    {
      id: 'payment_method',
      type: 'select-single',
      label: 'Способ оплаты',
      required: true,
      options: [
        { value: 'bank_transfer', label: 'Банковский перевод' },
        { value: 'card', label: 'Банковская карта' },
        { value: 'cash', label: 'Наличными при получении' },
      ],
      validation: {
        rules: ['required']
      },
      icon: {
        key: 'credit_card',
        icon_position: 'left',
        color: '#888888'
      }
    }
  ],
  actions: {
    submit: {
      label: 'Продолжить',
      variant: 'primary'
    }
  },
  pipeline: {
    sanitize: true,
    validate: true,
    submit: async (values) => {
      // Submit будет обрабатываться в step-payment.js через событие
      return { success: true, values };
    },
    onSuccess: (data) => {
      // Уведомляем компонент шага
      const event = new CustomEvent('order-payment:submit', {
        detail: data.values
      });
      window.dispatchEvent(event);
    }
  }
};
```

#### 1.3. Зарегистрировать в `app/forms/index.js`

```javascript
// ... existing imports ...
import { orderLogisticsFormConfig } from './order-logistics.js';
import { orderPaymentFormConfig } from './order-payment.js';

// ... existing code ...

window.app.forms.orderLogistics = orderLogisticsFormConfig;
window.app.forms.orderPayment = orderPaymentFormConfig;
```

### Этап 2: Рефакторинг step-personal.js

#### Изменения:

1. **Заменить `setState({ values })` на `setFieldValue()`:**

```javascript
// ❌ Было:
if (this.state.formData) {
  this._formController.setState({
    values: this.state.formData
  });
}

// ✅ Станет:
if (this.state.formData && this._formController) {
  Object.keys(this.state.formData).forEach(fieldId => {
    this._formController.setFieldValue(fieldId, this.state.formData[fieldId]);
  });
}
```

2. **Заменить `form.state.values` на `form.getValues()`:**

```javascript
// ❌ Было:
async getData() {
  if (this._formController) {
    const formData = this._formController.state.values || {};
    return {
      email: formData.email,
      // ...
    };
  }
  return this.state.formData || {};
}

// ✅ Станет:
async getData() {
  if (this._formController) {
    const formData = this._formController.getValues() || {};
    return {
      email: formData.email,
      // ...
    };
  }
  return this.state.formData || {};
}
```

### Этап 3: Рефакторинг step-logistics.js

#### Изменения:

1. **Удалить ручное создание конфигурации** (строки 84-199)

2. **Обновить шаблон** - добавить `config-path`:

```html
<ui-form-controller config-path="window.app.forms.orderLogistics"></ui-form-controller>
```

3. **Изменить `initForm()`** - использовать публичный API для установки значений:

```javascript
async initForm() {
  await customElements.whenDefined('ui-form-controller');
  
  // Ждём несколько кадров для полной инициализации
  await new Promise((resolve) => requestAnimationFrame(() => {
    requestAnimationFrame(resolve);
  }));
  
  this._formController = this.querySelector('ui-form-controller');
  if (!this._formController) {
    console.error('[StepLogistics] Form controller not found');
    return;
  }

  // Устанавливаем значения через публичный API
  if (this.state.deliveryMethod) {
    this._formController.setFieldValue('delivery_method', this.state.deliveryMethod);
  }
  
  if (this.state.address) {
    const addr = this.state.address;
    if (addr.country) this._formController.setFieldValue('country', addr.country);
    if (addr.region) this._formController.setFieldValue('region', addr.region);
    if (addr.city) this._formController.setFieldValue('city', addr.city);
    if (addr.street) this._formController.setFieldValue('street', addr.street);
    if (addr.postal_code) this._formController.setFieldValue('postal_code', addr.postal_code);
  }

  // Слушаем событие отправки формы
  this._formController.addEventListener('ui-form-controller:success', (e) => {
    this.handleSubmit(e.detail.values || this._formController.getValues());
  });
}
```

4. **Обновить `handleSubmit()`** - получать данные из события:

```javascript
async handleSubmit(data) {
  // data уже приходит из события или можно получить через getValues()
  const formData = data || this._formController.getValues();
  
  // ... остальной код ...
}
```

5. **Заменить `form.state.values` на `form.getValues()`** в `getData()`

### Этап 4: Рефакторинг step-payment.js

#### Изменения:

1. **Удалить ручное создание конфигурации** (строки 52-86)

2. **Обновить шаблон** - добавить `config-path`:

```html
<ui-form-controller config-path="window.app.forms.orderPayment"></ui-form-controller>
```

3. **Изменить `initForm()`** - использовать публичный API:

```javascript
async initForm() {
  await customElements.whenDefined('ui-form-controller');
  
  // Ждём несколько кадров для полной инициализации
  await new Promise((resolve) => requestAnimationFrame(() => {
    requestAnimationFrame(resolve);
  }));
  
  this._formController = this.querySelector('ui-form-controller');
  if (!this._formController) {
    console.error('[StepPayment] Form controller not found');
    return;
  }

  // Устанавливаем значение через публичный API
  if (this.state.paymentMethod) {
    this._formController.setFieldValue('payment_method', this.state.paymentMethod);
  }

  // Слушаем изменения способа оплаты
  this._formController.addEventListener('ui-form-controller:field:change', (e) => {
    if (e.detail.fieldId === 'payment_method') {
      this.updatePaymentDetails(e.detail.value);
    }
  });

  // Слушаем событие отправки формы
  this._formController.addEventListener('ui-form-controller:success', (e) => {
    this.handleSubmit(e.detail.values || this._formController.getValues());
  });
}
```

4. **Обновить `handleSubmit()`** - получать данные из события

5. **Заменить `form.state.values` на `form.getValues()`** в `getData()`

### Этап 5: Обновление шаблонов

#### step-logistics-template.js

```javascript
export function step_logistics_template(state) {
  const { isAuthorized, hasSavedAddress } = state;

  return `
    <div class="step-logistics">
      <div class="step-logistics_content">
        ${isAuthorized && hasSavedAddress ? `
          <div class="step-logistics_notice">
            <ui-icon name="info" size="small"></ui-icon>
            <span>Используется адрес из вашего профиля. Вы можете изменить его ниже.</span>
          </div>
        ` : ''}
        <ui-form-controller config-path="window.app.forms.orderLogistics"></ui-form-controller>
      </div>
    </div>
  `;
}
```

#### step-payment-template.js

```javascript
export function step_payment_template() {
  return `
    <div class="step-payment">
      <div class="step-payment_content">
        <ui-form-controller config-path="window.app.forms.orderPayment"></ui-form-controller>
        <div class="step-payment_details" style="display: none;"></div>
      </div>
    </div>
  `;
}
```

## Чеклист рефакторинга

- [ ] Создать `app/forms/order-logistics.js`
- [ ] Создать `app/forms/order-payment.js`
- [ ] Зарегистрировать конфигурации в `app/forms/index.js`
- [ ] Обновить `step-personal.js`: заменить `setState({ values })` на `setFieldValue()`
- [ ] Обновить `step-personal.js`: заменить `form.state.values` на `form.getValues()`
- [ ] Обновить `step-logistics.js`: удалить ручное создание конфигурации
- [ ] Обновить `step-logistics.js`: использовать `config-path` и публичный API
- [ ] Обновить `step-logistics.js`: заменить `form.state.values` на `form.getValues()`
- [ ] Обновить `step-payment.js`: удалить ручное создание конфигурации
- [ ] Обновить `step-payment.js`: использовать `config-path` и публичный API
- [ ] Обновить `step-payment.js`: заменить `form.state.values` на `form.getValues()`
- [ ] Обновить `step-logistics-template.js`: добавить `config-path`
- [ ] Обновить `step-payment-template.js`: добавить `config-path`
- [ ] Протестировать все шаги wizard'а
- [ ] Проверить восстановление значений при возврате к предыдущим шагам

## Важные замечания

1. **Инициализация значений:** При использовании `config-path` форма инициализируется автоматически. Для установки начальных значений (например, из профиля пользователя) нужно дождаться полной инициализации формы через `customElements.whenDefined()` и `requestAnimationFrame`, затем использовать `setFieldValue()`.

2. **События:** Форма отправляет событие `ui-form-controller:success` при успешной отправке. Можно слушать это событие вместо использования `pipeline.submit` в конфигурации.

3. **Валидация:** Использовать `form.validate()` вместо прямого доступа к `state`.

4. **Типы значений:** Убедиться, что типы значений соответствуют типам полей (boolean для checkbox, array для select-multi, object для range).

## Ссылки

- [Архитектура системы форм](../../ui-kit/form/controller/ARCHITECTURE.md)
- [UI Kit README](../../ui-kit/README.md)

