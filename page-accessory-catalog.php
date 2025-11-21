<?php
/**
 * Template Name: Каталог аксессуаров
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

		$components[] = 'accessory-catalog-page';
		$components[] = 'ny-accessory-card';

		return array_values( array_unique( $components ) );
	}
);

Catalog_Loader::enqueue_assets();

get_header();

$endpoint = rest_url( 'elkaretro/v1/catalog/accessories' );
$accessory_catalog_settings = elkaretro_get_accessory_catalog_settings();
$settings_json    = wp_json_encode( $accessory_catalog_settings, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES );
?>

<?php if ( $settings_json ) : ?>
	<script>
		window.accessoryCatalogSettings = <?php echo $settings_json; ?>;
	</script>
<?php endif; ?>

<div class="site_content site_content--catalog site_content--accessory-catalog">
	<accessory-catalog-page
		data-endpoint="<?php echo esc_attr( $endpoint ); ?>"
		data-per-page="30"
	></accessory-catalog-page>
</div>

<?php
get_footer();

