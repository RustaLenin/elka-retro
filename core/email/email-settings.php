<?php
/**
 * Email Settings Manager.
 *
 * Responsibilities:
 * - Work with WP options for SMTP settings.
 * - Integration with ELKARETRO_THEME_SETTINGS.
 * - Methods: get(), set(), get_all(), update_all().
 */

namespace Elkaretro\Core\Email;

defined( 'ABSPATH' ) || exit;

class Email_Settings {

	/**
	 * Option prefix.
	 */
	const OPTION_PREFIX = 'elkaretro_email_';

	/**
	 * Default settings.
	 */
	private static $defaults = array(
		'smtp_enabled'   => false,
		'smtp_host'      => '',
		'smtp_port'      => 587,
		'smtp_secure'     => 'tls',
		'smtp_auth'       => true,
		'smtp_username'   => '',
		'smtp_password'   => '',
		'from_name'       => '',
		'from_email'      => '',
	);

	/**
	 * Get setting value.
	 *
	 * @param string $key Setting key.
	 * @param mixed  $default Default value.
	 * @return mixed Setting value.
	 */
	public static function get( $key, $default = null ) {
		$option_key = self::OPTION_PREFIX . $key;

		if ( isset( self::$defaults[ $key ] ) ) {
			$default = self::$defaults[ $key ];
		}

		$value = get_option( $option_key, $default );

		// Type casting for specific keys.
		if ( in_array( $key, array( 'smtp_enabled', 'smtp_auth' ), true ) ) {
			return filter_var( $value, FILTER_VALIDATE_BOOLEAN );
		}

		if ( $key === 'smtp_port' ) {
			return absint( $value );
		}

		return $value;
	}

	/**
	 * Set setting value.
	 *
	 * @param string $key Setting key.
	 * @param mixed  $value Setting value.
	 * @return bool Success.
	 */
	public static function set( $key, $value ) {
		$option_key = self::OPTION_PREFIX . $key;

		// Sanitize value based on key.
		$sanitized = self::sanitize_value( $key, $value );

		return update_option( $option_key, $sanitized );
	}

	/**
	 * Get all settings.
	 *
	 * @return array All settings.
	 */
	public static function get_all() {
		$settings = array();
		foreach ( array_keys( self::$defaults ) as $key ) {
			$settings[ $key ] = self::get( $key );
		}
		return $settings;
	}

	/**
	 * Update all settings from associative array.
	 *
	 * @param array $settings Associative array of settings.
	 * @return array {
	 *     @type bool   $success Whether all updates succeeded.
	 *     @type array  $updated List of updated keys.
	 *     @type array  $errors  List of errors.
	 * }
	 */
	public static function update_all( $settings ) {
		if ( ! is_array( $settings ) ) {
			return array(
				'success' => false,
				'updated' => array(),
				'errors'  => array( __( 'Settings must be an array.', 'elkaretro' ) ),
			);
		}

		$updated = array();
		$errors  = array();

		foreach ( $settings as $key => $value ) {
			// Validate key exists in defaults.
			if ( ! isset( self::$defaults[ $key ] ) ) {
				$errors[] = sprintf( __( 'Unknown setting key: %s', 'elkaretro' ), $key );
				continue;
			}

			$result = self::set( $key, $value );
			if ( $result ) {
				$updated[] = $key;
			} else {
				$errors[] = sprintf( __( 'Failed to update setting: %s', 'elkaretro' ), $key );
			}
		}

		return array(
			'success' => empty( $errors ),
			'updated' => $updated,
			'errors'  => $errors,
		);
	}

	/**
	 * Sanitize setting value based on key.
	 *
	 * @param string $key Setting key.
	 * @param mixed  $value Raw value.
	 * @return mixed Sanitized value.
	 */
	private static function sanitize_value( $key, $value ) {
		switch ( $key ) {
			case 'smtp_enabled':
			case 'smtp_auth':
				return filter_var( $value, FILTER_VALIDATE_BOOLEAN );

			case 'smtp_port':
				return absint( $value );

			case 'smtp_secure':
				return in_array( $value, array( 'tls', 'ssl' ), true ) ? $value : 'tls';

			case 'smtp_host':
			case 'smtp_username':
				return sanitize_text_field( $value );

			case 'smtp_password':
				// Password is stored as-is (encrypted by WP if needed).
				return $value;

			case 'from_name':
				return sanitize_text_field( $value );

			case 'from_email':
				return sanitize_email( $value );

			default:
				return sanitize_text_field( $value );
		}
	}

	/**
	 * Get default from name (site name).
	 *
	 * @return string
	 */
	public static function get_default_from_name() {
		$custom = self::get( 'from_name' );
		if ( ! empty( $custom ) ) {
			return $custom;
		}
		return get_bloginfo( 'name' );
	}

	/**
	 * Get default from email (admin email).
	 *
	 * @return string
	 */
	public static function get_default_from_email() {
		$custom = self::get( 'from_email' );
		if ( ! empty( $custom ) ) {
			return $custom;
		}
		return get_option( 'admin_email' );
	}
}

