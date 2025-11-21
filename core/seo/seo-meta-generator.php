<?php
/**
 * SEO Meta Generator
 * 
 * Генерирует мета-теги для Open Graph, Twitter Cards и Schema.org JSON-LD
 * 
 * @package ElkaRetro
 * @subpackage SEO
 */

namespace Elkaretro\Core\SEO;

defined( 'ABSPATH' ) || exit;

class SEO_Meta_Generator {

	/**
	 * Инициализация генератора
	 */
	public function init() {
		add_action( 'wp_head', array( $this, 'render_meta_tags' ), 1 );
	}

	/**
	 * Основной метод для рендеринга всех мета-тегов
	 */
	public function render_meta_tags() {
		// Страница типа игрушки
		if ( is_singular( 'toy_type' ) ) {
			$post_id = get_the_ID();
			$this->render_toy_type_meta( $post_id );
			return;
		}

		// Пост блога
		if ( is_single() && get_post_type() === 'post' ) {
			$post_id = get_the_ID();
			$this->render_post_meta( $post_id );
			return;
		}

		// Обычная страница (но не главная)
		if ( is_page() && ! is_front_page() ) {
			$post_id = get_the_ID();
			$this->render_page_meta( $post_id );
			return;
		}

		// Каталог
		if ( is_page_template( 'page-catalog.php' ) ) {
			$this->render_catalog_meta();
			return;
		}

		// Главная страница
		if ( is_front_page() ) {
			$this->render_front_page_meta();
			return;
		}
	}

	/**
	 * Получить изображение для OG с fallback
	 * 
	 * @param int|null $post_id ID поста
	 * @return string URL изображения
	 */
	public function get_og_image( $post_id = null ) {
		if ( ! $post_id ) {
			$post_id = get_the_ID();
		}

		// 1. Пробуем Featured Image
		$thumbnail_id = get_post_thumbnail_id( $post_id );
		if ( $thumbnail_id ) {
			$image_url = wp_get_attachment_image_url( $thumbnail_id, 'large' );
			if ( $image_url ) {
				return $image_url;
			}
		}

		// 2. Для типа игрушки: первое изображение из галереи
		if ( get_post_type( $post_id ) === 'toy_type' ) {
			$photos_field = elkaretro_get_field_config( 'toy_type', 'toy_type_photos' );
			$meta_key     = isset( $photos_field['meta_field'] ) ? $photos_field['meta_field'] : 'toy_type_photos';
			$photos       = get_post_meta( $post_id, $meta_key, true );

			if ( is_array( $photos ) && ! empty( $photos ) ) {
				$first_photo = reset( $photos );
				$photo_id    = is_array( $first_photo ) ? ( $first_photo['ID'] ?? null ) : $first_photo;

				if ( $photo_id ) {
					$image_url = wp_get_attachment_image_url( $photo_id, 'large' );
					if ( $image_url ) {
						return $image_url;
					}
				}
			}
		}

		// 3. Fallback: логотип сайта
		$custom_logo_id = get_theme_mod( 'custom_logo' );
		if ( $custom_logo_id ) {
			$image_url = wp_get_attachment_image_url( $custom_logo_id, 'large' );
			if ( $image_url ) {
				return $image_url;
			}
		}

		// 4. Последний fallback: дефолтное изображение (если есть)
		$default_image = get_template_directory_uri() . '/assets/img/default-og-image.jpg';
		if ( file_exists( get_template_directory() . '/assets/img/default-og-image.jpg' ) ) {
			return $default_image;
		}

		// 5. Если ничего не найдено, возвращаем пустую строку
		return '';
	}

	/**
	 * Получить описание для OG
	 * 
	 * @param int|null $post_id ID поста
	 * @return string Описание
	 */
	public function get_og_description( $post_id = null ) {
		if ( ! $post_id ) {
			$post_id = get_the_ID();
		}

		// 1. Пробуем excerpt
		$excerpt = get_the_excerpt( $post_id );
		if ( ! empty( $excerpt ) ) {
			return wp_trim_words( $excerpt, 25, '...' );
		}

		// 2. Берем первые 160 символов из content
		$content = get_post_field( 'post_content', $post_id );
		$content = wp_strip_all_tags( $content );
		$content = strip_shortcodes( $content );

		if ( ! empty( $content ) ) {
			return wp_trim_words( $content, 25, '...' );
		}

		// 3. Fallback: описание сайта
		return get_bloginfo( 'description' );
	}

