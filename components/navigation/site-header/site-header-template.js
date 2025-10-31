export function site_header_template(state) {
  return `
    <div class="site_header-container">
      <div class="site_header-content">
        
        <!-- Left: Logo and Nav -->
        <div class="site_header-left">
          <a href="/" class="site_header-logo_link" aria-label="Go to homepage">
            <span class="site_header-logo">
              <ui-icon name="logo" size="large" class="site_header-logo_icon"></ui-icon>
              <span class="site_header-logo_text">Ёлка Ретро</span>
            </span>
          </a>
          
          <nav class="site_header-nav_desktop" aria-label="Primary">
            <nav-link href="/about" label="О нас" icon="about" variant="mint"></nav-link>
            <nav-link href="/contact" label="Контакты" icon="contact" variant="gold"></nav-link>
          </nav>
        </div>
        
        <!-- Right: Actions -->
        <div class="site_header-actions">
          <button class="site_header-action_button" aria-label="Search">
            <ui-icon name="search" size="medium" class="site_header-action_icon"></ui-icon>
          </button>
          
          <a href="/account" class="site_header-action_button" aria-label="Account">
            <ui-icon name="account" size="medium" class="site_header-action_icon"></ui-icon>
          </a>
          
          <a href="/cart" class="site_header-cart_link" aria-label="Cart">
            <ui-icon name="cart" size="medium" class="site_header-action_icon"></ui-icon>
            <span class="site_header-cart_text">Корзина</span>
            ${state.cartCount > 0 ? `
              <span class="site_header-cart_badge">${state.cartCount > 99 ? '99+' : state.cartCount}</span>
            ` : ''}
          </a>
          
          <button class="site_header-menu_button MobileMenuToggle" aria-label="Open menu">
            <ui-icon name="menu" size="medium" class="site_header-action_icon"></ui-icon>
          </button>
        </div>
        
      </div>
      
      <!-- Mobile Menu -->
      <div class="site_header-mobile_menu ${state.menuOpen ? 'site_header-mobile_menu--open' : ''}">
        <div class="site_header-mobile_content">
          <div class="site_header-mobile_header">
            <a href="/" class="site_header-mobile_logo">
              <ui-icon name="logo" size="medium" class="site_header-logo_icon"></ui-icon>
              <span>НАША ЁЛКА</span>
            </a>
            <p class="site_header-mobile_subtitle">Vintage ornaments, modern experience</p>
          </div>
          
          <nav class="site_header-mobile_nav">
            <a href="/about" class="site_header-mobile_link CloseMobileMenu">
              <ui-icon name="about" size="medium"></ui-icon>
              <span>О Нас</span>
            </a>
            <a href="/contact" class="site_header-mobile_link CloseMobileMenu">
              <ui-icon name="contact" size="medium"></ui-icon>
              <span>Контакты</span>
            </a>
          </nav>
          
          <div class="site_header-mobile_footer">
            <a href="/account" class="site_header-mobile_link CloseMobileMenu">
              <ui-icon name="account" size="medium" class="site_header-nav_icon"></ui-icon>
              <span>Аккаунт</span>
            </a>
            <a href="/cart" class="site_header-mobile_link CloseMobileMenu">
              <ui-icon name="cart" size="medium" class="site_header-nav_icon"></ui-icon>
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