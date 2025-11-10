<?php
/**
 * Shared catalog query helpers.
 *
 * Responsibilities:
 * - Assemble WP_Query arguments for toy type and instance searches.
 * - Apply filters (taxonomies, meta queries) and sorting rules.
 * - Handle pagination/infinite scroll cursors.
 * - Provide search term integration (s).
 *
 * TODO:
 * - Implement Catalog_Query_Manager::build_type_query_args( $state ).
 * - Implement Catalog_Query_Manager::build_instance_query_args( $state ).
 * - Implement helper methods for tax/meta filtering, ordering, search.
 * - Implement cursor/pagination helpers for load more support.
 */

namespace Elkaretro\Core\Catalog;

use WP_Query;
use WP_Term;

defined( 'ABSPATH' ) || exit;

class Catalog_Query_Manager {

	private const TYPE_TAXONOMY_FILTERS = array(
		'category-of-toys'     => 'category-of-toys',
		'occurrence'           => 'occurrence',
		'year_of_production'   => 'year_of_production',
		'material'             => 'material',
		'manufacturer'         => 'manufacturer',
		'size'                 => 'size',
		'glass_thickness'      => 'glass_thickness',
		'mounting_type'        => 'mounting_type',
	);

	private const INSTANCE_TAXONOMY_FILTERS = array(
		'authenticity'      => 'authenticity',
		'lot_configurations'=> 'lot_configurations',
		'property'          => 'property',
		'condition'         => 'condition',
		'tube_condition'    => 'tube_condition',
		'paint_type'        => 'paint_type',
		'color_type'        => 'color_type',
		'back_color'        => 'back_color',
	);

	private const TYPE_SORTS = array(
		'default' => array(
			'label'   => 'Новые поступления',
			'orderby' => 'date',
			'order'   => 'DESC',
		),
		'alphabetical' => array(
			'label'   => 'По алфавиту',
			'orderby' => 'title',
			'order'   => 'ASC',
		),
		'available_desc' => array(
			'label'    => 'Сначала с экземплярами',
			'meta_key' => 'available_instances_count',
			'orderby'  => 'meta_value_num',
			'order'    => 'DESC',
			'meta_type'=> 'NUMERIC',
		),
	);

	private const INSTANCE_SORTS = array(
		'default' => array(
			'label'   => 'Новые',
			'orderby' => 'date',
			'order'   => 'DESC',
		),
		'price_low_high' => array(
			'label'    => 'Сначала дешёвые',
			'meta_key' => 'cost',
			'orderby'  => 'meta_value_num',
			'order'    => 'ASC',
			'meta_type'=> 'DECIMAL',
		),
		'price_high_low' => array(
			'label'    => 'Сначала дорогие',
			'meta_key' => 'cost',
			'orderby'  => 'meta_value_num',
			'order'    => 'DESC',
			'meta_type'=> 'DECIMAL',
		),
		'alphabetical' => array(
			'label'   => 'По алфавиту',
			'orderby' => 'title',
			'order'   => 'ASC',
		),
	);

	/**
	 * Builds query args for toy type mode.
	 *
	 * @param array $state Normalized filter state from request.
	 * @return array
	 */
	public static function build_type_query_args( array $state ) {
		$args = array(
			'post_type'           => 'toy_type',
			'post_status'         => 'publish',
			'ignore_sticky_posts' => true,
		);

		$filters = isset( $state['filters'] ) && is_array( $state['filters'] ) ? $state['filters'] : array();

		$tax_query = self::build_tax_query( $filters, self::TYPE_TAXONOMY_FILTERS );
		if ( ! empty( $tax_query ) ) {
			$args['tax_query'] = $tax_query;
		}

		$args = self::apply_search( $args, $state );
		$args = self::apply_sorting( $args, $state );
		$args = self::apply_pagination( $args, $state );

		return $args;
	}

