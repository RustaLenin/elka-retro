/**
 * Cart Store - единый источник истины для состояния корзины.
 *
 * Responsibilities:
 * - Централизованное управление состоянием корзины
 * - Хранение в LocalStorage для неавторизованных пользователей
 * - Синхронизация с User Meta для авторизованных пользователей
 * - Объединенная корзина для toy_instance и ny_accessory
 * - Подписки для компонентов (cart-page, cart-item, cart-summary)
 * - Валидация и нормализация состояния
 *
 * Architecture:
 * - Store является singleton (один экземпляр на страницу)
 * - Состояние иммутабельно (все обновления создают новый объект)
 * - Подписки через паттерн Observer
 * - Автоматическая синхронизация с LocalStorage
 * - Синхронизация с сервером для авторизованных пользователей
 */

/**
 * @typedef {Object} CartItem
 * @property {number} id - ID товара
 * @property {string} type - 'toy_instance' | 'ny_accessory'
 * @property {number} price - цена товара
 * @property {string} addedAt - дата добавления (ISO string)
 */

/**
 * @typedef {Object} CartState
 * @property {CartItem[]} items - массив товаров в корзине
 * @property {string} lastUpdated - дата последнего обновления (ISO string)
 */

/**
 * @typedef {Object} CartStoreState
 * @property {CartState} cart - состояние корзины
 * @property {boolean} isAuthorized - флаг авторизации пользователя
 * @property {number|null} userId - ID пользователя (null для неавторизованных)
 * @property {boolean} isLoading - флаг загрузки
 * @property {Error|null} error - ошибка загрузки
 */

const STORAGE_KEY = 'elkaretro_cart';
const SYNC_ENDPOINT = '/wp-json/elkaretro/v1/cart/sync';

class CartStore {
  constructor() {
    /** @type {CartStoreState} */
    this._state = {
      cart: this._getDefaultCart(),
      isAuthorized: false,
      userId: null,
      isLoading: false,
      error: null,
    };

    /** @type {Set<Function>} */
    this._subscribers = new Set();

    // Инициализация: загрузка из LocalStorage и проверка авторизации
    this._init();
  }

  /**
   * Инициализация стора
   * @private
   */
  async _init() {
    // Загружаем корзину из LocalStorage
    this._loadFromLocalStorage();

    // Проверяем авторизацию пользователя
    await this._checkAuth();

    // Если пользователь авторизован, синхронизируем с сервером
    if (this._state.isAuthorized) {
      await this._syncWithServer();
    }

    // Уведомляем подписчиков о начальном состоянии
    this._notifySubscribers(this._state, this._state);
  }

  /**
   * Проверка авторизации пользователя
   * @private
   */
  async _checkAuth() {
    // Используем данные из window.app.auth (из PHP) - они всегда доступны при загрузке страницы
    if (window.app?.auth?.user && window.app.auth.authenticated) {
      this._state.isAuthorized = true;
      this._state.userId = window.app.auth.user.id;
      return;
    }

    // PHP вернул null - пользователь не авторизован, не делаем запросов
    this._state.isAuthorized = false;
    this._state.userId = null;
  }

