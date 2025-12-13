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

use Elkaretro\Core\Cart\Cart_Service;
use WP_Error;
use WP_User;

defined( 'ABSPATH' ) || exit;

class Order_Service {

	/**
	 * Post type for orders.
	 */
	const POST_TYPE = 'elkaretro_order';

	/**
	 * Create order for authenticated user.
	 *
	 * @param array $order_data Order data from request.
	 * @return array|WP_Error Order data or error.
	 */
	public function create_order( $order_data ) {
		// Check if user is authenticated
		$user_id = get_current_user_id();

		if ( ! $user_id ) {
			return new WP_Error(
				'order_requires_auth',
				__( 'Order requires authentication. Please log in first.', 'elkaretro' ),
				array( 'status' => 401 )
			);
		}

		// Validate cart
		if ( ! isset( $order_data['cart'] ) || ! isset( $order_data['cart']['items'] ) || empty( $order_data['cart']['items'] ) ) {
			return new WP_Error(
				'order_empty_cart',
				__( 'Cart is empty.', 'elkaretro' ),
				array( 'status' => 400 )
			);
		}

		// Validate items availability (status and stock) and book them
		$validation_result = $this->validate_and_book_items( $order_data['cart']['items'] );
		if ( is_wp_error( $validation_result ) ) {
			// If validation failed, rollback is already handled inside validate_and_book_items
			return $validation_result;
		}

		// Store booked items for potential rollback
		$booked_items = $validation_result['booked_items'] ?? array();

		// Validate and recalculate prices from database
		$price_validation = $this->validate_and_recalculate_prices( $order_data['cart']['items'], $order_data['totals'] ?? array() );
		$price_changed    = $price_validation['price_changed'] ?? false;
		$actual_totals    = $price_validation['actual_totals'] ?? $order_data['totals'] ?? array();

		// Generate order number
		$order_number = $this->generate_order_number();

		// Prepare order data for PODS (use actual prices from database)
		$pods_data = $this->prepare_order_for_pods( $order_data, $user_id, $order_number, $actual_totals );

		// Create order post with new status scheme
		$order_id = wp_insert_post(
			array(
				'post_type'   => self::POST_TYPE,
				'post_status' => 'publish', // Актуальный заказ, требует работы
				'post_title'  => sprintf( __( 'Order #%s', 'elkaretro' ), $order_number ),
				'post_author' => $user_id,
			)
		);

		if ( is_wp_error( $order_id ) || ! $order_id ) {
			// Rollback booked items if order creation failed
			$this->rollback_booked_items( $booked_items );
			return new WP_Error(
				'order_creation_failed',
				__( 'Failed to create order.', 'elkaretro' ),
				array( 'status' => 500 )
			);
		}

		// Set initial order_status to 'pending_confirmation'
		$this->set_order_status( $order_id, 'pending_confirmation', 'system' );

		// Save order data to PODS fields
		$this->save_order_fields( $order_id, $pods_data );
		
		// Save order_status and order_status_history to PODS
		$this->save_order_status_to_pods( $order_id );

		// Save comment and preferred_communication for authenticated users
		$pods = pods( self::POST_TYPE, $order_id );
		if ( isset( $order_data['comment'] ) ) {
			update_post_meta( $order_id, 'notes', sanitize_textarea_field( $order_data['comment'] ) );
			if ( $pods && $pods->valid() ) {
				$pods->save( 'notes', sanitize_textarea_field( $order_data['comment'] ) );
			}
		}
		if ( isset( $order_data['preferred_communication'] ) ) {
			update_post_meta( $order_id, 'preferred_communication', sanitize_textarea_field( $order_data['preferred_communication'] ) );
			if ( $pods && $pods->valid() ) {
				$pods->save( 'preferred_communication', sanitize_textarea_field( $order_data['preferred_communication'] ) );
			}
		}

		// Get full order data
		$order = $this->get_order( $order_id );

		// Clear user cart on backend after successful order creation
		$this->clear_user_cart( $user_id );

		// Send email notifications
		$this->send_order_created_emails( $order_id, $order );

		// Add price change information to order data if prices changed
		if ( $price_changed ) {
			$order['price_changed']       = true;
			$order['price_change_notice'] = __( 'За время оформления заказа цена изменилась. Актуальную стоимость всех товаров и общую сумму заказа вы увидите в письме.', 'elkaretro' );
		}

		return $order;
	}

	/**
	 * Create anonymous order (without user account).
	 *
	 * @param array $order_data Order data from request.
	 * @return array|WP_Error Order data or error.
	 */
	public function create_anonymous_order( $order_data ) {
		// Validate email
		if ( ! isset( $order_data['email'] ) || empty( $order_data['email'] ) ) {
			return new WP_Error(
				'anonymous_order_missing_email',
				__( 'Email is required for anonymous orders.', 'elkaretro' ),
				array( 'status' => 400 )
			);
		}

		$email = sanitize_email( $order_data['email'] );
		if ( ! is_email( $email ) ) {
			return new WP_Error(
				'anonymous_order_invalid_email',
				__( 'Invalid email format.', 'elkaretro' ),
				array( 'status' => 400 )
			);
		}

		// Validate cart
		if ( ! isset( $order_data['cart'] ) || ! isset( $order_data['cart']['items'] ) || empty( $order_data['cart']['items'] ) ) {
			return new WP_Error(
				'order_empty_cart',
				__( 'Cart is empty.', 'elkaretro' ),
				array( 'status' => 400 )
			);
		}

		// Validate items availability (status and stock) and book them
		$validation_result = $this->validate_and_book_items( $order_data['cart']['items'] );
		if ( is_wp_error( $validation_result ) ) {
			return $validation_result;
		}

		// Store booked items for potential rollback
		$booked_items = $validation_result['booked_items'] ?? array();

		// Validate and recalculate prices from database
		$price_validation = $this->validate_and_recalculate_prices( $order_data['cart']['items'], $order_data['totals'] ?? array() );
		$price_changed    = $price_validation['price_changed'] ?? false;
		$actual_totals    = $price_validation['actual_totals'] ?? $order_data['totals'] ?? array();

		// Generate order number
		$order_number = $this->generate_order_number();

		// Prepare order data for PODS (use actual prices from database)
		// For anonymous orders, user_id is 0
		$pods_data = $this->prepare_order_for_pods( $order_data, 0, $order_number, $actual_totals );

		// Create order post with new status scheme
		$order_id = wp_insert_post(
			array(
				'post_type'   => self::POST_TYPE,
				'post_status' => 'publish', // Актуальный заказ, требует работы
				'post_title'  => sprintf( __( 'Order #%s', 'elkaretro' ), $order_number ),
				'post_author' => 0, // No user for anonymous orders
			)
		);

		if ( is_wp_error( $order_id ) || ! $order_id ) {
			// Rollback booked items if order creation failed
			$this->rollback_booked_items( $booked_items );
			return new WP_Error(
				'order_creation_failed',
				__( 'Failed to create order.', 'elkaretro' ),
				array( 'status' => 500 )
			);
		}

		// Set initial order_status to 'pending_confirmation'
		$this->set_order_status( $order_id, 'pending_confirmation', 'system' );

		// Save order data to PODS fields
		$this->save_order_fields( $order_id, $pods_data );
		
		// Save order_status and order_status_history to PODS
		$this->save_order_status_to_pods( $order_id );

		// Save anonymous order data
		update_post_meta( $order_id, 'anonymous_email', $email );
		update_post_meta( $order_id, 'is_anonymous', true ); // Technical field, not saved to PODS
		if ( $pods && $pods->valid() ) {
			$pods->save( 'anonymous_email', $email );
			// Note: is_anonymous is not saved to PODS (technical field)
		}
		if ( isset( $order_data['preferred_communication'] ) ) {
			update_post_meta( $order_id, 'preferred_communication', sanitize_textarea_field( $order_data['preferred_communication'] ) );
			if ( $pods && $pods->valid() ) {
				$pods->save( 'preferred_communication', sanitize_textarea_field( $order_data['preferred_communication'] ) );
			}
		}
		if ( isset( $order_data['promo_code'] ) && ! empty( trim( $order_data['promo_code'] ) ) ) {
			update_post_meta( $order_id, 'promo_code', sanitize_text_field( $order_data['promo_code'] ) );
		}

		// Get full order data
		$order = $this->get_order( $order_id );

		// NOTE: Do NOT clear cart for anonymous orders (user is not authenticated)

		// Send email notifications
		$this->send_order_created_emails( $order_id, $order );

		// Add price change information to order data if prices changed
		if ( $price_changed ) {
			$order['price_changed']       = true;
			$order['price_change_notice'] = __( 'За время оформления заказа цена изменилась. Актуальную стоимость всех товаров и общую сумму заказа вы увидите в письме.', 'elkaretro' );
		}

		return $order;
	}

