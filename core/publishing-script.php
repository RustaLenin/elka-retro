<?php
/**
 * Publishing Script
 * 
 * Скрипт для массовой публикации типов игрушек и экземпляров
 * Проверяет записи в статусе draft и переводит их в published или промежуточные статусы
 * 
 * @package ElkaRetro
 */

class ELKARETRO_PUBLISHING_SCRIPT {
    
    /**
     * Лимит записей за один запуск
     * Временно закомментировано для разовой обработки всех записей
     */
    // const BATCH_LIMIT = 100;
    
    /**
     * Инициализация
     */
    public static function init() {
        // Админская страница будет добавлена в mock-data-installer.php
        add_action('admin_init', array(__CLASS__, 'handle_action'));
    }
    
    /**
     * Обрабатывает действия публикации
     */
    public static function handle_action() {
        if (!isset($_GET['elkaretro_action']) || !isset($_GET['_wpnonce'])) {
            return;
        }
        
        $action = sanitize_text_field($_GET['elkaretro_action']);
        $page = isset($_GET['page']) ? sanitize_text_field($_GET['page']) : '';
        
        // Проверяем, что действие на правильной странице
        if ($page !== 'elkaretro-settings') {
            return;
        }
        
        // Проверяем права доступа
        if (!current_user_can('manage_options')) {
            wp_die('You do not have sufficient permissions to access this page.');
        }
        
        // Обрабатываем действия публикации
        if ($action === 'publish_toy_types') {
            check_admin_referer('elkaretro_action_publish_toy_types');
            self::publish_toy_types();
        } elseif ($action === 'publish_toy_instances') {
            check_admin_referer('elkaretro_action_publish_toy_instances');
            self::publish_toy_instances();
        }
    }
    
    /**
     * Публикует типы игрушек
     */
    public static function publish_toy_types() {
        if (!defined('ELKARETRO_DATA_MODEL')) {
            self::redirect_with_notice('error', 'Data model not loaded');
            return;
        }
        
        $data_model = ELKARETRO_DATA_MODEL;
        $post_type = 'toy_type';
        $requirements = isset($data_model['post_types'][$post_type]['publishing_requirements']) 
            ? $data_model['post_types'][$post_type]['publishing_requirements'] 
            : null;
        
        if (!$requirements) {
            self::redirect_with_notice('error', 'Publishing requirements not found in data model');
            return;
        }
        
        // Получаем записи в статусах draft, pending, specification и decoration
        // Временно убран батчинг для разовой обработки всех записей
        $query = new WP_Query(array(
            'post_type' => $post_type,
            'post_status' => array('draft', 'pending', 'specification', 'decoration'),
            'posts_per_page' => -1, // Обрабатываем все записи
            'orderby' => 'ID',
            'order' => 'ASC'
        ));
        
        $published = 0;
        $skipped = 0;
        $errors = array();
        
        foreach ($query->posts as $post) {
            $result = self::check_and_publish_post($post, $requirements, $post_type);
            
            if ($result['status'] === 'published') {
                $published++;
            } elseif ($result['status'] === 'intermediate') {
                $skipped++;
            } else {
                $skipped++;
                if (!empty($result['error'])) {
                    $errors[] = "Post #{$post->ID}: {$result['error']}";
                }
            }
        }
        
        $message = sprintf(
            'Processed %d toy types: %d published, %d skipped',
            $query->found_posts,
            $published,
            $skipped
        );
        
        if (!empty($errors)) {
            $message .= '. Errors: ' . implode('; ', array_slice($errors, 0, 5));
            if (count($errors) > 5) {
                $message .= '...';
            }
        }
        
        self::redirect_with_notice('success', $message);
    }
    
