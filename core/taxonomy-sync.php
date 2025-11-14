<?php
/**
 * Taxonomy Sync
 * 
 * Синхронизация таксономий с продакшен сайтом через REST API
 * 
 * @package ElkaRetro
 */

class ELKARETRO_TAXONOMY_SYNC {
    
    /**
     * Список таксономий для синхронизации
     * Исключаем category-of-toys (нужен отдельный обработчик)
     */
    private static $taxonomies_to_sync = array(
        'year_of_production',
        'manufacturer',
        'occurrence',
        'size',
        'material',
        'glass_thickness',
        'mounting_type',
        'authenticity',
        'condition',
        'lot_configurations',
        'property',
        'tube_condition',
        'paint_type',
        'back_color',
        'color_type'
    );
    
    /**
     * Синхронизирует все таксономии с продакшена
     * 
     * @param string $production_url URL продакшен сайта
     * @return array Результат синхронизации
     */
    public static function sync_all_taxonomies($production_url) {
        if (empty($production_url)) {
            return array(
                'success' => false,
                'message' => 'Production URL is not set'
            );
        }
        
        // Очищаем URL от trailing slash
        $production_url = rtrim($production_url, '/');
        
        $results = array(
            'success' => true,
            'total' => 0,
            'synced' => 0,
            'errors' => 0,
            'taxonomies' => array()
        );
        
        foreach (self::$taxonomies_to_sync as $taxonomy) {
            $result = self::sync_taxonomy($production_url, $taxonomy);
            
            $results['total']++;
            if ($result['success']) {
                $results['synced']++;
            } else {
                $results['errors']++;
            }
            
            $results['taxonomies'][$taxonomy] = $result;
        }
        
        // Если есть ошибки, считаем операцию частично успешной
        if ($results['errors'] > 0 && $results['synced'] > 0) {
            $results['success'] = true;
            $results['message'] = sprintf(
                'Synced %d/%d taxonomies. %d errors occurred.',
                $results['synced'],
                $results['total'],
                $results['errors']
            );
        } elseif ($results['synced'] === $results['total']) {
            $results['message'] = sprintf('Successfully synced all %d taxonomies', $results['total']);
        } else {
            $results['success'] = false;
            $results['message'] = 'Failed to sync taxonomies';
        }
        
        return $results;
    }
    
    /**
     * Синхронизирует одну таксономию
     * 
     * @param string $production_url URL продакшен сайта
     * @param string $taxonomy Slug таксономии
     * @return array Результат синхронизации
     */
    public static function sync_taxonomy($production_url, $taxonomy) {
        // Формируем URL REST API endpoint для таксономии
        // WordPress REST API для custom taxonomies может использовать формат:
        // /wp-json/wp/v2/{taxonomy} или /wp-json/wp/v2/toy_type_{taxonomy}
        // Пробуем оба варианта
        $api_url = $production_url . '/wp-json/wp/v2/' . $taxonomy;
        
        // Для таксономий связанных с toy_type может быть префикс
        // Но большинство из нашего списка - общие таксономии, пробуем стандартный формат
        
        // Делаем запрос к API
        // Пробуем стандартный endpoint
        $response = wp_remote_get($api_url, array(
            'timeout' => 30,
            'sslverify' => false, // Для локальной разработки можно отключить SSL проверку
        ));
        
        // Если получили 404, пробуем альтернативный формат с префиксом toy_type_
        if (!is_wp_error($response)) {
            $status_code = wp_remote_retrieve_response_code($response);
            if ($status_code === 404) {
                // Пробуем альтернативный endpoint
                $alt_api_url = $production_url . '/wp-json/wp/v2/toy_type_' . $taxonomy;
                $response = wp_remote_get($alt_api_url, array(
                    'timeout' => 30,
                    'sslverify' => false,
                ));
            }
        }
        
        if (is_wp_error($response)) {
            return array(
                'success' => false,
                'message' => $response->get_error_message(),
                'count' => 0
            );
        }
        
        $status_code = wp_remote_retrieve_response_code($response);
        if ($status_code !== 200) {
            return array(
                'success' => false,
                'message' => sprintf('HTTP %d - Endpoint not found or not accessible', $status_code),
                'count' => 0
            );
        }
        
        $body = wp_remote_retrieve_body($response);
        $terms = json_decode($body, true);
        
        if (!is_array($terms)) {
            return array(
                'success' => false,
                'message' => 'Invalid response format',
                'count' => 0
            );
        }
        
        // Создаём/обновляем термины локально
        $created = 0;
        $updated = 0;
        $errors = array();
        
        foreach ($terms as $term_data) {
            $result = self::sync_term($taxonomy, $term_data);
            if ($result['success']) {
                if ($result['created']) {
                    $created++;
                } else {
                    $updated++;
                }
            } else {
                $errors[] = $result['message'];
            }
        }
        
        return array(
            'success' => true,
            'message' => sprintf('Synced: %d created, %d updated', $created, $updated),
            'count' => count($terms),
            'created' => $created,
            'updated' => $updated,
            'errors' => $errors
        );
    }
    