	/**
	 * Register user for order (for unauthenticated users).
	 * 
	 * @deprecated This method is deprecated. Use new authentication system instead.
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

		// Validate consent fields
		if ( ! isset( $personal_data['privacy_consent'] ) || ! $personal_data['privacy_consent'] ) {
			return new WP_Error(
				'order_missing_privacy_consent',
				__( 'Consent for personal data processing is required.', 'elkaretro' ),
				array( 'status' => 400 )
			);
		}

		if ( ! isset( $personal_data['offer_consent'] ) || ! $personal_data['offer_consent'] ) {
			return new WP_Error(
				'order_missing_offer_consent',
				__( 'Consent with public offer terms is required.', 'elkaretro' ),
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

		// Set flag to indicate this user was registered via order
		// This helps the email hook distinguish from admin-created users
		update_user_meta( $user_id, '_registered_via_order', '1' );

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

		// Save consent fields to user meta
		update_user_meta( $user_id, 'privacy_consent', $personal_data['privacy_consent'] ? '1' : '0' );
		update_user_meta( $user_id, 'privacy_consent_at', current_time( 'mysql' ) );
		update_user_meta( $user_id, 'offer_consent', $personal_data['offer_consent'] ? '1' : '0' );
		update_user_meta( $user_id, 'offer_consent_at', current_time( 'mysql' ) );

		// Save newsletter subscriptions to user meta
		update_user_meta( $user_id, 'newsletter_new_items', isset( $personal_data['newsletter_new_items'] ) && $personal_data['newsletter_new_items'] ? '1' : '0' );
		update_user_meta( $user_id, 'newsletter_sales', isset( $personal_data['newsletter_sales'] ) && $personal_data['newsletter_sales'] ? '1' : '0' );
		update_user_meta( $user_id, 'newsletter_auction', isset( $personal_data['newsletter_auction'] ) && $personal_data['newsletter_auction'] ? '1' : '0' );
		if ( isset( $personal_data['newsletter_new_items'] ) || isset( $personal_data['newsletter_sales'] ) || isset( $personal_data['newsletter_auction'] ) ) {
			update_user_meta( $user_id, 'newsletter_subscriptions_updated_at', current_time( 'mysql' ) );
		}

		// Auto-login user
		wp_set_current_user( $user_id );
		wp_set_auth_cookie( $user_id );

		// Registration welcome email will be sent via user_register hook
		// See: core/user-profile/user-profile-loader.php

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

		// Update newsletter subscriptions (always update, not just if empty)
		if ( isset( $personal_data['newsletter_new_items'] ) ) {
			update_user_meta( $user_id, 'newsletter_new_items', $personal_data['newsletter_new_items'] ? '1' : '0' );
		}
		if ( isset( $personal_data['newsletter_sales'] ) ) {
			update_user_meta( $user_id, 'newsletter_sales', $personal_data['newsletter_sales'] ? '1' : '0' );
		}
		if ( isset( $personal_data['newsletter_auction'] ) ) {
			update_user_meta( $user_id, 'newsletter_auction', $personal_data['newsletter_auction'] ? '1' : '0' );
		}
		if ( isset( $personal_data['newsletter_new_items'] ) || isset( $personal_data['newsletter_sales'] ) || isset( $personal_data['newsletter_auction'] ) ) {
			update_user_meta( $user_id, 'newsletter_subscriptions_updated_at', current_time( 'mysql' ) );
		}
	}

	/**
	 * Generate unique order number.
	 * Uses wp_option for daily counter to avoid race conditions and improve performance.
	 * Includes retry logic to handle potential race conditions.
	 *
	 * @return string
	 */
	protected function generate_order_number() {
		$date_prefix = date( 'Ymd' );
		$option_name = 'elkaretro_order_counter';
		$max_retries = 10;
		$retry_count  = 0;
		
		do {
			// Get current counter state
			$counter_data = get_option( $option_name, array(
				'date'    => '',
				'counter' => 0,
			) );
			
			// Reset counter if date changed
			if ( $counter_data['date'] !== $date_prefix ) {
				$counter_data = array(
					'date'    => $date_prefix,
					'counter' => 0,
				);
			}
			
			// Increment counter atomically
			$counter_data['counter']++;
			
			// Save updated counter
			$updated = update_option( $option_name, $counter_data, false );
			
			// Generate order number with zero-padded counter
			$order_number = sprintf( 'ORD-%s-%04d', $date_prefix, $counter_data['counter'] );
			
			// Check if order number already exists (race condition protection)
			$existing_order = get_posts(
				array(
					'post_type'      => self::POST_TYPE,
					'posts_per_page' => 1,
					'meta_query'     => array(
						array(
							'key'   => 'order_number',
							'value' => $order_number,
						),
					),
					'fields'         => 'ids',
				)
			);
			
			// If order number is unique, return it
			if ( empty( $existing_order ) ) {
				return $order_number;
			}
			
			// If order number exists, retry (increment counter and try again)
			$retry_count++;
			
			// Small delay to reduce contention
			if ( $retry_count < $max_retries ) {
				usleep( 10000 ); // 10ms delay
			}
			
		} while ( $retry_count < $max_retries );
		
		// Fallback: if all retries failed, use timestamp-based suffix
		error_log( sprintf( '[OrderService] Failed to generate unique order number after %d retries, using timestamp fallback', $max_retries ) );
		return sprintf( 'ORD-%s-%04d-%s', $date_prefix, $counter_data['counter'], substr( time(), -4 ) );
	}

