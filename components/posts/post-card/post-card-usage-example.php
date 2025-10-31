<?php
/**
 * Пример использования post-card компонента
 * 
 * WP Query с ограничениями:
 * - Последние 3 поста
 * - Не старше 3 месяцев
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
    // Создаём контейнер с flex layout
    echo '<div class="post-cards-container" data-layout="flex" data-justify="center" data-gap="medium">';
    
    while ($posts_query->have_posts()) :
        $posts_query->the_post();
        
        // Получаем данные поста
        $post_id = get_the_ID();
        $title = get_the_title();
        $excerpt = get_the_excerpt();
        $content = get_the_content();
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
        $excerpt_esc = esc_attr($excerpt);
        $content_esc = esc_attr($content);
        $date_esc = esc_attr($date);
        $link_esc = esc_url($link);
        $image_esc = $image_url ? esc_url($image_url) : '';
        
        // Выводим компонент post-card
        echo '<post-card';
        echo ' id="' . $post_id . '"';
        echo ' title="' . $title_esc . '"';
        if ($excerpt) {
            echo ' excerpt="' . $excerpt_esc . '"';
        }
        if ($content) {
            echo ' content="' . $content_esc . '"';
        }
        echo ' date="' . $date_esc . '"';
        if ($image_esc) {
            echo ' image="' . $image_esc . '"';
        }
        echo ' link="' . $link_esc . '"';
        echo '></post-card>';
        
    endwhile;
    
    echo '</div>';
    
    // Сбрасываем данные поста
    wp_reset_postdata();
else :
    // Сообщение если постов нет
    echo '<p>Новых постов не найдено.</p>';
endif;
?>

