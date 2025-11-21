<?php
/**
 * Email Service.
 *
 * Responsibilities:
 * - Send emails via wp_mail().
 * - SMTP integration via phpmailer_init filter.
 * - Logging via Email_Log_Repository.
 * - Get settings via Email_Settings.
 */

namespace Elkaretro\Core\Email;

use WP_Error;

defined( 'ABSPATH' ) || exit;

class Email_Service {

	/**
	 * Send email.
	 *
	 * @param string $to Email recipient.
	 * @param string $subject Email subject.
	 * @param string $message Email message (HTML or text).
	 * @param array  $args {
	 *     @type string $content_type 'html' or 'text' (default: 'html').
	 *     @type array  $headers Additional headers (Reply-To, CC, BCC).
	 *     @type array  $context Context for logging (order_id, template_type, etc.).
	 * }
	 * @return bool|WP_Error True on success, WP_Error on failure.
	 */
	public static function send( $to, $subject, $message, $args = array() ) {
		$to = sanitize_email( $to );
		if ( ! is_email( $to ) ) {
			return new WP_Error(
				'email_invalid_recipient',
				__( 'Invalid email address.', 'elkaretro' ),
				array( 'status' => 400 )
			);
		}

		$content_type = isset( $args['content_type'] ) && $args['content_type'] === 'text' ? 'text' : 'html';
		$headers      = isset( $args['headers'] ) && is_array( $args['headers'] ) ? $args['headers'] : array();
		$context      = isset( $args['context'] ) && is_array( $args['context'] ) ? $args['context'] : array();

		// Prepare headers.
		$email_headers = self::prepare_headers( $content_type, $headers );

		// Setup SMTP if enabled.
		$smtp_enabled = Email_Settings::get( 'smtp_enabled' );
		if ( $smtp_enabled ) {
			add_filter( 'phpmailer_init', array( __CLASS__, 'configure_smtp' ), 10, 1 );
		}

		// Send email.
		$sent = wp_mail( $to, $subject, $message, $email_headers );

		// Remove SMTP filter.
		if ( $smtp_enabled ) {
			remove_filter( 'phpmailer_init', array( __CLASS__, 'configure_smtp' ), 10 );
		}

		// Log result.
		$log_repository = new Email_Log_Repository();
		$log_data       = array(
			'to_email'     => $to,
			'subject'      => $subject,
			'sent_result'  => $sent ? 'sent' : 'failed',
			'error_message' => $sent ? '' : __( 'wp_mail() returned false.', 'elkaretro' ),
			'context'      => $context,
		);

		$log_repository->create( $log_data );

		return $sent ? true : new WP_Error(
			'email_send_failed',
			__( 'Failed to send email.', 'elkaretro' ),
			array( 'status' => 500 )
		);
	}

	/**
	 * Prepare email headers.
	 *
	 * @param string $content_type 'html' or 'text'.
	 * @param array  $additional_headers Additional headers.
	 * @return array Headers array.
	 */
	private static function prepare_headers( $content_type, $additional_headers = array() ) {
		$headers = array();

		// Content-Type header.
		$charset = get_bloginfo( 'charset' );
		if ( $content_type === 'html' ) {
			$headers[] = "Content-Type: text/html; charset={$charset}";
		} else {
			$headers[] = "Content-Type: text/plain; charset={$charset}";
		}

		// From header.
		$from_name  = Email_Settings::get_default_from_name();
		$from_email = Email_Settings::get_default_from_email();
		$headers[]  = "From: {$from_name} <{$from_email}>";

		// Additional headers.
		foreach ( $additional_headers as $header ) {
			if ( is_string( $header ) ) {
				$headers[] = $header;
			}
		}

		return $headers;
	}

	/**
	 * Configure PHPMailer for SMTP.
	 *
	 * @param \PHPMailer\PHPMailer\PHPMailer $phpmailer PHPMailer instance.
	 * @return void
	 */
	public static function configure_smtp( $phpmailer ) {
		$smtp_host = Email_Settings::get( 'smtp_host' );
		$smtp_port = Email_Settings::get( 'smtp_port' );
		$smtp_secure = Email_Settings::get( 'smtp_secure' );
		$smtp_auth = Email_Settings::get( 'smtp_auth' );
		$smtp_username = Email_Settings::get( 'smtp_username' );
		$smtp_password = Email_Settings::get( 'smtp_password' );

		if ( empty( $smtp_host ) ) {
			return;
		}

		$phpmailer->isSMTP();
		$phpmailer->Host       = $smtp_host;
		$phpmailer->SMTPAuth   = $smtp_auth;
		$phpmailer->Port       = $smtp_port;
		$phpmailer->SMTPSecure = $smtp_secure === 'ssl' ? 'ssl' : 'tls';

		if ( $smtp_auth ) {
			$phpmailer->Username = $smtp_username;
			$phpmailer->Password = $smtp_password;
		}

		// Set From address from settings.
		$from_name  = Email_Settings::get_default_from_name();
		$from_email = Email_Settings::get_default_from_email();
		$phpmailer->setFrom( $from_email, $from_name );
	}
}

