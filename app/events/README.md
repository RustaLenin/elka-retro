# Application Event Bus & Declarative Actions

Документ описывает архитектуру событийной шины приложения и декларативного управления действиями (data-action → service → component). Цель — избавить UI от ручного навешивания обработчиков, обеспечить единый слой бизнес-логики и подготовить основу для конфигурации из админки/БЗ.

## Задачи, которые решаем

- **Декларативность:** кнопка/ссылка объявляет, какое действие ей нужно, через `data-app-action` или `data-app-event`, без привязки к конкретному JS-коду.
- **Переиспользование:** сервисы (`userUiService`, `cartService`, и т.д.) регистрируют публичные действия и подписываются на события без прямой связи с DOM.
- **Управление жизненным циклом:** событие обрабатывается только после инициализации сервиса/модуля; нет гонок рендера/навешивания.
- **Расширяемость:** в будущем конфигурации (какое действие вешать на кнопку) можно хранить в БД/админке и просто подставлять значения в шаблон.

## Основные элементы

1. **data-app-action** — атрибут на DOM-элементе. Значение формата `namespace.action` (пример: `user.showRegisterModal`).
2. **app.events** — глобальная шина:
   - `register(namespace, handlers)` — регистрирует набор действий;
   - `emit(action, payload)` — синхронно вызывает обработчик (если зарегистрирован);
   - `dispatchFromDom(event)` — вспомогательная функция; читает `data-app-action` с target и вызывает `emit`.
3. **Сервисы** (например, `userUiService`):
   - при `init()` вызывают `app.events.register('user', { showRegisterModal: () => ... })`;
   - могут слушать дополнительные события (auth success и т.п.).
4. **UI-компоненты**:
   - в шаблонах используют только `data-app-action`, без ручных `addEventListener`;
   - опционально указывают `data-app-payload` (JSON) для передачи параметров.
5. **Глобальный делегат кликов**:
   - `document.addEventListener('click', handler)`; если target (или родитель) содержит `data-app-action`, вызываем `app.events.dispatchFromDom`.
   - Дополнительные делегаты (например, внутри `ui-modal`) не нужны.

## Поток событий

```
<a data-app-action="user.showRegisterModal">Регистрация</a>
   │
   └─ click → app.events.dispatchFromDom()
        │
        └─ emit('user.showRegisterModal', context)
              │
              └─ userUiService: showRegisterModal()
                    │
                    └─ app.modal.open('auth:register')
```

### Контекст события
`context = { action, namespace, name, element, originalEvent, payload }`

- `payload` вычисляется так: если на элементе есть `data-app-payload`, парсим JSON; иначе `null`.
- Сервис может использовать `context.element` (например, показать лоадер на кнопке) или `originalEvent.preventDefault()`.

## API (черновик)

```ts
window.app.events = {
  register(namespace: string, handlers: Record<string, Function>),
  unregister(namespace: string, handlerName?: string),
  emit(action: string, payload?: any, ctxOverrides?: Partial<Context>),
  dispatchFromDom(event: Event),
};
```

## Предопределённые действия

На текущий момент доступны следующие действия «из коробки»:

- `user.showSignInModal` — открыть модальное окно входа.
- `user.showRegisterModal` — открыть окно регистрации.
- `user.showPasswordResetModal` — открыть окно восстановления пароля.
- `user.openProfile` — перейти на страницу профиля (payload: `url`, `newTab`, `replace`).
- `user.logout` — инициировать выход через `authService.logout()`.
- `cart.openAuthStep` — перейти к шагу авторизации в мастере заказа (payload: `wizardSelector`, `scrollIntoView`).

При необходимости добавляйте новые действия в соответствующие сервисы (user/cart/...). Документация по регистрации действий — ниже в плане внедрения.

### Ошибки / защита
- Если действие не зарегистрировано → предупреждение в консоли, но UI не ломаем.
- Повторная регистрация того же `namespace.action` → предупреждение, последнее определение побеждает (можно сделать `strict` позже).
- `dispatchFromDom` уважает `data-app-stop`, чтобы можно было запретить всплытие событий UI.

## План внедрения

### Фаза 0 — Подготовка (текущий шаг)
1. Описать архитектуру (этот документ).
2. Согласовать формат `data-app-action`, контекст события и требования к сервисам.
3. Добавить в backlog конкретные задачи по внедрению.

### Фаза 1 — Инфраструктура
1. Реализовать `app/events/index.js` с API выше.
2. Подключить глобальный делегат кликов (и, при необходимости, клавиатурных событий).
3. Обновить `app/app.js` ⇒ `window.app.events = createEventBus()`.
4. Написать утилиты для сервисов (`registerUserActions`, `emitAuthEvent`, ...).

### Фаза 2 — Auth / User Profile (пилот)
1. Обновить шаблоны auth-модалей:
   - заменить ссылки на `data-app-action="user.showRegisterModal"` и `user.showPasswordResetModal`;
   - убрать `onBodyReady`/ручные `addEventListener`.
2. `userUiService.init()` регистрирует действия и вызывает `app.events.register('user', {...})`.
3. Проверить взаимодействие с `app.modal`, стеком, событиями `auth`.

### Фаза 3 — Расширение
1. Перевести `user-menu`, `site-header`, `step-auth` на data-actions вместо прямых вызовов сервиса.
2. Добавить базовые action-утилиты (например, `data-app-action="cart.toggle"`, `wishlist.addItem` и т.д.).
3. Описать рекомендации в UI-kit документации.

## Текущее состояние
- Документ зафиксирован.
- Задачи добавлены в `components/user-profile/BACKLOG.md` и в техническую документацию UI-кита.
- Следующий шаг — реализовать `app.events` и перевести auth-модалки на `data-app-action`.