	/**
	 * Builds query args for toy instance mode.
	 *
	 * @param array $state Normalized filter state from request.
	 * @return array
	 */
	public static function build_instance_query_args( array $state ) {
		$filters = isset( $state['filters'] ) && is_array( $state['filters'] ) ? $state['filters'] : array();

		$post_status = array( 'publish' );
		if ( ! empty( $filters['status'] ) ) {
			$status_values = (array) $filters['status'];
			$post_status   = array_map( 'sanitize_key', $status_values );
		}

		$args = array(
			'post_type'           => 'toy_instance',
			'post_status'         => $post_status,
			'ignore_sticky_posts' => true,
		);

		// Direct taxonomy filters for instances.
		$tax_query = self::build_tax_query( $filters, self::INSTANCE_TAXONOMY_FILTERS );
		if ( ! empty( $tax_query ) ) {
			$args['tax_query'] = $tax_query;
		}

		$meta_query = self::build_instance_meta_query( $filters );

		// Filters inherited from toy type (e.g., category-of-toys, occurrence).
		$type_related_filters = self::extract_type_related_filters( $filters );
		if ( ! empty( $type_related_filters ) ) {
			$type_ids = self::resolve_type_ids_for_filters( $type_related_filters );

			if ( empty( $type_ids ) ) {
				// No matching types -> no instances should match.
				$args['post__in'] = array( 0 );
			} else {
				$meta_query[] = array(
					'key'     => 'connection_type_of_toy',
					'value'   => array_map( 'intval', $type_ids ),
					'compare' => 'IN',
				);
			}
		}

		if ( ! empty( $meta_query ) ) {
			if ( count( $meta_query ) > 1 ) {
				$meta_query['relation'] = 'AND';
			}
			$args['meta_query'] = $meta_query;
		}

		$args = self::apply_search( $args, $state );
		$args = self::apply_sorting( $args, $state );
		$args = self::apply_pagination( $args, $state );

		return $args;
	}

	/**
	 * Applies shared ordering to a WP_Query args array.
	 *
	 * @param array $args  Existing query args.
	 * @param array $state Request state.
	 * @return array
	 */
	public static function apply_sorting( array $args, array $state ) {
		$mode = isset( $state['mode'] ) ? $state['mode'] : 'type';
		$key  = isset( $state['sort'] ) ? sanitize_key( $state['sort'] ) : '';

		$sorts = 'instance' === $mode ? self::INSTANCE_SORTS : self::TYPE_SORTS;

		if ( empty( $key ) || ! isset( $sorts[ $key ] ) ) {
			$key = self::get_default_sort_key( $mode );
		}

		$config = $sorts[ $key ];

		unset( $args['meta_key'], $args['meta_type'] );

		$args['orderby'] = $config['orderby'];
		$args['order']   = $config['order'];

		if ( isset( $config['meta_key'] ) ) {
			$args['meta_key'] = $config['meta_key'];
		}

		if ( isset( $config['meta_type'] ) ) {
			$args['meta_type'] = $config['meta_type'];
		}

		return $args;
	}

	/**
	 * Applies search terms to query args.
	 *
	 * @param array $args
	 * @param array $state
	 * @return array
	 */
	public static function apply_search( array $args, array $state ) {
		$search = isset( $state['search'] ) ? trim( (string) $state['search'] ) : '';

		if ( '' !== $search ) {
			$args['s'] = $search;
		}

		return $args;
	}

	/**
	 * Applies pagination/infinite scroll parameters.
	 *
	 * @param array $args
	 * @param array $state
	 * @return array
	 */
	public static function apply_pagination( array $args, array $state ) {
		$page     = isset( $state['page'] ) ? max( 1, (int) $state['page'] ) : 1;
		$per_page = isset( $state['per_page'] ) ? (int) $state['per_page'] : (int) get_option( 'posts_per_page', 10 );

		if ( -1 === $per_page ) {
			$args['posts_per_page'] = -1;
			$args['paged']          = 1;
			$args['no_found_rows']  = true;
		} else {
			$per_page                = max( 1, $per_page );
			$args['posts_per_page']  = $per_page;
			$args['paged']           = $page;
			$args['no_found_rows']   = false;
		}

		return $args;
	}

