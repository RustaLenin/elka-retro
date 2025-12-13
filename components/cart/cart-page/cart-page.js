import { BaseElement } from '../../base-element.js';
import { cart_page_template } from './cart-page-template.js';
import { formatPrice } from '../helpers/price-formatter.js';

// Загружаем стили на верхнем уровне модуля
if (window.app && window.app.toolkit && window.app.toolkit.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./cart-page-styles.css', import.meta.url));
}

/**
 * Cart Page Component
 * Главный компонент страницы корзины
 * Автономный компонент: подписывается на изменения корзины
 */
export class CartPage extends BaseElement {
  static autoRender = false; // Отключаем автоматический рендер, управляем вручную
  static stateSchema = {
    items: { type: 'json', default: [], attribute: null, internal: true },
    isLoading: { type: 'boolean', default: true, attribute: null, internal: true }, // Начинаем с true, чтобы не показывать пустое состояние
    isEmpty: { type: 'boolean', default: false, attribute: null, internal: true }, // Начинаем с false, чтобы не показывать "пусто"
    showBlockingOverlay: { type: 'boolean', default: false, attribute: null, internal: true },
    blockingMessage: { type: 'string', default: '', attribute: null, internal: true },
    successOrder: { type: 'boolean', default: false, attribute: { name: 'success-order', observed: true }, internal: true },
    orderId: { type: 'number', default: null, attribute: { name: 'order-id', observed: true }, internal: true },
  };

  constructor() {
    super();
    
    this._unsubscribe = null;
    this._isInitializing = true;
    this._isUpdating = false; // Флаг для предотвращения параллельных обновлений
    this._pendingRemoval = null;
    
    // Устанавливаем состояние загрузки ПОСЛЕ вызова super(), чтобы гарантировать правильные значения
    // Это должно предотвратить показ пустого состояния до загрузки данных
    this.state.isLoading = true;
    this.state.isEmpty = false;
    this._handleCartUpdate = (e) => {
      // Слушаем глобальное событие обновления корзины
      // Не обновляем при инициализации, т.к. updateItems уже вызывается
      if (!this._isInitializing) {
        this.updateItems();
      }
    };
    this._handleCheckoutClick = () => {
      this.startCheckout();
    };
    this._handleItemRemovalStart = (event) => {
      const { id, type } = event.detail || {};
      if (this._pendingRemoval) {
        return;
      }
      this._pendingRemoval = { id, type };
      this.setState({
        showBlockingOverlay: true,
        blockingMessage: 'Удаляем товар...',
      });
      this.render();
    };
  }

