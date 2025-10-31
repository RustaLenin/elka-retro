<?php
/**
 * The template for displaying main-page.
 *
 * @package Ignot
 */

get_header(); ?>

	<main-sidebar></main-sidebar>
  
	<!-- Main Content -->
	<main id="main" class="site_main">

    <!-- Latest News -->
    <div id="news" class="section_container">
        <?php get_template_part('template-parts/latest-posts'); ?>
    </div>
    
    <!-- Hero Section -->
    <div id="hero" class="section_container">
      <!-- <hero-section></hero-section> -->
    </div>
    
    <!-- Latest Toy Types (New Arrivals) -->
    <div class="section_container">
      <div id="new-arrivals" class="product_section">
        <?php get_template_part('template-parts/latest-toy-types'); ?>
      </div>
    </div>
    
  </main>

    <div class="site_content">
		<?php
		// while ( have_posts() ) {
		// 	the_post();
		// 	include( 'template-parts/post_card.php' );
		// }

		// the_posts_pagination( array(
		// 	'mid_size' => 2,
		// 	'prev_text' => __( 'Prev', 'theme' ),
		// 	'next_text' => __( 'Next', 'theme' ),
		// ) );
		?>
    </div>

<?php
get_footer();