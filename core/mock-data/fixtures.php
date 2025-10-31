<?php
/**
 * Mock Data Fixtures
 * 
 * Определение мок-данных для установки в WordPress
 * 
 * @package ElkaRetro
 */

class ELKARETRO_MOCK_FIXTURES {
    
    /**
     * Путь к папке с изображениями мок-данных
     */
    const IMAGES_DIR = THEME_DIR . '/core/mock-data/images/';
    
    /**
     * Версия фикстур (для отслеживания изменений)
     */
    public function get_version() {
        return '1.0.0';
    }
    
    /**
     * Кеш загруженных изображений (чтобы не загружать дважды)
     */
    private $image_cache = array();
    
    /**
     * Устанавливает все мок-данные
     */
    public function install_all() {
        try {
            // 1. Создаём таксономии
            // ЗАКОММЕНТИРОВАНО: Таксономии теперь синхронизируются с продакшеном через админскую страницу
            // Раскомментируйте следующую строку, если нужно создать таксономии локально (когда прод недоступен):
            // $this->create_taxonomies();
            
            // 2. Создаём категории игрушек (category-of-toys)
            // Эта таксономия синхронизируется отдельно или может быть создана локально
            $categories = $this->create_categories();
            
            // 3. Создаём типы игрушек (без таксономий)
            $toy_types = $this->create_toy_types($categories);
            
            // 4. Привязываем таксономии к типам игрушек (если они существуют в БД)
            $this->assign_taxonomies_to_toy_types($toy_types);
            
            // 5. Создаём экземпляры игрушек (без таксономий)
            $this->create_toy_instances($toy_types);
            
            // 6. Привязываем таксономии к экземплярам игрушек (если они существуют в БД)
            $this->assign_taxonomies_to_toy_instances();
            
            // Посты и страницы теперь создаются отдельно через соответствующие кнопки в админке
            
            return array(
                'success' => true,
                'message' => 'All mock data installed successfully'
            );
        } catch (Exception $e) {
            return array(
                'success' => false,
                'message' => $e->getMessage()
            );
        }
    }
    
    /**
     * Создаёт таксономии
     */
    private function create_taxonomies() {
        // Year of Production
        $this->create_term_if_not_exists('year_of_production', '1950', '1950');
        $this->create_term_if_not_exists('year_of_production', '1960', '1960');
        $this->create_term_if_not_exists('year_of_production', '1970', '1970');
        $this->create_term_if_not_exists('year_of_production', '1980', '1980');
        
        // Manufacturer
        $this->create_term_if_not_exists('manufacturer', 'Гусевский хрустальный завод', 'gusevsky-glass');
        $this->create_term_if_not_exists('manufacturer', 'Завод "Ёлочка"', 'yolochka-factory');
        
        // Occurrence
        $this->create_term_if_not_exists('occurrence', 'Часто', 'often');
        $this->create_term_if_not_exists('occurrence', 'Не часто', 'not-often');
        $this->create_term_if_not_exists('occurrence', 'Редко', 'rarely');
        $this->create_term_if_not_exists('occurrence', 'Раритет', 'rare');
        
        // Size
        $this->create_term_if_not_exists('size', 'Маленький', 'small');
        $this->create_term_if_not_exists('size', 'Средний', 'medium');
        $this->create_term_if_not_exists('size', 'Большой', 'large');
        
        // Material
        $this->create_term_if_not_exists('material', 'Стекло', 'glass');
        $this->create_term_if_not_exists('material', 'Хрусталь', 'crystal');
        
        // Condition (для экземпляров)
        $this->create_term_if_not_exists('condition', 'Люкс', 'excellence');
        $this->create_term_if_not_exists('condition', 'Хорошее', 'good');
        $this->create_term_if_not_exists('condition', 'Так себе', 'so-so');
        
        // Tube Condition
        $this->create_term_if_not_exists('tube_condition', '100%', '100');
        $this->create_term_if_not_exists('tube_condition', 'Более 75%', 'more_75');
        $this->create_term_if_not_exists('tube_condition', '50-75%', '50-75');
        
        // Authenticity
        $this->create_term_if_not_exists('authenticity', 'Оригинал', 'origin');
        $this->create_term_if_not_exists('authenticity', 'Ремонтированная', 'repaired');
    }
    
