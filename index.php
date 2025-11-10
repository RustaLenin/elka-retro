<?php
/**
 * The template for displaying main-page.
 *
 * @package Ignot
 */

get_header(); ?>

	<main-sidebar></main-sidebar>
  
	<!-- Main Content -->
	<main id="main" class="site_main">

    <!-- Catalog Links -->
    <div id="catalog" class="section_container catalog-links-section">
      <?php
        $toy_catalog_link = function_exists('elkaretro_get_catalog_page_url') ? elkaretro_get_catalog_page_url() : '';
        if (!$toy_catalog_link) {
          $toy_catalog_link = home_url('/catalog/');
        }

        $ny_accessory_link = function_exists('get_post_type_archive_link') ? get_post_type_archive_link('ny_accessory') : '';
        if (!$ny_accessory_link) {
          $ny_accessory_link = home_url('/ny-accessory/');
        }
      ?>
      <div class="catalog-links-grid">
        <div class="catalog-link-card catalog-link-card--toys">
          <a
            class="catalog-link-card__stretched-link"
            href="<?php echo esc_url($toy_catalog_link); ?>"
            aria-label="Перейти в каталог ёлочных игрушек"
          ></a>
          <div class="catalog-link-card__text">
            <span class="catalog-link-card__title">Ёлочные игрушки</span>
            <span class="catalog-link-card__subtitle">Каталог игрушек</span>
          </div>
          <div class="catalog-link-card__cta">
            <ui-button
              label="Смотреть"
              type="primary"
              action="link"
              href="<?php echo esc_url($toy_catalog_link); ?>"
            ></ui-button>
          </div>
        </div>
        <div class="catalog-link-card catalog-link-card--accessories">
          <a
            class="catalog-link-card__stretched-link"
            href="<?php echo esc_url($ny_accessory_link); ?>"
            aria-label="Перейти в каталог новогодних аксессуаров"
          ></a>
          <div class="catalog-link-card__text">
            <span class="catalog-link-card__title">Новогодние аксессуары</span>
            <span class="catalog-link-card__subtitle">Каталог аксессуаров</span>
          </div>
          <div class="catalog-link-card__cta">
            <ui-button
              label="Смотреть"
              type="primary"
              action="link"
              href="<?php echo esc_url($ny_accessory_link); ?>"
            ></ui-button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Site Info Sections -->
    <div class="section_container site-info-tabs-section">
      <div class="site-info-tabs" data-site-info>
        <nav class="site-info-tabs__nav" aria-label="Информация о сайте">
          <a
            href="#site-info-anchor-announcement"
            class="site-info-tabs__nav-item is-active"
            data-site-info-link
            data-target="announcement"
          >
            Главный анонс (на кого работаем?)
          </a>
          <a
            href="#site-info-anchor-pricing"
            class="site-info-tabs__nav-item"
            data-site-info-link
            data-target="pricing"
          >
            Ценообразование
          </a>
          <a
            href="#site-info-anchor-buy-offline"
            class="site-info-tabs__nav-item"
            data-site-info-link
            data-target="buying-offline"
          >
            Как покупать
          </a>
          <a
            href="#site-info-anchor-buy-online"
            class="site-info-tabs__nav-item"
            data-site-info-link
            data-target="buying-online"
          >
            Как покупать на сайте
          </a>
          <a
            href="#site-info-anchor-fee"
            class="site-info-tabs__nav-item"
            data-site-info-link
            data-target="fee"
          >
            Сбор на комплектацию
          </a>
          <a
            href="#site-info-anchor-discounts"
            class="site-info-tabs__nav-item"
            data-site-info-link
            data-target="discounts"
          >
            Скидки, распродажи, льготы и VIP статус
          </a>
          <a
            href="#site-info-anchor-new"
            class="site-info-tabs__nav-item"
            data-site-info-link
            data-target="new"
          >
            Раздел «Наши новинки»
          </a>
          <a
            href="#site-info-anchor-auction"
            class="site-info-tabs__nav-item"
            data-site-info-link
            data-target="auction"
          >
            Раздел «Наш аукцион»
          </a>
          <a
            href="#site-info-anchor-prep"
            class="site-info-tabs__nav-item"
            data-site-info-link
            data-target="preparation"
          >
            Предпродажная подготовка
          </a>
        </nav>
        <div class="site-info-tabs__content" data-site-info-content>
          <?php include_once locate_template('template-parts/site-info-content.php'); ?>
        </div>
      </div>
    </div>
    
    <!-- Latest News -->
    <div id="news" class="section_container">
        <?php get_template_part('template-parts/latest-posts'); ?>
    </div>
    
    <!-- Hero Section -->
    <div id="hero" class="section_container">
      <!-- <hero-section></hero-section> -->
    </div>
    
    <!-- NY Accessories Preview -->
    <div class="section_container">
      <?php get_template_part('template-parts/latest-ny-accessories'); ?>
    </div>
    
    <!-- Latest Toy Types (New Arrivals) -->
    <div class="section_container">
      <div id="new-arrivals" class="product_section">
        <?php get_template_part('template-parts/latest-toy-types'); ?>
      </div>
    </div>
    
  </main>

