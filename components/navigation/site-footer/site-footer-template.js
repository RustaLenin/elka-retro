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
            <a href="#" class="site_footer-social_link" aria-label="Facebook">
              <ui-icon name="facebook" size="medium"></ui-icon>
            </a>
            <a href="#" class="site_footer-social_link" aria-label="Instagram">
              <ui-icon name="instagram" size="medium"></ui-icon>
            </a>
            <a href="#" class="site_footer-social_link" aria-label="Twitter">
              <ui-icon name="twitter" size="medium"></ui-icon>
            </a>
          </div>
        </div>
        
        <!-- Links Sections -->
        <div class="site_footer-links_grid">
          
          <div class="site_footer-links_section">
            <h3 class="site_footer-links_title">Товары</h3>
            <ul class="site_footer-links_list">
              <li><a href="/catalog/elka-toys" class="site_footer-link">Елочные игрушки</a></li>
              <li><a href="/catalog/new-year-accessories" class="site_footer-link">Аксесуары</a></li>
              <li><a href="/catalog/all" class="site_footer-link">Все подряд</a></li>
              <li><a href="/new-arrivals" class="site_footer-link">Новые поступления</a></li>
            </ul>
          </div>
          
          <div class="site_footer-links_section">
            <h3 class="site_footer-links_title">Инфо</h3>
            <ul class="site_footer-links_list">
              <li><a href="/about" class="site_footer-link">О магазине</a></li>
              <li><a href="/authenticity" class="site_footer-link">Соглашения и правила</a></li>
              <li><a href="/news" class="site_footer-link">Новости</a></li>
              <li><a href="/contact" class="site_footer-link">Контакты</a></li>
            </ul>
          </div>
          
          <div class="site_footer-links_section">
            <h3 class="site_footer-links_title">Помощь</h3>
            <ul class="site_footer-links_list">
              <li><a href="/shipping" class="site_footer-link">Условия доставки</a></li>
              <li><a href="/returns" class="site_footer-link">Условия возврата</a></li>
              <li><a href="/care-guide" class="site_footer-link">Care Guide</a></li>
              <li><a href="/faq" class="site_footer-link">FAQ</a></li>
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
          <a href="/privacy" class="site_footer-legal_link">Политика обработки персональных данных</a>
          <span class="site_footer-legal_separator">•</span>
          <a href="/terms" class="site_footer-legal_link">Публичная офферта</a>
        </div>
      </div>
      
    </div>
  `;
}