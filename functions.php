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

/**
 * Load and initialize Data Model
 * Загружает JSON файл дата-модели и делает его доступным как глобальную константу
 */
if (!function_exists('elkaretro_load_data_model')) {
    function elkaretro_load_data_model() {
        $data_model_file = THEME_DIR . '/core/data-model.json';
        
        if (!file_exists($data_model_file)) {
            error_log('ElkaRetro: Data model file not found: ' . $data_model_file);
            return false;
        }
        
        $json_content = file_get_contents($data_model_file);
        if ($json_content === false) {
            error_log('ElkaRetro: Failed to read data model file: ' . $data_model_file);
            return false;
        }
        
        $data_model = json_decode($json_content, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log('ElkaRetro: JSON decode error in data model: ' . json_last_error_msg());
            return false;
        }
        
        // Сохраняем как глобальную константу (массив в константе доступен с PHP 5.6+)
        // Используем define() с проверкой, чтобы не переопределить
        if (!defined('ELKARETRO_DATA_MODEL')) {
            define('ELKARETRO_DATA_MODEL', $data_model);
        }
        
        return true;
    }
}

// Загружаем дата-модель при инициализации темы
elkaretro_load_data_model();

/**
 * Helper functions for Data Model access
 * Вспомогательные функции для доступа к дата-модели
 */
if (!function_exists('elkaretro_get_data_model')) {
    /**
     * Получить всю дата-модель или её часть
     * 
     * @param string|null $path Путь к нужной части (например, 'post_types.toy_type.fields.size_field')
     * @return array|mixed|null Вся модель, часть модели или null если не найдено
     */
    function elkaretro_get_data_model($path = null) {
        if (!defined('ELKARETRO_DATA_MODEL')) {
            return null;
        }
        
        $model = ELKARETRO_DATA_MODEL;
        
        if ($path === null) {
            return $model;
        }
        
        $keys = explode('.', $path);
        $current = $model;
        
        foreach ($keys as $key) {
            if (!isset($current[$key])) {
                return null;
            }
            $current = $current[$key];
        }
        
        return $current;
    }
}

if (!function_exists('elkaretro_get_field_config')) {
    /**
     * Получить конфигурацию поля для указанного типа поста
     * 
     * @param string $post_type Тип поста (toy_type, toy_instance)
     * @param string $field_slug Slug поля
     * @return array|null Конфигурация поля или null
     */
    function elkaretro_get_field_config($post_type, $field_slug) {
        return elkaretro_get_data_model("post_types.{$post_type}.fields.{$field_slug}");
    }
}

if (!function_exists('elkaretro_get_taxonomy_config')) {
    /**
     * Получить конфигурацию таксономии
     * 
     * @param string $taxonomy_slug Slug таксономии
     * @return array|null Конфигурация таксономии или null
     */
    function elkaretro_get_taxonomy_config($taxonomy_slug) {
        return elkaretro_get_data_model("taxonomies.{$taxonomy_slug}");
    }
}

if (!function_exists('elkaretro_get_catalog_filter_taxonomies')) {
	/**
	 * Получить список таксономий, используемых в фильтрах каталога (toy_type, toy_instance, ny_accessory).
	 *
	 * @return array Список slug таксономий.
	 */
	function elkaretro_get_catalog_filter_taxonomies() {
		if (!defined('ELKARETRO_DATA_MODEL')) {
			return array();
		}

		$post_types  = array( 'toy_type', 'toy_instance', 'ny_accessory' );
		$taxonomies  = array();

		foreach ( $post_types as $post_type ) {
			$fields = elkaretro_get_data_model( "post_types.{$post_type}.fields" );

			if ( ! is_array( $fields ) ) {
				continue;
			}

			foreach ( $fields as $field ) {
				if (
					isset( $field['field_type'], $field['show_in_filters'], $field['related_taxonomy'] )
					&& 'taxonomy' === $field['field_type']
					&& ! empty( $field['show_in_filters'] )
					&& ! empty( $field['related_taxonomy'] )
				) {
					$taxonomies[] = $field['related_taxonomy'];
				}
			}
		}

		// Добавляем иерархическую таксономию категорий типов, если она доступна для фильтров.
		$category_taxonomy = elkaretro_get_taxonomy_config( 'category-of-toys' );
		if ( is_array( $category_taxonomy ) && ! empty( $category_taxonomy['show_in_filters'] ) ) {
			$taxonomies[] = 'category-of-toys';
		}

		// Добавляем иерархическую таксономию категорий аксессуаров, если она доступна для фильтров.
		$accessory_category_taxonomy = elkaretro_get_taxonomy_config( 'ny_category' );
		if ( is_array( $accessory_category_taxonomy ) && ! empty( $accessory_category_taxonomy['show_in_filters'] ) ) {
			$taxonomies[] = 'ny_category';
		}

		$taxonomies = array_values( array_unique( $taxonomies ) );
		sort( $taxonomies );

		return $taxonomies;
	}
}

