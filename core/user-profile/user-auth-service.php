<?php
/**
 * User Authentication Service.
 *
 * Responsibilities:
 * - Business logic for code-based authentication.
 * - Code generation, storage, and validation.
 * - Rate limiting and daily limits.
 * - Account blocking.
 * - User creation for new accounts.
 */

namespace Elkaretro\Core\UserProfile;

use WP_Error;
use WP_User;

defined( 'ABSPATH' ) || exit;

class User_Auth_Service {

	/**
	 * Prefix for transient keys.
	 */
	const CODE_PREFIX = 'elkaretro_auth_code_';

	/**
	 * Prefix for backup option keys.
	 */
	const CODE_BACKUP_PREFIX = 'elkaretro_auth_code_backup_';

	/**
	 * Code expiry time (24 hours).
	 */
	const CODE_EXPIRY = 24 * HOUR_IN_SECONDS;

	/**
	 * Rate limit between code requests (180 seconds = 3 minutes).
	 */
	const RATE_LIMIT_SECONDS = 180;

	/**
	 * Maximum daily code requests (10 per 24 hours).
	 */
	const DAILY_LIMIT = 10;

	/**
	 * Maximum code verification attempts before blocking (10 attempts).
	 */
	const MAX_ATTEMPTS = 10;

	/**
	 * Block duration after max attempts (3 hours).
	 */
	const BLOCK_DURATION_HOURS = 3;

	/**
	 * Request code for authentication/registration.
	 *
	 * @param string $email User email.
	 * @return array|WP_Error Code data or error.
	 */
	public function request_code( $email ) {
		$email = strtolower( trim( $email ) );

		// Validate email format
		if ( ! is_email( $email ) ) {
			return new WP_Error(
				'invalid_email',
				'Некорректный формат email.',
				array( 'status' => 400 )
			);
		}

		// Check if user exists
		$user = get_user_by( 'email', $email );

		// If user exists, check if admin
		if ( $user ) {
			if ( $this->is_admin_user( $user->ID ) ) {
				return new WP_Error(
					'admin_not_allowed',
					'Администраторы не могут использовать эту систему авторизации.',
					array( 'status' => 403 )
				);
			}
		}

		// Get existing code data
		$existing_code = $this->get_code( $email );

		// Check rate limiting (180 seconds)
		if ( $existing_code ) {
			$rate_limit_check = $this->check_rate_limit( $email, $existing_code );
			if ( is_wp_error( $rate_limit_check ) ) {
				return $rate_limit_check;
			}
		}

		// Check daily limit (10 codes per 24 hours rolling window)
		// Check BEFORE incrementing counter
		$daily_limit_check = $this->check_daily_limit( $email, $existing_code );
		if ( is_wp_error( $daily_limit_check ) ) {
			return $daily_limit_check;
		}

		// Check if account is blocked
		if ( $existing_code && $this->is_account_blocked( $existing_code ) ) {
			$blocked_until = $existing_code['blocked_until'];
			$hours_remaining = ceil( ( $blocked_until - time() ) / HOUR_IN_SECONDS );
			return new WP_Error(
				'too_many_attempts',
				sprintf( 'Заблокировано на %d часа.', $hours_remaining ),
				array(
					'status' => 429,
					'blocked_until' => $blocked_until,
				)
			);
		}

		// Create user if not exists
		if ( ! $user ) {
			$user_result = $this->create_user_if_not_exists( $email );
			if ( is_wp_error( $user_result ) ) {
				return $user_result;
			}
			$user = get_user_by( 'ID', $user_result );
			$is_new_user = true;
		} else {
			$is_new_user = false;
		}

		// Generate new code
		$code = $this->generate_code();

		// Get client IP and user agent
		$ip = $this->get_client_ip();
		$user_agent = isset( $_SERVER['HTTP_USER_AGENT'] ) ? $_SERVER['HTTP_USER_AGENT'] : '';

		// Calculate codes sent today
		$codes_sent_today = $this->get_codes_sent_today( $email, $existing_code );
		$last_code_sent_at = time();

		// Prepare code data
		$code_data = array(
			'code' => $code,
			'email' => $email,
			'generated_at' => time(),
			'expires_at' => time() + self::CODE_EXPIRY,
			'attempts' => isset( $existing_code['attempts'] ) ? $existing_code['attempts'] : 0,
			'blocked_until' => isset( $existing_code['blocked_until'] ) ? $existing_code['blocked_until'] : null,
			'codes_sent_today' => $codes_sent_today,
			'last_code_sent_at' => $last_code_sent_at,
			'ip' => $ip,
			'user_agent' => $user_agent,
		);

		// Save code
		$this->save_code( $email, $code_data );

		// Send emails
		require_once __DIR__ . '/user-email-templates.php';
		$email_templates = new User_Email_Templates();

		if ( $is_new_user ) {
			// Send registration email
			$email_templates->send_registration_email( $email );
		}

		// Send code email
		$email_templates->send_code_email( $email, $code, $code_data['generated_at'], $ip, $user_agent );

		// Calculate retry after (seconds until next code can be requested)
		$retry_after = self::RATE_LIMIT_SECONDS;

		return array(
			'success' => true,
			'message' => 'Код отправлен на почту',
			'can_resend_after' => $retry_after,
		);
	}

