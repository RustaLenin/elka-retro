<?php
/**
 * Theme Settings Manager
 * 
 * Управление настройками темы через wp_options
 * 
 * @package ElkaRetro
 */

class ELKARETRO_THEME_SETTINGS {
    
    /**
     * Префикс для всех опций темы
     */
    const OPTION_PREFIX = 'elkaretro_';
    
    /**
     * Список опций с дефолтными значениями и типами
     */
    private static $defaults = array(
        'production_url' => array(
            'default' => '',
            'type' => 'url',
            'label' => 'Production Site URL',
            'description' => 'URL продакшен сайта для синхронизации данных через REST API',
            'sanitize' => 'esc_url_raw'
        ),
        // Добавляйте другие опции по необходимости
    );
    
    /**
     * Инициализация
     */
    public static function init() {
        add_action('admin_init', array(__CLASS__, 'register_settings'));
    }
    
    /**
     * Регистрирует настройки в WordPress
     */
    public static function register_settings() {
        foreach (self::$defaults as $key => $config) {
            register_setting(
                'elkaretro_settings_group',
                self::OPTION_PREFIX . $key,
                array(
                    'type' => isset($config['type']) ? $config['type'] : 'string',
                    'sanitize_callback' => isset($config['sanitize']) ? array(__CLASS__, 'sanitize_' . $config['sanitize']) : 'sanitize_text_field',
                    'default' => isset($config['default']) ? $config['default'] : ''
                )
            );
        }
    }
    
    /**
     * Санитизация URL
     */
    public static function sanitize_esc_url_raw($value) {
        return esc_url_raw($value);
    }
    
    /**
     * Получить значение опции
     */
    public static function get($key, $default = null) {
        $option_key = self::OPTION_PREFIX . $key;
        $value = get_option($option_key, null);
        
        if ($value === null && isset(self::$defaults[$key])) {
            return self::$defaults[$key]['default'];
        }
        
        return $value !== null ? $value : $default;
    }
    
    /**
     * Установить значение опции
     */
    public static function set($key, $value) {
        $option_key = self::OPTION_PREFIX . $key;
        return update_option($option_key, $value);
    }
    
    /**
     * Получить все опции
     */
    public static function get_all() {
        $options = array();
        foreach (self::$defaults as $key => $config) {
            $options[$key] = self::get($key);
        }
        return $options;
    }
    
    /**
     * Получить конфигурацию опции
     */
    public static function get_config($key) {
        return isset(self::$defaults[$key]) ? self::$defaults[$key] : null;
    }
    
    /**
     * Получить все конфигурации
     */
    public static function get_all_configs() {
        return self::$defaults;
    }
}

// Инициализируем настройки
ELKARETRO_THEME_SETTINGS::init();

