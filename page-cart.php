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
	<cart-page>
		<!-- Начальный loader, показывается до инициализации компонента -->
		<div class="cart-page" style="padding: 2rem; text-align: center;">
			<div class="cart-page_loading" style="display: flex; flex-direction: column; align-items: center; gap: 1rem;">
				<div style="width: 48px; height: 48px; border: 4px solid rgba(155, 140, 255, 0.3); border-top-color: #9b8cff; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
				<p style="color: var(--color-foreground, #f5f7fa);">Загрузка корзины...</p>
			</div>
		</div>
		<style>
			@keyframes spin {
				to { transform: rotate(360deg); }
			}
		</style>
	</cart-page>
</div>

<?php
get_footer();