	/**
	 * Получить диапазон цен для типа игрушки
	 * 
	 * @param int $post_id ID типа игрушки
	 * @return array|null Массив с min, max, currency или null
	 */
	public function get_toy_type_price_range( $post_id ) {
		$available_count = (int) get_post_meta( $post_id, 'available_instances_count', true );

		if ( $available_count === 0 ) {
			return null; // Нет доступных экземпляров
		}

		// Получаем все связанные экземпляры через обратную связь
		// Используем WP_Query для получения экземпляров с этим типом
		$instances_query = new \WP_Query(
			array(
				'post_type'      => 'toy_instance',
				'posts_per_page' => -1,
				'post_status'    => 'publish',
				'meta_query'     => array(
					array(
						'key'   => 'connection_type_of_toy',
						'value' => $post_id,
						'type'  => 'NUMERIC',
					),
				),
			)
		);

		$prices = array();

		if ( $instances_query->have_posts() ) {
			while ( $instances_query->have_posts() ) {
				$instances_query->the_post();
				$instance_id = get_the_ID();
				$cost        = get_post_meta( $instance_id, 'cost', true );

				if ( ! empty( $cost ) && is_numeric( $cost ) ) {
					$prices[] = (float) $cost;
				}
			}
			wp_reset_postdata();
		}

		if ( empty( $prices ) ) {
			return null;
		}

		return array(
			'min'      => min( $prices ),
			'max'      => max( $prices ),
			'currency' => 'RUB',
		);
	}

	/**
	 * Рендерить мета-теги для типа игрушки
	 * 
	 * @param int $post_id ID типа игрушки
	 */
	private function render_toy_type_meta( $post_id ) {
		$this->render_toy_type_open_graph( $post_id );
		$this->render_toy_type_twitter_cards( $post_id );
		$this->render_toy_type_schema( $post_id );
	}

	/**
	 * Рендерить мета-теги для поста
	 * 
	 * @param int $post_id ID поста
	 */
	private function render_post_meta( $post_id ) {
		$this->render_post_open_graph( $post_id );
		$this->render_post_twitter_cards( $post_id );
		$this->render_post_schema( $post_id );
	}

	/**
	 * Рендерить мета-теги для страницы
	 * 
	 * @param int $post_id ID страницы
	 */
	private function render_page_meta( $post_id ) {
		$this->render_page_open_graph( $post_id );
		$this->render_page_twitter_cards( $post_id );
		$this->render_page_schema( $post_id );
	}

	/**
	 * Рендерить мета-теги для каталога
	 */
	private function render_catalog_meta() {
		$this->render_catalog_open_graph();
		$this->render_catalog_twitter_cards();
		$this->render_catalog_schema();
	}

	/**
	 * Рендерить мета-теги для главной страницы
	 */
	private function render_front_page_meta() {
		$this->render_front_page_open_graph();
		$this->render_front_page_twitter_cards();
		$this->render_front_page_schema();
	}


	/**
	 * Рендерить Open Graph для типа игрушки
	 * 
	 * @param int $post_id ID типа игрушки
	 */
	private function render_toy_type_open_graph( $post_id ) {
		$title       = get_the_title( $post_id );
		$description = $this->get_og_description( $post_id );
		$image       = $this->get_og_image( $post_id );
		$url         = get_permalink( $post_id );
		$site_name   = get_bloginfo( 'name' );

		// Базовые OG теги
		echo '<meta property="og:type" content="product" />' . "\n";
		echo '<meta property="og:title" content="' . esc_attr( $title ) . '" />' . "\n";
		echo '<meta property="og:description" content="' . esc_attr( $description ) . '" />' . "\n";
		if ( $image ) {
			echo '<meta property="og:image" content="' . esc_url( $image ) . '" />' . "\n";
		}
		echo '<meta property="og:url" content="' . esc_url( $url ) . '" />' . "\n";
		echo '<meta property="og:site_name" content="' . esc_attr( $site_name ) . '" />' . "\n";

		// Product-specific теги
		$price_range = $this->get_toy_type_price_range( $post_id );
		if ( $price_range ) {
			// Open Graph поддерживает только одну цену, используем минимальную
			// Для диапазона цен используем минимальную цену
			echo '<meta property="product:price:amount" content="' . esc_attr( $price_range['min'] ) . '" />' . "\n";
			echo '<meta property="product:price:currency" content="' . esc_attr( $price_range['currency'] ) . '" />' . "\n";
			// Если есть диапазон, можно добавить информацию в description или использовать Schema.org
		}

		// Availability
		$available_count = (int) get_post_meta( $post_id, 'available_instances_count', true );
		$availability    = $available_count > 0 ? 'in stock' : 'out of stock';
		echo '<meta property="product:availability" content="' . esc_attr( $availability ) . '" />' . "\n";
	}

