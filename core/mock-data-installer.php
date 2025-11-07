<?php
/**
 * Mock Data Installer
 * 
 * Устанавливает мок-данные при активации темы (если включено)
 * Можно использовать для локальной разработки или демо
 * 
 * @package ElkaRetro
 */

class ELKARETRO_MOCK_DATA_INSTALLER {
    
    /**
     * Флаг включения установки мок-данных
     * Установите в true для автоматической установки при активации темы
     */
    const ENABLE_AUTO_INSTALL = false; // Отключено - используем админскую страницу
    
    /**
     * Флаг для проверки, установлены ли уже мок-данные
     */
    const OPTION_NAME = 'elkaretro_mock_data_installed';
    
    /**
     * Инициализация установщика
     */
    public static function init() {
        // При активации темы
        add_action('after_switch_theme', array(__CLASS__, 'maybe_install_mock_data'));
        
        // Админская страница
        add_action('admin_menu', array(__CLASS__, 'add_admin_page'));
        add_action('admin_init', array(__CLASS__, 'handle_action'));
        add_action('admin_notices', array(__CLASS__, 'show_admin_notices'));
    }
    
    /**
     * Добавляет страницу в админку
     */
    public static function add_admin_page() {
        add_theme_page(
            'ElkaRetro Settings',           // Page title
            'ElkaRetro Settings',           // Menu title
            'manage_options',               // Capability
            'elkaretro-settings',           // Menu slug
            array(__CLASS__, 'render_admin_page') // Callback
        );
    }
    
