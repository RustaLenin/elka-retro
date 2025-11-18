<?php
/**
 * Category Counter
 * 
 * Класс для автоматического подсчета и кеширования количества типов игрушек
 * в каждой категории (только типы с available_instances_count > 0)
 * 
 * @package ElkaRetro
 */

class ELKARETRO_CATEGORY_COUNTER {
    
    /**
     * Название поля для хранения количества типов
     */
    const FIELD_NAME = 'toy_types_count';
    
    /**
     * Slug таксономии категорий
     */
    const TAXONOMY = 'category-of-toys';
    
    /**
     * Название CRON события
     */
    const CRON_HOOK = 'elkaretro_recalculate_category_counts';
    
    /**
     * Инициализация класса и подключение хуков
     */
    public static function init() {
        // Хук при сохранении типа игрушки
        add_action('save_post_toy_type', array(__CLASS__, 'handle_toy_type_save'), 10, 2);
        
        // Хук при изменении связи типа с категориями
        add_action('set_object_terms', array(__CLASS__, 'handle_toy_type_categories_change'), 10, 4);
        
        // Хук при изменении статуса типа
        add_action('transition_post_status', array(__CLASS__, 'handle_toy_type_status_change'), 10, 3);
        
        // Хук при изменении счетчика экземпляров (из ELKARETRO_INSTANCES_COUNTER)
        add_action('elkaretro_instances_count_updated', array(__CLASS__, 'handle_instances_count_change'), 10, 2);
        
        // CRON для автоматического пересчета
        add_action(self::CRON_HOOK, array(__CLASS__, 'cron_recalculate_all'));
        
        // Регистрация CRON при активации темы
        add_action('after_switch_theme', array(__CLASS__, 'schedule_cron'));
        
        // Очистка CRON при деактивации темы
        add_action('switch_theme', array(__CLASS__, 'unschedule_cron'));
        
        // Проверяем и планируем CRON при загрузке (если еще не запланирован)
        add_action('admin_init', array(__CLASS__, 'maybe_schedule_cron'));
    }
    
    /**
     * Проверяет и планирует CRON, если он еще не запланирован
     */
    public static function maybe_schedule_cron() {
        if (!wp_next_scheduled(self::CRON_HOOK)) {
            self::schedule_cron();
        }
    }
    
    /**
     * Планирует CRON задачу для автоматического пересчета
     */
    public static function schedule_cron() {
        // Проверяем, не запланирована ли уже задача
        if (!wp_next_scheduled(self::CRON_HOOK)) {
            // Планируем ежедневный запуск в 3:00 ночи по времени сайта
            $timestamp = self::get_next_3am_timestamp();
            wp_schedule_event($timestamp, 'daily', self::CRON_HOOK);
        }
    }
    
    /**
     * Получает timestamp следующего запуска в 3:00 ночи
     * 
     * @return int Unix timestamp
     */
    private static function get_next_3am_timestamp() {
        $timezone = wp_timezone();
        $now = new DateTime('now', $timezone);
        $target = new DateTime('today 3:00', $timezone);
        
        // Если уже прошло 3:00 сегодня, планируем на завтра
        if ($now >= $target) {
            $target->modify('+1 day');
        }
        
        return $target->getTimestamp();
    }
    
    /**
     * Удаляет запланированную CRON задачу
     */
    public static function unschedule_cron() {
        $timestamp = wp_next_scheduled(self::CRON_HOOK);
        if ($timestamp) {
            wp_unschedule_event($timestamp, self::CRON_HOOK);
        }
    }
    
    /**
     * Обработчик сохранения типа игрушки
     * 
     * @param int $post_id ID поста
     * @param WP_Post $post Объект поста
     */
    public static function handle_toy_type_save($post_id, $post) {
        // Проверяем, что это не автосохранение
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }
        
        // Проверяем, что это нужный тип поста
        if ($post->post_type !== 'toy_type') {
            return;
        }
        
        // Проверяем, что пост опубликован
        if ($post->post_status !== 'publish') {
            // Если пост не опубликован, обновляем счетчики для всех его категорий (уменьшаем счетчики)
            self::update_toy_type_categories($post_id);
            return;
        }
        
