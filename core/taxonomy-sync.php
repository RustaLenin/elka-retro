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
}

