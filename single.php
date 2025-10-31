<?php
/**
 * The template for displaying any single post.
 *
 * @package ElkaRetro
 */
get_header(); ?>

    <div class="site_content">
		<?php
		if ( have_posts() ) {
			while (have_posts()) {
				the_post();
				// Выводим компонент post-single с ID текущего поста
				$post_id = get_the_ID();
				// Проверяем, что это именно post, а не другой custom post type
				if (get_post_type() === 'post') {
					echo '<post-single id="' . esc_attr($post_id) . '"></post-single>';
				} else {
					// Для других типов постов используем старый шаблон или другую логику
					include('template-parts/post_single.php');
				}
			}
		}
		?>
    </div>

<?php
get_footer();