	/**
	 * Verify code and authenticate user.
	 *
	 * @param string $email User email.
	 * @param string $code Verification code.
	 * @return array|WP_Error User data or error.
	 */
	public function verify_code( $email, $code ) {
		$email = strtolower( trim( $email ) );
		$code = trim( $code );

		// Validate email format
		if ( ! is_email( $email ) ) {
			return new WP_Error(
				'invalid_email',
				'Некорректный формат email.',
				array( 'status' => 400 )
			);
		}

		// Validate code format (6 digits)
		if ( ! preg_match( '/^\d{6}$/', $code ) ) {
			return new WP_Error(
				'invalid_code_format',
				'Код должен состоять из 6 цифр.',
				array( 'status' => 400 )
			);
		}

		// Get user
		$user = get_user_by( 'email', $email );
		if ( ! $user ) {
			return new WP_Error(
				'user_not_found',
				'Пользователь не найден.',
				array( 'status' => 404 )
			);
		}

		// Check if admin
		if ( $this->is_admin_user( $user->ID ) ) {
			return new WP_Error(
				'admin_not_allowed',
				'Администраторы не могут использовать эту систему авторизации.',
				array( 'status' => 403 )
			);
		}

		// Get code data
		$code_data = $this->get_code( $email );
		if ( ! $code_data ) {
			return new WP_Error(
				'code_not_found',
				'Код не найден. Запросите новый код.',
				array( 'status' => 400 )
			);
		}

		// Check if account is blocked
		if ( $this->is_account_blocked( $code_data ) ) {
			$blocked_until = $code_data['blocked_until'];
			$hours_remaining = ceil( ( $blocked_until - time() ) / HOUR_IN_SECONDS );
			return new WP_Error(
				'too_many_attempts',
				sprintf( 'Заблокировано на %d часа.', $hours_remaining ),
				array(
					'status' => 429,
					'blocked_until' => $blocked_until,
				)
			);
		}

		// Check if code expired
		if ( $this->is_code_expired( $code_data ) ) {
			// Auto-send new code if rate limit allows
			$rate_limit_check = $this->check_rate_limit( $email, $code_data );
			if ( is_wp_error( $rate_limit_check ) ) {
				// Rate limit active, return error
				return new WP_Error(
					'code_expired',
					'Код истёк. Запросите новый код.',
					array(
						'status' => 400,
						'new_code_sent' => false,
					)
				);
			}

			// Generate and send new code
			$new_code = $this->generate_code();
			$ip = $this->get_client_ip();
			$user_agent = isset( $_SERVER['HTTP_USER_AGENT'] ) ? $_SERVER['HTTP_USER_AGENT'] : '';

			$new_code_data = array(
				'code' => $new_code,
				'email' => $email,
				'generated_at' => time(),
				'expires_at' => time() + self::CODE_EXPIRY,
				'attempts' => 0, // Reset attempts for new code
				'blocked_until' => null,
				'codes_sent_today' => $this->get_codes_sent_today( $email, $code_data ),
				'last_code_sent_at' => time(),
				'ip' => $ip,
				'user_agent' => $user_agent,
			);

			$this->save_code( $email, $new_code_data );

			// Send new code email
			require_once __DIR__ . '/user-email-templates.php';
			$email_templates = new User_Email_Templates();
			$email_templates->send_code_email( $email, $new_code, $new_code_data['generated_at'], $ip, $user_agent );

			return new WP_Error(
				'code_expired',
				'Старый код истёк, мы вам на почту отправили новый код',
				array(
					'status' => 400,
					'new_code_sent' => true,
				)
			);
		}

		// Verify code
		if ( $code_data['code'] !== $code ) {
			// Increment attempts
			$this->increment_attempts( $email, $code_data );

			// Check if should block
			$updated_code_data = $this->get_code( $email );
			if ( $updated_code_data && $updated_code_data['attempts'] >= self::MAX_ATTEMPTS ) {
				$this->block_account( $email, self::BLOCK_DURATION_HOURS );
				return new WP_Error(
					'too_many_attempts',
					sprintf( 'Заблокировано на %d часа.', self::BLOCK_DURATION_HOURS ),
					array(
						'status' => 429,
						'blocked_until' => time() + ( self::BLOCK_DURATION_HOURS * HOUR_IN_SECONDS ),
					)
				);
			}

			return new WP_Error(
				'invalid_code',
				'Код неверный',
				array( 'status' => 400 )
			);
		}

		// Code is valid - authenticate user
		wp_set_current_user( $user->ID );
		wp_set_auth_cookie( $user->ID, false );

		// Set email verified flag (if first time)
		if ( ! get_user_meta( $user->ID, 'email_verified', true ) ) {
			update_user_meta( $user->ID, 'email_verified', true );
		}

		// Delete code after successful verification
		$this->delete_code( $email );

		// Prepare user info
		$user_info = $this->prepare_user_info( $user );

		// Note: We don't generate nonce here because WordPress REST API
		// validates nonce through cookies, which may not be set yet in the browser.
		// Instead, client should request nonce via /auth/nonce endpoint
		// after cookies are established.

		return array(
			'success' => true,
			'user' => $user_info,
		);
	}

