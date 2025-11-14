/**
 * Утилита для форматирования цен
 *
 * Форматирует цены в единообразном виде с учетом валюты и разделителей тысяч.
 */

/**
 * Форматирует цену в строку
 * @param {number} amount - сумма
 * @param {string} currency - валюта (default: 'RUB')
 * @param {Object} options - опции форматирования
 * @param {number} options.decimalPlaces - количество знаков после запятой (default: 2)
 * @param {string} options.thousandsSeparator - разделитель тысяч (default: ' ')
 * @param {string} options.decimalSeparator - разделитель десятичных (default: ',')
 * @param {boolean} options.showCurrency - показывать ли валюту (default: true)
 * @returns {string} отформатированная цена
 */
export function formatPrice(amount, currency = 'RUB', options = {}) {
  const {
    decimalPlaces = 2,
    thousandsSeparator = ' ',
    decimalSeparator = ',',
    showCurrency = true,
  } = options;

  if (typeof amount !== 'number' || isNaN(amount)) {
    return '0';
  }

  // Форматируем число
  const fixed = amount.toFixed(decimalPlaces);
  const [integerPart, decimalPart] = fixed.split('.');

  // Добавляем разделители тысяч
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);

  // Формируем результат
  let result = formattedInteger;
  if (decimalPlaces > 0 && decimalPart) {
    result += decimalSeparator + decimalPart;
  }

  // Добавляем валюту
  if (showCurrency) {
    const currencySymbol = getCurrencySymbol(currency);
    result += ' ' + currencySymbol;
  }

  return result;
}

/**
 * Получить символ валюты
 * @param {string} currency - код валюты
 * @returns {string} символ валюты
 */
function getCurrencySymbol(currency) {
  const symbols = {
    RUB: '₽',
    USD: '$',
    EUR: '€',
  };

  return symbols[currency.toUpperCase()] || currency.toUpperCase();
}

/**
 * Форматирует диапазон цен
 * @param {number} min - минимальная цена
 * @param {number} max - максимальная цена
 * @param {string} currency - валюта (default: 'RUB')
 * @param {Object} options - опции форматирования
 * @returns {string} отформатированный диапазон
 */
export function formatPriceRange(min, max, currency = 'RUB', options = {}) {
  if (min === max) {
    return formatPrice(min, currency, options);
  }

  return `${formatPrice(min, currency, options)} — ${formatPrice(max, currency, options)}`;
}

/**
 * Форматирует сумму скидки
 * @param {number} amount - сумма скидки
 * @param {string} currency - валюта (default: 'RUB')
 * @param {Object} options - опции форматирования
 * @returns {string} отформатированная скидка
 */
export function formatDiscount(amount, currency = 'RUB', options = {}) {
  return `-${formatPrice(amount, currency, options)}`;
}

/**
 * Форматирует процент скидки
 * @param {number} percent - процент скидки
 * @returns {string} отформатированный процент
 */
export function formatDiscountPercent(percent) {
  if (typeof percent !== 'number' || isNaN(percent)) {
    return '0%';
  }

  return `-${Math.round(percent)}%`;
}

