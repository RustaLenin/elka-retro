<?php
/**
 * Order REST controller.
 *
 * Responsibilities:
 * - Expose REST endpoints for order operations (create, get, list, status updates).
 * - Validate incoming request params and user permissions.
 * - Delegate to order service for business logic.
 *
 * Security:
 * - Order creation: allows both authenticated and unauthenticated (with registration).
 * - Order retrieval: users can only access their own orders.
 * - Status updates: only administrators.
 * - Order editing: users can edit delivery address if order not shipped.
 */

namespace Elkaretro\Core\Orders;

use WP_REST_Controller;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
use WP_Error;

defined( 'ABSPATH' ) || exit;

class Order_REST_Controller extends WP_REST_Controller {

	/**
	 * @var string
	 */
	protected $namespace = 'elkaretro/v1';

	/**
	 * @var string
	 */
	protected $rest_base = 'orders';

	/**
	 * @var Order_Service
	 */
	protected $order_service;

	/**
	 * Order_REST_Controller constructor.
	 */
	public function __construct() {
		$this->order_service = new Order_Service();
	}

	/**
	 * Registers REST API routes.
	 *
	 * @return void
	 */
	public function register_routes() {
		// POST /wp-json/elkaretro/v1/orders - Create order
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base,
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'create_order' ),
					'permission_callback' => '__return_true', // Allow both authenticated and unauthenticated
					'args'                => $this->get_order_create_args(),
				),
			)
		);

		// GET /wp-json/elkaretro/v1/orders - Get user orders
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base,
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_orders' ),
					'permission_callback' => array( $this, 'check_user_permission' ),
				),
			)
		);

		// GET /wp-json/elkaretro/v1/orders/{orderId} - Get order
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/(?P<orderId>[\d]+)',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_order' ),
					'permission_callback' => array( $this, 'check_order_permission' ),
					'args'                => array(
						'orderId' => array(
							'required' => true,
							'type'     => 'integer',
						),
					),
				),
			)
		);

		// PUT /wp-json/elkaretro/v1/orders/{orderId} - Update order
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/(?P<orderId>[\d]+)',
			array(
				array(
					'methods'             => WP_REST_Server::EDITABLE,
					'callback'            => array( $this, 'update_order' ),
					'permission_callback' => array( $this, 'check_order_edit_permission' ),
					'args'                => $this->get_order_update_args(),
				),
			)
		);

		// PUT /wp-json/elkaretro/v1/orders/{orderId}/status - Update order status
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/(?P<orderId>[\d]+)/status',
			array(
				array(
					'methods'             => WP_REST_Server::EDITABLE,
					'callback'            => array( $this, 'update_order_status' ),
					'permission_callback' => array( $this, 'check_admin_permission' ),
					'args'                => array(
						'orderId' => array(
							'required' => true,
							'type'     => 'integer',
						),
						'status'  => array(
							'required'          => true,
							'type'              => 'string',
							'validate_callback' => array( $this, 'validate_status' ),
						),
					),
				),
			)
		);

		// POST /wp-json/elkaretro/v1/orders/{orderId}/cancel - Cancel order (user action)
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/(?P<orderId>[\d]+)/cancel',
			array(
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'cancel_order' ),
					'permission_callback' => array( $this, 'check_order_cancel_permission' ),
					'args'                => array(
						'orderId' => array(
							'required' => true,
							'type'     => 'integer',
						),
					),
				),
			)
		);
	}

	/**
	 * Check if user has permission to access their orders.
	 *
	 * @return bool|WP_Error
	 */
	public function check_user_permission() {
		if ( ! is_user_logged_in() ) {
			return new WP_Error(
				'rest_forbidden',
				__( 'You must be logged in to access orders.', 'elkaretro' ),
				array( 'status' => 401 )
			);
		}

		return true;
	}

	/**
	 * Check if user has permission to access specific order.
	 *
	 * @param WP_REST_Request $request
	 * @return bool|WP_Error
	 */
	public function check_order_permission( WP_REST_Request $request ) {
		if ( ! is_user_logged_in() ) {
			return new WP_Error(
				'rest_forbidden',
				__( 'You must be logged in to access orders.', 'elkaretro' ),
				array( 'status' => 401 )
			);
		}

		$order_id = (int) $request->get_param( 'orderId' );
		$user_id  = get_current_user_id();

		// Check if order belongs to user or user is admin
		$order = get_post( $order_id );
		if ( ! $order || $order->post_type !== 'elkaretro_order' ) {
			return new WP_Error(
				'rest_order_not_found',
				__( 'Order not found.', 'elkaretro' ),
				array( 'status' => 404 )
			);
		}

		$order_user_id = (int) get_post_meta( $order_id, 'user', true );
		if ( $order_user_id !== $user_id && ! current_user_can( 'manage_options' ) ) {
			return new WP_Error(
				'rest_forbidden',
				__( 'You do not have permission to access this order.', 'elkaretro' ),
				array( 'status' => 403 )
			);
		}

		return true;
	}

	/**
	 * Check if user has permission to edit order.
	 *
	 * @param WP_REST_Request $request
	 * @return bool|WP_Error
	 */
	public function check_order_edit_permission( WP_REST_Request $request ) {
		if ( ! is_user_logged_in() ) {
			return new WP_Error(
				'rest_forbidden',
				__( 'You must be logged in to edit orders.', 'elkaretro' ),
				array( 'status' => 401 )
			);
		}

		$order_id = (int) $request->get_param( 'orderId' );
		$user_id  = get_current_user_id();

		$order = get_post( $order_id );
		if ( ! $order || $order->post_type !== 'elkaretro_order' ) {
			return new WP_Error(
				'rest_order_not_found',
				__( 'Order not found.', 'elkaretro' ),
				array( 'status' => 404 )
			);
		}

		// Check if order belongs to user or user is admin
		$order_user_id = (int) get_post_meta( $order_id, 'user', true );
		if ( $order_user_id !== $user_id && ! current_user_can( 'manage_options' ) ) {
			return new WP_Error(
				'rest_forbidden',
				__( 'You do not have permission to edit this order.', 'elkaretro' ),
				array( 'status' => 403 )
			);
		}

		// Check if order is not shipped (users can only edit if not shipped)
		$status = $order->post_status;
		if ( $status === 'shipped' && ! current_user_can( 'manage_options' ) ) {
			return new WP_Error(
				'rest_order_shipped',
				__( 'Cannot edit order that has been shipped.', 'elkaretro' ),
				array( 'status' => 400 )
			);
		}

		return true;
	}

	/**
	 * Check if user is administrator.
	 *
	 * @return bool|WP_Error
	 */
	public function check_admin_permission() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return new WP_Error(
				'rest_forbidden',
				__( 'You must be an administrator to perform this action.', 'elkaretro' ),
				array( 'status' => 403 )
			);
		}

		return true;
	}

	/**
	 * Create order.
	 *
	 * @param WP_REST_Request $request
	 * @return WP_REST_Response|WP_Error
	 */
	public function create_order( WP_REST_Request $request ) {
		$order_data = $request->get_json_params();

		$result = $this->order_service->create_order( $order_data );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return rest_ensure_response(
			array(
				'success' => true,
				'order'   => $result,
			)
		);
	}

	/**
	 * Get user orders.
	 *
	 * @param WP_REST_Request $request
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_orders( WP_REST_Request $request ) {
		$user_id = get_current_user_id();
		$orders  = $this->order_service->get_user_orders( $user_id );

		if ( is_wp_error( $orders ) ) {
			return $orders;
		}

		return rest_ensure_response( $orders );
	}

	/**
	 * Get order.
	 *
	 * @param WP_REST_Request $request
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_order( WP_REST_Request $request ) {
		$order_id = (int) $request->get_param( 'orderId' );
		$order    = $this->order_service->get_order( $order_id );

		if ( is_wp_error( $order ) ) {
			return $order;
		}

		return rest_ensure_response( $order );
	}

	/**
	 * Update order.
	 *
	 * @param WP_REST_Request $request
	 * @return WP_REST_Response|WP_Error
	 */
	public function update_order( WP_REST_Request $request ) {
		$order_id   = (int) $request->get_param( 'orderId' );
		$order_data = $request->get_json_params();

		$result = $this->order_service->update_order( $order_id, $order_data );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return rest_ensure_response(
			array(
				'success' => true,
				'order'   => $result,
			)
		);
	}

	/**
	 * Update order status.
	 *
	 * @param WP_REST_Request $request
	 * @return WP_REST_Response|WP_Error
	 */
	public function update_order_status( WP_REST_Request $request ) {
		$order_id = (int) $request->get_param( 'orderId' );
		$status   = $request->get_param( 'status' );

		$result = $this->order_service->update_order_status( $order_id, $status );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return rest_ensure_response(
			array(
				'success' => true,
				'order'   => $result,
			)
		);
	}

	/**
	 * Get arguments for order creation endpoint.
	 *
	 * @return array
	 */
	protected function get_order_create_args() {
		return array(
			'cart'     => array(
				'required'          => true,
				'type'              => 'object',
				'validate_callback' => array( $this, 'validate_cart' ),
			),
			'user'     => array(
				'required' => false,
				'type'     => 'object',
			),
			'personal' => array(
				'required' => false,
				'type'     => 'object',
			),
			'delivery' => array(
				'required' => false,
				'type'     => 'object',
			),
			'payment'  => array(
				'required' => false,
				'type'     => 'object',
			),
			'totals'   => array(
				'required' => false,
				'type'     => 'object',
			),
		);
	}

	/**
	 * Get arguments for order update endpoint.
	 *
	 * @return array
	 */
	protected function get_order_update_args() {
		return array(
			'orderId' => array(
				'required' => true,
				'type'     => 'integer',
			),
			'delivery' => array(
				'required' => false,
				'type'     => 'object',
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

		if ( ! isset( $value['items'] ) || ! is_array( $value['items'] ) ) {
			return false;
		}

		if ( empty( $value['items'] ) ) {
			return new WP_Error(
				'rest_invalid_cart',
				__( 'Cart is empty.', 'elkaretro' ),
				array( 'status' => 400 )
			);
		}

		return true;
	}

	/**
	 * Check if user has permission to cancel order.
	 *
	 * @param WP_REST_Request $request
	 * @return bool|WP_Error
	 */
	public function check_order_cancel_permission( WP_REST_Request $request ) {
		if ( ! is_user_logged_in() ) {
			return new WP_Error(
				'rest_forbidden',
				__( 'You must be logged in to cancel orders.', 'elkaretro' ),
				array( 'status' => 401 )
			);
		}

		$order_id = (int) $request->get_param( 'orderId' );
		$user_id  = get_current_user_id();

		$order = get_post( $order_id );
		if ( ! $order || $order->post_type !== 'elkaretro_order' ) {
			return new WP_Error(
				'rest_order_not_found',
				__( 'Order not found.', 'elkaretro' ),
				array( 'status' => 404 )
			);
		}

		// Check if order belongs to user
		$order_user_id = (int) get_post_meta( $order_id, 'user', true );
		if ( $order_user_id !== $user_id && ! current_user_can( 'manage_options' ) ) {
			return new WP_Error(
				'rest_forbidden',
				__( 'You do not have permission to cancel this order.', 'elkaretro' ),
				array( 'status' => 403 )
			);
		}

		// Check if order can be cancelled (not shipped or closed)
		$status = $order->post_status;
		$cancellable_statuses = array( 'awaiting_payment', 'collecting', 'clarification' );
		if ( ! in_array( $status, $cancellable_statuses, true ) && ! current_user_can( 'manage_options' ) ) {
			return new WP_Error(
				'rest_order_cannot_cancel',
				__( 'This order cannot be cancelled.', 'elkaretro' ),
				array( 'status' => 400 )
			);
		}

		return true;
	}

	/**
	 * Cancel order.
	 *
	 * @param WP_REST_Request $request
	 * @return WP_REST_Response|WP_Error
	 */
	public function cancel_order( WP_REST_Request $request ) {
		$order_id = (int) $request->get_param( 'orderId' );
		$result   = $this->order_service->cancel_order( $order_id );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return rest_ensure_response(
			array(
				'success' => true,
				'order'   => $result,
			)
		);
	}

	/**
	 * Validate order status.
	 *
	 * @param mixed           $value
	 * @param WP_REST_Request $request
	 * @param string          $param
	 * @return bool
	 */
	public function validate_status( $value, WP_REST_Request $request, $param ) {
		$allowed_statuses = array( 'awaiting_payment', 'collecting', 'shipped', 'closed', 'clarification', 'cancelled' );
		return in_array( $value, $allowed_statuses, true );
	}
}