    /**
     * Публикует экземпляры игрушек
     */
    public static function publish_toy_instances() {
        if (!defined('ELKARETRO_DATA_MODEL')) {
            self::redirect_with_notice('error', 'Data model not loaded');
            return;
        }
        
        $data_model = ELKARETRO_DATA_MODEL;
        $post_type = 'toy_instance';
        $requirements = isset($data_model['post_types'][$post_type]['publishing_requirements']) 
            ? $data_model['post_types'][$post_type]['publishing_requirements'] 
            : null;
        
        if (!$requirements) {
            self::redirect_with_notice('error', 'Publishing requirements not found in data model');
            return;
        }
        
        // Получаем записи в статусах draft, pending, specification и decoration
        // Временно убран батчинг для разовой обработки всех записей
        $query = new WP_Query(array(
            'post_type' => $post_type,
            'post_status' => array('draft', 'pending', 'specification', 'decoration'),
            'posts_per_page' => -1, // Обрабатываем все записи
            'orderby' => 'ID',
            'order' => 'ASC'
        ));
        
        $published = 0;
        $skipped = 0;
        $errors = array();
        
        foreach ($query->posts as $post) {
            $result = self::check_and_publish_post($post, $requirements, $post_type);
            
            if ($result['status'] === 'published') {
                $published++;
            } elseif ($result['status'] === 'intermediate') {
                $skipped++;
            } else {
                $skipped++;
                if (!empty($result['error'])) {
                    $errors[] = "Post #{$post->ID}: {$result['error']}";
                }
            }
        }
        
        $message = sprintf(
            'Processed %d toy instances: %d published, %d skipped',
            $query->found_posts,
            $published,
            $skipped
        );
        
        if (!empty($errors)) {
            $message .= '. Errors: ' . implode('; ', array_slice($errors, 0, 5));
            if (count($errors) > 5) {
                $message .= '...';
            }
        }
        
        self::redirect_with_notice('success', $message);
    }
    
    /**
     * Проверяет запись и публикует её или переводит в промежуточный статус
     * 
     * @param WP_Post $post Запись для проверки
     * @param array $requirements Требования для публикации из дата-модели
     * @param string $post_type Тип поста
     * @return array Результат проверки
     */
    private static function check_and_publish_post($post, $requirements, $post_type) {
        $required_fields = isset($requirements['required_for_publish']) 
            ? $requirements['required_for_publish'] 
            : array();
        
        $missing_fields = array();
        $missing_descriptions = array();
        
        // Проверяем каждое обязательное поле
        foreach ($required_fields as $field_config) {
            $field_name = $field_config['field'];
            $field_type = isset($field_config['type']) ? $field_config['type'] : 'wp_core';
            $check_type = isset($field_config['check_type']) ? $field_config['check_type'] : null;
            
            $is_valid = self::check_field_value($post, $field_name, $field_type, $check_type, $field_config);
            
            if (!$is_valid) {
                $missing_fields[] = $field_name;
                $missing_descriptions[] = isset($field_config['description']) 
                    ? $field_config['description'] 
                    : $field_name;
            }
        }
        
        // Если все поля заполнены - публикуем
        if (empty($missing_fields)) {
            $result = wp_update_post(array(
                'ID' => $post->ID,
                'post_status' => 'publish'
            ), true);
            
            if (is_wp_error($result)) {
                return array(
                    'status' => 'error',
                    'error' => $result->get_error_message()
                );
            }
            
            return array('status' => 'published');
        }
        
        // Если есть недостающие поля - проверяем промежуточные статусы
        $intermediate_status = self::determine_intermediate_status($post, $requirements, $missing_fields);
        
        // Формируем комментарий для администратора
        $comment = self::format_admin_comment($missing_descriptions);
        self::update_admin_comment($post->ID, $comment, $post_type);
        
        // Если определен промежуточный статус - переводим в него
        if ($intermediate_status) {
            $result = wp_update_post(array(
                'ID' => $post->ID,
                'post_status' => $intermediate_status
            ), true);
            
            if (is_wp_error($result)) {
                return array(
                    'status' => 'error',
                    'error' => $result->get_error_message()
                );
            }
            
            return array('status' => 'intermediate', 'status_name' => $intermediate_status);
        }
        
        // Оставляем в draft с комментарием
        return array('status' => 'draft', 'missing_fields' => $missing_fields);
    }
    
