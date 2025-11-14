# Настройка PODS для сущности "Заказ"

Инструкция по созданию и настройке Custom Post Type `elkaretro_order` через PODS.

⚠️ **ВАЖНО:** Имя `order` зарезервировано WordPress/PODS для внутреннего использования. Используйте `elkaretro_order`.

## Шаг 1: Создание Custom Post Type

1. Перейдите в **PODS Admin** → **Add New**
2. Выберите **Custom Post Type**
3. Заполните:
   - **Name**: `elkaretro_order` ⚠️ **ВАЖНО:** Имя `order` зарезервировано WordPress/PODS, используйте `elkaretro_order`
   - **Label**: `Заказ`
   - **Label (Singular)**: `Заказ`
   - **Label (Plural)**: `Заказы`
   - **Description**: `Сущность для хранения заказов пользователей`

## Шаг 2: Настройка Post Type

### Основные настройки:
- **Public**: ✅ Включено
- **Show UI**: ✅ Включено
- **Show in Menu**: ✅ Включено
- **Menu Position**: `25` (или другое удобное значение)
- **Menu Icon**: `dashicons-cart` (или `dashicons-clipboard`)
- **Supports**: 
  - ✅ Title
  - ✅ Editor (для примечаний)
  - ✅ Custom Fields
  - ✅ Revisions

### Дополнительные настройки:
- **Has Archive**: ❌ Отключено
- **Publicly Queryable**: ✅ Включено (для REST API)
- **Show in REST API**: ✅ Включено
- **REST API Base**: `elkaretro_order` (или оставьте пустым для автоматической генерации из имени Pod)
- **REST API Controller Class**: `WP_REST_Posts_Controller`

## Шаг 3: Создание полей

### 3.1. Номер заказа
- **Field Type**: `Text`
- **Name**: `order_number`
- **Label**: `Номер заказа`
- **Required**: ✅ Да
- **Unique**: ✅ Да
- **Description**: `Уникальный номер заказа (генерируется автоматически)`

### 3.2. Пользователь
- **Field Type**: `Relationship`
- **Name**: `user`
- **Label**: `Пользователь`
- **Required**: ✅ Да
- **Related Pod**: `User`
- **Pick Format Type**: `Single Select`
- **Description**: `Пользователь, оформивший заказ`

### 3.3. Товары в заказе (экземпляры игрушек)
⚠️ **ВАЖНО:** PODS Relationship позволяет выбрать только один Related Type. Поэтому создаем два отдельных поля.

- **Field Type**: `Relationship`
- **Name**: `toy_instance_items`
- **Label**: `Экземпляры игрушек`
- **Required**: ❌ Нет (может быть пустым, если в заказе только аксессуары)
- **Related Pod**: `toy_instance`
- **Pick Format Type**: `Multi Select`
- **Description**: `Экземпляры игрушек в заказе`

### 3.4. Товары в заказе (новогодние аксессуары)
- **Field Type**: `Relationship`
- **Name**: `ny_accessory_items`
- **Label**: `Новогодние аксессуары`
- **Required**: ❌ Нет (может быть пустым, если в заказе только игрушки)
- **Related Pod**: `ny_accessory`
- **Pick Format Type**: `Multi Select`
- **Description**: `Новогодние аксессуары в заказе`

**Примечание:** В коде эти два поля будут объединены в один массив `items` при работе с заказом.

### 3.5. Итоговая сумма
- **Field Type**: `Currency`
- **Name**: `total_amount`
- **Label**: `Итоговая сумма`
- **Required**: ✅ Да
- **Currency Sign**: `₽`
- **Currency Position**: `After`
- **Description**: `Итоговая сумма заказа (с учетом скидок и сборов)`

### 3.6. Сумма без скидок
- **Field Type**: `Currency`
- **Name**: `subtotal`
- **Label**: `Сумма товаров`
- **Required**: ✅ Да
- **Currency Sign**: `₽`
- **Currency Position**: `After`
- **Description**: `Сумма товаров без скидок и сборов`

