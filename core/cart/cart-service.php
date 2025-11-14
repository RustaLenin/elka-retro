<?php
/**
 * Cart Service.
 *
 * Responsibilities:
 * - Business logic for cart operations.
 * - Storage and retrieval of cart data from user meta.
 * - Validation and normalization of cart data.
 */

namespace Elkaretro\Core\Cart;

use WP_Error;

defined( 'ABSPATH' ) || exit;

class Cart_Service {

	/**
	 * User meta key for storing cart data.
	 */
	const USER_META_KEY = 'elkaretro_cart';

	/**
	 * Get user cart from user meta.
	 *
	 * @param int $user_id User ID.
	 * @return array Cart data.
	 */
	public function get_user_cart( $user_id ) {
		$cart = get_user_meta( $user_id, self::USER_META_KEY, true );

		if ( ! is_array( $cart ) ) {
			return $this->get_default_cart();
		}

		return $this->normalize_cart( $cart );
	}

	/**
	 * Sync user cart with provided data.
	 * Priority: User Meta > provided data (if both exist, User Meta wins).
	 *
	 * @param int   $user_id User ID.
	 * @param array $cart_data Cart data from client.
	 * @return array|WP_Error Normalized cart data or error.
	 */
	public function sync_user_cart( $user_id, $cart_data ) {
		$server_cart = $this->get_user_cart( $user_id );
		$client_cart = $this->normalize_cart( $cart_data );

		// Logic:
		// 1. If LocalStorage is empty, but User Meta has data - update LocalStorage (return server cart)
		// 2. If User Meta is empty, but LocalStorage has data - update User Meta (save client cart)
		// 3. If both have data - User Meta takes priority (return server cart)

		$server_has_items = ! empty( $server_cart['items'] );
		$client_has_items = ! empty( $client_cart['items'] );

		if ( ! $client_has_items && $server_has_items ) {
			// Case 1: LocalStorage empty, User Meta has data
			return $server_cart;
		} elseif ( $client_has_items && ! $server_has_items ) {
			// Case 2: User Meta empty, LocalStorage has data
			$this->save_user_cart( $user_id, $client_cart );
			return $client_cart;
		} elseif ( $client_has_items && $server_has_items ) {
			// Case 3: Both have data - User Meta priority
			return $server_cart;
		}

		// Both empty - return default
		return $this->get_default_cart();
	}

	/**
	 * Save user cart to user meta.
	 *
	 * @param int   $user_id User ID.
	 * @param array $cart Cart data.
	 * @return bool
	 */
	public function save_user_cart( $user_id, $cart ) {
		$normalized = $this->normalize_cart( $cart );
		$normalized['lastUpdated'] = current_time( 'mysql' );

		return update_user_meta( $user_id, self::USER_META_KEY, $normalized );
	}

	/**
	 * Get default empty cart structure.
	 *
	 * @return array
	 */
	protected function get_default_cart() {
		return array(
			'items'       => array(),
			'lastUpdated' => current_time( 'mysql' ),
		);
	}

	/**
	 * Normalize cart data (validate and clean).
	 *
	 * @param array $cart Raw cart data.
	 * @return array Normalized cart data.
	 */
	protected function normalize_cart( $cart ) {
		if ( ! is_array( $cart ) ) {
			return $this->get_default_cart();
		}

		$items = isset( $cart['items'] ) && is_array( $cart['items'] ) ? $cart['items'] : array();

		// Validate and normalize items
		$normalized_items = array();
		$seen             = array();

		foreach ( $items as $item ) {
			if ( ! is_array( $item ) ) {
				continue;
			}

			$id   = isset( $item['id'] ) ? absint( $item['id'] ) : 0;
			$type = isset( $item['type'] ) ? sanitize_text_field( $item['type'] ) : '';
			$price = isset( $item['price'] ) ? floatval( $item['price'] ) : 0;

			// Validate required fields
			if ( ! $id || ! $type || $price <= 0 ) {
				continue;
			}

			// Validate type
			if ( ! in_array( $type, array( 'toy_instance', 'ny_accessory' ), true ) ) {
				continue;
			}

			// Remove duplicates (unique items)
			$key = $type . '-' . $id;
			if ( isset( $seen[ $key ] ) ) {
				continue;
			}
			$seen[ $key ] = true;

			$normalized_items[] = array(
				'id'      => $id,
				'type'    => $type,
				'price'   => $price,
				'addedAt' => isset( $item['addedAt'] ) ? sanitize_text_field( $item['addedAt'] ) : current_time( 'mysql' ),
			);
		}

		return array(
			'items'       => $normalized_items,
			'lastUpdated' => isset( $cart['lastUpdated'] ) ? sanitize_text_field( $cart['lastUpdated'] ) : current_time( 'mysql' ),
		);
	}
}

