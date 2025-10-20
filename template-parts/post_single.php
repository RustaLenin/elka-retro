<?php

/**
 * The template for displaying single post
 *
 * @package Ingot
 */
?>

<article id="post-<?php the_ID(); ?>" class="single_post">

    <div class="image">
        <a href="<?php the_permalink(); ?>">
			<?php echo get_the_post_thumbnail( $post->ID, 'large'); ?>
        </a>
    </div>

    <div class="content">

        <div class="header">

            <div class="header_title">
                <a href="<?php echo get_the_permalink( $post->ID ); ?>">
					<?php echo get_the_title( $post->ID ); ?>
                </a>
            </div>

            <div class="header_meta">

                <div class="header_meta__author">
					<?php _e('Author: ', 'theme' ); ?>
                    <a href="<?php echo get_author_posts_url( get_the_author_meta( 'ID', $post->post_author ) ); ?>">
						<?php echo get_the_author_meta('display_name',  $post->post_author ); ?>
                    </a>
                </div>

                <div class="header_meta__data">
					<?php
					_e('Date: ', 'theme' );
					echo get_the_date('j F Y');
					?>
                </div>

                <div class="header_meta__cats">
		            <?php
		            _e('Category: ', 'theme' );
		            $categorys = get_the_category( $post->ID );
		            foreach ( $categorys as $category ) { ?>
                        <a href="<?php echo get_category_link( $category->cat_ID ); ?>">
                            <?php echo $category->cat_name; ?>
                        </a>
                    <?php } ?>
                </div>

            </div>

        </div>

        <div class="body">
            <div class="body_content">
	            <?php echo wpautop( $post->post_content ); ?>
            </div>
        </div>

        <div class="footer">
            <div class="footer_tags">
				<?php echo get_the_tag_list('#',', ',''); ?>
            </div>
        </div>

    </div>

</article>

<?php comments_template(); ?>