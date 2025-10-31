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

// Theme Settings (управление настройками темы)
require_once( THEME_COR . 'theme-settings.php' );

// Taxonomy Sync (синхронизация таксономий с продакшена)
require_once( THEME_COR . 'taxonomy-sync.php' );

// Mock Data Installer (для локальной разработки)
require_once( THEME_COR . 'mock-data-installer.php' );

/**
 * Include files if module is supported
 **/

require_once( THEME_MOD . 'kama_breadcrumbs.php' );
require_once( THEME_MOD . 'quick_tags.php' );
require_once( THEME_MOD . 'dereg.php' );
require_once( THEME_COR . 'filters/content.php' );
require_once( THEME_COR . 'default_controller.php');

@ini_set( 'upload_max_size' , '500M' );

/**
 * Emit a JSON list of required web components for the current page.
 * Extend via the 'elkaretro_required_components' filter in templates or modules.
 */
add_action('wp_head', function () {
    $required = apply_filters('elkaretro_required_components', array());
    if (!is_array($required) || empty($required)) {
        return;
    }
    echo '<script id="elkaretro-required-components" type="application/json">' . wp_json_encode(array_values(array_unique($required))) . '</script>';
});

/**
 * Add required components based on page type
 */
add_filter('elkaretro_required_components', function($components) {
    if (!is_array($components)) {
        $components = array();
    }
    
    // Главная страница: нужны компоненты post-card и toy-type-card
    if (is_front_page() || is_home()) {
        $components[] = 'post-card';
        $components[] = 'toy-type-card';
    }
    
    // Страница отдельного поста
    if (is_single() && get_post_type() === 'post') {
        $components[] = 'post-single';
    }
    
    // Страница отдельного типа игрушки
    if (is_single() && get_post_type() === 'toy_type') {
        $components[] = 'toy-type-single';
        $components[] = 'category-breadcrumbs'; // Нужны хлебные крошки для категорий
        $components[] = 'toy-instance-card'; // Карточки экземпляров на странице типа
        $components[] = 'toy-instance-modal'; // Модальное окно для детального просмотра экземпляра
    }
    
    // Обычная страница (но не страница блога)
    if (is_page() && !is_front_page()) {
        $posts_page_id = get_option('page_for_posts');
        $current_page_id = get_the_ID();
        // Если это не страница блога, используем компонент wp-page
        if ($posts_page_id != $current_page_id) {
            $components[] = 'wp-page';
        }
    }
    
    // Страница блога (архив постов)
    $posts_page_id = get_option('page_for_posts');
    if ($posts_page_id && is_page($posts_page_id)) {
        $components[] = 'post-card';
    }
    
    // Страницы ошибок (404)
    if (is_404()) {
        $components[] = 'error-page';
    }
    
    return $components;
});

/**
 * Создаёт страницу "Блог" автоматически, если она не существует
 * Это нужно для ссылки "Читать все новости"
 */
add_action('after_setup_theme', function() {
    // Проверяем, существует ли уже страница с slug 'blog'
    if (!get_page_by_path('blog')) {
        // Создаём страницу "Блог"
        $blog_page = array(
            'post_title'    => 'Блог',
            'post_name'     => 'blog',
            'post_content'  => '',
            'post_status'   => 'publish',
            'post_type'     => 'page',
            'post_author'   => 1,
            'page_template' => 'page-blog.php', // Привязываем кастомный шаблон
        );
        
        $page_id = wp_insert_post($blog_page);
        
        // Если страница создана, настраиваем её как страницу для постов
        if (!is_wp_error($page_id) && !get_option('page_for_posts')) {
            update_option('page_for_posts', $page_id);
            // Убеждаемся, что шаблон привязан (на случай если при создании не сработало)
            update_post_meta($page_id, '_wp_page_template', 'page-blog.php');
        }
    }
});

