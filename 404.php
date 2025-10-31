<?php
/**
 * Template for displaying 404 error page
 *
 * @package ElkaRetro
 */
get_header(); 

// Определяем код ошибки (404 по умолчанию)
$error_code = '404';
if (function_exists('http_response_code')) {
    $http_code = http_response_code();
    if ($http_code) {
        $error_code = (string) $http_code;
    }
}

?>

<div class="site_content">
    <error-page error-code="<?php echo esc_attr($error_code); ?>"></error-page>
</div>

<?php
get_footer();
