# План реализации микроразметки для SEO и социальных сетей

## Цель
Добавить микроразметку (Open Graph, Twitter Cards, Schema.org JSON-LD) для улучшения отображения страниц в поисковых системах и социальных сетях.

## Типы микроразметки

### 1. Open Graph (og:)
- **Платформы**: Facebook, VK, LinkedIn, Telegram
- **Формат**: HTML meta-теги `<meta property="og:*" content="...">`
- **Размещение**: В `<head>` через хук `wp_head()`

### 2. Twitter Cards
- **Платформы**: Twitter/X
- **Формат**: HTML meta-теги `<meta name="twitter:*" content="...">`
- **Размещение**: В `<head>` через хук `wp_head()`

### 3. Schema.org JSON-LD
- **Платформы**: Google, Яндекс
- **Формат**: JSON-LD скрипт `<script type="application/ld+json">`
- **Размещение**: В `<head>` через хук `wp_head()`

## Страницы для реализации

### ✅ Приоритет 1: Страница типа игрушки (`toy_type`)
- **Шаблон**: `single-toy_type.php` или через хук `wp_head()` с проверкой `is_singular('toy_type')`
- **Open Graph**:
  - `og:type` = "product"
  - `og:title` = название типа игрушки
  - `og:description` = описание (excerpt или первые 160 символов content)
  - `og:image` = Featured Image или первое изображение из галереи
  - `og:url` = permalink страницы
  - `og:site_name` = название сайта
  - `product:price:amount` = минимальная цена (если есть доступные экземпляры)
  - `product:price:currency` = "RUB"
  - `product:availability` = "in stock" / "out of stock" (на основе availableCount)
- **Twitter Cards**:
  - `twitter:card` = "summary_large_image"
  - `twitter:title` = название типа игрушки
  - `twitter:description` = описание
  - `twitter:image` = Featured Image
- **Schema.org**:
  - Тип: `Product`
  - Поля:
    - `name` = название типа игрушки
    - `description` = описание
    - `image` = Featured Image (массив URL)
    - `offers` = объект с:
      - `@type` = "AggregateOffer"
      - `priceCurrency` = "RUB"
      - `lowPrice` = минимальная цена
      - `highPrice` = максимальная цена (если есть)
      - `availability` = "https://schema.org/InStock" / "OutOfStock"
    - `brand` = производитель (если есть)
    - `category` = категории игрушки

### ✅ Приоритет 2: Посты блога (`post`)
- **Шаблон**: `single.php` или через хук `wp_head()` с проверкой `is_single() && get_post_type() === 'post'`
- **Open Graph**:
  - `og:type` = "article"
  - `og:title` = заголовок поста
  - `og:description` = excerpt или первые 160 символов content
  - `og:image` = Featured Image
  - `og:url` = permalink
  - `og:site_name` = название сайта
  - `article:published_time` = дата публикации
  - `article:modified_time` = дата изменения
  - `article:author` = автор (если есть)
- **Twitter Cards**:
  - `twitter:card` = "summary_large_image"
  - `twitter:title` = заголовок поста
  - `twitter:description` = excerpt
  - `twitter:image` = Featured Image
- **Schema.org**:
  - Тип: `Article` или `BlogPosting`
  - Поля:
    - `headline` = заголовок
    - `description` = описание
    - `image` = Featured Image
    - `datePublished` = дата публикации
    - `dateModified` = дата изменения
    - `author` = автор (Person)
    - `publisher` = сайт (Organization)

### ✅ Приоритет 3: Обычные страницы (`page`)
- **Шаблон**: `page.php` или через хук `wp_head()` с проверкой `is_page() && !is_front_page()`
- **Open Graph**:
  - `og:type` = "website"
  - `og:title` = заголовок страницы
  - `og:description` = excerpt или первые 160 символов content
  - `og:image` = Featured Image
  - `og:url` = permalink
  - `og:site_name` = название сайта
- **Twitter Cards**:
  - `twitter:card` = "summary_large_image"
  - `twitter:title` = заголовок страницы
  - `twitter:description` = описание
  - `twitter:image` = Featured Image
- **Schema.org**:
  - Тип: `WebPage`
  - Поля:
    - `name` = заголовок страницы
    - `description` = описание
    - `image` = Featured Image

### ✅ Приоритет 4: Каталог (`page-catalog.php`)
- **Шаблон**: `page-catalog.php` или через хук `wp_head()` с проверкой `is_page_template('page-catalog.php')`
- **Open Graph**:
  - `og:type` = "website"
  - `og:title` = "Каталог" + название сайта
  - `og:description` = описание каталога (можно из контента страницы или статичное)
  - `og:image` = Featured Image страницы или логотип сайта
  - `og:url` = URL каталога
  - `og:site_name` = название сайта
