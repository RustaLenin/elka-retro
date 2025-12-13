import { BaseElement } from '../../base-element.js';
import { order_flow_template } from './order-flow-template.js';

// Импортируем компоненты шагов
import './steps/delivery-step.js';
import './steps/review-step.js';

// Загружаем стили на верхнем уровне модуля
if (window.app && window.app.toolkit && window.app.toolkit.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./order-flow-styles.css', import.meta.url));
}

/**
 * Order Flow Component
 * Компонент для управления flow оформления заказа
 * 
 * Шаги:
 * 1. Перечень товаров (отображается в cart-page)
 * 2. Выбор способа доставки (delivery-step)
 * 3. Проверка данных (review-step)
 */
export class OrderFlow extends BaseElement {
  static stateSchema = {
    currentStep: { type: 'number', default: 2, attribute: { name: 'current-step', observed: true, reflect: true } },
    orderData: { type: 'json', default: null, attribute: null, internal: true },
    isSubmitting: { type: 'boolean', default: false, attribute: null, internal: true },
  };

  constructor() {
    super();
    this.steps = [
      { id: 'delivery', name: 'Доставка', component: 'delivery-step', number: 2 },
      { id: 'review', name: 'Проверка данных', component: 'review-step', number: 3 },
    ];
    
    // Все шаги включая шаг 1 (для отображения в прогресс-баре)
    this.allSteps = [
      { number: 1, name: 'Состав заказа' },
      ...this.steps,
    ];
    
    // Загружаем данные из LocalStorage при инициализации
    this.loadOrderData();
    
    this._handleStepNext = this._handleStepNext.bind(this);
    this._handleStepPrev = this._handleStepPrev.bind(this);
    this._handleStepGoto = this._handleStepGoto.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    this.render();
    this.attachEventListeners();
  }

  /**
   * Загрузить данные заказа из LocalStorage
   */
  loadOrderData() {
    try {
      const saved = localStorage.getItem('elkaretro_order_data');
      if (saved) {
        this.state.orderData = JSON.parse(saved);
      } else {
        this.state.orderData = {
          cart: null,
          delivery: null,
          comment: '',
          preferred_communication: '',
        };
      }
    } catch (error) {
      console.error('[OrderFlow] Failed to load order data from LocalStorage:', error);
      this.state.orderData = {
        cart: null,
        delivery: null,
        comment: '',
        preferred_communication: '',
      };
    }
  }

  /**
   * Сохранить данные заказа в LocalStorage
   */
  saveOrderData() {
    try {
      localStorage.setItem('elkaretro_order_data', JSON.stringify(this.state.orderData));
    } catch (error) {
      console.error('[OrderFlow] Failed to save order data to LocalStorage:', error);
    }
  }

  /**
   * Обработка перехода на следующий шаг
   */
  _handleStepNext(event) {
    const stepData = event.detail || {};
    
    // Сохраняем данные текущего шага
    if (stepData.delivery) {
      this.state.orderData.delivery = stepData.delivery;
    }
    
    this.saveOrderData();
    
    // Переходим на следующий шаг
    const currentStepIndex = this.steps.findIndex(s => s.number === this.state.currentStep);
    if (currentStepIndex < this.steps.length - 1) {
      this.setState({ currentStep: this.steps[currentStepIndex + 1].number });
      this.render();
    }
  }

  /**
   * Обработка возврата на предыдущий шаг
   */
  _handleStepPrev() {
    const currentStep = this.state.currentStep;
    
    if (currentStep === 2) {
      // Возвращаемся на cart-page (шаг 1)
      // Отправляем событие, которое обработает обработчик в cart-page
      this.dispatchEvent(new CustomEvent('order-flow:back-to-cart', {
        bubbles: true,
        composed: true,
      }));
    } else if (currentStep === 3) {
      // Возвращаемся на шаг 2
      this.setState({ currentStep: 2 });
      this.render();
    }
  }

  /**
   * Переход на конкретный шаг
   */
  _handleStepGoto(event) {
    const stepNumber = event.detail?.step;
    if (stepNumber && stepNumber >= 2 && stepNumber <= 3) {
      this.setState({ currentStep: stepNumber });
      this.render();
    }
  }

  /**
   * Прикрепить обработчики событий
   */
  attachEventListeners() {
    this.removeEventListener('order-flow:step:next', this._handleStepNext);
    this.addEventListener('order-flow:step:next', this._handleStepNext);
    
    this.removeEventListener('order-flow:step:prev', this._handleStepPrev);
    this.addEventListener('order-flow:step:prev', this._handleStepPrev);
    
    this.removeEventListener('order-flow:step:goto', this._handleStepGoto);
    this.addEventListener('order-flow:step:goto', this._handleStepGoto);
  }

  /**
   * Получить данные заказа для отправки
   */
  getOrderData() {
    // Загружаем актуальные данные корзины
    const cart = window.app?.cart;
    if (!cart) {
      throw new Error('Cart is not available');
    }

    const cartItems = cart.getItems() || [];
    const cartTotals = cart.getTotals() || {};

    return {
      cart: {
        items: cartItems.map(item => ({
          id: item.id,
          type: item.type,
          price: item.price,
        })),
      },
      totals: cartTotals,
      delivery: this.state.orderData.delivery,
      comment: this.state.orderData.comment || '',
      preferred_communication: this.state.orderData.preferred_communication || '',
    };
  }

  render() {
    const { currentStep } = this.state;
    const currentStepConfig = this.steps.find(s => s.number === currentStep);

    // Передаём весь state + дополнительные данные, не входящие в state
    this.innerHTML = order_flow_template({
      ...this.state, // Весь state целиком
      steps: this.steps, // Дополнительные данные (не в state)
      allSteps: this.allSteps, // Дополнительные данные (не в state)
      currentStepConfig, // Вычисляемые данные
    });

    // После рендера прикрепляем обработчики снова
    this.attachEventListeners();
    
    // Инициализируем компонент текущего шага
    requestAnimationFrame(() => {
      this.initCurrentStep();
    });
  }

  /**
   * Инициализировать текущий шаг
   */
  initCurrentStep() {
    const stepContainer = this.querySelector('.order-flow_step-container');
    if (!stepContainer) {
      return;
    }

    const currentStepConfig = this.steps.find(s => s.number === this.state.currentStep);
    if (!currentStepConfig) {
      return;
    }

    // Создаём компонент шага
    const stepElement = document.createElement(currentStepConfig.component);
    
    // Передаём данные заказа в компонент шага
    if (this.state.orderData) {
      stepElement.setAttribute('order-data', JSON.stringify(this.state.orderData));
    }

    stepContainer.innerHTML = '';
    stepContainer.appendChild(stepElement);
  }
}

customElements.define('order-flow', OrderFlow);

