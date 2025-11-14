# Структура файлов корзины и заказов

Планируемая структура файлов для реализации функциональности корзины и заказов.

## Frontend (JavaScript)

```
components/cart/
├── README.md                    # Основная документация
├── BACKLOG.md                   # Список задач
├── QUESTIONS.md                 # Вопросы для уточнения
├── UI_KIT_ANALYSIS.md          # Анализ UI Kit компонентов
├── FILE_STRUCTURE.md           # Этот файл
│
├── cart-store.js               # Управление состоянием корзины
├── cart-service.js             # Бизнес-логика корзины
├── order-service.js            # Бизнес-логика заказов
├── commission-rules.js         # Правила комиссионной торговли
├── cart-api-adapter.js         # Адаптер REST API для корзины
├── order-api-adapter.js        # Адаптер REST API для заказов
│
├── helpers/
│   ├── price-formatter.js      # Утилита форматирования цен
│   ├── timer-utils.js          # Утилита таймера обратного отсчета
│   └── index.js                # Экспорт всех утилит
│
├── cart-page/
│   ├── cart-page.js            # Главный компонент страницы корзины
│   ├── cart-page-template.js   # Шаблон разметки
│   └── cart-page-styles.css   # Стили страницы
│
├── cart-item/
│   ├── cart-item.js            # Компонент элемента корзины
│   ├── cart-item-template.js   # Шаблон элемента
│   └── cart-item-styles.css   # Стили элемента
│
├── cart-summary/
│   ├── cart-summary.js         # Компонент итоговой информации
│   ├── cart-summary-template.js # Шаблон итогов
│   └── cart-summary-styles.css # Стили итогов
│
└── order-wizard/
    ├── order-wizard.js          # Главный компонент Wizard
    ├── order-wizard-template.js # Шаблон Wizard
    ├── order-wizard-styles.css # Стили Wizard
    │
    └── steps/
        ├── step-review.js       # Шаг проверки заказа
        ├── step-review-template.js
        ├── step-review-styles.css
        │
        ├── step-auth.js         # Шаг авторизации/регистрации
        ├── step-auth-template.js
        ├── step-auth-styles.css
        │
        ├── step-delivery.js     # Шаг выбора доставки
        ├── step-delivery-template.js
        ├── step-delivery-styles.css
        │
        ├── step-payment.js      # Шаг выбора способа оплаты
        ├── step-payment-template.js
        ├── step-payment-styles.css
        │
        └── step-confirmation.js # Шаг подтверждения
            ├── step-confirmation-template.js
            └── step-confirmation-styles.css
```

## Backend (PHP)

```
core/
├── cart/
│   ├── cart-rest-controller.php    # REST API контроллер для корзины
│   ├── cart-service.php            # Сервис работы с корзиной
│   └── cart-loader.php             # Загрузчик сервисов корзины
│
└── orders/
    ├── order-rest-controller.php   # REST API контроллер для заказов
    ├── order-service.php           # Сервис работы с заказами
    ├── order-email-templates.php   # Шаблоны писем
    └── order-loader.php            # Загрузчик сервисов заказов
```

## WordPress Templates

```
page-cart.php                       # Шаблон страницы корзины
```

**Автоматическое создание страницы:**
Страница корзины автоматически создается при инициализации темы в `functions.php` (хук `after_setup_theme`), аналогично страницам "Блог" и "Каталог".

## Регистрация компонентов

### В `components/components.js`:

```javascript
const registry = {
  // ... существующие компоненты
  'cart-page': () => import('./cart/cart-page/cart-page.js'),
  'order-wizard': () => import('./cart/order-wizard/order-wizard.js'),
};
```

### В `functions.php`:

```php
add_filter('elkaretro_required_components', function($components) {
  if (is_page_template('page-cart.php')) {
    $components[] = 'cart-page';
  }
  return $components;
});
```

## PODS Конфигурация

Сущность `elkaretro_order` должна быть создана через PODS с следующими полями:

⚠️ **ВАЖНО:** Имя `order` зарезервировано WordPress/PODS, используйте `elkaretro_order`.

- `order_number` (text) - номер заказа
- `user` (relationship → user) - пользователь
- `toy_instance_items` (relationship → toy_instance, multi select) - экземпляры игрушек
- `ny_accessory_items` (relationship → ny_accessory, multi select) - новогодние аксессуары
- **Примечание:** PODS Relationship поддерживает только один Related Type, поэтому созданы два поля. В коде они объединяются.
- `total_amount` (currency) - итоговая сумма
- `subtotal` (currency) - сумма без скидок
- `discount_amount` (currency) - сумма скидки
- `fee_amount` (currency) - сумма сбора
- `delivery_method` (text) - способ доставки
- `delivery_address` (textarea) - адрес доставки
- `payment_method` (text) - способ оплаты
- `status` (custom post status) - статус заказа
- `created_at` (datetime) - дата создания
- `reserved_until` (datetime) - дата окончания резервирования
- `notes` (textarea) - примечания

## Порядок создания файлов

### Этап 1: Базовые сервисы
1. `cart-store.js`
2. `cart-service.js`
3. `commission-rules.js`
4. `helpers/price-formatter.js`
5. `helpers/timer-utils.js`

### Этап 2: Компоненты корзины
6. `cart-item/` (все файлы)
7. `cart-summary/` (все файлы)
8. `cart-page/` (все файлы)

### Этап 3: Wizard
9. `order-wizard/order-wizard.js` (базовый)
10. `order-wizard/steps/step-review.js`
11. `order-wizard/steps/step-auth.js`
12. `order-wizard/steps/step-delivery.js`
13. `order-wizard/steps/step-payment.js`
14. `order-wizard/steps/step-confirmation.js`

### Этап 4: Backend
15. `core/cart/cart-rest-controller.php`
16. `core/cart/cart-service.php`
17. `core/orders/order-rest-controller.php`
18. `core/orders/order-service.php`
19. `core/orders/order-email-templates.php`

### Этап 5: WordPress шаблоны и интеграция
20. `page-cart.php` (шаблон страницы)
21. Автоматическое создание страницы корзины в `functions.php` (хук `after_setup_theme`)
22. Обновление `components/components.js` (регистрация компонента `cart-page`)
23. Обновление `functions.php` (добавление компонента в фильтр `elkaretro_required_components`)

