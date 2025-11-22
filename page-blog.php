<?php
/**
 * Template for displaying Blog page (archive of posts)
 * 
 * Этот шаблон автоматически используется WordPress для страницы со slug 'blog'
 * WordPress автоматически определяет его по формату page-{slug}.php
 * 
 * @package ElkaRetro
 */

// Добавляем компоненты в список необходимых
add_filter(
	'elkaretro_required_components',
	static function( $components ) {
		if ( ! is_array( $components ) ) {
			$components = array();
		}

		$components[] = 'blog-page';
		$components[] = 'post-card';

		return array_values( array_unique( $components ) );
	}
);

get_header(); ?>

<main id="main" class="site_main">
    <div class="section_container">
        <div class="blog-page-header">
            <h1 class="blog-page-title">Новости</h1>
            <p class="blog-page-description">Все новости и обновления нашего магазина</p>
        </div>
        
        <?php
        // Проверяем, настроена ли эта страница как страница для постов
        $posts_page_id = get_option('page_for_posts');
        $current_page_id = get_the_ID();
        
        // Если это страница для постов, используем компонент blog-page
        if ($posts_page_id == $current_page_id) {
            $endpoint = rest_url('wp/v2/posts');
            ?>
            <div class="blog-posts-container">
                <blog-page
                    data-endpoint="<?php echo esc_attr($endpoint); ?>"
                    data-per-page="10"
                ></blog-page>
            </div>
            <?php
        } else {
            // Если это обычная страница (не настроена как страница для постов), выводим её контент
            ?>
            <div class="blog-posts-container">
                <?php
                if (have_posts()) {
                    while (have_posts()) {
                        the_post();
                        the_content();
                    }
                }
                ?>
            </div>
            <?php
        }
        ?>
    </div>
</main>

<?php
get_footer();
