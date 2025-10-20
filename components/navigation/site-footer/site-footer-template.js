export function site_footer_template(state) {
  return `
    <div class="site_footer-container">
      <div class="site_footer-content">
        
        <!-- Brand Section -->
        <div class="site_footer-brand">
          <div class="site_footer-logo">
            <svg class="site_footer-logo_icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L4 7v10l8 5 8-5V7l-8-5z"/>
              <path d="M12 12v10"/>
              <path d="M4 7l8 5 8-5"/>
            </svg>
            <span class="site_footer-logo_text">НАША ЁЛКА</span>
          </div>
          <p class="site_footer-tagline">
           Магазин антикварной елочной игрушки. Самый большой веб каталог в России.
          </p>
          <div class="site_footer-social">
            <a href="#" class="site_footer-social_link" aria-label="Facebook">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
              </svg>
            </a>
            <a href="#" class="site_footer-social_link" aria-label="Instagram">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
            </a>
            <a href="#" class="site_footer-social_link" aria-label="Twitter">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/>
              </svg>
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