import { BaseElement } from '../../../base-element.js';
import { delivery_step_template } from './delivery-step-template.js';

// Загружаем стили на верхнем уровне модуля
if (window.app && window.app.toolkit && window.app.toolkit.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./delivery-step-styles.css', import.meta.url));
}

/**
 * Delivery Step Component
 * Шаг 2: Выбор способа доставки
 * 
 * Позволяет выбрать:
 * - Категорию доставки (Самовывоз / Курьерская доставка / Почта России)
 * - Конкретный способ доставки
 * - Заполнить необходимые поля для выбранного способа
 */
export class DeliveryStep extends BaseElement {
  static autoRender = false; // Отключаем автоматический рендер - управляем вручную
  static stateSchema = {
    deliveryCategory: { type: 'string', default: '', attribute: null, internal: true },
    deliveryMethod: { type: 'string', default: '', attribute: null, internal: true },
    deliveryData: { type: 'json', default: null, attribute: null, internal: true },
    validationErrors: { type: 'json', default: null, attribute: null, internal: true },
    deliveryCost: { type: 'number', default: 0, attribute: null, internal: true },
  };

  // Константы категорий и способов доставки
  static DELIVERY_CATEGORIES = {
    PICKUP: 'pickup',
    COURIER: 'courier',
    POST: 'post',
  };

  static DELIVERY_METHODS = {
    // Самовывоз
    PICKUP_UDELNAYA: 'pickup_udelnaya',
    PICKUP_OZON: 'pickup_ozon',
    PICKUP_CDEK: 'pickup_cdek',
    
    // Курьерская доставка
    COURIER_CDEK: 'courier_cdek',
    
    // Почта России
    POST_RUSSIA: 'post_russia',
  };

  // Маппинг способов доставки к категориям
  static METHOD_TO_CATEGORY = {
    [DeliveryStep.DELIVERY_METHODS.PICKUP_UDELNAYA]: DeliveryStep.DELIVERY_CATEGORIES.PICKUP,
    [DeliveryStep.DELIVERY_METHODS.PICKUP_OZON]: DeliveryStep.DELIVERY_CATEGORIES.PICKUP,
    [DeliveryStep.DELIVERY_METHODS.PICKUP_CDEK]: DeliveryStep.DELIVERY_CATEGORIES.PICKUP,
    [DeliveryStep.DELIVERY_METHODS.COURIER_CDEK]: DeliveryStep.DELIVERY_CATEGORIES.COURIER,
    [DeliveryStep.DELIVERY_METHODS.POST_RUSSIA]: DeliveryStep.DELIVERY_CATEGORIES.POST,
  };

  // Стоимость доставки для каждого способа
  static METHOD_PRICES = {
    [DeliveryStep.DELIVERY_METHODS.PICKUP_UDELNAYA]: 0,
    [DeliveryStep.DELIVERY_METHODS.PICKUP_OZON]: 150,
    [DeliveryStep.DELIVERY_METHODS.PICKUP_CDEK]: 350,
    [DeliveryStep.DELIVERY_METHODS.COURIER_CDEK]: 400, // Минимальная стоимость
    [DeliveryStep.DELIVERY_METHODS.POST_RUSSIA]: 300, // Минимальная стоимость
  };