    /**
     * Создаёт категории игрушек
     */
    private function create_categories() {
        $categories = array();
        
        // Создаём иерархические категории
        $cat1 = $this->create_term_if_not_exists('category-of-toys', 'Фигурки', 'figures', 0);
        $categories['figures'] = $cat1;
        
        $cat2 = $this->create_term_if_not_exists('category-of-toys', 'Шары', 'balls', 0);
        $categories['balls'] = $cat2;
        
        $cat3 = $this->create_term_if_not_exists('category-of-toys', 'Гирлянды', 'garlands', 0);
        $categories['garlands'] = $cat3;
        
        return $categories;
    }
    
    /**
     * Создаёт типы игрушек
     */
    private function create_toy_types($categories) {
        $toy_types = array();
        
        // Тип 1: Малыш с погремушкой
        // Изображение: core/mock-data/images/toy-types/baby-rattle.jpg
        $type1_id = $this->create_toy_type(array(
            'title' => 'Малыш с погремушкой',
            'content' => 'Классическая ёлочная игрушка в виде младенца с погремушкой. Изготовлена из стекла с ручной росписью.',
            'category' => $categories['figures'],
            'index' => 1,
            // Таксономии будут привязаны на втором этапе (если они существуют в БД)
            'taxonomies' => array(
                'year_of_production' => '1950',
                'manufacturer' => 'gusevsky-glass',
                'occurrence' => 'rare',
                'size' => 'medium',
                'material' => 'glass'
            ),
            'image' => 'toy-types/baby-rattle.jpg' // Путь относительно core/mock-data/images/
        ));
        $toy_types[] = $type1_id;
        
        // Тип 2: Звёздочка
        // Изображение: core/mock-data/images/toy-types/star.jpg
        $type2_id = $this->create_toy_type(array(
            'title' => 'Ёлочная звезда',
            'content' => 'Классическая звёздочка для верхушки ёлки. Хрусталь с серебряным напылением.',
            'category' => $categories['figures'],
            'index' => 2,
            // Таксономии будут привязаны на втором этапе (если они существуют в БД)
            'taxonomies' => array(
                'year_of_production' => '1960',
                'manufacturer' => 'gusevsky-glass',
                'occurrence' => 'often',
                'size' => 'large',
                'material' => 'crystal'
            ),
            'image' => 'toy-types/star.jpg'
        ));
        $toy_types[] = $type2_id;
        
        // Тип 3: Снежинка
        // Изображение: core/mock-data/images/toy-types/snowflake.jpg
        $type3_id = $this->create_toy_type(array(
            'title' => 'Снежинка',
            'content' => 'Ажурная снежинка из стекла. Украшена блёстками.',
            'category' => $categories['figures'],
            'index' => 3,
            // Таксономии будут привязаны на втором этапе (если они существуют в БД)
            'taxonomies' => array(
                'year_of_production' => '1970',
                'manufacturer' => 'yolochka-factory',
                'occurrence' => 'not-often',
                'size' => 'small',
                'material' => 'glass'
            ),
            'image' => 'toy-types/snowflake.jpg'
        ));
        $toy_types[] = $type3_id;
        
        // Добавьте больше типов по необходимости
        
        return $toy_types;
    }
    
    /**
     * Создаёт экземпляры игрушек
     */
    private function create_toy_instances($toy_type_ids) {
        if (empty($toy_type_ids)) {
            return;
        }
        
        // Экземпляры для первого типа
        // Изображения: core/mock-data/images/toy-instances/baby-rattle-instance-1.jpg
        $this->create_toy_instance(array(
            'title' => '1-1-1-1', // Индекс (будет сформирован автоматически)
            'content' => '4 х 9,5 х 3 см. Полный перекрас игрушки. Ремонт трубочки.',
            'toy_type_id' => $toy_type_ids[0],
            'index' => 1,
            'cost' => 3500,
            // Таксономии будут привязаны на втором этапе (если они существуют в БД)
            'condition' => 'good',
            'tube_condition' => 'more_75',
            'authenticity' => 'repaired',
            'image' => 'toy-instances/baby-rattle-instance-1.jpg', // Основное изображение
            'images' => array( // Галерея (опционально)
                'toy-instances/baby-rattle-instance-1-gallery-1.jpg',
                'toy-instances/baby-rattle-instance-1-gallery-2.jpg'
            )
        ));
        
        $this->create_toy_instance(array(
            'title' => '1-1-2-2',
            'content' => '4 х 9,5 х 3 см. Хорошее состояние.',
            'toy_type_id' => $toy_type_ids[0],
            'index' => 2,
            'cost' => 4200,
            // Таксономии будут привязаны на втором этапе (если они существуют в БД)
            'condition' => 'excellence',
            'tube_condition' => '100',
            'authenticity' => 'origin',
            'image' => 'toy-instances/baby-rattle-instance-2.jpg'
        ));
        
        // Экземпляры для второго типа
        $this->create_toy_instance(array(
            'title' => '1-2-1-1',
            'content' => 'Хрустальная звёздочка. Отличное состояние.',
            'toy_type_id' => $toy_type_ids[1],
            'index' => 1,
            'cost' => 2500,
            // Таксономии будут привязаны на втором этапе (если они существуют в БД)
            'condition' => 'excellence',
            'tube_condition' => '100',
            'authenticity' => 'origin',
            'image' => 'toy-instances/star-instance-1.jpg'
        ));
        
        // Добавьте больше экземпляров по необходимости
    }
    