	/**
	 * Рендерить Twitter Cards для типа игрушки
	 * 
	 * @param int $post_id ID типа игрушки
	 */
	private function render_toy_type_twitter_cards( $post_id ) {
		$title       = get_the_title( $post_id );
		$description = $this->get_og_description( $post_id );
		$image       = $this->get_og_image( $post_id );

		echo '<meta name="twitter:card" content="summary_large_image" />' . "\n";
		echo '<meta name="twitter:title" content="' . esc_attr( $title ) . '" />' . "\n";
		echo '<meta name="twitter:description" content="' . esc_attr( $description ) . '" />' . "\n";
		if ( $image ) {
			echo '<meta name="twitter:image" content="' . esc_url( $image ) . '" />' . "\n";
		}
	}

	/**
	 * Рендерить Schema.org JSON-LD для типа игрушки
	 * 
	 * @param int $post_id ID типа игрушки
	 */
	private function render_toy_type_schema( $post_id ) {
		$title       = get_the_title( $post_id );
		$description = $this->get_og_description( $post_id );
		$image       = $this->get_og_image( $post_id );
		$url         = get_permalink( $post_id );

		$schema = array(
			'@context'    => 'https://schema.org',
			'@type'      => 'Product',
			'name'       => $title,
			'description' => $description,
			'url'        => $url,
		);

		// Изображения
		if ( $image ) {
			$schema['image'] = array( $image );
		}

		// Offers (диапазон цен)
		$price_range = $this->get_toy_type_price_range( $post_id );
		if ( $price_range ) {
			$offers = array(
				'@type'         => 'AggregateOffer',
				'priceCurrency' => $price_range['currency'],
				'lowPrice'      => (string) $price_range['min'],
			);

			if ( $price_range['min'] !== $price_range['max'] ) {
				$offers['highPrice'] = (string) $price_range['max'];
			}

			$available_count = (int) get_post_meta( $post_id, 'available_instances_count', true );
			$offers['availability'] = $available_count > 0
				? 'https://schema.org/InStock'
				: 'https://schema.org/OutOfStock';

			$schema['offers'] = $offers;
		}

		// Brand (производитель)
		$manufacturer_field = elkaretro_get_field_config( 'toy_type', 'manufacturer_field' );
		if ( $manufacturer_field ) {
			$manufacturer_taxonomy = $manufacturer_field['related_taxonomy'] ?? 'manufacturer';
			$manufacturer_terms    = get_the_terms( $post_id, $manufacturer_taxonomy );
			if ( $manufacturer_terms && ! is_wp_error( $manufacturer_terms ) && ! empty( $manufacturer_terms ) ) {
				$first_manufacturer = reset( $manufacturer_terms );
				$schema['brand']    = array(
					'@type' => 'Brand',
					'name'  => $first_manufacturer->name,
				);
			}
		}

		// Category (категории игрушки)
		$category_terms = get_the_terms( $post_id, 'category-of-toys' );
		if ( $category_terms && ! is_wp_error( $category_terms ) && ! empty( $category_terms ) ) {
			$categories = array();
			foreach ( $category_terms as $term ) {
				$categories[] = $term->name;
			}
			$schema['category'] = implode( ', ', $categories );
		}

		echo '<script type="application/ld+json">' . "\n";
		echo wp_json_encode( $schema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT );
		echo "\n" . '</script>' . "\n";
	}