    /**
     * Проверяет значение поля
     * 
     * @param WP_Post $post Запись
     * @param string $field_name Имя поля
     * @param string $field_type Тип поля (wp_core, pods_field, taxonomy)
     * @param string|null $check_type Тип проверки (has_related, has_terms, numeric_gt_zero)
     * @param array $field_config Конфигурация поля
     * @return bool true если поле заполнено и валидно
     */
    private static function check_field_value($post, $field_name, $field_type, $check_type, $field_config) {
        if ($field_type === 'wp_core') {
            // Проверка стандартных полей WordPress
            if ($field_name === 'post_title') {
                return !empty($post->post_title);
            } elseif ($field_name === 'post_excerpt') {
                // Проверяем excerpt или content (для toy_instance может быть любое из них)
                $has_excerpt = !empty(trim($post->post_excerpt));
                $has_content = !empty(trim($post->post_content));
                return $has_excerpt || $has_content;
            } elseif ($field_name === '_thumbnail_id') {
                $thumbnail_id = get_post_thumbnail_id($post->ID);
                return !empty($thumbnail_id);
            }
        } elseif ($field_type === 'pods_field') {
            // Проверка полей Pods
            if ($check_type === 'has_related') {
                // Проверка связанных записей
                $related_post_type = isset($field_config['related_post_type']) 
                    ? $field_config['related_post_type'] 
                    : null;
                
                if ($related_post_type) {
                    $pods = pods($post->post_type, $post->ID);
                    if ($pods && $pods->exists()) {
                        $related = $pods->field($field_name);
                        return !empty($related);
                    }
                }
                return false;
            } elseif ($check_type === 'numeric_gt_zero') {
                // Проверка числового значения > 0
                $pods = pods($post->post_type, $post->ID);
                if ($pods && $pods->exists()) {
                    $value = $pods->field($field_name);
                    return !empty($value) && is_numeric($value) && floatval($value) > 0;
                }
                return false;
            } else {
                // Обычная проверка Pods поля
                $pods = pods($post->post_type, $post->ID);
                if ($pods && $pods->exists()) {
                    $value = $pods->field($field_name);
                    return !empty($value);
                }
                return false;
            }
        } elseif ($field_type === 'taxonomy') {
            // Проверка таксономий
            if ($check_type === 'has_terms') {
                $terms = wp_get_post_terms($post->ID, $field_name);
                return !empty($terms) && !is_wp_error($terms);
            }
            return false;
        }
        
        return false;
    }
    
    /**
     * Определяет промежуточный статус на основе условий
     * 
     * @param WP_Post $post Запись
     * @param array $requirements Требования
     * @param array $missing_fields Список недостающих полей
     * @return string|null Slug промежуточного статуса или null
     */
    private static function determine_intermediate_status($post, $requirements, $missing_fields) {
        $intermediate_statuses = isset($requirements['intermediate_statuses']) 
            ? $requirements['intermediate_statuses'] 
            : array();
        
        if (empty($intermediate_statuses)) {
            return null;
        }
        
        // Сортируем статусы по приоритету (меньше = выше приоритет)
        uasort($intermediate_statuses, function($a, $b) {
            $priority_a = isset($a['conditions']['priority']) ? $a['conditions']['priority'] : 999;
            $priority_b = isset($b['conditions']['priority']) ? $b['conditions']['priority'] : 999;
            return $priority_a - $priority_b;
        });
        
        // Проверяем каждый статус по порядку приоритета
        foreach ($intermediate_statuses as $status_slug => $status_config) {
            $conditions = isset($status_config['conditions']) ? $status_config['conditions'] : array();
            
            if (self::check_intermediate_conditions($post, $conditions, $missing_fields)) {
                return $status_slug;
            }
        }
        
        return null;
    }
    
