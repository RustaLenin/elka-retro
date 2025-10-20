<?php

/**
 * Theme scripts and styles de_register
 * This may be useful, if functionality of this scripts are none using and ypu want to cut them down for better performance.
 **/

function my_deregister_styles()    {
    wp_deregister_style( 'amethyst-dashicons-style' );
    wp_deregister_style( 'dashicons' );
}

remove_action('wp_head', 'print_emoji_detection_script', 7);
remove_action('wp_print_styles', 'print_emoji_styles');

add_action( 'wp_print_styles', 'my_deregister_styles', 100 );

show_admin_bar( false );

//function hide_admin_bar() {
//    return false;
//}
//add_filter('show_admin_bar', 'hide_admin_bar' );