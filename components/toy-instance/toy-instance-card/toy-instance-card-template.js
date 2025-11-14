/**
 * Toy Instance Card Template
 * Шаблон для карточки экземпляра игрушки
 */

// Экранируем HTML для безопасности
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Получить иконку для состояния трубочки
function getTubeIcon(tubeCondition) {
  // В зависимости от состояния трубочки возвращаем название иконки
  // Состояния: 100, more_75, 50-75, 25-50, less_25
  if (!tubeCondition) return '';
  
  const slug = tubeCondition.toLowerCase().trim();
  
  // Проверяем точные совпадения и специфичные паттерны (в порядке специфичности)
  if (slug === '100' || slug === '100%') {
    return 'check'; // Полная сохранность - галочка
  } else if (slug === 'more_75' || slug.includes('more_75') || slug.includes('more_than_75')) {
    return 'check'; // Хорошая сохранность (>75%) - галочка
  } else if (slug === 'less_25' || slug === 'less_than_25' || slug === '<25' || slug === '< 25') {
    return 'x_circle'; // Очень плохая сохранность (<25%) - крестик
  } else if (slug === '25-50' || slug === '25-50%' || slug.includes('25-50')) {
    return 'alert_triangle'; // Плохая сохранность (25-50%) - треугольник
  } else if (slug === '50-75' || slug === '50-75%' || slug.includes('50-75')) {
    return 'alert_circle'; // Средняя сохранность (50-75%) - предупреждение
  } else if (slug.includes('75') && !slug.includes('25') && !slug.includes('50')) {
    // Проверяем "75" только если нет "25" или "50" в строке
    return 'check';
  } else if (slug.includes('50') && !slug.includes('25') && !slug.includes('75')) {
    // Проверяем "50" только если нет "25" или "75"
    return 'alert_circle';
  } else if (slug.includes('25') && !slug.includes('50') && !slug.includes('75')) {
    // Проверяем "25" только если нет "50" или "75"
    return 'alert_triangle';
  }
  
  return 'star'; // По умолчанию
}

// Получить цвет для иконки состояния трубочки
function getTubeIconColor(tubeCondition) {
  // Градиент цветов от зелёного (хорошо) к красному (плохо)
  if (!tubeCondition) return '';
  
  const slug = tubeCondition.toLowerCase().trim();
  
  // Проверяем точные совпадения и специфичные паттерны (в порядке специфичности)
  if (slug === '100' || slug === '100%') {
    return '#22c55e'; // Зелёный - отлично (100%)
  } else if (slug === 'more_75' || slug.includes('more_75') || slug.includes('more_than_75')) {
    return '#84cc16'; // Лайм-зелёный - хорошо (>75%)
  } else if (slug === 'less_25' || slug === 'less_than_25' || slug === '<25' || slug === '< 25') {
    return '#ef4444'; // Красный - очень плохо (<25%)
  } else if (slug === '25-50' || slug === '25-50%' || slug.includes('25-50')) {
    return '#f59e0b'; // Оранжевый - плохо (25-50%)
  } else if (slug === '50-75' || slug === '50-75%' || slug.includes('50-75')) {
    return '#eab308'; // Желтый - среднее (50-75%)
  } else if (slug.includes('75') && !slug.includes('25') && !slug.includes('50')) {
    return '#84cc16'; // Лайм-зелёный
  } else if (slug.includes('50') && !slug.includes('25') && !slug.includes('75')) {
    return '#eab308'; // Желтый
  } else if (slug.includes('25') && !slug.includes('50') && !slug.includes('75')) {
    return '#f59e0b'; // Оранжевый
  }
  
  return '#8a8f99'; // Серый по умолчанию
}

// Получить человекочитаемое название состояния трубочки для tooltip
function getTubeConditionLabel(tubeCondition) {
  if (!tubeCondition) return '';
  
  const slug = tubeCondition.toLowerCase().trim();
  const labels = {
    '100': '100% сохранность',
    'more_75': 'Более 75%',
    '50-75': '50-75%',
    '25-50': '25-50%',
    'less_25': 'Менее 25%'
  };
  
  // Пробуем найти точное совпадение
  if (labels[slug]) {
    return labels[slug];
  }
  
  // Проверяем специфичные паттерны
  if (slug === '100%' || slug === '100') {
    return labels['100'];
  } else if (slug.includes('more_75') || slug.includes('more_than_75')) {
    return labels['more_75'];
  } else if (slug.includes('25-50') || (slug.includes('25') && slug.includes('50') && !slug.includes('75'))) {
    return labels['25-50'];
  } else if (slug.includes('50-75') || (slug.includes('50') && slug.includes('75'))) {
    return labels['50-75'];
  } else if (slug.includes('less_25') || slug.includes('less_than_25') || slug === '<25' || slug === '< 25') {
    return labels['less_25'];
  }
  
  // Ищем частичное совпадение (менее точное)
  for (const [key, label] of Object.entries(labels)) {
    if (slug.includes(key)) {
      return label;
    }
  }
  
  return tubeCondition; // Fallback - возвращаем как есть
}

