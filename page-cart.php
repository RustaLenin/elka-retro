<?php
/**
 * Template Name: Корзина
 *
 * @package ElkaRetro
 */

add_filter(
	'elkaretro_required_components',
	static function( $components ) {
		if ( ! is_array( $components ) ) {
			$components = array();
		}

		$components[] = 'cart-page';
		$components[] = 'cart-item';
		$components[] = 'cart-summary';

		return array_values( array_unique( $components ) );
	}
);

get_header();
?>

<div class="site_content site_content--cart">
	<cart-page></cart-page>
</div>

<?php
get_footer();

