# Post Card Component

Компонент для отображения карточек новостей/постов в WordPress.

## Особенности

- **Формат изображений:** 16/9 (56.25% padding-top)
- **Автоматическое извлечение excerpt:** Если нет `excerpt`, берётся первый абзац из `content`
- **Дата публикации:** Отображается в локализованном формате (русский)
- **Кликабельность:** Вся карточка является ссылкой, открывается в новой вкладке
- **Hover эффекты:** Тень и увеличение при наведении

## Атрибуты

| Атрибут | Тип | Обязательный | Описание |
|---------|-----|--------------|----------|
| `id` | number | Нет | ID поста |
| `title` | string | Да | Заголовок поста |
| `excerpt` | string | Нет | Краткое описание (если нет - извлекается из content) |
| `content` | string | Нет | Полное содержание поста |
| `date` | string | Нет | Дата публикации (ISO 8601 или любой формат) |
| `image` | string | Нет | URL изображения |
| `link` | string | Да | Ссылка на пост |

## Использование в PHP

### Пример 1: Базовое использование

```php
<post-card
    id="123"
    title="Заголовок новости"
    excerpt="Краткое описание"
    date="2024-01-15T10:30:00"
    image="https://example.com/image.jpg"
    link="https://example.com/post/123"
></post-card>
```

### Пример 2: С WP Query (последние 3 поста не старше 3 месяцев)

См. файл `post-card-usage-example.php` для полного примера.

```php
<?php
$three_months_ago = date('Y-m-d H:i:s', strtotime('-3 months'));
$posts_query = new WP_Query(array(
    'post_type'      => 'post',
    'posts_per_page' => 3,
    'date_query'     => array(
        array('after' => $three_months_ago, 'inclusive' => true),
    ),
));

if ($posts_query->have_posts()) :
    echo '<div class="post-cards-container">';
    while ($posts_query->have_posts()) : $posts_query->the_post();
        // ... вывод компонента
    endwhile;
    echo '</div>';
    wp_reset_postdata();
endif;
?>
```

## Контейнер для карточек

Контейнер `.post-cards-container` управляет layout через **data-атрибуты** или **классы**:

### Flex Layout (по умолчанию)

```html
<!-- Flex с центрированием (по умолчанию) -->
<div class="post-cards-container">
    <post-card ...></post-card>
    <post-card ...></post-card>
</div>

<!-- Flex с выравниванием влево -->
<div class="post-cards-container" data-justify="start">

<!-- Flex с равномерным распределением -->
<div class="post-cards-container" data-justify="space-between">
```

### Grid Layout

```html
<!-- Grid через data-атрибут -->
<div class="post-cards-container" data-layout="grid">

<!-- Grid через класс -->
<div class="post-cards-container layout-grid">
```

### Дополнительные опции

```html
<!-- Размер отступов между карточками -->
<div class="post-cards-container" data-gap="small">   <!-- 1rem -->
<div class="post-cards-container" data-gap="medium"> <!-- 2rem -->
<div class="post-cards-container" data-gap="large">   <!-- 3rem -->
```

## Стилизация

Компонент использует CSS-переменные темы:
- `--color-card` - фон карточки
- `--color-foreground` - цвет текста
- `--color-accent` - цвет акцента (при hover на заголовке)
- `--color-border` - цвет рамки
- `--color-muted-foreground` - цвет даты
- `--font-heading` - шрифт заголовка

## Адаптивность

- На мобильных устройствах (`max-width: 768px`):
  - Уменьшенные отступы в контенте
  - Меньший размер заголовка
  - Grid переключается на одну колонку