	/**
	 * Generate 6-digit code.
	 *
	 * @return string 6-digit code.
	 */
	public function generate_code() {
		return str_pad( wp_rand( 0, 999999 ), 6, '0', STR_PAD_LEFT );
	}

	/**
	 * Check rate limit (180 seconds between requests).
	 *
	 * @param string $email User email.
	 * @param array  $code_data Existing code data.
	 * @return bool|WP_Error True if allowed, WP_Error if rate limited.
	 */
	public function check_rate_limit( $email, $code_data ) {
		if ( ! isset( $code_data['last_code_sent_at'] ) ) {
			return true;
		}

		$time_since_last = time() - $code_data['last_code_sent_at'];
		if ( $time_since_last < self::RATE_LIMIT_SECONDS ) {
			$retry_after = self::RATE_LIMIT_SECONDS - $time_since_last;
			return new WP_Error(
				'too_frequent',
				sprintf( 'Слишком частые запросы. Попробуйте через %d секунд.', $retry_after ),
				array(
					'status' => 429,
					'retry_after' => $retry_after,
				)
			);
		}

		return true;
	}

	/**
	 * Check daily limit (10 codes per 24 hours).
	 *
	 * @param string $email User email.
	 * @param array  $code_data Existing code data.
	 * @return bool|WP_Error True if allowed, WP_Error if limit exceeded.
	 */
	public function check_daily_limit( $email, $code_data ) {
		if ( ! $code_data ) {
			return true; // No previous codes, limit not reached
		}

		// Check if 24 hours passed since last code sent
		$last_sent = $code_data['last_code_sent_at'] ?? 0;
		$time_since_last = time() - $last_sent;

		if ( $time_since_last >= 24 * HOUR_IN_SECONDS ) {
			// More than 24 hours passed, reset counter
			return true;
		}

		// Check daily limit
		$codes_sent_today = $code_data['codes_sent_today'] ?? 0;
		if ( $codes_sent_today >= self::DAILY_LIMIT ) {
			return new WP_Error(
				'daily_limit_exceeded',
				'Превышен лимит отправок кодов (10 в сутки). Попробуйте позже.',
				array(
					'status' => 429,
					'retry_after' => 86400, // 24 hours
				)
			);
		}

		return true;
	}

	/**
	 * Get codes sent today count.
	 *
	 * @param string $email User email.
	 * @param array  $existing_code Existing code data.
	 * @return int Number of codes sent today.
	 */
	private function get_codes_sent_today( $email, $existing_code = null ) {
		if ( ! $existing_code || ! isset( $existing_code['last_code_sent_at'] ) ) {
			return 1; // First code today
		}

		$last_sent = $existing_code['last_code_sent_at'];
		$today_start = strtotime( 'today' );

		// If last code was sent today, increment counter
		if ( $last_sent >= $today_start ) {
			return ( $existing_code['codes_sent_today'] ?? 0 ) + 1;
		}

		// Last code was yesterday or earlier, reset counter
		return 1;
	}