  // Конфигурация полей для каждого способа доставки
  static METHOD_FIELDS = {
    [DeliveryStep.DELIVERY_METHODS.PICKUP_UDELNAYA]: {
      name: { required: true, type: 'text', label: 'Имя' },
      desiredDate: { required: false, type: 'text', label: 'Желаемая дата получения' },
    },
    [DeliveryStep.DELIVERY_METHODS.PICKUP_OZON]: {
      city: { required: true, type: 'text', label: 'Город' },
      pickupAddress: { required: true, type: 'text', label: 'Адрес пункта выдачи ОЗОН' },
      phone: { required: true, type: 'tel', label: 'Телефон получателя' },
    },
    [DeliveryStep.DELIVERY_METHODS.PICKUP_CDEK]: {
      lastName: { required: true, type: 'text', label: 'Фамилия' },
      firstName: { required: true, type: 'text', label: 'Имя' },
      phone: { required: true, type: 'tel', label: 'Телефон' },
      pickupAddress: { required: true, type: 'text', label: 'Адрес пункта выдачи СДЭК' },
    },
    [DeliveryStep.DELIVERY_METHODS.COURIER_CDEK]: {
      address: { 
        required: true, 
        type: 'textarea', 
        label: 'Адрес доставки',
        placeholder: 'Укажите полный адрес доставки',
        description: 'Наш администратор свяжется с вами и назовёт точную сумму стоимости доставки по указанному адресу',
      },
    },
    [DeliveryStep.DELIVERY_METHODS.POST_RUSSIA]: {
      country: { required: true, type: 'text', label: 'Страна' },
      city: { required: true, type: 'text', label: 'Город' },
      address: { required: true, type: 'textarea', label: 'Адрес' },
      postalCode: { required: false, type: 'text', label: 'Индекс' },
    },
  };

  constructor() {
    super();
    this._validationTimers = {};
    this._handleCategoryChange = this._handleCategoryChange.bind(this);
    this._handleMethodChange = this._handleMethodChange.bind(this);
    this._handleFieldChange = this._handleFieldChange.bind(this);
    this._handleNextClick = this._handleNextClick.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    
    // Загружаем сохранённые данные из атрибута или LocalStorage
    const orderDataAttr = this.getAttribute('order-data');
    if (orderDataAttr) {
      try {
        const orderData = JSON.parse(orderDataAttr);
        if (orderData.delivery) {
          const deliveryMethod = orderData.delivery.delivery_method || '';
          const deliveryCost = deliveryMethod ? (DeliveryStep.METHOD_PRICES[deliveryMethod] || 0) : 0;
          
          this.setState({
            deliveryMethod,
            deliveryData: orderData.delivery.delivery_data || {},
            deliveryCost,
          });
          
          // Определяем категорию из способа доставки
          if (deliveryMethod) {
            this.state.deliveryCategory = DeliveryStep.METHOD_TO_CATEGORY[deliveryMethod] || '';
          }
        }
      } catch (error) {
        console.error('[DeliveryStep] Failed to parse order-data:', error);
      }
    }
    
    // Прикрепляем делегированные обработчики ОДИН РАЗ при подключении компонента
    // Они будут работать даже после innerHTML, т.к. привязаны к корневому элементу
    this.addEventListener('change', this._handleCategoryChangeDelegate);
    this.addEventListener('change', this._handleMethodChangeDelegate);
    this.addEventListener('input', this._handleFieldChangeDelegate);
    this.addEventListener('delivery-step:next-click', this._handleNextClick);
    
    this.render();
    
    // Загружаем сохранённые данные из LocalStorage
    this.loadFromLocalStorage();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Удаляем обработчики при отключении компонента
    this.removeEventListener('change', this._handleCategoryChangeDelegate);
    this.removeEventListener('change', this._handleMethodChangeDelegate);
    this.removeEventListener('input', this._handleFieldChangeDelegate);
    this.removeEventListener('delivery-step:next-click', this._handleNextClick);
  }

