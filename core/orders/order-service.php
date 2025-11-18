<?php
/**
 * Order Service.
 *
 * Responsibilities:
 * - Business logic for order operations.
 * - Creation of orders via PODS.
 * - User registration before order creation (for unauthenticated users).
 * - Email notifications.
 */

namespace Elkaretro\Core\Orders;

use WP_Error;
use WP_User;

defined( 'ABSPATH' ) || exit;

class Order_Service {

	/**
	 * Post type for orders.
	 */
	const POST_TYPE = 'elkaretro_order';

	/**
	 * Create order.
	 *
	 * @param array $order_data Order data from request.
	 * @return array|WP_Error Order data or error.
	 */
	public function create_order( $order_data ) {
		// Check if user is authenticated
		$user_id = get_current_user_id();

		// If not authenticated, register user first
		if ( ! $user_id && isset( $order_data['personal'] ) ) {
			$user_result = $this->register_user_for_order( $order_data['personal'] );
			if ( is_wp_error( $user_result ) ) {
				return $user_result;
			}
			$user_id = $user_result;
		} elseif ( ! $user_id ) {
			return new WP_Error(
				'order_requires_auth',
				__( 'Order requires authentication or personal data for registration.', 'elkaretro' ),
				array( 'status' => 400 )
			);
		} elseif ( isset( $order_data['personal'] ) ) {
			// Authenticated user provided personal data — ensure profile meta is filled
			$this->update_missing_user_profile_fields( $user_id, $order_data['personal'] );
		}

		// Validate cart
		if ( ! isset( $order_data['cart'] ) || ! isset( $order_data['cart']['items'] ) || empty( $order_data['cart']['items'] ) ) {
			return new WP_Error(
				'order_empty_cart',
				__( 'Cart is empty.', 'elkaretro' ),
				array( 'status' => 400 )
			);
		}

		// Generate order number
		$order_number = $this->generate_order_number();

		// Prepare order data for PODS
		$pods_data = $this->prepare_order_for_pods( $order_data, $user_id, $order_number );

		// Create order post
		$order_id = wp_insert_post(
			array(
				'post_type'   => self::POST_TYPE,
				'post_status' => 'awaiting_payment',
				'post_title'  => sprintf( __( 'Order #%s', 'elkaretro' ), $order_number ),
				'post_author' => $user_id,
			)
		);

		if ( is_wp_error( $order_id ) || ! $order_id ) {
			return new WP_Error(
				'order_creation_failed',
				__( 'Failed to create order.', 'elkaretro' ),
				array( 'status' => 500 )
			);
		}

		// Save order data to PODS fields
		$this->save_order_fields( $order_id, $pods_data );

		// Get full order data
		$order = $this->get_order( $order_id );

		// Send email notifications
		$this->send_order_created_emails( $order_id, $order );

		return $order;
	}

	/**
	 * Register user for order (for unauthenticated users).
	 *
	 * @param array $personal_data Personal data from order.
	 * @return int|WP_Error User ID or error.
	 */
	protected function register_user_for_order( $personal_data ) {
		if ( ! isset( $personal_data['email'] ) || ! isset( $personal_data['username'] ) || ! isset( $personal_data['password'] ) ) {
			return new WP_Error(
				'order_invalid_personal_data',
				__( 'Personal data is incomplete.', 'elkaretro' ),
				array( 'status' => 400 )
			);
		}

		$email    = sanitize_email( $personal_data['email'] );
		$username = sanitize_user( $personal_data['username'] );
		$password = $personal_data['password'];
		$phone    = isset( $personal_data['phone'] ) ? sanitize_text_field( $personal_data['phone'] ) : '';

		// Check if user already exists
		if ( email_exists( $email ) ) {
			return new WP_Error(
				'order_email_exists',
				__( 'Email already registered. Please log in.', 'elkaretro' ),
				array( 'status' => 400 )
			);
		}

		if ( username_exists( $username ) ) {
			return new WP_Error(
				'order_username_exists',
				__( 'Username already exists.', 'elkaretro' ),
				array( 'status' => 400 )
			);
		}

		// Create user
		$user_id = wp_create_user( $username, $password, $email );

		if ( is_wp_error( $user_id ) ) {
			return $user_id;
		}

		// Update user meta
		if ( $phone ) {
			update_user_meta( $user_id, 'phone_number', $phone );
		}

		if ( isset( $personal_data['first_name'] ) ) {
			update_user_meta( $user_id, 'first_name', sanitize_text_field( $personal_data['first_name'] ) );
		}

		if ( isset( $personal_data['last_name'] ) ) {
			update_user_meta( $user_id, 'last_name', sanitize_text_field( $personal_data['last_name'] ) );
		}

		// Auto-login user
		wp_set_current_user( $user_id );
		wp_set_auth_cookie( $user_id );

		return $user_id;
	}

