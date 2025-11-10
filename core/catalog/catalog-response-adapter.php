<?php
/**
 * Catalog response adapter.
 *
 * Responsibilities:
 * - Transform WP_Query results into normalized arrays for frontend.
 * - Attach meta information (pagination, total counts).
 * - Map ACF/PODS/meta fields onto card structure expected by result-card-adapter.js.
 */

namespace Elkaretro\Core\Catalog;

use WP_Post;
use WP_Query;
use WP_Term;

defined( 'ABSPATH' ) || exit;

class Catalog_Response_Adapter {

	/**
	 * Builds response array from WP_Query results.
	 *
	 * @param WP_Query $query Executed query instance.
	 * @param string   $mode  Catalog mode (type|instance).
	 * @return array
	 */
	public static function from_query( WP_Query $query, $mode ) {
		$items = array();

		if ( 'instance' === $mode ) {
			foreach ( $query->posts as $post ) {
				if ( $post instanceof WP_Post ) {
					$items[] = self::map_instance_post( $post );
				}
			}
		} else {
			foreach ( $query->posts as $post ) {
				if ( $post instanceof WP_Post ) {
					$items[] = self::map_type_post( $post );
				}
			}
		}

		$page     = (int) $query->get( 'paged' );
		$per_page = (int) $query->get( 'posts_per_page' );

		if ( $page < 1 ) {
			$page = 1;
		}

		return array(
			'items' => $items,
			'meta'  => array(
				'page'        => $page,
				'per_page'    => -1 === $per_page ? -1 : max( 1, $per_page ),
				'total'       => (int) $query->found_posts,
				'total_pages' => -1 === $per_page ? 1 : (int) $query->max_num_pages,
				'mode'        => $mode,
			),
		);
	}

	/**
	 * Maps toy type posts to payload item.
	 *
	 * @param WP_Post $post Post object.
	 * @return array
	 */
	protected static function map_type_post( WP_Post $post ) {
		$post_id = $post->ID;

		$image = self::get_primary_image_url( $post_id, 'toy_type' );

		$year_taxonomy       = self::get_related_taxonomy_slug( 'toy_type', 'year_of_production_field', 'year_of_production' );
		$manufacturer_tax    = self::get_related_taxonomy_slug( 'toy_type', 'manufacturer_field', 'manufacturer' );
		$occurrence_taxonomy = self::get_related_taxonomy_slug( 'toy_type', 'occurrence_field', 'occurrence' );

		$year     = self::get_first_term_name( $post_id, $year_taxonomy );
		$factory  = self::get_first_term_name( $post_id, $manufacturer_tax );
		$rarity   = self::get_first_term_slug( $post_id, $occurrence_taxonomy );
		$available_count = (int) get_post_meta( $post_id, 'available_instances_count', true );

		return array(
			'id'             => $post_id,
			'title'          => get_the_title( $post_id ),
			'link'           => get_permalink( $post_id ),
			'image'          => $image,
			'year'           => $year,
			'factory'        => $factory,
			'rarity'         => $rarity,
			'availableCount' => max( 0, $available_count ),
			'minPrice'       => null,
			'maxPrice'       => null,
		);
	}

	/**
	 * Maps toy instance posts to payload item.
	 *
	 * @param WP_Post $post Post object.
	 * @return array
	 */
	protected static function map_instance_post( WP_Post $post ) {
		$post_id = $post->ID;

		$image = self::get_primary_image_url( $post_id, 'toy_instance' );

		$tube_condition = self::get_first_term_slug( $post_id, 'tube_condition' );
		$condition_name = self::get_first_term_name( $post_id, 'condition' );

		$price_meta = get_post_meta( $post_id, 'cost', true );
		$price      = '' !== $price_meta ? (float) $price_meta : null;

		$parent_type_id = (int) get_post_meta( $post_id, 'connection_type_of_toy', true );
		$rarity         = '';

		if ( $parent_type_id > 0 ) {
			$occurrence_taxonomy = self::get_related_taxonomy_slug( 'toy_type', 'occurrence_field', 'occurrence' );
			$rarity              = self::get_first_term_slug( $parent_type_id, $occurrence_taxonomy );
		}

		return array(
			'id'            => $post_id,
			'title'         => get_the_title( $post_id ),
			'link'          => get_permalink( $post_id ),
			'image'         => $image,
			'price'         => $price,
			'rarity'        => $rarity,
			'tubeCondition' => $tube_condition,
			'condition'     => $condition_name,
			'status'        => get_post_status( $post_id ),
			'instanceIndex' => get_post_meta( $post_id, 'toy_instance_index', true ),
			'parentType'    => array(
				'id'    => $parent_type_id,
				'link'  => $parent_type_id ? get_permalink( $parent_type_id ) : '',
				'title' => $parent_type_id ? get_the_title( $parent_type_id ) : '',
			),
		);
	}

