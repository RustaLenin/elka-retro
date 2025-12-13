/**
 * Регистрация всех конфигураций форм в window.app.forms
 */

import { signInFormConfig } from './sign-in.js';
import { registerFormConfig } from './register.js';
import { passwordResetFormConfig } from './password-reset.js';
import { authCodeFormConfig } from './auth-code.js';
import { profileEditFormConfig } from './profile-edit.js';
import { profileChangePasswordFormConfig } from './profile-change-password.js';
import { contactFormConfig } from './contact.js';
import { orderPersonalFormConfig } from './order-personal.js';
import { orderPersonalAuthorizedFormConfig } from './order-personal-authorized.js';
import { orderLogisticsFormConfig } from './order-logistics.js';
import { orderPaymentFormConfig } from './order-payment.js';
// Импортируем другие конфигурации форм здесь по мере их добавления

// Инициализируем объект форм в window.app, если его нет
if (!window.app) {
  window.app = {};
}

if (!window.app.forms) {
  window.app.forms = {};
}

// Регистрируем конфигурации форм
window.app.forms.signIn = signInFormConfig;
window.app.forms.register = registerFormConfig;
window.app.forms.passwordReset = passwordResetFormConfig;
window.app.forms.authCode = authCodeFormConfig;
window.app.forms.profileEdit = profileEditFormConfig;
window.app.forms.profileChangePassword = profileChangePasswordFormConfig;
window.app.forms.contact = contactFormConfig;
window.app.forms.orderPersonal = orderPersonalFormConfig;
window.app.forms.orderPersonalAuthorized = orderPersonalAuthorizedFormConfig;
window.app.forms.orderLogistics = orderLogisticsFormConfig;
window.app.forms.orderPayment = orderPaymentFormConfig;

// Отладочное логирование
console.log('[app/forms/index.js] Forms registered:', {
  orderPersonal: !!window.app.forms.orderPersonal,
  orderPersonalAuthorized: !!window.app.forms.orderPersonalAuthorized,
  orderLogistics: !!window.app.forms.orderLogistics,
  orderPayment: !!window.app.forms.orderPayment,
  allForms: Object.keys(window.app.forms)
});