	/**
	 * Save code to transient and backup option.
	 *
	 * @param string $email User email.
	 * @param array  $code_data Code data.
	 * @return void
	 */
	public function save_code( $email, $code_data ) {
		$key = self::CODE_PREFIX . md5( $email );
		$backup_key = self::CODE_BACKUP_PREFIX . md5( $email );

		// Save to transient (auto-expires in 24 hours)
		set_transient( $key, $code_data, self::CODE_EXPIRY );

		// Save to options as backup
		update_option( $backup_key, $code_data );
	}

	/**
	 * Get code from transient (with fallback to option).
	 *
	 * @param string $email User email.
	 * @return array|false Code data or false if not found.
	 */
	public function get_code( $email ) {
		$key = self::CODE_PREFIX . md5( $email );
		$backup_key = self::CODE_BACKUP_PREFIX . md5( $email );

		// Try transient first
		$code_data = get_transient( $key );
		if ( $code_data !== false ) {
			return $code_data;
		}

		// Fallback to option
		$code_data = get_option( $backup_key, false );
		return $code_data;
	}

	/**
	 * Delete code from transient and option.
	 *
	 * @param string $email User email.
	 * @return void
	 */
	public function delete_code( $email ) {
		$key = self::CODE_PREFIX . md5( $email );
		$backup_key = self::CODE_BACKUP_PREFIX . md5( $email );

		delete_transient( $key );
		delete_option( $backup_key );
	}

	/**
	 * Check if code is expired.
	 *
	 * @param array $code_data Code data.
	 * @return bool True if expired.
	 */
	public function is_code_expired( $code_data ) {
		if ( ! isset( $code_data['expires_at'] ) ) {
			return true;
		}

		return time() > $code_data['expires_at'];
	}

	/**
	 * Check if account is blocked.
	 *
	 * @param array $code_data Code data.
	 * @return bool True if blocked.
	 */
	public function is_account_blocked( $code_data ) {
		if ( ! isset( $code_data['blocked_until'] ) || ! $code_data['blocked_until'] ) {
			return false;
		}

		return time() < $code_data['blocked_until'];
	}

	/**
	 * Increment verification attempts.
	 *
	 * @param string $email User email.
	 * @param array  $code_data Existing code data.
	 * @return void
	 */
	public function increment_attempts( $email, $code_data ) {
		$code_data['attempts'] = ( $code_data['attempts'] ?? 0 ) + 1;
		$this->save_code( $email, $code_data );
	}

	/**
	 * Block account for specified hours.
	 *
	 * @param string $email User email.
	 * @param int    $hours Hours to block.
	 * @return void
	 */
	public function block_account( $email, $hours ) {
		$code_data = $this->get_code( $email );
		if ( ! $code_data ) {
			return;
		}

		$code_data['blocked_until'] = time() + ( $hours * HOUR_IN_SECONDS );
		$this->save_code( $email, $code_data );
	}

	/**
	 * Get client IP address.
	 *
	 * @return string IP address.
	 */
	public function get_client_ip() {
		$ip_keys = array( 'HTTP_CLIENT_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR' );
		foreach ( $ip_keys as $key ) {
			if ( array_key_exists( $key, $_SERVER ) === true ) {
				foreach ( explode( ',', $_SERVER[ $key ] ) as $ip ) {
					$ip = trim( $ip );
					if ( filter_var( $ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE ) !== false ) {
						return $ip;
					}
				}
			}
		}
		return isset( $_SERVER['REMOTE_ADDR'] ) ? $_SERVER['REMOTE_ADDR'] : '0.0.0.0';
	}

	/**
	 * Check if user is admin.
	 *
	 * @param int $user_id User ID.
	 * @return bool True if admin.
	 */
	public function is_admin_user( $user_id ) {
		return user_can( $user_id, 'manage_options' );
	}

	/**
	 * Create user if not exists.
	 *
	 * @param string $email User email.
	 * @return int|WP_Error User ID or error.
	 */
	public function create_user_if_not_exists( $email ) {
		// Check if user already exists
		$existing_user = get_user_by( 'email', $email );
		if ( $existing_user ) {
			return $existing_user->ID;
		}

		// Generate random password (not shared with user)
		$password = wp_generate_password( 20, true, true );

		// Create user (email as username)
		$user_id = wp_create_user( $email, $password, $email );

		if ( is_wp_error( $user_id ) ) {
			return $user_id;
		}

		return $user_id;
	}

	/**
	 * Prepare user info for response.
	 *
	 * @param WP_User $user User object.
	 * @return array User info.
	 */
	private function prepare_user_info( $user ) {
		return array(
			'id' => $user->ID,
			'email' => $user->user_email,
			'username' => $user->user_login,
			'email_verified' => (bool) get_user_meta( $user->ID, 'email_verified', true ),
		);
	}
}

