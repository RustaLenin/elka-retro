import { BaseElement } from '../../base-element.js';
import { cart_page_template } from './cart-page-template.js';
import { getCartStore } from '../cart-store.js';
import { getItems } from '../cart-service.js';

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
    isLoading: { type: 'boolean', default: false, attribute: null, internal: true },
    isEmpty: { type: 'boolean', default: true, attribute: null, internal: true },
  };

  constructor() {
    super();
    this._unsubscribe = null;
    this._isInitializing = true;
    this._isUpdating = false; // Флаг для предотвращения параллельных обновлений
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
  }

  connectedCallback() {
    super.connectedCallback();
    // Подписываемся на глобальное событие обновления корзины
    window.addEventListener('elkaretro:cart:updated', this._handleCartUpdate);
    // Также подписываемся на изменения через store (для обратной совместимости)
    this.subscribeToCart();
    // Затем обновляем товары (это вызовет render один раз)
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
    const store = getCartStore();
    let isFirstCall = true;
    this._unsubscribe = store.subscribe((nextState) => {
      // Игнорируем первый вызов (он происходит сразу при подписке)
      if (isFirstCall) {
        isFirstCall = false;
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

    this._isUpdating = true;

    // Показываем состояние загрузки только если это не первая инициализация
    if (!this._isInitializing) {
      this.setState({ isLoading: true });
    }

    try {
      const items = getItems();
      const isEmpty = items.length === 0;

      // Для каждого товара нужно получить дополнительные данные (название, фото)
      const enrichedItems = await this.enrichItems(items);

      this.setState({
        items: enrichedItems,
        isEmpty,
        isLoading: false,
      });
      // Рендерим результат один раз после всех обновлений состояния
      this.render();
    } catch (error) {
      console.error('[cart-page] Update items error:', error);
      this.setState({ isLoading: false });
      this.render();
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
            
            return {
              ...item,
              title: data.title?.rendered || data.title || '',
              image: imageUrl,
              index: data.meta?.instance_index || data.instance_index || data.toy_instance_index || '',
              condition: data.meta?.condition || data.condition || '',
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

    // Заменяем содержимое страницы на Wizard
    try {
      // Загружаем order-wizard компонент
      await import('../order-wizard/order-wizard.js');

      // Создаем элемент Wizard
      const wizard = document.createElement('order-wizard');
      wizard.setAttribute('wizard-id', 'order-wizard-main');

      // Заменяем содержимое
      const content = this.closest('.site_content') || this.parentElement;
      if (content) {
        content.innerHTML = '';
        content.appendChild(wizard);
      } else {
        this.innerHTML = '';
        this.appendChild(wizard);
      }
    } catch (error) {
      console.error('[CartPage] Failed to start checkout:', error);
      this.showNotification('Не удалось начать оформление заказа', 'error');
    }
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
    const { items, isLoading, isEmpty } = this.state;

    this.innerHTML = cart_page_template({
      items,
      isLoading,
      isEmpty,
    });

    // После рендера нужно снова прикрепить обработчики
    // (т.к. innerHTML пересоздает DOM)
    this.attachEventListeners();

    // Рендерим cart-item компоненты для каждого товара
    if (!isEmpty && !isLoading) {
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
    
    // Импортируем formatPrice
    import('../helpers/price-formatter.js').then(({ formatPrice }) => {
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
    });
  }
}

customElements.define('cart-page', CartPage);