    /**
     * Синхронизирует один термин таксономии
     * 
     * @param string $taxonomy Slug таксономии
     * @param array $term_data Данные термина из REST API
     * @return array Результат синхронизации
     */
    private static function sync_term($taxonomy, $term_data) {
        $slug = isset($term_data['slug']) ? $term_data['slug'] : '';
        $name = isset($term_data['name']) ? $term_data['name'] : '';
        $parent_id = 0;
        
        // Обрабатываем родительский термин если есть
        if (isset($term_data['parent']) && $term_data['parent'] > 0) {
            // Пробуем найти родительский термин по ID из продакшена
            $parent_term_id_production = $term_data['parent'];
            // Можно добавить маппинг production_id -> local_id если нужно
            // Для MVP упростим: ищем по slug если родитель указан в данных
            if (isset($term_data['_links']['wp:parent'][0]['href'])) {
                // Можно распарсить parent из _links, но для MVP пропустим иерархию
                // TODO: реализовать маппинг production_id -> local_id
            }
        }
        
        // Проверяем, существует ли термин с таким slug
        $existing_term = get_term_by('slug', $slug, $taxonomy);
        
        if ($existing_term) {
            // Обновляем существующий термин
            $result = wp_update_term($existing_term->term_id, $taxonomy, array(
                'name' => $name,
                'slug' => $slug,
                'parent' => $parent_id
            ));
            
            if (is_wp_error($result)) {
                return array(
                    'success' => false,
                    'message' => sprintf('Failed to update term %s: %s', $slug, $result->get_error_message()),
                    'created' => false
                );
            }
            
            return array(
                'success' => true,
                'message' => sprintf('Updated term: %s', $name),
                'created' => false
            );
        } else {
            // Создаём новый термин
            $result = wp_insert_term($name, $taxonomy, array(
                'slug' => $slug,
                'parent' => $parent_id
            ));
            
            if (is_wp_error($result)) {
                return array(
                    'success' => false,
                    'message' => sprintf('Failed to create term %s: %s', $slug, $result->get_error_message()),
                    'created' => false
                );
            }
            
            return array(
                'success' => true,
                'message' => sprintf('Created term: %s', $name),
                'created' => true
            );
        }
    }
    
    /**
     * Получить список таксономий для синхронизации
     */
    public static function get_taxonomies_to_sync() {
        return self::$taxonomies_to_sync;
    }