	/**
	 * Рендерить Open Graph для поста
	 * 
	 * @param int $post_id ID поста
	 */
	private function render_post_open_graph( $post_id ) {
		$title       = get_the_title( $post_id );
		$description = $this->get_og_description( $post_id );
		$image       = $this->get_og_image( $post_id );
		$url         = get_permalink( $post_id );
		$site_name   = get_bloginfo( 'name' );

		echo '<meta property="og:type" content="article" />' . "\n";
		echo '<meta property="og:title" content="' . esc_attr( $title ) . '" />' . "\n";
		echo '<meta property="og:description" content="' . esc_attr( $description ) . '" />' . "\n";
		if ( $image ) {
			echo '<meta property="og:image" content="' . esc_url( $image ) . '" />' . "\n";
		}
		echo '<meta property="og:url" content="' . esc_url( $url ) . '" />' . "\n";
		echo '<meta property="og:site_name" content="' . esc_attr( $site_name ) . '" />' . "\n";

		// Article-specific теги
		$published_time = get_post_time( 'c', true, $post_id );
		$modified_time  = get_post_modified_time( 'c', true, $post_id );
		if ( $published_time ) {
			echo '<meta property="article:published_time" content="' . esc_attr( $published_time ) . '" />' . "\n";
		}
		if ( $modified_time ) {
			echo '<meta property="article:modified_time" content="' . esc_attr( $modified_time ) . '" />' . "\n";
		}

		// Автор
		$author_id = get_post_field( 'post_author', $post_id );
		if ( $author_id ) {
			$author_name = get_the_author_meta( 'display_name', $author_id );
			if ( $author_name ) {
				echo '<meta property="article:author" content="' . esc_attr( $author_name ) . '" />' . "\n";
			}
		}
	}

	/**
	 * Рендерить Twitter Cards для поста
	 * 
	 * @param int $post_id ID поста
	 */
	private function render_post_twitter_cards( $post_id ) {
		$title       = get_the_title( $post_id );
		$description = $this->get_og_description( $post_id );
		$image       = $this->get_og_image( $post_id );

		echo '<meta name="twitter:card" content="summary_large_image" />' . "\n";
		echo '<meta name="twitter:title" content="' . esc_attr( $title ) . '" />' . "\n";
		echo '<meta name="twitter:description" content="' . esc_attr( $description ) . '" />' . "\n";
		if ( $image ) {
			echo '<meta name="twitter:image" content="' . esc_url( $image ) . '" />' . "\n";
		}
	}

	/**
	 * Рендерить Schema.org JSON-LD для поста
	 * 
	 * @param int $post_id ID поста
	 */
	private function render_post_schema( $post_id ) {
		$title       = get_the_title( $post_id );
		$description = $this->get_og_description( $post_id );
		$image       = $this->get_og_image( $post_id );
		$url         = get_permalink( $post_id );
		$published   = get_post_time( 'c', true, $post_id );
		$modified    = get_post_modified_time( 'c', true, $post_id );

		$schema = array(
			'@context'     => 'https://schema.org',
			'@type'       => 'BlogPosting',
			'headline'    => $title,
			'description' => $description,
			'url'         => $url,
		);

		if ( $image ) {
			$schema['image'] = array( $image );
		}

		if ( $published ) {
			$schema['datePublished'] = $published;
		}
		if ( $modified ) {
			$schema['dateModified'] = $modified;
		}

		// Автор
		$author_id = get_post_field( 'post_author', $post_id );
		if ( $author_id ) {
			$author_name = get_the_author_meta( 'display_name', $author_id );
			if ( $author_name ) {
				$schema['author'] = array(
					'@type' => 'Person',
					'name'  => $author_name,
				);
			}
		}

		// Publisher (сайт)
		$site_name = get_bloginfo( 'name' );
		$site_url  = home_url();
		$schema['publisher'] = array(
			'@type' => 'Organization',
			'name'  => $site_name,
			'url'   => $site_url,
		);

		echo '<script type="application/ld+json">' . "\n";
		echo wp_json_encode( $schema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT );
		echo "\n" . '</script>' . "\n";
	}

	/**
	 * Рендерить Open Graph для страницы
	 * 
	 * @param int $post_id ID страницы
	 */
	private function render_page_open_graph( $post_id ) {
		$title       = get_the_title( $post_id );
		$description = $this->get_og_description( $post_id );
		$image       = $this->get_og_image( $post_id );
		$url         = get_permalink( $post_id );
		$site_name   = get_bloginfo( 'name' );

		echo '<meta property="og:type" content="website" />' . "\n";
		echo '<meta property="og:title" content="' . esc_attr( $title ) . '" />' . "\n";
		echo '<meta property="og:description" content="' . esc_attr( $description ) . '" />' . "\n";
		if ( $image ) {
			echo '<meta property="og:image" content="' . esc_url( $image ) . '" />' . "\n";
		}
		echo '<meta property="og:url" content="' . esc_url( $url ) . '" />' . "\n";
		echo '<meta property="og:site_name" content="' . esc_attr( $site_name ) . '" />' . "\n";
	}

