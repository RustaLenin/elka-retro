<?php
/**
 * Asset Versioning System
 * 
 * Предоставляет механизм версионирования статических ресурсов (JS/CSS)
 * для решения проблем с кешированием в браузере.
 * 
 * Решение:
 * 1. Генерация версии проекта на основе времени модификации всех файлов в теме
 * 2. Передача версии в JavaScript через window.APP_VERSION
 * 3. JavaScript добавляет версию к динамическим импортам через конкатенацию: 
 *    import('./path.js?v=' + window.APP_VERSION)
 */

namespace Elkaretro\Core;

defined('ABSPATH') || exit;

class Asset_Versioning {
    
    /**
     * Кеш версии на время запроса
     * @var string|null
     */
    private static $version_cache = null;
    
    /**
     * Получить версию проекта для использования в cache busting
     * 
     * Рекурсивно обходим все файлы в директории темы,
     * находим файл с самой последней датой изменения,
     * от этой даты генерируем версию (timestamp)
     * 
     * @return string Версия в формате timestamp
     */
    public static function get_version() {
        // Используем кеш, если уже вычислена
        if (self::$version_cache !== null) {
            return self::$version_cache;
        }
        
        $theme_dir = get_template_directory();
        $max_mtime = 0;
        
        // Рекурсивно обходим все файлы в директории темы
        if (is_dir($theme_dir)) {
            $iterator = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($theme_dir, \RecursiveDirectoryIterator::SKIP_DOTS),
                \RecursiveIteratorIterator::LEAVES_ONLY
            );
            
            foreach ($iterator as $file) {
                if ($file->isFile()) {
                    $mtime = $file->getMTime();
                    if ($mtime > $max_mtime) {
                        $max_mtime = $mtime;
                    }
                }
            }
        }
        
        // Если не нашли файлов, используем текущее время
        $version = $max_mtime > 0 ? $max_mtime : time();
        
        self::$version_cache = (string) $version;
        
        return self::$version_cache;
    }
}