	/**
	 * Ensure authenticated user's profile has mandatory fields filled from order form.
	 *
	 * @param int   $user_id       User ID.
	 * @param array $personal_data Personal data submitted with order.
	 *
	 * @return void
	 */
	protected function update_missing_user_profile_fields( $user_id, $personal_data ) {
		if ( ! $user_id || ! is_array( $personal_data ) ) {
			return;
		}

		$mapping = array(
			'first_name' => array(
				'meta_key' => 'first_name',
				'sanitize' => 'sanitize_text_field',
			),
			'last_name'  => array(
				'meta_key' => 'last_name',
				'sanitize' => 'sanitize_text_field',
			),
			'phone'      => array(
				'meta_key' => 'phone_number',
				'sanitize' => 'sanitize_text_field',
			),
		);

		foreach ( $mapping as $payload_key => $config ) {
			if ( empty( $personal_data[ $payload_key ] ) ) {
				continue;
			}

			$value = call_user_func( $config['sanitize'], $personal_data[ $payload_key ] );
			if ( '' === trim( $value ) ) {
				continue;
			}

			$current = get_user_meta( $user_id, $config['meta_key'], true );
			if ( empty( $current ) ) {
				update_user_meta( $user_id, $config['meta_key'], $value );
			}
		}
	}

	/**
	 * Generate unique order number.
	 *
	 * @return string
	 */
	protected function generate_order_number() {
		$date_prefix = date( 'Ymd' );
		$counter     = 1;

		// Find last order number for today
		$today_orders = get_posts(
			array(
				'post_type'      => self::POST_TYPE,
				'posts_per_page' => 1,
				'orderby'        => 'date',
				'order'          => 'DESC',
				'meta_query'     => array(
					array(
						'key'     => 'order_number',
						'value'   => 'ORD-' . $date_prefix . '-',
						'compare' => 'LIKE',
					),
				),
			)
		);

		if ( ! empty( $today_orders ) ) {
			$last_order_number = get_post_meta( $today_orders[0]->ID, 'order_number', true );
			if ( $last_order_number ) {
				$parts = explode( '-', $last_order_number );
				if ( count( $parts ) === 3 && $parts[0] === 'ORD' && $parts[1] === $date_prefix ) {
					$counter = (int) $parts[2] + 1;
				}
			}
		}

		return sprintf( 'ORD-%s-%04d', $date_prefix, $counter );
	}

	/**
	 * Prepare order data for PODS.
	 *
	 * @param array $order_data Order data from request.
	 * @param int   $user_id User ID.
	 * @param string $order_number Order number.
	 * @return array PODS data.
	 */
	protected function prepare_order_for_pods( $order_data, $user_id, $order_number ) {
		$cart_items = $order_data['cart']['items'] ?? array();

		// Separate items by type
		$toy_instance_items = array();
		$ny_accessory_items = array();

		foreach ( $cart_items as $item ) {
			$item_id = absint( $item['id'] ?? 0 );
			$type    = sanitize_text_field( $item['type'] ?? '' );

			if ( ! $item_id ) {
				continue;
			}

			if ( $type === 'toy_instance' ) {
				$toy_instance_items[] = $item_id;
			} elseif ( $type === 'ny_accessory' ) {
				$ny_accessory_items[] = $item_id;
			}
		}

		$totals   = $order_data['totals'] ?? array();
		$delivery = $order_data['delivery'] ?? array();
		$payment  = $order_data['payment'] ?? array();

		// Format delivery address (separate fields for PODS)
		$delivery_address_fields = array();
		$delivery_address        = '';

		if ( isset( $delivery['address'] ) && is_array( $delivery['address'] ) ) {
			$addr = $delivery['address'];
			$delivery_address_fields = array(
				'country'     => sanitize_text_field( $addr['country'] ?? '' ),
				'region'      => sanitize_text_field( $addr['region'] ?? '' ),
				'city'        => sanitize_text_field( $addr['city'] ?? '' ),
				'street'      => sanitize_text_field( $addr['street'] ?? '' ),
				'postal_code' => sanitize_text_field( $addr['postal_code'] ?? '' ),
			);

			// Also create full address string for display
			$parts = array_filter( $delivery_address_fields );
			$delivery_address = implode( ', ', $parts );
		}

		return array(
			'order_number'             => $order_number,
			'user'                     => $user_id,
			'toy_instance_items'       => $toy_instance_items,
			'ny_accessory_items'       => $ny_accessory_items,
			'total_amount'             => floatval( $totals['total'] ?? 0 ),
			'subtotal'                 => floatval( $totals['subtotal'] ?? 0 ),
			'discount_amount'          => floatval( $totals['discount'] ?? 0 ),
			'fee_amount'               => floatval( $totals['fee'] ?? 0 ),
			'delivery_method'          => sanitize_text_field( $delivery['delivery_method'] ?? '' ),
			'delivery_address'         => $delivery_address,
			'delivery_address_fields'  => $delivery_address_fields,
			'payment_method'           => sanitize_text_field( $payment['payment_method'] ?? '' ),
			'payment_details'          => isset( $payment['payment_details'] ) ? sanitize_textarea_field( $payment['payment_details'] ) : '',
			'created_at'               => current_time( 'mysql' ),
		);
	}