	/**
	 * Prepare order data for PODS.
	 *
	 * @param array $order_data Order data from request.
	 * @param int   $user_id User ID.
	 * @param string $order_number Order number.
	 * @param array $actual_totals Actual totals calculated from database prices.
	 * @return array PODS data.
	 */
	protected function prepare_order_for_pods( $order_data, $user_id, $order_number, $actual_totals = null ) {
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

		// Use actual totals if provided, otherwise use from request
		$totals = $actual_totals ?? $order_data['totals'] ?? array();
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

		// Format delivery_data as ordered text string (not JSON)
		// All fields are concatenated in the correct order for admin readability
		$delivery_data_string = $this->format_delivery_data_string( $delivery );

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
			'delivery_data'            => $delivery_data_string, // Full delivery data as ordered text string
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
		// Use PODS API for relationship fields
		$pods = pods( self::POST_TYPE, $order_id );
		
		if ( ! $pods || ! $pods->valid() ) {
			// Fallback to post meta if PODS is not available
			error_log( '[OrderService] PODS not available for order ' . $order_id );
		}

		// Save basic fields
		update_post_meta( $order_id, 'order_number', $fields['order_number'] );
		if ( $pods && $pods->valid() ) {
			$pods->save( 'order_number', $fields['order_number'] );
		}
		
		// Save user relationship field via PODS
		if ( $pods && $pods->valid() ) {
			$pods->save( 'user', $fields['user'] );
		}
		// Also save as post meta for backward compatibility
		update_post_meta( $order_id, 'user', $fields['user'] );
		
		update_post_meta( $order_id, 'total_amount', $fields['total_amount'] );
		update_post_meta( $order_id, 'subtotal', $fields['subtotal'] );
		update_post_meta( $order_id, 'discount_amount', $fields['discount_amount'] );
		update_post_meta( $order_id, 'fee_amount', $fields['fee_amount'] );
		update_post_meta( $order_id, 'delivery_method', $fields['delivery_method'] );
		update_post_meta( $order_id, 'delivery_address', $fields['delivery_address'] );
		
		// Save delivery_data as ordered text string (contains all form fields: name, phone, address, etc.)
		if ( ! empty( $fields['delivery_data'] ) ) {
			update_post_meta( $order_id, 'delivery_data', $fields['delivery_data'] );
			if ( $pods && $pods->valid() ) {
				$pods->save( 'delivery_data', $fields['delivery_data'] );
			}
		}
		
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

		// Save relationship fields via PODS API
		if ( ! empty( $fields['toy_instance_items'] ) ) {
			// Save via PODS API for relationship field
			if ( $pods && $pods->valid() ) {
				$pods->save( 'toy_instance_items', $fields['toy_instance_items'] );
			}
			// Also save as post meta for backward compatibility
			update_post_meta( $order_id, 'toy_instance_items', $fields['toy_instance_items'] );
			
			// Update toy instance statuses to 'reserved'
			$this->reserve_toy_instances( $fields['toy_instance_items'], $order_id );
		}
		if ( ! empty( $fields['ny_accessory_items'] ) ) {
			// Save via PODS API for relationship field
			if ( $pods && $pods->valid() ) {
				$pods->save( 'ny_accessory_items', $fields['ny_accessory_items'] );
			}
			// Also save as post meta for backward compatibility
			update_post_meta( $order_id, 'ny_accessory_items', $fields['ny_accessory_items'] );
			
			// Decrease NY accessory stock and update status if needed
			$this->decrease_ny_accessory_stock( $fields['ny_accessory_items'], $order_id );
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

		// Combine items with prices
		$items = array();
		foreach ( $toy_instance_items as $item_id ) {
			$price = $this->get_item_price_from_db( $item_id, 'toy_instance' );
			$items[] = array(
				'id'    => absint( $item_id ),
				'type'  => 'toy_instance',
				'price' => $price,
			);
		}
		foreach ( $ny_accessory_items as $item_id ) {
			$price = $this->get_item_price_from_db( $item_id, 'ny_accessory' );
			$items[] = array(
				'id'    => absint( $item_id ),
				'type'  => 'ny_accessory',
				'price' => $price,
			);
		}

		// Check if anonymous order
		$is_anonymous = get_post_meta( $order_id, 'is_anonymous', true );

		return array(
			'id'                    => $order_id,
			'order_number'          => get_post_meta( $order_id, 'order_number', true ),
			'user_id'               => (int) get_post_meta( $order_id, 'user', true ),
			'items'                 => $items,
			'total_amount'          => floatval( get_post_meta( $order_id, 'total_amount', true ) ),
			'subtotal'              => floatval( get_post_meta( $order_id, 'subtotal', true ) ),
			'discount_amount'       => floatval( get_post_meta( $order_id, 'discount_amount', true ) ),
			'fee_amount'            => floatval( get_post_meta( $order_id, 'fee_amount', true ) ),
			'delivery_method'       => get_post_meta( $order_id, 'delivery_method', true ),
			'delivery_address'      => get_post_meta( $order_id, 'delivery_address', true ),
			'payment_method'        => get_post_meta( $order_id, 'payment_method', true ),
			'payment_details'       => get_post_meta( $order_id, 'payment_details', true ),
			'post_status'           => $order->post_status, // Системный статус WordPress (publish, completed, rejected)
			'order_status'          => $this->get_order_status( $order_id ), // Детальный статус заказа (pending_confirmation, awaiting_payment, etc.)
			'status'                => $this->get_order_status( $order_id ), // Для обратной совместимости
			'created_at'            => get_post_meta( $order_id, 'created_at', true ) ?: $order->post_date,
			'notes'                 => get_post_meta( $order_id, 'notes', true ),
			'preferred_communication' => get_post_meta( $order_id, 'preferred_communication', true ),
			'is_anonymous'          => (bool) $is_anonymous,
			'anonymous_email'       => $is_anonymous ? get_post_meta( $order_id, 'anonymous_email', true ) : null,
		);
	}

	/**
	 * Get user orders.
	 *
	 * @param int    $user_id User ID.
	 * @param string $user_email User email (optional, for PODS search).
	 * @param string $user_login User login (optional, for PODS search).
	 * @return array|WP_Error Orders list or error.
	 */
	public function get_user_orders( $user_id, $user_email = '', $user_login = '' ) {
		if ( ! $user_id || $user_id <= 0 ) {
			error_log( '[OrderService] get_user_orders: Invalid user_id: ' . $user_id );
			return array();
		}

		// Ensure user_id is an integer for comparison
		$user_id = (int) $user_id;
		
		// Get user email/login if not provided
		if ( empty( $user_email ) || empty( $user_login ) ) {
			$user = get_userdata( $user_id );
			if ( $user ) {
				if ( empty( $user_email ) ) {
					$user_email = $user->user_email;
				}
				if ( empty( $user_login ) ) {
					$user_login = $user->user_login;
				}
			}
		}
		
		error_log( '[OrderService] get_user_orders: Looking for orders for user_id=' . $user_id . ', email=' . $user_email . ', login=' . $user_login );

		// PODS saves user as email/login, so we need to search by email/login first
		$orders = array();
		
		// All order statuses we need to search
		$order_statuses = array( 'awaiting_payment', 'collecting', 'shipped', 'closed', 'clarification', 'cancelled' );
		
		// Strategy 1: Search by user email/login (PODS stores email/login)
		if ( ! empty( $user_email ) ) {
			$orders = get_posts(
				array(
					'post_type'      => self::POST_TYPE,
					'post_status'    => $order_statuses, // Search all order statuses, not just 'publish'
					'posts_per_page' => -1,
					'orderby'        => 'date',
					'order'          => 'DESC',
					'meta_query'     => array(
						'relation' => 'OR',
						array(
							'key'     => 'user',
							'value'   => $user_email,
							'compare' => '=',
						),
						array(
							'key'     => 'user',
							'value'   => $user_login,
							'compare' => '=',
						),
					),
				)
			);
			error_log( '[OrderService] Found ' . count( $orders ) . ' orders by email/login search (statuses: ' . implode( ', ', $order_statuses ) . ')' );
		}
		
		// Strategy 2: If no orders found, try by user_id (for backward compatibility)
		if ( empty( $orders ) ) {
			$orders = get_posts(
				array(
					'post_type'      => self::POST_TYPE,
					'post_status'    => $order_statuses, // Search all order statuses
					'posts_per_page' => -1,
					'orderby'        => 'date',
					'order'          => 'DESC',
					'meta_query'     => array(
						'relation' => 'OR',
						array(
							'key'     => 'user',
							'value'   => (string) $user_id,
							'compare' => '=',
						),
						array(
							'key'     => 'user',
							'value'   => $user_id,
							'compare' => '=',
							'type'    => 'NUMERIC',
						),
					),
				)
			);
			error_log( '[OrderService] Found ' . count( $orders ) . ' orders by user_id search (statuses: ' . implode( ', ', $order_statuses ) . ')' );
		}

		// Strategy 3: Fallback to post_author (if order was created with post_author)
		if ( empty( $orders ) ) {
			$orders = get_posts(
				array(
					'post_type'      => self::POST_TYPE,
					'post_status'    => $order_statuses, // Search all order statuses
					'posts_per_page' => -1,
					'orderby'        => 'date',
					'order'          => 'DESC',
					'author'         => $user_id,
				)
			);
			error_log( '[OrderService] Found ' . count( $orders ) . ' orders by post_author (statuses: ' . implode( ', ', $order_statuses ) . ')' );
		}

		error_log( '[OrderService] get_user_orders: Found ' . count( $orders ) . ' orders before filtering' );

		$result = array();
		foreach ( $orders as $order ) {
			// Get order user value from meta (may be email/login or ID)
			$order_user_meta = get_post_meta( $order->ID, 'user', true );
			$order_author_id = (int) $order->post_author;
			
			error_log( sprintf(
				'[OrderService] Order #%d: meta user="%s" (type: %s), author=%d, looking for user_id=%d, email=%s, login=%s',
				$order->ID,
				$order_user_meta,
				gettype( $order_user_meta ),
				$order_author_id,
				$user_id,
				$user_email,
				$user_login
			) );
			
			// Check if order belongs to this user
			// PODS stores email/login, so we compare by email/login or ID or author
			$belongs_to_user = false;
			
			// Check by email/login (PODS stores this way)
			if ( ! empty( $user_email ) && $order_user_meta === $user_email ) {
				$belongs_to_user = true;
			} elseif ( ! empty( $user_login ) && $order_user_meta === $user_login ) {
				$belongs_to_user = true;
			}
			// Check by user_id (backward compatibility)
			elseif ( is_numeric( $order_user_meta ) && (int) $order_user_meta === $user_id ) {
				$belongs_to_user = true;
			}
			// Check by post_author
			elseif ( $order_author_id === $user_id ) {
				$belongs_to_user = true;
			}
			
			if ( $belongs_to_user ) {
				$order_data = $this->get_order( $order->ID );
				if ( ! is_wp_error( $order_data ) ) {
					$result[] = $order_data;
				} else {
					error_log( '[OrderService] Failed to get order data for order #' . $order->ID . ': ' . $order_data->get_error_message() );
				}
			} else {
				error_log( '[OrderService] Order #' . $order->ID . ' does not belong to user, skipping' );
			}
		}

		error_log( '[OrderService] get_user_orders: Returning ' . count( $result ) . ' orders' );
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

		$allowed_statuses = array( 'awaiting_payment', 'collecting', 'shipped', 'closed', 'clarification', 'cancelled' );
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

		// If order is closed, mark items as sold
		if ( $status === 'closed' && $old_status !== 'closed' ) {
			$this->mark_order_items_as_sold( $order_id );
			
			$order_data = $this->get_order( $order_id );
			$this->send_order_closed_email( $order_id, $order_data );
		}

		// If order is cancelled, return items to available
		if ( $status === 'cancelled' && $old_status !== 'cancelled' ) {
			$this->return_order_items_to_available( $order_id );
		}

		return $this->get_order( $order_id );
	}

	/**
	 * Cancel order (user action).
	 *
	 * @param int $order_id Order ID.
	 * @return array|WP_Error Updated order or error.
	 */
	public function cancel_order( $order_id ) {
		$order = get_post( $order_id );
		if ( ! $order || $order->post_type !== self::POST_TYPE ) {
			return new WP_Error(
				'order_not_found',
				__( 'Order not found.', 'elkaretro' ),
				array( 'status' => 404 )
			);
		}

		// Check if order can be cancelled
		$status = $order->post_status;
		$cancellable_statuses = array( 'awaiting_payment', 'collecting', 'clarification' );
		if ( ! in_array( $status, $cancellable_statuses, true ) ) {
			return new WP_Error(
				'order_cannot_cancel',
				__( 'This order cannot be cancelled.', 'elkaretro' ),
				array( 'status' => 400 )
			);
		}

		// Update status to cancelled
		return $this->update_order_status( $order_id, 'cancelled' );
	}

	/**
	 * Return order items to available status (when order is cancelled).
	 *
	 * @param int $order_id Order ID.
	 * @return void
	 */
	protected function return_order_items_to_available( $order_id ) {
		// Get toy instances
		$toy_instance_items = get_post_meta( $order_id, 'toy_instance_items', true ) ?: array();
		if ( ! empty( $toy_instance_items ) && is_array( $toy_instance_items ) ) {
			foreach ( $toy_instance_items as $instance_id ) {
				$instance_id = absint( $instance_id );
				if ( ! $instance_id ) {
					continue;
				}

				$instance = get_post( $instance_id );
				if ( ! $instance || $instance->post_type !== 'toy_instance' ) {
					continue;
				}

				// Return to publish status if currently reserved or booked
				if ( $instance->post_status === 'reserved' || $instance->post_status === 'booked' ) {
					wp_update_post(
						array(
							'ID'          => $instance_id,
							'post_status' => 'publish',
						)
					);
				}
			}
		}

		// Get NY accessories
		$ny_accessory_items = get_post_meta( $order_id, 'ny_accessory_items', true ) ?: array();
		if ( ! empty( $ny_accessory_items ) && is_array( $ny_accessory_items ) ) {
			foreach ( $ny_accessory_items as $accessory_id ) {
				$accessory_id = absint( $accessory_id );
				if ( ! $accessory_id ) {
					continue;
				}

				$accessory = get_post( $accessory_id );
				if ( ! $accessory || $accessory->post_type !== 'ny_accessory' ) {
					continue;
				}

				// Increase stock back
				$current_stock = (int) get_post_meta( $accessory_id, 'stock', true );
				update_post_meta( $accessory_id, 'stock', $current_stock + 1 );

				// Return to publish status if currently reserved
				if ( $accessory->post_status === 'reserved' ) {
					wp_update_post(
						array(
							'ID'          => $accessory_id,
							'post_status' => 'publish',
						)
					);
				}
			}
		}
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
		$customer_email = null;
		$customer_sent = false;
		
		// For authenticated users, get email from user account
		if ( $user_id > 0 ) {
			$user = get_user_by( 'ID', $user_id );
			if ( $user ) {
				$customer_email = $user->user_email;
			}
		} else {
			// For anonymous orders, get email from order meta
			$is_anonymous = get_post_meta( $order_id, 'is_anonymous', true );
			if ( $is_anonymous ) {
				$customer_email = get_post_meta( $order_id, 'anonymous_email', true );
			}
		}
		
		if ( $customer_email && is_email( $customer_email ) ) {
			$customer_sent = $email_templates->send_order_created_to_customer( $order_id, $order_data, $customer_email );
			
			// Save email status to order meta
			update_post_meta( $order_id, '_email_customer_sent', $customer_sent ? '1' : '0' );
			if ( $customer_sent ) {
				update_post_meta( $order_id, '_email_customer_sent_at', current_time( 'mysql' ) );
			}
		}

		// Send to admin
		$admin_email = get_option( 'admin_email' );
		$admin_sent  = false;
		$fallback_used = false;
		
		if ( $admin_email ) {
			$admin_sent = $email_templates->send_order_created_to_admin( $order_id, $order_data, $admin_email );
		}
		
		// Fallback: if admin email failed, send to fallback address
		if ( ! $admin_sent || is_wp_error( $admin_sent ) ) {
			$fallback_email = 'lenin-kerrigan@yandex.ru';
			$fallback_sent = $email_templates->send_order_created_to_admin( $order_id, $order_data, $fallback_email );
			$fallback_used = true;
			// Use fallback result if primary failed
			if ( $fallback_sent ) {
				$admin_sent = true;
			}
		}
		
		// Save admin email status to order meta
		update_post_meta( $order_id, '_email_admin_sent', $admin_sent ? '1' : '0' );
		if ( $admin_sent ) {
			update_post_meta( $order_id, '_email_admin_sent_at', current_time( 'mysql' ) );
		}
		update_post_meta( $order_id, '_email_admin_fallback_used', $fallback_used ? '1' : '0' );
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
		$customer_email = null;
		$closed_sent = false;
		
		// For authenticated users, get email from user account
		if ( $user_id > 0 ) {
			$user = get_user_by( 'ID', $user_id );
			if ( $user ) {
				$customer_email = $user->user_email;
			}
		} else {
			// For anonymous orders, get email from order meta
			$is_anonymous = get_post_meta( $order_id, 'is_anonymous', true );
			if ( $is_anonymous ) {
				$customer_email = get_post_meta( $order_id, 'anonymous_email', true );
			}
		}
		
		if ( $customer_email && is_email( $customer_email ) ) {
			$closed_sent = $email_templates->send_order_closed_to_customer( $order_id, $order_data, $customer_email );
			
			// Save email status to order meta
			update_post_meta( $order_id, '_email_closed_sent', $closed_sent ? '1' : '0' );
			if ( $closed_sent ) {
				update_post_meta( $order_id, '_email_closed_sent_at', current_time( 'mysql' ) );
			}
		}
	}

	/**
	 * Validate items availability and book them (change status to 'booked').
	 * This prevents race conditions by immediately reserving items during validation.
	 *
	 * @param array $items Array of cart items with 'id' and 'type'.
	 * @return array|WP_Error Array with 'booked_items' on success, WP_Error if validation fails.
	 */
	protected function validate_and_book_items( $items ) {
		if ( ! is_array( $items ) || empty( $items ) ) {
			return new WP_Error(
				'order_invalid_items',
				__( 'Invalid items data.', 'elkaretro' ),
				array( 'status' => 400 )
			);
		}

		$booked_items = array();

		foreach ( $items as $item ) {
			$item_id = absint( $item['id'] ?? 0 );
			$type    = sanitize_text_field( $item['type'] ?? '' );

			if ( ! $item_id || ! $type ) {
				continue;
			}

			if ( $type === 'toy_instance' ) {
				$instance = get_post( $item_id );
				if ( ! $instance || $instance->post_type !== 'toy_instance' ) {
					// Rollback already booked items
					$this->rollback_booked_items( $booked_items );
					return new WP_Error(
						'order_item_not_found',
						sprintf( __( 'Toy instance #%d not found.', 'elkaretro' ), $item_id ),
						array( 'status' => 404 )
					);
				}

				// Toy instance must be published (available) or already booked
				if ( $instance->post_status !== 'publish' && $instance->post_status !== 'booked' ) {
					// Rollback already booked items
					$this->rollback_booked_items( $booked_items );
					return new WP_Error(
						'order_item_unavailable',
						sprintf( __( 'Toy instance #%d is not available for order.', 'elkaretro' ), $item_id ),
						array( 'status' => 400 )
					);
				}

				// If published, book it immediately
				if ( $instance->post_status === 'publish' ) {
					wp_update_post(
						array(
							'ID'          => $item_id,
							'post_status' => 'booked',
						)
					);
					$booked_items[] = array(
						'id'   => $item_id,
						'type' => 'toy_instance',
					);
				}
			} elseif ( $type === 'ny_accessory' ) {
				$accessory = get_post( $item_id );
				if ( ! $accessory || $accessory->post_type !== 'ny_accessory' ) {
					// Rollback already booked items
					$this->rollback_booked_items( $booked_items );
					return new WP_Error(
						'order_item_not_found',
						sprintf( __( 'NY accessory #%d not found.', 'elkaretro' ), $item_id ),
						array( 'status' => 404 )
					);
				}

				// NY accessory must be published (available) or already booked
				if ( $accessory->post_status !== 'publish' && $accessory->post_status !== 'booked' ) {
					// Rollback already booked items
					$this->rollback_booked_items( $booked_items );
					return new WP_Error(
						'order_item_unavailable',
						sprintf( __( 'NY accessory #%d is not available for order.', 'elkaretro' ), $item_id ),
						array( 'status' => 400 )
					);
				}

				// Check stock availability
				$stock = absint( get_post_meta( $item_id, 'stock', true ) );
				if ( $stock <= 0 ) {
					// Rollback already booked items
					$this->rollback_booked_items( $booked_items );
					return new WP_Error(
						'order_item_out_of_stock',
						sprintf( __( 'NY accessory #%d is out of stock.', 'elkaretro' ), $item_id ),
						array( 'status' => 400 )
					);
				}

				// If published, book it immediately
				if ( $accessory->post_status === 'publish' ) {
					wp_update_post(
						array(
							'ID'          => $item_id,
							'post_status' => 'booked',
						)
					);
					$booked_items[] = array(
						'id'   => $item_id,
						'type' => 'ny_accessory',
					);
				}
			}
		}

		return array( 'booked_items' => $booked_items );
	}

	/**
	 * Reserve toy instances (change status to 'reserved').
	 *
	 * @param array $instance_ids Array of toy instance IDs.
	 * @param int   $order_id Order ID.
	 * @return void
	 */
	protected function reserve_toy_instances( $instance_ids, $order_id ) {
		if ( ! is_array( $instance_ids ) || empty( $instance_ids ) ) {
			return;
		}

		foreach ( $instance_ids as $instance_id ) {
			$instance_id = absint( $instance_id );
			if ( ! $instance_id ) {
				continue;
			}

			$instance = get_post( $instance_id );
			if ( ! $instance || $instance->post_type !== 'toy_instance' ) {
				continue;
			}

			// Change status from 'booked' to 'reserved' (items are already booked during validation)
			if ( $instance->post_status === 'booked' ) {
				wp_update_post(
					array(
						'ID'          => $instance_id,
						'post_status' => 'reserved',
					)
				);

				// Store order ID in instance meta for reference
				update_post_meta( $instance_id, '_order_id', $order_id );
			}
		}
	}

	/**
	 * Decrease NY accessory stock and update status if stock becomes 0.
	 *
	 * @param array $accessory_ids Array of NY accessory IDs.
	 * @param int   $order_id Order ID.
	 * @return void
	 */
	protected function decrease_ny_accessory_stock( $accessory_ids, $order_id ) {
		if ( ! is_array( $accessory_ids ) || empty( $accessory_ids ) ) {
			return;
		}

		foreach ( $accessory_ids as $accessory_id ) {
			$accessory_id = absint( $accessory_id );
			if ( ! $accessory_id ) {
				continue;
			}

			$accessory = get_post( $accessory_id );
			if ( ! $accessory || $accessory->post_type !== 'ny_accessory' ) {
				continue;
			}

			// Only process if accessory is currently booked (items are already booked during validation)
			if ( $accessory->post_status !== 'booked' ) {
				continue;
			}

			// Get current stock
			$current_stock = absint( get_post_meta( $accessory_id, 'stock', true ) );
			
			// Decrease stock by 1 (in future, can be decreased by quantity)
			$new_stock = max( 0, $current_stock - 1 );
			update_post_meta( $accessory_id, 'stock', $new_stock );

			// Store order ID in accessory meta for reference
			update_post_meta( $accessory_id, '_order_id', $order_id );

			// Change status from 'booked' to 'reserved' only if stock became 0
			// If stock > 0, change from 'booked' back to 'publish'
			if ( $new_stock === 0 ) {
				wp_update_post(
					array(
						'ID'          => $accessory_id,
						'post_status' => 'reserved',
					)
				);
			} else {
				// Stock > 0, return to publish status
				wp_update_post(
					array(
						'ID'          => $accessory_id,
						'post_status' => 'publish',
					)
				);
			}
		}
	}

	/**
	 * Mark order items as sold (change status from 'reserved' to 'sold').
	 *
	 * @param int $order_id Order ID.
	 * @return void
	 */
	protected function mark_order_items_as_sold( $order_id ) {
		// Get toy instances
		$toy_instance_items = get_post_meta( $order_id, 'toy_instance_items', true ) ?: array();
		if ( ! empty( $toy_instance_items ) && is_array( $toy_instance_items ) ) {
			foreach ( $toy_instance_items as $instance_id ) {
				$instance_id = absint( $instance_id );
				if ( ! $instance_id ) {
					continue;
				}

				$instance = get_post( $instance_id );
				if ( ! $instance || $instance->post_type !== 'toy_instance' ) {
					continue;
				}

				// Only change status if instance is currently reserved
				if ( $instance->post_status === 'reserved' ) {
					wp_update_post(
						array(
							'ID'          => $instance_id,
							'post_status' => 'sold',
						)
					);
				}
			}
		}

		// Get NY accessories
		$ny_accessory_items = get_post_meta( $order_id, 'ny_accessory_items', true ) ?: array();
		if ( ! empty( $ny_accessory_items ) && is_array( $ny_accessory_items ) ) {
			foreach ( $ny_accessory_items as $accessory_id ) {
				$accessory_id = absint( $accessory_id );
				if ( ! $accessory_id ) {
					continue;
				}

				$accessory = get_post( $accessory_id );
				if ( ! $accessory || $accessory->post_type !== 'ny_accessory' ) {
					continue;
				}

				// Only change status if accessory is currently reserved
				// (reserved status is set only when stock becomes 0)
				if ( $accessory->post_status === 'reserved' ) {
					wp_update_post(
						array(
							'ID'          => $accessory_id,
							'post_status' => 'sold',
						)
					);
				}
				// Note: If accessory has stock > 0 and status is 'publish',
				// it means stock was decreased but didn't reach 0, so status remains 'publish'
			}
		}
	}

	/**
	 * Clear user cart after successful order creation.
	 *
	 * @param int $user_id User ID.
	 * @return void
	 */
	protected function clear_user_cart( $user_id ) {
		if ( ! $user_id ) {
			return;
		}

		$cart_service = new Cart_Service();
		$empty_cart   = array(
			'items'       => array(),
			'lastUpdated' => current_time( 'mysql' ),
		);

		$cart_service->save_user_cart( $user_id, $empty_cart );
	}

	/**
	 * Rollback booked items back to 'publish' status.
	 * Used when order validation or creation fails.
	 *
	 * @param array $booked_items Array of booked items with 'id' and 'type'.
	 * @return void
	 */
	protected function rollback_booked_items( $booked_items ) {
		if ( ! is_array( $booked_items ) || empty( $booked_items ) ) {
			return;
		}

		foreach ( $booked_items as $item ) {
			$item_id = absint( $item['id'] ?? 0 );
			$type    = sanitize_text_field( $item['type'] ?? '' );

			if ( ! $item_id || ! $type ) {
				continue;
			}

			$post = get_post( $item_id );
			if ( ! $post ) {
				continue;
			}

			// Only rollback if status is still 'booked' (not already changed to 'reserved')
			if ( $post->post_status === 'booked' ) {
				wp_update_post(
					array(
						'ID'          => $item_id,
						'post_status' => 'publish',
					)
				);
			}
		}
	}

	/**
	 * Get actual price from database for an item.
	 *
	 * @param int    $item_id Item ID.
	 * @param string $type Item type ('toy_instance' or 'ny_accessory').
	 * @return float|null Price or null if not found.
	 */
	protected function get_item_price_from_db( $item_id, $type ) {
		$item_id = absint( $item_id );
		if ( ! $item_id ) {
			return null;
		}

		if ( $type === 'toy_instance' ) {
			$price_meta = get_post_meta( $item_id, 'cost', true );
			if ( $price_meta !== '' && is_numeric( $price_meta ) ) {
				return (float) $price_meta;
			}
		} elseif ( $type === 'ny_accessory' ) {
			$price_meta = get_post_meta( $item_id, 'ny_cost', true );
			$price_value = null;

			if ( is_array( $price_meta ) ) {
				if ( isset( $price_meta['amount'] ) ) {
					$price_value = $price_meta['amount'];
				} elseif ( isset( $price_meta['value'] ) ) {
					$price_value = $price_meta['value'];
				}
			} elseif ( $price_meta !== '' ) {
				// Extract numeric value from string (handles formatting like "1 000,50" or "1000.50")
				$numeric = preg_replace( '/[^\d.,]/u', '', (string) $price_meta );
				if ( $numeric !== '' ) {
					$numeric = str_replace( ' ', '', $numeric );
					$numeric = str_replace( ',', '.', $numeric );
					if ( is_numeric( $numeric ) ) {
						$price_value = (float) $numeric;
					}
				}
			}

			if ( $price_value !== null && $price_value !== '' && is_numeric( $price_value ) ) {
				return (float) $price_value;
			}
		}

		return null;
	}

	/**
	 * Validate and recalculate order totals based on actual prices from database.
	 *
	 * @param array $cart_items Cart items from request.
	 * @param array $frontend_totals Totals calculated on frontend.
	 * @return array Array with 'price_changed' (bool) and 'actual_totals' (array).
	 */
	protected function validate_and_recalculate_prices( $cart_items, $frontend_totals ) {
		$actual_subtotal = 0.0;
		$frontend_subtotal = floatval( $frontend_totals['subtotal'] ?? 0 );
		$price_changed = false;

		// Recalculate subtotal from actual prices in database
		foreach ( $cart_items as $item ) {
			$item_id = absint( $item['id'] ?? 0 );
			$type    = sanitize_text_field( $item['type'] ?? '' );
			$frontend_price = floatval( $item['price'] ?? 0 );

			if ( ! $item_id || ! $type ) {
				continue;
			}

			$actual_price = $this->get_item_price_from_db( $item_id, $type );
			if ( $actual_price === null ) {
				// If price not found in DB, use frontend price (shouldn't happen, but fallback)
				$actual_price = $frontend_price;
			} else {
				// Check if price changed (use small epsilon for float comparison)
				if ( abs( $actual_price - $frontend_price ) > 0.01 ) {
					$price_changed = true;
				}
			}

			$actual_subtotal += $actual_price;
		}

		// Recalculate totals (preserve discount and fee from frontend, but recalculate total)
		$discount_amount = floatval( $frontend_totals['discount'] ?? 0 );
		$fee_amount      = floatval( $frontend_totals['fee'] ?? 0 );
		$actual_total    = $actual_subtotal - $discount_amount + $fee_amount;

		$actual_totals = array(
			'subtotal' => $actual_subtotal,
			'discount' => $discount_amount,
			'fee'      => $fee_amount,
			'total'    => $actual_total,
		);

		return array(
			'price_changed' => $price_changed,
			'actual_totals' => $actual_totals,
		);
	}

	/**
	 * Get order status from meta field.
	 *
	 * @param int $order_id Order ID.
	 * @return string Order status, defaults to 'pending_confirmation'.
	 */
	public function get_order_status( $order_id ) {
		$status = get_post_meta( $order_id, 'order_status', true );
		if ( empty( $status ) ) {
			return 'pending_confirmation';
		}
		return $status;
	}

	/**
	 * Set order status and save to history.
	 *
	 * @param int    $order_id Order ID.
	 * @param string $status   New order status.
	 * @param string $changed_by Who changed the status (default: 'system').
	 * @return bool|WP_Error True on success, WP_Error on failure.
	 */
	public function set_order_status( $order_id, $status, $changed_by = 'system' ) {
		// Validate status
		$valid_statuses = array(
			'pending_confirmation',
			'awaiting_payment',
			'awaiting_shippment',
			'shipped',
			'awaiting_pickup',
			'clarification',
			'completed',
			'rejected',
			'cancelled',
		);

		if ( ! in_array( $status, $valid_statuses, true ) ) {
			return new WP_Error(
				'invalid_order_status',
				__( 'Invalid order status.', 'elkaretro' ),
				array( 'status' => 400 )
			);
		}

		// Get current status
		$old_status = $this->get_order_status( $order_id );

		// If status hasn't changed, do nothing
		if ( $old_status === $status ) {
			return true;
		}

		// Update order status
		update_post_meta( $order_id, 'order_status', $status );

		// Save to history
		$this->add_order_status_history( $order_id, $status, $old_status, $changed_by );

		// Save to PODS
		$this->save_order_status_to_pods( $order_id );

		return true;
	}

	/**
	 * Add entry to order status history.
	 *
	 * @param int    $order_id   Order ID.
	 * @param string $new_status New status.
	 * @param string $old_status Old status.
	 * @param string $changed_by Who changed the status.
	 * @return void
	 */
	protected function add_order_status_history( $order_id, $new_status, $old_status, $changed_by = 'system' ) {
		$history = get_post_meta( $order_id, 'order_status_history', true );
		if ( ! is_array( $history ) ) {
			$history = array();
		}

		$history[] = array(
			'status'     => $new_status,
			'old_status' => $old_status,
			'changed_by' => $changed_by,
			'date'       => current_time( 'mysql' ),
			'timestamp'  => time(),
		);

		update_post_meta( $order_id, 'order_status_history', $history );
	}

	/**
	 * Save order status to PODS.
	 * Note: order_status_history is not saved to PODS as it's a technical field not used by admins.
	 *
	 * @param int $order_id Order post ID.
	 * @return void
	 */
	protected function save_order_status_to_pods( $order_id ) {
		$pods = pods( self::POST_TYPE, $order_id );
		
		if ( ! $pods || ! $pods->valid() ) {
			return;
		}

		// Save order_status (only field that admins use)
		$order_status = $this->get_order_status( $order_id );
		if ( $order_status ) {
			update_post_meta( $order_id, 'order_status', $order_status );
			$pods->save( 'order_status', $order_status );
		}

		// Note: order_status_history is saved only to post_meta, not to PODS
		// (it's a technical field, admins don't need it in the interface)
	}

	/**
	 * Format delivery data as ordered text string.
	 * All fields are concatenated in the correct order for admin readability.
	 *
	 * @param array $delivery Delivery data from request.
	 * @return string Formatted delivery data string.
	 */
	protected function format_delivery_data_string( $delivery ) {
		$delivery_method = sanitize_text_field( $delivery['delivery_method'] ?? '' );
		$delivery_data   = isset( $delivery['delivery_data'] ) && is_array( $delivery['delivery_data'] ) 
			? $delivery['delivery_data'] 
			: array();

		if ( empty( $delivery_method ) || empty( $delivery_data ) ) {
			return '';
		}

		$parts = array();

		// Format based on delivery method
		switch ( $delivery_method ) {
			case 'pickup_udelnaya':
				// Fields: name, desiredDate
				if ( ! empty( $delivery_data['name'] ) ) {
					$parts[] = 'Имя: ' . sanitize_text_field( $delivery_data['name'] );
				}
				if ( ! empty( $delivery_data['desiredDate'] ) ) {
					$parts[] = 'Желаемая дата получения: ' . sanitize_text_field( $delivery_data['desiredDate'] );
				}
				break;

			case 'pickup_ozon':
				// Fields: city, pickupAddress, phone
				if ( ! empty( $delivery_data['city'] ) ) {
					$parts[] = 'Город: ' . sanitize_text_field( $delivery_data['city'] );
				}
				if ( ! empty( $delivery_data['pickupAddress'] ) ) {
					$parts[] = 'Адрес пункта выдачи ОЗОН: ' . sanitize_text_field( $delivery_data['pickupAddress'] );
				}
				if ( ! empty( $delivery_data['phone'] ) ) {
					$parts[] = 'Телефон получателя: ' . sanitize_text_field( $delivery_data['phone'] );
				}
				break;

			case 'pickup_cdek':
				// Fields: lastName, firstName, phone, pickupAddress
				if ( ! empty( $delivery_data['lastName'] ) ) {
					$parts[] = 'Фамилия: ' . sanitize_text_field( $delivery_data['lastName'] );
				}
				if ( ! empty( $delivery_data['firstName'] ) ) {
					$parts[] = 'Имя: ' . sanitize_text_field( $delivery_data['firstName'] );
				}
				if ( ! empty( $delivery_data['phone'] ) ) {
					$parts[] = 'Телефон: ' . sanitize_text_field( $delivery_data['phone'] );
				}
				if ( ! empty( $delivery_data['pickupAddress'] ) ) {
					$parts[] = 'Адрес пункта выдачи СДЭК: ' . sanitize_text_field( $delivery_data['pickupAddress'] );
				}
				break;

			case 'courier_cdek':
				// Fields: address (with optional lastName, firstName, phone if provided)
				if ( ! empty( $delivery_data['lastName'] ) ) {
					$parts[] = 'Фамилия: ' . sanitize_text_field( $delivery_data['lastName'] );
				}
				if ( ! empty( $delivery_data['firstName'] ) ) {
					$parts[] = 'Имя: ' . sanitize_text_field( $delivery_data['firstName'] );
				}
				if ( ! empty( $delivery_data['phone'] ) ) {
					$parts[] = 'Телефон: ' . sanitize_text_field( $delivery_data['phone'] );
				}
				if ( ! empty( $delivery_data['address'] ) ) {
					$parts[] = 'Адрес доставки: ' . sanitize_textarea_field( $delivery_data['address'] );
				}
				break;

			case 'post_russia':
				// Fields: country, city, address, postalCode
				if ( ! empty( $delivery_data['country'] ) ) {
					$parts[] = 'Страна: ' . sanitize_text_field( $delivery_data['country'] );
				}
				if ( ! empty( $delivery_data['city'] ) ) {
					$parts[] = 'Город: ' . sanitize_text_field( $delivery_data['city'] );
				}
				if ( ! empty( $delivery_data['address'] ) ) {
					$parts[] = 'Адрес: ' . sanitize_textarea_field( $delivery_data['address'] );
				}
				if ( ! empty( $delivery_data['postalCode'] ) ) {
					$parts[] = 'Индекс: ' . sanitize_text_field( $delivery_data['postalCode'] );
				}
				break;

			default:
				// Fallback: just concatenate all fields
				foreach ( $delivery_data as $key => $value ) {
					if ( ! empty( $value ) ) {
						$label = ucfirst( str_replace( array( '_', 'A-Z' ), array( ' ', ' ' ), $key ) );
						$parts[] = $label . ': ' . sanitize_text_field( $value );
					}
				}
				break;
		}

		return implode( "\n", $parts );
	}
}

