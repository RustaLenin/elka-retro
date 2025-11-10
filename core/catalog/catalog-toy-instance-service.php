<?php
/**
 * Catalog service for toy instance search.
 *
 * Responsibilities:
 * - Resolve toy types that match type-level filters.
 * - Collect child instances for matched types.
 * - Apply instance-level filters and sorting.
 * - Return data formatted for frontend card adapter.
 *
 * TODO:
 * - Implement Catalog_Toy_Instance_Service::search( $state ).
 * - Implement helper to query parent toy types before fetching instances.
 * - Implement aggregation/metadata builder for sidebar filters.
 * - Optimise queries to avoid N+1 lookups (consider prefetching meta).
 */

namespace Elkaretro\Core\Catalog;

use WP_Query;

defined( 'ABSPATH' ) || exit;

class Catalog_Toy_Instance_Service {

	/**
	 * Performs search for toy instances with multi-step logic.
	 *
	 * @param array $state Normalized request state.
	 * @return array Response payload.
	 */
	public function search( array $state ) {
		$state['mode'] = 'instance';

		$args  = Catalog_Query_Manager::build_instance_query_args( $state );
		$query = new WP_Query( $args );

		$response = Catalog_Response_Adapter::from_query( $query, 'instance' );

		wp_reset_postdata();

		return $response;
	}

	/**
	 * Builds filter metadata for toy instance mode.
	 *
	 * @param array $state
	 * @return array
	 */
	public function get_filter_metadata( array $state ) {
		$filters = isset( $state['filters'] ) && is_array( $state['filters'] ) ? $state['filters'] : array();

		$instance_taxonomies = Catalog_Query_Manager::get_taxonomy_options(
			Catalog_Query_Manager::get_instance_taxonomy_filters(),
			$filters
		);

		$type_taxonomies = Catalog_Query_Manager::get_taxonomy_options(
			Catalog_Query_Manager::get_type_taxonomy_filters(),
			$filters
		);

		$sort_labels  = Catalog_Query_Manager::get_sort_labels( 'instance' );
		$default_sort = Catalog_Query_Manager::get_default_sort_key( 'instance' );
		$active_sort  = isset( $state['sort'] ) ? sanitize_key( $state['sort'] ) : $default_sort;

		if ( ! isset( $sort_labels[ $active_sort ] ) ) {
			$active_sort = $default_sort;
		}

		return array(
			'taxonomies' => array(
				'instance' => $instance_taxonomies,
				'type'     => $type_taxonomies,
			),
			'status'     => $this->get_status_metadata( $filters ),
			'sort'       => array(
				'active'  => $active_sort,
				'options' => $sort_labels,
			),
		);
	}

	/**
	 * Returns status filter metadata.
	 *
	 * @param array $filters
	 * @return array
	 */
	protected function get_status_metadata( array $filters ) {
		$active = array();
		if ( ! empty( $filters['status'] ) ) {
			$active = array_map( 'sanitize_key', (array) $filters['status'] );
		}

		$options = array(
			array(
				'value' => 'publish',
				'label' => 'Доступно',
			),
			array(
				'value' => 'reserved',
				'label' => 'Зарезервировано',
			),
			array(
				'value' => 'sold',
				'label' => 'Продано',
			),
		);

		return array(
			'options' => $options,
			'active'  => $active,
		);
	}
}

