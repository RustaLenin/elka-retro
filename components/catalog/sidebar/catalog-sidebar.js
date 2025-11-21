/**
 * Catalog sidebar controller.
 *
 * Responsibilities:
 * - Рендеринг переключателя режимов и групп фильтров на основе активного режима
 * - Коммуникация изменений фильтров обратно в catalog-page через стор
 * - Управление развёрнутыми/свёрнутыми состояниями, действиями сброса
 * - Интеграция с UI Form Kit для динамических фильтров
 *
 * Dependencies:
 * - catalog-store.js - для получения и обновления состояния
 * - mode-toggle.js - переключатель режимов
 * - filter-registry.js - генерация конфигураций фильтров
 * - type-filters.js / instance-filters.js - специфичные фильтры для режимов
 */

import { createModeToggle } from './mode-toggle.js';
import { renderSidebarShell, renderActionButtons } from './sidebar-template.js';
import { getFilterKey, getFiltersForMode } from './filter-registry.js';
import { createCatalogFiltersFormConfig, CATALOG_FILTERS_FORM_KEY } from '../../../app/forms/catalog-filters-factory.js';
import { notify } from '../../ui-kit/notification/notification.js';
import { initSharedCategoryFilter } from './shared-category-filter.js';

// Загружаем стили сразу при импорте модуля
if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./sidebar-styles.css', import.meta.url));
}

/**
 * Catalog Sidebar Controller
 * 
 * Компонент использует публичный API window.app.catalog вместо прямого доступа к стору
 * Слушает события elkaretro:catalog:updated для реактивного обновления UI
 */
