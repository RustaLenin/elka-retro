<?php

/**
 * Elka Retro - Custom WordPress Theme for elka-retro.ru
 *
 * @link https://developer.wordpress.org/themes/basics/theme-functions/
 *
 * @package ElkaRetro
 */

/**
 * Define Constants
 **/

define( 'THEME_DIR', dirname( __FILE__ )                              );
define( 'THEME_COR', dirname( __FILE__ ) . '/core/'                   );
define( 'THEME_MOD', dirname( __FILE__ ) . '/modules/'                );
define( 'THEME_ASS', dirname( __FILE__ ) . '/assets/'	              );

require_once( THEME_COR . 'setup.php' );

/**
 * Include files if module is supported
 **/

require_once( THEME_MOD . 'kama_breadcrumbs.php' );
require_once( THEME_MOD . 'quick_tags.php' );
require_once( THEME_MOD . 'dereg.php' );
require_once( THEME_COR . 'filters/content.php' );
require_once( THEME_COR . 'default_controller.php');

@ini_set( 'upload_max_size' , '500M' );

