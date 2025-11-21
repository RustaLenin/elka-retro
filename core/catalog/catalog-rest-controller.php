<?php
/**
 * Catalog REST controller.
 *
 * Responsibilities:
 * - Expose REST endpoints for catalog searches and filter metadata.
 * - Validate incoming request params and normalise state.
 * - Delegate to toy type/instance services and response adapter.
 *
 * TODO:
 * - Enforce capability checks if catalog becomes restricted.
 * - Extend metadata responses (aggregations, stats) as UI evolves.
 */

namespace Elkaretro\Core\Catalog;

use WP_REST_Controller;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

defined( 'ABSPATH' ) || exit;

class Catalog_REST_Controller extends WP_REST_Controller {

	private const DEFAULT_PER_PAGE = 24;
	private const MAX_PER_PAGE     = 1000;

	/**
	 * @var Catalog_Toy_Type_Service
	 */
	protected $type_service;

	/**
	 * @var Catalog_Toy_Instance_Service
	 */
	protected $instance_service;

	/**
	 * @var Catalog_Accessory_Service
	 */
	protected $accessory_service;

	/**
	 * Catalog_REST_Controller constructor.
	 */
	public function __construct( Catalog_Toy_Type_Service $type_service = null, Catalog_Toy_Instance_Service $instance_service = null, Catalog_Accessory_Service $accessory_service = null ) {
		$this->namespace        = 'elkaretro/v1';
		$this->rest_base        = 'catalog';
		$this->type_service     = $type_service ?: new Catalog_Toy_Type_Service();
		$this->instance_service = $instance_service ?: new Catalog_Toy_Instance_Service();
		$this->accessory_service = $accessory_service ?: new Catalog_Accessory_Service();
	}

