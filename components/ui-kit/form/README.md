# UI Form Kit

UI Form Kit предоставляет набор универсальных Web Components для построения форм. Подход основан на декларативной конфигурации: внешний код формирует JSON-описание формы, а `ui-form-controller` создаёт DOM-структуру, управляет состояниями полей и обрабатывает жизненный цикл отправки данных. Для адаптации доменных источников данных используются конвертеры (см. `helpers/field-config-adapter.js`). Конфигурации не привязаны к конкретной предметной области и могут переиспользоваться в любых проектах.

## Supported Field Types
- **text** — однострочная текстовая ячейка. Поддерживаемые ключи: `id`, `label`, `placeholder`, `defaultValue`, `maxLength`, `mask`, `disabled`, `readonly`, `required`, `autocomplete`, `hints`, `validation`, `tooltip`, `icon`. Компонент: `ui-input-text`.
- **number** — контроль для числового ввода. Ключи: `id`, `label`, `placeholder`, `defaultValue`, `min`, `max`, `step`, `precision`, `format`, `currency`, `disabled`, `readonly`, `required`, `hints`, `validation`, `tooltip`, `icon`. Компонент: `ui-input-number`.
- **select-single** — селект с единственным выбором. Ключи: `id`, `label`, `placeholder`, `defaultValue`, `searchable`, `allowClear`, `disabled`, `required`, `dataSource`, `decorators`, `hints`, `validation`, `tooltip`, `icon`. Компонент: `ui-select-single`.
- **select-multi** — селект с множественным выбором. Ключи: `id`, `label`, `placeholder`, `defaultValue`, `searchable`, `maxSelections`, `allowSelectAll`, `disabled`, `required`, `dataSource`, `decorators`, `hints`, `validation`, `tooltip`, `icon`. Компонент: `ui-select-multi`.
- **checkbox** — одиночный чекбокс. Ключи: `id`, `label`, `description`, `defaultValue`, `indeterminate`, `disabled`, `required`, `hints`, `validation`, `tooltip`, `icon`. Компонент: `ui-form-checkbox`.

### Common Field Attributes
- `id` — строковый ключ, по которому поле будет идентифицировано при сборе данных.
- `label` — основная подпись.
- `description` — дополнительный поясняющий текст (необязательный).
- `defaultValue` — начальное значение до загрузки сохранённого состояния.
- `disabled` / `readonly` — управление доступностью взаимодействия.
- `required` — признак обязательности при валидации.
- `hints` — набор подсказок: `{"field": "...", "success": "...", "error": "..."}`.
- `validation` — последовательность проверок (`rule`, `value`, `message`, `severity`, `async`).
- `tooltip` — описание всплывающей подсказки (тип, контент, иконка).
- `icon` — конфигурация иконки, передаваемая в `ui-icon`.
  ```json
  {
    "key": "filter",
    "icon_position": "left",
    "on_click": "clear-data",
    "color": "#FFAA00"
  }
  ```

### Option Attributes (select controls)
- `value` — машинное значение опции.
- `label` — отображаемый текст.
- `description` — дополнительное пояснение (optional).
- `disabled` — запрет выбора конкретной опции.
- `icon` — конфигурация иконки для опции (передаётся целиком в `ui-icon`).
- `color` — цветовая метка (HEX или CSS-переменная).
- `meta` — произвольный объект, доступный шаблону опции.

### Select-specific attributes
- `searchable` — явно включает поиск (автоматически включается при большом количестве опций).
- `decorators` — флаги для отображения иконок/цветов/мета-данных (`{ "optionIcon": true, "optionColor": true }`).
- `allowClear` (single) — разрешает сброс значения.
- `allowSelectAll` (multi) — добавляет действие «выбрать все/снять все».
- `maxSelections` (multi) — лимит количества выбранных опций.
- `hierarchical` / `groups` — будущая поддержка древовидных и группированных списков (адаптер отвечает за структуру).
- `filterFn` — путь к кастомной функции фильтрации (принимает `(options, query)`).
- `loading` — отображает состояние загрузки (поддержка в шаблоне, данные управляются извне).
- `emptyMessage`, `searchPlaceholder` — локализация пустых/поисковых состояний.

