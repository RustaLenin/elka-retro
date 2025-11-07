<?php
/**
 * Template part for displaying latest toy types on homepage
 * 
 * Выводит последние 9 типов игрушек добавленных за последний месяц
 * Использует компонент toy-type-card
 *
 * @package ElkaRetro
 */


// WP Query с ограничениями
$toy_types_query = new WP_Query(array(
    'post_type'      => 'toy_type',
    'post_status'    => 'publish',
    'posts_per_page' => 9,
    'orderby'        => 'date',
    'order'          => 'DESC',
));

// Проверяем есть ли типы игрушек
if ($toy_types_query->have_posts()) :
    // Создаём обёртку с background
    echo '<div class="toy-types-section-wrapper">';
    
    // Заголовок секции с ссылкой
    echo '<div class="toy-types-section-header">';
    echo '<div class="toy-types-section-title-wrapper">';
    echo '<div class="toy-types-section-title-icon">';
    echo '<ui-icon name="gift" size="small"></ui-icon>';
    echo '</div>';
    
    // Получаем ссылку на архив toy_type
    $archive_link = '';
    if (function_exists('get_post_type_archive_link')) {
        $archive_link = get_post_type_archive_link('toy_type');
    }
    // Fallback: формируем URL вручную
    if (!$archive_link) {
        $archive_link = home_url('/toy-type/');
    }
    
    // Выводим заголовок со ссылкой в скобках сразу после него
    echo '<h2 class="toy-types-section-title">Новые поступления';
    if ($archive_link) {
        echo ' <a href="' . esc_url($archive_link) . '" class="toy-types-section-link">(Смотреть все)</a>';
    }
    echo '</h2>';
    echo '</div>';
    echo '</div>';
    
    // Создаём контейнер с flex layout (в одну строку, как у post-card)
    echo '<div class="toy-type-cards-container" data-layout="flex" data-justify="center" data-gap="medium">';
    
    // Получаем название поля instances из дата-модели (используем один раз для всех циклов)
    $instances_field_config = elkaretro_get_field_config('toy_type', 'instances');
    $instances_meta_field = $instances_field_config && isset($instances_field_config['meta_field']) ? $instances_field_config['meta_field'] : 'instances';
    
    // Массив для хранения ID типов, которые нужно исключить (без экземпляров)
    $excluded_types = array();
    
    // Сначала проходим все посты и собираем ID тех, у которых нет экземпляров
    $temp_query = clone $toy_types_query;
    while ($temp_query->have_posts()) :
        $temp_query->the_post();
        $temp_toy_type_id = get_the_ID();
        
        // Подсчитываем экземпляры для этого типа
        $temp_available_count = 0;
        if (function_exists('pods')) {
            $temp_toy_type_pod = pods('toy_type', $temp_toy_type_id);
            if ($temp_toy_type_pod && $temp_toy_type_pod->exists()) {
                // Используем название поля из дата-модели
                $temp_instances = $temp_toy_type_pod->field($instances_meta_field);
                if ($temp_instances) {
                    if (is_array($temp_instances)) {
                        foreach ($temp_instances as $instance) {
                            $instance_id = null;
                            if (is_object($instance)) {
                                $instance_id = isset($instance->ID) ? $instance->ID : (isset($instance->id) ? $instance->id : null);
                            } elseif (is_array($instance)) {
                                $instance_id = isset($instance['ID']) ? $instance['ID'] : (isset($instance['id']) ? $instance['id'] : (is_numeric($instance) ? $instance : null));
                            } elseif (is_numeric($instance)) {
                                $instance_id = $instance;
                            }
                            
                            if ($instance_id && get_post_status($instance_id) === 'publish') {
                                $temp_available_count++;
                            }
                        }
                    } elseif (is_object($temp_instances)) {
                        $instance_id = isset($temp_instances->ID) ? $temp_instances->ID : (isset($temp_instances->id) ? $temp_instances->id : null);
                        if ($instance_id && get_post_status($instance_id) === 'publish') {
                            $temp_available_count = 1;
                        }
                    } elseif (is_numeric($temp_instances)) {
                        if (get_post_status($temp_instances) === 'publish') {
                            $temp_available_count = 1;
                        }
                    }
                }
            }
        }
        
        // Если экземпляров нет, добавляем в исключения
        if ($temp_available_count === 0) {
            $excluded_types[] = $temp_toy_type_id;
        }
    endwhile;
    wp_reset_postdata();
    
    // Теперь выводим только те типы, которые есть в исходном запросе и не в исключениях
    while ($toy_types_query->have_posts()) :
        $toy_types_query->the_post();
        
        // Получаем данные типа игрушки
        $toy_type_id = get_the_ID();
        
        // Пропускаем типы без экземпляров
        if (in_array($toy_type_id, $excluded_types)) {
            continue;
        }
        
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
        
        // Встречаемость (occurrence) - получаем через таксономию
        // Используем Pods API для получения таксономии, так как в Pods она может храниться как поле
        $rarity = '';
        if (function_exists('pods')) {
            // Получаем через Pods API (приоритет)
            $toy_type_pod = pods('toy_type', $toy_type_id);
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
        }
        
        // Fallback: если через Pods не получили, используем стандартный WP API
        if (empty($rarity)) {
            $occurrences = get_the_terms($toy_type_id, $occurrence_taxonomy);
            if ($occurrences && !is_wp_error($occurrences) && !empty($occurrences) && isset($occurrences[0])) {
                $rarity = $occurrences[0]->slug; // Используем slug для удобства (often, not-often, rarely, rare)
            }
        }
        
        // Подсчитываем доступные экземпляры
        // В Pods поле instances - это двусторонняя связь, нужно получать через Pods API
        $available_count = 0;
        if (function_exists('pods')) {
            $toy_type_pod = pods('toy_type', $toy_type_id);
            if ($toy_type_pod && $toy_type_pod->exists()) {
                // Получаем связанные экземпляры через Pods relationship, используя название поля из дата-модели
                $instances = $toy_type_pod->field($instances_meta_field);
                if ($instances) {
                    // Pods может вернуть как массив объектов, так и один объект
                    if (is_array($instances)) {
                        foreach ($instances as $instance) {
                            // Может быть объект Pods или массив с полями
                            $instance_id = null;
                            if (is_object($instance)) {
                                // Pods объект имеет поле ID
                                $instance_id = isset($instance->ID) ? $instance->ID : (isset($instance->id) ? $instance->id : null);
                            } elseif (is_array($instance)) {
                                // Массив может иметь ключи 'ID', 'id', или быть просто числом
                                $instance_id = isset($instance['ID']) ? $instance['ID'] : (isset($instance['id']) ? $instance['id'] : (is_numeric($instance) ? $instance : null));
                            } elseif (is_numeric($instance)) {
                                $instance_id = $instance;
                            }
                            
                            if ($instance_id && get_post_status($instance_id) === 'publish') {
                                $available_count++;
                            }
                        }
                    } elseif (is_object($instances)) {
                        // Один экземпляр как объект
                        $instance_id = isset($instances->ID) ? $instances->ID : (isset($instances->id) ? $instances->id : null);
                        if ($instance_id && get_post_status($instance_id) === 'publish') {
                            $available_count = 1;
                        }
                    } elseif (is_numeric($instances)) {
                        // Один экземпляр как число
                        if (get_post_status($instances) === 'publish') {
                            $available_count = 1;
                        }
                    }
                }
            }
        }
        
        // Fallback: если Pods недоступен, пробуем через get_post_meta
        if ($available_count === 0 && function_exists('get_post_meta')) {
            $instances_meta = get_post_meta($toy_type_id, 'instances', true);
            if ($instances_meta) {
                if (is_array($instances_meta)) {
                    foreach ($instances_meta as $instance_id) {
                        $id = is_array($instance_id) && isset($instance_id['ID']) ? $instance_id['ID'] : $instance_id;
                        if ($id && get_post_status($id) === 'publish') {
                            $available_count++;
                        }
                    }
                } elseif (is_numeric($instances_meta)) {
                    if (get_post_status($instances_meta) === 'publish') {
                        $available_count = 1;
                    }
                }
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
    echo '</div>'; // закрываем .toy-types-section-wrapper
    
    // Сбрасываем данные поста
    wp_reset_postdata();
else :
    // Сообщение если типов нет (необязательно, можно оставить пустым)
    // echo '<p class="no-toy-types-message">Новинок не найдено.</p>';
endif;
?>

