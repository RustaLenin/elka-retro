# TODO: Рефакторинг форм Order Wizard

## Задачи

- [x] **Создать конфигурации форм**
  - [x] `app/forms/order-logistics.js`
  - [x] `app/forms/order-payment.js`
  - [x] Зарегистрировать в `app/forms/index.js`

- [x] **Рефакторинг step-personal.js**
  - [x] Заменить `setState({ values })` на `setFieldValue()`
  - [x] Заменить `form.state.values` на `form.getValues()`

- [x] **Рефакторинг step-logistics.js**
  - [x] Удалить ручное создание конфигурации (строки 84-199)
  - [x] Использовать `config-path="window.app.forms.orderLogistics"`
  - [x] Заменить `setState({ ...formConfig })` на публичный API
  - [x] Заменить `form.state.values` на `form.getValues()`
  - [x] Обновить `initForm()` для установки значений через `setFieldValue()`
  - [x] Добавить обработчики событий `order-logistics:submit` и `order-logistics:error`

- [x] **Рефакторинг step-payment.js**
  - [x] Удалить ручное создание конфигурации (строки 52-86)
  - [x] Использовать `config-path="window.app.forms.orderPayment"`
  - [x] Заменить `setState({ ...formConfig })` на публичный API
  - [x] Заменить `form.state.values` на `form.getValues()`
  - [x] Обновить `initForm()` для установки значений через `setFieldValue()`
  - [x] Добавить обработчики событий `order-payment:submit` и `order-payment:error`
  - [x] Сохранить логику обновления реквизитов при изменении способа оплаты

- [x] **Обновить шаблоны**
  - [x] `step-logistics-template.js`: добавить `config-path`
  - [x] `step-payment-template.js`: добавить `config-path`

- [ ] **Тестирование**
  - [ ] Проверить все шаги wizard'а
  - [ ] Проверить восстановление значений при возврате к предыдущим шагам
  - [ ] Проверить валидацию форм
  - [ ] Проверить отправку данных

## Подробный план

См. [FORMS_REFACTORING_PLAN.md](./FORMS_REFACTORING_PLAN.md)

