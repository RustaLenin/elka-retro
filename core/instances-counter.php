<?php
/**
 * Instances Counter
 * 
 * Класс для автоматического подсчета и кеширования количества доступных экземпляров
 * для каждого типа игрушки в поле available_instances_count
 * 
 * @package ElkaRetro
 */

class ELKARETRO_INSTANCES_COUNTER {
    
    /**
     * Название поля для хранения количества экземпляров
     */
    const FIELD_NAME = 'available_instances_count';
    
    /**
     * Название CRON события
     */
    const CRON_HOOK = 'elkaretro_recalculate_instances_count';
    
    /**
     * Инициализация класса и подключение хуков
     */
    public static function init() {
        // Хук при обновлении типа игрушки
        add_action('save_post_toy_type', array(__CLASS__, 'update_toy_type_instances_count'), 10, 2);
        
        // Хук при обновлении экземпляра игрушки
        add_action('save_post_toy_instance', array(__CLASS__, 'update_parent_toy_type_instances_count'), 10, 2);
        
        // Хук при изменении статуса экземпляра (публикация, перевод в черновик и т.д.)
        add_action('transition_post_status', array(__CLASS__, 'handle_instance_status_change'), 10, 3);
        
        // Хук при удалении экземпляра (включая корзину)
        add_action('before_delete_post', array(__CLASS__, 'handle_instance_deletion'), 10, 1);
        add_action('trashed_post', array(__CLASS__, 'handle_instance_trash'), 10, 1);
        add_action('untrashed_post', array(__CLASS__, 'handle_instance_untrash'), 10, 1);
        
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
     * Выполняет пересчет всех типов игрушек через CRON
     */
    public static function cron_recalculate_all() {
        // Логируем запуск CRON
        error_log('[ElkaRetro] CRON: Starting instances count recalculation');
        
        $result = self::recalculate_all_instances_count();
        
        // Логируем результат
        if ($result['success']) {
            error_log(sprintf(
                '[ElkaRetro] CRON: Instances count recalculation completed - %s',
                $result['message']
            ));
        } else {
            error_log(sprintf(
                '[ElkaRetro] CRON: Instances count recalculation failed - %s',
                isset($result['message']) ? $result['message'] : 'Unknown error'
            ));
        }
        
        return $result;
    }
    
    /**
     * Получает все дочерние экземпляры для типа игрушки
     * 
     * @param int $toy_type_id ID типа игрушки
     * @return array Массив ID экземпляров
     */
    public static function get_toy_type_instances($toy_type_id) {
        if (!$toy_type_id || !is_numeric($toy_type_id)) {
            return array();
        }
        
        // Проверяем, что Pods доступен
        if (!function_exists('pods')) {
            return array();
        }
        
        // Получаем название поля instances из дата-модели
        $instances_field_config = elkaretro_get_field_config('toy_type', 'instances');
        $instances_meta_field = $instances_field_config && isset($instances_field_config['meta_field']) 
            ? $instances_field_config['meta_field'] 
            : 'instances';
        
        $toy_type_pod = pods('toy_type', $toy_type_id);
        if (!$toy_type_pod || !$toy_type_pod->exists()) {
            return array();
        }
        
        // Получаем связанные экземпляры через Pods relationship
        $instances = $toy_type_pod->field($instances_meta_field);
        $instance_ids = array();
        
        if (!$instances) {
            return $instance_ids;
        }
        
        // Обрабатываем разные форматы возврата Pods
        if (is_array($instances)) {
            foreach ($instances as $instance) {
                $instance_id = self::extract_instance_id($instance);
                if ($instance_id) {
                    $instance_ids[] = $instance_id;
                }
            }
        } elseif (is_object($instances)) {
            $instance_id = self::extract_instance_id($instances);
            if ($instance_id) {
                $instance_ids[] = $instance_id;
            }
        } elseif (is_numeric($instances)) {
            $instance_ids[] = (int)$instances;
        }
        
        return array_unique($instance_ids);
    }
    
    /**
     * Извлекает ID экземпляра из объекта/массива
     * 
     * @param mixed $instance Объект, массив или число
     * @return int|null ID экземпляра или null
     */
    private static function extract_instance_id($instance) {
        if (is_numeric($instance)) {
            return (int)$instance;
        }
        
        if (is_object($instance)) {
            if (isset($instance->ID)) {
                return (int)$instance->ID;
            }
            if (isset($instance->id)) {
                return (int)$instance->id;
            }
        }
        
        if (is_array($instance)) {
            if (isset($instance['ID'])) {
                return (int)$instance['ID'];
            }
            if (isset($instance['id'])) {
                return (int)$instance['id'];
            }
        }
        
        return null;
    }
    
    /**
     * Подсчитывает количество опубликованных экземпляров для типа игрушки
     * 
     * @param int $toy_type_id ID типа игрушки
     * @return int Количество опубликованных экземпляров
     */
    public static function count_available_instances($toy_type_id) {
        $instance_ids = self::get_toy_type_instances($toy_type_id);
        
        if (empty($instance_ids)) {
            return 0;
        }
        
        $available_count = 0;
        foreach ($instance_ids as $instance_id) {
            $status = get_post_status($instance_id);
            if ($status === 'publish') {
                $available_count++;
            }
        }
        
        return $available_count;
    }
    
    /**
     * Массовый пересчет счетчика экземпляров для всех типов игрушек
     * 
     * @param int|null $limit Лимит обработки записей (null для всех)
     * @return array Результат с количеством обработанных и обновленных записей
     */
    public static function recalculate_all_instances_count($limit = null) {
        $query_args = array(
            'post_type' => 'toy_type',
            'post_status' => 'any', // Обрабатываем все статусы
            'posts_per_page' => $limit ? (int)$limit : -1,
            'orderby' => 'ID',
            'order' => 'ASC',
            'fields' => 'ids' // Получаем только ID для оптимизации
        );
        
        $query = new WP_Query($query_args);
        
        $processed = 0;
        $updated = 0;
        $errors = array();
        
        foreach ($query->posts as $toy_type_id) {
            $processed++;
            
            $result = self::update_instances_count($toy_type_id);
            
            if ($result) {
                $updated++;
            } else {
                $errors[] = $toy_type_id;
            }
        }
        
        wp_reset_postdata();
        
        return array(
            'success' => true,
            'processed' => $processed,
            'updated' => $updated,
            'errors' => $errors,
            'message' => sprintf(
                'Processed %d toy types: %d updated successfully, %d errors',
                $processed,
                $updated,
                count($errors)
            )
        );
    }
    
    /**
     * Обновляет поле available_instances_count для типа игрушки
     * 
     * @param int $toy_type_id ID типа игрушки
     * @return bool true если обновление прошло успешно, false в противном случае
     */
    public static function update_instances_count($toy_type_id) {
        if (!$toy_type_id || !is_numeric($toy_type_id)) {
            return false;
        }
        
        // Проверяем, что Pods доступен
        if (!function_exists('pods')) {
            return false;
        }
        
        // Подсчитываем количество доступных экземпляров
        $count = self::count_available_instances($toy_type_id);
        
        // Обновляем поле через Pods
        $toy_type_pod = pods('toy_type', $toy_type_id);
        if (!$toy_type_pod || !$toy_type_pod->exists()) {
            return false;
        }
        
        $result = $toy_type_pod->save(self::FIELD_NAME, $count);
        
        if ($result) {
            // Очищаем кеш поста для WordPress
            clean_post_cache($toy_type_id);
        }
        
        return $result !== false;
    }
    
    /**
     * Обновляет счетчик экземпляров при сохранении типа игрушки
     * 
     * @param int $post_id ID поста
     * @param WP_Post $post Объект поста
     */
    public static function update_toy_type_instances_count($post_id, $post) {
        // Проверяем, что это не ревизия и не автосохранение
        if (wp_is_post_revision($post_id) || wp_is_post_autosave($post_id)) {
            return;
        }
        
        // Проверяем тип поста
        if ($post->post_type !== 'toy_type') {
            return;
        }
        
        // Обновляем счетчик
        self::update_instances_count($post_id);
    }
    
    /**
     * Обновляет счетчик экземпляров родительского типа при сохранении экземпляра
     * 
     * @param int $post_id ID поста экземпляра
     * @param WP_Post $post Объект поста
     */
    public static function update_parent_toy_type_instances_count($post_id, $post) {
        // Проверяем, что это не ревизия и не автосохранение
        if (wp_is_post_revision($post_id) || wp_is_post_autosave($post_id)) {
            return;
        }
        
        // Проверяем тип поста
        if ($post->post_type !== 'toy_instance') {
            return;
        }
        
        // Получаем родительский тип игрушки
        $toy_type_id = self::get_parent_toy_type_id($post_id);
        
        if ($toy_type_id) {
            // Обновляем счетчик родительского типа
            self::update_instances_count($toy_type_id);
        }
    }
    
    /**
     * Обрабатывает изменение статуса экземпляра
     * 
     * @param string $new_status Новый статус
     * @param string $old_status Старый статус
     * @param WP_Post $post Объект поста
     */
    public static function handle_instance_status_change($new_status, $old_status, $post) {
        // Обрабатываем только экземпляры игрушек
        if ($post->post_type !== 'toy_instance') {
            return;
        }
        
        // Обновляем только если статус изменился и это не ревизия
        if ($new_status === $old_status || wp_is_post_revision($post->ID)) {
            return;
        }
        
        // Обновляем только если один из статусов - publish
        // (публикация или перевод из публикации в другой статус)
        if ($new_status === 'publish' || $old_status === 'publish') {
            $toy_type_id = self::get_parent_toy_type_id($post->ID);
            
            if ($toy_type_id) {
                self::update_instances_count($toy_type_id);
            }
        }
    }
    
    /**
     * Обрабатывает удаление экземпляра
     * 
     * @param int $post_id ID поста
     */
    public static function handle_instance_deletion($post_id) {
        $post = get_post($post_id);
        
        if (!$post || $post->post_type !== 'toy_instance') {
            return;
        }
        
        // Получаем родительский тип до удаления
        $toy_type_id = self::get_parent_toy_type_id($post_id);
        
        if ($toy_type_id) {
            // Обновляем счетчик родительского типа
            self::update_instances_count($toy_type_id);
        }
    }
    
    /**
     * Обрабатывает перемещение экземпляра в корзину
     * 
     * @param int $post_id ID поста
     */
    public static function handle_instance_trash($post_id) {
        $post = get_post($post_id);
        
        if (!$post || $post->post_type !== 'toy_instance') {
            return;
        }
        
        // Если экземпляр был опубликован, нужно обновить счетчик
        if ($post->post_status === 'publish') {
            $toy_type_id = self::get_parent_toy_type_id($post_id);
            
            if ($toy_type_id) {
                self::update_instances_count($toy_type_id);
            }
        }
    }
    
    /**
     * Обрабатывает восстановление экземпляра из корзины
     * 
     * @param int $post_id ID поста
     */
    public static function handle_instance_untrash($post_id) {
        $post = get_post($post_id);
        
        if (!$post || $post->post_type !== 'toy_instance') {
            return;
        }
        
        // Получаем родительский тип и обновляем счетчик
        $toy_type_id = self::get_parent_toy_type_id($post_id);
        
        if ($toy_type_id) {
            // Используем отложенное обновление через shutdown, чтобы статус успел восстановиться
            add_action('shutdown', function() use ($toy_type_id, $post_id) {
                $post = get_post($post_id);
                if ($post && $post->post_status === 'publish') {
                    self::update_instances_count($toy_type_id);
                }
            }, 999);
        }
    }
    
    /**
     * Получает ID родительского типа игрушки для экземпляра
     * 
     * @param int $instance_id ID экземпляра
     * @return int|null ID типа игрушки или null
     */
    private static function get_parent_toy_type_id($instance_id) {
        if (!$instance_id || !is_numeric($instance_id)) {
            return null;
        }
        
        // Проверяем, что Pods доступен
        if (!function_exists('pods')) {
            return null;
        }
        
        // Получаем название поля connection_type_of_toy из дата-модели
        $connection_field_config = elkaretro_get_field_config('toy_instance', 'connection_type_of_toy');
        $connection_meta_field = $connection_field_config && isset($connection_field_config['meta_field']) 
            ? $connection_field_config['meta_field'] 
            : 'connection_type_of_toy';
        
        $instance_pod = pods('toy_instance', $instance_id);
        if (!$instance_pod || !$instance_pod->exists()) {
            return null;
        }
        
        // Получаем связанный тип игрушки
        $toy_type = $instance_pod->field($connection_meta_field);
        
        if (!$toy_type) {
            return null;
        }
        
        // Извлекаем ID из объекта/массива
        $toy_type_id = self::extract_instance_id($toy_type);
        
        return $toy_type_id ? (int)$toy_type_id : null;
    }
}

// Инициализируем класс
ELKARETRO_INSTANCES_COUNTER::init();