        // Обновляем счетчики для всех категорий типа
        self::update_toy_type_categories($post_id);
    }
    
    /**
     * Обработчик изменения связи типа с категориями
     * 
     * @param int $object_id ID объекта
     * @param array $terms Массив терминов
     * @param array $tt_ids Массив term_taxonomy_id
     * @param string $taxonomy Slug таксономии
     */
    public static function handle_toy_type_categories_change($object_id, $terms, $tt_ids, $taxonomy) {
        // Проверяем, что это нужная таксономия
        if ($taxonomy !== self::TAXONOMY) {
            return;
        }
        
        // Проверяем, что это тип игрушки
        $post = get_post($object_id);
        if (!$post || $post->post_type !== 'toy_type') {
            return;
        }
        
        // Обновляем счетчики для всех категорий типа
        self::update_toy_type_categories($object_id);
    }
    
    /**
     * Обработчик изменения статуса типа
     * 
     * @param string $new_status Новый статус
     * @param string $old_status Старый статус
     * @param WP_Post $post Объект поста
     */
    public static function handle_toy_type_status_change($new_status, $old_status, $post) {
        // Проверяем, что это тип игрушки
        if ($post->post_type !== 'toy_type') {
            return;
        }
        
        // Обновляем счетчики только если статус изменился с/на publish
        if ($new_status === 'publish' || $old_status === 'publish') {
            self::update_toy_type_categories($post->ID);
        }
    }
    
    /**
     * Обработчик изменения счетчика экземпляров
     * 
     * @param int $toy_type_id ID типа игрушки
     * @param int $count Новое количество экземпляров
     */
    public static function handle_instances_count_change($toy_type_id, $count) {
        // Обновляем счетчики для всех категорий типа
        // Если счетчик стал 0, тип больше не должен учитываться
        // Если счетчик стал >0, тип должен учитываться
        self::update_toy_type_categories($toy_type_id);
    }
    
    /**
     * Обновляет счетчики для всех категорий типа игрушки
     * 
     * @param int $toy_type_id ID типа игрушки
     */
    public static function update_toy_type_categories($toy_type_id) {
        if (!$toy_type_id || !is_numeric($toy_type_id)) {
            return;
        }
        
        // Получаем категории типа
        $category_ids = wp_get_post_terms($toy_type_id, self::TAXONOMY, array('fields' => 'ids'));
        
        if (is_wp_error($category_ids) || empty($category_ids)) {
            // Если у типа нет категорий, ничего не делаем
            return;
        }
        
        // Обновляем счетчики для каждой категории
        foreach ($category_ids as $category_id) {
            self::update_category_count($category_id);
        }
    }
    
    /**
     * Подсчитывает количество типов игрушек в категории
     * 
     * @param int $category_id ID категории
     * @return int Количество типов с available_instances_count > 0
     */
    public static function count_toy_types_in_category($category_id) {
        if (!$category_id || !is_numeric($category_id)) {
            return 0;
        }
        
        // Проверяем существование категории
        $term = get_term($category_id, self::TAXONOMY);
        if (!$term || is_wp_error($term)) {
            return 0;
        }
        
        // Запрос для подсчета типов в категории с available_instances_count > 0
        $args = array(
            'post_type' => 'toy_type',
            'post_status' => 'publish',
            'posts_per_page' => -1,
            'fields' => 'ids',
            'no_found_rows' => true,
            'tax_query' => array(
                array(
                    'taxonomy' => self::TAXONOMY,
                    'field' => 'term_id',
                    'terms' => $category_id,
                    'include_children' => false, // Считаем только прямые типы, не из дочерних категорий
                ),
            ),
            'meta_query' => array(
                array(
                    'key' => 'available_instances_count',
                    'value' => 0,
                    'compare' => '>',
                    'type' => 'NUMERIC',
                ),
            ),
        );
        
        $query = new WP_Query($args);
        $count = count($query->posts);
        
        wp_reset_postdata();
        
        return $count;
    }
    
    /**
     * Обновляет счетчик типов для категории
     * 
     * @param int $category_id ID категории
     * @return bool true если обновление прошло успешно, false в противном случае
     */
    public static function update_category_count($category_id) {
        if (!$category_id || !is_numeric($category_id)) {
            return false;
        }
        
        // Проверяем существование категории
        $term = get_term($category_id, self::TAXONOMY);
        if (!$term || is_wp_error($term)) {
            return false;
        }
        
        // Подсчитываем количество типов
        $count = self::count_toy_types_in_category($category_id);
        
        // Обновляем term meta
        $result = update_term_meta($category_id, self::FIELD_NAME, $count);
        
        if ($result !== false) {
            // Очищаем кеш термина
            clean_term_cache($category_id, self::TAXONOMY);
        }
        
        return $result !== false;
    }
    
    /**
     * Полный пересчет счетчиков для всех категорий
     * 
     * @return array Результат пересчета (success, updated, errors)
     */
    public static function recalculate_all_categories() {
        $start_time = microtime(true);
        
        // Получаем все категории
        $categories = get_terms(array(
            'taxonomy' => self::TAXONOMY,
            'hide_empty' => false, // Получаем все категории, даже пустые
        ));
        
        if (is_wp_error($categories) || empty($categories)) {
            return array(
                'success' => false,
                'message' => 'Failed to get categories',
                'updated' => 0,
                'errors' => array(),
            );
        }
        
        $updated = 0;
        $errors = array();
        
        foreach ($categories as $category) {
            $result = self::update_category_count($category->term_id);
            
            if ($result) {
                $updated++;
            } else {
                $errors[] = sprintf('Failed to update category %d (%s)', $category->term_id, $category->name);
            }
        }
        
        $end_time = microtime(true);
        $duration = round($end_time - $start_time, 2);
        
        // Логируем результат
        error_log(sprintf(
            '[ELKARETRO_CATEGORY_COUNTER] Recalculated %d categories in %s seconds. Updated: %d, Errors: %d',
            count($categories),
            $duration,
            $updated,
            count($errors)
        ));
        
        return array(
            'success' => count($errors) === 0,
            'message' => sprintf('Recalculated %d categories', count($categories)),
            'updated' => $updated,
            'errors' => $errors,
            'duration' => $duration,
        );
    }
    
    /**
     * CRON задача для автоматического пересчета всех категорий
     */
    public static function cron_recalculate_all() {
        $result = self::recalculate_all_categories();
        
        // Логируем результат
        if ($result['success']) {
            error_log(sprintf(
                '[ELKARETRO_CATEGORY_COUNTER] CRON: Successfully recalculated %d categories',
                $result['updated']
            ));
        } else {
            error_log(sprintf(
                '[ELKARETRO_CATEGORY_COUNTER] CRON: Recalculation completed with %d errors',
                count($result['errors'])
            ));
        }
    }
}

// Инициализируем класс
ELKARETRO_CATEGORY_COUNTER::init();