	/**
	 * Registers REST API routes.
	 *
	 * @return void
	 */
	public function register_routes() {
		register_rest_route(
			$this->namespace,
			sprintf( '/%s/types', $this->rest_base ),
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'handle_types' ),
					'permission_callback' => '__return_true',
					'args'                => $this->get_collection_params(),
				),
			)
		);

		register_rest_route(
			$this->namespace,
			sprintf( '/%s/instances', $this->rest_base ),
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'handle_instances' ),
					'permission_callback' => '__return_true',
					'args'                => $this->get_collection_params(),
				),
			)
		);

		register_rest_route(
			$this->namespace,
			sprintf( '/%s/accessories', $this->rest_base ),
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'handle_accessories' ),
					'permission_callback' => '__return_true',
					'args'                => $this->get_collection_params(),
				),
			)
		);
	}

	/**
	 * Handles toy type search request.
	 *
	 * @param WP_REST_Request $request
	 * @return WP_REST_Response
	 */
	public function handle_types( WP_REST_Request $request ) {
		$state   = $this->normalize_state( $request, 'type' );
		$results = $this->type_service->search( $state );

		if ( ! is_array( $results ) ) {
			$results = array(
				'items' => array(),
				'meta'  => array(),
			);
		}

		// Убрали фильтры из ответа - frontend уже знает состояние фильтров из URL/store
		// Это ускоряет API (не формируем огромный массив фильтров) и уменьшает размер ответа

		return rest_ensure_response( $results );
	}

	/**
	 * Handles toy instance search request.
	 *
	 * @param WP_REST_Request $request
	 * @return WP_REST_Response
	 */
	public function handle_instances( WP_REST_Request $request ) {
		$state   = $this->normalize_state( $request, 'instance' );
		$results = $this->instance_service->search( $state );

		if ( ! is_array( $results ) ) {
			$results = array(
				'items' => array(),
				'meta'  => array(),
			);
		}

		// Убрали фильтры из ответа - frontend уже знает состояние фильтров из URL/store
		// Это ускоряет API (не формируем огромный массив фильтров) и уменьшает размер ответа

		return rest_ensure_response( $results );
	}

	/**
	 * Handles accessory search request.
	 *
	 * @param WP_REST_Request $request
	 * @return WP_REST_Response
	 */
	public function handle_accessories( WP_REST_Request $request ) {
		$state   = $this->normalize_state( $request, 'accessory' );
		$results = $this->accessory_service->search( $state );

		if ( ! is_array( $results ) ) {
			$results = array(
				'items' => array(),
				'meta'  => array(),
			);
		}

		// Убрали фильтры из ответа - frontend уже знает состояние фильтров из URL/store
		// Это ускоряет API (не формируем огромный массив фильтров) и уменьшает размер ответа

		return rest_ensure_response( $results );
	}

	/**
	 * Normalizes request parameters into catalog state array.
	 *
	 * @param WP_REST_Request $request
	 * @param string          $mode
	 * @return array
	 */
	protected function normalize_state( WP_REST_Request $request, $mode ) {
		// Поддержка нового формата: offset + limit
		$offset = max( 0, (int) $request->get_param( 'offset' ) );
		$limit  = (int) $request->get_param( 'limit' );

		// Если limit не указан, используем дефолтное значение per_page
		if ( $limit <= 0 ) {
			$limit = self::DEFAULT_PER_PAGE;
		}

		$limit = min( $limit, self::MAX_PER_PAGE );

		$search = $request->get_param( 'search' );
		$sort   = $request->get_param( 'sort' );

		$filters = $this->extract_filters( $request );

		return array(
			'mode'     => $mode,
			'offset'   => $offset,
			'limit'    => $limit,
			'search'   => is_string( $search ) ? sanitize_text_field( $search ) : '',
			'sort'     => is_string( $sort ) ? sanitize_key( $sort ) : '',
			'filters'  => $filters,
		);
	}

	/**
	 * Returns supported collection parameters for both catalog endpoints.
	 *
	 * @return array
	 */
	public function get_collection_params() {
		return array(
			'offset'   => array(
				'description'       => __( 'Number of items to skip (for pagination).', 'elkaretro' ),
				'type'              => 'integer',
				'default'           => 0,
				'minimum'           => 0,
				'validate_callback' => 'rest_validate_request_arg',
			),
			'limit'    => array(
				'description'       => __( 'Maximum number of items to return.', 'elkaretro' ),
				'type'              => 'integer',
				'default'           => self::DEFAULT_PER_PAGE,
				'minimum'           => 1,
				'maximum'           => self::MAX_PER_PAGE,
				'validate_callback' => 'rest_validate_request_arg',
			),
			'search'   => array(
				'description' => __( 'Search phrase.', 'elkaretro' ),
				'type'        => 'string',
				'minLength'   => 0,
			),
			'sort'     => array(
				'description' => __( 'Sort key identifier.', 'elkaretro' ),
				'type'        => 'string',
			),
		);
	}

	/**
	 * Extracts filters from request parameters (new flat notation + legacy filters[]).
	 *
	 * @param WP_REST_Request $request REST request object.
	 *
	 * @return array
	 */
	protected function extract_filters( WP_REST_Request $request ) {
		$params      = $request->get_params();
		$raw_filters = array();
		$reserved    = $this->get_reserved_query_keys();

		foreach ( $params as $key => $value ) {
			if ( in_array( $key, $reserved, true ) ) {
				continue;
			}

			$raw_filters[ $key ] = $value;
		}

		return $this->sanitize_filters( $raw_filters );
	}

	/**
	 * Returns list of reserved query keys that shouldn't be treated as filters.
	 *
	 * @return array
	 */
	protected function get_reserved_query_keys() {
		return array(
			'mode',
			'offset',
			'limit',
			'search',
			'sort',
			'context',
			'_fields',
			'_locale',
			'_wpnonce',
			'rest_route',
			'filters',
		);
	}

	/**
	 * Sanitizes filter values supplied via REST request.
	 *
	 * @param mixed $filters Raw filter payload.
	 * @return array
	 */
	protected function sanitize_filters( $filters ) {
		if ( empty( $filters ) || ! is_array( $filters ) ) {
			return array();
		}

		$normalized = array();

		foreach ( $filters as $key => $value ) {
			$normalized_key = sanitize_key( $key );

			if ( '' === $normalized_key ) {
				continue;
			}

			$values = $this->normalize_filter_values( $value );

			if ( ! empty( $values ) ) {
				$normalized[ $normalized_key ] = $values;
			}
		}

		return $normalized;
	}

	/**
	 * Normalizes a single filter value (scalar|array) into a sanitized array.
	 *
	 * @param mixed $value Raw filter value.
	 * @return array
	 */
	protected function normalize_filter_values( $value ) {
		$collected = array();

		if ( is_array( $value ) ) {
			foreach ( $value as $sub_value ) {
				$collected = array_merge( $collected, $this->normalize_filter_values( $sub_value ) );
			}

			return $this->dedupe_filter_values( $collected );
		}

		if ( is_scalar( $value ) ) {
			$pieces = array_map( 'trim', explode( ',', (string) $value ) );
			foreach ( $pieces as $piece ) {
				if ( '' === $piece ) {
					continue;
				}
				$clean = sanitize_text_field( $piece );
				if ( '' !== $clean ) {
					$collected[] = $clean;
				}
			}
		}

		return $this->dedupe_filter_values( $collected );
	}

	/**
	 * Removes empty values and duplicates from filter values list.
	 *
	 * @param array $values Raw list.
	 * @return array
	 */
	protected function dedupe_filter_values( array $values ) {
		$filtered = array();
		foreach ( $values as $value ) {
			if ( '' === $value || null === $value ) {
				continue;
			}
			$filtered[] = $value;
		}

		if ( empty( $filtered ) ) {
			return array();
		}

		return array_values( array_unique( $filtered ) );
	}
}