### 3.7. Сумма скидки
- **Field Type**: `Currency`
- **Name**: `discount_amount`
- **Label**: `Сумма скидки`
- **Required**: ❌ Нет
- **Currency Sign**: `₽`
- **Currency Position**: `After`
- **Description**: `Сумма примененной скидки`

### 3.8. Сбор на комплектацию
- **Field Type**: `Currency`
- **Name**: `fee_amount`
- **Label**: `Сбор на комплектацию`
- **Required**: ❌ Нет
- **Currency Sign**: `₽`
- **Currency Position**: `After`
- **Description**: `Сбор на комплектацию (350 руб. при покупке < 3500 руб.)`

### 3.9. Способ доставки
- **Field Type**: `Text`
- **Name**: `delivery_method`
- **Label**: `Способ доставки`
- **Required**: ✅ Да
- **Description**: `Способ доставки (courier, pickup, post)`

**Или используйте Select:**
- **Field Type**: `Select`
- **Options**:
  - `courier` = Курьером
  - `pickup` = Самовывоз
  - `post` = Почта России

### 3.10. Адрес доставки
- **Field Type**: `Textarea`
- **Name**: `delivery_address`
- **Label**: `Адрес доставки`
- **Required**: ✅ Да
- **Description**: `Полный адрес доставки (страна, регион, город, улица, индекс)`

**Или создайте отдельные поля:**
- `delivery_country` (Text) - Страна
- `delivery_region` (Text) - Регион/Область
- `delivery_city` (Text) - Город
- `delivery_street` (Text) - Улица, дом, квартира
- `delivery_postal_code` (Text) - Почтовый индекс

### 3.11. Способ оплаты
- **Field Type**: `Text`
- **Name**: `payment_method`
- **Label**: `Способ оплаты`
- **Required**: ✅ Да
- **Description**: `Способ оплаты (bank_transfer, card, cash)`

**Или используйте Select:**
- **Field Type**: `Select`
- **Options**:
  - `bank_transfer` = Банковский перевод
  - `card` = Банковская карта
  - `cash` = Наличными при получении

### 3.12. Детали оплаты
- **Field Type**: `Textarea`
- **Name**: `payment_details`
- **Label**: `Детали оплаты`
- **Required**: ❌ Нет
- **Description**: `Реквизиты для оплаты (для банковского перевода)`

### 3.13. Примечания
- **Field Type**: `Textarea`
- **Name**: `notes`
- **Label**: `Примечания к заказу`
- **Required**: ❌ Нет
- **Description**: `Дополнительные примечания к заказу`

### 3.14. Дата создания
- **Field Type**: `Date/Time`
- **Name**: `created_at`
- **Label**: `Дата создания`
- **Required**: ✅ Да
- **Date Format**: `Y-m-d H:i:s`
- **Description**: `Дата и время создания заказа`

**Примечание:** Можно использовать стандартное поле `post_date` WordPress, но лучше создать отдельное поле для большей гибкости.

## Шаг 4: Настройка кастомных статусов

Кастомные статусы заказа должны быть зарегистрированы в `core/data-model.json`.

### Статусы заказа:

1. **awaiting_payment** - "На оплате"
2. **collecting** - "Собирается"
3. **shipped** - "Отправлен"
4. **closed** - "Закрыт"
5. **clarification** - "Уточнение у клиента"

### Регистрация статусов

✅ **Статусы уже добавлены в `core/data-model.json`** (секция `custom_post_statuses`).

Статусы будут автоматически зарегистрированы через `core/setup.php` при загрузке темы.

**Примечание:** После добавления статусов в `data-model.json` необходимо:
1. Очистить кеш WordPress (если используется)
2. Проверить, что статусы отображаются в админке при редактировании заказа

## Шаг 5: Настройка REST API

PODS автоматически создает REST API endpoints для Custom Post Type, если включена опция "Show in REST API".

