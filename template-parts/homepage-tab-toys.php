<?php
/**
 * Template part for displaying toys tab content on homepage
 * 
 * Обёртка над latest-toy-types.php без заголовка секции
 * (заголовок теперь в табе)
 *
 * @package ElkaRetro
 */

// WP Query с фильтрацией по количеству доступных экземпляров
$toy_types_query = new WP_Query(array(
    'post_type'      => 'toy_type',
    'post_status'    => 'publish',
    'posts_per_page' => 15,
    'orderby'        => 'date',
    'order'          => 'DESC',
    'meta_query'     => array(
        array(
            'key'     => 'available_instances_count',
            'value'   => '0',
            'compare' => '>',
            'type'    => 'NUMERIC'
        )
    )
));

// Проверяем есть ли типы игрушек
if ($toy_types_query->have_posts()) :
    // Создаём контейнер с flex layout (в одну строку, как у post-card)
    echo '<div class="toy-type-cards-container" data-layout="flex" data-justify="center" data-gap="medium">';
    
    // Выводим типы игрушек (уже отфильтрованные по available_instances_count > 0)
    while ($toy_types_query->have_posts()) :
        $toy_types_query->the_post();
        
        // Получаем данные типа игрушки
        $toy_type_id = get_the_ID();
        
        $title = get_the_title();
        $link = get_permalink();
        
        // Получаем названия полей из дата-модели
        $photos_field_config = elkaretro_get_field_config('toy_type', 'toy_type_photos');
        $photos_meta_field = $photos_field_config && isset($photos_field_config['meta_field']) ? $photos_field_config['meta_field'] : 'toy_type_photos';
        
        $year_field_config = elkaretro_get_field_config('toy_type', 'year_of_production_field');
        $year_taxonomy = $year_field_config && isset($year_field_config['related_taxonomy']) ? $year_field_config['related_taxonomy'] : 'year_of_production';
        
        $manufacturer_field_config = elkaretro_get_field_config('toy_type', 'manufacturer_field');
        $manufacturer_taxonomy = $manufacturer_field_config && isset($manufacturer_field_config['related_taxonomy']) ? $manufacturer_field_config['related_taxonomy'] : 'manufacturer';
        
        $occurrence_field_config = elkaretro_get_field_config('toy_type', 'occurrence_field');
        $occurrence_taxonomy = $occurrence_field_config && isset($occurrence_field_config['related_taxonomy']) ? $occurrence_field_config['related_taxonomy'] : 'occurrence';
        $occurrence_meta_field = $occurrence_field_config && isset($occurrence_field_config['meta_field']) ? $occurrence_field_config['meta_field'] : 'occurrence_field';
        
        // Получаем изображение (thumbnail или первая из toy_type_photos)
        $thumbnail_id = get_post_thumbnail_id($toy_type_id);
        $image_url = '';
        if ($thumbnail_id) {
            $image_url = get_the_post_thumbnail_url($toy_type_id, 'large');
            if (!$image_url) {
                $image_url = get_the_post_thumbnail_url($toy_type_id, 'medium');
            }
        } else {
            // Если нет featured image, пробуем получить первую из toy_type_photos
            $toy_type_photos = get_post_meta($toy_type_id, $photos_meta_field, true);
            if ($toy_type_photos && is_array($toy_type_photos) && !empty($toy_type_photos) && isset($toy_type_photos[0])) {
                $first_photo_id = $toy_type_photos[0];
                $image_url = wp_get_attachment_image_url($first_photo_id, 'large');
                if (!$image_url) {
                    $image_url = wp_get_attachment_image_url($first_photo_id, 'medium');
                }
            }
        }
        
        // Получаем таксономии
        // Годы производства (берем первый для краткости, в карточке можно показать все)
        $years = get_the_terms($toy_type_id, $year_taxonomy);
        $year = '';
        if ($years && !is_wp_error($years) && !empty($years) && isset($years[0])) {
            // Берем первый год, можно позже показывать все
            $year = $years[0]->name;
        }
        
        // Производители (multi pick)
        $manufacturers = get_the_terms($toy_type_id, $manufacturer_taxonomy);
        $factory = '';
        $manufacturer_ids = array();
        if ($manufacturers && !is_wp_error($manufacturers) && !empty($manufacturers) && isset($manufacturers[0])) {
            // Берем первого производителя для атрибута factory
            $factory = $manufacturers[0]->name;
            // Собираем IDs для передачи (можно использовать для tooltips)
            foreach ($manufacturers as $manufacturer) {
                $manufacturer_ids[] = $manufacturer->term_id;
            }
        }
        
        // Получаем Pods объект один раз для всех операций
        $toy_type_pod = null;
        if (function_exists('pods')) {
            $toy_type_pod = pods('toy_type', $toy_type_id);
        }
        
        // Встречаемость (occurrence) - получаем через таксономию
        // Используем Pods API для получения таксономии, так как в Pods она может храниться как поле
        $rarity = '';
        if ($toy_type_pod && $toy_type_pod->exists()) {
            // Пробуем получить через Pods поле occurrence_field
            $occurrence_data = $toy_type_pod->field($occurrence_meta_field);
            if ($occurrence_data) {
                // Может быть массив объектов или один объект
                if (is_array($occurrence_data) && !empty($occurrence_data) && isset($occurrence_data[0])) {
                    $first = $occurrence_data[0];
                    $rarity = is_object($first) && isset($first->slug) ? $first->slug : (is_array($first) && isset($first['slug']) ? $first['slug'] : '');
                } elseif (is_object($occurrence_data) && isset($occurrence_data->slug)) {
                    $rarity = $occurrence_data->slug;
                } elseif (is_array($occurrence_data) && isset($occurrence_data['slug'])) {
                    $rarity = $occurrence_data['slug'];
                }
            }
        }
        
        // Fallback: если через Pods не получили, используем стандартный WP API
        if (empty($rarity)) {
            $occurrences = get_the_terms($toy_type_id, $occurrence_taxonomy);
            if ($occurrences && !is_wp_error($occurrences) && !empty($occurrences) && isset($occurrences[0])) {
                $rarity = $occurrences[0]->slug; // Используем slug для удобства (often, not-often, rarely, rare)
            }
        }
        
        // Получаем количество доступных экземпляров из кешированного поля
        $available_count = 0;
        $count_obtained = false;
        
        if ($toy_type_pod && $toy_type_pod->exists()) {
            $count = $toy_type_pod->field('available_instances_count');
            if ($count !== null && $count !== false && $count !== '') {
                $available_count = (int)$count;
                $count_obtained = true;
            }
        }
        
        // Fallback: если Pods недоступен или не вернул значение, пробуем через get_post_meta
        if (!$count_obtained) {
            $count_meta = get_post_meta($toy_type_id, 'available_instances_count', true);
            if ($count_meta !== '' && $count_meta !== false && $count_meta !== null) {
                $available_count = (int)$count_meta;
            }
        }
        
        // Экранируем данные для HTML атрибутов
        $title_esc = esc_attr($title);
        $link_esc = esc_url($link);
        $image_esc = $image_url ? esc_url($image_url) : '';
        $year_esc = esc_attr($year);
        $factory_esc = esc_attr($factory);
        $rarity_esc = esc_attr($rarity);
        
        // Выводим компонент toy-type-card
        echo '<toy-type-card';
        echo ' id="' . $toy_type_id . '"';
        echo ' title="' . $title_esc . '"';
        if ($year_esc) {
            echo ' year="' . $year_esc . '"';
        }
        if ($factory_esc) {
            echo ' factory="' . $factory_esc . '"';
        }
        if ($rarity_esc) {
            echo ' rarity="' . $rarity_esc . '"';
        }
        if ($image_esc) {
            echo ' image="' . $image_esc . '"';
        }
        echo ' link="' . $link_esc . '"';
        echo ' available-count="' . $available_count . '"';
        echo '></toy-type-card>';
        
    endwhile;
    
    echo '</div>'; // закрываем .toy-type-cards-container
    
    // Сбрасываем данные поста
    wp_reset_postdata();
else :
    // Сообщение если типов нет
    echo '<p class="no-toy-types-message">Новинок не найдено.</p>';
endif;
?>

