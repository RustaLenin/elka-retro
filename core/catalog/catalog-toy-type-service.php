<?php
/**
 * Catalog service for toy type search.
 *
 * Responsibilities:
 * - Use Catalog_Query_Manager to build WP_Query.
 * - Execute query and format response.
 * - Provide filter metadata (available options counts, etc.).
 *
 * TODO:
 * - Implement Catalog_Toy_Type_Service::search( $state ).
 * - Implement method to prepare response payload (items, pagination meta).
 * - Implement method to calculate aggregations for filter side panel.
 */

namespace Elkaretro\Core\Catalog;

use WP_Query;

defined( 'ABSPATH' ) || exit;

class Catalog_Toy_Type_Service {

	/**
	 * Performs search for toy types.
	 *
	 * @param array $state Normalized request state.
	 * @return array Response payload.
	 */
	public function search( array $state ) {
		$state['mode'] = 'type';

		$args  = Catalog_Query_Manager::build_type_query_args( $state );
		$query = new WP_Query( $args );

		$response = Catalog_Response_Adapter::from_query( $query, 'type' );

		wp_reset_postdata();

		return $response;
	}

	/**
	 * Builds filter metadata for toy type mode.
	 *
	 * @param array $state
	 * @return array
	 */
	public function get_filter_metadata( array $state ) {
		$filters = isset( $state['filters'] ) && is_array( $state['filters'] ) ? $state['filters'] : array();

		$taxonomy_metadata = Catalog_Query_Manager::get_taxonomy_options(
			Catalog_Query_Manager::get_type_taxonomy_filters(),
			$filters
		);

		$sort_labels = Catalog_Query_Manager::get_sort_labels( 'type' );
		$default_sort = Catalog_Query_Manager::get_default_sort_key( 'type' );
		$active_sort  = isset( $state['sort'] ) ? sanitize_key( $state['sort'] ) : $default_sort;

		if ( ! isset( $sort_labels[ $active_sort ] ) ) {
			$active_sort = $default_sort;
		}

		return array(
			'taxonomies' => $taxonomy_metadata,
			'sort'       => array(
				'active'  => $active_sort,
				'options' => $sort_labels,
			),
		);
	}
}