### Endpoints:
- `GET /wp-json/wp/v2/elkaretro_order` - список заказов
- `GET /wp-json/wp/v2/elkaretro_order/{id}` - получение заказа
- `POST /wp-json/wp/v2/elkaretro_order` - создание заказа (требует прав)
- `PUT /wp-json/wp/v2/elkaretro_order/{id}` - обновление заказа (требует прав)
- `DELETE /wp-json/wp/v2/elkaretro_order/{id}` - удаление заказа (требует прав)

**Примечание:** Для кастомной логики создания заказов будет использоваться отдельный endpoint `/wp-json/elkaretro/v1/orders`, который будет реализован в `core/orders/order-rest-controller.php`.

## Шаг 6: Права доступа

### Для администраторов:
- Полный доступ ко всем заказам
- Возможность изменять статус заказа
- Возможность редактировать адрес доставки
- Возможность редактировать способ оплаты (в будущем)

### Для авторизованных пользователей:
- Доступ только к своим заказам
- Возможность редактировать адрес доставки (если заказ еще не отправлен)
- Просмотр истории заказов

### Для неавторизованных пользователей:
- Создание заказа (с автоматической регистрацией)
- Доступ к заказу по номеру (в будущем)

## Шаг 7: Проверка настройки

После создания сущности проверьте:

1. ✅ Post Type `elkaretro_order` отображается в меню админки
2. ✅ Все поля созданы и отображаются в форме редактирования
3. ✅ REST API endpoints доступны
4. ✅ Кастомные статусы отображаются в выпадающем списке
5. ✅ Связи с пользователем и товарами работают

## Дополнительные настройки

### Автогенерация номера заказа

Номер заказа должен генерироваться автоматически при создании заказа. Это будет реализовано в `core/orders/order-service.php`.

**Формат номера:** `ORD-YYYYMMDD-XXXX` (например, `ORD-20240115-0001`)

### Индексация полей

Для быстрого поиска заказов рекомендуется добавить индексы на поля:
- `order_number` (уникальный индекс)
- `user` (индекс для связи)
- `status` (индекс для фильтрации)

Эти индексы будут созданы автоматически при использовании PODS.

## Работа с полями товаров в коде

Поскольку PODS Relationship поддерживает только один Related Type, в коде нужно объединять два поля в один массив:

```php
// Получение товаров из заказа
$toy_instances = get_post_meta($order_id, 'toy_instance_items', true) ?: [];
$ny_accessories = get_post_meta($order_id, 'ny_accessory_items', true) ?: [];

// Объединение в единый массив с указанием типа
$items = [];
foreach ($toy_instances as $item_id) {
    $items[] = [
        'id' => $item_id,
        'type' => 'toy_instance',
    ];
}
foreach ($ny_accessories as $item_id) {
    $items[] = [
        'id' => $item_id,
        'type' => 'ny_accessory',
    ];
}
```

Или при сохранении заказа:

```php
// Разделение товаров по типам
$toy_instance_items = [];
$ny_accessory_items = [];

foreach ($order_data['items'] as $item) {
    if ($item['type'] === 'toy_instance') {
        $toy_instance_items[] = $item['id'];
    } elseif ($item['type'] === 'ny_accessory') {
        $ny_accessory_items[] = $item['id'];
    }
}

// Сохранение в PODS
update_post_meta($order_id, 'toy_instance_items', $toy_instance_items);
update_post_meta($order_id, 'ny_accessory_items', $ny_accessory_items);
```

## Следующие шаги

После создания сущности в PODS:

1. ✅ Создать REST API контроллер (`core/orders/order-rest-controller.php`)
2. ✅ Создать сервис заказов (`core/orders/order-service.php`)
3. ✅ Реализовать создание заказа через PODS с объединением полей `toy_instance_items` и `ny_accessory_items`
4. ✅ Реализовать email уведомления
5. ✅ Протестировать создание заказа через Wizard