## Form Attributes
- `id` — идентификатор формы, используется в событиях и при сохранении состояния.
- `title` — заголовок интерфейса.
- `description` — вступительный текст/инструкция.
- `submitLabel` — подпись основной кнопки.
- `cancelLabel` — подпись вторичной кнопки (если требуется).
- `storageKey` — ключ для LocalStorage; пустое значение отключает сохранение.
- `icon` — конфигурация иконки формы.
  ```json
  {
    "key": "settings",
    "icon_position": "left",
    "on_click": "hide-show-data",
    "color": "#0055FF"
  }
  ```
- `pipeline` — контракт обработчиков: `sanitize`, `validate`, `submit`, `onSuccess`, `onError` (строки или ссылки на функции).
- `state` — предустановленные значения полей.
- `metadata` — произвольные данные, которые контроллер пробрасывает в события.
- `debug` — переключатель расширенного режима (дополнительные кнопки, панели, логирование).
- `layout` — указания по верстке (`columns`, `groups`, `steps`, `sections`).
- `fields` — массив деклараций полей (см. ниже).
- `actions` — описание кнопок и управляющих элементов (см. раздел ниже).

## Layout regions
```text
form.ui-form-controller
 ├── header   → заголовок, описание, иконка (может быть вынесен в header модального окна)
 ├── status   → глобальные сообщения (валидация, успех, ошибка, прогресс)
 ├── body     → контейнер для полей и секций
 ├── actions  → зона кнопок (submit + дополнительные действия)
 └── debug    → отладочная панель (опционально, включается `debug: true`)
```
- Структура одинакова для страниц и модальных форм; при использовании модального окна header/footer можно привязывать к соответствующим слотам модала.
- Лоадеры после сабмита, предупреждения и итоговые сообщения располагаются в секции `status`.
- Отладочная панель отображает текущее состояние, очищенные данные и журнал пайплайна.

## Actions
```json
{
  "submit": {
    "label": "Отправить",
    "type": "primary",
    "icon": {
      "key": "arrow-right",
      "icon_position": "right",
      "on_click": "noop",
      "color": "#0055FF"
    },
    "loadingLabel": "Отправляем...",
    "successLabel": "Готово",
    "disabled": false
  },
  "extra": [
    {
      "id": "clear",
      "label": "Очистить",
      "type": "secondary",
      "icon": {
        "key": "trash",
        "icon_position": "left",
        "on_click": "clear-data",
        "color": "#888888"
      },
      "handler": "formController.clear",
      "visibleWhen": "debug"
    },
    {
      "id": "copy-json",
      "label": "Скопировать JSON",
      "type": "ghost",
      "icon": {
        "key": "copy",
        "icon_position": "left",
        "on_click": "copy-data",
        "color": "#888888"
      },
      "handler": "formController.copyToClipboard",
      "visibleWhen": "debug"
    }
  ]
}
```
- `submit` — основная кнопка формы, основана на компоненте `ui-button`.
- `extra` — массив дополнительных действий (очистка, копирование, кастомные сценарии).
- `visibleWhen` — условие показа (`"always"`, `"debug"`, `"never"` или функция). По умолчанию кнопка видна всегда.
- `handler` — ссылка на функцию или явный колбэк; получает форму, текущее состояние и результат санитизации.
- Все свойства `ui-button` поддерживаются и могут передаваться в конфигурации.

## Debug mode
```json
{
  "debug": true,
  "actions": {
    "extra": [
      { "id": "clear", "handler": "formController.clear", "visibleWhen": "debug" },
      { "id": "copy-json", "handler": "formController.copyToClipboard", "visibleWhen": "debug" }
    ]
  }
}
```
- В режиме `debug` форма может отображать техническую панель: текущее состояние, очищенные данные, вывод валидации, ответы submit-хендлера.
- Активируется расширенное логирование пайплайна: `sanitize`, `validate`, `submit`, `onSuccess`, `onError`.
- Кнопки с `visibleWhen: "debug"` становятся видимыми автоматически.
- Рекомендуется отключать режим на продакшене или управлять им через фичфлаги.

