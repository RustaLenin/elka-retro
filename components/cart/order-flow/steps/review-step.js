import { BaseElement } from '../../../base-element.js';
import { review_step_template } from './review-step-template.js';
import { formatPrice } from '../../helpers/price-formatter.js';
import { calculateTotal } from '../../cart-service.js';

// Загружаем стили на верхнем уровне модуля
if (window.app && window.app.toolkit && window.app.toolkit.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./review-step-styles.css', import.meta.url));
}

/**
 * Review Step Component
 * Шаг 3: Проверка данных
 * 
 * Показывает сводную информацию по заказу:
 * - Список товаров
 * - Способ доставки и данные
 * - Итоговая стоимость
 * - Поля для комментария и предпочитаемых способов связи
 */
export class ReviewStep extends BaseElement {
  static autoRender = false; // Отключаем автоматический рендер - управляем вручную
  static stateSchema = {
    orderData: { type: 'json', default: null, attribute: null, internal: true },
    comment: { type: 'string', default: '', attribute: null, internal: true },
    preferredCommunication: { type: 'string', default: '', attribute: null, internal: true },
    promoCode: { type: 'string', default: '', attribute: null, internal: true },
    isSubmitting: { type: 'boolean', default: false, attribute: null, internal: true },
    isAuthorizing: { type: 'boolean', default: false, attribute: null, internal: true }, // Флаг процесса авторизации
    error: { type: 'boolean', default: false, attribute: null, internal: true },
    errorMessage: { type: 'string', default: '', attribute: null, internal: true },
    _anonymousEmail: { type: 'string', default: '', attribute: null, internal: true }, // Для повторной попытки анонимного заказа
  };

  constructor() {
    super();
    this._handleCommentChange = this._handleCommentChange.bind(this);
    this._handlePreferredCommunicationChange = this._handlePreferredCommunicationChange.bind(this);
    this._handlePromoCodeChange = this._handlePromoCodeChange.bind(this);
    this._handlePlaceOrderClick = this._handlePlaceOrderClick.bind(this);
    this._handleAuthSuccess = this._handleAuthSuccess.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    
    // Загружаем данные из атрибута или LocalStorage
    const orderDataAttr = this.getAttribute('order-data');
    if (orderDataAttr) {
      try {
        const orderData = JSON.parse(orderDataAttr);
        this.setState({
          orderData,
          comment: orderData.comment || '',
          preferredCommunication: orderData.preferred_communication || '',
          promoCode: orderData.promo_code || '',
        });
      } catch (error) {
        console.error('[ReviewStep] Failed to parse order-data:', error);
      }
    }
    
    // Загружаем данные из LocalStorage
    this.loadFromLocalStorage();
    
    // Загружаем актуальные данные корзины
    this.loadCartData();
    
    this.render();
    this.attachEventListeners();
    
    // Подписываемся на событие успешной авторизации
    window.addEventListener('elkaretro:auth:login', this._handleAuthSuccess);
  }

  disconnectedCallback() {
    window.removeEventListener('elkaretro:auth:login', this._handleAuthSuccess);
  }

