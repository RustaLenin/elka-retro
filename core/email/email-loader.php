<?php
/**
 * Email Module Bootstrap.
 *
 * Responsibilities:
 * - Initialize email module.
 * - Register Custom Post Type.
 * - Register REST routes.
 * - Register admin page.
 */

namespace Elkaretro\Core\Email;

defined( 'ABSPATH' ) || exit;

class Email_Loader {

	/**
	 * Initialize email module.
	 *
	 * @return void
	 */
	public static function init() {
		// Register Custom Post Type for logs.
		Email_Post_Type::init();

		// Register REST routes.
		add_action( 'rest_api_init', array( __CLASS__, 'register_rest_routes' ) );

		// Register admin page.
		Email_Admin_Page::init();
	}

	/**
	 * Register REST routes.
	 *
	 * @return void
	 */
	public static function register_rest_routes() {
		$controller = new Email_REST_Controller();
		$controller->register_routes();
	}
}

