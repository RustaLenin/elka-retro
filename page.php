<?php
/**
 * The template for displaying any single page.
 *
 * @package Ignot
 */

get_header(); ?>

    <div class="site_content">
	    <?php
	    if ( have_posts() ) {
		    while (have_posts()) {
			    the_post();
			    include('template-parts/post_single.php');
		    }
	    }
	    ?>
    </div>

<?php
get_sidebar();
get_footer();