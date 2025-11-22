export function site_footer_template(state) {
  return `
    <div class="site_footer-container">
      <div class="site_footer-content">
        
        <!-- Brand Section -->
        <div class="site_footer-brand">
          <div class="site_footer-logo">
            <ui-icon name="logo" size="large" class="site_footer-logo_icon"></ui-icon>
            <span class="site_footer-logo_text">ЁЛКА РЕТРО</span>
          </div>
          <p class="site_footer-tagline">
           Магазин антикварной елочной игрушки. Самый большой веб каталог в России.
          </p>
          <div class="site_footer-social">
            <!-- TODO: Раскомментировать когда будут созданы аккаунты в соцсетях -->
            <!--
            <a href="https://t.me/elkaretro" class="site_footer-social_link" aria-label="Telegram" target="_blank" rel="noopener noreferrer">
              <ui-icon name="telegram" size="medium"></ui-icon>
            </a>
            <a href="https://vk.com/elkaretro" class="site_footer-social_link" aria-label="VK" target="_blank" rel="noopener noreferrer">
              <ui-icon name="vk" size="medium"></ui-icon>
            </a>
            -->
          </div>
        </div>
        
        <!-- Links Sections -->
        <div class="site_footer-links_grid">
          
          <div class="site_footer-links_section">
            <h3 class="site_footer-links_title">Каталоги</h3>
            <ul class="site_footer-links_list">
              <li><a href="${state.toyCatalogUrl || '/catalog/'}" class="site_footer-link">Елочные игрушки</a></li>
              <li><a href="${state.nyAccessoryUrl || '/ny-accessory/'}" class="site_footer-link">Новогодние аксессуары</a></li>
            </ul>
          </div>
          
          <div class="site_footer-links_section">
            <h3 class="site_footer-links_title">Инфо</h3>
            <ul class="site_footer-links_list">
              <li><a href="#site-info-anchor-pricing" class="site_footer-link">Ценообразование</a></li>
              <li><a href="#site-info-anchor-buy-online" class="site_footer-link">Как покупать на сайте</a></li>
              <li><a href="#site-info-anchor-discounts" class="site_footer-link">Скидки и льготы</a></li>
              <li><a href="#site-info-anchor-buy-offline" class="site_footer-link">Как покупать</a></li>
            </ul>
          </div>
          
          <div class="site_footer-links_section">
            <h3 class="site_footer-links_title">Пользователю</h3>
            <ul class="site_footer-links_list">
              <li><a href="${state.profileUrl || '/profile/'}" class="site_footer-link">Профиль</a></li>
              <li><a href="${state.blogUrl || '/blog/'}" class="site_footer-link">Блог</a></li>
              <li><span class="site_footer-link site_footer-link--disabled">Распродажа (в разработке)</span></li>
              <li><span class="site_footer-link site_footer-link--disabled">Аукцион (в разработке)</span></li>
            </ul>
          </div>
          
        </div>
        
      </div>
      
      <!-- Bottom Bar -->
      <div class="site_footer-bottom">
        <p class="site_footer-copyright">
          © ${new Date().getFullYear()} Elka Retro. Все права защищены.
        </p>
        <div class="site_footer-legal">
          <a href="#" class="site_footer-legal_link" data-app-action="legal.openPrivacyPolicy">Политика обработки персональных данных</a>
          <span class="site_footer-legal_separator">•</span>
          <a href="#" class="site_footer-legal_link" data-app-action="legal.openPublicOffer">Публичная офферта</a>
        </div>
      </div>
      
    </div>
  `;
}