    /**
     * Привязывает таксономии к типам игрушек (второй этап)
     * Проверяет существование таксономий в БД и привязывает их, если они найдены
     */
    private function assign_taxonomies_to_toy_types($toy_type_ids) {
        foreach ($toy_type_ids as $post_id) {
            $pending_taxonomies = get_post_meta($post_id, '_pending_taxonomies', true);
            
            if (empty($pending_taxonomies) || !is_array($pending_taxonomies)) {
                continue;
            }
            
            // Привязываем каждую таксономию, если она существует в БД
            foreach ($pending_taxonomies as $taxonomy => $slug) {
                $term = get_term_by('slug', $slug, $taxonomy);
                if ($term) {
                    wp_set_post_terms($post_id, array($term->term_id), $taxonomy, true);
                }
            }
            
            // Удаляем временные мета-данные
            delete_post_meta($post_id, '_pending_taxonomies');
        }
    }
    
    /**
     * Привязывает таксономии ко всем экземплярам игрушек (второй этап)
     * Проверяет существование таксономий в БД и привязывает их, если они найдены
     */
    private function assign_taxonomies_to_toy_instances() {
        $args = array(
            'post_type' => 'toy_instance',
            'posts_per_page' => -1,
            'meta_query' => array(
                array(
                    'key' => '_pending_taxonomies',
                    'compare' => 'EXISTS'
                )
            )
        );
        
        $query = new WP_Query($args);
        
        if ($query->have_posts()) {
            while ($query->have_posts()) {
                $query->the_post();
                $post_id = get_the_ID();
                
                $pending_taxonomies = get_post_meta($post_id, '_pending_taxonomies', true);
                
                if (empty($pending_taxonomies) || !is_array($pending_taxonomies)) {
                    continue;
                }
                
                // Привязываем каждую таксономию, если она существует в БД
                // Используем Pods API для установки полей таксономий
                foreach ($pending_taxonomies as $taxonomy => $slug) {
                    $term = get_term_by('slug', $slug, $taxonomy);
                    if ($term) {
                        // Используем стандартный WordPress способ (Pods автоматически синхронизирует)
                        wp_set_post_terms($post_id, array($term->term_id), $taxonomy, true);
                        
                        // Дополнительно устанавливаем через Pods API для полей типа tube_conditions (ID)
                        if (function_exists('pods')) {
                            $pods = pods('toy_instance', $post_id);
                            if ($pods && $pods->id() > 0) {
                                // Для некоторых полей Pods хранит ID, а не slug
                                // Например, tube_conditions должен быть ID термина
                                if ($taxonomy === 'tube_condition') {
                                    $pods->save(array(
                                        'tube_conditions' => $term->term_id // Сохраняем ID
                                    ));
                                } elseif ($taxonomy === 'authenticity') {
                                    $pods->save(array(
                                        'authenticitys' => $term->term_id // Поле называется authenticitys (с 's')
                                    ));
                                } elseif ($taxonomy === 'condition') {
                                    $pods->save(array(
                                        'conditions' => $term->term_id
                                    ));
                                }
                            }
                        }
                    }
                }
                
                // Удаляем временные мета-данные
                delete_post_meta($post_id, '_pending_taxonomies');
            }
        }
        
        wp_reset_postdata();
    }
    