if ( ! function_exists( 'elkaretro_get_catalog_settings' ) ) {
	/**
	 * Возвращает настройки каталога для фронтенда.
	 *
	 * @return array
	 */
	function elkaretro_get_catalog_settings() {
		$defaults = array(
			'per_page_options' => array( 30, 50, 100 ),
			'default_per_page' => 30,
			'default_sort'     => 'newest',
			'sort_options'     => array( 'newest', 'oldest' ),
		);

		/**
		 * Фильтр настроек каталога.
		 *
		 * @param array $defaults
		 */
		return apply_filters( 'elkaretro_catalog_settings', $defaults );
	}
}

if ( ! function_exists( 'elkaretro_get_accessory_catalog_settings' ) ) {
	/**
	 * Возвращает настройки каталога аксессуаров для фронтенда.
	 *
	 * @return array
	 */
	function elkaretro_get_accessory_catalog_settings() {
		require_once THEME_COR . 'catalog/catalog-query-manager.php';
		
		$sort_labels = \Elkaretro\Core\Catalog\Catalog_Query_Manager::get_sort_labels( 'accessory' );
		$default_sort = \Elkaretro\Core\Catalog\Catalog_Query_Manager::get_default_sort_key( 'accessory' );
		
		$defaults = array(
			'per_page_options' => array( 30, 50, 100 ),
			'default_per_page' => 30,
			'default_sort'     => $default_sort,
			'sort_options'     => $sort_labels,
		);

		/**
		 * Фильтр настроек каталога аксессуаров.
		 *
		 * @param array $defaults
		 */
		return apply_filters( 'elkaretro_accessory_catalog_settings', $defaults );
	}
}

if ( ! function_exists( 'elkaretro_get_catalog_page_id' ) ) {
	/**
	 * Возвращает ID страницы каталога, если она существует.
	 *
	 * @return int
	 */
	function elkaretro_get_catalog_page_id() {
		// Сначала ищем страницу, привязанную к шаблону page-catalog.php.
		$pages = get_pages(
			array(
				'post_type'   => 'page',
				'post_status' => array( 'publish', 'draft', 'pending' ),
				'meta_key'    => '_wp_page_template',
				'meta_value'  => 'page-catalog.php',
				'number'      => 1,
			)
		);

		if ( ! empty( $pages ) ) {
			return (int) $pages[0]->ID;
		}

		// Фолбэк: ищем страницу по slug 'catalog'.
		$page = get_page_by_path( 'catalog' );

		return $page ? (int) $page->ID : 0;
	}
}

if ( ! function_exists( 'elkaretro_get_catalog_page_url' ) ) {
	/**
	 * Возвращает ссылку на страницу каталога.
	 *
	 * @return string
	 */
	function elkaretro_get_catalog_page_url() {
		$page_id = elkaretro_get_catalog_page_id();

		if ( $page_id ) {
			return get_permalink( $page_id );
		}

		return home_url( '/catalog/' );
	}
}