## Submission pipeline
- `ui-form-controller` предоставляет публичный метод `submit()`, который запускает последовательность `sanitize → validate → submit → onSuccess/onError`.
- Каждая стадия подключается через конфиг `pipeline` и может быть синхронной или асинхронной (Promise).
- Форма ожидает, что `submit` вернёт результат (например, ответ сервиса) или выбросит исключение — это попадёт в `onSuccess`/`onError`.
- Дополнительные методы `clear()` и `copyToClipboard()` должны использоваться действиями (`actions.extra`) и доступны в режиме отладки.
- Отправка данных (HTTP, RPC, локальное хранилище) реализуется внутри переданного хендлера `pipeline.submit`, что позволяет выносить конкретные протоколы из компонента.
- Зона body может содержать как поля, так и вспомогательные блоки (инструкции, баннеры); главное — следовать декларативной схеме.
- Поля инициируют события `…:input`, `…:change`, `…:validation`, которые обрабатывает `ui-form-controller` для синхронизации состояния.
- Перед запуском пользовательской `validate` фазы выполняется встроенная проверка `required` (включая чекбоксы с `required=true`): при нарушении автоматически формируются ошибки на полях и общее сообщение.

## Controller API
```ts
// Методы экземпляра <ui-form-controller>
submit(): Promise<void>
clear(): void
copyToClipboard(): void
configure(config: FormConfig): void
setPipeline(pipeline: PipelineHandlers): void
setActions(actions: FormActions): void
getValues(): Record<string, unknown>
```
- `configure` позволяет применить конфиг динамически (иконка, layout, autosubmit и т.п.).
- `setPipeline` и `setActions` используются для поздней инициализации обработчиков.
- `submit`, `clear`, `copyToClipboard` синхронизируются с action-кнопками (submit + extra).
- `getValues` возвращает текущий снимок `state.values` (без мутаций исходного объекта).

### Field & Control Events
- `ui-input-text:*` и `ui-input-number:*` bubbling-события проксируются `ui-form-field` в события вида `ui-form-field:input`, `ui-form-field:change`, `ui-form-field:validation`, сохраняя полезный detail (`value`, `rawValue`, `status`, `messages`, `origin`).
- `ui-form-field` отслеживает состояние `touched`, `dirty`, `status`, `messages` и синхронизирует атрибуты (`disabled`, `required`, `aria-invalid`) с вложенным контролом.
- `ui-form-controller` подписывается на события `ui-form-field:*` для обновления стейта формы, валидации и запуска actions.
- Контролы могут эмитить дополнительные события (`…:clear`, `…:increment`, `…:decrement`) — поле пробрасывает их наружу с контекстом поля через detail.
- `ui-select:*` и `ui-checkbox:*` используют общую схему: `open/close/search/select/deselect/change`, `input/change/validation`, что позволяет `form-field` агрегировать состояние и перезапускать autosubmit.

### Form Events (`ui-form:*`)
События всплывают от `ui-form-controller`, detail включает `formId`, `values`, `controller` и контекст.

| Событие | Когда срабатывает | detail |
| --- | --- | --- |
| `ui-form:init` | После инициализации form controller и привязки полей | `{ values }` |
| `ui-form:input` | Любое `ui-form-field:input` | `{ fieldId, name, value, origin }` |
| `ui-form:change` | После `ui-form-field:change` / stepper | `{ fieldId, value }` |
| `ui-form:validation` | Поле прислало статус/сообщения | `{ fieldId, status, messages }` |
| `ui-form:success` | Пайплайн успешно завершён (`submit`) | `{ values, result }` |
| `ui-form:error` | Пайплайн упал с ошибкой | `{ error }` |
| `ui-form:invalid` | Валидация не прошла (sync/async) | `{ values, validation }` |
| `ui-form:clear` | Метод/кнопка очистки сбросили значения | `{ values }` |
| `ui-form:copy` | Кнопка копирования успешно скопировала JSON | `{ values }` |

## Autosubmit (planned)
```json
{
  "autosubmit": {
    "enabled": true,
    "debounceMs": 5000,
    "events": ["change", "blur"],
    "excludeFields": ["password"]
  }
}
```
- При включении `autosubmit.enabled` контроллер запускает таймер после изменения данных.
- Любое новое изменение сбрасывает таймер; по истечении `debounceMs` автоматически вызывается `submit()`.
- Можно указать события, которые подписывают таймер, и список полей, игнорируемых автосабмитом.
- Реализация находится в TODO (см. helpers), атрибут добавлен в план разработки.
- Форма должна корректно реагировать на проходящие события `…:input`, `…:change`: таймер перезапускается только по перечисленным событиям.