    /**
     * Создаёт базовые страницы
     */
    public function create_pages() {
        $pages = array();
        
        // Страница "О нас"
        $about_page = $this->create_page(array(
            'title' => 'О нас',
            'slug' => 'about',
            'content' => '<h2>Добро пожаловать в ElkaRetro</h2>
<p>Мы специализируемся на коллекционировании и продаже винтажных ёлочных игрушек 1950-1980 годов. Наша коллекция включает уникальные экземпляры от ведущих советских производителей.</p>
<p>Каждая игрушка в нашем магазине прошла тщательную проверку подлинности и состояния. Мы гарантируем качество и подлинность всех изделий.</p>
<h3>Наша миссия</h3>
<p>Мы стремимся сохранить историю и красоту советских ёлочных игрушек, делая их доступными для коллекционеров и ценителей винтажных украшений.</p>',
            'template' => 'page.php'
        ));
        $pages[] = $about_page;
        
        // Страница "Контакты"
        $contact_page = $this->create_page(array(
            'title' => 'Контакты',
            'slug' => 'contact',
            'content' => '<h2>Как с нами связаться</h2>
<p>Мы всегда рады ответить на ваши вопросы и помочь с выбором ёлочных игрушек.</p>
<h3>Контактная информация</h3>
<ul>
<li><strong>Email:</strong> info@elka-retro.ru</li>
<li><strong>Телефон:</strong> +7 (999) 123-45-67</li>
<li><strong>Время работы:</strong> Пн-Пт с 10:00 до 20:00, Сб-Вс с 11:00 до 18:00</li>
</ul>
<h3>Адрес магазина</h3>
<p>Москва, ул. Примерная, д. 123</p>
<p>Вход через главный вход. Парковка доступна.</p>',
            'template' => 'page.php'
        ));
        $pages[] = $contact_page;
        
        // Страница "Условия доставки"
        $delivery_page = $this->create_page(array(
            'title' => 'Условия доставки',
            'slug' => 'delivery',
            'content' => '<h2>Доставка и оплата</h2>
<h3>Способы доставки</h3>
<ul>
<li><strong>Курьерская доставка по Москве:</strong> 500 руб. (при заказе от 5000 руб. - бесплатно)</li>
<li><strong>Доставка по России:</strong> СДЭК, Boxberry, Почта России - рассчитывается индивидуально</li>
<li><strong>Самовывоз:</strong> Бесплатно из нашего магазина в Москве</li>
</ul>
<h3>Сроки доставки</h3>
<ul>
<li>По Москве: 1-2 рабочих дня</li>
<li>По России: 3-7 рабочих дней в зависимости от региона</li>
</ul>
<h3>Упаковка</h3>
<p>Все хрупкие игрушки упаковываются с особой осторожностью в специальную упаковку для защиты от повреждений во время транспортировки.</p>
<h3>Оплата</h3>
<ul>
<li>Наличными курьеру</li>
<li>Банковской картой онлайн</li>
<li>Банковским переводом</li>
</ul>',
            'template' => 'page.php'
        ));
        $pages[] = $delivery_page;
        
        return array(
            'success' => true,
            'message' => sprintf('Created %d pages successfully', count($pages)),
            'pages' => $pages
        );
    }
    
    /**
     * Удаляет базовые страницы
     */
    public function delete_pages() {
        $slugs = array('about', 'contact', 'delivery');
        $deleted = 0;
        
        foreach ($slugs as $slug) {
            $page = get_page_by_path($slug);
            if ($page) {
                // Проверяем, что это мок-данные
                if (get_post_meta($page->ID, '_elkaretro_mock_data', true) === '1') {
                    wp_delete_post($page->ID, true);
                    $deleted++;
                }
            }
        }
        
        return array(
            'success' => true,
            'message' => sprintf('Deleted %d pages', $deleted),
            'deleted' => $deleted
        );
    }
    