export default class CatalogSidebar {
  constructor(options = {}) {
    this.options = options;
    this.container = null;
    
    // Ссылки на компоненты
    this.modeToggle = null;
    this.categoryFilter = null;
    this.formController = null;
    this.unsubscribeStore = null;
    
    // Ссылки на DOM элементы
    this.modeToggleContainer = null;
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
  init(container) {
    if (!container) {
      throw new Error('[catalog-sidebar] Container element is required');
    }

    this.container = container;

    // Рендерим структуру сайдбара
    this.container.innerHTML = renderSidebarShell();

    // Находим контейнеры для компонентов
    this.modeToggleContainer = this.container.querySelector('[data-sidebar-mode-toggle]');
    this.categoryContainer = this.container.querySelector('[data-sidebar-category]');
    this.filtersContainer = this.container.querySelector('[data-sidebar-filters]');
    this.resetButtonContainer = this.container.querySelector('[data-sidebar-actions]');

    if (!this.modeToggleContainer || !this.filtersContainer) {
      console.error('[catalog-sidebar] Required containers not found after render');
      return;
    }

    // Инициализируем переключатель режимов
    this.modeToggle = createModeToggle({
      container: this.modeToggleContainer,
      onChange: (newMode, prevMode) => {
        // При смене режима обновляем фильтры
        this.updateFiltersForMode(newMode);
      },
    });
    this.modeToggle.render();

    // Инициализируем фильтр категорий
    if (this.categoryContainer) {
      this.categoryFilter = initSharedCategoryFilter(this.categoryContainer);
      
      // Обрабатываем событие разворота фильтра категорий
      if (this.categoryFilter && this.categoryFilter.getElement()) {
        this.categoryFilter.getElement().addEventListener('category-filter:expanded', (event) => {
          this._handleCategoryFilterExpanded(event.detail.isExpanded);
        });
      }
    }

    // Подписываемся на события каталога для реактивного обновления UI
    window.addEventListener('elkaretro:catalog:updated', this._handleCatalogUpdate);
    this.unsubscribeStore = () => {
      window.removeEventListener('elkaretro:catalog:updated', this._handleCatalogUpdate);
    };

    // Отслеживаем предыдущие значения для сравнения
    this._previousMode = null;
    this._previousFilters = null;

    // Первоначальная загрузка фильтров для текущего режима
    const currentState = window.app?.catalog?.getState();
    const currentMode = currentState?.mode || 'type';
    
    // Инициализируем предыдущие значения
    this._previousMode = currentMode;
    this._previousFilters = JSON.stringify(currentState?.filters || {});
    
    // Загружаем фильтры для текущего режима (даже если currentState == null)
    this.updateFiltersForMode(currentMode).catch((error) => {
      console.error('[catalog-sidebar] Error loading initial filters:', error);
    });
    
    // Обновляем кнопку сброса, если есть состояние
    if (currentState) {
      this.updateResetButton(currentState);
    }
  }

  /**
   * Обновить фильтры для указанного режима
   * @param {string} mode - 'type' | 'instance'
   * @private
   */
  async updateFiltersForMode(mode) {
    if (!this.filtersContainer) {
      return;
    }

    // Проверяем, что window.data_model доступен (нужен для filter-registry)
    if (typeof window === 'undefined' || !window.data_model) {
      // Повторяем попытку через 500ms
      setTimeout(() => {
        this.updateFiltersForMode(mode).catch(() => {
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

    // Получаем текущее состояние из API для передачи в фабрику
    const currentState = window.app?.catalog?.getState();
    const currentFilters = currentState?.filters || {};

    // Генерируем конфигурацию формы через фабрику
    const formConfig = await createCatalogFiltersFormConfig(mode, currentFilters);
    this._formFieldsConfig = Array.isArray(formConfig.fields) ? formConfig.fields : [];

    // Проверяем, что у нас есть поля для отображения
    if (!formConfig.fields || formConfig.fields.length === 0) {
      this.filtersContainer.innerHTML = `
        <div class="catalog-sidebar__empty-filters">
          <p>Нет доступных фильтров для режима "${mode === 'type' ? 'Типы игрушек' : 'Экземпляры'}".</p>
        </div>
      `;
      // Очищаем ссылку на форму
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
    const configPath = `window.app.forms.${CATALOG_FILTERS_FORM_KEY}`;
    window.app.forms[CATALOG_FILTERS_FORM_KEY] = formConfig;

    // Очищаем контейнер
    this.filtersContainer.innerHTML = '';

    // Рендерим форму с config-path (поля рендерятся автоматически из конфигурации)
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
      // Дополнительная задержка для полной инициализации
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      
      // ВАЖНО: После инициализации формы синхронизируем значения из стора
      // ui-form-controller инициализирует values при рендере с дефолтными значениями,
      // поэтому нужно явно установить значения из конфигурации через публичный API
      if (formConfig.values && Object.keys(formConfig.values).length > 0) {
        // Устанавливаем значения через публичный API формы
        // Используем небольшую задержку, чтобы убедиться, что все контролы инициализированы
        await new Promise((resolve) => setTimeout(resolve, 100));
        
        Object.entries(formConfig.values).forEach(([fieldId, value]) => {
          if (value !== null && value !== undefined) {
            const field = this.formController.getField(fieldId);
            if (field && typeof field.setValue === 'function') {
              try {
                // Для select-multi нужно передавать массив
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

    // Настраиваем обработчики после того, как элемент подключён к DOM
    this.setupFormHandlers();
    this._captureDraftFilters();
  }


  /**
   * Обработчик изменений состояния каталога через события
   * @param {Object} detail - Детали события elkaretro:catalog:updated
   * @private
   */
  _onCatalogStateChange(detail) {
    if (!detail || !detail.state) {
      return;
    }

    const catalogState = detail.state;

    // Обновляем кнопку сброса при любых изменениях
    this.updateResetButton(catalogState);

    // Обновляем фильтры при изменении режима
    if (catalogState.mode !== this._previousMode) {
      this._previousMode = catalogState.mode;
      // updateFiltersForMode теперь async, но мы не ждём его завершения
      this.updateFiltersForMode(catalogState.mode).catch((error) => {
        console.error('[catalog-sidebar] Error updating filters:', error);
      });
      this._previousFilters = JSON.stringify(catalogState.filters || {});
    } else {
      // Синхронизируем значения формы при изменении фильтров извне (URL, программно)
      const currentFilters = JSON.stringify(catalogState.filters || {});
      if (currentFilters !== this._previousFilters) {
        this._previousFilters = currentFilters;
        this.syncFormValues(catalogState.filters || {});
      }
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
    const debounceMs = 10000; // 10 секунд, как в форме
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
      // Показываем обратный отсчёт
      const label = `Применить фильтры (${this.countdownSeconds})`;
      
      if (this.applyButton.setState) {
        this.applyButton.setState({ label, disabled: false });
      } else {
        this.applyButton.setAttribute('label', label);
        this.applyButton.removeAttribute('disabled');
      }
      this.applyButton.setAttribute('data-countdown', 'true');
    } else {
      // Нет обратного отсчёта
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
    
    // Получаем текущий режим для определения конфигурации полей
    const currentState = window.app?.catalog?.getState();
    if (!currentState) {
      return;
    }
    
    const currentMode = currentState.mode || 'type';
    
    // Загружаем конфигурации фильтров для режима
    const filterConfigs = getFiltersForMode(currentMode);
    
    // Преобразуем значения формы в формат стора
    const filters = {};
    
    // Получаем значения напрямую из полей формы для актуальности
    if (Array.isArray(filterConfigs)) {
      filterConfigs.forEach((filterConfig) => {
        const filterKey = getFilterKey(filterConfig.id);
        
        // Получаем поле напрямую и его актуальное значение
        const field = this.formController.getField ? this.formController.getField(filterConfig.id) : null;
        if (!field) {
          console.debug('[catalog-sidebar] Field not found for filter:', filterConfig.id);
          return;
        }
        
        const formValue = field && typeof field.value === 'function' ? field.value() : null;
        console.debug('[catalog-sidebar] Field value for', filterConfig.id, ':', formValue);
        
        // Нормализуем значение для стора
        let storeValue = null;
        
        if (formValue !== null && formValue !== undefined && formValue !== '') {
          if (filterConfig.type === 'select-multi') {
            // Для множественного выбора значение уже массив
            if (Array.isArray(formValue) && formValue.length > 0) {
              // Нормализуем значения в строки и убираем пустые
              storeValue = formValue
                .map(v => String(v).trim())
                .filter(v => v !== '');
            }
          } else {
            // Для одиночного выбора или других типов - одиночное значение
            // В сторе всегда храним как массив для единообразия
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
    
    console.debug('[catalog-sidebar] Collected filters:', filters);
    
    // Получаем значения из фильтра категорий
    const categoryValues = this.categoryFilter && this.categoryFilter.getValue ? this.categoryFilter.getValue() : [];
    
    // Добавляем категории, если они выбраны
    if (categoryValues && categoryValues.length > 0) {
      // Категории должны возвращаться как ID, но на всякий случай конвертируем в строки
      filters['category-of-toys'] = categoryValues.map(v => String(v));
    }
    
    // Обновляем фильтры через публичный API
    if (window.app && window.app.catalog) {
      window.app.catalog.setFilters(filters);
    } else {
      console.warn('[catalog-sidebar] window.app.catalog not available');
    }
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
      // Форма успешно обработана, фильтры обновлены в сторе
      console.debug('[catalog-sidebar] Filters updated via form', event.detail);
      // Останавливаем таймер и обратный отсчёт после успешной отправки
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }
      this._stopCountdown();
      this._clearDraftFilters();
      notify('success', 'Фильтры обновлены');
    });

    this.formController.addEventListener('ui-form:invalid', (event) => {
      // Форма не прошла валидацию
      console.warn('[catalog-sidebar] Form validation failed', event.detail);
    });

    // Отслеживаем изменения в форме для запуска debounce таймера
    this.formController.addEventListener('ui-form:change', () => {
      // При любом изменении в форме запускаем обратный отсчёт
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
      }, 10000); // 10 секунд, как в конфигурации формы
    });
  }

  /**
   * Синхронизировать значения формы с фильтрами из стора
   * Используется при изменении фильтров извне (URL, программно)
   * Использует публичный API формы вместо прямого доступа к state.values
   * @param {Object} filters - Фильтры из стора { filterKey: [values] }
   * @private
   */
  async syncFormValues(filters) {
    if (!this.formController) {
      return;
    }

    // Получаем текущий режим для определения конфигурации полей
    const currentState = window.app?.catalog?.getState();
    if (!currentState) {
      return;
    }

    const currentMode = currentState.mode || 'type';
    
    // Загружаем конфигурации фильтров для режима
    const filterConfigs = getFiltersForMode(currentMode);
    
    if (!Array.isArray(filterConfigs) || filterConfigs.length === 0) {
      return;
    }

    // Синхронизируем значения через публичный API формы
    filterConfigs.forEach((filterConfig) => {
      const filterKey = getFilterKey(filterConfig.id);
      const filterValue = filters[filterKey];
      
      if (filterValue !== undefined && filterValue !== null) {
        // Получаем поле через публичный API
        const field = this.formController.getField(filterConfig.id);
        
        if (field) {
          // Нормализуем значение в зависимости от типа поля
          let normalizedValue = null;
          
          if (Array.isArray(filterValue) && filterValue.length > 0) {
            // Для таксономий (select-single, select-multi) конвертируем slug в ID если нужно
            if ((filterConfig.type === 'select-single' || filterConfig.type === 'select-multi') && filterConfig.dataSource) {
              // Проверяем, является ли поле таксономией (есть dataSource с path taxonomy_terms)
              const dataSource = filterConfig.dataSource;
              if (dataSource.path && dataSource.path.startsWith('taxonomy_terms.')) {
                const taxonomySlug = dataSource.path.replace('taxonomy_terms.', '');
                const taxonomyTerms = window.taxonomy_terms?.[taxonomySlug];
                
                if (taxonomyTerms) {
                  // Конвертируем slug в ID для каждого значения
                  const convertedValues = filterValue.map((value) => {
                    // Если значение уже число (ID), оставляем как есть
                    if (!isNaN(parseInt(value, 10)) && /^\d+$/.test(String(value))) {
                      return String(value);
                    }
                    
                    // Ищем термин по slug и возвращаем его ID
                    const foundTerm = Object.values(taxonomyTerms).find(term => term && term.slug === value);
                    return foundTerm ? String(foundTerm.id) : value;
                  });
                  
                  if (filterConfig.type === 'select-single') {
                    normalizedValue = convertedValues[0];
                  } else {
                    normalizedValue = convertedValues;
                  }
                } else {
                  // Если не удалось найти таксономию, используем значения как есть
                  if (filterConfig.type === 'select-single') {
                    normalizedValue = filterValue[0];
                  } else {
                    normalizedValue = filterValue;
                  }
                }
              } else {
                // Не таксономия, используем значения как есть
                if (filterConfig.type === 'select-single') {
                  normalizedValue = filterValue[0];
                } else {
                  normalizedValue = filterValue;
                }
              }
            } else {
              // Для других типов полей
              if (filterConfig.type === 'select-single') {
                normalizedValue = filterValue[0];
              } else if (filterConfig.type === 'select-multi') {
                normalizedValue = filterValue;
              } else {
                normalizedValue = filterValue[0];
              }
            }
          }
          
          // Устанавливаем значение через публичный API поля
          if (normalizedValue !== null) {
            field.setValue(normalizedValue);
          } else {
            // Если значение null, сбрасываем поле
            field.reset();
          }
        }
      } else {
        // Если фильтр не задан, сбрасываем поле
        const field = this.formController.getField(filterConfig.id);
        if (field) {
          field.reset();
        }
      }
    });
  }

  /**
   * Сбросить все фильтры
   * Использует публичный API window.app.catalog
   */
  resetFilters() {
    // Сбрасываем фильтры и поиск через API
    if (window.app && window.app.catalog) {
      window.app.catalog.resetFilters();
    }

    // Сбрасываем форму, если она есть
    if (this.formController && typeof this.formController.clear === 'function') {
      this.formController.clear();
    }

    this._clearDraftFilters();
  }

  /**
   * Получить текущее состояние фильтров
   * Использует публичный API window.app.catalog
   * @returns {Object} Состояние фильтров из API
   */
  getState() {
    const state = window.app?.catalog?.getState();
    return state ? { ...state } : null;
  }

  /**
   * Уничтожить компонент (очистка подписок и ссылок)
   */
  destroy() {
    // Останавливаем таймеры
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this._stopCountdown();

    if (this.modeToggle && typeof this.modeToggle.destroy === 'function') {
      this.modeToggle.destroy();
      this.modeToggle = null;
    }

    if (this.formController) {
      if (this.filtersContainer && this.filtersContainer.contains(this.formController)) {
        this.filtersContainer.removeChild(this.formController);
      }
      this.formController = null;
    }

    if (this.categoryFilter) {
      if (typeof this.categoryFilter.destroy === 'function') {
        this.categoryFilter.destroy();
      }
      this.categoryFilter = null;
    }

    this._clearDraftFilters();

    if (typeof this.unsubscribeStore === 'function') {
      this.unsubscribeStore();
      this.unsubscribeStore = null;
    }

    if (this.container) {
      this.container.innerHTML = '';
    }

    this.modeToggleContainer = null;
    this.filtersContainer = null;
    this.resetButtonContainer = null;
    this.applyButton = null;
    this.container = null;
    this._formFieldsConfig = [];
  }

  _captureDraftFilters() {
    if (!this.formController || typeof this.formController.getValues !== 'function') {
      return;
    }

    const formValues = this.formController.getValues() || {};
    const filters = {};

    (this._formFieldsConfig || []).forEach((fieldConfig) => {
      if (!fieldConfig || !fieldConfig.id) {
        return;
      }
      const filterKey = getFilterKey(fieldConfig.id);
      const normalizedValue = this._normalizeValueForFilters(formValues[fieldConfig.id], fieldConfig.type);
      if (normalizedValue) {
        filters[filterKey] = normalizedValue;
      }
    });

    if (window.app?.catalogStore?.setDraftFilters) {
      window.app.catalogStore.setDraftFilters(filters);
    }
  }

  _normalizeValueForFilters(value, fieldType) {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (Array.isArray(value)) {
      const normalized = value
        .map((item) => (item === null || item === undefined ? '' : String(item).trim()))
        .filter((item) => item !== '');
      return normalized.length ? normalized : null;
    }

    if (typeof value === 'number' && !Number.isNaN(value)) {
      return [String(value)];
    }

    const stringValue = String(value).trim();
    if (!stringValue) {
      return null;
    }

    return [stringValue];
  }

  _clearDraftFilters() {
    if (window.app?.catalogStore?.setDraftFilters) {
      window.app.catalogStore.setDraftFilters(null);
    }
  }

  /**
   * Обработчик разворота фильтра категорий
   * @param {boolean} isExpanded - Развёрнут ли фильтр
   * @private
   */
  _handleCategoryFilterExpanded(isExpanded) {
    // Добавляем/убираем класс для скрытия других фильтров
    if (this.filtersContainer) {
      if (isExpanded) {
        this.filtersContainer.style.display = 'none';
      } else {
        this.filtersContainer.style.display = '';
      }
    }
    
    // Добавляем/убираем класс для увеличения ширины сайдбара
    if (this.container) {
      const sidebarElement = this.container.closest('.catalog-sidebar');
      if (sidebarElement) {
        if (isExpanded) {
          sidebarElement.classList.add('catalog-sidebar--expanded');
        } else {
          sidebarElement.classList.remove('catalog-sidebar--expanded');
        }
      }
      
      // Добавляем класс на .catalog-page__sidebar для изменения ширины
      const pageSidebar = this.container.closest('.catalog-page__sidebar');
      if (pageSidebar) {
        if (isExpanded) {
          pageSidebar.classList.add('expanded');
        } else {
          pageSidebar.classList.remove('expanded');
        }
      }
    }
  }
}