	/**
	 * Returns taxonomy mapping for toy type filters.
	 *
	 * @return array
	 */
	public static function get_type_taxonomy_filters() {
		return self::TYPE_TAXONOMY_FILTERS;
	}

	/**
	 * Returns taxonomy mapping for toy instance filters.
	 *
	 * @return array
	 */
	public static function get_instance_taxonomy_filters() {
		return self::INSTANCE_TAXONOMY_FILTERS;
	}

	/**
	 * Returns sort definitions for the given mode.
	 *
	 * @param string $mode Mode identifier (type|instance).
	 * @return array
	 */
	public static function get_sort_definitions( $mode ) {
		return 'instance' === $mode ? self::INSTANCE_SORTS : self::TYPE_SORTS;
	}

	/**
	 * Returns map of sort labels for mode.
	 *
	 * @param string $mode Mode identifier.
	 * @return array
	 */
	public static function get_sort_labels( $mode ) {
		$definitions = self::get_sort_definitions( $mode );
		$labels      = array();

		foreach ( $definitions as $key => $definition ) {
			$labels[ $key ] = isset( $definition['label'] ) ? $definition['label'] : $key;
		}

		return $labels;
	}

	/**
	 * Returns default sort key for mode.
	 *
	 * @param string $mode Mode identifier.
	 * @return string
	 */
	public static function get_default_sort_key( $mode ) {
		$definitions = self::get_sort_definitions( $mode );
		reset( $definitions );

		return key( $definitions );
	}

	/**
	 * Builds taxonomy metadata used on the frontend.
	 *
	 * @param array $taxonomy_map   Map of filter keys to taxonomy slugs.
	 * @param array $active_filters Active filter values from request.
	 * @return array
	 */
	public static function get_taxonomy_options( array $taxonomy_map, array $active_filters = array() ) {
		$result = array();

		foreach ( $taxonomy_map as $filter_key => $taxonomy ) {
			$terms = get_terms(
				array(
					'taxonomy'   => $taxonomy,
					'hide_empty' => false,
				)
			);

			if ( is_wp_error( $terms ) ) {
				continue;
			}

			$config      = \elkaretro_get_taxonomy_config( $taxonomy );
			$active_raw  = isset( $active_filters[ $filter_key ] ) ? (array) $active_filters[ $filter_key ] : array();
			$active_flat = array_map(
				static function ( $value ) {
					return is_scalar( $value ) ? (string) $value : '';
				},
				$active_raw
			);

			$options = array();
			foreach ( $terms as $term ) {
				if ( ! $term instanceof WP_Term ) {
					continue;
				}

				$is_active = in_array( (string) $term->slug, $active_flat, true ) || in_array( (string) $term->term_id, $active_flat, true );

				$options[] = array(
					'id'     => (int) $term->term_id,
					'slug'   => $term->slug,
					'name'   => $term->name,
					'count'  => (int) $term->count,
					'active' => $is_active,
				);
			}

			$result[ $filter_key ] = array(
				'taxonomy' => $taxonomy,
				'label'    => $config['display_name'] ?? $taxonomy,
				'options'  => $options,
				'active'   => $active_flat,
			);
		}

		return $result;
	}

