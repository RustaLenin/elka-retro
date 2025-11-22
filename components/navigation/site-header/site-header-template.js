export function site_header_template(state) {
  return `
    <div class="site_header-container">
      <div class="site_header-content">
        
        <!-- Left: Logo and Nav -->
        <div class="site_header-left">
          <a href="/" class="site_header-logo_link" aria-label="Перейти на главную">
            <span class="site_header-logo">
              <ui-icon name="logo" size="large" class="site_header-logo_icon"></ui-icon>
              <span class="site_header-logo_text">Ёлка Ретро</span>
            </span>
          </a>
          
          <nav class="site_header-nav_desktop" aria-label="Primary">
            <nav-link href="${state.catalogUrl}" label="Каталог игрушек" icon="tree" variant="mint"></nav-link>
            <nav-link href="${state.accessoriesUrl || '/ny-accessory/'}" label="Каталог Аксессуаров" icon="grid" variant="mint"></nav-link>
            <nav-link href="${state.homeUrl || '/'}#site-info-about" label="О нас" icon="info" variant="gold"></nav-link>
          </nav>
        </div>
        
        <!-- Right: Actions -->
        <div class="site_header-actions">
          <!-- Меню пользователя (для авторизованных) или кнопка входа (для неавторизованных) -->
          <user-menu></user-menu>
          
          <ui-button
            type="ghost"
            icon="cart"
            label="Корзина"
            action="link"
            href="/cart"
            class="site_header-cart_button"
            aria-label="Корзина"
            ${state.cartCount > 0 ? `data-badge="${state.cartCount > 99 ? '99+' : state.cartCount}"` : ''}
          ></ui-button>
        </div>
        
      </div>
      
      <!-- Accent Line -->
      <div class="site_header-accent_line"></div>
    </div>
  `;
}