  /**
   * Загрузить данные из LocalStorage
   */
  loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem('elkaretro_order_data');
      if (saved) {
        const orderData = JSON.parse(saved);
        this.setState({
          comment: orderData.comment || this.state.comment,
          preferredCommunication: orderData.preferred_communication || this.state.preferredCommunication,
          promoCode: orderData.promo_code || this.state.promoCode,
        });
      }
    } catch (error) {
      console.error('[ReviewStep] Failed to load from LocalStorage:', error);
    }
  }

  /**
   * Сохранить данные в LocalStorage
   */
  saveToLocalStorage() {
    try {
      const saved = localStorage.getItem('elkaretro_order_data');
      const orderData = saved ? JSON.parse(saved) : {};
      
      orderData.comment = this.state.comment;
      orderData.preferred_communication = this.state.preferredCommunication;
      orderData.promo_code = this.state.promoCode;
      
      localStorage.setItem('elkaretro_order_data', JSON.stringify(orderData));
    } catch (error) {
      console.error('[ReviewStep] Failed to save to LocalStorage:', error);
    }
  }

  /**
   * Загрузить актуальные данные корзины
   */
  loadCartData() {
    const cart = window.app?.cart;
    if (!cart) {
      console.warn('[ReviewStep] Cart is not available');
      return;
    }

    // Используем calculateTotal из cart-service вместо несуществующего cart.getTotals()
    const cartItems = cart.getItems() || [];
    const cartTotals = calculateTotal() || {};

    // Обновляем orderData с актуальными данными корзины
    const orderData = this.state.orderData || {};
    orderData.cart = {
      items: cartItems.map(item => ({
        id: item.id,
        type: item.type,
        price: item.price,
        title: item.title,
        image: item.image,
      })),
    };
    orderData.totals = cartTotals;

    this.setState({ orderData });
  }

  /**
   * Обработка изменения комментария
   */
  _handleCommentChange(event) {
    const comment = event.target.value;
    this.setState({ comment });
    this.saveToLocalStorage();
  }

  /**
   * Обработка изменения предпочитаемых способов связи
   * Обновляем только значение поля через DOM, без полной перерисовки компонента
   */
  _handlePreferredCommunicationChange(event) {
    const preferredCommunication = event.target.value;
    
    // Обновляем данные напрямую в state
    this.state.preferredCommunication = preferredCommunication;
    this.saveToLocalStorage();
    
    // НЕ вызываем render() - поле уже обновлено через DOM, не нужно перерисовывать весь компонент
  }

  /**
   * Обработка изменения промокода
   * Обновляем только значение поля через DOM, без полной перерисовки компонента
   */
  _handlePromoCodeChange(event) {
    const promoCode = event.target.value;
    
    // Обновляем данные напрямую в state
    this.state.promoCode = promoCode;
    this.saveToLocalStorage();
    
    // НЕ вызываем render() - поле уже обновлено через DOM, не нужно перерисовывать весь компонент
  }

  /**
   * Обработка успешной авторизации
   * Добавляем задержку 3 секунды для установки куки перед созданием заказа
   */
  async _handleAuthSuccess() {
    console.log('[ReviewStep] Auth success, waiting for cookies to be set...');
    
    // Показываем прелоадер авторизации
    this.setState({ 
      isAuthorizing: true,
      error: false,
      errorMessage: ''
    });
    this.render();
    
    // Ждём 3 секунды для установки куки
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Проверяем, что авторизация действительно прошла успешно
    const isAuthorized = window.app?.auth?.authenticated && window.app.auth.user;
    if (!isAuthorized) {
      console.warn('[ReviewStep] Authorization check failed after delay, showing error');
      this.setState({ 
        isAuthorizing: false,
        error: true,
        errorMessage: 'Авторизация не завершена. Пожалуйста, попробуйте снова.'
      });
      this.render();
      return;
    }
    
    // Запрашиваем новый nonce после установки cookie
    // Это необходимо, потому что WordPress проверяет nonce через cookie
    try {
      console.log('[ReviewStep] Requesting fresh nonce after cookie setup...');
      const authService = window.app?.services?.authService;
      if (authService && typeof authService.refreshNonce === 'function') {
        await authService.refreshNonce();
        const updatedNonce = window.wpApiSettings?.nonce || '';
        console.log('[ReviewStep] Nonce refreshed:', updatedNonce ? `${updatedNonce.substring(0, 8)}...` : 'empty');
      } else {
        console.warn('[ReviewStep] AuthService not available, nonce may be outdated');
      }
    } catch (nonceError) {
      console.error('[ReviewStep] Failed to refresh nonce:', nonceError);
      // Continue anyway - will try with current nonce
    }
    
    // Скрываем прелоадер авторизации
    this.setState({ isAuthorizing: false });
    this.render();
    
    // Теперь можно отправлять заказ
    console.log('[ReviewStep] Cookies should be set, proceeding with order');
    await this._handlePlaceOrderClick();
  }

  /**
   * Обработка клика на кнопку "Оформить заказ"
   */
  async _handlePlaceOrderClick(event) {
    console.log('[ReviewStep] _handlePlaceOrderClick called', event);
    
    // Проверяем, что корзина не пуста
    const cart = window.app?.cart;
    if (!cart) {
      console.error('[ReviewStep] Cart is not available');
      this.showNotification('Корзина недоступна', 'error');
      return;
    }

    const cartItems = cart.getItems() || [];
    if (cartItems.length === 0) {
      console.warn('[ReviewStep] Cart is empty');
      this.showNotification('Корзина пуста', 'error');
      return;
    }

    // Проверяем авторизацию
    const isAuthorized = window.app?.auth?.authenticated && window.app.auth.user;
    console.log('[ReviewStep] Is authorized:', isAuthorized);
    
    if (!isAuthorized) {
      // Показываем модальное окно для выбора: авторизация или анонимный заказ
      console.log('[ReviewStep] Showing auth/anonymous modal');
      await this.showAuthOrAnonymousModal();
      return;
    }

    // Если авторизован, отправляем заказ
    console.log('[ReviewStep] Submitting order');
    await this.submitOrder();
  }

  /**
   * Показать модальное окно выбора: авторизация или анонимный заказ
   */
  async showAuthOrAnonymousModal() {
    console.log('[ReviewStep] showAuthOrAnonymousModal called');
    
    // Создаём модальное окно с выбором
    const modalContent = `
      <div class="review-step_auth-choice">
        <div class="review-step_auth-choice-blocks">
          <div class="review-step_auth-choice-block review-step_auth-choice-block--auth">
            <h3 class="review-step_auth-choice-block-title">Авторизованно</h3>
            <div class="review-step_auth-choice-block-icon">
              <ui-icon name="login" size="xxxl"></ui-icon>
            </div>
            <p class="review-step_auth-choice-block-description">
              Заказ будет привязан к вашему персональному аккаунту на сайте. В своём профиле можно найти историю заказов, с ним можно участвовать в акциях и аукционе, получать скидки, ВИП статус и бонусы.
            </p>
            <div class="review-step_auth-choice-block-button">
              <ui-button
                type="primary"
                label="Войти / Зарегистрироваться"
                icon="login"
                icon-position="left"
                event="review-step:auth-click"
                class="review-step_auth-btn"
              ></ui-button>
            </div>
            <p class="review-step_auth-choice-block-warning">
              Регистрируясь, вы соглашаетесь с <a href="#" data-app-action="legal.openPublicOffer" style="color: var(--color-primary); text-decoration: underline;">офертой</a> и <a href="#" data-app-action="legal.openPrivacyPolicy" style="color: var(--color-primary); text-decoration: underline;">соглашением на обработку персональных данных</a>.
            </p>
          </div>
          
          <div class="review-step_auth-choice-block review-step_auth-choice-block--anonymous">
            <h3 class="review-step_auth-choice-block-title">Анонимно</h3>
            <div class="review-step_auth-choice-block-icon">
              <ui-icon name="mask" size="xxxl"></ui-icon>
            </div>
            <p class="review-step_auth-choice-block-description">
              Заказ будет оформлен анонимно, без связки с аккаунтом. После выполнения заказа все контактные и персональные данные будут автоматически удалены.
            </p>
            <div class="review-step_auth-choice-block-button">
              <ui-button
                type="secondary"
                label="Оформить анонимно"
                icon="mask"
                icon-position="left"
                event="review-step:anonymous-click"
                class="review-step_anonymous-btn"
              ></ui-button>
            </div>
            <p class="review-step_auth-choice-block-warning">
              Я подтверждаю, что не хочу участвовать в акциях и аукционе, заводить личный кабинет, иметь историю покупок, получать скидки (кроме распродаж), ВИП статус, бонусы и всю вот эту муть. Это просто разовая покупка. Если мне понадобится - я вернусь к регистрации потом.
            </p>
          </div>
        </div>
      </div>
    `;

    // Используем существующую систему модальных окон через showModal helper
    let modal;
    try {
      console.log('[ReviewStep] Importing showModal');
      const { showModal } = await import('../../../ui-kit/modal/modal.js');
      console.log('[ReviewStep] showModal imported:', typeof showModal);
      
      modal = showModal({
        title: 'Оформление заказа',
        content: '', // Пустой контент, установим после рендера
        size: 'large', // Увеличиваем размер для двух блоков рядом
        closable: true,
      });
      console.log('[ReviewStep] Modal created:', modal);
      
      // Ждём, пока модальное окно отрендерится
      await new Promise((resolve) => {
        // Ждём события рендера
        modal.addEventListener('ui-modal:rendered', resolve, { once: true });
        // Fallback на случай, если событие не пришло
        setTimeout(resolve, 200);
      });
      
      // Устанавливаем контент после рендера
      modal.setBodyContent(modalContent);
      console.log('[ReviewStep] Modal content set');
    } catch (error) {
      console.error('[ReviewStep] Failed to show modal:', error);
      this.showNotification('Не удалось открыть окно выбора', 'error');
      return;
    }

    // Обработчики для блоков и кнопок в модальном окне
    setTimeout(() => {
      const authBlock = modal.querySelector('.review-step_auth-choice-block--auth');
      const anonymousBlock = modal.querySelector('.review-step_auth-choice-block--anonymous');
      const authBtn = modal.querySelector('.review-step_auth-btn');
      const anonymousBtn = modal.querySelector('.review-step_anonymous-btn');
      
      // Обработчик для блока авторизации (весь блок кликабельный)
      if (authBlock && modal) {
        authBlock.addEventListener('click', (e) => {
          // Предотвращаем клик, если кликнули на кнопку или ссылку
          if (e.target.closest('.review-step_auth-btn') || 
              e.target.closest('a[data-app-action]') ||
              e.target.tagName === 'A') {
            return;
          }
          modal.hide();
          this.showAuthModal();
        });
      }
      
      // Обработчик для блока анонимности (весь блок кликабельный)
      if (anonymousBlock && modal) {
        anonymousBlock.addEventListener('click', (e) => {
          // Предотвращаем клик, если кликнули на кнопку или ссылку
          if (e.target.closest('.review-step_anonymous-btn') || 
              e.target.closest('a[data-app-action]') ||
              e.target.tagName === 'A') {
            return;
          }
          modal.hide();
          this.showAnonymousOrderModal();
        });
      }
      
      // Обработчики для кнопок (для совместимости)
      if (authBtn && modal) {
        authBtn.addEventListener('click', (e) => {
          e.stopPropagation(); // Останавливаем всплытие, чтобы не сработал обработчик блока
          modal.hide();
          this.showAuthModal();
        });
      }
      
      if (anonymousBtn && modal) {
        anonymousBtn.addEventListener('click', (e) => {
          e.stopPropagation(); // Останавливаем всплытие, чтобы не сработал обработчик блока
          modal.hide();
          this.showAnonymousOrderModal();
        });
      }
    }, 100);
  }

  /**
   * Показать модальное окно авторизации
   */
  showAuthModal() {
    if (window.app?.services?.userUi?.showAuthModal) {
      window.app.services.userUi.showAuthModal();
    }
  }

  /**
   * Показать модальное окно анонимного заказа (с формой для email)
   */
  async showAnonymousOrderModal() {
    // Создаём модальное окно с формой для email
    const modalContent = `
      <div class="review-step_anonymous-form">
        <p class="review-step_anonymous-form-description">
          Для оформления заказа без регистрации укажите ваш email. 
          Мы отправим на него информацию о заказе.
        </p>
        <div class="review-step_anonymous-form-field">
          <label class="review-step_anonymous-form-label">
            Email <span class="review-step_anonymous-form-required">*</span>
          </label>
          <input
            type="email"
            name="anonymous_email"
            class="review-step_anonymous-form-input"
            placeholder="example@mail.ru"
            required
          />
          <div class="review-step_anonymous-form-error" style="display: none;"></div>
        </div>
        <div class="review-step_anonymous-form-actions">
          <ui-button
            type="primary"
            label="Оформить заказ"
            icon="check"
            icon-position="right"
            event="review-step:anonymous-submit"
            class="review-step_anonymous-submit-btn"
          ></ui-button>
        </div>
      </div>
    `;

    // Используем существующую систему модальных окон через showModal helper
    let modal;
    try {
      const { showModal } = await import('../../../ui-kit/modal/modal.js');
      
      modal = showModal({
        title: 'Оформление заказа без регистрации',
        content: '', // Пустой контент, установим после рендера
        size: 'medium',
        closable: true,
      });
      
      // Ждём, пока модальное окно отрендерится
      await new Promise((resolve) => {
        // Ждём события рендера
        modal.addEventListener('ui-modal:rendered', resolve, { once: true });
        // Fallback на случай, если событие не пришло
        setTimeout(resolve, 200);
      });
      
      // Устанавливаем контент после рендера
      modal.setBodyContent(modalContent);
    } catch (error) {
      console.error('[ReviewStep] Failed to show anonymous order modal:', error);
      this.showNotification('Не удалось открыть форму анонимного заказа', 'error');
      return;
    }

    // Обработчик для кнопки отправки
    setTimeout(() => {
      const submitBtn = modal.querySelector('.review-step_anonymous-submit-btn');
      const emailInput = modal.querySelector('.review-step_anonymous-form-input[name="anonymous_email"]');
      
      if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
          const email = emailInput?.value?.trim();

          if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            const errorDiv = modal.querySelector('.review-step_anonymous-form-error');
            if (errorDiv) {
              errorDiv.textContent = 'Введите корректный email';
              errorDiv.style.display = 'block';
            }
            return;
          }

          // Закрываем модальное окно
          modal.hide();

          // Отправляем анонимный заказ (preferred_communication берём из состояния шага 3)
          await this.submitAnonymousOrderRequest(email, this.state.preferredCommunication || '');
        });
      }
    }, 100);
  }

  /**
   * Отправить запрос на создание анонимного заказа
   */
  async submitAnonymousOrderRequest(email, preferredCommunication) {
    this.setState({ 
      isSubmitting: true, 
      error: false, 
      errorMessage: '' 
    });
    this.render();

    try {
      const cart = window.app?.cart;
      const cartItems = cart.getItems() || [];
      const cartTotals = calculateTotal() || {};
      const orderData = this.state.orderData || {};

      const orderPayload = {
        cart: {
          items: cartItems.map(item => ({
            id: item.id,
            type: item.type,
            price: item.price,
          })),
        },
        totals: cartTotals,
        delivery: orderData.delivery,
        email: email,
        comment: this.state.comment,
        preferred_communication: preferredCommunication,
        promo_code: this.state.promoCode || '',
      };

      const response = await fetch('/wp-json/elkaretro/v1/orders/create-anonymous', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': window.wpApiSettings?.nonce || '',
        },
        credentials: 'same-origin',
        body: JSON.stringify(orderPayload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Ошибка при создании заказа');
      }

      // Сначала показываем сообщение об успехе на той же странице через cart-page
      // Это нужно сделать ДО очистки корзины, чтобы избежать показа empty state
      this.showOrderSuccess(result.order.id);

      // Ждём небольшой таймаут, чтобы cart-page успел установить successOrder
      // и обработать его в подписке на изменения корзины
      await new Promise(resolve => setTimeout(resolve, 100));

      // Очищаем LocalStorage
      localStorage.removeItem('elkaretro_order_data');
      
      // Очищаем корзину (после установки successOrder, чтобы не показывать empty state)
      if (cart) {
        cart.clear();
      }

    } catch (error) {
      console.error('[ReviewStep] Failed to submit anonymous order:', error);
      // Показываем ошибку в полноэкранном overlay, а не в уведомлении
      this.setState({ 
        isSubmitting: true, // Оставляем overlay открытым
        error: true,
        errorMessage: error.message || 'Не удалось создать заказ'
      });
      this.render();
    }
  }

  /**
   * Отправить заказ (авторизованный пользователь)
   */
  async submitOrder() {
    this.setState({ 
      isSubmitting: true, 
      error: false, 
      errorMessage: '' 
    });
    this.render();

    try {
      const cart = window.app?.cart;
      const cartItems = cart.getItems() || [];
      const cartTotals = calculateTotal() || {};
      const orderData = this.state.orderData || {};

      const orderPayload = {
        cart: {
          items: cartItems.map(item => ({
            id: item.id,
            type: item.type,
            price: item.price,
          })),
        },
        totals: cartTotals,
        delivery: orderData.delivery,
        comment: this.state.comment,
        preferred_communication: this.state.preferredCommunication,
        promo_code: this.state.promoCode || '',
      };

      // Get current nonce (should be updated after authentication)
      const currentNonce = window.wpApiSettings?.nonce || '';
      console.log('[ReviewStep] Using nonce for order creation:', currentNonce ? `${currentNonce.substring(0, 8)}...` : 'empty');

      const response = await fetch('/wp-json/elkaretro/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': currentNonce,
        },
        credentials: 'same-origin',
        body: JSON.stringify(orderPayload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Ошибка при создании заказа');
      }

      // Сначала показываем сообщение об успехе на той же странице через cart-page
      // Это нужно сделать ДО очистки корзины, чтобы избежать показа empty state
      this.showOrderSuccess(result.order.id);

      // Ждём небольшой таймаут, чтобы cart-page успел установить successOrder
      // и обработать его в подписке на изменения корзины
      await new Promise(resolve => setTimeout(resolve, 100));

      // Очищаем LocalStorage
      localStorage.removeItem('elkaretro_order_data');
      
      // Очищаем корзину (после установки successOrder, чтобы не показывать empty state)
      if (cart) {
        cart.clear();
      }

    } catch (error) {
      console.error('[ReviewStep] Failed to submit order:', error);
      // Показываем ошибку в полноэкранном overlay, а не в уведомлении
      this.setState({ 
        isSubmitting: true, // Оставляем overlay открытым
        error: true,
        errorMessage: error.message || 'Не удалось создать заказ'
      });
      this.render();
    }
  }

  /**
   * Отправить анонимный заказ
   */
  async submitAnonymousOrder() {
    // Это будет реализовано позже с модальным окном для ввода email
    // Пока просто показываем уведомление
    this.showNotification('Функция анонимного заказа будет доступна в ближайшее время', 'info');
  }

  /**
   * Показать сообщение об успешном создании заказа
   */
  showOrderSuccess(orderId) {
    // Находим cart-page компонент - review-step находится внутри .cart-page_main
    // который является дочерним элементом cart-page
    let cartPage = this.closest('cart-page');
    
    // Если не нашли через closest, ищем в document
    if (!cartPage) {
      cartPage = document.querySelector('cart-page');
    }
    
    // Если всё ещё не нашли, ищем через родительские элементы
    if (!cartPage) {
      let parent = this.parentElement;
      while (parent && !cartPage) {
        if (parent.tagName && parent.tagName.toLowerCase() === 'cart-page') {
          cartPage = parent;
        } else {
          parent = parent.parentElement;
        }
      }
    }
    
    if (cartPage) {
      console.log('[ReviewStep] Found cart-page, setting success state');
      // Устанавливаем состояние синхронно через setState, чтобы оно было доступно сразу
      cartPage.setState({ 
        successOrder: true, 
        orderId: Number(orderId),
        items: [], // Очищаем items, чтобы не показывать товары
        isEmpty: false, // Не показываем empty state
        isLoading: false, // Загрузка завершена
      });
      // Также устанавливаем атрибуты для наблюдаемости
      cartPage.setAttribute('success-order', 'true');
      cartPage.setAttribute('order-id', String(orderId));
      cartPage.render();
    } else {
      console.error('[ReviewStep] cart-page not found!');
      // Если cart-page не найден, показываем уведомление
      this.showNotification(`Заказ №${orderId} успешно создан!`, 'success');
    }
  }

  /**
   * Показать уведомление
   */
  showNotification(message, type = 'info') {
    if (window.app && window.app.ui && window.app.ui.showNotification) {
      window.app.ui.showNotification(message, type);
    } else {
      console.log(`[ReviewStep] ${type}: ${message}`);
    }
  }

  /**
   * Получить название способа доставки
   */
  getDeliveryMethodLabel(method) {
    const labels = {
      'pickup_udelnaya': 'Самовывоз с Удельного рынка',
      'pickup_ozon': 'Пункт выдачи ОЗОН',
      'pickup_cdek': 'Пункт выдачи СДЭК',
      'courier_cdek': 'Курьер СДЭК',
      'post_russia': 'Почта России',
    };
    return labels[method] || method;
  }

  /**
   * Прикрепить обработчики событий
   */
  attachEventListeners() {
    // Обработка изменения комментария
    const commentField = this.querySelector('.review-step_comment');
    if (commentField) {
      commentField.removeEventListener('input', this._handleCommentChange);
      commentField.addEventListener('input', this._handleCommentChange);
    }

    // Обработка изменения предпочитаемых способов связи
    const preferredCommField = this.querySelector('.review-step_preferred-communication');
    if (preferredCommField) {
      preferredCommField.removeEventListener('input', this._handlePreferredCommunicationChange);
      preferredCommField.addEventListener('input', this._handlePreferredCommunicationChange);
    }

    // Обработка изменения промокода
    const promoCodeField = this.querySelector('.review-step_promo-code');
    if (promoCodeField) {
      promoCodeField.removeEventListener('input', this._handlePromoCodeChange);
      promoCodeField.addEventListener('input', this._handlePromoCodeChange);
    }

    // Обработка клика на кнопку "Оформить заказ"
    this.removeEventListener('review-step:place-order-click', this._handlePlaceOrderClick);
    this.addEventListener('review-step:place-order-click', this._handlePlaceOrderClick);

    // Обработка клика на кнопку "Попробовать снова"
    this.removeEventListener('review-step:retry', this._handleRetry);
    this.addEventListener('review-step:retry', this._handleRetry);
  }

  /**
   * Обработка повторной попытки после ошибки
   */
  _handleRetry = () => {
    // Сбрасываем состояние ошибки
    this.setState({ 
      error: false, 
      errorMessage: '',
      isSubmitting: true // Остаёмся в состоянии загрузки
    });
    this.render();

    // Повторяем отправку заказа
    const isAuthorized = window.app?.auth?.authenticated && window.app.auth.user;
    if (isAuthorized) {
      // Для авторизованных пользователей повторяем submitOrder
      this.submitOrder();
    } else if (this.state._anonymousEmail) {
      // Для неавторизованных пользователей повторяем submitAnonymousOrderRequest
      this.submitAnonymousOrderRequest(
        this.state._anonymousEmail, 
        this.state.preferredCommunication || ''
      );
    } else {
      console.warn('[ReviewStep] Retry failed - no email or auth data available');
      // Если нет данных для повторной попытки, показываем ошибку
      this.setState({ 
        error: true,
        errorMessage: 'Не удалось повторить запрос. Пожалуйста, вернитесь назад и попробуйте снова.'
      });
      this.render();
    }
  }

  render() {
    // Загружаем актуальные данные корзины и другие данные, не входящие в state
    const cart = window.app?.cart;
    const cartItems = cart?.getItems() || [];
    const cartTotals = cart ? calculateTotal() : {};
    const isAuthorized = window.app?.auth?.authenticated && window.app.auth.user;

    // Передаём весь state + дополнительные данные, не входящие в state
    this.innerHTML = review_step_template({
      ...this.state, // Весь state целиком
      cartItems, // Дополнительные данные
      cartTotals, // Дополнительные данные
      isAuthorized, // Дополнительные данные
      getDeliveryMethodLabel: this.getDeliveryMethodLabel.bind(this), // Метод компонента
      formatPrice, // Утилита
    });

    // После рендера прикрепляем обработчики снова
    this.attachEventListeners();
  }
}

customElements.define('review-step', ReviewStep);

