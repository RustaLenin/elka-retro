/**
 * Сервис для отправки событий в Яндекс.Метрику
 * 
 * Подписывается на ключевые события приложения и отправляет их в Метрику
 * для отслеживания поведения пользователей.
 */

const METRIKA_ID = 105476039;

/**
 * Проверяет, загружена ли Яндекс.Метрика
 * @returns {boolean}
 */
function isMetrikaLoaded() {
  return typeof window !== 'undefined' && typeof window.ym === 'function';
}

/**
 * Отправляет событие в Яндекс.Метрику
 * @param {string} eventName - Название события
 * @param {Object} params - Параметры события (опционально)
 */
export function trackEvent(eventName, params = {}) {
  if (!isMetrikaLoaded()) {
    // Если Метрика ещё не загружена, сохраняем событие в очередь
    if (!window._ymQueue) {
      window._ymQueue = [];
    }
    window._ymQueue.push({ eventName, params });
    return;
  }

  try {
    window.ym(METRIKA_ID, 'reachGoal', eventName, params);
  } catch (error) {
    console.warn('[analytics] Failed to send event to Yandex.Metrika:', error);
  }
}

/**
 * Отправляет событие просмотра страницы
 * @param {string} pagePath - Путь страницы
 * @param {string} pageTitle - Заголовок страницы (опционально)
 */
export function trackPageView(pagePath, pageTitle = null) {
  if (!isMetrikaLoaded()) {
    return;
  }

  try {
    const params = { page_path: pagePath };
    if (pageTitle) {
      params.page_title = pageTitle;
    }
    window.ym(METRIKA_ID, 'hit', pagePath, params);
  } catch (error) {
    console.warn('[analytics] Failed to track page view:', error);
  }
}

/**
 * Отправляет событие ecommerce (для отслеживания покупок)
 * @param {string} action - Действие ('add', 'remove', 'purchase', etc.)
 * @param {Object} data - Данные о товаре/заказе
 */
export function trackEcommerce(action, data) {
  if (!isMetrikaLoaded()) {
    return;
  }

  try {
    // Используем dataLayer для ecommerce событий
    if (!window.dataLayer) {
      window.dataLayer = [];
    }

    window.dataLayer.push({
      ecommerce: {
        [action]: data
      }
    });
  } catch (error) {
    console.warn('[analytics] Failed to track ecommerce event:', error);
  }
}

/**
 * Инициализирует сервис аналитики
 * Подписывается на ключевые события приложения
 */
