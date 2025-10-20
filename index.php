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
    
    <!-- Hero Section -->
    <div id="hero" class="section_container">
      <!-- <hero-section></hero-section> -->
    </div>
    
    <!-- Catalog Cards -->
    <div id="catalog" class="section_container">
      <!-- <catalog-cards></catalog-cards> -->
    </div>
    
    <!-- Latest News -->
    <div id="news" class="section_container">
      <!-- <latest-news></latest-news> -->
    </div>
    
    <!-- Product Grids -->
    <div class="section_container">
      <div id="new-arrivals" class="product_section">
        <!-- <product-grid type="new-arrivals"></product-grid> -->
      </div>
      
      <div id="popular" class="product_section">
        <!-- <product-grid type="popular"></product-grid> -->
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