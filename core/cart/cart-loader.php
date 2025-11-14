<?php
/**
 * Cart feature bootstrap.
 *
 * Responsibilities:
 * - Register REST routes for cart operations.
 * - Provide initialization entry point consumed from functions.php.
 */

namespace Elkaretro\Core\Cart;

defined( 'ABSPATH' ) || exit;

class Cart_Loader {

	/**
	 * Bootstraps the cart module.
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
		$controller = new Cart_REST_Controller();
		$controller->register_routes();
	}
}

