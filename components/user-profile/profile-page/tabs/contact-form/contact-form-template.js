/**
 * Contact Form Tab Template
 */

export function renderContactFormTemplate(state) {
  return `
    <div class="contact-form-tab">
      <ui-form-controller 
        id="contact-form-controller"
        config-path="app.forms.contact"
      ></ui-form-controller>
    </div>
  `;
}