    /**
     * Рендерит админскую страницу
     */
    public static function render_admin_page() {
        $is_installed = self::is_installed();
        $version = $is_installed ? get_option('elkaretro_mock_data_version', 'unknown') : '';
        ?>
        <div class="wrap">
            <h1>ElkaRetro Theme Settings</h1>
            
            <div class="elkaretro-settings-section" style="max-width: 800px; margin-top: 20px;">
                <h2>Mock Data Management</h2>
                
                <div class="card" style="padding: 20px; margin-top: 15px;">
                    <h3>Mock Data Status</h3>
                    <p>
                        <?php if ($is_installed): ?>
                            <strong style="color: #46b450;">✓ Installed</strong> (version: <?php echo esc_html($version); ?>)
                        <?php else: ?>
                            <strong style="color: #dc3232;">✗ Not installed</strong>
                        <?php endif; ?>
                    </p>
                    
                    <p style="margin-top: 20px;">
                        Mock data includes sample toy types, instances, categories, taxonomies, and posts for local development.
                    </p>
                    
                    <div style="margin-top: 20px;">
                        <?php if (!$is_installed): ?>
                            <?php
                            $install_url = wp_nonce_url(
                                add_query_arg('elkaretro_action', 'install_mock_data', admin_url('themes.php?page=elkaretro-settings')),
                                'elkaretro_action_install_mock_data'
                            );
                            ?>
                            <a href="<?php echo esc_url($install_url); ?>" 
                               class="button button-primary" 
                               onclick="return confirm('Install mock data? This will create sample content in your database.');">
                                Install Mock Data
                            </a>
                        <?php else: ?>
                            <?php
                            $reinstall_url = wp_nonce_url(
                                add_query_arg('elkaretro_action', 'reinstall_mock_data', admin_url('themes.php?page=elkaretro-settings')),
                                'elkaretro_action_reinstall_mock_data'
                            );
                            $uninstall_url = wp_nonce_url(
                                add_query_arg('elkaretro_action', 'uninstall_mock_data', admin_url('themes.php?page=elkaretro-settings')),
                                'elkaretro_action_uninstall_mock_data'
                            );
                            ?>
                            <a href="<?php echo esc_url($reinstall_url); ?>" 
                               class="button button-secondary" 
                               onclick="return confirm('Reinstall mock data? Existing mock data will be removed and reinstalled.');">
                                Reinstall Mock Data
                            </a>
                            <a href="<?php echo esc_url($uninstall_url); ?>" 
                               class="button button-secondary" 
                               style="margin-left: 10px;"
                               onclick="return confirm('Remove mock data? This will delete all mock content from database.');">
                                Remove Mock Data
                            </a>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
            
            <div class="elkaretro-settings-section" style="max-width: 800px; margin-top: 30px;">
                <h2>Theme Settings</h2>
                
                <?php
                require_once THEME_DIR . '/core/theme-settings.php';
                $settings = ELKARETRO_THEME_SETTINGS::get_all();
                $configs = ELKARETRO_THEME_SETTINGS::get_all_configs();
                ?>
                
                <form method="post" action="options.php" style="margin-top: 15px;">
                    <?php settings_fields('elkaretro_settings_group'); ?>
                    
                    <div class="card" style="padding: 20px;">
                        <h3>Production Site Settings</h3>
                        
                        <?php foreach ($configs as $key => $config): ?>
                            <table class="form-table" style="margin-top: 15px;">
                                <tr>
                                    <th scope="row">
                                        <label for="elkaretro_<?php echo esc_attr($key); ?>">
                                            <?php echo esc_html($config['label']); ?>
                                        </label>
                                    </th>
                                    <td>
                                        <input 
                                            type="<?php echo esc_attr($config['type'] === 'url' ? 'url' : 'text'); ?>" 
                                            id="elkaretro_<?php echo esc_attr($key); ?>"
                                            name="elkaretro_<?php echo esc_attr($key); ?>" 
                                            value="<?php echo esc_attr($settings[$key]); ?>" 
                                            class="regular-text"
                                            placeholder="https://elka-retro.ru"
                                        />
                                        <?php if (!empty($config['description'])): ?>
                                            <p class="description"><?php echo esc_html($config['description']); ?></p>
                                        <?php endif; ?>
                                    </td>
                                </tr>
                            </table>
                        <?php endforeach; ?>
                        
                        <p class="submit">
                            <?php submit_button('Save Settings', 'primary', 'submit', false); ?>
                        </p>
                    </div>
                </form>
            </div>
            
            <?php if (!empty($settings['production_url'])): ?>
                <div class="elkaretro-settings-section" style="max-width: 800px; margin-top: 30px;">
                    <h2>Data Synchronization</h2>
                    
                    <div class="card" style="padding: 20px; margin-top: 15px;">
                        <h3>Sync Taxonomies from Production</h3>
                        <p>
                            Synchronize taxonomy terms (years, manufacturers, conditions, etc.) from production site.
                            <strong>Note:</strong> Category of toys (category-of-toys) is excluded and will have a separate handler.
                        </p>
                        
                        <p style="margin-top: 15px;">
                            <strong>Production URL:</strong> 
                            <code><?php echo esc_html($settings['production_url']); ?></code>
                        </p>
                        
                        <div style="margin-top: 20px;">
                            <?php
                            $sync_url = wp_nonce_url(
                                add_query_arg('elkaretro_action', 'sync_taxonomies', admin_url('themes.php?page=elkaretro-settings')),
                                'elkaretro_action_sync_taxonomies'
                            );
                            ?>
                            <a href="<?php echo esc_url($sync_url); ?>" 
                               class="button button-primary" 
                               onclick="return confirm('Sync taxonomies from production? This will create/update taxonomy terms in your local database.');">
                                Sync Taxonomies from Production
                            </a>
                        </div>
                    </div>
                </div>
            <?php endif; ?>
            
            <div class="elkaretro-settings-section" style="max-width: 800px; margin-top: 30px;">
                <h2>Content Management</h2>
                
                <div class="card" style="padding: 20px; margin-top: 15px;">
                    <h3>Basic Pages</h3>
                    <p>Generate basic pages: About, Contact, Delivery Terms.</p>
                    <div style="margin-top: 15px;">
                        <?php
                        $pages_url = wp_nonce_url(
                            add_query_arg('elkaretro_action', 'create_pages', admin_url('themes.php?page=elkaretro-settings')),
                            'elkaretro_action_create_pages'
                        );
                        $delete_pages_url = wp_nonce_url(
                            add_query_arg('elkaretro_action', 'delete_pages', admin_url('themes.php?page=elkaretro-settings')),
                            'elkaretro_action_delete_pages'
                        );
                        ?>
                        <a href="<?php echo esc_url($pages_url); ?>" 
                           class="button button-primary" 
                           onclick="return confirm('Create basic pages (About, Contact, Delivery Terms)?');">
                            Create Pages
                        </a>
                        <a href="<?php echo esc_url($delete_pages_url); ?>" 
                           class="button" 
                           onclick="return confirm('Delete all mock pages? This cannot be undone.');"
                           style="margin-left: 10px;">
                            Delete Pages
                        </a>
                    </div>
                </div>
                
                <div class="card" style="padding: 20px; margin-top: 15px;">
                    <h3>News Posts</h3>
                    <p>Generate news posts: Store opened, New Year special, Auction launched.</p>
                    <div style="margin-top: 15px;">
                        <?php
                        $posts_url = wp_nonce_url(
                            add_query_arg('elkaretro_action', 'create_posts', admin_url('themes.php?page=elkaretro-settings')),
                            'elkaretro_action_create_posts'
                        );
                        $delete_posts_url = wp_nonce_url(
                            add_query_arg('elkaretro_action', 'delete_posts', admin_url('themes.php?page=elkaretro-settings')),
                            'elkaretro_action_delete_posts'
                        );
                        ?>
                        <a href="<?php echo esc_url($posts_url); ?>" 
                           class="button button-primary" 
                           onclick="return confirm('Create news posts?');">
                            Create Posts
                        </a>
                        <a href="<?php echo esc_url($delete_posts_url); ?>" 
                           class="button" 
                           onclick="return confirm('Delete all mock posts? This cannot be undone.');"
                           style="margin-left: 10px;">
                            Delete Posts
                        </a>
                    </div>
                </div>
            </div>
            
            <div class="elkaretro-settings-section" style="max-width: 800px; margin-top: 30px;">
                <h2>Publishing Tools</h2>
                
                <div class="card" style="padding: 20px; margin-top: 15px;">
                    <h3>Mass Publishing</h3>
                    <p>
                        Проверяет записи в статусе <strong>draft</strong> и переводит их в <strong>published</strong> или промежуточные статусы,
                        если выполнены требования для публикации из дата-модели.
                    </p>
                    <p style="margin-top: 10px;">
                        <strong>Важно:</strong> За один запуск обрабатывается до 100 записей. 
                        Для обработки всех записей запускайте скрипт несколько раз.
                    </p>
                    
                    <?php
                    // Подсчитываем количество draft записей
                    $toy_types_draft = wp_count_posts('toy_type')->draft;
                    $toy_instances_draft = wp_count_posts('toy_instance')->draft;
                    ?>
                    
                    <div style="margin-top: 20px;">
                        <h4>Типы игрушек (toy_type)</h4>
                        <p>
                            <strong>Draft записей:</strong> <?php echo esc_html($toy_types_draft); ?>
                        </p>
                        <p style="margin-top: 10px;">
                            <?php
                            $publish_types_url = wp_nonce_url(
                                add_query_arg('elkaretro_action', 'publish_toy_types', admin_url('themes.php?page=elkaretro-settings')),
                                'elkaretro_action_publish_toy_types'
                            );
                            ?>
                            <a href="<?php echo esc_url($publish_types_url); ?>" 
                               class="button button-primary" 
                               onclick="return confirm('Запустить публикацию типов игрушек? Будет обработано до 100 записей в статусе draft.');">
                                Опубликовать типы игрушек
                            </a>
                        </p>
                    </div>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                        <h4>Экземпляры игрушек (toy_instance)</h4>
                        <p>
                            <strong>Draft записей:</strong> <?php echo esc_html($toy_instances_draft); ?>
                        </p>
                        <p style="margin-top: 10px;">
                            <strong>Рекомендуется:</strong> Сначала публикуйте экземпляры, затем типы игрушек.
                        </p>
                        <p style="margin-top: 10px;">
                            <?php
                            $publish_instances_url = wp_nonce_url(
                                add_query_arg('elkaretro_action', 'publish_toy_instances', admin_url('themes.php?page=elkaretro-settings')),
                                'elkaretro_action_publish_toy_instances'
                            );
                            ?>
                            <a href="<?php echo esc_url($publish_instances_url); ?>" 
                               class="button button-primary" 
                               onclick="return confirm('Запустить публикацию экземпляров игрушек? Будет обработано до 100 записей в статусе draft.');">
                                Опубликовать экземпляры игрушек
                            </a>
                        </p>
                    </div>
                </div>
            </div>
            
            <div class="elkaretro-settings-section" style="max-width: 800px; margin-top: 30px;">
                <h2>Instances Counter</h2>
                
                <div class="card" style="padding: 20px; margin-top: 15px;">
                    <h3>Пересчет количества экземпляров</h3>
                    <p>
                        Пересчитывает поле <code>available_instances_count</code> для всех типов игрушек.
                        Это поле кеширует количество опубликованных экземпляров для быстрых запросов.
                    </p>
                    <p style="margin-top: 10px;">
                        <strong>Когда использовать:</strong>
                    </p>
                    <ul style="margin-left: 20px; margin-top: 10px;">
                        <li>После массового импорта данных</li>
                        <li>Если данные выглядят несинхронизированными</li>
                        <li>После первичной настройки темы</li>
                    </ul>
                    
                    <?php
                    // Подсчитываем общее количество типов игрушек
                    $toy_types_total = wp_count_posts('toy_type');
                    $toy_types_count = array_sum((array)$toy_types_total);
                    ?>
                    
                    <p style="margin-top: 15px;">
                        <strong>Всего типов игрушек:</strong> <?php echo esc_html($toy_types_count); ?>
                    </p>
                    
                    <?php
                    // Проверяем статус CRON
                    require_once THEME_DIR . '/core/instances-counter.php';
                    $cron_next = wp_next_scheduled(ELKARETRO_INSTANCES_COUNTER::CRON_HOOK);
                    ?>
                    
                    <p style="margin-top: 15px;">
                        <strong>Автоматический пересчет (CRON):</strong>
                        <?php if ($cron_next): ?>
                            <span style="color: #46b450;">
                                ✓ Запланирован (следующий запуск: <?php echo esc_html(date_i18n('d.m.Y H:i', $cron_next)); ?>)
                            </span>
                        <?php else: ?>
                            <span style="color: #dc3232;">
                                ✗ Не запланирован
                            </span>
                        <?php endif; ?>
                    </p>
                    
                    <div style="margin-top: 20px;">
                        <?php
                        $recalculate_url = wp_nonce_url(
                            add_query_arg('elkaretro_action', 'recalculate_instances_count', admin_url('themes.php?page=elkaretro-settings')),
                            'elkaretro_action_recalculate_instances_count'
                        );
                        ?>
                        <a href="<?php echo esc_url($recalculate_url); ?>" 
                           class="button button-primary" 
                           onclick="return confirm('Запустить пересчет количества экземпляров для всех типов игрушек?');">
                            Пересчитать все типы игрушек
                        </a>
                    </div>
                </div>
            </div>
            
            <div class="elkaretro-settings-section" style="max-width: 800px; margin-top: 30px;">
                <h2>Theme Tools</h2>
                
                <div class="card" style="padding: 20px; margin-top: 15px;">
                    <p>Additional tools and utilities will be added here.</p>
                    <!-- TODO: Добавить другие кнопки-триггеры -->
                </div>
            </div>
        </div>
        <?php
    }
    
