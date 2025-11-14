<?php
  // Получаем ссылки на каталоги (те же, что используются в index.php)
  $toy_catalog_link = function_exists('elkaretro_get_catalog_page_url') ? elkaretro_get_catalog_page_url() : '';
  if (!$toy_catalog_link) {
    $toy_catalog_link = home_url('/catalog/');
  }

  $ny_accessory_link = function_exists('get_post_type_archive_link') ? get_post_type_archive_link('ny_accessory') : '';
  if (!$ny_accessory_link) {
    $ny_accessory_link = home_url('/ny-accessory/');
  }
?>

  <site-footer 
    toy-catalog-url="<?php echo esc_url($toy_catalog_link); ?>"
    ny-accessory-url="<?php echo esc_url($ny_accessory_link); ?>"
  ></site-footer>

</div>

<?php wp_footer(); ?>

</body>
</html>