  async connectedCallback() {
    // Не вызываем super.connectedCallback() чтобы избежать лишних вызовов
    // Состояние уже установлено в конструкторе (isLoading: true, isEmpty: false)
    // Инициализируем атрибуты (если есть)
    this.initStateFromAttributes();
    
    // Убеждаемся, что состояние загрузки установлено (на случай если атрибуты его перезаписали)
    if (!this.state.isLoading) {
      this.state.isLoading = true;
    }
    if (this.state.isEmpty) {
      this.state.isEmpty = false;
    }
    
    // Рендерим loader сразу, чтобы пользователь видел индикатор загрузки
    this.render();
    
    // Ждем, пока корзина инициализируется (если еще не готова)
    if (!window.app?.cart) {
      // Ждем события DOMContentLoaded или готовности корзины
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve, { once: true });
        });
      }
      
      // Ждем еще немного, чтобы корзина успела инициализироваться
      let attempts = 0;
      const maxAttempts = 40; // 2 секунды максимум (40 * 50мс)
      while (!window.app?.cart && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 50));
        attempts++;
      }
    }
    
    // Подписываемся на глобальное событие обновления корзины
    window.addEventListener('elkaretro:cart:updated', this._handleCartUpdate);
    // Также подписываемся на изменения через store (для обратной совместимости)
    this.subscribeToCart();
    // Затем обновляем товары (это вызовет render один раз после загрузки)
    this.updateItems().then(() => {
      // После первой загрузки помечаем, что инициализация завершена
      this._isInitializing = false;
    });
    // Прикрепляем обработчики событий (они будут переприкреплены после первого render)
    this.attachEventListeners();
  }

  disconnectedCallback() {
    // Отписываемся от глобального события
    window.removeEventListener('elkaretro:cart:updated', this._handleCartUpdate);
    // Отписываемся от store
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
  }

  /**
   * Подписаться на изменения корзины
   */
  subscribeToCart() {
    if (!window.app?.cart) {
      console.warn('[cart-page] cart not initialized');
      return;
    }
    let isFirstCall = true;
    this._unsubscribe = window.app.cart.subscribe((nextState) => {
      // Игнорируем первый вызов (он происходит сразу при подписке)
      if (isFirstCall) {
        isFirstCall = false;
        return;
      }
      // Если заказ успешно создан, не обновляем состояние
      // чтобы не показывать empty state вместо success overlay
      if (this.state.successOrder) {
        return;
      }
      // Обновляем только если инициализация завершена
      if (!this._isInitializing) {
        this.updateItems();
      }
    });
  }

  /**
   * Обновить список товаров
   */
  async updateItems() {
    // Предотвращаем параллельные обновления
    if (this._isUpdating) {
      return;
    }

    // Если заказ успешно создан, не обновляем состояние isEmpty
    // чтобы не показывать empty state вместо success overlay
    if (this.state.successOrder) {
      return;
    }

    this._isUpdating = true;

    // Показываем состояние загрузки только если это не первая инициализация
    if (!this._isInitializing) {
      this.setState({ isLoading: true });
    }

    try {
      // Ждем, пока корзина инициализируется (если еще не готова)
      if (!window.app?.cart) {
        // Ждем максимум 2 секунды, проверяя каждые 50мс
        let attempts = 0;
        const maxAttempts = 40;
        while (!window.app?.cart && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 50));
          attempts++;
        }
      }

      // Если корзина все еще не доступна, показываем ошибку
      if (!window.app?.cart) {
        console.error('[cart-page] Cart store not available after waiting');
        this.setState({ isLoading: false, isEmpty: true });
        this.render();
        return;
      }

      const items = window.app.cart.getItems() || [];
      // Не устанавливаем isEmpty, если заказ успешно создан
      // чтобы не показывать empty state вместо success overlay
      const isEmpty = this.state.successOrder ? false : items.length === 0;

      // Для каждого товара нужно получить дополнительные данные (название, фото)
      const enrichedItems = await this.enrichItems(items);

      const nextState = {
        items: enrichedItems,
        isEmpty,
        isLoading: false,
      };

      // Если successOrder установлен, не обновляем items
      // чтобы не показывать товары после успешного создания заказа
      if (this.state.successOrder) {
        nextState.items = [];
        nextState.isEmpty = false;
      }

      if (this._pendingRemoval) {
        nextState.showBlockingOverlay = false;
        nextState.blockingMessage = '';
      }

      this.setState(nextState);
      // Рендерим результат один раз после всех обновлений состояния
      this.render();
      if (this._pendingRemoval) {
        this._pendingRemoval = null;
        this.showNotification('Товар удалён из корзины', 'success');
      }
    } catch (error) {
      console.error('[cart-page] Update items error:', error);
      const nextState = { isLoading: false };
      if (this._pendingRemoval) {
        nextState.showBlockingOverlay = false;
        nextState.blockingMessage = '';
      }
      this.setState(nextState);
      this.render();
      if (this._pendingRemoval) {
        this.showNotification('Не удалось обновить корзину', 'error');
        this._pendingRemoval = null;
      }
    } finally {
      this._isUpdating = false;
    }
  }

  /**
   * Обогатить товары дополнительными данными (название, фото)
   * @param {Array} items - массив товаров из корзины
   * @returns {Promise<Array>} обогащенные товары
   */
  async enrichItems(items) {
    const enriched = await Promise.all(
      items.map(async (item) => {
        try {
          const endpoint =
            item.type === 'toy_instance'
              ? `/wp-json/wp/v2/toy_instance/${item.id}`
              : `/wp-json/wp/v2/ny_accessory/${item.id}`;

          const response = await fetch(`${endpoint}?_embed=1`, {
            credentials: 'same-origin',
          });

          if (response.ok) {
            const data = await response.json();
            
            // Получаем URL изображения из _embedded или featured_media
            let imageUrl = '';
            
            // Проверяем _embedded (самый надежный способ)
            if (data._embedded && data._embedded['wp:featuredmedia']) {
              const featuredMedia = data._embedded['wp:featuredmedia'][0];
              if (featuredMedia) {
                imageUrl = featuredMedia.source_url || featuredMedia.media_details?.sizes?.large?.source_url || 
                          featuredMedia.media_details?.sizes?.medium?.source_url || featuredMedia.guid?.rendered || '';
              }
            }
            
            // Fallback: проверяем featured_media ID и загружаем отдельно
            if (!imageUrl && data.featured_media) {
              try {
                const mediaResponse = await fetch(`/wp-json/wp/v2/media/${data.featured_media}`, { 
                  credentials: 'same-origin' 
                });
                if (mediaResponse.ok) {
                  const mediaData = await mediaResponse.json();
                  imageUrl = mediaData.source_url || mediaData.media_details?.sizes?.large?.source_url || 
                            mediaData.media_details?.sizes?.medium?.source_url || mediaData.guid?.rendered || '';
                }
              } catch (e) {
                console.warn(`[cart-page] Failed to fetch media for item ${item.id}:`, e);
              }
            }
            
            // Fallback: проверяем другие поля
            if (!imageUrl && data.featured_media_url) {
              imageUrl = data.featured_media_url;
            }
            if (!imageUrl && data.image) {
              imageUrl = data.image;
            }
            
            // Преобразуем condition из ID в название, если это toy_instance
            let conditionName = '';
            if (item.type === 'toy_instance') {
              // В REST API condition может быть:
              // 1. data.condition - массив объектов или false
              // 2. data.conditions - ID (число) - поле с множественным числом
              // 3. data.meta.condition - может быть ID или строка
              
              // Приоритет 1: проверяем data.condition (массив объектов или массив ID)
              if (data.condition && Array.isArray(data.condition) && data.condition.length > 0) {
                const firstCondition = data.condition[0];
                // Если это объект с name/slug
                if (typeof firstCondition === 'object' && firstCondition !== null) {
                  conditionName = firstCondition.name || firstCondition.slug || '';
                }
                // Если это число (ID) или строка с числом
                else if (typeof firstCondition === 'number' || (typeof firstCondition === 'string' && /^\d+$/.test(firstCondition))) {
                  const conditionId = typeof firstCondition === 'string' ? parseInt(firstCondition, 10) : firstCondition;
                  const taxonomyTerms = window.taxonomy_terms?.condition || {};
                  const termData = taxonomyTerms[conditionId];
                  if (termData) {
                    conditionName = termData.name || termData.slug || '';
                  } else {
                    console.warn(`[cart-page] Condition term ${conditionId} not found in taxonomy_terms for item ${item.id}`);
                  }
                }
              }
              // Приоритет 2: проверяем data.conditions (ID) - поле с множественным числом
              else if (data.conditions && (typeof data.conditions === 'number' || (typeof data.conditions === 'string' && /^\d+$/.test(data.conditions)))) {
                const conditionId = typeof data.conditions === 'string' ? parseInt(data.conditions, 10) : data.conditions;
                const taxonomyTerms = window.taxonomy_terms?.condition || {};
                const termData = taxonomyTerms[conditionId];
                if (termData) {
                  conditionName = termData.name || termData.slug || '';
                } else {
                  console.warn(`[cart-page] Condition term ${conditionId} not found in taxonomy_terms for item ${item.id}`);
                }
              }
              // Приоритет 3: проверяем data.meta.condition
              else if (data.meta?.condition) {
                const conditionData = data.meta.condition;
                if (typeof conditionData === 'number' || (typeof conditionData === 'string' && /^\d+$/.test(conditionData))) {
                  const conditionId = typeof conditionData === 'string' ? parseInt(conditionData, 10) : conditionData;
                  const taxonomyTerms = window.taxonomy_terms?.condition || {};
                  const termData = taxonomyTerms[conditionId];
                  if (termData) {
                    conditionName = termData.name || termData.slug || '';
                  } else {
                    console.warn(`[cart-page] Condition term ${conditionId} not found in taxonomy_terms for item ${item.id}`);
                  }
                } else if (typeof conditionData === 'string') {
                  conditionName = conditionData;
                }
              }
              // Приоритет 4: проверяем data.condition как строка (если уже название)
              else if (data.condition && typeof data.condition === 'string') {
                conditionName = data.condition;
              }
              
              // Отладка: если не нашли condition, логируем структуру данных
              if (!conditionName) {
                console.warn(`[cart-page] Could not extract condition for item ${item.id}:`, {
                  'data.condition': data.condition,
                  'data.conditions': data.conditions,
                  'data.meta?.condition': data.meta?.condition,
                  'window.taxonomy_terms?.condition': window.taxonomy_terms?.condition ? Object.keys(window.taxonomy_terms.condition).length + ' terms' : 'not available'
                });
              }
            }
            
            return {
              ...item,
              title: data.title?.rendered || data.title || '',
              image: imageUrl,
              index: data.meta?.instance_index || data.instance_index || data.toy_instance_index || '',
              condition: conditionName,
            };
          }
        } catch (error) {
          console.error(`[cart-page] Failed to enrich item ${item.id}:`, error);
        }

        // Fallback: возвращаем товар без дополнительных данных
        return {
          ...item,
          title: '',
          image: '',
          index: '',
        };
      })
    );

    return enriched;
  }

  /**
   * Прикрепить обработчики событий
   */
  attachEventListeners() {
    // Обработка клика по кнопке оформления заказа через кастомное событие от ui-button
    this.removeEventListener('cart-page:checkout-click', this._handleCheckoutClick);
    this.addEventListener('cart-page:checkout-click', this._handleCheckoutClick);
    this.removeEventListener('cart-item:removal-start', this._handleItemRemovalStart);
    this.addEventListener('cart-item:removal-start', this._handleItemRemovalStart);
  }

  /**
   * Начать оформление заказа
   */
  async startCheckout() {
    const items = this.state.items;
    if (!items || items.length === 0) {
      this.showNotification('Корзина пуста', 'error');
      return;
    }

    // Переходим к шагу 2 (доставка) - меняем только содержимое левой части
    await this.goToStep(2);
  }

  /**
   * Обновить прогресс-бар
   */
  updateProgressBar(activeStep) {
    const steps = this.querySelectorAll('.cart-page_step');
    steps.forEach((step, index) => {
      const stepNumber = index + 1;
      step.classList.remove('cart-page_step--active', 'cart-page_step--completed');
      
      if (stepNumber === activeStep) {
        step.classList.add('cart-page_step--active');
      } else if (stepNumber < activeStep) {
        step.classList.add('cart-page_step--completed');
      }
    });
  }

  /**
   * Обновить footer с кнопками навигации
   */
  updateFooter(currentStep) {
    let footer = this.querySelector('.cart-page_footer');
    
    if (!footer) {
      // Создаём footer если его нет
      footer = document.createElement('footer');
      footer.className = 'cart-page_footer';
      const content = this.querySelector('.cart-page_content');
      if (content) {
        content.parentElement.insertBefore(footer, content.nextSibling);
      }
    }

    footer.innerHTML = '';
    
    if (currentStep >= 2) {
      // Кнопка "Назад"
      const backBtn = document.createElement('ui-button');
      backBtn.setAttribute('type', 'secondary');
      backBtn.setAttribute('label', 'Назад');
      backBtn.setAttribute('icon', 'chevron_left');
      backBtn.setAttribute('icon-position', 'left');
      backBtn.setAttribute('event', 'cart-page:back-click');
      backBtn.className = 'cart-page_back-btn';
      footer.appendChild(backBtn);
    }

    // Кнопка "Далее" всегда справа
    const nextBtn = document.createElement('ui-button');
    nextBtn.setAttribute('type', 'primary');
    const nextLabel = currentStep === 1 ? 'Далее' : currentStep === 2 ? 'Далее' : 'Оформить заказ';
    nextBtn.setAttribute('label', nextLabel);
    nextBtn.setAttribute('icon', currentStep === 3 ? 'check' : 'chevron_right');
    nextBtn.setAttribute('icon-position', 'right');
    const nextEvent = currentStep === 1 ? 'cart-page:checkout-click' : currentStep === 2 ? 'order-flow:step:next' : 'review-step:place-order-click';
    nextBtn.setAttribute('event', nextEvent);
    nextBtn.className = 'cart-page_next-btn';
    footer.appendChild(nextBtn);

    // Прикрепляем обработчики
    this.attachFooterListeners();
  }

  /**
   * Прикрепить обработчики для footer
   */
  attachFooterListeners() {
    // Обработчик для кнопки "Назад"
    this.removeEventListener('cart-page:back-click', this._handleBackClick);
    this._handleBackClick = () => {
      this.handleBackToCart();
    };
    this.addEventListener('cart-page:back-click', this._handleBackClick);

    // Обработчик для кнопки "Далее" на шаге 2
    this.removeEventListener('order-flow:step:next', this._handleStepNext);
    this.addEventListener('order-flow:step:next', (event) => {
      this.handleStepNext(event);
    });

    // Обработчик для кнопки "Оформить заказ" на шаге 3
    // Событие всплывает от кнопки в footer, передаём его в review-step
    this.removeEventListener('review-step:place-order-click', this._handleReviewStepPlaceOrder);
    this._handleReviewStepPlaceOrder = (event) => {
      // Находим review-step компонент и передаём ему событие
      const reviewStep = this.querySelector('review-step');
      if (reviewStep && typeof reviewStep._handlePlaceOrderClick === 'function') {
        reviewStep._handlePlaceOrderClick(event);
      } else {
        // Если метод недоступен, отправляем событие напрямую в review-step
        if (reviewStep) {
          reviewStep.dispatchEvent(new CustomEvent('review-step:place-order-click', {
            bubbles: false,
            composed: true,
            detail: event.detail,
          }));
        }
      }
    };
    this.addEventListener('review-step:place-order-click', this._handleReviewStepPlaceOrder);
  }

  /**
   * Обработка возврата к корзине (шаг 1)
   */
  handleBackToCart() {
    // Обновляем прогресс-бар (шаг 1 активен)
    this.updateProgressBar(1);

    // Показываем прелоадер в левой части
    const mainContent = this.querySelector('.cart-page_main');
    if (mainContent) {
      mainContent.innerHTML = `
        <div class="cart-page_step-loading">
          <ui-loader></ui-loader>
          <p>Загрузка корзины...</p>
        </div>
      `;
    }

    // Обновляем footer
    this.updateFooter(1);

    // Загружаем товары и рендерим корзину
    // Используем setTimeout чтобы прелоадер успел отобразиться
    setTimeout(() => {
      this.updateItems().then(() => {
        // После загрузки рендерим только содержимое левой части (товары)
        this.renderMainContent();
      }).catch((error) => {
        console.error('[CartPage] Failed to update items:', error);
        // В случае ошибки всё равно пытаемся отрендерить
        this.renderMainContent();
      });
    }, 100);
  }

  /**
   * Рендерить только содержимое левой части (без header и sidebar)
   */
  renderMainContent() {
    const mainContent = this.querySelector('.cart-page_main');
    if (!mainContent) {
      return;
    }

    const { items, isEmpty, isLoading, showBlockingOverlay, blockingMessage } = this.state;

    // Если загрузка не завершена или корзина пуста - показываем соответствующие состояния
    if (isLoading || isEmpty) {
      if (isEmpty) {
        mainContent.innerHTML = `
          <div class="cart-page_empty">
            <div class="cart-page_empty-content">
              <ui-icon name="cart" size="large" class="cart-page_empty-icon"></ui-icon>
              <h2 class="cart-page_empty-title">Корзина пуста</h2>
              <p class="cart-page_empty-text">Добавьте товары в корзину, чтобы продолжить покупки.</p>
            </div>
          </div>
        `;
      }
      return;
    }

    // Рендерим товары
    let html = '';
    
    if (showBlockingOverlay) {
      html += `
        <div class="cart-page_overlay">
          <ui-loader></ui-loader>
          <p>${blockingMessage || 'Обновляем корзину...'}</p>
        </div>
      `;
    }

    html += `<div class="cart-page_items" role="list"></div>`;
    
    mainContent.innerHTML = html;

    // Рендерим товары
    this.renderItems();
  }

  /**
   * Обработка перехода на следующий шаг
   */
  handleStepNext(event) {
    const stepData = event.detail || {};
    const currentStep = this.getCurrentStep();

    if (currentStep === 2) {
      // Переходим на шаг 3 (проверка данных)
      this.goToStep(3, stepData);
    }
  }

  /**
   * Получить текущий активный шаг
   */
  getCurrentStep() {
    const activeStep = this.querySelector('.cart-page_step--active');
    if (!activeStep) return 1;
    
    const steps = Array.from(this.querySelectorAll('.cart-page_step'));
    return steps.indexOf(activeStep) + 1;
  }

  /**
   * Перейти на конкретный шаг
   */
  async goToStep(stepNumber, stepData = {}) {
    // Обновляем прогресс-бар
    this.updateProgressBar(stepNumber);

    // Показываем прелоадер
    const mainContent = this.querySelector('.cart-page_main');
    if (mainContent) {
      mainContent.innerHTML = `
        <div class="cart-page_step-loading">
          <ui-loader></ui-loader>
          <p>Загрузка...</p>
        </div>
      `;
    }

    // Сохраняем данные шага в LocalStorage
    if (stepData.delivery) {
      try {
        const saved = localStorage.getItem('elkaretro_order_data');
        const orderData = saved ? JSON.parse(saved) : {};
        orderData.delivery = stepData.delivery;
        localStorage.setItem('elkaretro_order_data', JSON.stringify(orderData));
      } catch (error) {
        console.error('[CartPage] Failed to save order data:', error);
      }
    }

    // Используем setTimeout чтобы прелоадер успел отобразиться
    setTimeout(async () => {
      if (stepNumber === 2) {
        // Загружаем компонент delivery-step
        await import('../order-flow/steps/delivery-step.js');
        
        const deliveryStep = document.createElement('delivery-step');
        
        // Загружаем данные из LocalStorage
        try {
          const saved = localStorage.getItem('elkaretro_order_data');
          if (saved) {
            const orderData = JSON.parse(saved);
            deliveryStep.setAttribute('order-data', JSON.stringify(orderData));
          }
        } catch (error) {
          console.error('[CartPage] Failed to load order data:', error);
        }

        // Заменяем содержимое левой части
        if (mainContent) {
          mainContent.innerHTML = '';
          mainContent.appendChild(deliveryStep);
        }
      } else if (stepNumber === 3) {
      // Загружаем компонент review-step
      await import('../order-flow/steps/review-step.js');
      
      const reviewStep = document.createElement('review-step');
      
      // Загружаем данные из LocalStorage
      try {
        const saved = localStorage.getItem('elkaretro_order_data');
        if (saved) {
          const orderData = JSON.parse(saved);
          reviewStep.setAttribute('order-data', JSON.stringify(orderData));
        }
      } catch (error) {
        console.error('[CartPage] Failed to load order data:', error);
      }

      // Подписываемся на события
      reviewStep.addEventListener('order-flow:step:prev', () => {
        this.goToStep(2);
      });

      // Заменяем содержимое левой части
      if (mainContent) {
        mainContent.innerHTML = '';
        mainContent.appendChild(reviewStep);
      }
    }

      // Обновляем footer
      this.updateFooter(stepNumber);
    }, 100);
  }

  /**
   * Показать уведомление
   */
  showNotification(message, type = 'info') {
    if (window.app && window.app.ui && window.app.ui.showNotification) {
      window.app.ui.showNotification(message, type);
    } else {
      console.log(`[CartPage] ${type}: ${message}`);
    }
  }

  render() {
    // Передаём весь state целиком - так ничего не потеряется
    this.innerHTML = cart_page_template(this.state);

    // После рендера нужно снова прикрепить обработчики
    // (т.к. innerHTML пересоздает DOM)
    this.attachEventListeners();

    // Рендерим cart-item компоненты для каждого товара
    // НЕ рендерим товары, если заказ успешно создан (показываем success overlay)
    const { isEmpty, isLoading, successOrder } = this.state;
    if (!isEmpty && !isLoading && !successOrder) {
      this.renderItems();
    }
  }

  /**
   * Рендерить товары в корзине
   */
  renderItems() {
    const itemsContainer = this.querySelector('.cart-page_items');
    if (!itemsContainer) {
      return;
    }

    const { items } = this.state;

    itemsContainer.innerHTML = '';

    items.forEach((item) => {
      const cartItem = document.createElement('cart-item');
      cartItem.setAttribute('id', item.id);
      cartItem.setAttribute('type', item.type);
      cartItem.setAttribute('title', item.title || '');
      cartItem.setAttribute('price', item.price);
      cartItem.setAttribute('image', item.image || '');
      cartItem.setAttribute('index', item.index || '');
      if (item.condition) {
        cartItem.setAttribute('condition', item.condition);
      }
      itemsContainer.appendChild(cartItem);
    });

    // Если больше одного элемента, показываем сумму всех элементов под списком
    if (items.length > 1) {
      this.renderItemsTotal();
    } else {
      // Удаляем блок с суммой, если он есть
      const totalBlock = this.querySelector('.cart-page_items-total');
      if (totalBlock) {
        totalBlock.remove();
      }
    }
  }

  /**
   * Рендерить сумму всех элементов под списком
   */
  renderItemsTotal() {
    const { items } = this.state;
    
    // Удаляем старый блок, если есть
    const oldTotal = this.querySelector('.cart-page_items-total');
    if (oldTotal) {
      oldTotal.remove();
    }

    // Вычисляем сумму всех элементов
    const total = items.reduce((sum, item) => sum + (item.price || 0), 0);
    
    // formatPrice уже загружен статически
    const formattedTotal = formatPrice(total);
    
    const totalBlock = document.createElement('div');
    totalBlock.className = 'cart-page_items-total';
    totalBlock.innerHTML = `
      <div class="cart-page_items-total-label">Сумма товаров:</div>
      <div class="cart-page_items-total-value">${formattedTotal}</div>
    `;
    
    const itemsContainer = this.querySelector('.cart-page_items');
    if (itemsContainer && itemsContainer.parentNode) {
      itemsContainer.parentNode.insertBefore(totalBlock, itemsContainer.nextSibling);
    }
  }
}

customElements.define('cart-page', CartPage);

