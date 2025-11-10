<?php
/**
 * Catalog feature bootstrap.
 *
 * Responsibilities:
 * - Register REST routes for catalog data.
 * - Hook into enqueue routines to load catalog scripts/styles.
 * - Provide initialization entry point consumed from functions.php.
 *
 * TODO:
 * - Implement Catalog_Loader::init() invoked during theme setup.
 * - Wire enqueue hooks (wp_enqueue_scripts / enqueue_block_editor_assets if required).
 * - Register REST route namespace and endpoints via Catalog_REST_Controller.
 * - Provide helper for localizing script settings (API URLs, i18n strings).
 */

namespace Elkaretro\Core\Catalog;

defined( 'ABSPATH' ) || exit;

class Catalog_Loader {

	/**
	 * Bootstraps the catalog module.
	 *
	 * @return void
	 */
	public static function init() {
		add_action( 'rest_api_init', array( __CLASS__, 'register_rest_routes' ) );
	}

	/**
	 * Registers REST routes through controller.
	 *
	 * @return void
	 */
	public static function register_rest_routes() {
		$controller = new Catalog_REST_Controller();
		$controller->register_routes();
	}

	/**
	 * Enqueues frontend assets for the catalog page.
	 *
	 * @return void
	 */
	public static function enqueue_assets() {
		if ( ! is_page_template( 'page-catalog.php' ) ) {
			return;
		}

		$theme_uri  = get_template_directory_uri();
		$theme_path = get_template_directory();

		$styles = array(
			'elkaretro-catalog-page'    => '/components/catalog/catalog-page-styles.css',
			'elkaretro-catalog-results' => '/components/catalog/results/results-styles.css',
		);

		foreach ( $styles as $handle => $relative_path ) {
			$absolute_path = $theme_path . $relative_path;
			wp_enqueue_style(
				$handle,
				$theme_uri . $relative_path,
				array(),
				file_exists( $absolute_path ) ? filemtime( $absolute_path ) : null
			);
		}
	}
}

