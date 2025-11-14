/**
 * Mode toggle control between toy types and toy instances.
 *
 * Responsibilities:
 * - Отображение переключателя режимов (Типы / Экземпляры)
 * - Интеграция со стором: подписка на изменения mode, обновление при клике
 * - Сброс страницы при смене режима
 * - Визуальная обратная связь (активный режим)
 *
 * Dependencies:
 * - catalog-store.js - для получения и обновления состояния
 * - ui-segmented-toggle - компонент переключателя из UI Kit
 */

import { renderModeToggle } from './mode-toggle-template.js';

/**
 * Создать и инициализировать компонент переключателя режимов
 * @param {Object} options - Опции инициализации
 * @param {HTMLElement} options.container - Контейнер для рендеринга переключателя
 * @param {Function} [options.onChange] - Колбэк при изменении режима (опционально)
 * @returns {Object} API компонента: { render(), setMode(mode), destroy() }
 */
export const createModeToggle = ({ container, onChange } = {}) => {
  if (!container) {
    throw new Error('[mode-toggle] Container element is required');
  }

  let unsubscribeStore = null;
  let toggleElement = null;

  /**
   * Обработчик изменения режима в переключателе
   * Использует публичный API window.app.catalog
   * @param {CustomEvent} event - Событие ui-segmented-toggle:change
   */
  const handleToggleChange = (event) => {
    const newMode = event.detail?.value;
    if (!newMode || (newMode !== 'type' && newMode !== 'instance')) {
      console.warn('[mode-toggle] Invalid mode value:', newMode);
      return;
    }

    const currentState = window.app?.catalog?.getState();
    
    // Если режим не изменился, ничего не делаем
    if (currentState?.mode === newMode) {
      return;
    }

    // Обновляем режим через API
    // Режим автоматически очистит фильтры (см. window.app.catalog.setMode)
    if (window.app && window.app.catalog) {
      window.app.catalog.setMode(newMode);
    }

    // Вызываем опциональный колбэк
    if (typeof onChange === 'function') {
      try {
        onChange(newMode, currentState?.mode);
      } catch (error) {
        console.error('[mode-toggle] onChange callback error:', error);
      }
    }
  };

  /**
   * Обработчик изменений состояния каталога через события
   * Синхронизирует визуальное состояние переключателя с актуальным режимом
   * @param {CustomEvent} event - Событие elkaretro:catalog:updated
   */
  const handleCatalogUpdate = (event) => {
    if (!toggleElement) {
      return;
    }

    const catalogState = event.detail?.state;
    if (!catalogState) {
      return;
    }

    const currentMode = catalogState.mode || 'type';
    const currentValue = toggleElement.getAttribute('value') || '';

    // Обновляем значение переключателя, если оно изменилось извне
    if (currentValue !== currentMode) {
      toggleElement.setAttribute('value', currentMode);
      // Обновляем состояние компонента программно
      if (typeof toggleElement.setState === 'function') {
        toggleElement.setState({ value: currentMode });
      }
    }
  };

  /**
   * Рендеринг переключателя в контейнер
   */
  const render = () => {
    // Очищаем контейнер
    container.innerHTML = '';

    // Получаем текущий режим из API
    const currentState = window.app?.catalog?.getState();
    const currentMode = currentState?.mode || 'type';

    // Рендерим шаблон
    container.innerHTML = renderModeToggle({ currentMode });

    // Находим элемент переключателя
    toggleElement = container.querySelector('ui-segmented-toggle');
    
    if (!toggleElement) {
      console.error('[mode-toggle] ui-segmented-toggle element not found after render');
      return;
    }

    // Подписываемся на изменения переключателя
    toggleElement.addEventListener('ui-segmented-toggle:change', handleToggleChange);

    // Подписываемся на события каталога для синхронизации
    window.addEventListener('elkaretro:catalog:updated', handleCatalogUpdate);
    unsubscribeStore = () => {
      window.removeEventListener('elkaretro:catalog:updated', handleCatalogUpdate);
    };
  };

  /**
   * Программно установить режим
   * @param {string} mode - 'type' | 'instance'
   */
  const setMode = (mode) => {
    if (mode !== 'type' && mode !== 'instance') {
      console.warn('[mode-toggle] Invalid mode:', mode);
      return;
    }

    // Обновляем через стор (это вызовет handleStoreStateChange и обновит UI)
    store.updateState({ mode, page: 1, filters: {} });
  };

  /**
   * Получить текущий режим
   * @returns {string} 'type' | 'instance'
   */
  const getMode = () => {
    return store.getCatalogState().mode || 'type';
  };

  /**
   * Уничтожить компонент (очистка подписок и ссылок)
   */
  const destroy = () => {
    if (toggleElement) {
      toggleElement.removeEventListener('ui-segmented-toggle:change', handleToggleChange);
      toggleElement = null;
    }

    if (typeof unsubscribeStore === 'function') {
      unsubscribeStore();
      unsubscribeStore = null;
    }

    if (container) {
      container.innerHTML = '';
    }
  };

  // Возвращаем API компонента
  return {
    render,
    setMode,
    getMode,
    destroy,
  };
};

