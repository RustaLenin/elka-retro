<?php

/**
 * The template for displaying post in the feed
 *
 * @package Ingot
 */
?>

<article id="post-<?php the_ID(); ?>" class="post_card">

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

            </div>

        </div>

        <div class="body">
            <div class="body_excerpt">
                <?php echo wp_trim_words( get_the_excerpt(), 40, '...' ); ?>
                <div class="read_more">
                    <a href="<?php the_permalink(); ?>">
                        <?php _e('Read More ...','theme'); ?>
                    </a>
                </div>
            </div>
        </div>

        <div class="footer">
            <div class="footer_tags">
	            <?php echo get_the_tag_list('#',', ',''); ?>
            </div>
        </div>

    </div>

</article>