- **Twitter Cards**:
  - `twitter:card` = "summary_large_image"
  - `twitter:title` = "Каталог"
  - `twitter:description` = описание каталога
  - `twitter:image` = Featured Image
- **Schema.org**:
  - Тип: `CollectionPage` или `WebPage`
  - Поля:
    - `name` = "Каталог"
    - `description` = описание каталога
    - `image` = Featured Image

### ✅ Приоритет 5: Главная страница (`front_page`)
- **Шаблон**: `index.php` или через хук `wp_head()` с проверкой `is_front_page()`
- **Open Graph**:
  - `og:type` = "website"
  - `og:title` = название сайта + описание
  - `og:description` = описание сайта (из настроек или статичное)
  - `og:image` = логотип сайта или Featured Image главной страницы
  - `og:url` = home_url()
  - `og:site_name` = название сайта
- **Twitter Cards**:
  - `twitter:card` = "summary_large_image"
  - `twitter:title` = название сайта
  - `twitter:description` = описание сайта
  - `twitter:image` = логотип сайта
- **Schema.org**:
  - Тип: `WebSite`
  - Поля:
    - `name` = название сайта
    - `description` = описание сайта
    - `url` = home_url()
    - `potentialAction` = SearchAction (если есть поиск)

## Логика получения данных

### Featured Image с fallback
```php
function get_og_image($post_id = null) {
    if (!$post_id) {
        $post_id = get_the_ID();
    }
    
    // 1. Пробуем Featured Image
    $thumbnail_id = get_post_thumbnail_id($post_id);
    if ($thumbnail_id) {
        $image_url = wp_get_attachment_image_url($thumbnail_id, 'large');
        if ($image_url) {
            return $image_url;
        }
    }
    
    // 2. Для типа игрушки: первое изображение из галереи
    if (get_post_type($post_id) === 'toy_type') {
        $photos = get_post_meta($post_id, 'toy_type_photos', true);
        if (is_array($photos) && !empty($photos)) {
            $first_photo = reset($photos);
            $photo_id = is_array($first_photo) ? ($first_photo['ID'] ?? null) : $first_photo;
            if ($photo_id) {
                $image_url = wp_get_attachment_image_url($photo_id, 'large');
                if ($image_url) {
                    return $image_url;
                }
            }
        }
    }
    
    // 3. Fallback: логотип сайта или дефолтное изображение
    $default_image = get_theme_mod('custom_logo');
    if ($default_image) {
        $image_url = wp_get_attachment_image_url($default_image, 'large');
        if ($image_url) {
            return $image_url;
        }
    }
    
    // 4. Последний fallback: дефолтное изображение из темы
    return get_template_directory_uri() . '/assets/img/default-og-image.jpg';
}
```

### Получение описания
```php
function get_og_description($post_id = null) {
    if (!$post_id) {
        $post_id = get_the_ID();
    }
    
    // 1. Пробуем excerpt
    $excerpt = get_the_excerpt($post_id);
    if (!empty($excerpt)) {
        return wp_trim_words($excerpt, 25, '...');
    }
    
    // 2. Берем первые 160 символов из content
    $content = get_post_field('post_content', $post_id);
    $content = wp_strip_all_tags($content);
    $content = strip_shortcodes($content);
    
    if (!empty($content)) {
        return wp_trim_words($content, 25, '...');
    }
    
    // 3. Fallback: описание сайта
    return get_bloginfo('description');
}
```

### Получение цен для типа игрушки
```php
function get_toy_type_price_range($post_id) {
    $available_count = (int) get_post_meta($post_id, 'available_instances_count', true);
    
    if ($available_count === 0) {
        return null; // Нет доступных экземпляров
    }
    
    // Получаем все доступные экземпляры через связь
    // И вычисляем min/max цены
    // TODO: реализовать через REST API или прямой запрос
    
    return [
        'min' => $min_price,
        'max' => $max_price,
        'currency' => 'RUB'
    ];
}
```

## Структура файлов

```
core/seo/
├── seo-loader.php          # Инициализация, подключение хуков
├── seo-meta-generator.php  # Класс для генерации мета-тегов
└── SEO_MICRODATA_PLAN.md   # Этот файл (документация)
```

## Хуки WordPress

- `wp_head` - основной хук для добавления мета-тегов в `<head>`
- Проверки через `is_singular()`, `is_single()`, `is_page()`, `is_front_page()`

## Приоритеты реализации

1. ✅ Базовый класс `SEO_Meta_Generator`
2. ✅ Страница типа игрушки (самая важная для бизнеса)
3. ✅ Посты блога
4. ✅ Обычные страницы
5. ✅ Каталог
6. ✅ Главная страница

## Тестирование

- Open Graph: https://developers.facebook.com/tools/debug/
- Twitter Cards: https://cards-dev.twitter.com/validator
- Schema.org: https://validator.schema.org/
- Google Rich Results: https://search.google.com/test/rich-results