if ( ! function_exists( 'elkaretro_get_accessory_catalog_page_id' ) ) {
	/**
	 * Возвращает ID страницы каталога аксессуаров, если она существует.
	 *
	 * @return int
	 */
	function elkaretro_get_accessory_catalog_page_id() {
		// Сначала ищем страницу, привязанную к шаблону page-accessory-catalog.php.
		$pages = get_pages(
			array(
				'post_type'   => 'page',
				'post_status' => array( 'publish', 'draft', 'pending' ),
				'meta_key'    => '_wp_page_template',
				'meta_value'  => 'page-accessory-catalog.php',
				'number'      => 1,
			)
		);

		if ( ! empty( $pages ) ) {
			return (int) $pages[0]->ID;
		}

		// Фолбэк: ищем страницу по slug 'accessories'.
		$page = get_page_by_path( 'accessories' );

		return $page ? (int) $page->ID : 0;
	}
}

if ( ! function_exists( 'elkaretro_get_accessory_catalog_page_url' ) ) {
	/**
	 * Возвращает ссылку на страницу каталога аксессуаров.
	 *
	 * @return string
	 */
	function elkaretro_get_accessory_catalog_page_url() {
		$page_id = elkaretro_get_accessory_catalog_page_id();

		if ( $page_id ) {
			return get_permalink( $page_id );
		}

		return home_url( '/accessories/' );
	}
}

if ( ! function_exists( 'elkaretro_get_cart_page_id' ) ) {
	/**
	 * Возвращает ID страницы корзины, если она существует.
	 *
	 * @return int
	 */
	function elkaretro_get_cart_page_id() {
		// Сначала ищем страницу, привязанную к шаблону page-cart.php.
		$pages = get_pages(
			array(
				'post_type'   => 'page',
				'post_status' => array( 'publish', 'draft', 'pending' ),
				'meta_key'    => '_wp_page_template',
				'meta_value'  => 'page-cart.php',
				'number'      => 1,
			)
		);

		if ( ! empty( $pages ) ) {
			return (int) $pages[0]->ID;
		}

		// Фолбэк: ищем страницу по slug 'cart'.
		$page = get_page_by_path( 'cart' );

		return $page ? (int) $page->ID : 0;
	}
}

if ( ! function_exists( 'elkaretro_get_cart_page_url' ) ) {
	/**
	 * Возвращает ссылку на страницу корзины.
	 *
	 * @return string
	 */
	function elkaretro_get_cart_page_url() {
		$page_id = elkaretro_get_cart_page_id();

		if ( $page_id ) {
			return get_permalink( $page_id );
		}

		return home_url( '/cart/' );
	}
}

require_once( THEME_COR . 'setup.php' );

// Theme Settings (управление настройками темы)
require_once( THEME_COR . 'theme-settings.php' );

// Taxonomy Sync (синхронизация таксономий с продакшена)
require_once( THEME_COR . 'taxonomy-sync.php' );

// Mock Data Installer (для локальной разработки)
require_once( THEME_COR . 'mock-data-installer.php' );

// Publishing Script (скрипт массовой публикации)
require_once( THEME_COR . 'publishing-script.php' );

// Instances Counter (автоматический подсчет доступных экземпляров)
require_once( THEME_COR . 'instances-counter.php' );

// Category Counter (автоматический подсчет типов игрушек в категориях)
require_once( THEME_COR . 'catalog/category-counter.php' );

// Instances Duplicates Merger (объединение дублей экземпляров)
require_once( THEME_COR . 'instances-duplicates-merger.php' );

// Inventory Calculator (подсчет стоимости товаров)
require_once( THEME_COR . 'inventory-calculator.php' );

/**
 * Include files if module is supported
 **/