export function initAnalytics() {
  // Обрабатываем очередь событий, если Метрика загрузилась позже
  const processQueue = () => {
    if (window._ymQueue && window._ymQueue.length > 0) {
      window._ymQueue.forEach(({ eventName, params }) => {
        trackEvent(eventName, params);
      });
      window._ymQueue = [];
    }
  };

  // Проверяем, загружена ли Метрика
  if (isMetrikaLoaded()) {
    processQueue();
  } else {
    // Ждём загрузки Метрики
    const checkInterval = setInterval(() => {
      if (isMetrikaLoaded()) {
        clearInterval(checkInterval);
        processQueue();
      }
    }, 100);

    // Останавливаем проверку через 5 секунд
    setTimeout(() => {
      clearInterval(checkInterval);
    }, 5000);
  }

  // Отслеживание просмотра страницы
  if (document.readyState === 'complete') {
    trackPageView(window.location.pathname, document.title);
  } else {
    window.addEventListener('load', () => {
      trackPageView(window.location.pathname, document.title);
    });
  }

  // Отслеживание событий корзины
  window.addEventListener('elkaretro:cart:item-added', (e) => {
    const { item } = e.detail;
    trackEvent('cart_add_item', {
      item_id: item.id,
      item_type: item.type,
      item_price: item.price
    });

    // Ecommerce событие для добавления в корзину
    trackEcommerce('add', {
      items: [{
        id: `${item.type}-${item.id}`,
        name: `${item.type} #${item.id}`,
        category: item.type,
        price: item.price,
        quantity: 1
      }]
    });
  });

  window.addEventListener('elkaretro:cart:item-removed', (e) => {
    const { itemId, itemType } = e.detail;
    trackEvent('cart_remove_item', {
      item_id: itemId,
      item_type: itemType
    });

    // Ecommerce событие для удаления из корзины
    trackEcommerce('remove', {
      items: [{
        id: `${itemType}-${itemId}`
      }]
    });
  });

  window.addEventListener('elkaretro:cart:updated', (e) => {
    const { cart, count } = e.detail;
    trackEvent('cart_updated', {
      items_count: count,
      total_price: cart.items?.reduce((sum, item) => sum + item.price, 0) || 0
    });
  });

  // Отслеживание событий авторизации
  window.addEventListener('elkaretro:auth:login', (e) => {
    trackEvent('user_login', {
      user_id: e.detail.user?.id || null
    });
  });

  window.addEventListener('elkaretro:auth:register', (e) => {
    trackEvent('user_register', {
      user_id: e.detail.user?.id || null
    });
  });

  window.addEventListener('elkaretro:auth:logout', () => {
    trackEvent('user_logout');
  });

  // Отслеживание ошибок авторизации
  window.addEventListener('elkaretro:auth:error', (e) => {
    trackEvent('auth_error', {
      error_message: e.detail.error || 'Unknown error',
      error_type: 'authentication'
    });
  });

  // Отслеживание отправки форм
  // Подписываемся на события успешной отправки форм
  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (!form || form.tagName !== 'FORM') return;

    // Определяем тип формы по классам или data-атрибутам
    const formType = form.dataset.formType || 
                     form.className.match(/form-(\w+)/)?.[1] ||
                     'unknown';

    // Отслеживаем отправку формы (детали будут в событии успеха/ошибки)
    trackEvent('form_submit', {
      form_type: formType
    });
  });

  // Отслеживание успешной отправки форм через события приложения
  // (если формы отправляют кастомные события при успехе)
  window.addEventListener('elkaretro:form:success', (e) => {
    trackEvent('form_success', {
      form_type: e.detail.formType || 'unknown',
      form_data: e.detail.data || {}
    });
  });

  // Отслеживание ошибок форм через общие события ui-form-controller
  document.addEventListener('ui-form:error', (e) => {
    const formId = e.detail.formId || 'unknown';
    const errorMessage = e.detail.error?.message || e.detail.error || 'Unknown error';
    trackEvent('form_error', {
      form_id: formId,
      form_type: formId.replace('-form', '').replace('_form', ''),
      error_message: errorMessage,
      error_type: 'form_submission'
    });
  });

  // Отслеживание ошибок валидации форм
  document.addEventListener('ui-form:invalid', (e) => {
    const formId = e.detail.formId || 'unknown';
    trackEvent('form_validation_error', {
      form_id: formId,
      form_type: formId.replace('-form', '').replace('_form', ''),
      validation_errors: e.detail.validation?.errors?.length || 0
    });
  });

  // Отслеживание специфичных ошибок форм заказа
  window.addEventListener('order-personal:error', (e) => {
    trackEvent('order_form_error', {
      form_step: 'personal',
      error_message: e.detail.error || 'Unknown error',
      error_type: 'order_registration'
    });
  });

  window.addEventListener('order-personal-authorized:error', (e) => {
    trackEvent('order_form_error', {
      form_step: 'personal-authorized',
      error_message: e.detail.error || 'Unknown error',
      error_type: 'order_personal_data'
    });
  });

  window.addEventListener('order-payment:error', (e) => {
    trackEvent('order_form_error', {
      form_step: 'payment',
      error_message: e.detail.error || 'Unknown error',
      error_type: 'order_payment'
    });
  });

  window.addEventListener('order-logistics:error', (e) => {
    trackEvent('order_form_error', {
      form_step: 'logistics',
      error_message: e.detail.error || 'Unknown error',
      error_type: 'order_logistics'
    });
  });

  // Отслеживание ошибок формы контактов
  window.addEventListener('contact:submit-error', (e) => {
    trackEvent('form_error', {
      form_id: 'contact',
      form_type: 'contact',
      error_message: e.detail.error || 'Unknown error',
      error_type: 'contact_form'
    });
  });

  // Отслеживание ошибок профиля
  window.addEventListener('profile:password-change-error', (e) => {
    trackEvent('profile_error', {
      action: 'password_change',
      error_message: e.detail.error || 'Unknown error',
      error_type: 'profile_update'
    });
  });

  window.addEventListener('profile:update-error', (e) => {
    trackEvent('profile_error', {
      action: 'update',
      error_message: e.detail.error || 'Unknown error',
      error_type: 'profile_update'
    });
  });

  // Отслеживание ошибок восстановления пароля
  window.addEventListener('password-reset:error', (e) => {
    trackEvent('auth_error', {
      error_message: e.detail.error || 'Unknown error',
      error_type: 'password_reset'
    });
  });

  // Отслеживание просмотра товаров
  // Подписываемся на события загрузки данных товаров (когда модальное окно открывается)
  window.addEventListener('app-state-toy-instance-loaded', (e) => {
    const { toyInstance } = e.detail;
    if (toyInstance && toyInstance.id) {
      trackEvent('product_view', {
        product_id: toyInstance.id,
        product_type: 'toy_instance',
        product_title: toyInstance.title?.rendered || toyInstance.title || ''
      });
    }
  });

  // Также отслеживаем прямые события просмотра (если они будут добавлены в будущем)
  window.addEventListener('elkaretro:toy-instance:view', (e) => {
    trackEvent('product_view', {
      product_id: e.detail.id,
      product_type: 'toy_instance'
    });
  });

  window.addEventListener('elkaretro:accessory:view', (e) => {
    trackEvent('product_view', {
      product_id: e.detail.id,
      product_type: 'ny_accessory'
    });
  });

  // Отслеживание поиска в каталоге
  window.addEventListener('elkaretro:catalog:search', (e) => {
    trackEvent('catalog_search', {
      query: e.detail.query || '',
      results_count: e.detail.resultsCount || 0
    });
  });

  // Отслеживание применения фильтров
  window.addEventListener('elkaretro:catalog:filters-applied', (e) => {
    trackEvent('catalog_filters', {
      filters: e.detail.filters || {},
      results_count: e.detail.resultsCount || 0
    });
  });

  // Отслеживание ошибок создания заказа
  window.addEventListener('elkaretro:order:error', (e) => {
    trackEvent('order_error', {
      error_message: e.detail.error || 'Unknown error',
      error_type: 'order_creation'
    });
  });

  // Отслеживание создания заказа
  window.addEventListener('elkaretro:order:created', (e) => {
    const { order } = e.detail;
    trackEvent('order_created', {
      order_id: order.id,
      order_total: order.total || 0,
      items_count: order.items?.length || 0
    });

    // Ecommerce событие для покупки
    if (order.items && order.items.length > 0) {
      trackEcommerce('purchase', {
        transaction_id: order.id.toString(),
        value: order.total || 0,
        currency: 'RUB',
        items: order.items.map(item => ({
          id: `${item.type}-${item.id}`,
          name: `${item.type} #${item.id}`,
          category: item.type,
          price: item.price,
          quantity: 1
        }))
      });
    }
  });

  console.log('[analytics] Yandex.Metrika analytics initialized');
}

