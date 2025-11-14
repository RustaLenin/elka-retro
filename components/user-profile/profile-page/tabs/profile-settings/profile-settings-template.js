/**
 * Profile Settings Tab Template
 */

export function renderProfileSettingsTemplate(state) {
  const { profile, error, success } = state;

  return `
    <div class="profile-settings-tab">
      ${error && error !== 'Ошибка загрузки профиля' ? `
        <div class="profile-settings-tab__notification profile-settings-tab__notification--error">
          <p>${error}</p>
        </div>
      ` : ''}
      ${success ? `
        <div class="profile-settings-tab__notification profile-settings-tab__notification--success">
          <p>Профиль успешно обновлён!</p>
        </div>
      ` : ''}

      <div class="profile-settings-tab__sections">
        <section class="profile-settings-tab__section">
          <ui-form-controller 
            id="profile-form-controller"
            config-path="app.forms.profileEdit"
          ></ui-form-controller>
        </section>

        <section class="profile-settings-tab__section profile-settings-tab__section--password">
          <ui-form-controller 
            id="password-form-controller"
            config-path="app.forms.profileChangePassword"
          ></ui-form-controller>
        </section>
      </div>
    </div>
  `;
}