  /**
   * Загрузить данные из LocalStorage
   */
  loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem('elkaretro_order_data');
      if (saved) {
        const orderData = JSON.parse(saved);
        if (orderData.delivery) {
          const deliveryMethod = orderData.delivery.delivery_method || this.state.deliveryMethod;
          const deliveryCost = deliveryMethod ? (DeliveryStep.METHOD_PRICES[deliveryMethod] || 0) : 0;
          
          this.setState({
            deliveryMethod,
            deliveryData: orderData.delivery.delivery_data || this.state.deliveryData || {},
            deliveryCost,
          });
          
          if (deliveryMethod) {
            this.state.deliveryCategory = DeliveryStep.METHOD_TO_CATEGORY[deliveryMethod] || '';
          }
          
          this.render();
        }
      }
    } catch (error) {
      console.error('[DeliveryStep] Failed to load from LocalStorage:', error);
    }
  }

  /**
   * Сохранить данные в LocalStorage
   */
  saveToLocalStorage() {
    try {
      const saved = localStorage.getItem('elkaretro_order_data');
      const orderData = saved ? JSON.parse(saved) : {};
      
      orderData.delivery = {
        delivery_method: this.state.deliveryMethod,
        delivery_data: this.state.deliveryData || {},
      };
      
      localStorage.setItem('elkaretro_order_data', JSON.stringify(orderData));
    } catch (error) {
      console.error('[DeliveryStep] Failed to save to LocalStorage:', error);
    }
  }

  /**
   * Обработка изменения категории доставки
   */
  _handleCategoryChange(event) {
    const category = event.target.value;
    console.log('[DeliveryStep] Category changed to:', category);
    
    // Если выбрана курьерская доставка или почта России - автоматически выбираем единственный способ
    let autoMethod = '';
    if (category === DeliveryStep.DELIVERY_CATEGORIES.COURIER) {
      autoMethod = DeliveryStep.DELIVERY_METHODS.COURIER_CDEK;
    } else if (category === DeliveryStep.DELIVERY_CATEGORIES.POST) {
      autoMethod = DeliveryStep.DELIVERY_METHODS.POST_RUSSIA;
    }
    
    const deliveryCost = autoMethod ? (DeliveryStep.METHOD_PRICES[autoMethod] || 0) : 0;
    console.log('[DeliveryStep] Auto method:', autoMethod, 'Cost:', deliveryCost);
    
    this.setState({
      deliveryCategory: category,
      deliveryMethod: autoMethod, // Автоматически выбираем способ для курьера/почты
      deliveryData: {}, // Сбрасываем данные при смене категории
      validationErrors: null,
      deliveryCost,
    });
    
    this.saveToLocalStorage();
    
    // Если автоматически выбрали способ - отправляем событие об изменении
    if (autoMethod) {
      console.log('[DeliveryStep] Dispatching delivery-changed event');
      this.dispatchEvent(new CustomEvent('order-flow:delivery-changed', {
        bubbles: true,
        composed: true,
        detail: { 
          deliveryMethod: autoMethod,
          deliveryCost,
        },
      }));
    }
    
    this.render();
  }

  /**
   * Обработка изменения способа доставки
   */
  _handleMethodChange(event) {
    const method = event.target.value;
    const deliveryCost = DeliveryStep.METHOD_PRICES[method] || 0;
    console.log('[DeliveryStep] Method changed to:', method, 'Cost:', deliveryCost);
    
    this.setState({
      deliveryMethod: method,
      deliveryData: {}, // Сбрасываем данные при смене способа
      validationErrors: null,
      deliveryCost, // Сохраняем стоимость доставки
    });
    
    // Определяем категорию из способа доставки
    this.state.deliveryCategory = DeliveryStep.METHOD_TO_CATEGORY[method] || '';
    
    this.saveToLocalStorage();
    
    // Отправляем событие об изменении способа доставки для обновления стоимости
    console.log('[DeliveryStep] Dispatching delivery-changed event for method:', method);
    this.dispatchEvent(new CustomEvent('order-flow:delivery-changed', {
      bubbles: true,
      composed: true,
      detail: { 
        deliveryMethod: method,
        deliveryCost, // Передаём стоимость доставки
      },
    }));
    
    this.render();
  }

  /**
   * Обработка изменения поля формы
   * НЕ перерисовываем компонент - только обновляем state напрямую и сохраняем
   */
  _handleFieldChange(event) {
    const fieldName = event.target.name;
    const fieldValue = event.target.value;
    
    // Обновляем данные доставки напрямую в state (без setState, чтобы не вызвать render)
    if (!this.state.deliveryData) {
      this.state.deliveryData = {};
    }
    this.state.deliveryData[fieldName] = fieldValue;
    
    this.saveToLocalStorage();
    
    // Валидация с задержкой (3 секунды после окончания ввода)
    this.validateFieldWithDelay(fieldName, fieldValue);
    
    // НЕ вызываем render() - поле уже обновлено через DOM, не нужно перерисовывать весь компонент
  }

  /**
   * Валидация поля с задержкой
   */
  validateFieldWithDelay(fieldName, fieldValue) {
    // Очищаем предыдущий таймер для этого поля
    if (this._validationTimers[fieldName]) {
      clearTimeout(this._validationTimers[fieldName]);
    }
    
    // Устанавливаем новый таймер
    this._validationTimers[fieldName] = setTimeout(() => {
      this.validateField(fieldName, fieldValue);
      delete this._validationTimers[fieldName];
    }, 3000);
  }

  /**
   * Валидация одного поля
   * Обновляем только ошибки валидации через DOM, без полной перерисовки
   */
  validateField(fieldName, fieldValue) {
    const method = this.state.deliveryMethod;
    if (!method) {
      return;
    }
    
    const fields = DeliveryStep.METHOD_FIELDS[method];
    if (!fields || !fields[fieldName]) {
      return;
    }
    
    const fieldConfig = fields[fieldName];
    const errors = { ...this.state.validationErrors } || {};
    
    // Проверка обязательности
    if (fieldConfig.required && (!fieldValue || fieldValue.trim() === '')) {
      errors[fieldName] = `Поле "${fieldConfig.label}" обязательно для заполнения`;
    } else {
      // Проверка формата телефона
      if (fieldName === 'phone' && fieldValue) {
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        if (!phoneRegex.test(fieldValue)) {
          errors[fieldName] = 'Неверный формат телефона';
        } else {
          delete errors[fieldName];
        }
      } else {
        delete errors[fieldName];
      }
    }
    
    // Обновляем ошибки валидации напрямую в state (без setState, чтобы не вызвать render)
    this.state.validationErrors = errors;
    
    // Обновляем ошибки валидации через DOM, без полной перерисовки
    this.updateFieldError(fieldName, errors[fieldName]);
  }

  /**
   * Обновить ошибку валидации для поля через DOM
   */
  updateFieldError(fieldName, errorMessage) {
    const fieldElement = this.querySelector(`[name="${fieldName}"]`);
    if (!fieldElement) {
      return;
    }
    
    const fieldContainer = fieldElement.closest('.delivery-step_field');
    if (!fieldContainer) {
      return;
    }
    
    // Находим или создаём контейнер для ошибки
    let errorElement = fieldContainer.querySelector('.delivery-step_field-error');
    
    if (errorMessage) {
      // Показываем ошибку
      if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'delivery-step_field-error';
        fieldContainer.appendChild(errorElement);
      }
      errorElement.textContent = errorMessage;
      fieldContainer.classList.add('delivery-step_field--error');
    } else {
      // Убираем ошибку
      if (errorElement) {
        errorElement.remove();
      }
      fieldContainer.classList.remove('delivery-step_field--error');
    }
  }

  /**
   * Валидация всех полей
   */
  validateAll() {
    const method = this.state.deliveryMethod;
    if (!method) {
      return false;
    }
    
    const fields = DeliveryStep.METHOD_FIELDS[method];
    if (!fields) {
      return false;
    }
    
    const errors = {};
    const deliveryData = this.state.deliveryData || {};
    
    Object.keys(fields).forEach(fieldName => {
      const fieldConfig = fields[fieldName];
      const fieldValue = deliveryData[fieldName] || '';
      
      if (fieldConfig.required && (!fieldValue || fieldValue.trim() === '')) {
        errors[fieldName] = `Поле "${fieldConfig.label}" обязательно для заполнения`;
      } else if (fieldName === 'phone' && fieldValue) {
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        if (!phoneRegex.test(fieldValue)) {
          errors[fieldName] = 'Неверный формат телефона';
        }
      }
    });
    
    // Обновляем ошибки валидации напрямую в state (без setState, чтобы не вызвать render)
    this.state.validationErrors = errors;
    
    // Обновляем ошибки для всех полей через DOM
    Object.keys(fields).forEach(fieldName => {
      this.updateFieldError(fieldName, errors[fieldName]);
    });
    
    return Object.keys(errors).length === 0;
  }

  /**
   * Обработка клика на кнопку "Далее"
   */
  _handleNextClick() {
    // Проверяем, выбран ли способ доставки
    if (!this.state.deliveryMethod) {
      this.showFieldError('deliveryMethod', 'Выберите способ доставки');
      return;
    }
    
    // Валидируем все поля
    if (!this.validateAll()) {
      // "Мигаем" полями с ошибками
      this.highlightErrors();
      return;
    }
    
    // Сохраняем данные
    this.saveToLocalStorage();
    
    // Отправляем событие перехода на следующий шаг
    this.dispatchEvent(new CustomEvent('order-flow:step:next', {
      bubbles: true,
      composed: true,
      detail: {
        delivery: {
          delivery_method: this.state.deliveryMethod,
          delivery_data: this.state.deliveryData,
        },
      },
    }));
  }

  /**
   * Показать ошибку для поля
   */
  showFieldError(fieldName, message) {
    if (!this.state.validationErrors) {
      this.state.validationErrors = {};
    }
    this.state.validationErrors[fieldName] = message;
    this.updateFieldError(fieldName, message);
  }

  /**
   * Подсветить поля с ошибками
   */
  highlightErrors() {
    const errorFields = this.querySelectorAll('.delivery-step_field--error');
    errorFields.forEach(field => {
      field.classList.add('delivery-step_field--highlight');
      setTimeout(() => {
        field.classList.remove('delivery-step_field--highlight');
      }, 1000);
    });
  }

  /**
   * Делегированный обработчик изменения категории доставки
   * Используем делегирование событий - обработчик на корневом элементе, работает даже после innerHTML
   */
  _handleCategoryChangeDelegate = (event) => {
    if (event.target.classList.contains('delivery-step_category-select')) {
      this._handleCategoryChange(event);
    }
  };

  /**
   * Делегированный обработчик изменения способа доставки
   */
  _handleMethodChangeDelegate = (event) => {
    if (event.target.classList.contains('delivery-step_method-select')) {
      this._handleMethodChange(event);
    }
  };

  /**
   * Делегированный обработчик изменения полей формы
   */
  _handleFieldChangeDelegate = (event) => {
    if (event.target.classList.contains('delivery-step_field-input')) {
      this._handleFieldChange(event);
    }
  };

  render() {
    const { deliveryCategory, deliveryMethod, deliveryData, validationErrors } = this.state;
    
    // Получаем доступные способы доставки для выбранной категории
    const availableMethods = Object.keys(DeliveryStep.METHOD_TO_CATEGORY)
      .filter(method => DeliveryStep.METHOD_TO_CATEGORY[method] === deliveryCategory);
    
    // Получаем поля для выбранного способа доставки
    const methodFields = deliveryMethod ? DeliveryStep.METHOD_FIELDS[deliveryMethod] : null;

    // Передаём весь state + дополнительные данные, не входящие в state
    this.innerHTML = delivery_step_template({
      ...this.state, // Весь state целиком
      deliveryData: deliveryData || {}, // Нормализуем
      validationErrors: validationErrors || {}, // Нормализуем
      availableMethods, // Дополнительные данные
      methodFields, // Дополнительные данные
      DELIVERY_CATEGORIES: DeliveryStep.DELIVERY_CATEGORIES, // Константы
      DELIVERY_METHODS: DeliveryStep.DELIVERY_METHODS, // Константы
    });

    // Обработчики уже прикреплены через делегирование в connectedCallback
    // Не нужно прикреплять их снова после render()
  }
}

customElements.define('delivery-step', DeliveryStep);