<script>
  (function () {
    var infoBlocks = document.querySelectorAll('[data-site-info]');
    if (!infoBlocks.length) {
      return;
    }

    var activateLink = function (navLinks, target) {
      navLinks.forEach(function (link) {
        var isActive = link.getAttribute('data-target') === target;
        link.classList.toggle('is-active', isActive);
        link.setAttribute('aria-current', isActive ? 'true' : 'false');
      });
    };

    infoBlocks.forEach(function (root) {
      var navLinks = Array.prototype.slice.call(root.querySelectorAll('[data-site-info-link]'));
      var content = root.querySelector('[data-site-info-content]');
      var sections = Array.prototype.slice.call(root.querySelectorAll('[data-site-info-anchor]'));

      if (!navLinks.length || !content || !sections.length) {
        return;
      }

      navLinks.forEach(function (link) {
        link.addEventListener('click', function (event) {
          event.preventDefault();
          var targetId = link.getAttribute('data-target');
          var targetSection = sections.find(function (section) {
            return section.getAttribute('data-site-info-anchor') === targetId;
          });

          if (!targetSection) {
            return;
          }

          var scrollTop = targetSection.getBoundingClientRect().top - content.getBoundingClientRect().top + content.scrollTop;
          content.scrollTo({ top: scrollTop, behavior: 'smooth' });
          activateLink(navLinks, targetId);
        });

        link.addEventListener('keydown', function (event) {
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
            return;
          }
          event.preventDefault();
          var currentIndex = navLinks.indexOf(link);
          var nextIndex = event.key === 'ArrowDown' ? currentIndex + 1 : currentIndex - 1;
          if (nextIndex < 0) {
            nextIndex = navLinks.length - 1;
          }
          if (nextIndex >= navLinks.length) {
            nextIndex = 0;
          }
          navLinks[nextIndex].focus();
        });
      });

      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) {
              return;
            }
            var targetId = entry.target.getAttribute('data-site-info-anchor');
            activateLink(navLinks, targetId);
          });
        },
        {
          root: content,
          threshold: 0.4,
        }
      );

      sections.forEach(function (section) {
        observer.observe(section);
      });
    });
  })();
</script>

    <div class="site_content">
		<?php
		// while ( have_posts() ) {
		// 	the_post();
		// 	include( 'template-parts/post_card.php' );
		// }

		// the_posts_pagination( array(
		// 	'mid_size' => 2,
		// 	'prev_text' => __( 'Prev', 'theme' ),
		// 	'next_text' => __( 'Next', 'theme' ),
		// ) );
		?>
    </div>

<?php
get_footer();