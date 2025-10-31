<?php
/**
 * Template for displaying Blog page (archive of posts)
 * 
 * Этот шаблон автоматически используется WordPress для страницы со slug 'blog'
 * WordPress автоматически определяет его по формату page-{slug}.php
 * 
 * @package ElkaRetro
 */

get_header(); ?>

<main id="main" class="site_main">
    <div class="section_container">
        <div class="blog-page-header">
            <h1 class="blog-page-title">Новости</h1>
            <p class="blog-page-description">Все новости и обновления нашего магазина</p>
        </div>
        
        <div class="blog-posts-container">
            <?php
            // Проверяем, настроена ли эта страница как страница для постов
            $posts_page_id = get_option('page_for_posts');
            $current_page_id = get_the_ID();
            
            // Если это страница для постов, делаем запрос постов
            if ($posts_page_id == $current_page_id) {
                // Делаем кастомный запрос постов для этой страницы
                $posts_query = new WP_Query(array(
                    'post_type'      => 'post',
                    'post_status'    => 'publish',
                    'posts_per_page' => get_option('posts_per_page', 10),
                    'paged'          => get_query_var('paged') ? get_query_var('paged') : 1,
                    'orderby'        => 'date',
                    'order'          => 'DESC',
                ));
                
                if ($posts_query->have_posts()) {
                    echo '<div class="post-cards-container" data-layout="grid" data-justify="start" data-gap="medium">';
                    
                    while ($posts_query->have_posts()) {
                        $posts_query->the_post();
                        
                        // Получаем данные поста
                        $post_id = get_the_ID();
                        $title = get_the_title();
                        $excerpt = get_the_excerpt();
                        $content = apply_filters('the_content', get_the_content());
                        $date = get_the_date('c'); // ISO 8601 формат
                        $link = get_permalink();
                        
                        // Получаем изображение (thumbnail)
                        $thumbnail_id = get_post_thumbnail_id($post_id);
                        $image_url = '';
                        if ($thumbnail_id) {
                            $image_url = get_the_post_thumbnail_url($post_id, 'large');
                            if (!$image_url) {
                                $image_url = get_the_post_thumbnail_url($post_id, 'medium');
                            }
                        }
                        
                        // Экранируем данные для HTML атрибутов
                        $title_esc = esc_attr($title);
                        $excerpt_clean = $excerpt ? preg_replace('/\s+/', ' ', trim(strip_tags($excerpt))) : '';
                        $excerpt_esc = $excerpt_clean ? esc_attr($excerpt_clean) : '';
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
                    }
                    
                    echo '</div>';
                    
                    // Пагинация для кастомного запроса
                    $big = 999999999;
                    echo '<div class="pagination">';
                    echo paginate_links(array(
                        'base' => str_replace($big, '%#%', esc_url(get_pagenum_link($big))),
                        'format' => '?paged=%#%',
                        'current' => max(1, get_query_var('paged')),
                        'total' => $posts_query->max_num_pages,
                        'mid_size' => 2,
                        'prev_text' => __('Назад', 'elkaretro'),
                        'next_text' => __('Вперед', 'elkaretro'),
                    ));
                    echo '</div>';
                    
                    wp_reset_postdata();
                } else {
                    echo '<p class="no-posts-message">Постов пока нет.</p>';
                }
            } else {
                // Если это обычная страница (не настроена как страница для постов), выводим её контент
                if (have_posts()) {
                    while (have_posts()) {
                        the_post();
                        the_content();
                    }
                }
            }
            ?>
        </div>
    </div>
</main>

<?php
get_footer();