    /**
     * Обрабатывает действия через GET параметр
     */
    public static function handle_action() {
        if (!isset($_GET['elkaretro_action'])) {
            return;
        }
        
        // Проверяем права доступа
        if (!current_user_can('manage_options')) {
            wp_die('You do not have sufficient permissions to access this page.');
        }
        
        // Проверяем, что мы на правильной странице
        $page = isset($_GET['page']) ? sanitize_text_field($_GET['page']) : '';
        if ($page !== 'elkaretro-settings') {
            return;
        }
        
        $action = sanitize_text_field($_GET['elkaretro_action']);
        
        // Проверяем nonce
        $nonce_action = 'elkaretro_action_' . $action;
        if (!isset($_GET['_wpnonce']) || !wp_verify_nonce($_GET['_wpnonce'], $nonce_action)) {
            wp_die('Security check failed');
        }
        
        $result = null;
        $message = '';
        
        switch ($action) {
            case 'install_mock_data':
                $result = self::install_mock_data();
                $message = $result['success'] 
                    ? 'Mock data installed successfully!' 
                    : 'Installation failed: ' . $result['message'];
                break;
                
            case 'reinstall_mock_data':
                self::uninstall_mock_data();
                $result = self::install_mock_data();
                $message = $result['success'] 
                    ? 'Mock data reinstalled successfully!' 
                    : 'Reinstallation failed: ' . $result['message'];
                break;
                
            case 'uninstall_mock_data':
                $result = self::uninstall_mock_data();
                $message = $result['success'] 
                    ? 'Mock data removed successfully!' 
                    : 'Removal failed: ' . $result['message'];
                break;
                
            case 'sync_taxonomies':
                require_once THEME_DIR . '/core/taxonomy-sync.php';
                require_once THEME_DIR . '/core/theme-settings.php';
                
                $production_url = ELKARETRO_THEME_SETTINGS::get('production_url');
                $result = ELKARETRO_TAXONOMY_SYNC::sync_all_taxonomies($production_url);
                
                if ($result['success']) {
                    $message = $result['message'];
                    if (!empty($result['taxonomies'])) {
                        $details = array();
                        foreach ($result['taxonomies'] as $taxonomy => $tax_result) {
                            if ($tax_result['success']) {
                                $details[] = sprintf('%s: %s', $taxonomy, $tax_result['message']);
                            } else {
                                $details[] = sprintf('%s: ERROR - %s', $taxonomy, $tax_result['message']);
                            }
                        }
                        if (!empty($details)) {
                            $message .= ' | Details: ' . implode('; ', $details);
                        }
                    }
                } else {
                    $message = 'Taxonomy sync failed: ' . ($result['message'] ?? 'Unknown error');
                }
                break;
                
            case 'create_pages':
                require_once THEME_DIR . '/core/mock-data/fixtures.php';
                $fixtures = new ELKARETRO_MOCK_FIXTURES();
                $result = $fixtures->create_pages();
                $message = $result['success'] 
                    ? $result['message'] 
                    : 'Failed to create pages: ' . ($result['message'] ?? 'Unknown error');
                break;
                
            case 'delete_pages':
                require_once THEME_DIR . '/core/mock-data/fixtures.php';
                $fixtures = new ELKARETRO_MOCK_FIXTURES();
                $result = $fixtures->delete_pages();
                $message = $result['success'] 
                    ? $result['message'] 
                    : 'Failed to delete pages: ' . ($result['message'] ?? 'Unknown error');
                break;
                
            case 'create_posts':
                require_once THEME_DIR . '/core/mock-data/fixtures.php';
                $fixtures = new ELKARETRO_MOCK_FIXTURES();
                $result = $fixtures->create_posts();
                $message = $result['success'] 
                    ? $result['message'] 
                    : 'Failed to create posts: ' . ($result['message'] ?? 'Unknown error');
                break;
                
            case 'delete_posts':
                require_once THEME_DIR . '/core/mock-data/fixtures.php';
                $fixtures = new ELKARETRO_MOCK_FIXTURES();
                $result = $fixtures->delete_posts();
                $message = $result['success'] 
                    ? $result['message'] 
                    : 'Failed to delete posts: ' . ($result['message'] ?? 'Unknown error');
                break;
                
            case 'recalculate_instances_count':
                require_once THEME_DIR . '/core/instances-counter.php';
                $result = ELKARETRO_INSTANCES_COUNTER::recalculate_all_instances_count();
                $message = $result['success'] 
                    ? $result['message'] 
                    : 'Failed to recalculate instances count: ' . ($result['message'] ?? 'Unknown error');
                break;
        }
        
        if ($result !== null) {
            // Редирект на страницу настроек без GET параметров
            $redirect_url = remove_query_arg(array('elkaretro_action', '_wpnonce'), admin_url('themes.php?page=elkaretro-settings'));
            $redirect_url = add_query_arg('elkaretro_notice', urlencode($message), $redirect_url);
            wp_safe_redirect($redirect_url);
            exit;
        }
    }
    