    /**
     * Создаёт посты (новости)
     */
    public function create_posts() {
        $posts = array();
        
        // Пост 1: Магазин открылся
        $post1 = $this->create_post(array(
            'title' => 'Магазин открылся',
            'slug' => 'store-opened',
            'content' => '<p>Дорогие друзья!</p>
<p>Мы рады сообщить вам о торжественном открытии нашего магазина винтажных ёлочных игрушек <strong>ElkaRetro</strong>!</p>
<p>После долгой подготовки мы наконец готовы представить вам нашу уникальную коллекцию советских ёлочных игрушек 1950-1980 годов. Каждая игрушка в нашем магазине - это частица истории, которая несёт в себе тепло и магию новогодних праздников ушедшей эпохи.</p>
<p>Мы тщательно отбирали каждую игрушку, проверяли её подлинность и состояние, чтобы предложить вам только лучшие экземпляры.</p>
<p>Приходите к нам в магазин или заходите на сайт - мы уверены, что каждый найдёт здесь что-то особенное для себя!</p>
<p>С наступающими праздниками!</p>
<p><em>Команда ElkaRetro</em></p>',
            'excerpt' => 'Торжественное открытие магазина винтажных ёлочных игрушек ElkaRetro. Уникальная коллекция советских игрушек 1950-1980 годов.',
            'date' => date('Y-m-d H:i:s', strtotime('-2 months'))
        ));
        $posts[] = $post1;
        
        // Пост 2: Новогоднее спец предложение
        $post2 = $this->create_post(array(
            'title' => 'Новогоднее спец предложение',
            'slug' => 'new-year-special',
            'content' => '<p>Новогодняя акция в ElkaRetro!</p>
<p>Специально к новогодним праздникам мы подготовили особое предложение для наших покупателей:</p>
<ul>
<li><strong>Скидка 15%</strong> на все игрушки из коллекции 1950-1960 годов</li>
<li><strong>Бесплатная доставка</strong> при заказе от 8000 рублей</li>
<li><strong>Подарочная упаковка</strong> для всех заказов до конца января</li>
</ul>
<p>Предложение действует с 20 декабря по 15 января. Не упустите возможность приобрести уникальные винтажные игрушки по специальной цене!</p>
<p>В нашей коллекции вы найдёте фигурки, шары, гирлянды и другие украшения от таких производителей как Гусевский хрустальный завод, завод "Ёлочка" и других легендарных фабрик.</p>
<p>Каждая игрушка упакована с особой заботой и готова стать центром новогоднего праздника в вашем доме.</p>
<p>Ждём вас в магазине и на сайте!</p>',
            'excerpt' => 'Специальное новогоднее предложение: скидки до 15%, бесплатная доставка и подарочная упаковка. Акция действует до 15 января.',
            'date' => date('Y-m-d H:i:s', strtotime('-1 month'))
        ));
        $posts[] = $post2;
        
        // Пост 3: Запускаем аукцион
        $post3 = $this->create_post(array(
            'title' => 'Запускаем аукцион',
            'slug' => 'auction-launched',
            'content' => '<p>Внимание, коллекционеры!</p>
<p>Мы рады объявить о запуске нашего первого <strong>онлайн-аукциона редких ёлочных игрушек</strong>!</p>
<p>В рамках аукциона мы выставим на продажу самые ценные и редкие экземпляры из нашей коллекции:</p>
<ul>
<li>Раритетные фигурки 1950-х годов</li>
<li>Игрушки с уникальным дизайном от известных художников</li>
<li>Экземпляры в идеальном состоянии с оригинальной упаковкой</li>
<li>Редкие серийные наборы</li>
</ul>
<p><strong>Дата проведения:</strong> 10-15 февраля</p>
<p><strong>Формат:</strong> Онлайн-аукцион с автоматическими ставками</p>
<p>Все лоты будут представлены на нашем сайте с подробными описаниями, фотографиями и оценкой состояния. Вы сможете делать ставки прямо на сайте в режиме реального времени.</p>
<p>Подпишитесь на нашу рассылку, чтобы первыми узнать о старте аукциона и получить доступ к эксклюзивным лотам!</p>
<p>Удачных ставок!</p>',
            'excerpt' => 'Первый онлайн-аукцион редких ёлочных игрушек. Раритетные экземпляры, уникальные дизайны, редкие серии. Регистрация открыта!',
            'date' => date('Y-m-d H:i:s', strtotime('-2 weeks'))
        ));
        $posts[] = $post3;
        
        return array(
            'success' => true,
            'message' => sprintf('Created %d posts successfully', count($posts)),
            'posts' => $posts
        );
    }
    
    /**
     * Удаляет мок-посты
     */
    public function delete_posts() {
        $slugs = array('store-opened', 'new-year-special', 'auction-launched');
        $deleted = 0;
        
        foreach ($slugs as $slug) {
            $args = array(
                'name' => $slug,
                'post_type' => 'post',
                'posts_per_page' => 1
            );
            $query = new WP_Query($args);
            
            if ($query->have_posts()) {
                while ($query->have_posts()) {
                    $query->the_post();
                    $post_id = get_the_ID();
                    // Проверяем, что это мок-данные
                    if (get_post_meta($post_id, '_elkaretro_mock_data', true) === '1') {
                        wp_delete_post($post_id, true);
                        $deleted++;
                    }
                }
            }
            wp_reset_postdata();
        }
        
        return array(
            'success' => true,
            'message' => sprintf('Deleted %d posts', $deleted),
            'deleted' => $deleted
        );
    }
    
