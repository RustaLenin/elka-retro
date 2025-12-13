<?php
/**
 * Template Name: Профиль
 *
 * Шаблон страницы профиля пользователя
 *
 * @package ElkaRetro
 */

add_filter(
	'elkaretro_required_components',
	static function( $components ) {
		if ( ! is_array( $components ) ) {
			$components = array();
		}

		$components[] = 'profile-page';
		$components[] = 'tab-navigation';
		$components[] = 'order-history-tab';
		$components[] = 'order-card';

		return array_values( array_unique( $components ) );
	}
);

get_header();

?>

<div class="site_content site_content--profile">
	<profile-page></profile-page>
</div>

<?php
get_footer();

