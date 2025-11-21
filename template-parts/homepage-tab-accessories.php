<?php
/**
 * Template part for displaying accessories tab content on homepage
 * 
 * Обёртка над latest-ny-accessories.php без заголовка секции
 * (заголовок теперь в табе)
 *
 * @package ElkaRetro
 */

$ny_accessories_query = new WP_Query(array(
    'post_type'      => 'ny_accessory',
    'post_status'    => 'publish',
    'posts_per_page' => 15,
    'orderby'        => 'date',
    'order'          => 'DESC',
));

if ($ny_accessories_query->have_posts()) :
    echo '<div class="ny-accessories-preview-grid">';

    while ($ny_accessories_query->have_posts()) :
        $ny_accessories_query->the_post();
        $accessory_id = get_the_ID();

        $permalink = get_permalink($accessory_id);
        $title     = get_the_title($accessory_id);
        $index     = get_post_meta($accessory_id, 'ny_accecory_index', true);

        $price_meta  = get_post_meta($accessory_id, 'ny_cost', true);
        $price_value = null;
        if (is_array($price_meta)) {
            if (isset($price_meta['amount'])) {
                $price_value = $price_meta['amount'];
            } elseif (isset($price_meta['value'])) {
                $price_value = $price_meta['value'];
            }
        } elseif ($price_meta !== '') {
            $numeric = preg_replace('/[^\d.,]/u', '', (string) $price_meta);
            if ($numeric !== '') {
                $numeric = str_replace(' ', '', $numeric);
                $numeric = str_replace(',', '.', $numeric);
                $price_value = is_numeric($numeric) ? $numeric : null;
            }
        }
        if ($price_value !== null && $price_value !== '') {
            $price_value = is_numeric($price_value) ? (float) $price_value : null;
        }

        $condition_terms = get_the_terms($accessory_id, 'condition');
        $condition_name  = '';
        $condition_slug  = '';
        if (!is_wp_error($condition_terms) && !empty($condition_terms)) {
            $primary_condition = $condition_terms[0];
            $condition_name    = $primary_condition->name;
            $condition_slug    = $primary_condition->slug;
        }

        $material_terms = get_the_terms($accessory_id, 'material');
        $material_names = '';
        if (!is_wp_error($material_terms) && !empty($material_terms)) {
            $names = wp_list_pluck($material_terms, 'name');
            $material_names = implode(', ', $names);
        }

        $excerpt = wp_trim_words(wp_strip_all_tags(get_the_excerpt($accessory_id), true), 18, '…');

        $image_url = get_the_post_thumbnail_url($accessory_id, 'large');
        if (!$image_url) {
            $image_url = get_the_post_thumbnail_url($accessory_id, 'medium');
        }

        $attributes = array(
            'id'             => $accessory_id,
            'title'          => $title,
            'index'          => $index,
            'price'          => $price_value !== null ? $price_value : '',
            'condition'      => $condition_name,
            'condition-slug' => $condition_slug,
            'material'       => $material_names,
            'excerpt'        => $excerpt,
            'image'          => $image_url,
            'link'           => $permalink,
        );

        $attr_string = '';
        foreach ($attributes as $attr => $value) {
            if ($value === null || $value === '') {
                continue;
            }
            $attr_string .= sprintf(' %s="%s"', esc_attr($attr), esc_attr($value));
        }

        echo '<ny-accessory-card' . $attr_string . '></ny-accessory-card>';

    endwhile;

    echo '</div>'; // .ny-accessories-preview-grid
endif;

wp_reset_postdata();
?>

