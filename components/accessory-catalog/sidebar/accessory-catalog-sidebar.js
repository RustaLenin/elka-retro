/**
 * Accessory Catalog Sidebar Controller
 * 
 * Responsibilities:
 * - Рендеринг групп фильтров на основе данных из accessory-filter-registry
 * - Коммуникация изменений фильтров обратно в accessory-catalog-page через стор
 * - Управление развёрнутыми/свёрнутыми состояниями, действиями сброса
 * - Интеграция с UI Form Kit для динамических фильтров
 * 
 * Dependencies:
 * - accessory-catalog-store.js - для получения и обновления состояния
 * - accessory-filter-registry.js - генерация конфигураций фильтров
 */

import { renderSidebarShell, renderActionButtons } from './sidebar-template.js';
import { getAccessoryFilters, getFilterKey, createFilterFieldConfig } from './accessory-filter-registry.js';
import { createAccessoryCatalogFiltersFormConfig, ACCESSORY_CATALOG_FILTERS_FORM_KEY, normalizeFormValuesForStore } from '../../../app/forms/accessory-catalog-filters-factory.js';
import { notify } from '../../ui-kit/notification/notification.js';
import { initAccessoryCategoryFilter } from './shared-category-filter.js';

// Загружаем стили сразу при импорте модуля
if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./sidebar-styles.css', import.meta.url));
}

/**
 * Accessory Catalog Sidebar Controller
 * 
 * Компонент использует публичный API window.app.accessoryCatalog вместо прямого доступа к стору
 * Слушает события elkaretro:accessory-catalog:updated для реактивного обновления UI
 */
export default class AccessoryCatalogSidebar {
  constructor(options = {}) {
    this.options = options;
    this.container = null;
    
    // Ссылки на компоненты
    this.categoryFilter = null;
    this.formController = null;
    this.unsubscribeStore = null;
    
    // Ссылки на DOM элементы
    this.categoryContainer = null;
    this.filtersContainer = null;
    this.resetButtonContainer = null;
    this._formFieldsConfig = [];
    
    // Состояние для debounce кнопки применения фильтров
    this.debounceTimer = null;
    this.countdownInterval = null;
    this.countdownSeconds = 0;
    this.applyButton = null;
    
    // Обработчик событий каталога
    this._handleCatalogUpdate = (event) => {
      this._onCatalogStateChange(event.detail);
    };
  }

  /**
   * Инициализация сайдбара
   * @param {HTMLElement} container - Контейнер для рендеринга сайдбара
   */
  async init(container) {
    if (!container) {
      throw new Error('[accessory-catalog-sidebar] Container element is required');
    }

    this.container = container;

    // Рендерим структуру сайдбара
    this.container.innerHTML = renderSidebarShell();

    // Находим контейнеры для компонентов
    this.categoryContainer = this.container.querySelector('[data-accessory-sidebar-category]');
    this.filtersContainer = this.container.querySelector('[data-accessory-sidebar-filters]');
    this.resetButtonContainer = this.container.querySelector('[data-accessory-sidebar-actions]');

    if (!this.filtersContainer || !this.resetButtonContainer) {
      console.error('[accessory-catalog-sidebar] Required containers not found after render');
      return;
    }

    // Инициализируем фильтр категорий
    if (this.categoryContainer) {
      this.categoryFilter = initAccessoryCategoryFilter(this.categoryContainer);
      
      // Обрабатываем событие разворота фильтра категорий
      if (this.categoryFilter && this.categoryFilter.getElement()) {
        this.categoryFilter.getElement().addEventListener('category-filter:expanded', (event) => {
          this._handleCategoryFilterExpanded(event.detail.isExpanded);
        });
      }
    }

    // Подписываемся на события каталога для реактивного обновления UI
    window.addEventListener('elkaretro:accessory-catalog:updated', this._handleCatalogUpdate);
    this.unsubscribeStore = () => {
      window.removeEventListener('elkaretro:accessory-catalog:updated', this._handleCatalogUpdate);
    };

    // Отслеживаем предыдущие значения для сравнения
    this._previousFilters = null;

    // Первоначальная загрузка фильтров
    const currentState = window.app?.accessoryCatalog?.getState();
    
    // Инициализируем предыдущие значения
    this._previousFilters = JSON.stringify(currentState?.filters || {});
    
    // Загружаем фильтры
    await this.updateFilters();
    
    // Обновляем кнопку сброса, если есть состояние
    if (currentState) {
      this.updateResetButton(currentState);
    }
  }

