/**
 * Delivery Step Template
 * Шаблон для шага выбора способа доставки
 */

export function delivery_step_template(state) {
  const {
    deliveryCategory,
    deliveryMethod,
    deliveryData,
    validationErrors,
    availableMethods,
    methodFields,
    DELIVERY_CATEGORIES,
    DELIVERY_METHODS,
  } = state;

  // Названия категорий доставки
  const categoryLabels = {
    [DELIVERY_CATEGORIES.PICKUP]: 'Самовывоз',
    [DELIVERY_CATEGORIES.COURIER]: 'Курьерская доставка',
    [DELIVERY_CATEGORIES.POST]: 'Почта России',
  };

  // Описания категорий доставки
  const categoryDescriptions = {
    [DELIVERY_CATEGORIES.PICKUP]: 'Заберите заказ самостоятельно из пункта выдачи или магазина',
    [DELIVERY_CATEGORIES.COURIER]: 'Доставка курьером до двери по указанному адресу',
    [DELIVERY_CATEGORIES.POST]: 'Доставка через Почту России до отделения связи',
  };

  // Названия способов доставки
  const methodLabels = {
    [DELIVERY_METHODS.PICKUP_UDELNAYA]: 'Самовывоз с Удельного рынка в Санкт-Петербурге',
    [DELIVERY_METHODS.PICKUP_OZON]: 'Пункт выдачи ОЗОН',
    [DELIVERY_METHODS.PICKUP_CDEK]: 'Пункт выдачи СДЭК',
    [DELIVERY_METHODS.COURIER_CDEK]: 'Курьер СДЭК',
    [DELIVERY_METHODS.POST_RUSSIA]: 'Почта России',
  };

  // Стоимость доставки
  const methodCosts = {
    [DELIVERY_METHODS.PICKUP_UDELNAYA]: 'Бесплатно, имеет бонусы и льготы (смотри ниже)',
    [DELIVERY_METHODS.PICKUP_OZON]: '~150 ₽',
    [DELIVERY_METHODS.PICKUP_CDEK]: '~350 ₽',
    [DELIVERY_METHODS.COURIER_CDEK]: 'От 400 ₽',
    [DELIVERY_METHODS.POST_RUSSIA]: 'От 300 ₽',
  };

  return `
    <div class="delivery-step">
      <div class="delivery-step_content">
        <div class="delivery-step_section">
          <h3 class="delivery-step_section-title">Выберите категорию доставки</h3>
          <div class="delivery-step_category-group">
            ${Object.values(DELIVERY_CATEGORIES).map(category => `
              <label class="delivery-step_radio">
                <input
                  type="radio"
                  name="delivery_category"
                  value="${category}"
                  class="delivery-step_category-select"
                  ${deliveryCategory === category ? 'checked' : ''}
                />
                <div class="delivery-step_radio-content">
                  <span class="delivery-step_radio-label">${categoryLabels[category]}</span>
                  <span class="delivery-step_radio-description">${categoryDescriptions[category]}</span>
                </div>
              </label>
            `).join('')}
          </div>
        </div>

        ${deliveryCategory ? `
          <div class="delivery-step_section">
            <h3 class="delivery-step_section-title">
              ${deliveryCategory === DELIVERY_CATEGORIES.PICKUP ? 'Выберите способ самовывоза' : ''}
              ${deliveryCategory === DELIVERY_CATEGORIES.COURIER ? 'Выберите службу доставки' : ''}
              ${deliveryCategory === DELIVERY_CATEGORIES.POST ? 'Заполните адрес для Почты России' : ''}
            </h3>
            
            ${deliveryCategory === DELIVERY_CATEGORIES.COURIER ? `
              <!-- Для курьерской доставки сразу показываем выбор -->
              <div class="delivery-step_method-group">
                <label class="delivery-step_radio">
                  <input
                    type="radio"
                    name="delivery_method"
                    value="${DELIVERY_METHODS.COURIER_CDEK}"
                    class="delivery-step_method-select"
                    ${deliveryMethod === DELIVERY_METHODS.COURIER_CDEK ? 'checked' : ''}
                  />
                  <span class="delivery-step_radio-label">
                    ${methodLabels[DELIVERY_METHODS.COURIER_CDEK]}
                    <span class="delivery-step_method-cost">${methodCosts[DELIVERY_METHODS.COURIER_CDEK]}</span>
                  </span>
                </label>
              </div>
            ` : deliveryCategory === DELIVERY_CATEGORIES.POST ? `
              <!-- Для Почты России сразу показываем выбор -->
              <div class="delivery-step_method-group">
                <label class="delivery-step_radio">
                  <input
                    type="radio"
                    name="delivery_method"
                    value="${DELIVERY_METHODS.POST_RUSSIA}"
                    class="delivery-step_method-select"
                    ${deliveryMethod === DELIVERY_METHODS.POST_RUSSIA ? 'checked' : ''}
                  />
                  <span class="delivery-step_radio-label">
                    ${methodLabels[DELIVERY_METHODS.POST_RUSSIA]}
                    <span class="delivery-step_method-cost">${methodCosts[DELIVERY_METHODS.POST_RUSSIA]}</span>
                  </span>
                </label>
              </div>
            ` : `
              <!-- Для самовывоза показываем все доступные способы -->
              <div class="delivery-step_method-group">
                ${availableMethods.map(method => `
                  <label class="delivery-step_radio">
                    <input
                      type="radio"
                      name="delivery_method"
                      value="${method}"
                      class="delivery-step_method-select"
                      ${deliveryMethod === method ? 'checked' : ''}
                    />
                    <span class="delivery-step_radio-label">
                      ${methodLabels[method]}
                      <span class="delivery-step_method-cost">${methodCosts[method]}</span>
                    </span>
                  </label>
                `).join('')}
              </div>
            `}
          </div>
        ` : ''}

        ${methodFields && deliveryMethod ? `
          <div class="delivery-step_section">
            <h3 class="delivery-step_section-title">Заполните данные для доставки</h3>
            <div class="delivery-step_fields">
              ${Object.keys(methodFields).map(fieldName => {
                const fieldConfig = methodFields[fieldName];
                const fieldValue = deliveryData[fieldName] || '';
                const fieldError = validationErrors[fieldName];
                const isError = !!fieldError;

                return `
                  <div class="delivery-step_field ${isError ? 'delivery-step_field--error' : ''}">
                    <label class="delivery-step_field-label">
                      ${fieldConfig.label}
                      ${fieldConfig.required ? '<span class="delivery-step_field-required">*</span>' : ''}
                    </label>
                    ${fieldConfig.type === 'textarea' ? `
                      <textarea
                        name="${fieldName}"
                        class="delivery-step_field-input delivery-step_field-textarea"
                        placeholder="${fieldConfig.placeholder || ''}"
                        ${fieldConfig.required ? 'required' : ''}
                      >${fieldValue}</textarea>
                    ` : `
                      <input
                        type="${fieldConfig.type}"
                        name="${fieldName}"
                        class="delivery-step_field-input"
                        value="${fieldValue}"
                        placeholder="${fieldConfig.placeholder || ''}"
                        ${fieldConfig.required ? 'required' : ''}
                      />
                    `}
                    ${fieldConfig.description ? `
                      <div class="delivery-step_field-description">${fieldConfig.description}</div>
                    ` : ''}
                    ${isError ? `
                      <div class="delivery-step_field-error">${fieldError}</div>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}

        ${deliveryMethod === DELIVERY_METHODS.PICKUP_UDELNAYA ? `
          <div class="delivery-step_info">
            <h4 class="delivery-step_info-title">Информация о самовывозе</h4>
            <ul class="delivery-step_info-list">
              <li><b>Магазина партнёров</b> "Ёлочная и народная игрушка. Стекло.", <a href="https://yandex.ru/maps/-/CLVMIAzd" target="_blank" rel="noopener noreferrer" style="color: var(--color-primary); text-decoration: none; border-bottom: 1px solid var(--color-primary);"> расположен на </a> "блошином" рынке у ст. метро "Удельная" в Санкт-Петербурге.</li>
              <li><b>Режим работы:</b> Суббота и воскресенье с 11:00 до 16:30</li>
              <li><b>Скидка:</b> При оплате заказа наличными, предоставляется 10% скидка на весь новогодний ассортимент магазина ценой до 2000 руб. за товар</li>
              <li><b>Получение:</b> Назовите номер заказа и имя заполняемое выше</li>
            </ul>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