	/**
	 * Builds tax_query based on provided filters and mapping.
	 *
	 * @param array $filters
	 * @param array $mapping
	 * @return array
	 */
	private static function build_tax_query( array $filters, array $mapping ) {
		$tax_query = array();

		foreach ( $mapping as $filter_key => $taxonomy ) {
			if ( empty( $filters[ $filter_key ] ) ) {
				continue;
			}

			$values = (array) $filters[ $filter_key ];
			$values = array_filter(
				array_map(
					static function ( $value ) {
						return is_scalar( $value ) ? trim( (string) $value ) : '';
					},
					$values
				),
				static function ( $value ) {
					return '' !== $value;
				}
			);

			if ( empty( $values ) ) {
				continue;
			}

			$is_numeric = ! empty( $values ) && count(
				array_filter(
					$values,
					static function ( $value ) {
						return is_numeric( $value );
					}
				)
			) === count( $values );

			$field = $is_numeric ? 'term_id' : 'slug';

			if ( $is_numeric ) {
				$values = array_map( 'intval', $values );
			} else {
				$values = array_map( 'sanitize_text_field', $values );
			}

			$tax_query[] = array(
				'taxonomy' => $taxonomy,
				'field'    => $field,
				'terms'    => $values,
			);
		}

		if ( count( $tax_query ) > 1 ) {
			$tax_query['relation'] = 'AND';
		}

		return $tax_query;
	}

	/**
	 * Builds meta query for toy instance filters.
	 *
	 * @param array $filters
	 * @return array
	 */
	private static function build_instance_meta_query( array $filters ) {
		$meta_query = array();

		if ( isset( $filters['price_min'] ) && '' !== $filters['price_min'] ) {
			$meta_query[] = array(
				'key'     => 'cost',
				'value'   => (float) $filters['price_min'],
				'compare' => '>=',
				'type'    => 'NUMERIC',
			);
		}

		if ( isset( $filters['price_max'] ) && '' !== $filters['price_max'] ) {
			$meta_query[] = array(
				'key'     => 'cost',
				'value'   => (float) $filters['price_max'],
				'compare' => '<=',
				'type'    => 'NUMERIC',
			);
		}

		$direct_type_filters = array();
		if ( isset( $filters['toy_type'] ) ) {
			$direct_type_filters = array_merge( $direct_type_filters, (array) $filters['toy_type'] );
		}
		if ( isset( $filters['toy_type_id'] ) ) {
			$direct_type_filters = array_merge( $direct_type_filters, (array) $filters['toy_type_id'] );
		}

		$direct_type_filters = array_filter(
			array_map(
				static function ( $value ) {
					return is_scalar( $value ) ? (int) $value : null;
				},
				$direct_type_filters
			),
			static function ( $value ) {
				return ! empty( $value );
			}
		);

		if ( ! empty( $direct_type_filters ) ) {
			$meta_query[] = array(
				'key'     => 'connection_type_of_toy',
				'value'   => array_unique( $direct_type_filters ),
				'compare' => 'IN',
			);
		}

		return $meta_query;
	}

	/**
	 * Extracts filters related to toy types from the complete filter set.
	 *
	 * @param array $filters
	 * @return array
	 */
	private static function extract_type_related_filters( array $filters ) {
		$type_filters = array();

		foreach ( self::TYPE_TAXONOMY_FILTERS as $filter_key => $taxonomy ) {
			if ( isset( $filters[ $filter_key ] ) && ! isset( self::INSTANCE_TAXONOMY_FILTERS[ $filter_key ] ) ) {
				$type_filters[ $filter_key ] = $filters[ $filter_key ];
			}
		}

		return $type_filters;
	}

	/**
	 * Resolves toy type IDs for provided type filters.
	 *
	 * @param array $filters Type-related filters.
	 * @return array
	 */
	private static function resolve_type_ids_for_filters( array $filters ) {
		if ( empty( $filters ) ) {
			return array();
		}

		$tax_query = self::build_tax_query( $filters, self::TYPE_TAXONOMY_FILTERS );

		$args = array(
			'post_type'      => 'toy_type',
			'post_status'    => 'publish',
			'fields'         => 'ids',
			'posts_per_page' => -1,
			'no_found_rows'  => true,
		);

		if ( ! empty( $tax_query ) ) {
			$args['tax_query'] = $tax_query;
		}

		$query = new WP_Query( $args );
		$ids   = $query->posts;

		wp_reset_postdata();

		return array_map( 'intval', $ids );
	}
}

