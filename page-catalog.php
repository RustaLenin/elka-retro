<?php
/**
 * Template Name: Каталог (экспериментальная версия)
 *
 * @package ElkaRetro
 */

use Elkaretro\Core\Catalog\Catalog_Loader;

add_filter(
	'elkaretro_required_components',
	static function( $components ) {
		if ( ! is_array( $components ) ) {
			$components = array();
		}

		$components[] = 'catalog-page';
		$components[] = 'toy-type-card';
		$components[] = 'toy-instance-card';

		return array_values( array_unique( $components ) );
	}
);

Catalog_Loader::enqueue_assets();

get_header();

$endpoint = rest_url( 'elkaretro/v1/catalog' );
$catalog_settings = elkaretro_get_catalog_settings();
$settings_json    = wp_json_encode( $catalog_settings, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES );
?>

<?php if ( $settings_json ) : ?>
	<script>
		window.catalogSettings = <?php echo $settings_json; ?>;
	</script>
<?php endif; ?>

<div class="site_content site_content--catalog">
	<catalog-page
		data-endpoint="<?php echo esc_attr( $endpoint ); ?>"
		data-mode="type"
		data-per-page="30"
	></catalog-page>
</div>

<?php
get_footer();

