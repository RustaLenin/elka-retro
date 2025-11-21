<?php

Class THEME_REGISTER {

    static $def_menus = array(
        array(
            'primary' => 'Primary Menu',
        ),
    );

    public static function setup() {

        // Add default posts and comments RSS feed links to head.
        add_theme_support( 'automatic-feed-links' );

        /*
         * Let WordPress manage the document title.
         * By adding theme support, we declare that this theme does not use a
         * hard-coded <title> tag in the document head, and expect WordPress to
         * provide it for us.
         */
        add_theme_support( 'title-tag' );

        /*
         * Enable support for Post Thumbnails on posts and pages.
         *
         * @link https://developer.wordpress.org/themes/functionality/..
         */
        add_theme_support( 'post-thumbnails' );

        /*
         * Switch default core markup for search form, comment form, and comments
         * to output valid HTML5.
         */
        add_theme_support( 'html5', array( 'search-form', 'comment-form', 'comment-list', 'gallery', 'caption', ) );

        /*
         * Make theme available for translation.
         * Translations can be filed in the /languages/ directory.
         * If you're building a theme based on theme, use a find and replace
         * to change 'theme' to the name of your theme in all the template files.
         */
        load_theme_textdomain( 'theme', get_template_directory() . '/languages' );

        $menus = self::$def_menus;

        // This theme uses wp_nav_menu() in one location.
        foreach ($menus as $menu) {
            register_nav_menus( $menu );
        }

        // Включаем версионирование для кастомных типов постов
        self::enable_revisions_for_custom_post_types();

    }
    
    /**
     * Регистрирует кастомные статусы постов из дата-модели
     * Должен вызываться в хуке 'init', так как register_post_status требует этого
     */
    public static function register_custom_post_statuses() {
        if (!defined('ELKARETRO_DATA_MODEL')) {
            return;
        }
        
        $data_model = ELKARETRO_DATA_MODEL;
        $statuses = isset($data_model['custom_post_statuses']) ? $data_model['custom_post_statuses'] : array();
        
        foreach ($statuses as $status_slug => $status_config) {
            register_post_status($status_slug, array(
                'label' => $status_config['label'],
                'label_count' => _n_noop(
                    $status_config['label_count']['singular'],
                    $status_config['label_count']['plural']
                ),
                'public' => isset($status_config['public']) ? $status_config['public'] : false,
                'exclude_from_search' => isset($status_config['exclude_from_search']) ? $status_config['exclude_from_search'] : true,
                'show_in_admin_all_list' => isset($status_config['show_in_admin_all_list']) ? $status_config['show_in_admin_all_list'] : true,
                'show_in_admin_status_list' => isset($status_config['show_in_admin_status_list']) ? $status_config['show_in_admin_status_list'] : true,
            ));
        }
        
        // Добавляем JavaScript для отображения статусов в админке
        add_action('admin_footer-post.php', array(__CLASS__, 'add_custom_statuses_to_dropdown'));
        add_action('admin_footer-post-new.php', array(__CLASS__, 'add_custom_statuses_to_dropdown'));
        add_action('admin_footer-edit.php', array(__CLASS__, 'add_custom_statuses_to_quick_edit'));
        add_action('admin_footer-edit.php', array(__CLASS__, 'rename_published_status_in_lists'));
        
        // Добавляем фильтр для отображения статуса рядом с заголовком
        add_filter('display_post_states', array(__CLASS__, 'display_custom_post_states'), 10, 2);
        
        // Добавляем фильтр для включения кастомных статусов в запросы админки
        add_action('pre_get_posts', array(__CLASS__, 'include_custom_statuses_in_admin_queries'));
    }
    
    /**
     * Добавляет кастомные статусы в выпадающий список метабокса "Publish"
     */
    public static function add_custom_statuses_to_dropdown() {
        if (!defined('ELKARETRO_DATA_MODEL')) {
            return;
        }
        
        global $post;
        if (!$post) {
            return;
        }
        
        $data_model = ELKARETRO_DATA_MODEL;
        $statuses = isset($data_model['custom_post_statuses']) ? $data_model['custom_post_statuses'] : array();
        
        if (empty($statuses)) {
            return;
        }
        
        // Проверяем, что это наш кастомный тип поста
        $custom_post_types = array('toy_type', 'toy_instance', 'ny_accessory');
        if (!in_array($post->post_type, $custom_post_types)) {
            return;
        }
        
        ?>
        <script type="text/javascript">
        (function($) {
            $(document).ready(function() {
                // Ищем выпадающий список статуса (может быть в разных местах)
                var statusSelect = $('#post-status-select, select#post_status, #post_status');
                var statusDisplay = $('#post-status-display');
                
                if (!statusSelect.length) {
                    // Если не нашли, пробуем найти через родительский элемент
                    statusSelect = $('#post_status');
                    if (!statusSelect.length) {
                        console.warn('ElkaRetro: Could not find post status select');
                        return;
                    }
                }
                
                // Добавляем кастомные статусы в выпадающий список
                <?php foreach ($statuses as $status_slug => $status_config): ?>
                    <?php
                    // Проверяем, должен ли статус отображаться в dropdown
                    $show_in_dropdown = isset($status_config['show_in_admin_dropdown']) ? $status_config['show_in_admin_dropdown'] : true;
                    
                    // Проверяем, применяется ли статус к текущему типу поста
                    $post_types = isset($status_config['post_types']) ? $status_config['post_types'] : array('toy_type', 'toy_instance', 'ny_accessory');
                    $applies_to_post_type = in_array($post->post_type, $post_types);
                    
                    // Добавляем статус если: он должен быть в dropdown ИЛИ это текущий статус записи
                    $is_current_status = ($post->post_status === $status_slug);
                    $should_add = ($show_in_dropdown || $is_current_status) && $applies_to_post_type;
                    
                    if ($should_add):
                    ?>
                    // Проверяем, что опция еще не добавлена
                    if (!statusSelect.find('option[value="<?php echo esc_js($status_slug); ?>"]').length) {
                        var option = $('<option></option>')
                            .attr('value', '<?php echo esc_js($status_slug); ?>')
                            .text('<?php echo esc_js($status_config['label']); ?>');
                        
                        // Вставляем перед "Черновик" (Draft) или в конец
                        var draftOption = statusSelect.find('option[value="draft"]');
                        if (draftOption.length) {
                            draftOption.before(option);
                        } else {
                            statusSelect.append(option);
                        }
                    }
                    <?php endif; ?>
                <?php endforeach; ?>
                
                // Переименовываем "Published" в "Доступно" для toy_instance
                <?php if ($post->post_type === 'toy_instance'): ?>
                var publishOption = statusSelect.find('option[value="publish"]');
                if (publishOption.length) {
                    publishOption.text('Доступно');
                }
                var publishDisplay = statusDisplay;
                if (publishDisplay.length && '<?php echo esc_js($post->post_status); ?>' === 'publish') {
                    publishDisplay.text('Доступно');
                }
                <?php endif; ?>
                
                // Обновляем отображение текущего статуса
                var currentStatus = '<?php echo esc_js($post->post_status); ?>';
                <?php foreach ($statuses as $status_slug => $status_config): ?>
                    <?php
                    // Проверяем, применяется ли статус к текущему типу поста
                    $post_types = isset($status_config['post_types']) ? $status_config['post_types'] : array('toy_type', 'toy_instance', 'ny_accessory');
                    $applies_to_post_type = in_array($post->post_type, $post_types);
                    ?>
                    <?php if ($applies_to_post_type): ?>
                    if (currentStatus === '<?php echo esc_js($status_slug); ?>') {
                        // Если статус не был добавлен в dropdown (show_in_admin_dropdown: false),
                        // но это текущий статус - добавляем его для отображения
                        var show_in_dropdown = <?php echo isset($status_config['show_in_admin_dropdown']) && $status_config['show_in_admin_dropdown'] ? 'true' : 'false'; ?>;
                        if (!show_in_dropdown && !statusSelect.find('option[value="<?php echo esc_js($status_slug); ?>"]').length) {
                            var option = $('<option></option>')
                                .attr('value', '<?php echo esc_js($status_slug); ?>')
                                .text('<?php echo esc_js($status_config['label']); ?>');
                            statusSelect.append(option);
                        }
                        
                        if (statusDisplay.length) {
                            statusDisplay.text('<?php echo esc_js($status_config['label']); ?>');
                        }
                        statusSelect.val('<?php echo esc_js($status_slug); ?>');
                    }
                    <?php endif; ?>
                <?php endforeach; ?>
                
                // Обновляем отображение при изменении статуса
                statusSelect.on('change', function() {
                    var selectedStatus = $(this).val();
                    <?php foreach ($statuses as $status_slug => $status_config): ?>
                        if (selectedStatus === '<?php echo esc_js($status_slug); ?>') {
                            if (statusDisplay.length) {
                                statusDisplay.text('<?php echo esc_js($status_config['label']); ?>');
                            }
                        }
                    <?php endforeach; ?>
                });
            });
        })(jQuery);
        </script>
        <?php
    }
    
    /**
     * Добавляет кастомные статусы в выпадающий список "Быстрого редактирования"
     */
    public static function add_custom_statuses_to_quick_edit() {
        if (!defined('ELKARETRO_DATA_MODEL')) {
            return;
        }
        
        $screen = get_current_screen();
        if (!$screen || !in_array($screen->post_type, array('toy_type', 'toy_instance', 'ny_accessory'))) {
            return;
        }
        
        $data_model = ELKARETRO_DATA_MODEL;
        $statuses = isset($data_model['custom_post_statuses']) ? $data_model['custom_post_statuses'] : array();
        
        if (empty($statuses)) {
            return;
        }
        
        ?>
        <script type="text/javascript">
        (function($) {
            $(document).ready(function() {
                var statusSelect = $('select[name="_status"]');
                
                if (!statusSelect.length) {
                    return;
                }
                
                // Добавляем кастомные статусы
                <?php 
                $screen = get_current_screen();
                $current_post_type = $screen ? $screen->post_type : '';
                foreach ($statuses as $status_slug => $status_config): 
                    // Проверяем, должен ли статус отображаться в dropdown
                    $show_in_dropdown = isset($status_config['show_in_admin_dropdown']) ? $status_config['show_in_admin_dropdown'] : true;
                    
                    // Проверяем, применяется ли статус к текущему типу поста
                    $post_types = isset($status_config['post_types']) ? $status_config['post_types'] : array('toy_type', 'toy_instance', 'ny_accessory');
                    $applies_to_post_type = in_array($current_post_type, $post_types);
                    
                    if ($show_in_dropdown && $applies_to_post_type):
                ?>
                    var option = $('<option></option>')
                        .attr('value', '<?php echo esc_js($status_slug); ?>')
                        .text('<?php echo esc_js($status_config['label']); ?>');
                    
                    // Вставляем перед "Черновик"
                    var draftOption = statusSelect.find('option[value="draft"]');
                    if (draftOption.length) {
                        draftOption.before(option);
                    } else {
                        statusSelect.append(option);
                    }
                <?php 
                    endif;
                endforeach; 
                ?>
                
                // Переименовываем "Published" в "Доступно" для toy_instance в Quick Edit
                <?php if ($current_post_type === 'toy_instance'): ?>
                var publishOption = statusSelect.find('option[value="publish"]');
                if (publishOption.length) {
                    publishOption.text('Доступно');
                }
                <?php endif; ?>
            });
        })(jQuery);
        </script>
        <?php
    }
    
    /**
     * Переименовывает "Published" в "Доступно" для toy_instance в списках постов
     */
    public static function rename_published_status_in_lists() {
        $screen = get_current_screen();
        if (!$screen || $screen->post_type !== 'toy_instance') {
            return;
        }
        
        ?>
        <script type="text/javascript">
        (function($) {
            $(document).ready(function() {
                // Переименовываем "Published" в "Доступно" в колонке статуса
                $('.post-state').each(function() {
                    if ($(this).text().trim() === 'Published' || $(this).text().trim() === 'Опубликовано') {
                        $(this).text('Доступно');
                    }
                });
                
                // Переименовываем в фильтре статусов
                $('select[name="post_status"] option[value="publish"]').text('Доступно');
                
                // Переименовываем в ссылках фильтров
                $('.subsubsub a').each(function() {
                    var $this = $(this);
                    var text = $this.text();
                    if (text.indexOf('Published') !== -1 || text.indexOf('Опубликовано') !== -1) {
                        $this.text(text.replace(/Published|Опубликовано/g, 'Доступно'));
                    }
                });
            });
        })(jQuery);
        </script>
        <?php
    }
    
    /**
     * Отображает кастомный статус рядом с заголовком записи в списке
     */
    public static function display_custom_post_states($states, $post) {
        if (!defined('ELKARETRO_DATA_MODEL')) {
            return $states;
        }
        
        $custom_post_types = array('toy_type', 'toy_instance', 'ny_accessory');
        if (!in_array($post->post_type, $custom_post_types)) {
            return $states;
        }
        
        $data_model = ELKARETRO_DATA_MODEL;
        $statuses = isset($data_model['custom_post_statuses']) ? $data_model['custom_post_statuses'] : array();
        
        foreach ($statuses as $status_slug => $status_config) {
            if ($post->post_status === $status_slug) {
                // Проверяем, применяется ли статус к текущему типу поста
                $post_types = isset($status_config['post_types']) ? $status_config['post_types'] : array('toy_type', 'toy_instance', 'ny_accessory');
                if (!in_array($post->post_type, $post_types)) {
                    continue;
                }
                
                // Не показываем статус, если мы уже на странице фильтрации по этому статусу
                if (isset($_GET['post_status']) && $_GET['post_status'] === $status_slug) {
                    continue;
                }
                $states[$status_slug] = $status_config['label'];
            }
        }
        
        // Переименовываем "Published" в "Доступно" для toy_instance
        if ($post->post_type === 'toy_instance' && $post->post_status === 'publish') {
            // Не показываем статус, если мы уже на странице фильтрации по publish
            if (!isset($_GET['post_status']) || $_GET['post_status'] !== 'publish') {
                $states['publish'] = 'Доступно';
            }
        }
        
        return $states;
    }
    
    /**
     * Включает кастомные статусы в запросы админки для toy_type и toy_instance
     * Это нужно, чтобы все записи отображались в списке независимо от статуса
     */
    public static function include_custom_statuses_in_admin_queries($query) {
        // Работаем только в админке
        if (!is_admin() || !$query->is_main_query()) {
            return;
        }
        
        // Работаем только для наших кастомных типов постов
        $screen = get_current_screen();
        if (!$screen) {
            return;
        }
        
        $custom_post_types = array('toy_type', 'toy_instance', 'ny_accessory');
        if (!in_array($screen->post_type, $custom_post_types)) {
            return;
        }
        
        // Получаем все кастомные статусы из дата-модели
        $custom_statuses = array();
        if (defined('ELKARETRO_DATA_MODEL')) {
            $data_model = ELKARETRO_DATA_MODEL;
            $statuses = isset($data_model['custom_post_statuses']) ? $data_model['custom_post_statuses'] : array();
            $custom_statuses = array_keys($statuses);
        }
        
        // Стандартные статусы WordPress
        $default_statuses = array('publish', 'pending', 'draft', 'future', 'private', 'trash');
        
        // Получаем текущий статус из запроса
        $current_status = $query->get('post_status');
        
        // Если статус 'any' или не указан - заменяем на все статусы включая кастомные
        if (empty($current_status) || $current_status === 'any' || $current_status === 'all' || 
            (is_array($current_status) && (in_array('all', $current_status) || in_array('any', $current_status)))) {
            // Объединяем стандартные статусы с кастомными
            $all_statuses = array_merge($default_statuses, $custom_statuses);
            $query->set('post_status', $all_statuses);
        } elseif (is_string($current_status)) {
            // Если выбран конкретный статус (стандартный или кастомный) - оставляем как есть
            // WordPress сам обработает это
        } elseif (is_array($current_status)) {
            // Если массив статусов - добавляем кастомные, если их там нет
            $merged = array_merge($current_status, $custom_statuses);
            $query->set('post_status', array_unique($merged));
        }
    }
    
    /**
     * Включает версионирование (revisions) для кастомных типов постов toy_type и toy_instance
     * Проверяет, что эти типы постов существуют перед включением
     */
    public static function enable_revisions_for_custom_post_types() {
        $custom_post_types = array('toy_type', 'toy_instance');
        
        foreach ($custom_post_types as $post_type) {
            // Проверяем, что тип поста зарегистрирован
            if (post_type_exists($post_type)) {
                // Добавляем поддержку версионирования
                add_post_type_support($post_type, 'revisions');
            }
        }
    }

    public static function setup_defaults() {
        // add_theme_support( 'starter-content', array(
        //     'options'     => '',
        //     'theme_mods'  => '',
        //     'widgets'     => '',
        //     'nav_menus'   => '',
        //     'attachments' => '',
        //     'posts'       => '', // array of arrays like: ID => array('post_type' => '', 'post_title' => '', 'post_excerpt' => '', 'post_name' => '', 'post_content' => '', 'menu_order' => '', 'comment_status' => '', 'thumbnail' => '', 'template' => '')
        // ) );
    }

    /**
     * Register widget area.
     *
     * @link https://developer.wordpress.org/themes/functionality/sidebars/#registering-a-sidebar
     */
    public static function widgets_init() {
        register_sidebar( array(
            'name'          => esc_html__( 'Sidebar', 'theme' ),
            'id'            => 'default-sidebar',
            'description'   => esc_html__( 'Add widgets here.', 'theme' ),
            'before_widget' => '<div class="widjet_cont">',
            'after_widget'  => '</div>'
        ) );
	    register_sidebar( array(
		    'name'          => esc_html__( 'Header Widgets', 'theme' ),
		    'id'            => 'header-widgets',
		    'description'   => esc_html__( 'Widgets in the header after logo and title', 'theme' ),
		    'before_widget' => '<div class="header_widget__container">',
		    'after_widget'  => '</div>'
	    ) );
	    register_sidebar( array(
		    'name'          => esc_html__( 'Footer Widgets', 'theme' ),
		    'id'            => 'footer-widgets',
		    'description'   => esc_html__( 'Widgets in the footer, before copyright', 'theme' ),
		    'before_widget' => '<div class="footer_widget__container">',
		    'after_widget'  => '</div>'
	    ) );
    }

    public static function styles() {
        wp_enqueue_style( 'theme_style', get_stylesheet_uri() );
    }

}

add_action( 'after_setup_theme',  array('THEME_REGISTER', 'setup'            ) );
add_action( 'after_setup_theme',  array('THEME_REGISTER', 'setup_defaults'   ) );
add_action( 'init',               array('THEME_REGISTER', 'register_custom_post_statuses' ) );
add_action( 'widgets_init',       array('THEME_REGISTER', 'widgets_init'     ) );
add_action( 'wp_enqueue_scripts', array('THEME_REGISTER', 'styles'           ) );