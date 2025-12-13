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
    <?php
    // Добавляем версию к основным модулям для cache busting
    require_once( THEME_COR . 'asset-versioning.php' );
    $asset_version = \Elkaretro\Core\Asset_Versioning::get_version();
    $app_js_url = get_template_directory_uri() . '/app/app.js?v=' . esc_attr($asset_version);
    $components_js_url = get_template_directory_uri() . '/components/components.js?v=' . esc_attr($asset_version);
    ?>
    <?php wp_head(); ?>
    
    <?php
    // Подключаем механизм уведомления об обновлении (inline CSS и JS)
    require_once( THEME_COR . 'update-notification.php' );
    elkaretro_output_update_notification();
    ?>
    
    <script type="module" src="<?php echo esc_url($app_js_url); ?>"></script>
    <script type="module" src="<?php echo esc_url($components_js_url); ?>"></script>
</head>

<body>

<?php
$catalog_page_url = function_exists( 'elkaretro_get_catalog_page_url' ) ? elkaretro_get_catalog_page_url() : home_url( '/catalog/' );

// Ссылка на каталог аксессуаров
$ny_accessory_link = function_exists('elkaretro_get_accessory_catalog_page_url') ? elkaretro_get_accessory_catalog_page_url() : '';
if (!$ny_accessory_link) {
  $ny_accessory_link = function_exists('get_post_type_archive_link') ? get_post_type_archive_link('ny_accessory') : '';
  if (!$ny_accessory_link) {
    $ny_accessory_link = home_url('/ny-accessory/');
  }
}
?>

<div class="site_wrap">
    <site-header 
      cart-count="2" 
      catalog-url="<?php echo esc_url( $catalog_page_url ); ?>"
      accessories-url="<?php echo esc_url( $ny_accessory_link ); ?>"
      home-url="<?php echo esc_url( home_url( '/' ) ); ?>"
    ></site-header>
<?php