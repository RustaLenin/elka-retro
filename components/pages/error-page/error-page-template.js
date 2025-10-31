/**
 * Error Page Template
 * Шаблон для отображения страниц ошибок с разными картинками и подписями
 */

// Экранируем HTML для безопасности (для текста)
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Конфигурация для разных типов ошибок
const ERROR_CONFIG = {
  '404': {
    title: 'Страница не найдена',
    message: 'К сожалению, запрашиваемая страница не существует или была перемещена.',
    image: 'alert_circle', // Используем иконку из ui-icon
    suggestions: [
      'Проверьте правильность введённого адреса',
      'Вернитесь на <a href="/">главную страницу</a>',
      'Используйте поиск для нахождения нужной информации'
    ]
  },
  '403': {
    title: 'Доступ запрещён',
    message: 'У вас нет прав для доступа к этой странице.',
    image: 'x_circle',
    suggestions: [
      'Если вы считаете, что это ошибка, обратитесь к администратору',
      'Вернитесь на <a href="/">главную страницу</a>',
      'Войдите в систему, если у вас есть учётная запись'
    ]
  },
  '500': {
    title: 'Внутренняя ошибка сервера',
    message: 'Произошла ошибка на сервере. Мы уже работаем над её устранением.',
    image: 'alert_triangle',
    suggestions: [
      'Попробуйте обновить страницу через несколько минут',
      'Вернитесь на <a href="/">главную страницу</a>',
      'Если проблема повторяется, сообщите нам об этом'
    ]
  },
  '503': {
    title: 'Сервис временно недоступен',
    message: 'Сервис находится на техническом обслуживании.',
    image: 'alert_triangle',
    suggestions: [
      'Попробуйте обновить страницу через несколько минут',
      'Вернитесь на <a href="/">главную страницу</a>'
    ]
  },
  'default': {
    title: 'Произошла ошибка',
    message: 'Что-то пошло не так. Попробуйте обновить страницу или вернуться на главную.',
    image: 'alert_circle',
    suggestions: [
      'Обновите страницу',
      'Вернитесь на <a href="/">главную страницу</a>'
    ]
  }
};

export function error_page_template(state) {
  const { errorCode = '404' } = state;
  
  // Получаем конфигурацию для данного кода ошибки или используем default
  const config = ERROR_CONFIG[errorCode] || ERROR_CONFIG.default;
  
  return `
    <article class="error-page_content">
      <div class="error-page_illustration">
        <ui-icon name="${escapeHtml(config.image)}" size="xxxl"></ui-icon>
      </div>
      
      <header class="error-page_header">
        <h1 class="error-page_code">${escapeHtml(errorCode)}</h1>
        <h2 class="error-page_title">${escapeHtml(config.title)}</h2>
        <p class="error-page_message">${escapeHtml(config.message)}</p>
      </header>
      
      <div class="error-page_suggestions">
        <h3 class="error-page_suggestions-title">Что можно сделать:</h3>
        <ul class="error-page_suggestions-list">
          ${config.suggestions.map(suggestion => `
            <li>${suggestion}</li>
          `).join('')}
        </ul>
      </div>
      
      <div class="error-page_actions">
        <a href="/" class="error-page_home-link">
          <ui-button type="primary" label="Вернуться на главную"></ui-button>
        </a>
        ${errorCode === '404' ? `
          <a href="/blog/" class="error-page_blog-link">
            <ui-button type="secondary" label="Читать новости"></ui-button>
          </a>
        ` : ''}
      </div>
    </article>
  `;
}

