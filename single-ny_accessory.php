<?php
/**
 * Template for displaying single NY accessory posts
 *
 * @package ElkaRetro
 */

get_header(); ?>

    <div class="site_content">
		<?php
		if ( have_posts() ) {
			while ( have_posts() ) {
				the_post();
				$accessory_id = get_the_ID();
				echo '<ny-accessory-single id="' . esc_attr($accessory_id) . '"></ny-accessory-single>';
			}
		}
		?>
    </div>

<?php
get_footer();