// Получить класс цвета для редкости
function getRarityColorClass(rarity) {
  if (!rarity) return '';
  
  const slug = rarity.toLowerCase();
  if (slug === 'rare' || slug.includes('rare')) {
    return 'rarity-rare'; // Раритет - красный
  } else if (slug === 'rarely' || slug.includes('rarely')) {
    return 'rarity-rarely'; // Редко - оранжевый
  } else if (slug === 'not-often' || slug.includes('not-often')) {
    return 'rarity-not-often'; // Не часто - желтый
  } else if (slug === 'often' || slug.includes('often')) {
    return 'rarity-often'; // Часто - зеленый
  }
  return '';
}

// Получить класс цвета для состояния (condition)
// Значения: Люкс, Хорошее, Так себе, Плохое
function getConditionColorClass(condition) {
  if (!condition) return '';
  
  const slug = condition.toLowerCase().trim();
  const name = condition.toLowerCase().trim();
  
  // Проверяем по slug и name
  if (slug === 'lux' || slug === 'люкс' || name === 'люкс' || name.includes('люкс')) {
    return 'condition-lux'; // Люкс - зеленый
  } else if (slug === 'good' || slug === 'хорошее' || name === 'хорошее' || name.includes('хорош')) {
    return 'condition-good'; // Хорошее - светло-зеленый/желто-зеленый
  } else if (slug === 'so-so' || slug === 'так себе' || name === 'так себе' || name.includes('так себе') || name.includes('средн')) {
    return 'condition-so-so'; // Так себе - желтый/оранжевый
  } else if (slug === 'bad' || slug === 'плохое' || name === 'плохое' || name.includes('плох')) {
    return 'condition-bad'; // Плохое - красный
  }
  
  return '';
}

export function toy_instance_card_template(state) {
  const { id, title, price, image, rarity, tubeCondition, condition, status } = state;
  
  const safeTitle = title ? escapeHtml(title) : '';
  const safeImage = image ? escapeHtml(image) : '';
  const safeCondition = condition ? escapeHtml(condition) : '';
  const conditionClass = getConditionColorClass(condition);
  const rarityClass = getRarityColorClass(rarity);
  
  // Проверяем, доступен ли экземпляр для покупки
  const isAvailable = status === 'publish';
  
  // Проверяем, находится ли товар в корзине (передается из компонента)
  const inCart = state.inCart || false;
  
  // Форматируем цену
  let formattedPrice = '';
  if (price !== null && price !== undefined) {
    formattedPrice = new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  }
  
  return `
    ${safeImage ? `
      <div class="toy-instance-card_image">
        <img src="${safeImage}" alt="${safeTitle}" loading="lazy" />
      </div>
    ` : ''}
    <div class="toy-instance-card_content">
      ${safeTitle ? `
        <h3 class="toy-instance-card_title">${safeTitle}</h3>
      ` : ''}
      <div class="toy-instance-card_condition">
        <span class="toy-instance-card_condition-label">Состояние:</span>
        <span class="toy-instance-card_condition-value ${conditionClass}">${safeCondition || '—'}</span>
      </div>
      <div class="toy-instance-card_price-row">
        ${formattedPrice ? `
          <div class="toy-instance-card_price ${!isAvailable ? 'toy-instance-card_price--blocked' : ''}">${formattedPrice}</div>
        ` : ''}
        ${isAvailable ? `
          <ui-button 
            type="ghost" 
            icon="${inCart ? 'trash' : 'cart'}" 
            event="toy-instance-card:cart-click"
            class="toy-instance-card_cart-btn"
            aria-label="${inCart ? 'Убрать из корзины' : 'Добавить в корзину'}"
          ></ui-button>
        ` : ''}
      </div>
      <ui-button 
        type="primary" 
        label="Больше подробностей"
        event="toy-instance-card:details-click"
        class="toy-instance-card_details-btn"
      ></ui-button>
    </div>
  `;
}