    /**
     * Проставляет термы для всех типов игрушек на основе Pods полей.
     *
     * @return array
     */
    public static function sync_toy_types_terms() {
        if ( ! function_exists( 'pods' ) ) {
            return array(
                'success' => false,
                'message' => 'Pods is not available',
            );
        }

        $post_type = 'toy_type';
        $fields    = array(
            'occurrence_field'        => 'occurrence',
            'year_of_production_field' => 'year_of_production',
            'material_field'          => 'material',
            'manufacturer_field'      => 'manufacturer',
            'size_field'              => 'size',
            'glass_thickness_field'   => 'glass_thickness',
            'mounting_type_field'     => 'mounting_type',
        );

        $query = new WP_Query(
            array(
                'post_type'      => $post_type,
                'post_status'    => 'any',
                'posts_per_page' => -1,
                'fields'         => 'ids',
            )
        );

        if ( empty( $query->posts ) ) {
            return array(
                'success' => false,
                'message' => 'No toy_type posts found',
            );
        }

        $synced = 0;
        foreach ( $query->posts as $post_id ) {
            $pod = pods( $post_type, $post_id );
            if ( ! $pod || ! $pod->exists() ) {
                continue;
            }

            foreach ( $fields as $field_slug => $taxonomy ) {
                $value = $pod->field( $field_slug );
                if ( empty( $value ) ) {
                    continue;
                }

                $term_slugs = self::extract_term_slugs( $value, $taxonomy );

                if ( $term_slugs ) {
                    wp_set_object_terms( $post_id, array_unique( $term_slugs ), $taxonomy, false );
                    $synced++;
                }
            }
        }

        return array(
            'success' => true,
            'message' => sprintf( 'Synced %d toy_type term relationships', $synced ),
        );
    }

    /**
     * Проставляет термы для всех экземпляров игрушек на основе Pods полей.
     *
     * @return array
     */
    public static function sync_toy_instances_terms() {
        if ( ! function_exists( 'pods' ) ) {
            return array(
                'success' => false,
                'message' => 'Pods is not available',
            );
        }

        $post_type = 'toy_instance';
        $fields    = array(
            'authenticity_field'    => 'authenticity',
            'lot_configuration_field' => 'lot_configurations',
            'property_field'        => 'property',
            'condition_field'       => 'condition',
            'tube_condition_field'  => 'tube_condition',
            'paint_type_field'      => 'paint_type',
            'color_type_field'      => 'color_type',
            'back_color_field'      => 'back_color',
        );

        $query = new WP_Query(
            array(
                'post_type'      => $post_type,
                'post_status'    => 'any',
                'posts_per_page' => -1,
                'fields'         => 'ids',
            )
        );

        if ( empty( $query->posts ) ) {
            return array(
                'success' => false,
                'message' => 'No toy_instance posts found',
            );
        }

        $synced = 0;
        foreach ( $query->posts as $post_id ) {
            $pod = pods( $post_type, $post_id );
            if ( ! $pod || ! $pod->exists() ) {
                continue;
            }

            foreach ( $fields as $field_slug => $taxonomy ) {
                $value = $pod->field( $field_slug );
                if ( empty( $value ) ) {
                    continue;
                }

                $term_slugs = self::extract_term_slugs( $value, $taxonomy );

                if ( $term_slugs ) {
                    wp_set_object_terms( $post_id, array_unique( $term_slugs ), $taxonomy, false );
                    $synced++;
                }
            }
        }

        return array(
            'success' => true,
            'message' => sprintf( 'Synced %d toy_instance term relationships', $synced ),
        );
    }

