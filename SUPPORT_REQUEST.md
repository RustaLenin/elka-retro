# Техническое задание для поддержки хостинга

## Проблема
На сайте `elka-retro.ru` используется Nginx, который отдает JS и CSS файлы темы WordPress с агрессивным кешированием (`Cache-Control: max-age=31536000`). Это создает проблемы при обновлении кода - пользователи видят старые версии файлов даже после обновления.

## Требуемое решение
Нужно настроить Nginx так, чтобы для файлов темы `/wp-content/themes/elkaretro/` с расширениями `.js` и `.css` устанавливались заголовки, запрещающие кеширование.

## Конфигурация Nginx

Добавьте в конфигурацию виртуального хоста для `elka-retro.ru` следующий блок `location`:

```nginx
location ~* ^/wp-content/themes/elkaretro/.*\.(js|css)$ {
    # Отключаем кеширование
    add_header Cache-Control "no-store, no-cache, must-revalidate, max-age=0" always;
    add_header Pragma "no-cache" always;
    add_header Expires "0" always;
    
    # Удаляем заголовки ETag и Last-Modified (если модуль headers-more-nginx-module установлен)
    more_clear_headers "ETag";
    more_clear_headers "Last-Modified";
    
    # Отдаем файл напрямую
    try_files $uri =404;
}
```

## Важные моменты

1. **Флаг `always` обязателен** - он гарантирует, что заголовки будут установлены даже при ошибках (404, 500 и т.д.)

2. **Если модуль `headers-more-nginx-module` не установлен**, строки с `more_clear_headers` можно закомментировать или убрать. Это не критично, но желательно.

3. **Регулярное выражение** `^/wp-content/themes/elkaretro/.*\.(js|css)$` должно соответствовать файлам темы, например:
   - `/wp-content/themes/elkaretro/app/app.js`
   - `/wp-content/themes/elkaretro/components/components.js`
   - `/wp-content/themes/elkaretro/components/ui-kit/button/button.js`
   - И все `.css` файлы в этой директории

## Проверка после настройки

После применения настроек заголовки ответа для JS/CSS файлов должны быть:
- `Cache-Control: no-store, no-cache, must-revalidate, max-age=0`
- `Pragma: no-cache`
- `Expires: 0`

Вместо текущих:
- `Cache-Control: max-age=31536000`
- `Expires: Mon, 23 Nov 2026 ...`

## Контакты
Если потребуется дополнительная информация, готовы предоставить доступ или уточнить детали.