    /**
     * Показывает уведомления
     */
    public static function show_admin_notices() {
        // Показываем только на странице настроек темы
        $screen = get_current_screen();
        if (!$screen || $screen->id !== 'appearance_page_elkaretro-settings') {
            return;
        }
        
        if (isset($_GET['elkaretro_notice']) && current_user_can('manage_options')) {
            $notice = sanitize_text_field(urldecode($_GET['elkaretro_notice']));
            $notice_type = isset($_GET['elkaretro_notice_type']) ? sanitize_text_field($_GET['elkaretro_notice_type']) : '';
            
            // Определяем класс уведомления
            if ($notice_type === 'success') {
                $class = 'notice-success';
            } elseif ($notice_type === 'error') {
                $class = 'notice-error';
            } elseif ($notice_type === 'warning') {
                $class = 'notice-warning';
            } else {
                // Fallback: определяем по содержимому сообщения
                $class = (strpos($notice, 'successfully') !== false || strpos($notice, 'Processed') !== false || strpos($notice, 'published') !== false) 
                    ? 'notice-success' 
                    : 'notice-error';
            }
            ?>
            <div class="notice <?php echo esc_attr($class); ?> is-dismissible">
                <p><?php echo esc_html($notice); ?></p>
            </div>
            <?php
        }
    }
    