    /**
     * Удаляет все мок-данные
     */
    public function uninstall_all() {
        try {
            // Удаляем посты и страницы
            $this->delete_posts_by_meta('_elkaretro_mock_data', '1');
            
            // Удаляем custom post types
            $this->delete_posts_by_type('toy_type');
            $this->delete_posts_by_type('toy_instance');
            
            // Таксономии оставляем (могут использоваться реальными данными)
            // Если нужно удалить - раскомментируйте:
            // $this->delete_taxonomy_terms('category-of-toys');
            
            return array(
                'success' => true,
                'message' => 'Mock data removed successfully'
            );
        } catch (Exception $e) {
            return array(
                'success' => false,
                'message' => $e->getMessage()
            );
        }
    }
    
    // ========================================
    // Вспомогательные методы
    // ========================================
    
    /**
     * Создаёт термин таксономии если его нет
     */
    private function create_term_if_not_exists($taxonomy, $name, $slug, $parent = 0) {
        $term = get_term_by('slug', $slug, $taxonomy);
        if (!$term) {
            $term_data = wp_insert_term($name, $taxonomy, array(
                'slug' => $slug,
                'parent' => $parent
            ));
            if (!is_wp_error($term_data)) {
                return $term_data['term_id'];
            }
        }
        return $term ? $term->term_id : null;
    }
    
    /**
     * Создаёт тип игрушки
     */
    private function create_toy_type($data) {
        $post_data = array(
            'post_title' => $data['title'],
            'post_content' => $data['content'],
            'post_type' => 'toy_type',
            'post_status' => 'publish',
            'meta_input' => array(
                'toy_type_index' => $data['index'],
                '_elkaretro_mock_data' => '1' // Маркер мок-данных
            )
        );
        
        $post_id = wp_insert_post($post_data);
        
        if ($post_id && !is_wp_error($post_id)) {
            // Загружаем изображение если указано
            if (isset($data['image']) && !empty($data['image'])) {
                $image_id = $this->upload_image($data['image'], $data['title']);
                if ($image_id) {
                    // Устанавливаем featured image
                    set_post_thumbnail($post_id, $image_id);
                    // Или добавляем в toy_type_photos (Pods multi file)
                    $this->add_image_to_meta($post_id, $image_id, 'toy_type_photos');
                }
            }
            
            // Загружаем дополнительные изображения если указаны
            if (isset($data['images']) && is_array($data['images'])) {
                $image_ids = array();
                foreach ($data['images'] as $image_path) {
                    $image_id = $this->upload_image($image_path, $data['title'] . ' - Image');
                    if ($image_id) {
                        $image_ids[] = $image_id;
                    }
                }
                if (!empty($image_ids)) {
                    $this->add_images_to_meta($post_id, $image_ids, 'toy_type_photos');
                }
            }
            // Привязываем категорию игрушек (она всегда создаётся локально)
            if (isset($data['category']) && $data['category']) {
                wp_set_post_terms($post_id, array($data['category']), 'category-of-toys');
            }
            
            // Сохраняем данные о таксономиях для второго этапа привязки
            // Они будут привязаны позже, если таксономии существуют в БД
            if (isset($data['taxonomies']) && is_array($data['taxonomies'])) {
                update_post_meta($post_id, '_pending_taxonomies', $data['taxonomies']);
            }
            
            return $post_id;
        }
        
        return null;
    }
    
