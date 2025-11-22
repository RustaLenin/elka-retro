<?php
/**
 * User Profile Loader.
 *
 * Bootstraps the user profile module and registers REST endpoints.
 */

namespace Elkaretro\Core\UserProfile;

defined( 'ABSPATH' ) || exit;

/**
 * Initialize user profile module.
 * 
 * Note: user-profile-rest-controller.php is already loaded in functions.php
 */
function init_user_profile() {
	$controller = new User_Profile_REST_Controller();
	$controller->register_routes();
}

// Hook into REST API initialization
add_action( 'rest_api_init', __NAMESPACE__ . '\\init_user_profile' );

/**
 * Send registration welcome email when user is registered.
 *
 * Sends email for:
 * - Users registered via REST API (frontend registration form)
 * - Users registered during order creation (via wp_create_user)
 *
 * Does NOT send for:
 * - Users created in WordPress admin panel (unless flagged as order registration)
 *
 * @param int $user_id User ID.
 */
function send_registration_welcome_email_on_register( $user_id ) {
	// Skip if user was created in admin panel (unless it's order registration)
	if ( is_admin() && ! defined( 'REST_REQUEST' ) ) {
		// Check if we're in order creation context (set by order-service.php)
		$is_order_registration = get_user_meta( $user_id, '_registered_via_order', true );
		if ( ! $is_order_registration ) {
			// User was created in admin panel, skip email
			return;
		}
		// Clean up the flag
		delete_user_meta( $user_id, '_registered_via_order' );
	}

	$user = get_user_by( 'ID', $user_id );
	if ( ! $user ) {
		return;
	}

	require_once __DIR__ . '/user-email-templates.php';
	$email_templates = new User_Email_Templates();
	$email_templates->send_registration_welcome_email( $user_id, $user->user_login, $user->user_email );
}

// Hook into user registration
add_action( 'user_register', __NAMESPACE__ . '\\send_registration_welcome_email_on_register' );