	/**
	 * Returns the first term name for taxonomy.
	 *
	 * @param int    $post_id
	 * @param string $taxonomy
	 * @return string
	 */
	protected static function get_first_term_name( $post_id, $taxonomy ) {
		if ( empty( $taxonomy ) ) {
			return '';
		}

		$terms = get_the_terms( $post_id, $taxonomy );
		if ( empty( $terms ) || is_wp_error( $terms ) ) {
			return '';
		}

		$term = $terms[0];

		return $term instanceof WP_Term ? $term->name : '';
	}

	/**
	 * Returns the first term slug for taxonomy.
	 *
	 * @param int    $post_id
	 * @param string $taxonomy
	 * @return string
	 */
	protected static function get_first_term_slug( $post_id, $taxonomy ) {
		if ( empty( $taxonomy ) ) {
			return '';
		}

		$terms = get_the_terms( $post_id, $taxonomy );
		if ( empty( $terms ) || is_wp_error( $terms ) ) {
			return '';
		}

		$term = $terms[0];

		return $term instanceof WP_Term ? $term->slug : '';
	}

	/**
	 * Returns related taxonomy slug from data model.
	 *
	 * @param string $post_type
	 * @param string $field_slug
	 * @param string $fallback
	 * @return string
	 */
	protected static function get_related_taxonomy_slug( $post_type, $field_slug, $fallback ) {
		$config = \elkaretro_get_field_config( $post_type, $field_slug );

		return isset( $config['related_taxonomy'] ) ? $config['related_taxonomy'] : $fallback;
	}

	/**
	 * Returns primary image URL for post.
	 *
	 * @param int    $post_id
	 * @param string $post_type
	 * @return string
	 */
	protected static function get_primary_image_url( $post_id, $post_type ) {
		$thumbnail_id = get_post_thumbnail_id( $post_id );

		if ( $thumbnail_id ) {
			$url = wp_get_attachment_image_url( $thumbnail_id, 'large' );

			if ( $url ) {
				return $url;
			}

			$url = wp_get_attachment_image_url( $thumbnail_id, 'medium' );
			if ( $url ) {
				return $url;
			}
		}

		$field_slug = 'toy_type' === $post_type ? 'toy_type_photos' : 'photos_of_the_toy_instance';
		$config     = \elkaretro_get_field_config( $post_type, $field_slug );
		$meta_key   = isset( $config['meta_field'] ) ? $config['meta_field'] : $field_slug;

		$gallery = get_post_meta( $post_id, $meta_key, true );

		if ( empty( $gallery ) ) {
			return '';
		}

		if ( is_array( $gallery ) ) {
			$first = reset( $gallery );

			if ( is_array( $first ) && isset( $first['ID'] ) ) {
				$first = $first['ID'];
			}

			if ( $first ) {
				$url = wp_get_attachment_image_url( (int) $first, 'large' );
				if ( ! $url ) {
					$url = wp_get_attachment_image_url( (int) $first, 'medium' );
				}

				return $url ? $url : '';
			}
		} elseif ( is_numeric( $gallery ) ) {
			$url = wp_get_attachment_image_url( (int) $gallery, 'large' );
			if ( ! $url ) {
				$url = wp_get_attachment_image_url( (int) $gallery, 'medium' );
			}

			return $url ? $url : '';
		}

		return '';
	}
}

