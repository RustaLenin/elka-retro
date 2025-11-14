/**
 * Правила комиссионной торговли
 *
 * Responsibilities:
 * - Расчет сбора на комплектацию
 * - Расчет оптовых скидок
 * - Проверка VIP статуса (в будущем)
 *
 * Примечание: Резервирование и VIP статус не реализованы в MVP
 */

/**
 * Расчет сбора на комплектацию
 * Сбор применяется при покупке на сумму менее 3500 руб.
 * Размер сбора: 350 руб.
 * Не применяется для VIP пользователей (в будущем)
 *
 * @param {number} amount - сумма после скидок
 * @param {boolean} isVip - VIP статус пользователя (default: false)
 * @returns {number} сумма сбора
 */
export function calculateAssemblyFee(amount, isVip = false) {
  // VIP пользователи освобождены от сбора (в будущем)
  if (isVip) {
    return 0;
  }

  // Сбор применяется при покупке на сумму менее 3500 руб.
  if (amount < 3500) {
    return 350;
  }

  return 0;
}

/**
 * Расчет оптовых скидок
 * Оптовая скидка 10% при покупке на сумму 5000 руб. и более
 * Условие: каждая игрушка должна стоить менее 2000 руб.
 * Не применяется к товарам в распродаже
 *
 * @param {Array} items - массив товаров в корзине
 * @param {number} items[].price - цена товара
 * @param {string} items[].type - тип товара
 * @returns {number} сумма скидки
 */
export function calculateWholesaleDiscount(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return 0;
  }

  // Фильтруем только игрушки (toy_instance)
  const toys = items.filter((item) => item.type === 'toy_instance');

  if (toys.length === 0) {
    return 0;
  }

  // Проверяем условие: каждая игрушка должна стоить менее 2000 руб.
  const allToysUnder2000 = toys.every((item) => item.price < 2000);

  if (!allToysUnder2000) {
    return 0;
  }

  // Подсчитываем сумму игрушек
  const toysTotal = toys.reduce((sum, item) => sum + item.price, 0);

  // Скидка применяется при покупке на сумму 5000 руб. и более
  if (toysTotal >= 5000) {
    // Скидка 10% от суммы игрушек
    return Math.round((toysTotal * 10) / 100);
  }

  return 0;
}

/**
 * Проверка VIP статуса пользователя
 * В MVP не реализовано, всегда возвращает false
 *
 * @param {number} userId - ID пользователя
 * @returns {Promise<boolean>} является ли пользователь VIP
 */
export async function checkVipStatus(userId) {
  // В MVP VIP статус не реализован
  // В будущем: проверка через user meta или отдельную таблицу
  return false;
}

/**
 * Применение VIP льгот
 * В MVP не реализовано
 *
 * @param {number} amount - сумма
 * @param {boolean} isVip - VIP статус
 * @returns {number} сумма после применения льгот
 */
export function applyVipBenefits(amount, isVip) {
  // В MVP VIP льготы не применяются
  return amount;
}

