<?php
/**
 * Cart REST controller.
 *
 * Responsibilities:
 * - Expose REST endpoints for cart operations (get, sync).
 * - Validate incoming request params and user permissions.
 * - Delegate to cart service for business logic.
 *
 * Security:
 * - Cart endpoints require authentication (only for authorized users in MVP).
 * - Users can only access their own cart.
 */

namespace Elkaretro\Core\Cart;

use WP_REST_Controller;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
use WP_Error;

defined( 'ABSPATH' ) || exit;

class Cart_REST_Controller extends WP_REST_Controller {

	/**
	 * @var string
	 */
	protected $namespace = 'elkaretro/v1';

	/**
	 * @var string
	 */
	protected $rest_base = 'cart';

	/**
	 * @var Cart_Service
	 */
	protected $cart_service;

	/**
	 * Cart_REST_Controller constructor.
	 */
	public function __construct() {
		$this->cart_service = new Cart_Service();
	}

	/**
	 * Registers REST API routes.
	 *
	 * @return void
	 */
	public function register_routes() {
		// GET /wp-json/elkaretro/v1/cart - Get user cart
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base,
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_cart' ),
					'permission_callback' => array( $this, 'check_permission' ),
				),
			)
		);

		// PUT /wp-json/elkaretro/v1/cart/sync - Sync cart with server
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/sync',
			array(
				array(
					'methods'             => WP_REST_Server::EDITABLE,
					'callback'            => array( $this, 'sync_cart' ),
					'permission_callback' => array( $this, 'check_permission' ),
					'args'                => $this->get_cart_sync_args(),
				),
			)
		);
	}

	/**
	 * Check if user has permission to access cart endpoints.
	 *
	 * @return bool|WP_Error
	 */
	public function check_permission() {
		if ( ! is_user_logged_in() ) {
			return new WP_Error(
				'rest_forbidden',
				__( 'You must be logged in to access cart.', 'elkaretro' ),
				array( 'status' => 401 )
			);
		}

		return true;
	}

	/**
	 * Get user cart.
	 *
	 * @param WP_REST_Request $request
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_cart( WP_REST_Request $request ) {
		$user_id = get_current_user_id();
		$cart    = $this->cart_service->get_user_cart( $user_id );

		return rest_ensure_response(
			array(
				'cart' => $cart,
			)
		);
	}

	/**
	 * Sync cart with server.
	 *
	 * @param WP_REST_Request $request
	 * @return WP_REST_Response|WP_Error
	 */
	public function sync_cart( WP_REST_Request $request ) {
		$user_id = get_current_user_id();
		$cart    = $request->get_param( 'cart' );

		if ( ! is_array( $cart ) ) {
			return new WP_Error(
				'rest_invalid_param',
				__( 'Cart data must be an array.', 'elkaretro' ),
				array( 'status' => 400 )
			);
		}

		$result = $this->cart_service->sync_user_cart( $user_id, $cart );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return rest_ensure_response(
			array(
				'success' => true,
				'cart'    => $result,
			)
		);
	}

	/**
	 * Get arguments for cart sync endpoint.
	 *
	 * @return array
	 */
	protected function get_cart_sync_args() {
		return array(
			'cart' => array(
				'required'          => true,
				'type'              => 'object',
				'validate_callback' => array( $this, 'validate_cart' ),
				'sanitize_callback' => array( $this, 'sanitize_cart' ),
			),
		);
	}

	/**
	 * Validate cart data.
	 *
	 * @param mixed           $value
	 * @param WP_REST_Request $request
	 * @param string          $param
	 * @return bool|WP_Error
	 */
	public function validate_cart( $value, WP_REST_Request $request, $param ) {
		if ( ! is_array( $value ) ) {
			return false;
		}

		// Validate cart structure
		if ( ! isset( $value['items'] ) || ! is_array( $value['items'] ) ) {
			return false;
		}

		// Validate items
		foreach ( $value['items'] as $item ) {
			if ( ! isset( $item['id'] ) || ! isset( $item['type'] ) || ! isset( $item['price'] ) ) {
				return false;
			}

			if ( ! in_array( $item['type'], array( 'toy_instance', 'ny_accessory' ), true ) ) {
				return false;
			}

			if ( ! is_numeric( $item['id'] ) || ! is_numeric( $item['price'] ) ) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Sanitize cart data.
	 *
	 * @param mixed           $value
	 * @param WP_REST_Request $request
	 * @param string          $param
	 * @return array
	 */
	public function sanitize_cart( $value, WP_REST_Request $request, $param ) {
		if ( ! is_array( $value ) ) {
			return array();
		}

		$sanitized = array(
			'items'       => array(),
			'lastUpdated' => isset( $value['lastUpdated'] ) ? sanitize_text_field( $value['lastUpdated'] ) : current_time( 'mysql' ),
		);

		if ( isset( $value['items'] ) && is_array( $value['items'] ) ) {
			foreach ( $value['items'] as $item ) {
				if ( ! is_array( $item ) ) {
					continue;
				}

				$sanitized['items'][] = array(
					'id'      => absint( $item['id'] ?? 0 ),
					'type'    => sanitize_text_field( $item['type'] ?? '' ),
					'price'   => floatval( $item['price'] ?? 0 ),
					'addedAt' => sanitize_text_field( $item['addedAt'] ?? current_time( 'mysql' ) ),
				);
			}
		}

		return $sanitized;
	}
}