    /**
     * Создаёт экземпляр игрушки
     */
    private function create_toy_instance($data) {
        // Сначала создаём пост через WordPress
        $post_data = array(
            'post_title' => $data['title'],
            'post_content' => $data['content'],
            'post_type' => 'toy_instance',
            'post_status' => 'publish',
            'meta_input' => array(
                '_elkaretro_mock_data' => '1'
            )
        );
        
        $post_id = wp_insert_post($post_data);
        
        if ($post_id && !is_wp_error($post_id)) {
            // Используем Pods API для установки полей в формате Pods
            if (function_exists('pods')) {
                $pods = pods('toy_instance', $post_id);
                
                if ($pods && $pods->id() > 0) {
                    // Устанавливаем поля через Pods API
                    $pods->save(array(
                        'toy_instance_index' => $data['index'],
                        'cost' => number_format((float)$data['cost'], 2, '.', ''), // Форматируем как в Pods (строка "3500.00")
                        'connection_type_of_toy' => $data['toy_type_id']
                    ));
                }
            } else {
                // Fallback: используем стандартные meta поля если Pods недоступен
                update_post_meta($post_id, 'toy_instance_index', $data['index']);
                update_post_meta($post_id, 'cost', $data['cost']);
                update_post_meta($post_id, 'connection_type_of_toy', $data['toy_type_id']);
            }
            
            // Загружаем изображение если указано
            if (isset($data['image']) && !empty($data['image'])) {
                $image_id = $this->upload_image($data['image'], $data['title']);
                if ($image_id) {
                    set_post_thumbnail($post_id, $image_id);
                }
            }
            
            // Загружаем дополнительные изображения для галереи
            if (isset($data['images']) && is_array($data['images'])) {
                $image_ids = array();
                foreach ($data['images'] as $image_path) {
                    $image_id = $this->upload_image($image_path, $data['title'] . ' - Gallery');
                    if ($image_id) {
                        $image_ids[] = $image_id;
                    }
                }
                if (!empty($image_ids)) {
                    // Через Pods API для множественных изображений
                    if (function_exists('pods')) {
                        $pods = pods('toy_instance', $post_id);
                        if ($pods && $pods->id() > 0) {
                            $pods->save(array(
                                'photos_of_the_toy_instance' => $image_ids
                            ));
                        }
                    } else {
                        // Fallback
                        $this->add_images_to_meta($post_id, $image_ids, 'photos_of_the_toy_instance');
                    }
                    // Первое изображение делаем featured если его ещё нет
                    if (!has_post_thumbnail($post_id)) {
                        set_post_thumbnail($post_id, $image_ids[0]);
                    }
                }
            }
            
            // Сохраняем данные о таксономиях для второго этапа привязки
            // Они будут привязаны позже, если таксономии существуют в БД
            $pending_taxonomies = array();
            if (isset($data['condition'])) {
                $pending_taxonomies['condition'] = $data['condition'];
            }
            if (isset($data['tube_condition'])) {
                $pending_taxonomies['tube_condition'] = $data['tube_condition'];
            }
            if (isset($data['authenticity'])) {
                $pending_taxonomies['authenticity'] = $data['authenticity'];
            }
            
            if (!empty($pending_taxonomies)) {
                update_post_meta($post_id, '_pending_taxonomies', $pending_taxonomies);
            }
            
            return $post_id;
        }
        
        return null;
    }
    
    /**
     * Создаёт пост
     */
    private function create_post($data) {
        // Проверяем, существует ли уже пост с таким slug
        $existing_post = null;
        if (isset($data['slug'])) {
            $args = array(
                'name' => $data['slug'],
                'post_type' => 'post',
                'posts_per_page' => 1
            );
            $query = new WP_Query($args);
            if ($query->have_posts()) {
                $query->the_post();
                $existing_post = get_post(get_the_ID());
                wp_reset_postdata();
            }
        }
        
        // Если пост существует и это мок-данные - обновляем, иначе создаём новый
        if ($existing_post && get_post_meta($existing_post->ID, '_elkaretro_mock_data', true) === '1') {
            $post_id = $existing_post->ID;
            wp_update_post(array(
                'ID' => $post_id,
                'post_title' => $data['title'],
                'post_content' => $data['content'],
                'post_excerpt' => isset($data['excerpt']) ? $data['excerpt'] : '',
                'post_date' => isset($data['date']) ? $data['date'] : current_time('mysql')
            ));
            return $post_id;
        }
        
        $post_data = array(
            'post_title' => $data['title'],
            'post_content' => $data['content'],
            'post_excerpt' => isset($data['excerpt']) ? $data['excerpt'] : '',
            'post_name' => isset($data['slug']) ? $data['slug'] : sanitize_title($data['title']),
            'post_type' => 'post',
            'post_status' => 'publish',
            'post_date' => isset($data['date']) ? $data['date'] : current_time('mysql'),
            'meta_input' => array(
                '_elkaretro_mock_data' => '1'
            )
        );
        
        return wp_insert_post($post_data);
    }
    
    /**
     * Создаёт страницу
     */
    private function create_page($data) {
        // Проверяем, существует ли уже страница с таким slug
        $existing_page = null;
        if (isset($data['slug'])) {
            $existing_page = get_page_by_path($data['slug']);
        }
        
        // Если страница существует и это мок-данные - обновляем, иначе создаём новую
        if ($existing_page && get_post_meta($existing_page->ID, '_elkaretro_mock_data', true) === '1') {
            $post_id = $existing_page->ID;
            wp_update_post(array(
                'ID' => $post_id,
                'post_title' => $data['title'],
                'post_content' => $data['content']
            ));
            return $post_id;
        }
        
        $post_data = array(
            'post_title' => $data['title'],
            'post_content' => $data['content'],
            'post_name' => isset($data['slug']) ? $data['slug'] : sanitize_title($data['title']),
            'post_type' => 'page',
            'post_status' => 'publish',
            'meta_input' => array(
                '_elkaretro_mock_data' => '1'
            )
        );
        
        if (isset($data['template'])) {
            $post_data['page_template'] = $data['template'];
        }
        
        return wp_insert_post($post_data);
    }
    
