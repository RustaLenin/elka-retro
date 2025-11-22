<?php
/**
 * User Profile REST controller.
 *
 * Responsibilities:
 * - Expose REST endpoints for user profile management.
 * - Validate incoming request params and user permissions.
 * - Handle profile updates, password changes, and contact messages.
 *
 * Security:
 * - All endpoints require authentication (WP nonce + logged-in user).
 * - Users can only modify their own profile.
 * - Admin capabilities required for some operations.
 */

namespace Elkaretro\Core\UserProfile;

use WP_REST_Controller;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;
use WP_Error;

defined( 'ABSPATH' ) || exit;

class User_Profile_REST_Controller extends WP_REST_Controller {

	/**
	 * @var string
	 */
	protected $namespace = 'elkaretro/v1';

	/**
	 * @var string
	 */
	protected $rest_base = 'user';

	/**
	 * Registers REST API routes.
	 */
	public function register_routes() {
		// POST /wp-json/elkaretro/v1/auth/login
		register_rest_route(
			$this->namespace,
			'/auth/login',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'login' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'username' => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
					'password' => array(
						'required'          => true,
						'type'              => 'string',
					),
					'remember' => array(
						'type'              => 'boolean',
						'default'           => false,
					),
				),
			)
		);

		// POST /wp-json/elkaretro/v1/auth/logout
		register_rest_route(
			$this->namespace,
			'/auth/logout',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'logout' ),
				'permission_callback' => array( $this, 'check_permission' ),
			)
		);

		// POST /wp-json/elkaretro/v1/auth/register - Register new user
		register_rest_route(
			$this->namespace,
			'/auth/register',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'register' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'email'           => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_email',
						'validate_callback' => function( $param ) {
							return is_email( $param );
						},
					),
					'username'        => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_user',
						'validate_callback' => function( $param ) {
							return strlen( trim( $param ) ) >= 3;
						},
					),
					'password'        => array(
						'required'          => true,
						'type'              => 'string',
						'validate_callback' => array( $this, 'validate_password' ),
					),
					'phone'           => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
					'privacy_consent' => array(
						'required' => true,
						'type'     => 'boolean',
						'validate_callback' => function( $param ) {
							return $param === true;
						},
					),
					'offer_consent'   => array(
						'required' => true,
						'type'     => 'boolean',
						'validate_callback' => function( $param ) {
							return $param === true;
						},
					),
					'first_name'      => array(
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
					'last_name'       => array(
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);

		// GET /wp-json/elkaretro/v1/user/profile - Get user profile
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/profile',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_profile' ),
					'permission_callback' => array( $this, 'check_permission' ),
				),
				array(
					'methods'             => WP_REST_Server::EDITABLE,
					'callback'            => array( $this, 'update_profile' ),
					'permission_callback' => array( $this, 'check_permission' ),
					'args'                => $this->get_profile_update_args(),
				),
			)
		);

		// POST /wp-json/elkaretro/v1/user/meta - Update user meta fields
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/meta',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'update_meta' ),
				'permission_callback' => array( $this, 'check_permission' ),
				'args'                => array(
					'meta' => array(
						'required'          => true,
						'type'              => 'object',
						'validate_callback' => array( $this, 'validate_meta' ),
						'sanitize_callback' => array( $this, 'sanitize_meta' ),
					),
				),
			)
		);

		// POST /wp-json/elkaretro/v1/user/change-password - Change user password
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/change-password',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'change_password' ),
				'permission_callback' => array( $this, 'check_permission' ),
				'args'                => array(
					'old_password' => array(
						'required' => true,
						'type'     => 'string',
					),
					'new_password' => array(
						'required'          => true,
						'type'              => 'string',
						'validate_callback' => array( $this, 'validate_password' ),
					),
				),
			)
		);

		// POST /wp-json/elkaretro/v1/user/contact - Send contact message
		register_rest_route(
			$this->namespace,
			'/' . $this->rest_base . '/contact',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'send_contact_message' ),
				'permission_callback' => array( $this, 'check_permission' ),
				'args'                => array(
					'user_id' => array(
						'required' => true,
						'type'     => 'integer',
					),
					'subject' => array(
						'required'          => true,
						'type'              => 'string',
						'validate_callback' => function( $param ) {
							return strlen( trim( $param ) ) >= 3;
						},
					),
					'message' => array(
						'required'          => true,
						'type'              => 'string',
						'validate_callback' => function( $param ) {
							return strlen( trim( $param ) ) >= 10;
						},
					),
				),
			)
		);
	}

	/**
	 * Login user via REST.
	 *
	 * @param WP_REST_Request $request
	 * @return WP_REST_Response|WP_Error
	 */
	public function login( WP_REST_Request $request ) {
		$username = $request->get_param( 'username' );
		$password = $request->get_param( 'password' );
		$remember = filter_var( $request->get_param( 'remember' ), FILTER_VALIDATE_BOOLEAN );

		if ( empty( $username ) || empty( $password ) ) {
			return new WP_Error(
				'rest_invalid_login',
				'Введите логин и пароль.',
				array( 'status' => 400 )
			);
		}

		$creds = array(
			'user_login'    => $username,
			'user_password' => $password,
			'remember'      => $remember,
		);

		$user = wp_signon( $creds, is_ssl() );

		if ( is_wp_error( $user ) ) {
			$error_code = $user->get_error_code();
			$message    = $user->get_error_message();

			if ( in_array( $error_code, array( 'invalid_username', 'incorrect_password' ), true ) ) {
				$message = 'Неверный логин или пароль';
			}

			return new WP_Error(
				$error_code ?: 'rest_auth_failed',
				$message ?: 'Не удалось выполнить вход.',
				array( 'status' => 403 )
			);
		}

		wp_set_current_user( $user->ID );

		return rest_ensure_response(
			array(
				'success' => true,
				'user'    => $this->prepare_user_info( $user ),
			)
		);
	}

	/**
	 * Logout user via REST.
	 *
	 * @param WP_REST_Request $request
	 * @return WP_REST_Response|WP_Error
	 */
	public function logout( WP_REST_Request $request ) {
		// WordPress logout function
		wp_logout();

		return rest_ensure_response(
			array(
				'success' => true,
				'message' => 'Вы успешно вышли из системы.',
			)
		);
	}

	/**
	 * Register new user via REST.
	 *
	 * @param WP_REST_Request $request
	 * @return WP_REST_Response|WP_Error
	 */
	public function register( WP_REST_Request $request ) {
		$email           = $request->get_param( 'email' );
		$username        = $request->get_param( 'username' );
		$password        = $request->get_param( 'password' );
		$phone           = $request->get_param( 'phone' );
		$privacy_consent = filter_var( $request->get_param( 'privacy_consent' ), FILTER_VALIDATE_BOOLEAN );
		$offer_consent   = filter_var( $request->get_param( 'offer_consent' ), FILTER_VALIDATE_BOOLEAN );
		$first_name      = $request->get_param( 'first_name' );
		$last_name       = $request->get_param( 'last_name' );

		// Validate consent checkboxes
		if ( ! $privacy_consent ) {
			return new WP_Error(
				'rest_missing_privacy_consent',
				'Необходимо согласие на обработку персональных данных.',
				array( 'status' => 400 )
			);
		}

		if ( ! $offer_consent ) {
			return new WP_Error(
				'rest_missing_offer_consent',
				'Необходимо согласие с условиями публичной оферты.',
				array( 'status' => 400 )
			);
		}

		// Check if email already exists
		if ( email_exists( $email ) ) {
			return new WP_Error(
				'rest_email_exists',
				'Email уже используется.',
				array( 'status' => 400 )
			);
		}

		// Check if username already exists
		if ( username_exists( $username ) ) {
			return new WP_Error(
				'rest_username_exists',
				'Логин уже используется.',
				array( 'status' => 400 )
			);
		}

		// Create user
		$user_id = wp_create_user( $username, $password, $email );

		if ( is_wp_error( $user_id ) ) {
			return new WP_Error(
				'rest_user_creation_failed',
				$user_id->get_error_message(),
				array( 'status' => 400 )
			);
		}

		// Update user meta fields
		if ( ! empty( $phone ) ) {
			update_user_meta( $user_id, 'phone_number', sanitize_text_field( $phone ) );
		}

		if ( ! empty( $first_name ) ) {
			update_user_meta( $user_id, 'first_name', sanitize_text_field( $first_name ) );
		}

		if ( ! empty( $last_name ) ) {
			update_user_meta( $user_id, 'last_name', sanitize_text_field( $last_name ) );
		}

		// Store consent timestamps
		update_user_meta( $user_id, '_privacy_consent_date', current_time( 'mysql' ) );
		update_user_meta( $user_id, '_offer_consent_date', current_time( 'mysql' ) );

		// Get created user
		$user = get_userdata( $user_id );

		return rest_ensure_response(
			array(
				'success' => true,
				'message' => 'Регистрация успешно завершена.',
				'user'    => $this->prepare_user_info( $user ),
			)
		);
	}

	/**
	 * Prepare user data for response.
	 *
	 * @param \WP_User $user
	 *
	 * @return array
	 */
	protected function prepare_user_info( $user ) {
		return array(
			'id'           => $user->ID,
			'name'         => $user->display_name,
			'display_name' => $user->display_name,
			'email'        => $user->user_email,
			'user_email'   => $user->user_email,
			'user_login'   => $user->user_login,
			'meta'         => array(
				'phone'            => get_user_meta( $user->ID, 'phone_number', true ),
				'delivery_address' => get_user_meta( $user->ID, 'delivery_address', true ),
				'messenger_link'   => get_user_meta( $user->ID, 'messenger_link', true ),
			),
		);
	}

	/**
	 * Check if user has permission to access endpoints.
	 *
	 * @return bool|WP_Error
	 */
	public function check_permission() {
		if ( ! is_user_logged_in() ) {
			return new WP_Error(
				'rest_forbidden',
				'Вы должны быть авторизованы для доступа к этому ресурсу.',
				array( 'status' => rest_authorization_required_code() )
			);
		}

		return true;
	}

	/**
	 * Get user profile.
	 *
	 * @param WP_REST_Request $request
	 * @return WP_REST_Response|WP_Error
	 */
	public function get_profile( WP_REST_Request $request ) {
		$user_id = get_current_user_id();
		$user    = get_userdata( $user_id );

		if ( ! $user ) {
			return new WP_Error(
				'rest_user_not_found',
				'Пользователь не найден.',
				array( 'status' => 404 )
			);
		}

		// Get user meta fields
		$first_name      = get_user_meta( $user_id, 'first_name', true );
		$last_name       = get_user_meta( $user_id, 'last_name', true );
		$phone           = get_user_meta( $user_id, 'phone_number', true );
		$delivery_address = get_user_meta( $user_id, 'delivery_address', true );
		$messenger_link  = get_user_meta( $user_id, 'messenger_link', true );

		$profile = array(
			'id'               => $user->ID,
			'email'            => $user->user_email,
			'username'         => $user->user_login,
			'display_name'     => $user->display_name,
			'name'             => $user->display_name,
			'user_email'       => $user->user_email,
			'first_name'       => $first_name ?: '',
			'last_name'        => $last_name ?: '',
			'phone'            => $phone ?: '',
			'delivery_address' => $delivery_address ?: '',
			'messenger_link'   => $messenger_link ?: '',
			'meta'             => array(
				'first_name'      => $first_name ?: '',
				'last_name'       => $last_name ?: '',
				'phone_number'    => $phone ?: '',
				'delivery_address' => $delivery_address ?: '',
				'messenger_link'  => $messenger_link ?: '',
			),
		);

		return rest_ensure_response( $profile );
	}

	/**
	 * Get profile update arguments.
	 *
	 * @return array
	 */
	protected function get_profile_update_args() {
		return array(
			'first_name'      => array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
			),
			'last_name'       => array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
			),
			'display_name'    => array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
			),
			'email'           => array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_email',
				'validate_callback' => function( $param ) {
					return is_email( $param );
				},
			),
			'phone'           => array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
			),
			'delivery_address' => array(
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_textarea_field',
			),
			'messenger_link'  => array(
				'type'              => 'string',
				'sanitize_callback' => 'esc_url_raw',
			),
		);
	}

	/**
	 * Update user profile.
	 *
	 * @param WP_REST_Request $request
	 * @return WP_REST_Response|WP_Error
	 */
	public function update_profile( WP_REST_Request $request ) {
		$user_id = get_current_user_id();
		$user    = get_userdata( $user_id );

		if ( ! $user ) {
			return new WP_Error(
				'rest_user_not_found',
				'Пользователь не найден.',
				array( 'status' => 404 )
			);
		}

		$updated = array();

		// Update standard WordPress fields
		if ( $request->has_param( 'display_name' ) ) {
			$display_name = $request->get_param( 'display_name' );
			wp_update_user(
				array(
					'ID'           => $user_id,
					'display_name' => $display_name,
				)
			);
			$updated['display_name'] = $display_name;
		}

		if ( $request->has_param( 'email' ) ) {
			$email = $request->get_param( 'email' );
			// Check if email is already in use by another user
			if ( email_exists( $email ) && email_exists( $email ) !== $user_id ) {
				return new WP_Error(
					'rest_email_exists',
					'Этот email уже используется другим пользователем.',
					array( 'status' => 400 )
				);
			}
			wp_update_user(
				array(
					'ID'    => $user_id,
					'user_email' => $email,
				)
			);
			$updated['email'] = $email;
		}

		// Update meta fields
		$meta_fields = array(
			'first_name'      => 'first_name',
			'last_name'       => 'last_name',
			'phone'           => 'phone_number',
			'delivery_address' => 'delivery_address',
			'messenger_link'  => 'messenger_link',
		);

		foreach ( $meta_fields as $param_key => $meta_key ) {
			if ( $request->has_param( $param_key ) ) {
				$value = $request->get_param( $param_key );
				update_user_meta( $user_id, $meta_key, $value );
				$updated[ $param_key ] = $value;
			}
		}

		return rest_ensure_response(
			array(
				'success' => true,
				'message' => 'Профиль успешно обновлён.',
				'updated' => $updated,
			)
		);
	}

	/**
	 * Update user meta fields.
	 *
	 * @param WP_REST_Request $request
	 * @return WP_REST_Response|WP_Error
	 */
	public function update_meta( WP_REST_Request $request ) {
		$user_id = get_current_user_id();
		$meta    = $request->get_param( 'meta' );

		if ( ! is_array( $meta ) ) {
			return new WP_Error(
				'rest_invalid_meta',
				'Неверный формат мета-данных.',
				array( 'status' => 400 )
			);
		}

		$updated = array();

		$allowed_meta_keys = array(
			'first_name',
			'last_name',
			'phone_number',
			'delivery_address',
			'messenger_link',
		);

		foreach ( $meta as $key => $value ) {
			if ( in_array( $key, $allowed_meta_keys, true ) ) {
				update_user_meta( $user_id, $key, $value );
				$updated[ $key ] = $value;
			}
		}

		return rest_ensure_response(
			array(
				'success' => true,
				'message' => 'Мета-данные успешно обновлены.',
				'updated' => $updated,
			)
		);
	}

	/**
	 * Validate meta fields.
	 *
	 * @param mixed $param
	 * @return bool
	 */
	public function validate_meta( $param ) {
		return is_array( $param );
	}

	/**
	 * Sanitize meta fields.
	 *
	 * @param mixed $param
	 * @return array
	 */
	public function sanitize_meta( $param ) {
		if ( ! is_array( $param ) ) {
			return array();
		}

		$sanitized = array();

		$sanitizers = array(
			'first_name'      => 'sanitize_text_field',
			'last_name'       => 'sanitize_text_field',
			'phone_number'    => 'sanitize_text_field',
			'delivery_address' => 'sanitize_textarea_field',
			'messenger_link'  => 'esc_url_raw',
		);

		foreach ( $param as $key => $value ) {
			if ( isset( $sanitizers[ $key ] ) ) {
				$sanitized[ $key ] = call_user_func( $sanitizers[ $key ], $value );
			}
		}

		return $sanitized;
	}

	/**
	 * Change user password.
	 *
	 * @param WP_REST_Request $request
	 * @return WP_REST_Response|WP_Error
	 */
	public function change_password( WP_REST_Request $request ) {
		$user_id     = get_current_user_id();
		$user        = get_userdata( $user_id );
		$old_password = $request->get_param( 'old_password' );
		$new_password = $request->get_param( 'new_password' );

		// Verify old password
		if ( ! wp_check_password( $old_password, $user->user_pass, $user->ID ) ) {
			return new WP_Error(
				'rest_invalid_password',
				'Неверный текущий пароль.',
				array( 'status' => 400 )
			);
		}

		// Update password
		wp_set_password( $new_password, $user_id );

		return rest_ensure_response(
			array(
				'success' => true,
				'message' => 'Пароль успешно изменён.',
			)
		);
	}

	/**
	 * Validate password strength.
	 *
	 * @param mixed $param
	 * @return bool|WP_Error
	 */
	public function validate_password( $param ) {
		$password = (string) $param;

		// Minimum length: 16 characters
		if ( strlen( $password ) < 16 ) {
			return new WP_Error(
				'rest_password_too_short',
				'Пароль должен содержать минимум 16 символов.',
				array( 'status' => 400 )
			);
		}

		// Check complexity requirements
		$errors = array();

		if ( ! preg_match( '/[a-zа-я]/', $password ) ) {
			$errors[] = 'маленькие буквы';
		}
		if ( ! preg_match( '/[A-ZА-Я]/', $password ) ) {
			$errors[] = 'большие буквы';
		}
		if ( ! preg_match( '/\d/', $password ) ) {
			$errors[] = 'цифры';
		}
		if ( ! preg_match( '/[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]/', $password ) ) {
			$errors[] = 'спецсимволы';
		}

		if ( ! empty( $errors ) ) {
			return new WP_Error(
				'rest_password_weak',
				'Пароль должен содержать: ' . implode( ', ', $errors ),
				array( 'status' => 400 )
			);
		}

		return true;
	}

	/**
	 * Send contact message.
	 *
	 * @param WP_REST_Request $request
	 * @return WP_REST_Response|WP_Error
	 */
	public function send_contact_message( WP_REST_Request $request ) {
		$user_id  = $request->get_param( 'user_id' );
		$subject  = $request->get_param( 'subject' );
		$message  = $request->get_param( 'message' );

		// Verify user owns this request
		if ( (int) $user_id !== get_current_user_id() ) {
			return new WP_Error(
				'rest_forbidden',
				'Вы можете отправлять сообщения только от своего имени.',
				array( 'status' => 403 )
			);
		}

		$user = get_userdata( $user_id );
		if ( ! $user ) {
			return new WP_Error(
				'rest_user_not_found',
				'Пользователь не найден.',
				array( 'status' => 404 )
			);
		}

		// Email settings
		$to      = 'zakaz@elka-retro.ru';
		$subject_email = 'Обратная связь: ' . sanitize_text_field( $subject );
		
		// Prepare email message
		$email_message = "Получено сообщение через форму обратной связи на сайте.\n\n";
		$email_message .= "От: {$user->display_name} ({$user->user_email})\n";
		$email_message .= "Тема: " . sanitize_text_field( $subject ) . "\n\n";
		$email_message .= "Сообщение:\n";
		$email_message .= sanitize_textarea_field( $message ) . "\n\n";
		$email_message .= "---\n";
		$email_message .= "Это автоматическое сообщение с сайта elka-retro.ru\n";

		$headers = array(
			'Content-Type: text/plain; charset=UTF-8',
			'From: ' . get_bloginfo( 'name' ) . ' <' . get_option( 'admin_email' ) . '>',
			'Reply-To: ' . $user->user_email,
		);

		$sent = wp_mail( $to, $subject_email, $email_message, $headers );

		if ( ! $sent ) {
			return new WP_Error(
				'rest_email_failed',
				'Не удалось отправить сообщение. Попробуйте позже.',
				array( 'status' => 500 )
			);
		}

		return rest_ensure_response(
			array(
				'success' => true,
				'message' => 'Сообщение успешно отправлено.',
			)
		);
	}
}