	/**
	 * Рендерить Twitter Cards для страницы
	 * 
	 * @param int $post_id ID страницы
	 */
	private function render_page_twitter_cards( $post_id ) {
		$title       = get_the_title( $post_id );
		$description = $this->get_og_description( $post_id );
		$image       = $this->get_og_image( $post_id );

		echo '<meta name="twitter:card" content="summary_large_image" />' . "\n";
		echo '<meta name="twitter:title" content="' . esc_attr( $title ) . '" />' . "\n";
		echo '<meta name="twitter:description" content="' . esc_attr( $description ) . '" />' . "\n";
		if ( $image ) {
			echo '<meta name="twitter:image" content="' . esc_url( $image ) . '" />' . "\n";
		}
	}

	/**
	 * Рендерить Schema.org JSON-LD для страницы
	 * 
	 * @param int $post_id ID страницы
	 */
	private function render_page_schema( $post_id ) {
		$title       = get_the_title( $post_id );
		$description = $this->get_og_description( $post_id );
		$image       = $this->get_og_image( $post_id );
		$url         = get_permalink( $post_id );

		$schema = array(
			'@context'     => 'https://schema.org',
			'@type'        => 'WebPage',
			'name'         => $title,
			'description'  => $description,
			'url'          => $url,
		);

		if ( $image ) {
			$schema['image'] = array( $image );
		}

		echo '<script type="application/ld+json">' . "\n";
		echo wp_json_encode( $schema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT );
		echo "\n" . '</script>' . "\n";
	}

	/**
	 * Рендерить Open Graph для каталога
	 */
	private function render_catalog_open_graph() {
		$page_id     = get_the_ID();
		$title       = 'Каталог - ' . get_bloginfo( 'name' );
		$description = $this->get_og_description( $page_id );
		if ( empty( $description ) ) {
			$description = 'Каталог ёлочных игрушек и новогодних аксессуаров';
		}
		$image     = $this->get_og_image( $page_id );
		$url       = function_exists( 'elkaretro_get_catalog_page_url' ) ? elkaretro_get_catalog_page_url() : home_url( '/catalog/' );
		$site_name = get_bloginfo( 'name' );

		echo '<meta property="og:type" content="website" />' . "\n";
		echo '<meta property="og:title" content="' . esc_attr( $title ) . '" />' . "\n";
		echo '<meta property="og:description" content="' . esc_attr( $description ) . '" />' . "\n";
		if ( $image ) {
			echo '<meta property="og:image" content="' . esc_url( $image ) . '" />' . "\n";
		}
		echo '<meta property="og:url" content="' . esc_url( $url ) . '" />' . "\n";
		echo '<meta property="og:site_name" content="' . esc_attr( $site_name ) . '" />' . "\n";
	}

	/**
	 * Рендерить Twitter Cards для каталога
	 */
	private function render_catalog_twitter_cards() {
		$page_id     = get_the_ID();
		$title       = 'Каталог';
		$description = $this->get_og_description( $page_id );
		if ( empty( $description ) ) {
			$description = 'Каталог ёлочных игрушек и новогодних аксессуаров';
		}
		$image = $this->get_og_image( $page_id );

		echo '<meta name="twitter:card" content="summary_large_image" />' . "\n";
		echo '<meta name="twitter:title" content="' . esc_attr( $title ) . '" />' . "\n";
		echo '<meta name="twitter:description" content="' . esc_attr( $description ) . '" />' . "\n";
		if ( $image ) {
			echo '<meta name="twitter:image" content="' . esc_url( $image ) . '" />' . "\n";
		}
	}

