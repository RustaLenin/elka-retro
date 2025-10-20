export function site_header_template(state) {
  return `
    <div class="site_header-container">
      <div class="site_header-content">
        
        <!-- Left: Logo and Nav -->
        <div class="site_header-left">
          <a href="/" class="site_header-logo_link" aria-label="Go to homepage">
            <span class="site_header-logo">
              <svg class="site_header-logo_icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L4 7v10l8 5 8-5V7l-8-5z"/>
                <path d="M12 12v10"/>
                <path d="M4 7l8 5 8-5"/>
              </svg>
              <span class="site_header-logo_text">Ёлка Ретро</span>
            </span>
          </a>
          
          <nav class="site_header-nav_desktop" aria-label="Primary">
            <a href="/about" class="site_header-nav_link site_header-nav_link--mint">
              <svg class="site_header-nav_icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="9" y1="3" x2="9" y2="21"/>
              </svg>
              <span>О нас</span>
            </a>
            <a href="/contact" class="site_header-nav_link site_header-nav_link--gold">
              <svg class="site_header-nav_icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="15" y1="3" x2="15" y2="21"/>
              </svg>
              <span>Контакты</span>
            </a>
          </nav>
        </div>
        
        <!-- Right: Actions -->
        <div class="site_header-actions">
          <button class="site_header-action_button" aria-label="Search">
            <svg class="site_header-action_icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </button>
          
          <a href="/account" class="site_header-action_button" aria-label="Account">
            <svg class="site_header-action_icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
            </svg>
          </a>
          
          <a href="/cart" class="site_header-cart_link" aria-label="Cart">
            <svg class="site_header-action_icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="9" cy="21" r="1"/>
              <circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            <span class="site_header-cart_text">Корзина</span>
            ${state.cartCount > 0 ? `
              <span class="site_header-cart_badge">${state.cartCount > 99 ? '99+' : state.cartCount}</span>
            ` : ''}
          </a>
          
          <button class="site_header-menu_button MobileMenuToggle" aria-label="Open menu">
            <svg class="site_header-action_icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>
        
      </div>
      
      <!-- Mobile Menu -->
      <div class="site_header-mobile_menu ${state.menuOpen ? 'site_header-mobile_menu--open' : ''}">
        <div class="site_header-mobile_content">
          <div class="site_header-mobile_header">
            <a href="/" class="site_header-mobile_logo">
              <svg class="site_header-logo_icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L4 7v10l8 5 8-5V7l-8-5z"/>
                <path d="M12 12v10"/>
                <path d="M4 7l8 5 8-5"/>
              </svg>
              <span>НАША ЁЛКА</span>
            </a>
            <p class="site_header-mobile_subtitle">Vintage ornaments, modern experience</p>
          </div>
          
          <nav class="site_header-mobile_nav">
            <a href="/about" class="site_header-mobile_link CloseMobileMenu">
              <svg class="site_header-nav_icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="9" y1="3" x2="9" y2="21"/>
              </svg>
              <span>О Нас</span>
            </a>
            <a href="/contact" class="site_header-mobile_link CloseMobileMenu">
              <svg class="site_header-nav_icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="15" y1="3" x2="15" y2="21"/>
              </svg>
              <span>Контакты</span>
            </a>
          </nav>
          
          <div class="site_header-mobile_footer">
            <a href="/account" class="site_header-mobile_link CloseMobileMenu">
              <svg class="site_header-nav_icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="9" y1="3" x2="9" y2="21"/>
              </svg>
              <span>Аккаунт</span>
            </a>
            <a href="/cart" class="site_header-mobile_link CloseMobileMenu">
              <svg class="site_header-nav_icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="9" cy="21" r="1"/>
                <circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              <span>Корзина ${state.cartCount > 0 ? `(${state.cartCount})` : ''}</span>
            </a>
          </div>
        </div>
        
        <div class="site_header-mobile_overlay CloseMobileMenu"></div>
      </div>
      
      <!-- Accent Line -->
      <div class="site_header-accent_line"></div>
    </div>
  `;
}