  /**
   * Обновить фильтры
   * @private
   */
  async updateFilters() {
    if (!this.filtersContainer) {
      return;
    }

    // Проверяем, что window.data_model доступен
    if (typeof window === 'undefined' || !window.data_model) {
      setTimeout(() => {
        this.updateFilters().catch(() => {
          // Silently handle retry errors
        });
      }, 500);
      return;
    }

    // Уничтожаем предыдущий контроллер формы, если есть
    if (this.formController) {
      if (this.filtersContainer.contains(this.formController)) {
        this.filtersContainer.removeChild(this.formController);
      }
      this.formController = null;
    }

    // Получаем текущее состояние из API
    const currentState = window.app?.accessoryCatalog?.getState();
    const currentFilters = currentState?.filters || {};

    // Генерируем конфигурацию формы через фабрику
    const formConfig = await createAccessoryCatalogFiltersFormConfig();
    this._formFieldsConfig = Array.isArray(formConfig.fields) ? formConfig.fields : [];

    // Проверяем, что у нас есть поля для отображения
    if (!formConfig.fields || formConfig.fields.length === 0) {
      this.filtersContainer.innerHTML = `
        <div class="accessory-catalog-sidebar__empty-filters">
          <p>Нет доступных фильтров.</p>
        </div>
      `;
      this.formController = null;
      return;
    }

    // Инициализируем window.app.forms, если его нет
    if (!window.app) {
      window.app = {};
    }
    if (!window.app.forms) {
      window.app.forms = {};
    }

    // Регистрируем конфигурацию в window.app.forms
    const configPath = `window.app.forms.${ACCESSORY_CATALOG_FILTERS_FORM_KEY}`;
    window.app.forms[ACCESSORY_CATALOG_FILTERS_FORM_KEY] = formConfig;

    // Очищаем контейнер
    this.filtersContainer.innerHTML = '';

    // Рендерим форму с config-path
    this.filtersContainer.innerHTML = `
      <ui-form-controller config-path="${configPath}"></ui-form-controller>
    `;

    // Находим элемент формы после рендера
    this.formController = this.filtersContainer.querySelector('ui-form-controller');

    if (!this.formController) {
      return;
    }

    // Ждём инициализации формы
    try {
      await customElements.whenDefined('ui-form-controller');
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      
      // Синхронизируем значения из стора
      if (formConfig.values && Object.keys(formConfig.values).length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        
        Object.entries(formConfig.values).forEach(([fieldId, value]) => {
          if (value !== null && value !== undefined) {
            const field = this.formController.getField(fieldId);
            if (field && typeof field.setValue === 'function') {
              try {
                if (Array.isArray(value)) {
                  field.setValue(value);
                } else {
                  field.setValue(value);
                }
              } catch (error) {
                // Silently handle errors
              }
            }
          }
        });
      }
    } catch (error) {
      // Silently handle initialization errors
    }

    // Настраиваем обработчики
    this.setupFormHandlers();
    this._captureDraftFilters();
  }

  /**
   * Обработчик изменений состояния каталога через события
   * @param {Object} detail - Детали события elkaretro:accessory-catalog:updated
   * @private
   */
  _onCatalogStateChange(detail) {
    if (!detail || !detail.state) {
      return;
    }

    const catalogState = detail.state;

    // Обновляем кнопку сброса при любых изменениях
    this.updateResetButton(catalogState);

    // Синхронизируем значения формы при изменении фильтров извне (URL, программно)
    const currentFilters = JSON.stringify(catalogState.filters || {});
    if (currentFilters !== this._previousFilters) {
      this._previousFilters = currentFilters;
      this.syncFormValues(catalogState.filters || {});
    }
  }

