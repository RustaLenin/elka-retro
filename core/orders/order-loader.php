<?php
/**
 * Orders feature bootstrap.
 *
 * Responsibilities:
 * - Register REST routes for order operations.
 * - Provide initialization entry point consumed from functions.php.
 */

namespace Elkaretro\Core\Orders;

defined( 'ABSPATH' ) || exit;

class Order_Loader {

	/**
	 * Bootstraps the orders module.
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
		$controller = new Order_REST_Controller();
		$controller->register_routes();
	}
}