    /**
     * Проверяет условия для промежуточного статуса
     * 
     * @param WP_Post $post Запись
     * @param array $conditions Условия
     * @param array $missing_fields Недостающие поля
     * @return bool true если условия выполнены
     */
    private static function check_intermediate_conditions($post, $conditions, $missing_fields) {
        // Проверка has_photos
        if (isset($conditions['has_photos']) && $conditions['has_photos']) {
            $thumbnail_id = get_post_thumbnail_id($post->ID);
            $pods = pods($post->post_type, $post->ID);
            $has_photos = false;
            
            if ($post->post_type === 'toy_type') {
                $photos = $pods ? $pods->field('toy_type_photos') : null;
            } else {
                $photos = $pods ? $pods->field('photos_of_the_toy_instance') : null;
            }
            
            $has_photos = !empty($thumbnail_id) || !empty($photos);
            
            if (!$has_photos) {
                return false;
            }
        }
        
        // Проверка has_data
        if (isset($conditions['has_data']) && $conditions['has_data']) {
            $has_data = !empty($post->post_title) || !empty($post->post_content) || !empty($post->post_excerpt);
            if (!$has_data) {
                return false;
            }
        }
        
        // Проверка missing_fields (хотя бы одно из указанных полей должно отсутствовать)
        $missing_fields_check = false;
        if (isset($conditions['missing_fields']) && is_array($conditions['missing_fields'])) {
            $matches = array_intersect($missing_fields, $conditions['missing_fields']);
            $missing_fields_check = !empty($matches);
            // Если указано missing_fields, то хотя бы одно должно отсутствовать
            if (!$missing_fields_check) {
                return false;
            }
        }
        
        // Проверка or_missing (опциональное условие - работает как дополнительное OR условие)
        // Если missing_fields выполнилось, то or_missing не обязательно
        // Если missing_fields не указано или не выполнилось, то or_missing проверяется отдельно
        if (isset($conditions['or_missing']) && is_array($conditions['or_missing'])) {
            $matches = array_intersect($missing_fields, $conditions['or_missing']);
            $or_missing_check = !empty($matches);
            
            // Если missing_fields не указано или не выполнилось, то or_missing обязательно должно выполниться
            // Если missing_fields выполнилось, то or_missing опционально (не блокирует)
            if (!isset($conditions['missing_fields']) || !$missing_fields_check) {
                if (!$or_missing_check) {
                    return false;
                }
            }
            // Если missing_fields выполнилось, то or_missing игнорируется (не блокирует)
        }
        
        // Если все обязательные условия выполнены, возвращаем true
        return true;
    }
    
    /**
     * Форматирует комментарий для администратора
     * 
     * @param array $missing_descriptions Описания недостающих полей
     * @return string Отформатированный комментарий
     */
    private static function format_admin_comment($missing_descriptions) {
        $date = current_time('mysql');
        $comment = "[{$date}] Автоматическая проверка: не заполнены поля:\n";
        $comment .= "- " . implode("\n- ", $missing_descriptions);
        return $comment;
    }
    
    /**
     * Обновляет комментарий администратора
     * 
     * @param int $post_id ID записи
     * @param string $new_comment Новый комментарий
     * @param string $post_type Тип поста
     */
    private static function update_admin_comment($post_id, $new_comment, $post_type) {
        $pods = pods($post_type, $post_id);
        if (!$pods || !$pods->exists()) {
            return;
        }
        
        // Получаем текущий комментарий
        $current_comment = $pods->field('admin_comment');
        
        // Если комментарий не пустой - конкатенируем
        if (!empty($current_comment)) {
            $new_comment = $current_comment . "\n\n" . $new_comment;
        }
        
        // Сохраняем обновленный комментарий
        $pods->save('admin_comment', $new_comment);
    }
    
    /**
     * Перенаправляет с уведомлением
     * 
     * @param string $type Тип уведомления (success, error, warning)
     * @param string $message Сообщение
     */
    private static function redirect_with_notice($type, $message) {
        $redirect_url = add_query_arg(
            array(
                'elkaretro_notice' => urlencode($message),
                'elkaretro_notice_type' => $type
            ),
            admin_url('themes.php?page=elkaretro-settings')
        );
        
        wp_safe_redirect($redirect_url);
        exit;
    }
}

// Инициализируем скрипт публикации
ELKARETRO_PUBLISHING_SCRIPT::init();