require_once( THEME_MOD . 'kama_breadcrumbs.php' );
require_once( THEME_MOD . 'quick_tags.php' );
require_once( THEME_MOD . 'dereg.php' );
require_once( THEME_COR . 'filters/content.php' );
require_once( THEME_COR . 'default_controller.php');
require_once( THEME_COR . 'catalog/catalog-query-manager.php' );
require_once( THEME_COR . 'catalog/catalog-response-adapter.php' );
require_once( THEME_COR . 'catalog/catalog-toy-type-service.php' );
require_once( THEME_COR . 'catalog/catalog-toy-instance-service.php' );
require_once( THEME_COR . 'catalog/catalog-accessory-service.php' );
require_once( THEME_COR . 'catalog/catalog-rest-controller.php' );
require_once( THEME_COR . 'catalog/catalog-loader.php' );
require_once( THEME_COR . 'seo/seo-loader.php' );
require_once( THEME_COR . 'user-profile/user-profile-rest-controller.php' );
require_once( THEME_COR . 'user-profile/user-profile-loader.php' );
require_once( THEME_COR . 'cart/cart-rest-controller.php' );
require_once( THEME_COR . 'cart/cart-service.php' );
require_once( THEME_COR . 'cart/cart-loader.php' );
require_once( THEME_COR . 'orders/order-rest-controller.php' );
require_once( THEME_COR . 'orders/order-service.php' );
require_once( THEME_COR . 'orders/order-email-templates.php' );
require_once( THEME_COR . 'orders/order-loader.php' );
require_once( THEME_COR . 'email/email-post-type.php' );
require_once( THEME_COR . 'email/email-log-repository.php' );
require_once( THEME_COR . 'email/email-settings.php' );
require_once( THEME_COR . 'email/email-service.php' );
require_once( THEME_COR . 'email/email-rest-controller.php' );
require_once( THEME_COR . 'email/email-admin-page.php' );
require_once( THEME_COR . 'email/email-loader.php' );

@ini_set( 'upload_max_size' , '500M' );

/**
 * Get taxonomy terms for JavaScript
 * Получает все термины указанных таксономий для проброса в JavaScript
 * 
 * @param array $taxonomies Массив slug таксономий
 * @return array Ассоциативный массив [taxonomy_slug => [id => [name, slug, ...]]]
 */
if (!function_exists('elkaretro_get_taxonomy_terms_for_js')) {
    function elkaretro_get_taxonomy_terms_for_js($taxonomies = array()) {
        $terms_map = array();
        
        foreach ($taxonomies as $taxonomy_slug) {
            $terms = get_terms(array(
                'taxonomy' => $taxonomy_slug,
                'hide_empty' => false,
            ));
            
            if (is_wp_error($terms) || empty($terms)) {
                continue;
            }
            
            $terms_map[$taxonomy_slug] = array();
            foreach ($terms as $term) {
                $term_data = array(
                    'id' => $term->term_id,
                    'name' => $term->name,
                    'slug' => $term->slug,
                    'description' => $term->description,
                );
                
                // Для иерархических таксономий добавляем поле parent
                if (is_taxonomy_hierarchical($taxonomy_slug)) {
                    $term_data['parent'] = (int) $term->parent;
                }
                
                // Для категорий игрушек добавляем счетчик типов и индекс категории
                if ($taxonomy_slug === 'category-of-toys') {
                    $toy_types_count = get_term_meta($term->term_id, 'toy_types_count', true);
                    $term_data['toy_types_count'] = (int) ($toy_types_count ?: 0);
                    
                    // Получаем индекс категории (может быть в term meta как category_index, index, или term_order)
                    // Пробуем несколько вариантов названий поля
                    $category_index = get_term_meta($term->term_id, 'category_index', true);
                    if ($category_index === '' || $category_index === false) {
                        $category_index = get_term_meta($term->term_id, 'index', true);
                    }
                    if ($category_index === '' || $category_index === false) {
                        // Если нет в term meta, пробуем term_order из объекта термина (если доступно)
                        $category_index = isset($term->term_order) ? (int) $term->term_order : 0;
                    }
                    $term_data['category_index'] = (int) ($category_index ?: 0);
                }
                
                $terms_map[$taxonomy_slug][$term->term_id] = $term_data;
            }
        }
        
        return $terms_map;
    }
}

/**
 * Emit Data Model to JavaScript in window.data_model
 * Выводит дата-модель в window.data_model для доступа из JavaScript
 * Приоритет 1 - выполняется раньше других скриптов
 */
