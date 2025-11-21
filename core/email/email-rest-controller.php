<?php
/**
 * Email REST Controller.
 *
 * Responsibilities:
 * - REST endpoints for admin email settings and logs.
 * - Only accessible by administrators.
 */

namespace Elkaretro\Core\Email;

use WP_REST_Controller;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
use WP_Error;

defined( 'ABSPATH' ) || exit;

class Email_REST_Controller extends WP_REST_Controller {

	/**
	 * Namespace.
	 *
	 * @var string
	 */
	protected $namespace = 'elkaretro/v1';

	/**
	 * REST base.
	 *
	 * @var string
	 */
	protected $rest_base = 'email';

	/**
	 * Register REST routes.
	 *
	 * @return void
	 */
	public function register_routes() {
		// POST /wp-json/elkaretro/v1/email/settings - Update settings.
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/settings',
			array(
				array(
					'methods'             => WP_REST_Server::EDITABLE,
					'callback'            => array( $this, 'update_settings' ),
					'permission_callback' => array( $this, 'check_admin_permission' ),
					'args'                => $this->get_settings_args(),
				),
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_settings' ),
					'permission_callback' => array( $this, 'check_admin_permission' ),
				),
			)
		);

		// GET /wp-json/elkaretro/v1/email/logs - Get logs.
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/logs',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_logs' ),
					'permission_callback' => array( $this, 'check_admin_permission' ),
					'args'                => $this->get_logs_args(),
				),
			)
		);

		// DELETE /wp-json/elkaretro/v1/email/logs/{id} - Delete log.
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/logs/(?P<id>[\d]+)',
			array(
				array(
					'methods'             => WP_REST_Server::DELETABLE,
					'callback'            => array( $this, 'delete_log' ),
					'permission_callback' => array( $this, 'check_admin_permission' ),
					'args'                => array(
						'id' => array(
							'required' => true,
							'type'     => 'integer',
						),
					),
				),
			)
		);
	}

	/**
	 * Check admin permission.
	 *
	 * @return bool|WP_Error
	 */
	public function check_admin_permission() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return new WP_Error(
				'rest_forbidden',
				__( 'You must be an administrator to access this resource.', 'elkaretro' ),
				array( 'status' => 403 )
			);
		}
		return true;
	}

	/**
	 * Get settings.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function get_settings( WP_REST_Request $request ) {
		$settings = Email_Settings::get_all();
		return rest_ensure_response( $settings );
	}

	/**
	 * Update settings.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_settings_args() {
		return array(
			'smtp_enabled'   => array(
				'type'              => 'boolean',
				'sanitize_callback' => 'rest_sanitize_boolean',
			),
			'smtp_host'      => array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
			),
			'smtp_port'      => array(
				'type'              => 'integer',
				'sanitize_callback' => 'absint',
			),
			'smtp_secure'     => array(
				'type'              => 'string',
				'validate_callback' => function( $param ) {
					return in_array( $param, array( 'tls', 'ssl' ), true );
				},
			),
			'smtp_auth'       => array(
				'type'              => 'boolean',
				'sanitize_callback' => 'rest_sanitize_boolean',
			),
			'smtp_username'   => array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
			),
			'smtp_password'   => array(
				'type'              => 'string',
			),
			'from_name'       => array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
			),
			'from_email'      => array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_email',
				'validate_callback' => function( $param ) {
					return is_email( $param );
				},
			),
		);
	}

	/**
	 * Update settings.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function update_settings( WP_REST_Request $request ) {
		$settings = $request->get_json_params();

		if ( ! is_array( $settings ) ) {
			return new WP_Error(
				'rest_invalid_settings',
				__( 'Settings must be an object.', 'elkaretro' ),
				array( 'status' => 400 )
			);
		}

		$result = Email_Settings::update_all( $settings );

		if ( ! $result['success'] ) {
			return new WP_Error(
				'rest_settings_update_failed',
				__( 'Failed to update some settings.', 'elkaretro' ),
				array(
					'status' => 500,
					'errors' => $result['errors'],
				)
			);
		}

		return rest_ensure_response(
			array(
				'success' => true,
				'message' => __( 'Settings updated successfully.', 'elkaretro' ),
				'updated' => $result['updated'],
			)
		);
	}

	/**
	 * Get logs arguments.
	 *
	 * @return array
	 */
	public function get_logs_args() {
		return array(
			'per_page' => array(
				'type'              => 'integer',
				'default'           => 20,
				'sanitize_callback' => 'absint',
			),
			'page'     => array(
				'type'              => 'integer',
				'default'           => 1,
				'sanitize_callback' => 'absint',
			),
			'status'   => array(
				'type'              => 'string',
				'validate_callback' => function( $param ) {
					return empty( $param ) || in_array( $param, array( 'sent', 'failed' ), true );
				},
			),
			'search'   => array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
			),
		);
	}

	/**
	 * Get logs.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response
	 */
	public function get_logs( WP_REST_Request $request ) {
		$repository = new Email_Log_Repository();
		$args       = array(
			'per_page' => $request->get_param( 'per_page' ),
			'page'     => $request->get_param( 'page' ),
			'status'   => $request->get_param( 'status' ),
			'search'   => $request->get_param( 'search' ),
		);

		$result = $repository->get_list( $args );
		return rest_ensure_response( $result );
	}

	/**
	 * Delete log.
	 *
	 * @param WP_REST_Request $request Request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function delete_log( WP_REST_Request $request ) {
		$log_id = (int) $request->get_param( 'id' );
		$repository = new Email_Log_Repository();

		$result = $repository->delete( $log_id );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return rest_ensure_response(
			array(
				'success' => true,
				'message' => __( 'Log deleted successfully.', 'elkaretro' ),
			)
		);
	}
}

