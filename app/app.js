import { createModalManager } from './modal-manager.js';
import { createEventBus } from './events/index.js';
import { registerLegalModals } from './modals/legal-modals.js';

// Статические импорты stores, services и analytics
import { getCatalogStore } from '../components/catalog/catalog-store.js';
import { getAccessoryCatalogStore } from '../components/accessory-catalog/accessory-catalog-store.js';
import { getCartStore } from '../components/cart/cart-store.js';
import { authService } from '../components/user-profile/services/auth-service.js';
import { userService } from '../components/user-profile/services/user-service.js';
import { userUiService } from '../components/user-profile/services/user-ui-service.js';
import { showModal } from '../components/ui-kit/modal/modal.js';
import { notify } from '../components/ui-kit/notification/notification.js';
import './forms/index.js';
import { initAnalytics } from './analytics/yandex-metrika.js';

// Global App State and Utilities
// Сохраняем существующий window.app.forms, если он был создан при импорте forms/index.js
const existingForms = window.app?.forms;

window.app = {
  // Services registry
  services: {},
  // Forms registry (восстанавливаем, если был создан при импорте)
  forms: existingForms || {},
  // Toolkit utilities
  toolkit: {
    // Ensure a stylesheet is added to <head> only once
    loadCSSOnce(cssHref) {
      let href = String(cssHref);
      
      // Добавляем версионирование к CSS файлам для cache busting
      // Используем window.APP_VERSION, если он доступен
      if (typeof window.APP_VERSION !== 'undefined' && window.APP_VERSION) {
        const url = new URL(href, window.location.href);
        // Добавляем версию, только если её ещё нет в URL
        if (!url.searchParams.has('v')) {
          url.searchParams.set('v', window.APP_VERSION);
          href = url.toString();
        }
      }
      
      if (!document.querySelector(`link[rel="stylesheet"][href="${href}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
      }
    }
  },
  // Catalog Management - Публичный API для работы с каталогом
  // Все операции с каталогом выполняются через этот API
  // Компоненты слушают события elkaretro:catalog:updated для обновления
  catalog: {
    /**
     * Получить текущее состояние каталога
     * @returns {Object} Состояние каталога
     */
    getState: function() {
      if (!window.app.catalogStore) {
        console.warn('[app.catalog] catalogStore not initialized yet');
        return null;
      }
      return window.app.catalogStore.getCatalogState();
    },

    /**
     * Получить метаданные каталога
     * @returns {Object} Метаданные
     */
    getMeta: function() {
      if (!window.app.catalogStore) {
        console.warn('[app.catalog] catalogStore not initialized yet');
        return null;
      }
      return window.app.catalogStore.getMeta();
    },

    /**
     * Обновить режим каталога (type | instance)
     * @param {string} mode - 'type' | 'instance'
     */
    setMode: function(mode) {
      if (!window.app.catalogStore) {
        console.warn('[app.catalog] catalogStore not initialized yet');
        return;
      }
      const perPage = window.app.catalogStore.getPerPage();
      window.app.catalogStore.updateState({ mode, limit: perPage, filters: {} });
    },

    /**
     * Установить поисковый запрос
     * @param {string} search - Поисковый запрос
     */
    setSearch: function(search) {
      if (!window.app.catalogStore) {
        console.warn('[app.catalog] catalogStore not initialized yet');
        return;
      }
      const perPage = window.app.catalogStore.getPerPage();
      window.app.catalogStore.updateState({ search: search.trim(), limit: perPage });
    },

    /**
     * Установить сортировку
     * @param {string} sort - Значение сортировки (например, 'newest', 'oldest')
     */
    setSort: function(sort) {
      if (!window.app.catalogStore) {
        console.warn('[app.catalog] catalogStore not initialized yet');
        return;
      }
      const perPage = window.app.catalogStore.getPerPage();
      window.app.catalogStore.updateState({ sort, limit: perPage });
    },

    /**
     * Установить фильтры
     * @param {Object<string, string[]>} filters - Объект с фильтрами { filterKey: [values] }
     */
    setFilters: function(filters) {
      if (!window.app.catalogStore) {
        console.warn('[app.catalog] catalogStore not initialized yet');
        return;
      }
      const perPage = window.app.catalogStore.getPerPage();
      window.app.catalogStore.updateState({ filters, limit: perPage });
    },

    /**
     * Обновить фильтр
     * @param {string} filterKey - Ключ фильтра
     * @param {string[]|null} values - Значения фильтра (null для удаления)
     */
    updateFilter: function(filterKey, values) {
      if (!window.app.catalogStore) {
        console.warn('[app.catalog] catalogStore not initialized yet');
        return;
      }
      const currentState = window.app.catalogStore.getCatalogState();
      const filters = { ...currentState.filters };
      
      if (values === null || (Array.isArray(values) && values.length === 0)) {
        delete filters[filterKey];
      } else {
        filters[filterKey] = Array.isArray(values) ? values : [values];
      }
      
      const perPage = window.app.catalogStore.getPerPage();
      window.app.catalogStore.updateState({ filters, limit: perPage });
    },

    /**
     * Установить limit (сколько всего элементов показано)
     * @param {number} limit - Количество элементов
     */
    setLimit: function(limit) {
      if (!window.app.catalogStore) {
        console.warn('[app.catalog] catalogStore not initialized yet');
        return;
      }
      window.app.catalogStore.updateState({ limit: Math.max(1, parseInt(limit, 10) || 30) });
    },

    /**
     * Перейти на страницу (устарело, используйте setLimit)
     * @deprecated Используйте setLimit
     * @param {number} page - Номер страницы
     */
    setPage: function(page) {
      console.warn('[app.catalog] setPage is deprecated, use setLimit instead');
      // Для обратной совместимости конвертируем page в limit
      const perPage = window.app.catalogStore?.getPerPage() || 30;
      const limit = page * perPage;
      this.setLimit(limit);
    },

    /**
     * Сбросить фильтры
     */
    resetFilters: function() {
      if (!window.app.catalogStore) {
        console.warn('[app.catalog] catalogStore not initialized yet');
        return;
      }
      const perPage = window.app.catalogStore.getPerPage();
      window.app.catalogStore.updateState({
        filters: {},
        search: '',
        limit: perPage,
      });
    },

    /**
     * Сбросить состояние каталога
     * @param {Object} options
     * @param {boolean} options.keepMode - Сохранить текущий режим (default: false)
     */
    reset: function(options = {}) {
      if (!window.app.catalogStore) {
        console.warn('[app.catalog] catalogStore not initialized yet');
        return;
      }
      window.app.catalogStore.reset(options);
    },
  },

  // Accessory Catalog Management - Публичный API для работы с каталогом аксессуаров
  // Все операции с каталогом аксессуаров выполняются через этот API
  // Компоненты слушают события elkaretro:accessory-catalog:updated для обновления
  accessoryCatalog: {
    /**
     * Получить текущее состояние каталога аксессуаров
     * @returns {Object} Состояние каталога
     */
    getState: function() {
      if (!window.app.accessoryCatalogStore) {
        console.warn('[app.accessoryCatalog] accessoryCatalogStore not initialized yet');
        return null;
      }
      return window.app.accessoryCatalogStore.getCatalogState();
    },

    /**
     * Получить метаданные каталога аксессуаров
     * @returns {Object} Метаданные
     */
    getMeta: function() {
      if (!window.app.accessoryCatalogStore) {
        console.warn('[app.accessoryCatalog] accessoryCatalogStore not initialized yet');
        return null;
      }
      return window.app.accessoryCatalogStore.getMeta();
    },

    /**
     * Установить поисковый запрос
     * @param {string} search - Поисковый запрос
     */
    setSearch: function(search) {
      if (!window.app.accessoryCatalogStore) {
        console.warn('[app.accessoryCatalog] accessoryCatalogStore not initialized yet');
        return;
      }
      const perPage = window.app.accessoryCatalogStore.getPerPage();
      window.app.accessoryCatalogStore.updateState({ search: search.trim(), limit: perPage });
    },

    /**
     * Установить сортировку
     * @param {string} sort - Значение сортировки (например, 'newest', 'oldest')
     */
    setSort: function(sort) {
      if (!window.app.accessoryCatalogStore) {
        console.warn('[app.accessoryCatalog] accessoryCatalogStore not initialized yet');
        return;
      }
      const perPage = window.app.accessoryCatalogStore.getPerPage();
      window.app.accessoryCatalogStore.updateState({ sort, limit: perPage });
    },

    /**
     * Установить фильтры
     * @param {Object<string, string[]>} filters - Объект с фильтрами { filterKey: [values] }
     */
    setFilters: function(filters) {
      if (!window.app.accessoryCatalogStore) {
        console.warn('[app.accessoryCatalog] accessoryCatalogStore not initialized yet');
        return;
      }
      const perPage = window.app.accessoryCatalogStore.getPerPage();
      window.app.accessoryCatalogStore.updateState({ filters, limit: perPage });
    },

    /**
     * Обновить фильтр
     * @param {string} filterKey - Ключ фильтра
     * @param {string[]|null} values - Значения фильтра (null для удаления)
     */
    updateFilter: function(filterKey, values) {
      if (!window.app.accessoryCatalogStore) {
        console.warn('[app.accessoryCatalog] accessoryCatalogStore not initialized yet');
        return;
      }
      const currentState = window.app.accessoryCatalogStore.getCatalogState();
      const filters = { ...currentState.filters };
      
      if (values === null || (Array.isArray(values) && values.length === 0)) {
        delete filters[filterKey];
      } else {
        filters[filterKey] = Array.isArray(values) ? values : [values];
      }
      
      const perPage = window.app.accessoryCatalogStore.getPerPage();
      window.app.accessoryCatalogStore.updateState({ filters, limit: perPage });
    },

    /**
     * Установить limit (сколько всего элементов показано)
     * @param {number} limit - Количество элементов
     */
    setLimit: function(limit) {
      if (!window.app.accessoryCatalogStore) {
        console.warn('[app.accessoryCatalog] accessoryCatalogStore not initialized yet');
        return;
      }
      window.app.accessoryCatalogStore.updateState({ limit: Math.max(1, parseInt(limit, 10) || 30) });
    },

    /**
     * Сбросить фильтры
     */
    resetFilters: function() {
      if (!window.app.accessoryCatalogStore) {
        console.warn('[app.accessoryCatalog] accessoryCatalogStore not initialized yet');
        return;
      }
      const perPage = window.app.accessoryCatalogStore.getPerPage();
      window.app.accessoryCatalogStore.updateState({
        filters: {},
        search: '',
        limit: perPage,
      });
    },

    /**
     * Сбросить состояние каталога
     */
    reset: function() {
      if (!window.app.accessoryCatalogStore) {
        console.warn('[app.accessoryCatalog] accessoryCatalogStore not initialized yet');
        return;
      }
      window.app.accessoryCatalogStore.reset();
    },
  },

  cart: null, // Будет инициализирован при загрузке cart-store
  
  // Navigation Utilities
  nav: {
    scrollToSection: function(sectionId) {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  },
  
  // UI Utilities
  ui: {
    showHint: function(target, options = {}) {
      if (window.UIHintManager && target) {
        window.UIHintManager.show(target, options);
      }
    },
    hideHint: function() {
      if (window.UIHintManager) window.UIHintManager.hide();
    },
    toggleMobileMenu: function() {
      const header = document.querySelector('site-header');
      if (header) {
        header.toggleMenu();
      }
    },
    
    
    showModal: function(options = {}) {
      // showModal уже загружен статически
      try {
        return showModal(options);
      } catch (err) {
        console.error('[app.ui] Failed to show modal:', err);
        return null;
      }
    },
    
    showNotification: function(message, type = 'info', duration = 5000) {
      // notify уже загружен статически
      try {
        return notify(type, message, duration);
      } catch (err) {
        console.error('[app.ui] Failed to show notification:', err);
        // Fallback: просто в консоль
        console.log(`[Notification] ${type}: ${message}`);
        return null;
      }
    }
  },
  
  // Authentication State
  auth: {
    user: null,           // Текущий авторизованный пользователь
    authenticated: false, // Статус авторизации
  },

  // Global State Management
  state: {
    // Текущие данные страницы (обновляются компонентами при загрузке)
    currentPageData: {
      toyType: null,      // Данные типа игрушки
      toyInstance: null,   // Данные экземпляра игрушки
      page: null,         // Данные страницы WordPress
      post: null          // Данные поста WordPress
    },
    
    // Утилита для получения значения по пути в объекте (например, "toyInstance.images")
    get(path) {
      if (!path) return null;
      const keys = path.split('.');
      let value = this.currentPageData;
      for (const key of keys) {
        if (value === null || value === undefined) return null;
        value = value[key];
      }
      return value;
    },
    
    // Утилита для установки значения по пути с dispatch события
    set(path, value) {
      if (!path) return false;
      const keys = path.split('.');
      const lastKey = keys.pop();
      let target = this.currentPageData;
      for (const key of keys) {
        if (!target[key] || typeof target[key] !== 'object') {
          target[key] = {};
        }
        target = target[key];
      }
      target[lastKey] = value;
      
      // Dispatch события об изменении стейта
      const event = new CustomEvent('app-state-changed', {
        detail: {
          path: path,
          value: value,
          fullPath: path
        }
      });
      window.dispatchEvent(event);
      
      return true;
    },
    
    // Прямая установка объекта (для массового обновления)
    setData(data) {
      if (!data || typeof data !== 'object') return false;
      Object.assign(this.currentPageData, data);
      
      // Dispatch события об изменении стейта
      const event = new CustomEvent('app-state-changed', {
        detail: {
          path: null, // null означает обновление всего объекта
          value: data,
          fullPath: null
        }
      });
      window.dispatchEvent(event);
      
      return true;
    }
  }
};

window.app.modal = createModalManager();
window.app.events = createEventBus();

// Инициализируем user-ui-service после создания app.modal
// user-ui-service импортирован статически, но его init() вызывается здесь
try {
  userUiService.init();
} catch (err) {
  console.error('[app] Failed to initialize user-ui-service:', err);
}

// Регистрируем модальные окна для юридических документов (внутри регистрируются действия через Event Bus)
registerLegalModals();

// Эмитим событие готовности Event Bus после регистрации всех действий
window.dispatchEvent(new CustomEvent('app:events-ready'));

function handleAppActionClick(event) {
  if (!window.app?.events) return;
  window.app.events.dispatchFromDom(event);
}

document.addEventListener('click', handleAppActionClick);

let authFormsPreloadPromise = null;

function preloadAuthFormsIfNeeded() {
  // Forms уже загружены статически, просто возвращаем resolved promise
  return Promise.resolve();
}

// Инициализация данных авторизации из PHP (выполняется синхронно до DOMContentLoaded)
// Доверяем PHP - если он вернул данные пользователя, используем их
// Если вернул null, значит пользователь не авторизован - не делаем дополнительных запросов
if (window.wpApiSettings?.currentUser) {
  window.app.auth.user = window.wpApiSettings.currentUser;
  window.app.auth.authenticated = true;
} else {
  // PHP явно вернул null - пользователь не авторизован
  window.app.auth.user = null;
  window.app.auth.authenticated = false;
  preloadAuthFormsIfNeeded();
}

// Инициализируем catalog-store синхронно, если элемент уже в DOM
// Это нужно, чтобы компоненты каталога могли использовать store сразу
// Скрипты загружаются в конце body, поэтому DOM уже готов
(function initCatalogStoreIfNeeded() {
  try {
    // Проверяем, есть ли элемент catalog-page в DOM (он может быть уже там)
    if (document.querySelector('catalog-page') && !window.app.catalogStore) {
      const catalogStore = getCatalogStore();
      window.app.catalogStore = catalogStore;
      
      // Отправляем событие о готовности catalogStore
      window.dispatchEvent(new CustomEvent('elkaretro:catalog-store:ready', {
        detail: { store: catalogStore }
      }));
    }
  } catch (err) {
    console.error('[app] Failed to initialize catalog-store synchronously:', err);
  }
})();

// Initialize cart store (async)
document.addEventListener('DOMContentLoaded', function() {
  // Stores уже загружены статически, используем их напрямую
  // catalog-store уже инициализирован синхронно выше, если элемент был в DOM
  // Проверяем снова на случай, если элемент появился только после DOMContentLoaded
  if ((document.querySelector('catalog-page') || document.querySelector('[data-catalog-root]')) && !window.app.catalogStore) {
    try {
      const catalogStore = getCatalogStore();
      window.app.catalogStore = catalogStore;
      
      // Отправляем событие о готовности catalogStore
      window.dispatchEvent(new CustomEvent('elkaretro:catalog-store:ready', {
        detail: { store: catalogStore }
      }));
    } catch (err) {
      console.error('[app] Failed to initialize catalog-store:', err);
    }
  }

  // Инициализируем AccessoryCatalogStore только на страницах с accessory-catalog-page
  if (document.querySelector('accessory-catalog-page')) {
    try {
      const accessoryCatalogStore = getAccessoryCatalogStore();
      window.app.accessoryCatalogStore = accessoryCatalogStore;
    } catch (err) {
      console.error('[app] Failed to initialize accessory-catalog-store:', err);
    }
  }

  // Инициализируем cart-store и присваиваем window.app.cart
  try {
    const cartStore = getCartStore();
    
    // Создаем публичный API для обратной совместимости
    window.app.cart = {
      // Прямой доступ к store для новых компонентов
      ...cartStore,
      
      // Публичные методы для обратной совместимости
      /**
       * Добавить товар в корзину (обратная совместимость - старый API)
       * @param {number} itemId - ID товара
       * @param {string} itemType - тип товара ('toy_instance' | 'ny_accessory')
       * @param {number} price - цена товара
       */
      add: function(itemId, itemType, price) {
        cartStore.addItem({ id: itemId, type: itemType, price: price });
      },
      
      /**
       * Добавить товар в корзину (обратная совместимость - новый API)
       * @param {Object} itemData - данные товара
       * @param {number} itemData.id - ID товара
       * @param {string} itemData.type - тип товара ('toy_instance' | 'ny_accessory')
       * @param {number} itemData.price - цена товара
       */
      addItem: function(itemData) {
        cartStore.addItem(itemData);
      },
      
      /**
       * Удалить товар из корзины (обратная совместимость - старый API)
       * @param {number} itemId - ID товара
       * @param {string} itemType - тип товара ('toy_instance' | 'ny_accessory')
       */
      remove: function(itemId, itemType) {
        cartStore.removeItem(itemId, itemType);
      },
      
      /**
       * Удалить товар из корзины (обратная совместимость - новый API)
       * @param {number} itemId - ID товара
       * @param {string} itemType - тип товара ('toy_instance' | 'ny_accessory')
       */
      removeItem: function(itemId, itemType) {
        cartStore.removeItem(itemId, itemType);
      },
      
      /**
       * Очистить корзину (обратная совместимость - старый API)
       */
      clear: function() {
        cartStore.clearCart();
      },
      
      /**
       * Очистить корзину (обратная совместимость - новый API)
       */
      clearCart: function() {
        cartStore.clearCart();
      },
      
      /**
       * Получить корзину (обратная совместимость)
       * @returns {Object} состояние корзины
       */
      getCart: function() {
        return cartStore.getCart();
      },
      
      /**
       * Получить товары корзины (обратная совместимость)
       * @returns {Array} массив товаров
       */
      getItems: function() {
        return cartStore.getItems();
      },
      
      /**
       * Получить количество товаров в корзине (обратная совместимость)
       * @returns {number}
       */
      getCount: function() {
        return cartStore.getCount();
      },
      
      /**
       * Получить полное состояние стора (для новых компонентов)
       * @returns {Object} полное состояние стора
       */
      getState: function() {
        return cartStore.getState();
      },
      
      /**
       * Подписаться на изменения состояния корзины
       * @param {Function} callback - функция обратного вызова (nextState, prevState) => void
       * @returns {Function} функция отписки
       */
      subscribe: function(callback) {
        return cartStore.subscribe(callback);
      },
    };
    
    // Обновляем window.app.cart.items при событиях обновления корзины
    const updateCartItems = () => {
      window.app.cart.items = window.app.cart.getItems();
    };
    updateCartItems(); // Инициализация
    
    // Отправляем событие об инициализации cart, чтобы все компоненты обновили счетчик
    window.dispatchEvent(
      new CustomEvent('elkaretro:cart:updated', {
        detail: { 
          cart: window.app.cart.getCart(), 
          count: window.app.cart.getCount() 
        },
      })
    );
    
    window.addEventListener('elkaretro:cart:updated', updateCartItems);
  } catch (err) {
    console.error('[app] Failed to initialize cart-store:', err);
  }

  // Миграция старой корзины (если есть) в новый формат
  // Старый ключ 'cart' может содержать полные объекты товаров, что приводит к переполнению localStorage
  const oldCart = localStorage.getItem('cart');
  if (oldCart) {
    try {
      const parsed = JSON.parse(oldCart);
      // Если это массив (старый формат), пытаемся мигрировать
      if (Array.isArray(parsed) && parsed.length > 0) {
        console.warn('[app] Found old cart format, migrating...');
        // Удаляем старую корзину, чтобы освободить место
        localStorage.removeItem('cart');
        // cart-store сам загрузит данные из нового ключа 'elkaretro_cart'
      }
    } catch (e) {
      console.error('[app] Error migrating old cart:', e);
      // Удаляем поврежденные данные
      localStorage.removeItem('cart');
    }
  }

  // Инициализация авторизации
  // Auth-service уже загружен статически, менеджер модальных окон будет инициализирован лениво при первом использовании
  try {
    
    // Регистрируем сервисы глобально для использования в формах
    window.app.services = window.app.services || {};
    window.app.services.authService = authService;
    
    // Обновляем состояние при изменении авторизации
    window.addEventListener('elkaretro:auth:login', (e) => {
      app.auth.user = e.detail.user;
      app.auth.authenticated = true;
    });

    window.addEventListener('elkaretro:auth:register', (e) => {
      app.auth.user = e.detail.user;
      app.auth.authenticated = true;
    });

    window.addEventListener('elkaretro:auth:logout', () => {
      app.auth.user = null;
      app.auth.authenticated = false;
      preloadAuthFormsIfNeeded();
    });

    window.addEventListener('elkaretro:auth:error', (e) => {
      console.error('[app.auth] Auth error:', e.detail.error);
    });

    // Доверяем данным из PHP - если они есть, используем их, если нет - значит не авторизован
    if (app.auth.user && app.auth.authenticated) {
      // Обновляем сервис данными из PHP
      authService.currentUser = app.auth.user;
    } else {
      // PHP вернул null или пользователь не авторизован - не делаем лишних запросов
      // Убедимся, что состояние корректное
      app.auth.user = null;
      app.auth.authenticated = false;
      authService.currentUser = null;
    }

    // Менеджер модальных окон инициализируется лениво при первом вызове showAuth() через site-header
    // Не загружаем его здесь, чтобы не создавать модальные окна на всех страницах
  } catch (err) {
    console.error('[app] Failed to initialize auth service:', err);
  }
  
  // User-service уже загружен статически
  try {
    window.app.services = window.app.services || {};
    window.app.services.userService = userService;
  } catch (err) {
    console.error('[app] Failed to initialize user service:', err);
  }

  // Аналитика Яндекс.Метрики уже загружена статически
  try {
    initAnalytics();
  } catch (err) {
    console.error('[app] Failed to initialize analytics:', err);
  }
  
  // Forms уже загружены статически - forms/index.js сам инициализирует window.app.forms при импорте
  // Формы должны быть уже в window.app.forms, так как мы сохранили их при создании window.app
  if (window.app.forms && Object.keys(window.app.forms).length > 0) {
    console.log('[app] Forms available:', Object.keys(window.app.forms));
  } else {
    console.warn('[app] No forms registered!');
  }
});

// Удалено: сохранение корзины теперь происходит через cart-store.js
// Старый код сохранял полные объекты товаров, что приводило к переполнению localStorage