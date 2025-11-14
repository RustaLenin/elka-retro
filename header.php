<?php
/**
 * The header for our theme.
 *
 * This is the template that displays all of the <head> section and everything up until <div id="content">
 *
 * @link https://developer.wordpress.org/themes/basics/template-files/#template-partials
 *
 * @package Ingot
 */
?>

<!DOCTYPE html>
<html <?php language_attributes(); ?> itemscope itemtype="http://schema.org/WebSite">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="icon" type="image/svg+xml" href="<?php echo get_template_directory_uri() . '/favicon.svg'; ?>">
    <link rel="icon" type="image/png" sizes="32x32" href="<?php echo get_template_directory_uri() . '/favicon.svg'; ?>">
    <link rel="shortcut icon" href="<?php echo get_template_directory_uri() . '/favicon.svg'; ?>">
    <link rel="apple-touch-icon" href="<?php echo get_template_directory_uri() . '/favicon.svg'; ?>">
    <link rel="profile" href="http://gmpg.org/xfn/11">
    <link rel="pingback" href="<?php bloginfo( 'pingback_url' ); ?>">
    <link rel="canonical" href="<?php echo get_site_url(); ?>"/>
    <script type="module" src="<?php echo get_template_directory_uri() . '/app/app.js'; ?>"></script>
    <script type="module" src="<?php echo get_template_directory_uri() . '/components/components.js'; ?>"></script>
    <?php
    wp_head(); ?>
</head>

<body>

<?php
$catalog_page_url = function_exists( 'elkaretro_get_catalog_page_url' ) ? elkaretro_get_catalog_page_url() : home_url( '/catalog/' );
?>

<div class="site_wrap">
    <site-header cart-count="2" catalog-url="<?php echo esc_url( $catalog_page_url ); ?>"></site-header>
<?php