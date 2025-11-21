/**
 * Accessory Catalog Search Box Widget
 * 
 * Responsibilities:
 * - Поле для полнотекстового поиска по названию
 * - Debounce ввода (10000ms)
 * - Интеграция со стором: обновление search при вводе
 * - Подписка на стор: отображение текущего значения поиска
 * - Кнопка очистки поиска
 * 
 * Dependencies:
 * - accessory-catalog-store.js - для получения и обновления состояния
 * - ui-input-text - компонент текстового поля из UI Kit
 */

import { renderSearchBox } from './search-box-template.js';

/**
 * Создать и инициализировать компонент поиска для каталога аксессуаров
 * Компонент использует публичный API window.app.accessoryCatalog вместо прямого доступа к стору
 * @param {Object} options - Опции инициализации
 * @param {HTMLElement} options.container - Контейнер для рендеринга поиска
 * @param {number} [options.debounceMs=10000] - Задержка debounce в миллисекундах
 * @returns {Object} API компонента: { render(), setValue(value), focus(), clear(), destroy() }
 */
export const createSearchBox = ({ container, debounceMs = 10000 } = {}) => {
  if (!container) {
    throw new Error('[accessory-search-box] Container element is required');
  }

  let unsubscribeStore = null;
  let inputElement = null;
  let submitButton = null;
  let debounceTimer = null;
  let countdownInterval = null;
  let countdownSeconds = 0;
  let pendingValue = '';

  const stopCountdown = () => {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
    countdownSeconds = 0;
    updateSubmitButton();
  };

  const startCountdown = () => {
    stopCountdown();
    countdownSeconds = Math.ceil(debounceMs / 1000);
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

  const updateSubmitButton = () => {
    if (!submitButton) {
      return;
    }

    const currentState = window.app?.accessoryCatalog?.getState();
    const currentSearch = currentState?.search || '';
    const hasPendingChanges = pendingValue !== '' && pendingValue !== currentSearch;

    if (countdownSeconds > 0 && hasPendingChanges) {
      const label = `Найти (${countdownSeconds})`;
      if (submitButton.setState) {
        submitButton.setState({ label, disabled: false });
      } else {
        submitButton.setAttribute('label', label);
        submitButton.removeAttribute('disabled');
      }
      submitButton.setAttribute('data-countdown', 'true');
    } else if (hasPendingChanges) {
      if (submitButton.setState) {
        submitButton.setState({ label: 'Найти', disabled: false });
      } else {
        submitButton.setAttribute('label', 'Найти');
        submitButton.removeAttribute('disabled');
      }
      submitButton.removeAttribute('data-countdown');
    } else {
      if (submitButton.setState) {
        submitButton.setState({ label: 'Найти', disabled: true });
      } else {
        submitButton.setAttribute('label', 'Найти');
        submitButton.setAttribute('disabled', '');
      }
      submitButton.removeAttribute('data-countdown');
    }
  };

  const submitSearch = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    stopCountdown();

    if (window.app && window.app.accessoryCatalog && pendingValue !== undefined && pendingValue !== null) {
      const valueToSubmit = pendingValue;
      pendingValue = valueToSubmit;
      window.app.accessoryCatalog.setSearch(valueToSubmit);
    }
  };

  const handleInputChange = (event) => {
    const newValue = event.detail?.value || '';
    pendingValue = newValue;
    
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    startCountdown();

    debounceTimer = setTimeout(() => {
      submitSearch();
    }, debounceMs);

    updateSubmitButton();
  };

  const handleSubmitClick = () => {
    if (pendingValue !== undefined && pendingValue !== '') {
      submitSearch();
    }
  };

  const handleClear = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    stopCountdown();
    pendingValue = '';

    if (window.app && window.app.accessoryCatalog) {
      window.app.accessoryCatalog.setSearch('');
    }
    updateSubmitButton();
  };

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

    if (currentValue !== currentSearch) {
      inputElement.setAttribute('value', currentSearch);
      if (typeof inputElement.setState === 'function') {
        inputElement.setState({ value: currentSearch });
      }

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

  const render = () => {
    container.innerHTML = '';

    const currentState = window.app?.accessoryCatalog?.getState();
    const currentSearch = currentState?.search || '';
    pendingValue = currentSearch;

    container.innerHTML = renderSearchBox({ 
      currentValue: currentSearch,
      countdown: countdownSeconds,
    });

    window.addEventListener('elkaretro:accessory-catalog:updated', handleCatalogUpdate);
    unsubscribeStore = () => {
      window.removeEventListener('elkaretro:accessory-catalog:updated', handleCatalogUpdate);
    };

    Promise.all([
      customElements.whenDefined('ui-input-text'),
      customElements.whenDefined('ui-button')
    ]).then(() => {
      return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }).then(() => {
      inputElement = container.querySelector('ui-input-text');
      submitButton = container.querySelector('[data-search-submit]');
      
      if (!inputElement) {
        console.warn('[accessory-search-box] ui-input-text element not found in container:', container);
        return;
      }
      
      if (!submitButton) {
        console.warn('[accessory-search-box] submit button not found in container:', container);
        return;
      }

      inputElement.addEventListener('ui-input-text:input', handleInputChange);
      inputElement.addEventListener('ui-input-text:change', handleInputChange);
      inputElement.addEventListener('ui-input-text:clear', handleClear);

      submitButton.addEventListener('accessory-catalog-search:submit-click', handleSubmitClick);

      const currentState = window.app?.accessoryCatalog?.getState();
      pendingValue = currentState?.search || '';
      updateSubmitButton();
    }).catch((error) => {
      console.error('[accessory-search-box] Error initializing elements:', error);
    });
  };

  const setValue = (value) => {
    if (typeof value !== 'string') {
      return;
    }

    if (window.app && window.app.accessoryCatalog) {
      window.app.accessoryCatalog.setSearch(value);
    }
  };

  const getValue = () => {
    const state = window.app?.accessoryCatalog?.getState();
    return state?.search || '';
  };

  const focus = () => {
    if (inputElement) {
      const input = inputElement.querySelector('input');
      if (input) {
        input.focus();
      }
    }
  };

  const clear = () => {
    handleClear();
  };

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
      submitButton.removeEventListener('accessory-catalog-search:submit-click', handleSubmitClick);
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

  return {
    render,
    setValue,
    getValue,
    focus,
    clear,
    destroy,
  };
};