  /**
   * Обновить кнопки действий (Применить фильтры, Сбросить)
   * @param {Object} catalogState - Текущее состояние каталога
   * @private
   */
  updateResetButton(catalogState) {
    if (!this.resetButtonContainer) {
      return;
    }

    // Проверяем, есть ли активные фильтры
    const hasActiveFilters =
      Object.keys(catalogState.filters || {}).length > 0 ||
      (catalogState.search && catalogState.search.trim() !== '');

    // Рендерим кнопки действий
    this.resetButtonContainer.innerHTML = renderActionButtons({ hasActiveFilters });

    // Подключаем обработчик клика на кнопку применения фильтров
    this.applyButton = this.resetButtonContainer.querySelector('[data-apply-filters]');
    if (this.applyButton) {
      this.applyButton.addEventListener('click', () => this.applyFilters());
    }

    // Подключаем обработчик клика на кнопку сброса
    const resetButton = this.resetButtonContainer.querySelector('[data-reset-filters]');
    if (resetButton) {
      resetButton.addEventListener('click', () => this.resetFilters());
    }
  }

  /**
   * Остановить обратный отсчёт для кнопки применения фильтров
   * @private
   */
  _stopCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    this.countdownSeconds = 0;
    this._updateApplyButton();
  }

  /**
   * Запустить обратный отсчёт для кнопки применения фильтров
   * @private
   */
  _startCountdown() {
    this._stopCountdown();
    const debounceMs = 10000; // 10 секунд
    this.countdownSeconds = Math.ceil(debounceMs / 1000);
    this._updateApplyButton();

    this.countdownInterval = setInterval(() => {
      this.countdownSeconds--;
      if (this.countdownSeconds <= 0) {
        this._stopCountdown();
      } else {
        this._updateApplyButton();
      }
    }, 1000);
  }

  /**
   * Обновить состояние кнопки применения фильтров
   * @private
   */
  _updateApplyButton() {
    if (!this.applyButton) {
      return;
    }

    if (this.countdownSeconds > 0) {
      const label = `Применить фильтры (${this.countdownSeconds})`;
      
      if (this.applyButton.setState) {
        this.applyButton.setState({ label, disabled: false });
      } else {
        this.applyButton.setAttribute('label', label);
        this.applyButton.removeAttribute('disabled');
      }
      this.applyButton.setAttribute('data-countdown', 'true');
    } else {
      if (this.applyButton.setState) {
        this.applyButton.setState({ label: 'Применить фильтры', disabled: false });
      } else {
        this.applyButton.setAttribute('label', 'Применить фильтры');
        this.applyButton.removeAttribute('disabled');
      }
      this.applyButton.removeAttribute('data-countdown');
    }
  }

  /**
   * Применить фильтры (немедленная отправка формы без ожидания debounce)
   * @private
   */
  applyFilters() {
    if (!this.formController) {
      return;
    }
    
    // Останавливаем таймер и обратный отсчёт
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this._stopCountdown();
    
    // Получаем конфигурации фильтров
    const filterConfigs = getAccessoryFilters();
    
    // Преобразуем значения формы в формат стора
    const filters = {};
    
    // Получаем значения напрямую из полей формы
    if (Array.isArray(filterConfigs)) {
      filterConfigs.forEach((filterConfig) => {
        const filterKey = filterConfig.key;
        
        // Получаем поле и его актуальное значение
        const field = this.formController.getField ? this.formController.getField(filterConfig.key) : null;
        if (!field) {
          return;
        }
        
        const formValue = field && typeof field.value === 'function' ? field.value() : null;
        
        // Нормализуем значение для стора
        let storeValue = null;
        
        if (formValue !== null && formValue !== undefined && formValue !== '') {
          if (filterConfig.type === 'select-multi') {
            if (Array.isArray(formValue) && formValue.length > 0) {
              storeValue = formValue
                .map(v => String(v).trim())
                .filter(v => v !== '');
            }
          } else {
            const normalized = String(formValue).trim();
            if (normalized !== '') {
              storeValue = [normalized];
            }
          }
        }
        
        if (storeValue !== null && storeValue.length > 0) {
          filters[filterKey] = storeValue;
        }
      });
    }
    
    // Получаем значения из фильтра категорий
    const categoryValues = this.categoryFilter && this.categoryFilter.getValue ? this.categoryFilter.getValue() : [];
    
    // Добавляем категории, если они выбраны
    if (categoryValues && categoryValues.length > 0) {
      // Категории должны возвращаться как ID, но на всякий случай конвертируем в строки
      filters['ny_category'] = categoryValues.map(v => String(v));
    }
    
    // Обновляем фильтры через публичный API
    if (window.app && window.app.accessoryCatalog) {
      window.app.accessoryCatalog.setFilters(filters);
    } else {
      console.warn('[accessory-catalog-sidebar] window.app.accessoryCatalog not available');
    }
  }
  
  /**
   * Обработчик разворота/сворачивания фильтра категорий
   * @param {boolean} isExpanded - Развёрнут ли фильтр
   * @private
   */
  _handleCategoryFilterExpanded(isExpanded) {
    // Можно добавить логику скрытия/показа других фильтров при развороте категорий
    // Пока оставляем пустым, так как у аксессуаров нет такого требования
  }

  /**
   * Настроить обработчики формы после подключения к DOM
   * @private
   */
  setupFormHandlers() {
    if (!this.formController) {
      return;
    }

    // Подписываемся на события формы
    this.formController.addEventListener('ui-form:success', (event) => {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
      this._stopCountdown();
      this._clearDraftFilters();
      notify('success', 'Фильтры обновлены');
    });

    this.formController.addEventListener('ui-form:invalid', (event) => {
      console.warn('[accessory-catalog-sidebar] Form validation failed', event.detail);
    });

    // Отслеживаем изменения в форме для запуска debounce таймера
    this.formController.addEventListener('ui-form:change', () => {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      this._startCountdown();
      this._captureDraftFilters();
      
      // Устанавливаем таймер для автоматической отправки
      this.debounceTimer = setTimeout(() => {
        if (typeof this.formController.submit === 'function') {
          this.formController.submit();
        }
        this.debounceTimer = null;
      }, 10000); // 10 секунд
    });
  }

  /**
   * Синхронизировать значения формы с фильтрами из стора
   * @param {Object} filters - Фильтры из стора { filterKey: [values] }
   * @private
   */
  async syncFormValues(filters) {
    if (!this.formController) {
      return;
    }

    // Получаем конфигурации фильтров
    const filterConfigs = getAccessoryFilters();
    
    if (!Array.isArray(filterConfigs) || filterConfigs.length === 0) {
      return;
    }

    // Синхронизируем категории отдельно
    if (this.categoryFilter && this.categoryFilter.setValue) {
      const categoryValue = filters['ny_category'];
      if (categoryValue !== undefined && categoryValue !== null) {
        this.categoryFilter.setValue(Array.isArray(categoryValue) ? categoryValue : [categoryValue]);
      } else {
        this.categoryFilter.setValue([]);
      }
    }
    
    // Синхронизируем значения через публичный API формы
    filterConfigs.forEach((filterConfig) => {
      const filterKey = filterConfig.key;
      // Пропускаем категории, они обрабатываются отдельно
      if (filterKey === 'ny_category') {
        return;
      }
      
      const filterValue = filters[filterKey];
      
      if (filterValue !== undefined && filterValue !== null) {
        const field = this.formController.getField(filterConfig.key);
        
        if (field) {
          let normalizedValue = null;
          
          if (Array.isArray(filterValue) && filterValue.length > 0) {
            // Для таксономий конвертируем slug в ID если нужно
            if ((filterConfig.type === 'select-single' || filterConfig.type === 'select-multi') && filterConfig.dataSource) {
              const dataSource = filterConfig.dataSource;
              if (dataSource.path && dataSource.path.startsWith('taxonomy_terms.')) {
                const taxonomySlug = dataSource.path.replace('taxonomy_terms.', '');
                const taxonomyTerms = window.taxonomy_terms?.[taxonomySlug];
                
                if (taxonomyTerms) {
                  const convertedValues = filterValue.map((value) => {
                    if (!isNaN(parseInt(value, 10)) && /^\d+$/.test(String(value))) {
                      return String(value);
                    }
                    
                    const foundTerm = Object.values(taxonomyTerms).find(term => term && term.slug === value);
                    return foundTerm ? String(foundTerm.id) : value;
                  });
                  
                  if (filterConfig.type === 'select-single') {
                    normalizedValue = convertedValues[0];
                  } else {
                    normalizedValue = convertedValues;
                  }
                } else {
                  if (filterConfig.type === 'select-single') {
                    normalizedValue = filterValue[0];
                  } else {
                    normalizedValue = filterValue;
                  }
                }
              } else {
                if (filterConfig.type === 'select-single') {
                  normalizedValue = filterValue[0];
                } else {
                  normalizedValue = filterValue;
                }
              }
            } else {
              if (filterConfig.type === 'select-single') {
                normalizedValue = filterValue[0];
              } else if (filterConfig.type === 'select-multi') {
                normalizedValue = filterValue;
              } else {
                normalizedValue = filterValue[0];
              }
            }
          }
          
          if (normalizedValue !== null) {
            field.setValue(normalizedValue);
          } else {
            field.reset();
          }
        }
      } else {
        const field = this.formController.getField(filterConfig.key);
        if (field) {
          field.reset();
        }
      }
    });
  }

  /**
   * Сбросить все фильтры
   */
  resetFilters() {
    if (window.app && window.app.accessoryCatalog) {
      window.app.accessoryCatalog.resetFilters();
    }

    if (this.formController && typeof this.formController.clear === 'function') {
      this.formController.clear();
    }

    // Сбрасываем категории
    if (this.categoryFilter && this.categoryFilter.setValue) {
      this.categoryFilter.setValue([]);
    }

    this._clearDraftFilters();
  }

  /**
   * Захватить draft фильтры из формы для предпросмотра
   * @private
   */
  _captureDraftFilters() {
    if (!this.formController || !window.app?.accessoryCatalogStore) {
      return;
    }

    try {
      const formValues = this.formController.getValues ? this.formController.getValues() : {};
      const filterConfigs = getAccessoryFilters();
      const draftFilters = normalizeFormValuesForStore(formValues, filterConfigs);
      
      window.app.accessoryCatalogStore.setDraftFilters(draftFilters);
    } catch (error) {
      // Silently handle errors
    }
  }

  /**
   * Очистить draft фильтры
   * @private
   */
  _clearDraftFilters() {
    if (window.app?.accessoryCatalogStore) {
      window.app.accessoryCatalogStore.setDraftFilters(null);
    }
  }

  /**
   * Уничтожить компонент (очистка подписок и ссылок)
   */
  destroy() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this._stopCountdown();

    if (this.categoryFilter) {
      if (typeof this.categoryFilter.destroy === 'function') {
        this.categoryFilter.destroy();
      }
      this.categoryFilter = null;
    }

    if (this.formController) {
      if (this.filtersContainer && this.filtersContainer.contains(this.formController)) {
        this.filtersContainer.removeChild(this.formController);
      }
      this.formController = null;
    }

    this._clearDraftFilters();

    if (typeof this.unsubscribeStore === 'function') {
      this.unsubscribeStore();
      this.unsubscribeStore = null;
    }

    this.container = null;
    this.filtersContainer = null;
    this.resetButtonContainer = null;
    this.applyButton = null;
    this._formFieldsConfig = [];
  }
}