	/**
	 * Save order fields to PODS.
	 *
	 * @param int   $order_id Order post ID.
	 * @param array $fields Fields data.
	 * @return void
	 */
	protected function save_order_fields( $order_id, $fields ) {
		// Save basic fields
		update_post_meta( $order_id, 'order_number', $fields['order_number'] );
		update_post_meta( $order_id, 'user', $fields['user'] );
		update_post_meta( $order_id, 'total_amount', $fields['total_amount'] );
		update_post_meta( $order_id, 'subtotal', $fields['subtotal'] );
		update_post_meta( $order_id, 'discount_amount', $fields['discount_amount'] );
		update_post_meta( $order_id, 'fee_amount', $fields['fee_amount'] );
		update_post_meta( $order_id, 'delivery_method', $fields['delivery_method'] );
		update_post_meta( $order_id, 'delivery_address', $fields['delivery_address'] );
		update_post_meta( $order_id, 'payment_method', $fields['payment_method'] );
		update_post_meta( $order_id, 'payment_details', $fields['payment_details'] );
		update_post_meta( $order_id, 'created_at', $fields['created_at'] );

		// Save delivery address sub-fields
		if ( isset( $fields['delivery_address_fields'] ) && is_array( $fields['delivery_address_fields'] ) ) {
			$addr = $fields['delivery_address_fields'];
			update_post_meta( $order_id, 'delivery_country', $addr['country'] ?? '' );
			update_post_meta( $order_id, 'delivery_region', $addr['region'] ?? '' );
			update_post_meta( $order_id, 'delivery_city', $addr['city'] ?? '' );
			update_post_meta( $order_id, 'delivery_street', $addr['street'] ?? '' );
			update_post_meta( $order_id, 'delivery_postal_code', $addr['postal_code'] ?? '' );
		}

		// Save relationship fields (PODS will handle these)
		if ( ! empty( $fields['toy_instance_items'] ) ) {
			update_post_meta( $order_id, 'toy_instance_items', $fields['toy_instance_items'] );
		}
		if ( ! empty( $fields['ny_accessory_items'] ) ) {
			update_post_meta( $order_id, 'ny_accessory_items', $fields['ny_accessory_items'] );
		}
	}

	/**
	 * Get order data.
	 *
	 * @param int $order_id Order ID.
	 * @return array|WP_Error Order data or error.
	 */
	public function get_order( $order_id ) {
		$order = get_post( $order_id );

		if ( ! $order || $order->post_type !== self::POST_TYPE ) {
			return new WP_Error(
				'order_not_found',
				__( 'Order not found.', 'elkaretro' ),
				array( 'status' => 404 )
			);
		}

		// Get PODS fields
		$toy_instance_items = get_post_meta( $order_id, 'toy_instance_items', true ) ?: array();
		$ny_accessory_items = get_post_meta( $order_id, 'ny_accessory_items', true ) ?: array();

		// Combine items
		$items = array();
		foreach ( $toy_instance_items as $item_id ) {
			$items[] = array(
				'id'   => absint( $item_id ),
				'type' => 'toy_instance',
			);
		}
		foreach ( $ny_accessory_items as $item_id ) {
			$items[] = array(
				'id'   => absint( $item_id ),
				'type' => 'ny_accessory',
			);
		}

		return array(
			'id'              => $order_id,
			'order_number'    => get_post_meta( $order_id, 'order_number', true ),
			'user_id'         => (int) get_post_meta( $order_id, 'user', true ),
			'items'           => $items,
			'total_amount'    => floatval( get_post_meta( $order_id, 'total_amount', true ) ),
			'subtotal'        => floatval( get_post_meta( $order_id, 'subtotal', true ) ),
			'discount_amount' => floatval( get_post_meta( $order_id, 'discount_amount', true ) ),
			'fee_amount'      => floatval( get_post_meta( $order_id, 'fee_amount', true ) ),
			'delivery_method' => get_post_meta( $order_id, 'delivery_method', true ),
			'delivery_address' => get_post_meta( $order_id, 'delivery_address', true ),
			'payment_method'  => get_post_meta( $order_id, 'payment_method', true ),
			'payment_details' => get_post_meta( $order_id, 'payment_details', true ),
			'status'          => $order->post_status,
			'created_at'      => get_post_meta( $order_id, 'created_at', true ) ?: $order->post_date,
			'notes'           => get_post_meta( $order_id, 'notes', true ),
		);
	}

