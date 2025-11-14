/**
 * Search box widget.
 *
 * Responsibilities:
 * - Поле для полнотекстового поиска по названию
 * - Debounce ввода (300ms)
 * - Интеграция со стором: обновление search при вводе
 * - Подписка на стор: отображение текущего значения поиска
 * - Кнопка очистки поиска
 *
 * Dependencies:
 * - catalog-store.js - для получения и обновления состояния
 * - ui-input-text - компонент текстового поля из UI Kit
 */

import { renderSearchBox } from './search-box-template.js';

/**
 * Создать и инициализировать компонент поиска
 * Компонент использует публичный API window.app.catalog вместо прямого доступа к стору
 * @param {Object} options - Опции инициализации
 * @param {HTMLElement} options.container - Контейнер для рендеринга поиска
 * @param {number} [options.debounceMs=10000] - Задержка debounce в миллисекундах
 * @returns {Object} API компонента: { render(), setValue(value), focus(), clear(), destroy() }
 */
export const createSearchBox = ({ container, debounceMs = 10000 } = {}) => {
  if (!container) {
    throw new Error('[search-box] Container element is required');
  }

  let unsubscribeStore = null;
  let inputElement = null;
  let submitButton = null;
  let debounceTimer = null;
  let countdownInterval = null;
  let countdownSeconds = 0;
  let pendingValue = ''; // Значение, которое будет отправлено после debounce

  /**
   * Остановить обратный отсчёт
   * @private
   */
  const stopCountdown = () => {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
    countdownSeconds = 0;
    updateSubmitButton();
  };

  /**
   * Запустить обратный отсчёт
   * @private
   */
  const startCountdown = () => {
    stopCountdown();
    countdownSeconds = Math.ceil(debounceMs / 1000); // Конвертируем миллисекунды в секунды
    updateSubmitButton();

    countdownInterval = setInterval(() => {
      countdownSeconds--;
      if (countdownSeconds <= 0) {
        stopCountdown();
      } else {
        updateSubmitButton();
      }
    }, 1000);
  };

  /**
   * Обновить состояние кнопки Submit
   * @private
   */
  const updateSubmitButton = () => {
    if (!submitButton) {
      return;
    }

    const currentState = window.app?.catalog?.getState();
    const currentSearch = currentState?.search || '';
    const hasPendingChanges = pendingValue !== '' && pendingValue !== currentSearch;

    if (countdownSeconds > 0 && hasPendingChanges) {
      // Показываем обратный отсчёт
      const label = `Найти (${countdownSeconds})`;
      const currentTick = submitButton.getAttribute('data-tick');
      const shouldAnimate = currentTick !== String(countdownSeconds);
      
      if (submitButton.setState) {
        submitButton.setState({ label, disabled: false });
      } else {
        submitButton.setAttribute('label', label);
        submitButton.removeAttribute('disabled');
      }
      submitButton.setAttribute('data-countdown', 'true');
      
      // Триггерим анимацию мигания при изменении секунд через класс
      if (shouldAnimate) {
        // Удаляем класс для перезапуска анимации
        submitButton.classList.remove('catalog-search-box__submit--tick');
        submitButton.removeAttribute('data-tick');
        // Принудительно перезапускаем анимацию через reflow
        void submitButton.offsetWidth; // force reflow
        
        // Ждём завершения рендера ui-button, затем добавляем класс
        // Используем небольшую задержку, чтобы ui-button успел отрендериться
        setTimeout(() => {
          submitButton.setAttribute('data-tick', String(countdownSeconds));
          submitButton.classList.add('catalog-search-box__submit--tick');
          // Дополнительно принуждаем перезапуск анимации
          submitButton.style.animation = 'none';
          void submitButton.offsetWidth; // force reflow
          submitButton.style.animation = '';
        }, 10);
      }
    } else if (hasPendingChanges) {
      // Есть изменения, но обратный отсчёт не активен
      if (submitButton.setState) {
        submitButton.setState({ label: 'Найти', disabled: false });
      } else {
        submitButton.setAttribute('label', 'Найти');
        submitButton.removeAttribute('disabled');
      }
      submitButton.removeAttribute('data-countdown');
      submitButton.removeAttribute('data-tick');
      submitButton.classList.remove('catalog-search-box__submit--tick');
    } else {
      // Нет изменений
      if (submitButton.setState) {
        submitButton.setState({ label: 'Найти', disabled: true });
      } else {
        submitButton.setAttribute('label', 'Найти');
        submitButton.setAttribute('disabled', '');
      }
      submitButton.removeAttribute('data-countdown');
      submitButton.removeAttribute('data-tick');
      submitButton.classList.remove('catalog-search-box__submit--tick');
    }
  };

  /**
   * Отправить поисковый запрос немедленно
   * @private
   */
  const submitSearch = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    stopCountdown();

    if (window.app && window.app.catalog && pendingValue !== undefined && pendingValue !== null) {
      const valueToSubmit = pendingValue;
      // Сбрасываем pending значение перед отправкой, чтобы updateSubmitButton правильно определил состояние
      pendingValue = valueToSubmit; // Временно оставляем, чтобы отправка прошла
      window.app.catalog.setSearch(valueToSubmit);
      // После отправки pendingValue будет синхронизирован через handleCatalogUpdate
    }
  };

  /**
   * Обработчик изменения значения в поле поиска
   * @param {CustomEvent} event - Событие ui-input-text:input или ui-input-text:change
   */
  const handleInputChange = (event) => {
    const newValue = event.detail?.value || '';
    pendingValue = newValue;
    
    // Очищаем предыдущий таймер
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Запускаем обратный отсчёт
    startCountdown();

    // Устанавливаем новый таймер для debounce
    debounceTimer = setTimeout(() => {
      submitSearch();
    }, debounceMs);

    updateSubmitButton();
  };

  /**
   * Обработчик клика на кнопку Submit
   * @private
   */
  const handleSubmitClick = () => {
    if (pendingValue !== undefined && pendingValue !== '') {
      submitSearch();
    }
  };

  /**
   * Обработчик очистки поля поиска
   * Использует публичный API window.app.catalog
   */
  const handleClear = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    stopCountdown();
    pendingValue = '';

    if (window.app && window.app.catalog) {
      window.app.catalog.setSearch('');
    }
    updateSubmitButton();
  };

  /**
   * Обработчик изменений состояния каталога через события
   * Синхронизирует визуальное состояние поля поиска с актуальным значением
   * @param {CustomEvent} event - Событие elkaretro:catalog:updated
   */
  const handleCatalogUpdate = (event) => {
    if (!inputElement) {
      return;
    }

    const catalogState = event.detail?.state;
    if (!catalogState) {
      return;
    }

    const currentSearch = catalogState.search || '';
    const currentValue = inputElement.getAttribute('value') || '';

    // Обновляем значение поля поиска, если оно изменилось извне
    if (currentValue !== currentSearch) {
      inputElement.setAttribute('value', currentSearch);
      // Обновляем состояние компонента программно
      if (typeof inputElement.setState === 'function') {
        inputElement.setState({ value: currentSearch });
      }

      // Если поиск изменился извне (не через наш компонент), обновляем pendingValue
      // и останавливаем таймеры
      if (pendingValue !== currentSearch) {
        pendingValue = currentSearch;
        if (debounceTimer) {
          clearTimeout(debounceTimer);
          debounceTimer = null;
        }
        stopCountdown();
        updateSubmitButton();
      }
    }
  };

  /**
   * Рендеринг поля поиска в контейнер
   */
  const render = () => {
    // Очищаем контейнер
    container.innerHTML = '';

    // Получаем текущее значение поиска из API
    const currentState = window.app?.catalog?.getState();
    const currentSearch = currentState?.search || '';
    pendingValue = currentSearch;

    // Рендерим шаблон с текущим значением обратного отсчёта
    container.innerHTML = renderSearchBox({ 
      currentValue: currentSearch,
      countdown: countdownSeconds,
    });

    // Подписываемся на события каталога для синхронизации
    window.addEventListener('elkaretro:catalog:updated', handleCatalogUpdate);
    unsubscribeStore = () => {
      window.removeEventListener('elkaretro:catalog:updated', handleCatalogUpdate);
    };

    // Находим элементы после рендера
    // Используем простой подход: ждём регистрации кастомных элементов
    Promise.all([
      customElements.whenDefined('ui-input-text'),
      customElements.whenDefined('ui-button')
    ]).then(() => {
      // Дополнительная задержка для полной инициализации
      return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }).then(() => {
      inputElement = container.querySelector('ui-input-text');
      submitButton = container.querySelector('[data-search-submit]');
      
      if (!inputElement) {
        console.warn('[search-box] ui-input-text element not found, will retry on next render');
        return;
      }

      if (!submitButton) {
        console.warn('[search-box] submit button not found, will retry on next render');
        return;
      }

      // Подписываемся на изменения поля ввода
      inputElement.addEventListener('ui-input-text:input', handleInputChange);
      inputElement.addEventListener('ui-input-text:change', handleInputChange);
      inputElement.addEventListener('ui-input-text:clear', handleClear);

      // Подписываемся на событие клика по кнопке Submit (ui-button использует кастомные события)
      submitButton.addEventListener('catalog-search:submit-click', handleSubmitClick);

      // Инициализируем состояние кнопки
      const currentState = window.app?.catalog?.getState();
      pendingValue = currentState?.search || '';
      updateSubmitButton();
    }).catch((error) => {
      console.error('[search-box] Error initializing elements:', error);
    });
  };

  /**
   * Программно установить значение поиска
   * Использует публичный API window.app.catalog
   * @param {string} value - Значение для установки
   */
  const setValue = (value) => {
    if (typeof value !== 'string') {
      console.warn('[search-box] Invalid value type:', typeof value);
      return;
    }

    if (window.app && window.app.catalog) {
      window.app.catalog.setSearch(value);
    }
  };

  /**
   * Получить текущее значение поиска
   * Использует публичный API window.app.catalog
   * @returns {string} Текущее значение поиска
   */
  const getValue = () => {
    const state = window.app?.catalog?.getState();
    return state?.search || '';
  };

  /**
   * Установить фокус на поле поиска
   */
  const focus = () => {
    if (inputElement) {
      const input = inputElement.querySelector('input');
      if (input) {
        input.focus();
      }
    }
  };

  /**
   * Очистить поле поиска
   */
  const clear = () => {
    handleClear();
  };

  /**
   * Уничтожить компонент (очистка подписок и ссылок)
   */
  const destroy = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    stopCountdown();

    if (inputElement) {
      inputElement.removeEventListener('ui-input-text:input', handleInputChange);
      inputElement.removeEventListener('ui-input-text:change', handleInputChange);
      inputElement.removeEventListener('ui-input-text:clear', handleClear);
      inputElement = null;
    }

    if (submitButton) {
      submitButton.removeEventListener('catalog-search:submit-click', handleSubmitClick);
      submitButton = null;
    }

    if (typeof unsubscribeStore === 'function') {
      unsubscribeStore();
      unsubscribeStore = null;
    }

    if (container) {
      container.innerHTML = '';
    }

    pendingValue = '';
  };

  // Возвращаем API компонента
  return {
    render,
    setValue,
    getValue,
    focus,
    clear,
    destroy,
  };
};