    /**
     * Проверяет и устанавливает мок-данные при активации темы
     */
    public static function maybe_install_mock_data() {
        // Проверяем, нужно ли устанавливать
        if (!self::ENABLE_AUTO_INSTALL) {
            return;
        }
        
        // Проверяем, не установлены ли уже данные
        if (get_option(self::OPTION_NAME, false)) {
            return;
        }
        
        // Устанавливаем данные
        self::install_mock_data();
    }
    
    /**
     * Устанавливает мок-данные в базу WordPress
     */
    public static function install_mock_data() {
        require_once THEME_DIR . '/core/mock-data/fixtures.php';
        
        $fixtures = new ELKARETRO_MOCK_FIXTURES();
        
        // Устанавливаем данные
        $result = $fixtures->install_all();
        
        if ($result['success']) {
            // Помечаем, что данные установлены
            update_option(self::OPTION_NAME, true);
            update_option('elkaretro_mock_data_version', $fixtures->get_version());
            
            // Логируем для отладки
            error_log('[ElkaRetro] Mock data installed successfully');
        } else {
            error_log('[ElkaRetro] Mock data installation failed: ' . $result['message']);
        }
        
        return $result;
    }
    
    /**
     * Удаляет мок-данные из базы
     */
    public static function uninstall_mock_data() {
        require_once THEME_DIR . '/core/mock-data/fixtures.php';
        
        $fixtures = new ELKARETRO_MOCK_FIXTURES();
        $result = $fixtures->uninstall_all();
        
        if ($result['success']) {
            delete_option(self::OPTION_NAME);
            delete_option('elkaretro_mock_data_version');
        }
        
        return $result;
    }
    
    /**
     * Проверяет, установлены ли мок-данные
     */
    public static function is_installed() {
        return get_option(self::OPTION_NAME, false);
    }
}

// Инициализируем установщик
ELKARETRO_MOCK_DATA_INSTALLER::init();

