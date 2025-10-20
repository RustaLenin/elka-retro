<?php

get_header(); ?>

    <div class="site_content">
        <div class="page_title"><?php _e( 'Search Results', 'theme' ); ?></div>
		<?php
        if( have_posts() ) {
	        while ( have_posts() ) {
		        the_post();
		        include( 'template-parts/post_card.php' );
	        }
	        the_posts_pagination( array(
		        'mid_size' => 2,
		        'prev_text' => __( 'Prev', 'theme' ),
		        'next_text' => __( 'Next', 'theme' ),
	        ) );
        } else { ?>
            <div class="search_error">
                <?php _e('Nothing found with this request, try another or', 'theme' );?>
                <a href="<?php echo home_url();?>">
                    <?php _e('back to main page', 'theme'); ?>
                </a>
            </div>
        <?php } ?>
    </div>

<?php
get_sidebar();
get_footer();