    /**
     * Преобразует данные Pods поля в массив slug'ов таксономии.
     *
     * @param mixed  $value
     * @param string $taxonomy
     * @return array
     */
    protected static function extract_term_slugs( $value, $taxonomy ) {
        $slugs = array();

        if ( is_array( $value ) ) {
            foreach ( $value as $item ) {
                if ( is_array( $item ) ) {
                    if ( isset( $item['term_id'] ) ) {
                        $term = get_term( (int) $item['term_id'], $taxonomy );
                        if ( $term && ! is_wp_error( $term ) && $term->taxonomy === $taxonomy && $term->slug !== $taxonomy ) {
                            $slugs[] = $term->slug;
                            continue;
                        }
                    }
                    $resolved_slug = self::resolve_term_slug(
                        isset( $item['slug'] ) ? $item['slug'] : '',
                        $taxonomy,
                        isset( $item['name'] ) ? $item['name'] : ''
                    );
                    if ( $resolved_slug ) {
                        $slugs[] = $resolved_slug;
                        continue;
                    }
                } elseif ( is_object( $item ) ) {
                    if ( isset( $item->term_id ) ) {
                        $term = get_term( (int) $item->term_id, $taxonomy );
                        if ( $term && ! is_wp_error( $term ) && $term->taxonomy === $taxonomy && $term->slug !== $taxonomy ) {
                            $slugs[] = $term->slug;
                            continue;
                        }
                    }
                    $resolved_slug = self::resolve_term_slug(
                        ! empty( $item->slug ) ? $item->slug : '',
                        $taxonomy,
                        ! empty( $item->name ) ? $item->name : ''
                    );
                    if ( $resolved_slug ) {
                        $slugs[] = $resolved_slug;
                        continue;
                    }
                } elseif ( is_numeric( $item ) ) {
                    $term = get_term( (int) $item, $taxonomy );
                    if ( $term && ! is_wp_error( $term ) && $term->taxonomy === $taxonomy && $term->slug !== $taxonomy ) {
                        $slugs[] = $term->slug;
                    }
                } elseif ( is_string( $item ) && $item !== '' ) {
                    $resolved_slug = self::resolve_term_slug( $item, $taxonomy );
                    if ( $resolved_slug ) {
                        $slugs[] = $resolved_slug;
                    }
                }
            }
        } elseif ( is_object( $value ) && isset( $value->term_id ) ) {
            $term = get_term( (int) $value->term_id, $taxonomy );
            if ( $term && ! is_wp_error( $term ) && $term->taxonomy === $taxonomy && $term->slug !== $taxonomy ) {
                $slugs[] = $term->slug;
            }
        } elseif ( is_object( $value ) && ( ! empty( $value->slug ) || ! empty( $value->name ) ) ) {
            $resolved_slug = self::resolve_term_slug(
                ! empty( $value->slug ) ? $value->slug : '',
                $taxonomy,
                ! empty( $value->name ) ? $value->name : ''
            );
            if ( $resolved_slug ) {
                $slugs[] = $resolved_slug;
            }
        } elseif ( is_numeric( $value ) ) {
            $term = get_term( (int) $value, $taxonomy );
            if ( $term && ! is_wp_error( $term ) && $term->taxonomy === $taxonomy && $term->slug !== $taxonomy ) {
                $slugs[] = $term->slug;
            }
        } elseif ( is_string( $value ) && $value !== '' ) {
            $resolved_slug = self::resolve_term_slug( $value, $taxonomy );
            if ( $resolved_slug ) {
                $slugs[] = $resolved_slug;
            }
        }

        return $slugs;
    }

    /**
     * Возвращает slug существующего терма, проверяя slug/ID/название.
     *
     * @param string $slug_candidate  Возможный slug или произвольное значение.
     * @param string $taxonomy        Таксономия.
     * @param string $name_candidate  Необязательное название терма.
     * @return string
     */
    protected static function resolve_term_slug( $slug_candidate, $taxonomy, $name_candidate = '' ) {
        $slug_candidate = is_string( $slug_candidate ) ? trim( $slug_candidate ) : '';
        if ( '' !== $slug_candidate ) {
            $sanitized = sanitize_title( $slug_candidate );
            if ( $sanitized && $sanitized !== $taxonomy ) {
                $term = get_term_by( 'slug', $sanitized, $taxonomy );
                if ( $term && ! is_wp_error( $term ) ) {
                    return $term->slug;
                }

                if ( ctype_digit( (string) $sanitized ) ) {
                    $term = get_term( (int) $sanitized, $taxonomy );
                    if ( $term && ! is_wp_error( $term ) && $term->taxonomy === $taxonomy ) {
                        return $term->slug;
                    }
                }
            }
        }

        $name_candidate = is_string( $name_candidate ) ? trim( $name_candidate ) : '';
        if ( '' !== $name_candidate ) {
            $term = get_term_by( 'name', $name_candidate, $taxonomy );
            if ( $term && ! is_wp_error( $term ) ) {
                return $term->slug;
            }

            $alt_slug = sanitize_title( $name_candidate );
            if ( $alt_slug && $alt_slug !== $taxonomy ) {
                $term = get_term_by( 'slug', $alt_slug, $taxonomy );
                if ( $term && ! is_wp_error( $term ) ) {
                    return $term->slug;
                }
            }
        }

        return '';
    }
}

