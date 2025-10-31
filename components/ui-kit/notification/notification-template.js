export function notificationTemplate(type, message) {
  return `
    <ui-icon name="notification_${type}" size="medium"></ui-icon>
    <span class="notify_message">${message}</span>
  `;
}


