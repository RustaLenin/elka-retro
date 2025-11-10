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
    instancesByStatus: { type: 'json', default: {}, attribute: null, internal: true },
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
      // Получаем названия полей из дата-модели
      const dataModel = window.data_model;
      if (!dataModel || !dataModel.post_types || !dataModel.post_types.toy_type) {
        console.warn('[toy-type-single] Data model not available, using fallback field names');
      }
      
      const toyTypeConfig = dataModel?.post_types?.toy_type || {};
      const toyInstanceConfig = dataModel?.post_types?.toy_instance || {};
      const toyTypeFields = toyTypeConfig.fields || {};
      const toyInstanceFields = toyInstanceConfig.fields || {};
      
      // Получаем названия полей для REST API (используем slug напрямую)
      const photosField = toyTypeFields.toy_type_photos?.slug || 'toy_type_photos';
      const instancesField = toyTypeFields.instances?.slug || 'instances';
      
      // Загружаем тип игрушки с embedded данными (для таксономий и изображений)
      // _embed=1 добавляет _embedded объект с связанными данными
      const res = await fetch(`/wp-json/wp/v2/toy_type/${id}?_embed=1`, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      
      // Извлекаем экземпляры из данных типа (максимум 50)
      // В Pods REST API экземпляры приходят как массив объектов в json.instances
      // Используем название поля из дата-модели
      let instances = [];
      const instancesData = json[instancesField] || json.instances || [];
      
      let instancesByStatus = {
        available: [],    // publish - Доступные
        reserved: [],     // reserved - Забронированные
        sold: []          // sold - Продано
      };
      
      if (instancesData && Array.isArray(instancesData) && instancesData.length > 0) {
        // Разделяем экземпляры по статусам
        
        // Группируем экземпляры по статусам
        instancesData.forEach(inst => {
          const status = inst.post_status || inst.status || 'publish';
          if (status === 'publish') {
            instancesByStatus.available.push(inst);
          } else if (status === 'reserved') {
            instancesByStatus.reserved.push(inst);
          } else if (status === 'sold') {
            instancesByStatus.sold.push(inst);
          }
        });
        
        // Ограничиваем количество в каждой группе до 50
        instancesByStatus.available = instancesByStatus.available.slice(0, 50);
        instancesByStatus.reserved = instancesByStatus.reserved.slice(0, 50);
        instancesByStatus.sold = instancesByStatus.sold.slice(0, 50);
        
        // Объединяем все экземпляры для обработки (загрузка изображений и терминов)
        const allInstances = [
          ...instancesByStatus.available,
          ...instancesByStatus.reserved,
          ...instancesByStatus.sold
        ];
        
        // Загружаем изображения и термины для экземпляров
        // В Pods REST API структура зависит от настроек и способа создания:
        // - Моковые данные: tube_condition как массив объектов с полными данными термина
        // - Реальные данные: tube_condition может быть false, а tube_conditions содержит ID
        const processedInstances = await Promise.all(allInstances.map(async (inst) => {
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
          
          // Загружаем термины таксономий, используя правильные названия полей из дата-модели
          // В REST API поле приходит как tube_condition_field (не tube_condition или tube_conditions)
          const tubeConditionFieldSlug = toyInstanceFields.tube_condition_field?.slug || 'tube_condition_field';
          const tubeConditionData = instanceData[tubeConditionFieldSlug] || instanceData.tube_condition_field || instanceData.tube_condition || false;
          
          // Нормализуем данные tube_condition
          if (!tubeConditionData || tubeConditionData === false) {
            // Пробуем альтернативные названия полей (для обратной совместимости)
            const altField = instanceData.tube_conditions || instanceData.tube_condition;
            if (altField && typeof altField === 'number') {
              try {
                // Загружаем термин таксономии по ID
                const termRes = await fetch(`/wp-json/wp/v2/tube_condition/${altField}`, { credentials: 'same-origin' });
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
          } else if (Array.isArray(tubeConditionData) && tubeConditionData.length > 0) {
            // Если это уже массив объектов - нормализуем
            instanceData.tube_condition = tubeConditionData.map(term => {
              if (typeof term === 'object' && term !== null) {
                return term;
              } else if (typeof term === 'number') {
                // Это ID, нужно загрузить отдельно (но для MVP можем пропустить)
                return null;
              }
              return null;
            }).filter(t => t !== null);
          } else if (typeof tubeConditionData === 'object' && tubeConditionData !== null) {
            // Если это один объект - оборачиваем в массив
            instanceData.tube_condition = [tubeConditionData];
          }
          
          // Загружаем состояние (condition) из дата-модели (condition_field)
          const conditionFieldSlug = toyInstanceFields.condition_field?.slug || 'condition_field';
          const conditionData = instanceData[conditionFieldSlug] || instanceData.condition_field || instanceData.condition || false;
          
          // Используем предзагруженные термины из window.taxonomy_terms
          const taxonomyTerms = window.taxonomy_terms?.condition || {};
          
          // Нормализуем данные condition
          if (!conditionData || conditionData === false) {
            // Пробуем альтернативные названия полей (для обратной совместимости)
            const altField = instanceData.conditions || instanceData.condition;
            if (altField && typeof altField === 'number') {
              const termData = taxonomyTerms[altField];
              if (termData) {
                instanceData.condition = [{
                  term_id: String(termData.id),
                  name: termData.name,
                  slug: termData.slug,
                  taxonomy: 'condition',
                  id: termData.id
                }];
              } else {
                console.warn(`[toy-type-single] Condition term ${altField} not found in preloaded terms`);
              }
            }
          } else if (typeof conditionData === 'number') {
            // Если это число (ID) - используем предзагруженные данные
            const termData = taxonomyTerms[conditionData];
            if (termData) {
              instanceData.condition = [{
                term_id: String(termData.id),
                name: termData.name,
                slug: termData.slug,
                taxonomy: 'condition',
                id: termData.id
              }];
            } else {
              console.warn(`[toy-type-single] Condition term ${conditionData} not found in preloaded terms`);
            }
          } else if (Array.isArray(conditionData) && conditionData.length > 0) {
            // Если это уже массив - нормализуем
            instanceData.condition = conditionData.map(term => {
              if (typeof term === 'object' && term !== null) {
                // Уже объект с данными
                return term;
              } else if (typeof term === 'number') {
                // Это ID, используем предзагруженные данные
                const termData = taxonomyTerms[term];
                if (termData) {
                  return {
                    term_id: String(termData.id),
                    name: termData.name,
                    slug: termData.slug,
                    taxonomy: 'condition',
                    id: termData.id
                  };
                }
                console.warn(`[toy-type-single] Condition term ${term} not found in preloaded terms`);
                return null;
              }
              return null;
            }).filter(t => t !== null);
          } else if (typeof conditionData === 'object' && conditionData !== null) {
            // Если это один объект - оборачиваем в массив
            instanceData.condition = [conditionData];
          }
          
          return instanceData;
        }));
        
        // Разделяем обработанные экземпляры обратно по статусам
        const processedByStatus = {
          available: [],
          reserved: [],
          sold: []
        };
        
        processedInstances.forEach(inst => {
          const status = inst.post_status || inst.status || 'publish';
          if (status === 'publish') {
            processedByStatus.available.push(inst);
          } else if (status === 'reserved') {
            processedByStatus.reserved.push(inst);
          } else if (status === 'sold') {
            processedByStatus.sold.push(inst);
          }
        });
        
        // Сохраняем разделенные экземпляры
        instances = processedByStatus.available; // Для обратной совместимости
        instancesByStatus = processedByStatus;
      }
      
      this.setState({ data: json, instances, instancesByStatus });
      
      // Сохраняем данные в глобальный стейт для доступа других компонентов
      if (window.app && window.app.state) {
        // Извлекаем изображения для галереи и сохраняем отдельно
        // Используем название поля из дата-модели
        const photos = json[photosField] || json.meta?.[photosField] || json.toy_type_photos || json.meta?.toy_type_photos || [];
        const embeddedMedia = json._embedded?.['wp:attachment'] || [];
        const featuredMedia = json._embedded?.['wp:featuredmedia'] || [];
        const allMedia = [...embeddedMedia, ...featuredMedia];
        
        const allImages = [];
        
        // Первое изображение - это всегда featured_media (миниатюра WP)
        if (featuredMedia.length > 0) {
          const featured = featuredMedia[0];
          allImages.push({
            url: featured.source_url || '',
            thumbnail: featured.media_details?.sizes?.thumbnail?.source_url || featured.source_url || '',
            alt: featured.alt_text || featured.title?.rendered || '',
            caption: featured.caption?.rendered || ''
          });
        }
        
        // Остальные изображения - из toy_type_photos
        // В Pods REST API может приходить как массив ID или массив объектов с ID
        const photosToProcess = photos.map(photoItem => {
          // Обрабатываем разные форматы данных
          let photoIdNum = null;
          
          if (typeof photoItem === 'number') {
            // Просто ID
            photoIdNum = photoItem;
          } else if (typeof photoItem === 'object' && photoItem !== null) {
            // Объект с ID (может быть {ID: 123} или {id: 123})
            photoIdNum = photoItem.ID || photoItem.id || photoItem.media_id || null;
          } else if (Array.isArray(photoItem) && photoItem.length > 0) {
            // Массив, берем первый элемент
            photoIdNum = typeof photoItem[0] === 'number' ? photoItem[0] : (photoItem[0]?.ID || photoItem[0]?.id || null);
          }
          
          if (!photoIdNum) return null;
          
          // Пропускаем featured_media, если он уже добавлен
          if (featuredMedia.length > 0 && photoIdNum === featuredMedia[0].id) {
            return null;
          }
          
          // Ищем медиа объект в embedded данных
          const mediaObj = allMedia.find(m => {
            const mediaId = m.id || m.media_details?.id;
            return mediaId === photoIdNum || mediaId === parseInt(photoIdNum, 10);
          });
          
          if (mediaObj) {
            return {
              url: mediaObj.source_url || '',
              thumbnail: mediaObj.media_details?.sizes?.thumbnail?.source_url || mediaObj.source_url || '',
              alt: mediaObj.alt_text || mediaObj.title?.rendered || '',
              caption: mediaObj.caption?.rendered || ''
            };
          }
          
          // Если не нашли в embedded, нужно загрузить отдельно
          return { _needsLoad: true, _id: photoIdNum };
        }).filter(img => img !== null);
        
        // Разделяем на готовые и те, что нужно загрузить
        const readyPhotos = photosToProcess.filter(p => !p._needsLoad);
        const photosToLoad = photosToProcess.filter(p => p._needsLoad);
        
        // Загружаем недостающие изображения через Media API
        if (photosToLoad.length > 0) {
          const loadedPhotos = await Promise.all(
            photosToLoad.map(async ({ _id }) => {
              try {
                const mediaRes = await fetch(`/wp-json/wp/v2/media/${_id}`, { credentials: 'same-origin' });
                if (!mediaRes.ok) return null;
                const mediaData = await mediaRes.json();
                return {
                  url: mediaData.source_url || '',
                  thumbnail: mediaData.media_details?.sizes?.thumbnail?.source_url || mediaData.source_url || '',
                  alt: mediaData.alt_text || mediaData.title?.rendered || '',
                  caption: mediaData.caption?.rendered || ''
                };
              } catch (e) {
                console.warn(`[toy-type-single] Failed to load media ${_id}:`, e);
                return null;
              }
            })
          );
          
          // Фильтруем null и добавляем загруженные фото
          const validLoadedPhotos = loadedPhotos.filter(img => img !== null);
          allImages.push(...readyPhotos, ...validLoadedPhotos);
        } else {
          // Если все фото уже готовы, просто добавляем их
          allImages.push(...readyPhotos);
        }
        
        // Сохраняем данные типа в стейт
        // Используем setData для массового обновления, чтобы гарантировать правильную структуру
        if (!window.app.state.currentPageData.toyType) {
          window.app.state.currentPageData.toyType = {};
        }
        Object.assign(window.app.state.currentPageData.toyType, json);
        
        // Сохраняем все изображения в отдельный атрибут all_images
        // Это вызовет событие app-state-changed, на которое подпишется галерея
        window.app.state.set('toyType.all_images', allImages);
        
        // MVP: сохраняем только первое изображение (featured image) для галереи
        window.app.state.set('toyType.featured_image', allImages.length > 0 ? [allImages[0]] : []);
        
        // Dispatch события о загрузке данных типа
        const event = new CustomEvent('app-state-toy-type-loaded', {
          detail: {
            toyType: json,
            images: allImages,
            all_images: allImages
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
    } else if (key === 'loading' || key === 'data' || key === 'error' || key === 'instances' || key === 'instancesByStatus') {
      this.render();
    }
  }

  render() {
    this.innerHTML = toy_type_single_template(this.state);
  }
}

customElements.define('toy-type-single', ToyTypeSingle);

