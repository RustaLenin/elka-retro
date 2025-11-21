<?php
/**
 * Email Log Post Type Registration.
 *
 * Responsibilities:
 * - Register Custom Post Type for email logs.
 * - Hide from standard WordPress UI.
 * - Use standard 'publish' status (result stored in meta field _sent_result).
 */

namespace Elkaretro\Core\Email;

defined( 'ABSPATH' ) || exit;

class Email_Post_Type {

	/**
	 * Post type slug.
	 */
	const POST_TYPE = 'elkaretro_email_log';

	/**
	 * Initialize post type registration.
	 *
	 * @return void
	 */
	public static function init() {
		add_action( 'init', array( __CLASS__, 'register_post_type' ) );
	}

	/**
	 * Register Custom Post Type for email logs.
	 *
	 * @return void
	 */
	public static function register_post_type() {
		register_post_type(
			self::POST_TYPE,
			array(
				'label'                 => __( 'Email Logs', 'elkaretro' ),
				'labels'                => array(
					'name'          => __( 'Email Logs', 'elkaretro' ),
					'singular_name' => __( 'Email Log', 'elkaretro' ),
					'menu_name'     => __( 'Email Logs', 'elkaretro' ),
				),
				'public'                => false,
				'show_ui'               => false,
				'show_in_menu'          => false,
				'show_in_admin_bar'     => false,
				'show_in_nav_menus'     => false,
				'can_export'            => false,
				'has_archive'           => false,
				'exclude_from_search'   => true,
				'publicly_queryable'    => false,
				'show_in_rest'          => false,
				'capability_type'       => 'post',
				'supports'              => array( 'title' ),
				'rewrite'               => false,
			)
		);
	}

	/**
	 * Get data model for email log fields.
	 *
	 * @return array Data model structure compatible with data-model.json format.
	 */
	public static function get_data_model() {
		return array(
			'display_name' => __( 'Email Logs', 'elkaretro' ),
			'slug'           => self::POST_TYPE,
			'type'           => 'post_type',
			'public_description' => __( 'Email sending logs', 'elkaretro' ),
			'arch_description'   => __( 'Custom Post Type for storing email sending logs. Hidden from standard WordPress UI.', 'elkaretro' ),
			'fields'         => array(
				'to_email'      => array(
					'display_name'     => __( 'Recipient Email', 'elkaretro' ),
					'slug'             => 'to_email',
					'field_type'       => 'email',
					'public_description' => __( 'Email address of the recipient', 'elkaretro' ),
					'arch_description'   => __( 'Meta field storing recipient email address', 'elkaretro' ),
					'show_on_card'       => false,
					'show_in_description' => false,
					'show_in_cart_list'   => false,
					'show_in_filters'     => false,
					'required'            => true,
					'multi_choose'        => false,
					'meta_field'          => '_to_email',
				),
				'subject'        => array(
					'display_name'     => __( 'Email Subject', 'elkaretro' ),
					'slug'             => 'subject',
					'field_type'       => 'text',
					'public_description' => __( 'Subject of the email', 'elkaretro' ),
					'arch_description'   => __( 'Meta field storing email subject. Also used as post title.', 'elkaretro' ),
					'show_on_card'       => false,
					'show_in_description' => false,
					'show_in_cart_list'   => false,
					'show_in_filters'     => false,
					'required'            => true,
					'multi_choose'        => false,
					'meta_field'          => '_subject',
				),
				'sent_result'    => array(
					'display_name'     => __( 'Send Result', 'elkaretro' ),
					'slug'             => 'sent_result',
					'field_type'       => 'select',
					'public_description' => __( 'Result of email sending attempt', 'elkaretro' ),
					'arch_description'   => __( 'Meta field storing send result: "sent" or "failed"', 'elkaretro' ),
					'show_on_card'       => false,
					'show_in_description' => false,
					'show_in_cart_list'   => false,
					'show_in_filters'     => true,
					'required'            => true,
					'multi_choose'        => false,
					'meta_field'          => '_sent_result',
					'options'             => array(
						'sent'   => __( 'Sent', 'elkaretro' ),
						'failed' => __( 'Failed', 'elkaretro' ),
					),
				),
				'error_message'  => array(
					'display_name'     => __( 'Error Message', 'elkaretro' ),
					'slug'             => 'error_message',
					'field_type'       => 'textarea',
					'public_description' => __( 'Error message if sending failed', 'elkaretro' ),
					'arch_description'   => __( 'Meta field storing error message when email sending fails', 'elkaretro' ),
					'show_on_card'       => false,
					'show_in_description' => false,
					'show_in_cart_list'   => false,
					'show_in_filters'     => false,
					'required'            => false,
					'multi_choose'        => false,
					'meta_field'          => '_error_message',
				),
				'context'        => array(
					'display_name'     => __( 'Context', 'elkaretro' ),
					'slug'             => 'context',
					'field_type'       => 'json',
					'public_description' => __( 'Additional context data (order_id, template_type, etc.)', 'elkaretro' ),
					'arch_description'   => __( 'Meta field storing JSON-encoded context data for email log entry', 'elkaretro' ),
					'show_on_card'       => false,
					'show_in_description' => false,
					'show_in_cart_list'   => false,
					'show_in_filters'     => false,
					'required'            => false,
					'multi_choose'        => false,
					'meta_field'          => '_context',
				),
				'sent_at'        => array(
					'display_name'     => __( 'Sent At', 'elkaretro' ),
					'slug'             => 'sent_at',
					'field_type'       => 'datetime',
					'public_description' => __( 'Date and time when email was sent', 'elkaretro' ),
					'arch_description'   => __( 'Stored in post_date field. Date and time of email sending attempt.', 'elkaretro' ),
					'show_on_card'       => false,
					'show_in_description' => false,
					'show_in_cart_list'   => false,
					'show_in_filters'     => false,
					'required'            => true,
					'multi_choose'        => false,
					'meta_field'          => null, // Uses post_date, not meta field.
				),
			),
		);
	}
}

