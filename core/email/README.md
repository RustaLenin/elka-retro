# Email Service Module

Универсальный BackEnd сервис для отправки писем в проекте ElkaRetro.

## Архитектура

Модуль разделен на несколько файлов с четким разделением ответственности:

### Структура файлов

```
core/email/
  ├── email-loader.php              # Инициализация модуля
  ├── email-service.php             # Основной сервис отправки
  ├── email-post-type.php           # Регистрация Custom Post Type для логов
  ├── email-log-repository.php      # CRUD операции с логами
  ├── email-settings.php            # Работа с WP options (SMTP настройки)
  ├── email-rest-controller.php     # REST endpoints для админки
  ├── email-admin-page.php          # Админская страница с табами
  └── README.md                     # Документация
```

### Ответственность каждого файла

#### 1. `email-loader.php`
- Инициализация всего модуля
- Регистрация Custom Post Type
- Регистрация REST routes
- Регистрация админской страницы

#### 2. `email-service.php`
- Основной класс `Email_Service`
- Метод `send()` для отправки писем
- Интеграция SMTP через фильтр `phpmailer_init`
- Автоматическое логирование результатов отправки

#### 3. `email-post-type.php`
- Регистрация Custom Post Type `elkaretro_email_log`
- Скрытие из стандартного UI WordPress
- Использует стандартный статус `publish` (результат в мета-поле `_sent_result`)

#### 4. `email-log-repository.php`
- Класс `Email_Log_Repository`
- Методы: `create()`, `get()`, `get_list()`, `delete()`
- Работа с мета-полями через `update_post_meta()`

#### 5. `email-settings.php`
- Класс `Email_Settings`
- Работа с WP options для SMTP настроек
- Методы: `get()`, `set()`, `get_all()`, `update_all()`
- Автоматическая санитизация значений

#### 6. `email-rest-controller.php`
- REST endpoints для админки:
  - `GET /elkaretro/v1/email/settings` - получить настройки
  - `POST /elkaretro/v1/email/settings` - сохранить настройки
  - `GET /elkaretro/v1/email/logs` - получить логи
  - `DELETE /elkaretro/v1/email/logs/{id}` - удалить лог

#### 7. `email-admin-page.php`
- Админская страница "Email Settings"
- Табы: "SMTP Settings" и "Email Logs"
- Использует REST endpoints для работы с данными

## Использование

### Отправка письма

```php
use Elkaretro\Core\Email\Email_Service;

$result = Email_Service::send(
    'user@example.com',
    'Тема письма',
    '<html>Содержимое письма</html>',
    array(
        'content_type' => 'html', // или 'text'
        'headers'      => array(
            'Reply-To: noreply@example.com',
        ),
        'context'      => array(
            'type'          => 'order_created',
            'order_id'      => 123,
            'recipient_type' => 'customer',
        ),
    )
);

if ( is_wp_error( $result ) ) {
    // Обработка ошибки
} else {
    // Письмо отправлено успешно
}
```

### Получение настроек

```php
use Elkaretro\Core\Email\Email_Settings;

// Получить одну настройку
$smtp_enabled = Email_Settings::get( 'smtp_enabled' );

// Получить все настройки
$all_settings = Email_Settings::get_all();

// Установить настройку
Email_Settings::set( 'smtp_host', 'smtp.example.com' );

// Обновить несколько настроек
$result = Email_Settings::update_all( array(
    'smtp_enabled' => true,
    'smtp_host'    => 'smtp.example.com',
    'smtp_port'    => 587,
) );
```

### Работа с логами

```php
use Elkaretro\Core\Email\Email_Log_Repository;

$repository = new Email_Log_Repository();

// Создать лог (обычно делается автоматически Email_Service)
$log_id = $repository->create( array(
    'to_email'      => 'user@example.com',
    'subject'       => 'Тема',
    'sent_result'   => 'sent', // или 'failed'
    'error_message' => '',
    'context'       => array( 'type' => 'test' ),
) );

// Получить лог
$log = $repository->get( $log_id );

// Получить список логов
$result = $repository->get_list( array(
    'per_page' => 20,
    'page'     => 1,
    'status'   => 'sent', // или 'failed', или пусто для всех
    'search'   => 'user@example.com',
) );

// Удалить лог
$repository->delete( $log_id );
```