  /**
   * Синхронизация корзины с сервером (для авторизованных)
   * @private
   */
  async _syncWithServer() {
    if (!this._state.isAuthorized || !this._state.userId) {
      return;
    }

    this._updateState({ isLoading: true, error: null });

    try {
      const response = await fetch(SYNC_ENDPOINT, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': window.wpApiSettings?.nonce || '',
        },
        body: JSON.stringify({
          cart: this._state.cart,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Если на сервере есть корзина, используем её (приоритет User Meta)
        if (data.cart && Array.isArray(data.cart.items) && data.cart.items.length > 0) {
          const serverCart = this._normalizeCart(data.cart);
          // Сравниваем с локальной корзиной - если локальная новее или имеет больше элементов, используем её
          const localItemsCount = this._state.cart.items.length;
          const serverItemsCount = serverCart.items.length;
          
          // Если локальная корзина имеет больше элементов, используем её и сохраняем на сервер
          if (localItemsCount > serverItemsCount) {
            await this._saveToServer();
            this._updateState({ isLoading: false });
          } else {
            // Используем серверную корзину (приоритет User Meta)
            this._updateState({
              cart: serverCart,
              isLoading: false,
            });
            this._saveToLocalStorage();
          }
        } else {
          // Если на сервере корзины нет, сохраняем локальную
          if (this._state.cart.items.length > 0) {
            await this._saveToServer();
          }
          this._updateState({ isLoading: false });
        }
      } else {
        // Если синхронизация не удалась, продолжаем работать с LocalStorage
        this._updateState({ isLoading: false });
      }
    } catch (error) {
      console.error('[cart-store] Sync error:', error);
      this._updateState({ isLoading: false, error });
    }
  }

  /**
   * Сохранение корзины на сервер (для авторизованных)
   * @private
   */
  async _saveToServer() {
    if (!this._state.isAuthorized || !this._state.userId) {
      return;
    }

    try {
      await fetch(SYNC_ENDPOINT, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': window.wpApiSettings?.nonce || '',
        },
        body: JSON.stringify({
          cart: this._state.cart,
        }),
      });
    } catch (error) {
      console.error('[cart-store] Save to server error:', error);
    }
  }

  /**
   * Получить корзину по умолчанию
   * @returns {CartState}
   * @private
   */
  _getDefaultCart() {
    return {
      items: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Нормализация корзины (валидация, дефолты)
   * @param {Partial<CartState>} cart
   * @returns {CartState}
   * @private
   */
  _normalizeCart(cart = {}) {
    const defaultCart = this._getDefaultCart();
    const items = Array.isArray(cart.items) ? cart.items : defaultCart.items;

    // Валидация и нормализация товаров
    const normalizedItems = items
      .filter((item) => {
        // Проверяем обязательные поля
        return (
          item &&
          typeof item.id === 'number' &&
          typeof item.type === 'string' &&
          (item.type === 'toy_instance' || item.type === 'ny_accessory') &&
          typeof item.price === 'number' &&
          item.price > 0
        );
      })
      .map((item) => ({
        id: Number(item.id),
        type: item.type,
        price: Number(item.price),
        addedAt: item.addedAt || new Date().toISOString(),
      }));

    // Удаляем дубликаты (по id + type)
    const uniqueItems = [];
    const seen = new Set();
    normalizedItems.forEach((item) => {
      const key = `${item.type}-${item.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueItems.push(item);
      }
    });

    return {
      items: uniqueItems,
      lastUpdated: cart.lastUpdated || new Date().toISOString(),
    };
  }

  /**
   * Загрузка корзины из LocalStorage
   * @private
   */
  _loadFromLocalStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this._state.cart = this._normalizeCart(parsed);
      }
    } catch (error) {
      console.error('[cart-store] Failed to load from localStorage:', error);
      // Очищаем поврежденные данные
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {
        // Игнорируем ошибки при удалении
      }
      this._state.cart = this._getDefaultCart();
    }
  }

  /**
   * Сохранение корзины в LocalStorage
   * @private
   */
  _saveToLocalStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._state.cart));
    } catch (error) {
      console.error('[cart-store] Failed to save to localStorage:', error);
    }
  }

  /**
   * Обновление состояния с уведомлением подписчиков
   * @param {Partial<CartStoreState>} updates
   * @private
   */
  _updateState(updates) {
    const prevState = { ...this._state };
    this._state = {
      ...this._state,
      ...updates,
      cart: updates.cart ? { ...updates.cart } : this._state.cart,
    };

    // Сохранение в LocalStorage при изменении корзины
    if (updates.cart) {
      this._saveToLocalStorage();
    }

    // Сохранение на сервер для авторизованных (асинхронно, без блокировки)
    if (updates.cart && this._state.isAuthorized) {
      this._saveToServer().catch((error) => {
        console.error('[cart-store] Background save error:', error);
      });
    }

    // Уведомление подписчиков
    this._notifySubscribers(prevState, this._state);
  }

  /**
   * Уведомление подписчиков об изменении
   * @param {CartStoreState} prevState
   * @param {CartStoreState} nextState
   * @private
   */
  _notifySubscribers(prevState, nextState) {
    this._subscribers.forEach((callback) => {
      try {
        callback(nextState, prevState);
      } catch (error) {
        console.error('[cart-store] Subscriber error:', error);
      }
    });
  }

  // ==================== Public API ====================

  /**
   * Получить текущее состояние
   * @returns {CartStoreState}
   */
  getState() {
    return {
      ...this._state,
      cart: { ...this._state.cart },
    };
  }

  /**
   * Получить корзину
   * @returns {CartState}
   */
  getCart() {
    return { ...this._state.cart };
  }

  /**
   * Получить товары корзины
   * @returns {CartItem[]}
   */
  getItems() {
    return [...this._state.cart.items];
  }

  /**
   * Получить количество товаров в корзине
   * @returns {number}
   */
  getCount() {
    return this._state.cart.items.length;
  }

  /**
   * Добавить товар в корзину
   * @param {Object} itemData
   * @param {number} itemData.id - ID товара
   * @param {string} itemData.type - 'toy_instance' | 'ny_accessory'
   * @param {number} itemData.price - цена товара
   */
  addItem(itemData) {
    const { id, type, price } = itemData;

    // Валидация
    if (!id || !type || !price || price <= 0) {
      throw new Error('[cart-store] Invalid item data');
    }

    if (type !== 'toy_instance' && type !== 'ny_accessory') {
      throw new Error('[cart-store] Invalid item type');
    }

    // Проверяем, нет ли уже такого товара (уникальные товары)
    const key = `${type}-${id}`;
    const exists = this._state.cart.items.some((item) => `${item.type}-${item.id}` === key);

    if (exists) {
      // Товар уже в корзине, не добавляем повторно
      return;
    }

    // Добавляем товар
    const newItem = {
      id: Number(id),
      type,
      price: Number(price),
      addedAt: new Date().toISOString(),
    };

    const updatedCart = {
      items: [...this._state.cart.items, newItem],
      lastUpdated: new Date().toISOString(),
    };

    this._updateState({ cart: updatedCart });

    // Dispatch события
    window.dispatchEvent(
      new CustomEvent('elkaretro:cart:item-added', {
        detail: { item: newItem, cart: this.getCart() },
      })
    );

    window.dispatchEvent(
      new CustomEvent('elkaretro:cart:updated', {
        detail: { cart: this.getCart(), count: this.getCount() },
      })
    );
  }

  /**
   * Удалить товар из корзины
   * @param {number} itemId - ID товара
   * @param {string} itemType - тип товара ('toy_instance' | 'ny_accessory')
   */
  removeItem(itemId, itemType) {
    const key = `${itemType}-${itemId}`;
    const updatedItems = this._state.cart.items.filter(
      (item) => `${item.type}-${item.id}` !== key
    );

    if (updatedItems.length === this._state.cart.items.length) {
      // Товар не найден
      return;
    }

    const updatedCart = {
      items: updatedItems,
      lastUpdated: new Date().toISOString(),
    };

    this._updateState({ cart: updatedCart });

    // Dispatch события
    window.dispatchEvent(
      new CustomEvent('elkaretro:cart:item-removed', {
        detail: { itemId, itemType, cart: this.getCart() },
      })
    );

    window.dispatchEvent(
      new CustomEvent('elkaretro:cart:updated', {
        detail: { cart: this.getCart(), count: this.getCount() },
      })
    );
  }

  /**
   * Очистить корзину
   */
  clearCart() {
    const updatedCart = this._getDefaultCart();
    this._updateState({ cart: updatedCart });

    // Dispatch события
    window.dispatchEvent(
      new CustomEvent('elkaretro:cart:updated', {
        detail: { cart: this.getCart(), count: 0 },
      })
    );
  }

  /**
   * Синхронизация корзины при авторизации
   * Приоритет: User Meta > LocalStorage
   */
  async syncOnAuth() {
    await this._checkAuth();

    if (!this._state.isAuthorized) {
      return;
    }

    // Загружаем корзину с сервера
    try {
      const response = await fetch('/wp-json/elkaretro/v1/cart', {
        credentials: 'same-origin',
        headers: {
          'X-WP-Nonce': window.wpApiSettings?.nonce || '',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const serverCart = this._normalizeCart(data.cart || {});
        const localCart = this._state.cart;

        // Логика синхронизации:
        // 1. Если LocalStorage пуст, а User Meta есть - обновляем LocalStorage
        // 2. Если User Meta пуст, а LocalStorage есть - обновляем User Meta
        // 3. Если и там есть - приоритет User Meta

        if (serverCart.items.length > 0 && localCart.items.length === 0) {
          // Случай 1: LocalStorage пуст, User Meta есть
          this._updateState({ cart: serverCart });
          this._saveToLocalStorage();
        } else if (serverCart.items.length === 0 && localCart.items.length > 0) {
          // Случай 2: User Meta пуст, LocalStorage есть
          await this._saveToServer();
        } else if (serverCart.items.length > 0 && localCart.items.length > 0) {
          // Случай 3: Оба не пусты - приоритет User Meta
          this._updateState({ cart: serverCart });
          this._saveToLocalStorage();
        }
      }
    } catch (error) {
      console.error('[cart-store] Sync on auth error:', error);
    }

    // Dispatch события
    window.dispatchEvent(
      new CustomEvent('elkaretro:cart:synced', {
        detail: { cart: this.getCart() },
      })
    );
  }

  /**
   * Подписаться на изменения состояния
   * @param {Function} callback - (nextState, prevState) => void
   * @returns {Function} функция отписки
   */
  subscribe(callback) {
    if (typeof callback !== 'function') {
      throw new Error('[cart-store] Subscriber must be a function');
    }

    this._subscribers.add(callback);

    // Немедленно вызываем callback с текущим состоянием
    try {
      callback(this.getState(), this.getState());
    } catch (error) {
      console.error('[cart-store] Initial subscriber callback error:', error);
    }

    // Возвращаем функцию отписки
    return () => {
      this._subscribers.delete(callback);
    };
  }

  /**
   * Уничтожить стор (очистка подписок)
   */
  destroy() {
    this._subscribers.clear();
  }
}

// Singleton instance
let storeInstance = null;

/**
 * Получить экземпляр стора (singleton)
 * @returns {CartStore}
 */
export const getCartStore = () => {
  if (!storeInstance) {
    storeInstance = new CartStore();
  }
  return storeInstance;
};

/**
 * Сбросить экземпляр стора (для тестов)
 * @private
 */
export const _resetStore = () => {
  if (storeInstance) {
    storeInstance.destroy();
    storeInstance = null;
  }
};

export default CartStore;