	/**
	 * Рендерить Schema.org JSON-LD для каталога
	 */
	private function render_catalog_schema() {
		$page_id     = get_the_ID();
		$title       = 'Каталог';
		$description = $this->get_og_description( $page_id );
		if ( empty( $description ) ) {
			$description = 'Каталог ёлочных игрушек и новогодних аксессуаров';
		}
		$image = $this->get_og_image( $page_id );
		$url   = function_exists( 'elkaretro_get_catalog_page_url' ) ? elkaretro_get_catalog_page_url() : home_url( '/catalog/' );

		$schema = array(
			'@context'    => 'https://schema.org',
			'@type'       => 'CollectionPage',
			'name'        => $title,
			'description' => $description,
			'url'         => $url,
		);

		if ( $image ) {
			$schema['image'] = array( $image );
		}

		echo '<script type="application/ld+json">' . "\n";
		echo wp_json_encode( $schema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT );
		echo "\n" . '</script>' . "\n";
	}

	/**
	 * Рендерить Open Graph для главной страницы
	 */
	private function render_front_page_open_graph() {
		$title       = get_bloginfo( 'name' );
		$description = get_bloginfo( 'description' );
		if ( empty( $description ) ) {
			$description = 'Коллекция винтажных ёлочных игрушек и новогодних аксессуаров';
		}
		// Для главной страницы пробуем получить изображение из настроек или логотипа
		$image = $this->get_front_page_image();
		$url       = home_url();
		$site_name = get_bloginfo( 'name' );

		echo '<meta property="og:type" content="website" />' . "\n";
		echo '<meta property="og:title" content="' . esc_attr( $title ) . '" />' . "\n";
		echo '<meta property="og:description" content="' . esc_attr( $description ) . '" />' . "\n";
		if ( $image ) {
			echo '<meta property="og:image" content="' . esc_url( $image ) . '" />' . "\n";
		}
		echo '<meta property="og:url" content="' . esc_url( $url ) . '" />' . "\n";
		echo '<meta property="og:site_name" content="' . esc_attr( $site_name ) . '" />' . "\n";
	}

	/**
	 * Рендерить Twitter Cards для главной страницы
	 */
	private function render_front_page_twitter_cards() {
		$title       = get_bloginfo( 'name' );
		$description = get_bloginfo( 'description' );
		if ( empty( $description ) ) {
			$description = 'Коллекция винтажных ёлочных игрушек и новогодних аксессуаров';
		}
		$image = $this->get_front_page_image();

		echo '<meta name="twitter:card" content="summary_large_image" />' . "\n";
		echo '<meta name="twitter:title" content="' . esc_attr( $title ) . '" />' . "\n";
		echo '<meta name="twitter:description" content="' . esc_attr( $description ) . '" />' . "\n";
		if ( $image ) {
			echo '<meta name="twitter:image" content="' . esc_url( $image ) . '" />' . "\n";
		}
	}

	/**
	 * Получить изображение для главной страницы
	 * 
	 * @return string URL изображения
	 */
	private function get_front_page_image() {
		// Пробуем получить Featured Image главной страницы (если она установлена как статическая)
		$front_page_id = get_option( 'page_on_front' );
		if ( $front_page_id ) {
			$image = $this->get_og_image( $front_page_id );
			if ( $image ) {
				return $image;
			}
		}

		// Fallback: логотип сайта
		$custom_logo_id = get_theme_mod( 'custom_logo' );
		if ( $custom_logo_id ) {
			$image_url = wp_get_attachment_image_url( $custom_logo_id, 'large' );
			if ( $image_url ) {
				return $image_url;
			}
		}

		return '';
	}

	/**
	 * Рендерить Schema.org JSON-LD для главной страницы
	 */
	private function render_front_page_schema() {
		$title       = get_bloginfo( 'name' );
		$description = get_bloginfo( 'description' );
		if ( empty( $description ) ) {
			$description = 'Коллекция винтажных ёлочных игрушек и новогодних аксессуаров';
		}
		$url   = home_url();
		$image = $this->get_front_page_image();

		$schema = array(
			'@context'    => 'https://schema.org',
			'@type'       => 'WebSite',
			'name'        => $title,
			'description' => $description,
			'url'         => $url,
		);

		if ( $image ) {
			$schema['image'] = array( $image );
		}

		// Добавляем SearchAction, если есть поиск
		$schema['potentialAction'] = array(
			'@type'       => 'SearchAction',
			'target'      => array(
				'@type'       => 'EntryPoint',
				'urlTemplate' => home_url( '/?s={search_term_string}' ),
			),
			'query-input' => 'required name=search_term_string',
		);

		echo '<script type="application/ld+json">' . "\n";
		echo wp_json_encode( $schema, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT );
		echo "\n" . '</script>' . "\n";
	}
}