## SMTP настройки

SMTP настройки хранятся в WP options с префиксом `elkaretro_email_`:

- `elkaretro_email_smtp_enabled` - включен ли SMTP (boolean)
- `elkaretro_email_smtp_host` - SMTP сервер (string)
- `elkaretro_email_smtp_port` - порт (integer, обычно 587 или 465)
- `elkaretro_email_smtp_secure` - шифрование: 'tls' или 'ssl'
- `elkaretro_email_smtp_auth` - требуется ли аутентификация (boolean)
- `elkaretro_email_smtp_username` - логин (string)
- `elkaretro_email_smtp_password` - пароль (string)
- `elkaretro_email_from_name` - имя отправителя (string, по умолчанию название сайта)
- `elkaretro_email_from_email` - email отправителя (string, по умолчанию admin_email)

Если SMTP отключен, используется стандартный `wp_mail()` WordPress.

## Логирование

Все отправленные письма автоматически логируются в Custom Post Type `elkaretro_email_log`:

- **Мета-поля:**
  - `_to_email` - получатель
  - `_subject` - тема письма
  - `_sent_result` - результат: 'sent' или 'failed'
  - `_error_message` - сообщение об ошибке (если failed)
  - `_context` - JSON с контекстом (тип письма, order_id и т.д.)

- **Post Date:** дата отправки

Логи доступны в админке на странице "Email Settings" → вкладка "Email Logs".

## Интеграция с существующими сервисами

### Рефакторинг Order_Email_Templates

Вместо прямого использования `wp_mail()`, используйте `Email_Service`:

```php
// Было:
return wp_mail( $email, $subject, $message, $this->get_email_headers() );

// Стало:
use Elkaretro\Core\Email\Email_Service;

return Email_Service::send(
    $email,
    $subject,
    $message,
    array(
        'context' => array(
            'type'          => 'order_created',
            'order_id'      => $order_id,
            'recipient_type' => 'customer',
        ),
    )
);
```

### Рефакторинг User_Profile_REST_Controller

В методе `send_contact_message()`:

```php
// Было:
$sent = wp_mail( $to, $subject_email, $email_message, $headers );

// Стало:
use Elkaretro\Core\Email\Email_Service;

$sent = Email_Service::send(
    $to,
    $subject_email,
    $email_message,
    array(
        'content_type' => 'text',
        'headers'      => $headers,
        'context'      => array(
            'type'    => 'contact_form',
            'user_id' => $user_id,
        ),
    )
);
```

## Шаблоны писем

Шаблоны писем хранятся в соответствующих сервисах:

- **Заказы:** `core/orders/order-email-templates.php`
- **Регистрация пользователей:** (будущий файл) `core/user-profile/user-email-templates.php`

Email Service не знает о шаблонах - он только отправляет готовый HTML/текст.

## Админка

Админская страница доступна в меню "Внешний вид" → "Email Settings" (только для администраторов).

### Вкладка "SMTP Settings"
- Форма для настройки SMTP
- Автоматическое сохранение через REST API
- Валидация полей

### Вкладка "Email Logs"
- Таблица с логами отправок
- Фильтрация по статусу (sent/failed)
- Поиск по email или теме
- Пагинация
- Удаление логов

## Безопасность

- Все REST endpoints доступны только администраторам (`manage_options`)
- Админская страница доступна только администраторам
- Все входные данные санитизируются
- Пароли SMTP хранятся в WP options (зашифрованы WordPress при необходимости)

## Зависимости

- WordPress 5.0+
- PHP 7.4+
- Без внешних библиотек (используется встроенный PHPMailer WordPress)

