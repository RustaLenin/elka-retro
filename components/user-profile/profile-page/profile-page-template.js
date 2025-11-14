/**
 * Profile Page Template
 */

export function renderProfilePageTemplate(state) {
  const { user, activeTab } = state;

  return `
    <div class="profile-page">
      <header class="profile-page__header">
        <h1 class="profile-page__title">Личный кабинет</h1>
        <p class="profile-page__subtitle">${user?.email || user?.user_email || ''}</p>
      </header>

      <tab-navigation active-tab="${activeTab}"></tab-navigation>

      <main class="profile-page__content" data-active-tab="${activeTab}">
        <!-- Вкладки будут загружаться динамически через lazy loading -->
        <profile-settings-tab user-id="${user?.id || ''}" style="display: ${activeTab === 'settings' ? 'block' : 'none'};"></profile-settings-tab>
        <order-history-tab user-id="${user?.id || ''}" style="display: ${activeTab === 'orders' ? 'block' : 'none'};"></order-history-tab>
        <contact-form-tab user-id="${user?.id || ''}" style="display: ${activeTab === 'contact' ? 'block' : 'none'};"></contact-form-tab>
      </main>
    </div>
  `;
}

