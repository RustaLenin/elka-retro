/**
 * User Menu Template
 */

export function renderUserMenuTemplate(state) {
  const { user, initials, open } = state;

  if (!user) {
    // Если пользователь не авторизован, показываем кнопку "Войти" с иконкой входа
    return `
      <ui-button 
        type="ghost"
        icon="login"
        label="Войти"
        class="user-menu__button user-menu__button--login"
        data-app-action="user.showSignInModal"
        data-app-prevent-default="true"
      ></ui-button>
    `;
  }

  // Если пользователь авторизован, показываем кружочек с инициалами и меню
  return `
    <div class="user-menu">
      <ui-button 
        type="ghost"
        label="${user.name || user.display_name || user.email}"
        aria-expanded="${open}"
        class="user-menu__button"
        data-avatar="${initials}"
        data-app-action="user.toggleMenu"
        data-app-prevent-default="true"
      ></ui-button>
      
      <div class="user-menu__dropdown ${open ? 'user-menu__dropdown--open' : ''}">
        <div class="user-menu__header">
          <span class="user-menu__avatar user-menu__avatar--large">${initials}</span>
          <div class="user-menu__info">
            <div class="user-menu__name">${user.name || user.display_name || 'Пользователь'}</div>
            <div class="user-menu__email">${user.email || user.user_email || ''}</div>
          </div>
        </div>
        
        <nav class="user-menu__nav">
          <a
            href="/profile/"
            class="user-menu__link"
            data-app-action="user.openProfile"
            data-app-prevent-default="true"
          >
            <ui-icon name="account" size="small"></ui-icon>
            <span>Профиль</span>
          </a>
          <a
            href="/profile/#orders"
            class="user-menu__link"
            data-app-action="user.openOrders"
            data-app-prevent-default="true"
          >
            <ui-icon name="cart" size="small"></ui-icon>
            <span>Мои заказы</span>
          </a>
          <ui-button 
            type="ghost"
            icon="close"
            icon-position="left"
            label="Выйти"
            data-app-action="user.logout"
            data-app-prevent-default="true"
            class="user-menu__link user-menu__link--logout"
          ></ui-button>
        </nav>
      </div>
    </div>
  `;
}

