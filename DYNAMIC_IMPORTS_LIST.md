# Список всех динамических импортов для перевода на статические

## 📋 Компоненты в registry (`components/components.js`)

Все эти компоненты нужно перевести на статические импорты:

### Pages
- `wp-page` → `./pages/page/page.js`
- `error-page` → `./pages/error-page/error-page.js`

### Posts
- `post-card` → `./posts/post-card/post-card.js`
- `post-single` → `./posts/post-single/post-single.js`

### Toy Type
- `toy-type-card` → `./toy-type/toy-type-card/toy-type-card.js`
- `toy-type-single` → `./toy-type/toy-type-single/toy-type-single.js`

### Toy Instance
- `toy-instance-card` → `./toy-instance/toy-instance-card/toy-instance-card.js`
- `toy-instance-modal` → `./toy-instance/toy-instance-modal/toy-instance-modal.js`

### Ny Accessory
- `ny-accessory-card` → `./ny-accessory/ny-accessory-card/ny-accessory-card.js`
- `ny-accessory-single` → `./ny-accessory/ny-accessory-single/ny-accessory-single.js`

### Catalog
- `catalog-page` → `./catalog/index.js`
- `accessory-catalog-page` → `./accessory-catalog/index.js`
- `blog-page` → `./blog/index.js`

### Category
- `category-breadcrumbs` → `./category-breadcrumbs/category-breadcrumbs.js`
- `category-catalog` → `./category-catalog/category-catalog.js`

### User Profile
- `user-menu` → `./user-profile/user-menu/user-menu.js`
- `profile-page` → `./user-profile/profile-page/profile-page.js`
- `order-history-tab` → `./user-profile/profile-page/tabs/order-history/order-history.js`
- `order-card` → `./user-profile/profile-page/tabs/order-history/order-card/order-card.js`

### Homepage Tabs
- `homepage-tabs-content` → `./homepage-tabs/homepage-tabs-content.js`

### Cart
- `cart-page` → `./cart/index.js`
- `cart-item` → `./cart/cart-item/cart-item.js`
- `cart-summary` → `./cart/cart-summary/cart-summary.js`
- `order-wizard` → `./cart/order-wizard/order-wizard.js`
- `step-auth` → `./cart/order-wizard/steps/step-auth.js`
- `step-personal` → `./cart/order-wizard/steps/step-personal.js`
- `step-logistics` → `./cart/order-wizard/steps/step-logistics.js`
- `step-payment` → `./cart/order-wizard/steps/step-payment.js`
- `step-confirmation` → `./cart/order-wizard/steps/step-confirmation.js`

---

## 📦 Динамические импорты в `app/app.js`

### Stores (загружаются условно)
- `./forms/index.js` (preload)
- `../components/catalog/catalog-store.js` (если есть `catalog-page`)
- `../components/accessory-catalog/accessory-catalog-store.js` (если есть `accessory-catalog-page`)
- `../components/cart/cart-store.js` (всегда)

### Services
- `../components/user-profile/services/auth-service.js`
- `../components/user-profile/services/user-service.js`

### Analytics
- `./analytics/yandex-metrika.js`

### UI-Kit (если ещё остались)
- `../components/ui-kit/modal/modal.js` (проверить, возможно уже статический)
- `../components/ui-kit/notification/notification.js` (проверить, возможно уже статический)

---

## 🧩 Динамические импорты внутри компонентов

### `components/toy-instance/toy-instance-card/toy-instance-card.js`
- `../toy-instance-modal/toy-instance-modal.js` (при открытии модалки)

### `components/cart/cart-item/cart-item.js`
- `../../toy-instance/toy-instance-modal/toy-instance-modal.js` (при открытии модалки)

### `components/navigation/site-header/site-header.js`
- `../../user-profile/services/user-ui-service.js`
- `../../user-profile/user-menu/user-menu.js`

### `components/cart/cart-page/cart-page.js`
- `../order-wizard/order-wizard.js` (при открытии мастера заказа)
- `../helpers/price-formatter.js` (при загрузке)

### `components/cart/order-wizard/order-wizard.js`
- `./steps/${step.component}.js` (динамический импорт шагов по имени)

### `components/cart/order-wizard/steps/step-auth.js`
- `../../../user-profile/services/user-ui-service.js`

### `components/cart/order-wizard/steps/step-personal.js`
- `../../../../app/forms/index.js`

### `components/user-profile/profile-page/profile-page.js`
- `./tabs/profile-settings/profile-settings.js` (при переключении на вкладку)
- `./tabs/order-history/order-history.js` (при переключении на вкладку)
- `./tabs/contact-form/contact-form.js` (при переключении на вкладку)

### `components/user-profile/profile-page/tabs/order-history/order-history.js`
- `./order-card/order-card.js` (при загрузке карточек заказов, используется дважды)

### `components/user-profile/user-menu/user-menu.js`
- `../services/user-ui-service.js` (при открытии меню)

---

## ⚠️ Особые случаи

### 1. Условная загрузка stores в `app/app.js`
- `catalog-store.js` загружается только если есть `catalog-page`
- `accessory-catalog-store.js` загружается только если есть `accessory-catalog-page`

**Решение:** Можно загружать статически, они всё равно будут инициализироваться при создании store.

### 2. Динамическая загрузка шагов wizard
- `order-wizard.js` использует `import(\`./steps/${step.component}.js\`)` по имени шага

**Решение:** Импортировать все шаги статически:
- `./steps/step-auth.js`
- `./steps/step-personal.js`
- `./steps/step-logistics.js`
- `./steps/step-payment.js`
- `./steps/step-confirmation.js`

### 3. Условная загрузка табов профиля
- Табы профиля загружаются только при переключении

**Решение:** Импортировать все табы статически.

### 4. Модальные окна
- `toy-instance-modal` загружается при открытии модалки

**Решение:** Импортировать статически, так как это UI-компонент, который может понадобиться в любой момент.

---

## 📝 Порядок перевода

1. **Registry в `components/components.js`** — все 25+ компонентов
2. **Stores и Services в `app/app.js`** — около 7 импортов
3. **Компоненты с условной загрузкой** — модалки, табы, шаги wizard
4. **Проверка работы** — убедиться, что все компоненты загружаются

---

## ✅ Критерии готовности

- [ ] Все компоненты из registry переведены на статические импорты
- [ ] Все stores и services в `app/app.js` статически импортированы
- [ ] Все условные импорты в компонентах переведены на статические
- [ ] Версионирование (`?v=`) сохранено в статических импортах
- [ ] Протестировано, что все компоненты загружаются корректно
- [ ] Протестировано, что условная логика (показ/скрытие) работает

