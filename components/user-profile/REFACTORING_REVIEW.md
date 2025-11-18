# Аудит компонентов профиля пользователя

## Итоги

- **Auth-модали переведены на декларативный подход.**  
  Вместо отдельных web-компонентов (`auth-modal`, `register-modal`, `password-reset-modal`) используется единый менеджер `app.modal` и сервис `user-ui-service`.  
  Каждый сценарий описывается схемой и формой (`ui-form-controller config-path="app.forms.*"`).

- **`app.modal`**  
  Новый менеджер создаёт `ui-modal`, управляет `UIModalArea`, позволяет регистрировать схемы (`register`, `open`, `close`, `updateBody`).  
  `ui-modal` теперь генерирует событие `ui-modal:rendered`, что упрощает работу с body.

- **Стили и шаблоны**  
  Общие стили auth-модалей вынесены в `components/user-profile/modals/auth-modals-styles.css`.  
  Формы остаются в `app/forms/*`, их конфигурации загружаются один раз при старте (для гостей — сразу через `preloadAuthFormsIfNeeded()`).

- **Публичный API**  
  `app.services.userUi` предоставляет методы `showSignInModal()`, `showRegisterModal()`, `showPasswordResetModal()`.  
  Их используют `site-header`, `user-menu`, шаг авторизации в checkout и любые другие сценарии.

- **Следующий шаг — event bus**  
  Готовимся перейти к `data-app-action` + `app.events`. Это позволит отказаться от `onBodyReady`, упростить регистрацию действий и подготовиться к конфигурируемым шаблонам. См. [`app/events/README.md`](../../app/events/README.md) и раздел "Event Actions" в `BACKLOG.md`.

## Что проверить коллегам

1. Используйте `app.modal.register()` и декларации вместо создания новых модальных компонентов.
2. Формы должны подключаться через `config-path="app.forms.<formId>"`. Никакой программной инициализации полей.
3. Для новых сценариев UI:
   - опишите схему модалки в соответствующем сервисе;
   - используйте публичный API сервиса (`app.services.<module>.action()`), чтобы не зависеть от внутренней реализации компонентов.

## Документация

- `app/modal-manager.js` — реализация менеджера и публичное API.
- `components/user-profile/services/user-ui-service.js` — пример деклараций и использования.
- `components/ui-kit/form/controller/MODAL_INTEGRATION.md` — обновлённое описание интеграции форм в модальные окна.

Текущая архитектура избавляет от legacy-компонентов и делает UI полностью декларативным и переиспользуемым.

