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
    this.formController = null;
    this.unsubscribeStore = null;
    
    // Ссылки на DOM элементы
    this.modeToggleContainer = null;
    this.filtersContainer = null;
    this.resetButtonContainer = null;
    
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
    
    // Вызываем submit формы напрямую
    if (typeof this.formController.submit === 'function') {
      this.formController.submit();
    } else {
      console.warn('[catalog-sidebar] Form controller does not have submit method');
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
            if (filterConfig.type === 'select-single') {
              // Для одиночного выбора берём первое значение
              normalizedValue = filterValue[0];
            } else if (filterConfig.type === 'select-multi') {
              // Для множественного выбора берём весь массив
              normalizedValue = filterValue;
            } else {
              // Для других типов берём первое значение
              normalizedValue = filterValue[0];
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
  }
}

