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

export function toy_instance_card_template(state) {
  const { id, title, price, image, rarity, tubeCondition, available } = state;
  
  const safeTitle = title ? escapeHtml(title) : '';
  const safeImage = image ? escapeHtml(image) : '';
  const tubeIcon = getTubeIcon(tubeCondition);
  const tubeIconColor = getTubeIconColor(tubeCondition);
  const tubeConditionLabel = getTubeConditionLabel(tubeCondition);
  const rarityClass = getRarityColorClass(rarity);
  
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
    <article class="toy-instance-card ${rarityClass}" data-instance-id="${id || ''}">
      ${safeImage ? `
        <div class="toy-instance-card_image">
          <img src="${safeImage}" alt="${safeTitle}" loading="lazy" />
        </div>
      ` : ''}
      <div class="toy-instance-card_content">
        ${safeTitle ? `
          <h3 class="toy-instance-card_title">${safeTitle}</h3>
        ` : ''}
        <div class="toy-instance-card_meta">
          ${tubeIcon ? `
            <div class="toy-instance-card_tube-condition" data-hint="${escapeHtml(tubeConditionLabel)}" style="${tubeIconColor ? `color: ${escapeHtml(tubeIconColor)};` : ''}">
              <ui-icon name="${tubeIcon}" size="small"></ui-icon>
            </div>
          ` : ''}
          ${formattedPrice ? `
            <div class="toy-instance-card_price">${formattedPrice}</div>
          ` : ''}
        </div>
        <button class="toy-instance-card_buy-btn" type="button">
          Добавить в корзину
        </button>
      </div>
    </article>
  `;
}

