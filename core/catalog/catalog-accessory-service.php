<?php
/**
 * Catalog Accessory Service
 *
 * Responsibilities:
 * - Encapsulate accessory search logic.
 * - Build queries for ny_accessory post type.
 * - Apply filters, sorting, and pagination.
 *
 * @package Elkaretro\Core\Catalog
 */

namespace Elkaretro\Core\Catalog;

use WP_Query;

defined( 'ABSPATH' ) || exit;

class Catalog_Accessory_Service {

	/**
	 * Search accessories based on state.
	 *
	 * @param array $state Normalized filter state from request.
	 * @return array Results array with 'items' and 'meta' keys.
	 */
	public function search( array $state ) {
		$args = Catalog_Query_Manager::build_accessory_query_args( $state );

		$query = new WP_Query( $args );

		if ( ! $query->have_posts() ) {
			wp_reset_postdata();
			return array(
				'items' => array(),
				'meta'  => array(
					'total'       => 0,
					'total_pages' => 0,
				),
			);
		}

		$response = Catalog_Response_Adapter::from_query( $query, 'accessory' );

		wp_reset_postdata();

		return $response;
	}
}