add_action('wp_head', function () {
    if (!defined('ELKARETRO_DATA_MODEL')) {
        return;
    }
    
    $data_model = ELKARETRO_DATA_MODEL;
    $json = wp_json_encode($data_model, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    
    if ($json === false) {
        error_log('ElkaRetro: Failed to encode data model to JSON');
        return;
    }
    
    // Получаем термины таксономий, используемых в фильтрах каталога (типы и экземпляры)
    $taxonomies_to_load = elkaretro_get_catalog_filter_taxonomies();
    
    $taxonomy_terms = elkaretro_get_taxonomy_terms_for_js($taxonomies_to_load);
    $terms_json = wp_json_encode($taxonomy_terms, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    
    // Выводим дата-модель в window.data_model
    // Используем IIFE для безопасности и немедленного выполнения
    echo '<script id="elkaretro-data-model">' . "\n";
    echo '  (function() {' . "\n";
    echo '    if (typeof window !== "undefined") {' . "\n";
    echo '      window.data_model = ' . $json . ';' . "\n";
    echo '      Object.freeze(window.data_model); // Делаем объект неизменяемым' . "\n";
    if ($terms_json !== false) {
        echo '      window.taxonomy_terms = ' . $terms_json . ';' . "\n";
        echo '      Object.freeze(window.taxonomy_terms); // Делаем объект неизменяемым' . "\n";
    }
    echo '    }' . "\n";
    echo '  })();' . "\n";
    echo '</script>' . "\n";
    
    // Добавляем CSS переменные для фоновых изображений каталогов
    $catalog_image_url = get_template_directory_uri() . '/assets/img/catalog.png';
    $accessories_image_url = get_template_directory_uri() . '/assets/img/accesory.png';
    
    echo '<style id="elkaretro-catalog-images">' . "\n";
    echo '  :root {' . "\n";
    echo '    --catalog-toys-bg-image: url("' . esc_url($catalog_image_url) . '");' . "\n";
    echo '    --catalog-accessories-bg-image: url("' . esc_url($accessories_image_url) . '");' . "\n";
    echo '  }' . "\n";
    echo '</style>' . "\n";
}, 1);

\Elkaretro\Core\Catalog\Catalog_Loader::init();

\Elkaretro\Core\Cart\Cart_Loader::init();

\Elkaretro\Core\Orders\Order_Loader::init();

\Elkaretro\Core\Email\Email_Loader::init();

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
    
    // Передаём настройки WordPress REST API в JavaScript
    echo '<script>';
    echo 'window.wpApiSettings = window.wpApiSettings || {};';
    echo 'window.wpApiSettings.root = ' . wp_json_encode(esc_url_raw(rest_url())) . ';';
    echo 'window.wpApiSettings.nonce = ' . wp_json_encode(wp_create_nonce('wp_rest')) . ';';
    
    // Передаём данные текущего пользователя (если авторизован)
    $current_user = wp_get_current_user();
    if ($current_user && $current_user->ID > 0) {
        // Получаем данные пользователя через REST API для консистентности
        $user_data = array(
            'id' => $current_user->ID,
            'name' => $current_user->display_name,
            'email' => $current_user->user_email,
            'username' => $current_user->user_login,
            'slug' => $current_user->user_nicename,
            'avatar_urls' => array(
                '24' => get_avatar_url($current_user->ID, array('size' => 24)),
                '48' => get_avatar_url($current_user->ID, array('size' => 48)),
                '96' => get_avatar_url($current_user->ID, array('size' => 96)),
            ),
        );
        
        // Добавляем мета-поля, если нужно
        $user_data['first_name'] = get_user_meta($current_user->ID, 'first_name', true);
        $user_data['last_name'] = get_user_meta($current_user->ID, 'last_name', true);
        $user_data['phone'] = get_user_meta($current_user->ID, 'phone', true);
        
        echo 'window.wpApiSettings.currentUser = ' . wp_json_encode($user_data) . ';';
    } else {
        echo 'window.wpApiSettings.currentUser = null;';
    }
    echo '</script>';
});

/**
 * Add required components based on page type
 */
