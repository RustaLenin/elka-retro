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
		add_action( 'init', array( __CLASS__, 'register_order_statuses' ) );
		add_action( 'rest_api_init', array( __CLASS__, 'register_rest_routes' ) );
	}

	/**
	 * Register custom post statuses for orders.
	 *
	 * @return void
	 */
	public static function register_order_statuses() {
		// Register 'completed' status for successfully completed orders
		register_post_status(
			'completed',
			array(
				'label'                     => _x( 'Завершён', 'Order status', 'elkaretro' ),
				'public'                    => false,
				'exclude_from_search'       => false,
				'show_in_admin_all_list'    => true,
				'show_in_admin_status_list' => true,
				'label_count'               => _n_noop( 'Завершён <span class="count">(%s)</span>', 'Завершён <span class="count">(%s)</span>', 'elkaretro' ),
			)
		);

		// Register 'rejected' status for rejected/cancelled orders
		register_post_status(
			'rejected',
			array(
				'label'                     => _x( 'Отклонён', 'Order status', 'elkaretro' ),
				'public'                    => false,
				'exclude_from_search'       => false,
				'show_in_admin_all_list'    => true,
				'show_in_admin_status_list' => true,
				'label_count'               => _n_noop( 'Отклонён <span class="count">(%s)</span>', 'Отклонён <span class="count">(%s)</span>', 'elkaretro' ),
			)
		);
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

