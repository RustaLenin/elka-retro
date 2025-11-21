import { createModalManager } from './modal-manager.js';
import { createEventBus } from './events/index.js';

// Global App State and Utilities
window.app = {
  // Services registry
  services: {},
  // Toolkit utilities
  toolkit: {
    // Ensure a stylesheet is added to <head> only once
    loadCSSOnce(cssHref) {
      const href = String(cssHref);
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

  // Cart Management - Публичный API для работы с корзиной
  // Все операции с корзиной выполняются через этот API
  // Компоненты слушают события elkaretro:cart:updated для обновления
  cart: {
    items: [], // Для обратной совместимости, будет удалено позже
    
    /**
     * Добавить товар в корзину
     * @param {number} itemId - ID товара
     * @param {string} itemType - тип товара ('toy_instance' | 'ny_accessory')
     * @param {number} price - цена товара
     */
    add: function(itemId, itemType, price) {
      if (!window.app.cartStore) {
        console.warn('[app.cart] cartStore not initialized yet');
        return;
      }
      window.app.cartStore.addItem({ id: itemId, type: itemType, price });
    },
    
    /**
     * Удалить товар из корзины
     * @param {number} itemId - ID товара
     * @param {string} itemType - тип товара ('toy_instance' | 'ny_accessory')
     */
    remove: function(itemId, itemType) {
      if (!window.app.cartStore) {
        console.warn('[app.cart] cartStore not initialized yet');
        return;
      }
      window.app.cartStore.removeItem(itemId, itemType);
    },
    
    /**
     * Получить количество товаров в корзине
     * @returns {number}
     */
    getCount: function() {
      if (!window.app.cartStore) {
        return 0;
      }
      return window.app.cartStore.getCount();
    },
    
    /**
     * Получить все товары из корзины
     * @returns {Array}
     */
    getItems: function() {
      if (!window.app.cartStore) {
        return [];
      }
      return window.app.cartStore.getItems();
    },
    
    /**
     * Очистить корзину
     */
    clear: function() {
      if (!window.app.cartStore) {
        console.warn('[app.cart] cartStore not initialized yet');
        return;
      }
      window.app.cartStore.clearCart();
    },
    
    /**
     * Обновить счетчик (для обратной совместимости)
     * @deprecated Используйте события elkaretro:cart:updated
     */
    updateCount: function() {
      const event = new CustomEvent('cart-updated', { 
        detail: { count: this.getCount() } 
      });
      window.dispatchEvent(event);
    },
    
    /**
     * Показать уведомление (для обратной совместимости)
     * @deprecated Используйте window.app.ui.showNotification
     */
    showNotification: function(message) {
      if (window.app.ui && window.app.ui.showNotification) {
        window.app.ui.showNotification(message, 'info');
      } else {
        console.log('Notification:', message);
      }
    }
  },
  
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
      // Динамически импортируем функцию показа модалки
      return import('../components/ui-kit/modal/modal.js').then(module => {
        return module.showModal(options);
      }).catch(err => {
        console.error('[app.ui] Failed to load modal:', err);
      });
    },
    
    showNotification: function(message, type = 'info', duration = 5000) {
      // Динамически импортируем функцию показа уведомления
      return import('../components/ui-kit/notification/notification.js').then(module => {
        return module.notify(type, message, duration);
      }).catch(err => {
        console.error('[app.ui] Failed to load notification:', err);
        // Fallback: просто в консоль
        console.log(`[Notification] ${type}: ${message}`);
      });
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
window.dispatchEvent(new CustomEvent('app:events-ready'));

function handleAppActionClick(event) {
  if (!window.app?.events) return;
  window.app.events.dispatchFromDom(event);
}

document.addEventListener('click', handleAppActionClick);

let authFormsPreloadPromise = null;

function preloadAuthFormsIfNeeded() {
  if (window.app?.forms?.signIn) {
    return Promise.resolve();
  }
  if (!authFormsPreloadPromise) {
    authFormsPreloadPromise = import('./forms/index.js')
      .catch((error) => {
        authFormsPreloadPromise = null;
        console.error('[app] Failed to preload auth forms:', error);
      });
  }
  return authFormsPreloadPromise;
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

// Initialize cart store (async)
document.addEventListener('DOMContentLoaded', function() {
  // Загружаем catalog-store только там, где есть каталог
  if (document.querySelector('catalog-page')) {
    import('../components/catalog/catalog-store.js').then(module => {
      const { getCatalogStore } = module;
      const catalogStore = getCatalogStore();
      
      // Делаем catalogStore доступным глобально
      window.app.catalogStore = catalogStore;
    }).catch(err => {
      console.error('[app] Failed to load catalog-store:', err);
    });
  }

  // Инициализируем AccessoryCatalogStore только на страницах с accessory-catalog-page
  if (document.querySelector('accessory-catalog-page')) {
    import('../components/accessory-catalog/accessory-catalog-store.js').then(module => {
      const { getAccessoryCatalogStore } = module;
      const accessoryCatalogStore = getAccessoryCatalogStore();
      // Делаем accessoryCatalogStore доступным глобально
      window.app.accessoryCatalogStore = accessoryCatalogStore;
    }).catch(err => {
      console.error('[app] Failed to load accessory-catalog-store:', err);
    });
  }

  // Загружаем новый cart-store асинхронно
  import('../components/cart/cart-store.js').then(module => {
    const { getCartStore } = module;
    const cartStore = getCartStore();
    
    // Делаем cartStore доступным глобально
    window.app.cartStore = cartStore;
    
    // Обновляем счетчик корзины при изменениях
    cartStore.subscribe((nextState) => {
      const count = cartStore.getCount();
      app.cart.items = nextState.cart.items;
      app.cart.updateCount();
      
      // Отправляем событие для обновления счетчика в header
      const event = new CustomEvent('elkaretro:cart:updated', {
        detail: { count }
      });
      window.dispatchEvent(event);
    });
    
    // Инициализируем счетчик из текущего состояния
    const count = cartStore.getCount();
    app.cart.items = cartStore.getItems();
    app.cart.updateCount();
    
    // Отправляем событие для инициализации счетчика в header
    const event = new CustomEvent('elkaretro:cart:updated', {
      detail: { count }
    });
    window.dispatchEvent(event);
  }).catch(err => {
    console.error('[app] Failed to load cart-store:', err);
  });

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
  // Загружаем только auth-service, менеджер модальных окон будет инициализирован лениво при первом использовании
  import('../components/user-profile/services/auth-service.js').then((authModule) => {
    const { authService } = authModule;
    
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
  }).catch(err => {
    console.error('[app] Failed to load auth service:', err);
  });
  
  // Загружаем user-service для использования в формах профиля
  import('../components/user-profile/services/user-service.js').then((userModule) => {
    const { userService } = userModule;
    window.app.services = window.app.services || {};
    window.app.services.userService = userService;
  }).catch(err => {
    console.error('[app] Failed to load user service:', err);
  });
});

// Удалено: сохранение корзины теперь происходит через cart-store.js
// Старый код сохранял полные объекты товаров, что приводило к переполнению localStorage