## Field Config Example
```json
{
  "id": "product-categories",
  "type": "select-multi",
  "label": "Категории",
  "description": "Выберите один или несколько вариантов",
  "placeholder": "Категории не выбраны",
  "required": false,
  "icon": {
    "key": "category",
    "icon_position": "left",
    "on_click": "clear-data",
    "color": "#FFAA00"
  },
  "searchable": true,
  "maxSelections": 5,
  "dataSource": {
    "type": "global",
    "path": "appData.categories",
    "adapter": "defaultOptionAdapter"
  },
  "decorators": {
    "optionIcon": true,
    "optionColor": true
  },
  "hints": {
    "field": "Можно отметить несколько значений",
    "options": "Цвет отражает актуальность"
  },
  "validation": [
    { "rule": "maxSelections", "value": 5, "message": "Не выбирайте более пяти пунктов" }
  ]
}
```

## Form Config Example (Login)
```json
{
  "id": "login-form",
  "title": "Вход",
  "description": "Введите учетные данные для авторизации",
  "submitLabel": "Войти",
  "cancelLabel": "Забыли пароль?",
  "storageKey": "login-form:v1",
  "debug": false,
  "icon": {
    "key": "user",
    "icon_position": "left",
    "on_click": "hide-show-data",
    "color": "#0055FF"
  },
  "layout": {
    "columns": 1,
    "groups": [
      { "id": "credentials", "label": "Данные для входа", "fields": ["email", "password", "remember-me"] }
    ]
  },
  "fields": [
    {
      "id": "email",
      "type": "text",
      "label": "Email",
      "placeholder": "you@example.com",
      "autocomplete": "email",
      "required": true,
      "validation": [
        { "rule": "pattern", "value": "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$", "message": "Введите корректный email" }
      ],
      "icon": {
        "key": "mail",
        "icon_position": "left",
        "on_click": "clear-data",
        "color": "#888888"
      }
    },
    {
      "id": "password",
      "type": "text",
      "label": "Пароль",
      "placeholder": "Введите пароль",
      "required": true,
      "mask": "password",
      "validation": [
        { "rule": "minLength", "value": 18, "message": "Минимум 18 символов" }
      ],
      "icon": {
        "key": "lock",
        "icon_position": "left",
        "on_click": "hide-show-data",
        "color": "#888888"
      },
      "hints": {
        "field": "Пароль чувствителен к регистру"
      }
    },
    {
      "id": "remember-me",
      "type": "checkbox",
      "label": "Запомнить меня",
      "defaultValue": true,
      "icon": {
        "key": "check",
        "icon_position": "left",
        "on_click": "clear-data",
        "color": "#00AA55"
      }
    }
  ],
  "actions": {
    "submit": {
      "label": "Войти",
      "type": "primary",
      "icon": {
        "key": "arrow-right",
        "icon_position": "right",
        "on_click": "noop",
        "color": "#0055FF"
      },
      "loadingLabel": "Отправляем...",
      "successLabel": "Готово"
    },
    "extra": [
      {
        "id": "clear",
        "label": "Очистить",
        "type": "secondary",
        "icon": {
          "key": "trash",
          "icon_position": "left",
          "on_click": "clear-data",
          "color": "#888888"
        },
        "handler": "formController.clear",
        "visibleWhen": "debug"
      },
      {
        "id": "copy-json",
        "label": "Копировать JSON",
        "type": "ghost",
        "icon": {
          "key": "copy",
          "icon_position": "left",
          "on_click": "copy-data",
          "color": "#888888"
        },
        "handler": "formController.copyToClipboard",
        "visibleWhen": "debug"
      }
    ]
  },
  "pipeline": {
    "sanitize": "formPipeline.sanitizeLogin",
    "validate": "formPipeline.validateLogin",
    "submit": "authController.submitLogin",
    "onSuccess": "authController.onLoginSuccess",
    "onError": "authController.onLoginError"
  }
}
```

Любая система может подготовить аналогичную конфигурацию, используя собственные источники данных и адаптеры. UI Form Kit интерпретирует только универсальную схему и не делает предположений о природе данных.