    /**
     * Удаляет посты по meta полю
     */
    private function delete_posts_by_meta($meta_key, $meta_value) {
        $posts = get_posts(array(
            'post_type' => 'any',
            'posts_per_page' => -1,
            'meta_query' => array(
                array(
                    'key' => $meta_key,
                    'value' => $meta_value
                )
            )
        ));
        
        foreach ($posts as $post) {
            wp_delete_post($post->ID, true);
        }
    }
    
    /**
     * Удаляет посты по типу
     */
    private function delete_posts_by_type($post_type) {
        $posts = get_posts(array(
            'post_type' => $post_type,
            'posts_per_page' => -1,
            'meta_query' => array(
                array(
                    'key' => '_elkaretro_mock_data',
                    'value' => '1'
                )
            )
        ));
        
        foreach ($posts as $post) {
            wp_delete_post($post->ID, true);
        }
    }
    
    // ========================================
    // Методы для работы с изображениями
    // ========================================
    
    /**
     * Загружает изображение из локальной папки в WordPress медиабиблиотеку
     * 
     * @param string $image_path Относительный путь от IMAGES_DIR (например, 'toy-types/type1.jpg')
     * @param string $title Название для медиафайла
     * @return int|null ID attachment или null при ошибке
     */
    private function upload_image($image_path, $title = '') {
        // Если путь пустой, пропускаем
        if (empty($image_path)) {
            return null;
        }
        
        // Проверяем кеш
        if (isset($this->image_cache[$image_path])) {
            return $this->image_cache[$image_path];
        }
        
        // Полный путь к файлу
        $full_path = self::IMAGES_DIR . ltrim($image_path, '/');
        
        // Проверяем существование файла
        if (!file_exists($full_path)) {
            error_log("[ElkaRetro Mock Data] Image not found: {$full_path} (will be skipped)");
            return null;
        }
        
        // Проверяем тип файла
        $file_type = wp_check_filetype(basename($full_path), null);
        if (!in_array($file_type['type'], array('image/jpeg', 'image/png', 'image/gif', 'image/webp'))) {
            error_log("[ElkaRetro Mock Data] Invalid image type: {$full_path}");
            return null;
        }
        
        // Подготавливаем данные для загрузки
        $upload = wp_upload_bits(basename($full_path), null, file_get_contents($full_path));
        
        if ($upload['error']) {
            error_log("[ElkaRetro Mock Data] Upload error: " . $upload['error']);
            return null;
        }
        
        // Создаём attachment
        $attachment = array(
            'post_mime_type' => $file_type['type'],
            'post_title' => $title ?: pathinfo($full_path, PATHINFO_FILENAME),
            'post_content' => '',
            'post_status' => 'inherit'
        );
        
        $attach_id = wp_insert_attachment($attachment, $upload['file']);
        
        if (is_wp_error($attach_id)) {
            error_log("[ElkaRetro Mock Data] Attachment error: " . $attach_id->get_error_message());
            return null;
        }
        
        // Генерируем метаданные для изображения
        require_once(ABSPATH . 'wp-admin/includes/image.php');
        $attach_data = wp_generate_attachment_metadata($attach_id, $upload['file']);
        wp_update_attachment_metadata($attach_id, $attach_data);
        
        // Сохраняем в кеш
        $this->image_cache[$image_path] = $attach_id;
        
        return $attach_id;
    }
    
    /**
     * Добавляет одно изображение в meta поле (Pods)
     */
    private function add_image_to_meta($post_id, $image_id, $meta_key) {
        $existing = get_post_meta($post_id, $meta_key, true);
        if (!$existing || !is_array($existing)) {
            $existing = array();
        }
        if (!in_array($image_id, $existing)) {
            $existing[] = $image_id;
            update_post_meta($post_id, $meta_key, $existing);
        }
    }
    
    /**
     * Добавляет несколько изображений в meta поле (Pods multi file)
     */
    private function add_images_to_meta($post_id, $image_ids, $meta_key) {
        $existing = get_post_meta($post_id, $meta_key, true);
        if (!$existing || !is_array($existing)) {
            $existing = array();
        }
        foreach ($image_ids as $image_id) {
            if (!in_array($image_id, $existing)) {
                $existing[] = $image_id;
            }
        }
        update_post_meta($post_id, $meta_key, $existing);
    }
}