add_filter('elkaretro_required_components', function($components) {
    if (!is_array($components)) {
        $components = array();
    }
    
    // Главная страница: нужны компоненты post-card, toy-type-card, ny-accessory-card и табы
    if (is_front_page() || is_home()) {
        $components[] = 'post-card';
        $components[] = 'toy-type-card';
        $components[] = 'ny-accessory-card';
        $components[] = 'homepage-tabs-content';
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
    
    if (is_single() && get_post_type() === 'ny_accessory') {
        $components[] = 'ny-accessory-single';
        $components[] = 'ny-accessory-card';
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

    if (is_page_template('page-catalog.php')) {
        $components[] = 'catalog-page';
        $components[] = 'toy-type-card';
        $components[] = 'toy-instance-card';
    }
    
    if (is_page_template('page-accessory-catalog.php')) {
        $components[] = 'accessory-catalog-page';
        $components[] = 'ny-accessory-card';
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

    $catalog_page_id = elkaretro_get_catalog_page_id();

    if ($catalog_page_id) {
        $current_template = get_page_template_slug($catalog_page_id);
        if ($current_template !== 'page-catalog.php') {
            update_post_meta($catalog_page_id, '_wp_page_template', 'page-catalog.php');
        }
    } else {
        $catalog_page = array(
            'post_title'   => 'Каталог ёлочных игрушек',
            'post_name'    => 'catalog',
            'post_content' => '',
            'post_status'  => 'publish',
            'post_type'    => 'page',
            'post_author'  => 1,
            'meta_input'   => array(
                '_wp_page_template' => 'page-catalog.php',
            ),
        );

        $catalog_page_id = wp_insert_post($catalog_page);

        if (!is_wp_error($catalog_page_id)) {
            update_post_meta($catalog_page_id, '_wp_page_template', 'page-catalog.php');
        }
    }

    // Создаём страницу каталога аксессуаров, если её нет
    $accessory_catalog_page_id = elkaretro_get_accessory_catalog_page_id();

    if ($accessory_catalog_page_id) {
        $current_template = get_page_template_slug($accessory_catalog_page_id);
        if ($current_template !== 'page-accessory-catalog.php') {
            update_post_meta($accessory_catalog_page_id, '_wp_page_template', 'page-accessory-catalog.php');
        }
    } else {
        $accessory_catalog_page = array(
            'post_title'   => 'Каталог новогодних аксессуаров',
            'post_name'    => 'accessories',
            'post_content' => '',
            'post_status'  => 'publish',
            'post_type'    => 'page',
            'post_author'  => 1,
            'meta_input'   => array(
                '_wp_page_template' => 'page-accessory-catalog.php',
            ),
        );

        $accessory_catalog_page_id = wp_insert_post($accessory_catalog_page);

        if (!is_wp_error($accessory_catalog_page_id)) {
            update_post_meta($accessory_catalog_page_id, '_wp_page_template', 'page-accessory-catalog.php');
        }
    }

    // Проверяем, существует ли уже страница с slug 'cart'
    if (!get_page_by_path('cart')) {
        $cart_page = array(
            'post_title'   => 'Корзина',
            'post_name'    => 'cart',
            'post_content' => '',
            'post_status'  => 'publish',
            'post_type'    => 'page',
            'post_author'  => 1,
            'meta_input'   => array(
                '_wp_page_template' => 'page-cart.php',
            ),
        );

        $cart_page_id = wp_insert_post($cart_page);

        if (!is_wp_error($cart_page_id)) {
            update_post_meta($cart_page_id, '_wp_page_template', 'page-cart.php');
        }
    }

    // Проверяем, существует ли уже страница с slug 'profile'
    if (!get_page_by_path('profile')) {
        $profile_page = array(
            'post_title'   => 'Профиль',
            'post_name'    => 'profile',
            'post_content' => '',
            'post_status'  => 'publish',
            'post_type'    => 'page',
            'post_author'  => 1,
            'meta_input'   => array(
                '_wp_page_template' => 'page-profile.php',
            ),
        );

        $profile_page_id = wp_insert_post($profile_page);

        if (!is_wp_error($profile_page_id)) {
            update_post_meta($profile_page_id, '_wp_page_template', 'page-profile.php');
        }
    } else {
        // Если страница уже существует, убеждаемся, что шаблон привязан
        $profile_page = get_page_by_path('profile');
        if ($profile_page) {
            $current_template = get_page_template_slug($profile_page->ID);
            if ($current_template !== 'page-profile.php') {
                update_post_meta($profile_page->ID, '_wp_page_template', 'page-profile.php');
            }
        }
    }
});

