import { BaseElement } from '../../base-element.js';
import { toy_type_single_template } from './toy-type-single-template.js';

/**
 * Toy Type Single Component
 * Отображение отдельной страницы типа игрушки
 * Автономный компонент: загружает данные по ID через WP REST API
 */
export class ToyTypeSingle extends BaseElement {
  static stateSchema = {
    id: { type: 'number', default: null, attribute: { name: 'id', observed: true, reflect: true } },
    data: { type: 'json', default: null, attribute: null, internal: true },
    instances: { type: 'json', default: [], attribute: null, internal: true },
    loading: { type: 'boolean', default: false, attribute: null, internal: true },
    error: { type: 'string', default: null, attribute: null, internal: true },
  };

  constructor() {
    super();
    this._loadingPromise = null; // Защита от дублирующихся запросов
  }

  connectedCallback() {
    window.app.toolkit.loadCSSOnce(new URL('./toy-type-single-styles.css', import.meta.url));
    super.connectedCallback();
    if (this.state.id) {
      this.loadData();
    } else {
      this.render();
    }
  }

  async loadData() {
    const { id } = this.state;
    if (!id) return;
    
    // Если уже загружаем данные, не дублируем запрос
    if (this._loadingPromise) {
      return this._loadingPromise;
    }
    
    this.setState({ loading: true, error: null });
    
    // Сохраняем промис загрузки
    this._loadingPromise = this._performLoad(id);
    
    try {
      await this._loadingPromise;
    } finally {
      this._loadingPromise = null;
    }
  }
  
  async _performLoad(id) {
    try {
      // Загружаем тип игрушки с embedded данными (для таксономий и изображений)
      // _embed=1 добавляет _embedded объект с связанными данными
      const res = await fetch(`/wp-json/wp/v2/toy_type/${id}?_embed=1`, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      
      // Извлекаем экземпляры из данных типа (максимум 50)
      // В Pods REST API экземпляры приходят как массив объектов в json.instances
      let instances = [];
      
      if (json.instances && Array.isArray(json.instances) && json.instances.length > 0) {
        // Фильтруем только опубликованные и ограничиваем до 50
        const filteredInstances = json.instances
          .filter(inst => {
            // Проверяем статус в разных форматах
            const status = inst.post_status || inst.status || 'publish';
            return status === 'publish';
          })
          .slice(0, 50);
        
        // Загружаем изображения и термины для экземпляров
        // В Pods REST API структура зависит от настроек и способа создания:
        // - Моковые данные: tube_condition как массив объектов с полными данными термина
        // - Реальные данные: tube_condition может быть false, а tube_conditions содержит ID
        instances = await Promise.all(filteredInstances.map(async (inst) => {
          // Клонируем объект экземпляра
          const instanceData = { ...inst };
          
          // Получаем ID изображения из _thumbnail_id
          if (instanceData._thumbnail_id && Array.isArray(instanceData._thumbnail_id) && instanceData._thumbnail_id.length > 0) {
            const thumbnailId = parseInt(instanceData._thumbnail_id[0], 10);
            if (thumbnailId && !isNaN(thumbnailId)) {
              try {
                // Загружаем данные изображения через Media API
                const mediaRes = await fetch(`/wp-json/wp/v2/media/${thumbnailId}`, { credentials: 'same-origin' });
                if (mediaRes.ok) {
                  const mediaData = await mediaRes.json();
                  instanceData._thumbnail_url = mediaData.source_url || mediaData.media_details?.sizes?.large?.source_url || '';
                }
              } catch (e) {
                console.warn('Failed to load thumbnail for instance:', e);
              }
            }
          }
          
          // Загружаем термины таксономий, если они не встроены (tube_condition = false)
          // В реальных данных Pods может не разворачивать термины в объекты
          if (!instanceData.tube_condition || instanceData.tube_condition === false) {
            const tubeConditionsId = instanceData.tube_conditions;
            if (tubeConditionsId && typeof tubeConditionsId === 'number') {
              try {
                // Загружаем термин таксономии по ID
                const termRes = await fetch(`/wp-json/wp/v2/tube_condition/${tubeConditionsId}`, { credentials: 'same-origin' });
                if (termRes.ok) {
                  const termData = await termRes.json();
                  // Преобразуем в формат массива объектов для единообразия
                  instanceData.tube_condition = [{
                    term_id: String(termData.id),
                    name: termData.name,
                    slug: termData.slug,
                    taxonomy: 'tube_condition',
                    id: termData.id
                  }];
                }
              } catch (e) {
                console.warn('Failed to load tube_condition term:', e);
              }
            }
          }
          
          return instanceData;
        }));
      }
      
      this.setState({ data: json, instances });
      
      // Сохраняем данные в глобальный стейт для доступа других компонентов
      if (window.app && window.app.state) {
        // Извлекаем изображения для галереи и сохраняем отдельно
        const photos = json.toy_type_photos || json.meta?.toy_type_photos || [];
        const embeddedMedia = json._embedded?.['wp:attachment'] || [];
        const featuredMedia = json._embedded?.['wp:featuredmedia'] || [];
        const allMedia = [...embeddedMedia, ...featuredMedia];
        
        const images = photos.map(photoId => {
          const photoIdNum = Array.isArray(photoId) && photoId.ID ? photoId.ID : photoId;
          const mediaObj = allMedia.find(m => m.id === photoIdNum || m.media_details?.id === photoIdNum);
          if (mediaObj) {
            return {
              url: mediaObj.source_url || '',
              thumbnail: mediaObj.media_details?.sizes?.thumbnail?.source_url || mediaObj.source_url || '',
              alt: mediaObj.alt_text || mediaObj.title?.rendered || '',
              caption: mediaObj.caption?.rendered || ''
            };
          }
          return null;
        }).filter(img => img !== null);
        
        // Если нет фото из toy_type_photos, но есть featured_media
        if (images.length === 0 && featuredMedia.length > 0) {
          const featured = featuredMedia[0];
          images.push({
            url: featured.source_url || '',
            thumbnail: featured.media_details?.sizes?.thumbnail?.source_url || featured.source_url || '',
            alt: featured.alt_text || featured.title?.rendered || '',
            caption: featured.caption?.rendered || ''
          });
        }
        
        // Сохраняем данные типа в стейт
        window.app.state.currentPageData.toyType = json;
        // Сохраняем изображения отдельно через set для dispatch события
        window.app.state.set('toyType.images', images);
        
        // Dispatch события о загрузке данных типа
        const event = new CustomEvent('app-state-toy-type-loaded', {
          detail: {
            toyType: json,
            images: images
          }
        });
        window.dispatchEvent(event);
      }
    } catch (e) {
      this.setState({ error: e.message || 'Ошибка загрузки' });
    } finally {
      this.setState({ loading: false });
    }
  }

  onStateChanged(key) {
    if (key === 'id') {
      this.loadData();
    } else if (key === 'loading' || key === 'data' || key === 'error' || key === 'instances') {
      this.render();
    }
  }

  render() {
    this.innerHTML = toy_type_single_template(this.state);
  }
}

customElements.define('toy-type-single', ToyTypeSingle);

