<?php
/**
 * Template part for displaying latest posts on homepage
 * 
 * Выводит последние 3 поста не старше 3 месяцев
 * Использует компонент post-card
 *
 * @package ElkaRetro
 */

// Вычисляем дату 3 месяца назад
$three_months_ago = date('Y-m-d H:i:s', strtotime('-3 months'));

// WP Query с ограничениями
$posts_query = new WP_Query(array(
    'post_type'      => 'post',
    'post_status'    => 'publish',
    'posts_per_page' => 3,
    'orderby'        => 'date',
    'order'          => 'DESC',
    'date_query'     => array(
        array(
            'after'     => $three_months_ago,
            'inclusive' => true,
        ),
    ),
));

// Проверяем есть ли посты
if ($posts_query->have_posts()) :
    // Создаём обёртку с background
    echo '<div class="posts-section-wrapper">';
    
    // Заголовок секции с ссылкой
    echo '<div class="posts-section-header">';
    echo '<div class="posts-section-title-wrapper">';
    echo '<div class="posts-section-title-icon">';
    echo '<ui-icon name="news" size="small"></ui-icon>';
    echo '</div>';
    echo '<h2 class="posts-section-title">Новости</h2>';
    echo '</div>';
    // Получаем ссылку на архив постов
    $archive_link = '';
    
    // Вариант 1: Страница блога, настроенная в WordPress (Настройки -> Чтение -> Страница записей)
    $posts_page_id = get_option('page_for_posts');
    if ($posts_page_id) {
        $archive_link = get_permalink($posts_page_id);
    } 
    // Вариант 2: Проверяем существование страницы с slug 'blog'
    elseif (($blog_page = get_page_by_path('blog')) && $blog_page) {
        $archive_link = get_permalink($blog_page->ID);
    }
    // Вариант 3: Проверяем существование страницы с slug 'news'
    elseif (($news_page = get_page_by_path('news')) && $news_page) {
        $archive_link = get_permalink($news_page->ID);
    }
    // Вариант 4: Используем прямой URL который обработает archive.php
    // Для стандартного типа post WordPress обычно использует формат /blog/ или главную
    // Если главная страница статическая, то посты могут быть на /blog/
    else {
        // Пробуем использовать формат /blog/ который может обработаться через rewrite rules
        $archive_link = user_trailingslashit(home_url('/blog/'));
        
        // Альтернативный вариант: использовать query параметр (менее элегантно)
        // $archive_link = add_query_arg('post_type', 'post', home_url('/'));
    }
    
    if ($archive_link) {
        echo '<div class="posts-section-link-wrapper">';
        echo '<a href="' . esc_url($archive_link) . '" class="posts-section-link">Читать все новости</a>';
        echo '<ui-icon name="grid" size="small" class="posts-section-link-icon"></ui-icon>';
        echo '</div>';
    }
    echo '</div>';
    
    // Создаём контейнер с flex layout (в одну строку)
    echo '<div class="post-cards-container" data-layout="flex" data-justify="center" data-gap="medium">';
    
    while ($posts_query->have_posts()) :
        $posts_query->the_post();
        
        // Получаем данные поста
        $post_id = get_the_ID();
        $title = get_the_title();
        $excerpt = get_the_excerpt();
        // Получаем контент без применения фильтров форматирования
        $content = apply_filters('the_content', get_the_content());
        $date = get_the_date('c'); // ISO 8601 формат
        $link = get_permalink();
        
        // Получаем изображение (thumbnail)
        $thumbnail_id = get_post_thumbnail_id($post_id);
        $image_url = '';
        if ($thumbnail_id) {
            $image_url = get_the_post_thumbnail_url($post_id, 'large');
            // Если нет large, пробуем medium
            if (!$image_url) {
                $image_url = get_the_post_thumbnail_url($post_id, 'medium');
            }
        }
        
        // Экранируем данные для HTML атрибутов
        $title_esc = esc_attr($title);
        // Для excerpt и content убираем переносы строк и лишние пробелы перед экранированием
        $excerpt_clean = $excerpt ? preg_replace('/\s+/', ' ', trim(strip_tags($excerpt))) : '';
        $excerpt_esc = $excerpt_clean ? esc_attr($excerpt_clean) : '';
        
        // Для content: убираем HTML теги, оставляем только текст, убираем лишние пробелы
        $content_clean = $content ? preg_replace('/\s+/', ' ', trim(strip_tags($content))) : '';
        $content_esc = $content_clean ? esc_attr($content_clean) : '';
        
        $date_esc = esc_attr($date);
        $link_esc = esc_url($link);
        $image_esc = $image_url ? esc_url($image_url) : '';
        
        // Выводим компонент post-card
        echo '<post-card';
        echo ' id="' . $post_id . '"';
        echo ' title="' . $title_esc . '"';
        if ($excerpt_esc) {
            echo ' excerpt="' . $excerpt_esc . '"';
        }
        if ($content_esc) {
            echo ' content="' . $content_esc . '"';
        }
        echo ' date="' . $date_esc . '"';
        if ($image_esc) {
            echo ' image="' . $image_esc . '"';
        }
        echo ' link="' . $link_esc . '"';
        echo '></post-card>';
        
    endwhile;
    
    echo '</div>'; // закрываем .post-cards-container
    echo '</div>'; // закрываем .posts-section-wrapper
    
    // Сбрасываем данные поста
    wp_reset_postdata();
else :
    // Сообщение если постов нет (необязательно, можно оставить пустым)
    // echo '<p class="no-posts-message">Новых постов не найдено.</p>';
endif;
?>

