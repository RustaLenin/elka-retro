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
	 * Получить список таксономий, используемых в фильтрах каталога (toy_type и toy_instance).
	 *
	 * @return array Список slug таксономий.
	 */
	function elkaretro_get_catalog_filter_taxonomies() {
		if (!defined('ELKARETRO_DATA_MODEL')) {
			return array();
		}

		$post_types  = array( 'toy_type', 'toy_instance' );
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

// Instances Duplicates Merger (объединение дублей экземпляров)
require_once( THEME_COR . 'instances-duplicates-merger.php' );

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
require_once( THEME_COR . 'catalog/catalog-rest-controller.php' );
require_once( THEME_COR . 'catalog/catalog-loader.php' );

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
                $terms_map[$taxonomy_slug][$term->term_id] = array(
                    'id' => $term->term_id,
                    'name' => $term->name,
                    'slug' => $term->slug,
                    'description' => $term->description,
                );
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
}, 1);

\Elkaretro\Core\Catalog\Catalog_Loader::init();

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
        $components[] = 'ny-accessory-card';
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
});

