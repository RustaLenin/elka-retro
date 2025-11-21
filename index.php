<?php
/**
 * The template for displaying main-page.
 *
 * @package Ignot
 */

get_header(); ?>
  
	<!-- Main Content -->
	<main id="main" class="site_main">

    <!-- Catalog Links -->
    <div id="catalog" class="section_container catalog-links-section">
      <?php
        $toy_catalog_link = function_exists('elkaretro_get_catalog_page_url') ? elkaretro_get_catalog_page_url() : '';
        if (!$toy_catalog_link) {
          $toy_catalog_link = home_url('/catalog/');
        }

        // Ссылка на каталог аксессуаров
        $ny_accessory_link = function_exists('elkaretro_get_accessory_catalog_page_url') ? elkaretro_get_accessory_catalog_page_url() : '';
        if (!$ny_accessory_link) {
          $ny_accessory_link = home_url('/accessories/');
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
              icon="chevron_right"
              icon-position="right"
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
              icon="chevron_right"
              icon-position="right"
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
    
    <!-- Homepage Tabs Section (Steam-style) -->
    <div class="section_container">
      <div id="new-arrivals" class="homepage-tabs-wrapper">
        <ui-tabs active-tab="toys" size="large">
          <ui-tab-item id="toys" label="Новинки ёлочных игрушек"></ui-tab-item>
          <ui-tab-item id="accessories" label="Новинки новогодних аксессуаров"></ui-tab-item>
          <ui-tab-item id="sale" label="Распродажа"></ui-tab-item>
          <ui-tab-item id="auction" label="Аукцион"></ui-tab-item>
        </ui-tabs>
        
        <homepage-tabs-content active-tab="toys">
          <div class="homepage-tabs-content-wrapper">
            <div class="tab-panel" data-tab-id="toys">
              <?php get_template_part('template-parts/homepage-tab-toys'); ?>
            </div>
            <div class="tab-panel" data-tab-id="accessories" style="display: none;">
              <?php get_template_part('template-parts/homepage-tab-accessories'); ?>
            </div>
            <div class="tab-panel" data-tab-id="sale" style="display: none;">
              <div class="tab-placeholder">Распродажа - скоро</div>
            </div>
            <div class="tab-panel" data-tab-id="auction" style="display: none;">
              <div class="tab-placeholder">Аукцион - скоро</div>
            </div>
          </div>
        </homepage-tabs-content>
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

  // Обработка якорных ссылок из футера
  (function() {
    // Обрабатываем клики на якорные ссылки, которые ведут к site-info-anchor
    document.addEventListener('click', function(event) {
      var link = event.target.closest('a[href^="#site-info-anchor-"]');
      if (!link) {
        return;
      }

      // Проверяем, что это ссылка из футера (не из навигации табов)
      if (link.closest('[data-site-info]')) {
        return; // Это ссылка из навигации табов, её обрабатывает другой скрипт
      }

      event.preventDefault();
      var hash = link.getAttribute('href');
      var targetId = hash.replace('#site-info-anchor-', '');
      
      // Находим секцию site-info-tabs
      var infoTabsSection = document.querySelector('.site-info-tabs-section');
      if (!infoTabsSection) {
        return;
      }

      // Находим контейнер с контентом
      var content = infoTabsSection.querySelector('[data-site-info-content]');
      if (!content) {
        return;
      }

      // Находим целевую секцию по id (якорь в формате #site-info-anchor-xxx)
      var targetSection = content.querySelector('#' + hash.substring(1));
      if (!targetSection) {
        // Если не нашли по id, пробуем найти по data-site-info-anchor
        targetSection = content.querySelector('[data-site-info-anchor="' + targetId + '"]');
      }
      if (!targetSection) {
        return;
      }

      // Сначала скроллим к секции site-info-tabs на странице с отступом сверху
      var headerHeight = 120; // Высота хедера с запасом
      var sectionTop = infoTabsSection.getBoundingClientRect().top + window.pageYOffset - headerHeight;
      window.scrollTo({ top: Math.max(0, sectionTop), behavior: 'smooth' });
      
      // Затем скроллим к нужной секции внутри контейнера
      setTimeout(function() {
        var scrollTop = targetSection.getBoundingClientRect().top - content.getBoundingClientRect().top + content.scrollTop - 20; // Отступ 20px сверху
        content.scrollTo({ top: Math.max(0, scrollTop), behavior: 'smooth' });
        
        // Активируем соответствующую ссылку в навигации
        // Сначала пробуем найти по data-target (используя значение из data-site-info-anchor)
        var dataTarget = targetSection.getAttribute('data-site-info-anchor');
        var navLink = null;
        if (dataTarget) {
          navLink = infoTabsSection.querySelector('[data-site-info-link][data-target="' + dataTarget + '"]');
        }
        // Если не нашли, пробуем по targetId (из якоря)
        if (!navLink && targetId) {
          navLink = infoTabsSection.querySelector('[data-site-info-link][data-target="' + targetId + '"]');
        }
        if (navLink) {
          var navLinks = Array.prototype.slice.call(infoTabsSection.querySelectorAll('[data-site-info-link]'));
          navLinks.forEach(function(link) {
            link.classList.remove('is-active');
            link.removeAttribute('aria-current');
          });
          navLink.classList.add('is-active');
          navLink.setAttribute('aria-current', 'true');
        }
      }, 300); // Небольшая задержка для завершения первого скролла
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