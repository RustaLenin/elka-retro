<?php
/**
 * The template for displaying any single page.
 *
 * @package ElkaRetro
 */

get_header(); ?>

    <div class="site_content">
	    <?php
	    if ( have_posts() ) {
		    while (have_posts()) {
			    the_post();
			    // Выводим компонент wp-page с ID текущей страницы
			    $page_id = get_the_ID();
			    echo '<wp-page id="' . esc_attr($page_id) . '"></wp-page>';
		    }
	    }
	    ?>
    </div>

<?php
get_footer();