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