	/**
	 * Get user orders.
	 *
	 * @param int $user_id User ID.
	 * @return array|WP_Error Orders list or error.
	 */
	public function get_user_orders( $user_id ) {
		$orders = get_posts(
			array(
				'post_type'      => self::POST_TYPE,
				'posts_per_page' => -1,
				'orderby'        => 'date',
				'order'          => 'DESC',
				'meta_query'     => array(
					array(
						'key'   => 'user',
						'value' => $user_id,
					),
				),
			)
		);

		$result = array();
		foreach ( $orders as $order ) {
			$order_data = $this->get_order( $order->ID );
			if ( ! is_wp_error( $order_data ) ) {
				$result[] = $order_data;
			}
		}

		return $result;
	}

	/**
	 * Update order.
	 *
	 * @param int   $order_id Order ID.
	 * @param array $order_data Order data to update.
	 * @return array|WP_Error Updated order or error.
	 */
	public function update_order( $order_id, $order_data ) {
		$order = get_post( $order_id );
		if ( ! $order || $order->post_type !== self::POST_TYPE ) {
			return new WP_Error(
				'order_not_found',
				__( 'Order not found.', 'elkaretro' ),
				array( 'status' => 404 )
			);
		}

		// Update delivery address if provided
		if ( isset( $order_data['delivery'] ) && isset( $order_data['delivery']['address'] ) ) {
			$addr = $order_data['delivery']['address'];
			$parts = array();
			if ( ! empty( $addr['country'] ) ) {
				$parts[] = $addr['country'];
			}
			if ( ! empty( $addr['region'] ) ) {
				$parts[] = $addr['region'];
			}
			if ( ! empty( $addr['city'] ) ) {
				$parts[] = $addr['city'];
			}
			if ( ! empty( $addr['street'] ) ) {
				$parts[] = $addr['street'];
			}
			if ( ! empty( $addr['postal_code'] ) ) {
				$parts[] = $addr['postal_code'];
			}
			$delivery_address = implode( ', ', $parts );
			update_post_meta( $order_id, 'delivery_address', $delivery_address );
		}

		return $this->get_order( $order_id );
	}

	/**
	 * Update order status.
	 *
	 * @param int    $order_id Order ID.
	 * @param string $status New status.
	 * @return array|WP_Error Updated order or error.
	 */
	public function update_order_status( $order_id, $status ) {
		$order = get_post( $order_id );
		if ( ! $order || $order->post_type !== self::POST_TYPE ) {
			return new WP_Error(
				'order_not_found',
				__( 'Order not found.', 'elkaretro' ),
				array( 'status' => 404 )
			);
		}

		$allowed_statuses = array( 'awaiting_payment', 'collecting', 'shipped', 'closed', 'clarification' );
		if ( ! in_array( $status, $allowed_statuses, true ) ) {
			return new WP_Error(
				'invalid_status',
				__( 'Invalid order status.', 'elkaretro' ),
				array( 'status' => 400 )
			);
		}

		$old_status = $order->post_status;
		wp_update_post(
			array(
				'ID'          => $order_id,
				'post_status' => $status,
			)
		);

		// Send email if order is closed
		if ( $status === 'closed' && $old_status !== 'closed' ) {
			$order_data = $this->get_order( $order_id );
			$this->send_order_closed_email( $order_id, $order_data );
		}

		return $this->get_order( $order_id );
	}

	/**
	 * Send order created emails (to admin and customer).
	 *
	 * @param int   $order_id Order ID.
	 * @param array $order_data Order data.
	 * @return void
	 */
	protected function send_order_created_emails( $order_id, $order_data ) {
		require_once __DIR__ . '/order-email-templates.php';

		$email_templates = new Order_Email_Templates();

		// Send to customer
		$user_id = $order_data['user_id'];
		$user    = get_user_by( 'ID', $user_id );
		if ( $user ) {
			$email_templates->send_order_created_to_customer( $order_id, $order_data, $user->user_email );
		}

		// Send to admin
		$admin_email = get_option( 'admin_email' );
		if ( $admin_email ) {
			$email_templates->send_order_created_to_admin( $order_id, $order_data, $admin_email );
		}
	}

	/**
	 * Send order closed email (to customer for feedback).
	 *
	 * @param int   $order_id Order ID.
	 * @param array $order_data Order data.
	 * @return void
	 */
	protected function send_order_closed_email( $order_id, $order_data ) {
		require_once __DIR__ . '/order-email-templates.php';

		$email_templates = new Order_Email_Templates();

		$user_id = $order_data['user_id'];
		$user    = get_user_by( 'ID', $user_id );
		if ( $user ) {
			$email_templates->send_order_closed_to_customer( $order_id, $order_data, $user->user_email );
		}
	}
}

