/**
 * Cart Service - бизнес-логика работы с корзиной
 *
 * Responsibilities:
 * - Расчет итоговой стоимости
 * - Валидация товаров
 * - Работа с правилами комиссионной торговли
 * - Синхронизация с сервером
 */

import { calculateAssemblyFee, calculateWholesaleDiscount } from './commission-rules.js';

/**
 * Получить store корзины
 * @returns {Object} store корзины
 */
function getStore() {
  if (!window.app?.cart) {
    throw new Error('[cart-service] cart not initialized. Make sure app.js loaded cart-store.');
  }
  return window.app.cart;
}

/**
 * Получить корзину
 * @returns {Object} состояние корзины
 */
export function getCart() {
  return getStore().getCart();
}

/**
 * Получить товары корзины
 * @returns {Array} массив товаров
 */
export function getItems() {
  return getStore().getItems();
}

/**
 * Получить количество товаров в корзине
 * @returns {number}
 */
export function getCount() {
  return getStore().getCount();
}

/**
 * Добавить товар в корзину
 * @param {Object} itemData - данные товара
 * @param {number} itemData.id - ID товара
 * @param {string} itemData.type - тип товара
 * @param {number} itemData.price - цена товара
 */
export function addItem(itemData) {
  getStore().addItem(itemData);
}

/**
 * Удалить товар из корзины
 * @param {number} itemId - ID товара
 * @param {string} itemType - тип товара
 */
export function removeItem(itemId, itemType) {
  getStore().removeItem(itemId, itemType);
}

/**
 * Очистить корзину
 */
export function clearCart() {
  getStore().clearCart();
}

/**
 * Расчет итоговой стоимости корзины
 * @param {Object} options - опции расчета
 * @param {boolean} options.includeFee - включать сбор на комплектацию (default: true)
 * @param {boolean} options.includeDiscount - включать скидки (default: true)
 * @returns {Object} расчет стоимости
 */
export function calculateTotal(options = {}) {
  const { includeFee = true, includeDiscount = true } = options;
  const cart = getCart();
  const items = cart.items;

  // Подсчет суммы товаров
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);

  // Расчет скидок
  let discountAmount = 0;
  if (includeDiscount) {
    discountAmount = calculateWholesaleDiscount(items);
  }

  // Сумма после скидок
  const afterDiscount = subtotal - discountAmount;

  // Расчет сбора на комплектацию
  let feeAmount = 0;
  if (includeFee) {
    feeAmount = calculateAssemblyFee(afterDiscount);
  }

  // Итоговая сумма
  const total = afterDiscount + feeAmount;

  return {
    subtotal,
    discountAmount,
    afterDiscount,
    feeAmount,
    total,
    itemsCount: items.length,
  };
}

/**
 * Валидация товара перед добавлением в корзину
 * @param {Object} itemData - данные товара
 * @returns {Object} результат валидации { valid: boolean, error?: string }
 */
export function validateItem(itemData) {
  const { id, type, price } = itemData;

  if (!id || typeof id !== 'number') {
    return { valid: false, error: 'Invalid item ID' };
  }

  if (!type || (type !== 'toy_instance' && type !== 'ny_accessory')) {
    return { valid: false, error: 'Invalid item type' };
  }

  if (!price || typeof price !== 'number' || price <= 0) {
    return { valid: false, error: 'Invalid item price' };
  }

  return { valid: true };
}

/**
 * Проверка доступности товара
 * @param {number} itemId - ID товара
 * @param {string} itemType - тип товара
 * @returns {Promise<boolean>} доступен ли товар
 */
export async function checkItemAvailability(itemId, itemType) {
  try {
    const endpoint =
      itemType === 'toy_instance'
        ? `/wp-json/wp/v2/toy_instance/${itemId}`
        : `/wp-json/wp/v2/ny_accessory/${itemId}`;

    const response = await fetch(endpoint, {
      credentials: 'same-origin',
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.status === 'publish';
  } catch (error) {
    console.error('[cart-service] Check availability error:', error);
    return false;
  }
}

/**
 * Синхронизация корзины с сервером
 * @returns {Promise<void>}
 */
export async function syncWithServer() {
  await getStore().syncOnAuth();
}

