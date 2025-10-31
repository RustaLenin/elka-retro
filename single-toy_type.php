<?php
/**
 * Template for displaying single toy type posts
 *
 * @package ElkaRetro
 */
get_header(); ?>

    <div class="site_content">
		<?php
		if ( have_posts() ) {
			while (have_posts()) {
				the_post();
				// Выводим компонент toy-type-single с ID текущего типа игрушки
				$toy_type_id = get_the_ID();
				echo '<toy-type-single id="' . esc_attr($toy_type_id) . '"></toy-type-single>';
			}
		}
		?>
    </div>

<?php
get_footer();

