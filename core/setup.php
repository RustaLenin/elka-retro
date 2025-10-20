<?php

Class THEME_REGISTER {

    static $def_menus = array(
        array(
            'primary' => 'Primary Menu',
        ),
    );

    public static function setup() {

        // Add default posts and comments RSS feed links to head.
        add_theme_support( 'automatic-feed-links' );

        /*
        * Let WordPress manage the document title.
        * By adding theme support, we declare that this theme does not use a
        * hard-coded <title> tag in the document head, and expect WordPress to
        * provide it for us.
        */
        add_theme_support( 'title-tag' );

        /*
        * Enable support for Post Thumbnails on posts and pages.
        *
        * @link https://developer.wordpress.org/themes/functionality/..
        */
        add_theme_support( 'post-thumbnails' );

        /*
        * Switch default core markup for search form, comment form, and comments
        * to output valid HTML5.
        */
        add_theme_support( 'html5', array( 'search-form', 'comment-form', 'comment-list', 'gallery', 'caption', ) );

        /*
        * Make theme available for translation.
        * Translations can be filed in the /languages/ directory.
        * If you're building a theme based on theme, use a find and replace
        * to change 'theme' to the name of your theme in all the template files.
        */
        load_theme_textdomain( 'theme', get_template_directory() . '/languages' );

        $menus = self::$def_menus;

        // This theme uses wp_nav_menu() in one location.
        foreach ($menus as $menu) {
            register_nav_menus( $menu );
        }

    }

    public static function setup_defaults() {
        // add_theme_support( 'starter-content', array(
        //     'options'     => '',
        //     'theme_mods'  => '',
        //     'widgets'     => '',
        //     'nav_menus'   => '',
        //     'attachments' => '',
        //     'posts'       => '', // array of arrays like: ID => array('post_type' => '', 'post_title' => '', 'post_excerpt' => '', 'post_name' => '', 'post_content' => '', 'menu_order' => '', 'comment_status' => '', 'thumbnail' => '', 'template' => '')
        // ) );
    }

    /**
     * Register widget area.
     *
     * @link https://developer.wordpress.org/themes/functionality/sidebars/#registering-a-sidebar
     */
    public static function widgets_init() {
        register_sidebar( array(
            'name'          => esc_html__( 'Sidebar', 'theme' ),
            'id'            => 'default-sidebar',
            'description'   => esc_html__( 'Add widgets here.', 'theme' ),
            'before_widget' => '<div class="widjet_cont">',
            'after_widget'  => '</div>'
        ) );
	    register_sidebar( array(
		    'name'          => esc_html__( 'Header Widgets', 'theme' ),
		    'id'            => 'header-widgets',
		    'description'   => esc_html__( 'Widgets in the header after logo and title', 'theme' ),
		    'before_widget' => '<div class="header_widget__container">',
		    'after_widget'  => '</div>'
	    ) );
	    register_sidebar( array(
		    'name'          => esc_html__( 'Footer Widgets', 'theme' ),
		    'id'            => 'footer-widgets',
		    'description'   => esc_html__( 'Widgets in the footer, before copyright', 'theme' ),
		    'before_widget' => '<div class="footer_widget__container">',
		    'after_widget'  => '</div>'
	    ) );
    }

    public static function styles() {
        wp_enqueue_style( 'theme_style', get_stylesheet_uri() );
    }

}

add_action( 'after_setup_theme',  array('THEME_REGISTER', 'setup'            ) );
add_action( 'after_setup_theme',  array('THEME_REGISTER', 'setup_defaults'   ) );
add_action( 'widgets_init',       array('THEME_REGISTER', 'widgets_init'     ) );
add_action( 'wp_enqueue_scripts', array('THEME_REGISTER', 'styles'           ) );