import { BaseElement } from '../../../../base-element.js';
import { renderTextInputTemplate } from './text-input-template.js';

if (window.app?.toolkit?.loadCSSOnce) {
  window.app.toolkit.loadCSSOnce(new URL('./text-input-styles.css', import.meta.url));
}

export class UITextInput extends BaseElement {
  static autoRender = false; // Отключаем автоматический рендер - управляем вручную

  static stateSchema = {
    value:        { type: 'string',  default: '', attribute: { name: 'value', observed: true, reflect: true } },
    placeholder:  { type: 'string',  default: '', attribute: { name: 'placeholder', observed: true, reflect: true } },
    name:         { type: 'string',  default: '', attribute: { name: 'name', observed: true, reflect: true } },
    disabled:     { type: 'boolean', default: false, attribute: { name: 'disabled', observed: true, reflect: true } },
    readonly:     { type: 'boolean', default: false, attribute: { name: 'readonly', observed: true, reflect: true } },
    required:     { type: 'boolean', default: false, attribute: { name: 'required', observed: true, reflect: true } },
    status:       { type: 'string',  default: 'default', attribute: null },
    messages:     { type: 'json',    default: null, attribute: null },
    maxLength:    { type: 'number',  default: null, attribute: { name: 'maxlength', observed: true, reflect: true } },
    autocomplete: { type: 'string',  default: '', attribute: { name: 'autocomplete', observed: true, reflect: true } },
    inputMode:    { type: 'string',  default: '', attribute: { name: 'inputmode', observed: true, reflect: true } },
    pattern:      { type: 'string',  default: '', attribute: { name: 'pattern', observed: true, reflect: true } },
    mask:         { type: 'string',  default: null, attribute: { name: 'mask', observed: true, reflect: true } },
    prefix:       { type: 'string',  default: '', attribute: { name: 'prefix', observed: true, reflect: true } },
    suffix:       { type: 'string',  default: '', attribute: { name: 'suffix', observed: true, reflect: true } },
    clearable:    { type: 'boolean', default: false, attribute: { name: 'clearable', observed: true, reflect: true } },
    meta:         { type: 'json',    default: null, attribute: null },
    focused:      { type: 'boolean', default: false, attribute: null, internal: true },
    dirty:        { type: 'boolean', default: false, attribute: null, internal: true },
    allowedPattern: { type: 'string', default: '', attribute: { name: 'allowed-pattern', observed: true, reflect: true } },
    mask:          { type: 'string',  default: '', attribute: { name: 'mask', observed: true, reflect: true } }
  };

  constructor() {
    super();
    this._onInput = this._onInput.bind(this);
    this._onChange = this._onChange.bind(this);
    this._onFocus = this._onFocus.bind(this);
    this._onBlur = this._onBlur.bind(this);
    this._onClear = this._onClear.bind(this);
    this._onTogglePassword = this._onTogglePassword.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._inputEl = null;
    this._clearBtn = null;
    this._toggleBtn = null;
    this._passwordVisible = false;
    this._suspendDispatch = false;
    this._previousPhoneValue = ''; // Сохраняем предыдущее значение для расчёта позиции курсора
  }

  connectedCallback() {
    super.connectedCallback();
    
    // Рендерим сначала
    this.render();
    
    // Затем инициализируем связь со стейтом родителя (поля)
    // Ждем следующий кадр, чтобы убедиться, что поле уже инициализировало ссылку на форму
    requestAnimationFrame(() => {
      this._initStateLink();
    });
    
    this._emitLifecycleEvent('init');
  }

  disconnectedCallback() {
    // Очищаем ссылку на стейт родителя
    if (this.state._valueDescriptor) {
      delete this.state.value;
      delete this.state._valueDescriptor;
    }
    
    this._detachEvents();
  }
  
  _initStateLink() {
    // Находим родителя (поле)
    const field = this.closest('ui-form-field');
    if (!field || !field.state) {
      // Если поля нет, работаем автономно (не в контексте формы)
      return;
    }
    
    // Если value еще не инициализирован (поле еще не создало ссылку на форму), ждем
    if (field.state.value === undefined || !field.state._valueDescriptor) {
      // Пытаемся еще раз через кадр
      requestAnimationFrame(() => {
        this._initStateLink();
      });
      return;
    }
    
    // Если ссылка уже создана, не создаем повторно
    if (this.state._valueDescriptor) return;
    
    // Создаем ссылку на значение в стейте поля
    Object.defineProperty(this.state, 'value', {
      get: () => field.state.value,
      set: (val) => {
        field.state.value = val; // Используем setter поля (который синхронизируется с формой)
        // Обновляем DOM напрямую
        if (this._inputEl && this._inputEl.value !== String(val ?? '')) {
          this._inputEl.value = val ?? '';
        }
      },
      enumerable: true,
      configurable: true
    });
    this.state._valueDescriptor = true;
    
    // Устанавливаем начальное значение в DOM
    if (this._inputEl && field.state.value !== null && field.state.value !== undefined) {
      this._inputEl.value = field.state.value ?? '';
    }
  }

  onStateChanged(_key) {
    // value теперь обновляется автоматически через getter/setter
    // Но нужно синхронизировать DOM при изменении извне (через setter поля)
    if (_key === 'value' && this._inputEl) {
      const currentValue = this.state.value ?? '';
      if (this._inputEl.value !== String(currentValue)) {
        this._inputEl.value = currentValue;
      }
    }

    // Обновляем статус (классы/атрибуты) без полной перерисовки
    if (_key === 'status' || _key === 'messages') {
      this._updateStatus();
      if (!this._suspendDispatch) {
        this._emitValidation();
      }
    }

    // Перерисовываем только при изменении структуры (disabled, readonly, clearable, prefix, suffix)
    const structuralKeys = ['disabled', 'readonly', 'clearable', 'prefix', 'suffix', 'placeholder', 'maxLength', 'autocomplete', 'inputMode', 'pattern', 'mask'];
    if (structuralKeys.includes(_key)) {
      this.render();
    }
  }

  _updateStatus() {
    if (!this._inputEl) return;

    // Обновляем классы и атрибуты для статуса напрямую на элементе
    const status = this.state.status || 'default';
    
    // Удаляем все статусные классы
    this.classList.remove('ui-input-text--default', 'ui-input-text--error', 'ui-input-text--success', 'ui-input-text--warning');
    
    // Добавляем класс текущего статуса
    if (status !== 'default') {
      this.classList.add(`ui-input-text--${status}`);
    }

    // Обновляем data-атрибут для стилизации
    if (status !== 'default') {
      this.setAttribute('data-status', status);
    } else {
      this.removeAttribute('data-status');
    }

    // Обновляем атрибут aria-invalid
    if (status === 'error') {
      this._inputEl.setAttribute('aria-invalid', 'true');
    } else {
      this._inputEl.removeAttribute('aria-invalid');
    }

    // Обновляем сообщения (TODO: если нужно показывать в DOM, обновляем только этот блок, не весь компонент)
  }

  render() {
    this._detachEvents();
    const templateState = {
      ...this.state,
      inputType: this._resolveInputType(),
      passwordVisible: this._passwordVisible,
    };
    this.innerHTML = renderTextInputTemplate(templateState);
    this._inputEl = this.querySelector('.ui-input-text__control');
    this._clearBtn = this.querySelector('.ui-input-text__clear');
    this._toggleBtn = this.querySelector('.ui-input-text__toggle');
    this._attachEvents();
    this._syncControl();
  }

  _resolveInputType() {
    if (this.state.mask === 'password') {
      return this._passwordVisible ? 'text' : 'password';
    }
    if (this.state.inputType) {
      return this.state.inputType;
    }
    return 'text';
  }

  _attachEvents() {
    if (!this._inputEl) return;
    this._inputEl.addEventListener('input', this._onInput);
    this._inputEl.addEventListener('change', this._onChange);
    this._inputEl.addEventListener('focus', this._onFocus);
    this._inputEl.addEventListener('blur', this._onBlur);
    // Добавляем обработчик keydown для правильной обработки backspace
    if (this.state.mask === 'phone') {
      this._inputEl.addEventListener('keydown', this._onKeyDown);
    }
    if (this._clearBtn) {
      this._clearBtn.addEventListener('click', this._onClear);
    }
    if (this._toggleBtn) {
      this._toggleBtn.addEventListener('click', this._onTogglePassword);
    }
  }

  _detachEvents() {
    if (this._inputEl) {
      this._inputEl.removeEventListener('input', this._onInput);
      this._inputEl.removeEventListener('change', this._onChange);
      this._inputEl.removeEventListener('focus', this._onFocus);
      this._inputEl.removeEventListener('blur', this._onBlur);
      this._inputEl.removeEventListener('keydown', this._onKeyDown);
    }
    if (this._clearBtn) {
      this._clearBtn.removeEventListener('click', this._onClear);
    }
    if (this._toggleBtn) {
      this._toggleBtn.removeEventListener('click', this._onTogglePassword);
    }
  }

  _syncControl() {
    if (this._inputEl) {
      // Синхронизируем DOM с текущим значением из стейта
      const currentValue = this.state.value ?? '';
      if (this.state.mask === 'phone') {
        const digits = this._sanitizePhoneDigits(currentValue);
        this._inputEl.value = this._formatPhoneValue(digits);
      } else {
        this._inputEl.value = currentValue;
      }
      // Синхронизируем тип инпута для пароля
      if (this.state.mask === 'password') {
        const desiredType = this._passwordVisible ? 'text' : 'password';
        if (this._inputEl.type !== desiredType) {
          this._inputEl.type = desiredType;
        }
      }
    }
  }

  applyExternalValue(value) {
    if (!this._inputEl) return;
    const nextValue = value == null ? '' : String(value);
    if (this.state.mask === 'phone') {
      const digits = this._sanitizePhoneDigits(nextValue);
      this._inputEl.value = this._formatPhoneValue(digits);
    } else {
      this._inputEl.value = nextValue;
    }
  }

  _onInput(event) {
    let nextValue = event.target.value ?? '';
    if (this.state.mask === 'phone') {
      // Используем сохранённое предыдущее значение или текущее значение из DOM
      const oldValue = this._previousPhoneValue || (this._inputEl ? this._inputEl.value : '');
      const oldCaret = this._inputEl ? this._inputEl.selectionStart : nextValue.length;
      
      // Извлекаем цифры из нового значения (убираем все нецифровые символы и ведущие "7")
      const digits = this._sanitizePhoneDigits(nextValue);
      
      // Форматируем
      nextValue = this._formatPhoneValue(digits);
      
      if (this._inputEl) {
        // Вычисляем новую позицию курсора с учётом форматирования
        const newCaret = this._calculatePhoneCaretPosition(oldCaret, oldValue, nextValue, digits);
        
        this._inputEl.value = nextValue;
        this._inputEl.setSelectionRange(newCaret, newCaret);
        
        // Сохраняем новое значение как предыдущее для следующего ввода
        this._previousPhoneValue = nextValue;
      }
    } else {
      const allowed = this.state.allowedPattern;
      if (allowed) {
        try {
          const regex = new RegExp(allowed, 'g');
          const filtered = (nextValue.match(regex) || []).join('');
          if (filtered !== nextValue && this._inputEl) {
            const pos = this._inputEl.selectionStart || filtered.length;
            nextValue = filtered;
            this._inputEl.value = filtered;
            this._inputEl.setSelectionRange(Math.max(pos - 1, filtered.length), Math.max(pos - 1, filtered.length));
          }
        } catch (e) {
          console.warn('[ui-input-text] Invalid allowed-pattern:', allowed, e);
        }
      }
    }
    
    // Обновляем через setter (который синхронизируется с полем и формой)
    this.state.value = nextValue;
    
    // Обновляем локальные флаги
    this.setState({ dirty: true });
    
    // Отправляем событие для других слушателей (валидация, UI-обновления)
    this._emitEvent('ui-input-text:input', { value: nextValue, originalEvent: event });
  }

  _onChange(event) {
    let nextValue = event.target.value ?? '';
    if (this.state.mask === 'phone') {
      const digits = this._sanitizePhoneDigits(nextValue);
      nextValue = this._formatPhoneValue(digits);
      if (this._inputEl && this._inputEl.value !== nextValue) {
        this._inputEl.value = nextValue;
      }
    } else {
      const allowed = this.state.allowedPattern;
      if (allowed) {
        try {
          const regex = new RegExp(allowed, 'g');
          nextValue = (nextValue.match(regex) || []).join('');
        } catch (e) {
          console.warn('[ui-input-text] Invalid allowed-pattern:', allowed, e);
        }
      }
    }
    
    // Обновляем через setter
    this.state.value = nextValue;
    
    // Отправляем событие
    this._emitEvent('ui-input-text:change', { value: nextValue, originalEvent: event });
  }

  _onFocus(event) {
    this.setState({ focused: true });
    this._emitEvent('ui-input-text:focus', { value: this.state.value, originalEvent: event });
  }

  _onBlur(event) {
    this.setState({ focused: false });
    this._emitEvent('ui-input-text:blur', { value: this.state.value, originalEvent: event });
  }

  _onKeyDown(event) {
    // Обрабатываем backspace и delete для правильного удаления символов в маске телефона
    if (this.state.mask === 'phone' && (event.key === 'Backspace' || event.key === 'Delete')) {
      const input = event.target;
      const selectionStart = input.selectionStart;
      const selectionEnd = input.selectionEnd;
      
      // Если выделен текст, позволяем удалить его (событие input обработает форматирование)
      if (selectionStart !== selectionEnd) {
        return;
      }
      
      // Если курсор находится на разделителе (скобка, дефис, пробел), перемещаем его на предыдущую цифру
      const value = input.value;
      const cursorPos = selectionStart;
      
      if (event.key === 'Backspace' && cursorPos > 0) {
        const charBefore = value[cursorPos - 1];
        // Если перед курсором не цифра, пропускаем этот символ и удаляем предыдущую цифру
        if (!/\d/.test(charBefore) && charBefore !== '+') {
          event.preventDefault();
          // Ищем предыдущую цифру
          let prevDigitPos = cursorPos - 1;
          while (prevDigitPos > 0 && !/\d/.test(value[prevDigitPos - 1])) {
            prevDigitPos--;
          }
          if (prevDigitPos > 0 && value[prevDigitPos - 1] !== '+') {
            // Удаляем цифру перед разделителем
            const before = value.slice(0, prevDigitPos - 1);
            const after = value.slice(cursorPos);
            const tempValue = before + after;
            const digits = this._sanitizePhoneDigits(tempValue);
            const formatted = this._formatPhoneValue(digits);
            
            // Сохраняем предыдущее значение для правильного расчёта позиции курсора
            this._previousPhoneValue = value;
            
            input.value = formatted;
            const digitsBefore = (before.match(/\d/g) || []).length;
            const newCaret = this._getCaretPositionAfterDigit(formatted, digitsBefore);
            input.setSelectionRange(newCaret, newCaret);
            
            // Триггерим событие input для обновления состояния
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      }
    }
  }

  _onClear() {
    // Обновляем через setter
    if (this.state.mask === 'phone') {
      this.state.value = '';
      if (this._inputEl) {
        this._inputEl.value = '';
      }
      this._previousPhoneValue = '';
    } else {
      this.state.value = '';
    }
    
    // Обновляем локальные флаги
    this.setState({ dirty: true });
    
    // Отправляем события
    this._emitEvent('ui-input-text:clear', { value: '' });
    this._emitEvent('ui-input-text:change', { value: '' });
  }

  _onTogglePassword(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!this._inputEl || this.state.mask !== 'password') return;
    this._passwordVisible = !this._passwordVisible;
    const isVisible = this._passwordVisible;
    // Используем прямое присваивание для более надежного изменения типа
    this._inputEl.type = isVisible ? 'text' : 'password';
    // Обновляем иконку и aria-label
    const icon = this._toggleBtn?.querySelector('ui-icon');
    if (icon) {
      icon.setAttribute('name', isVisible ? 'eye-off' : 'eye');
    }
    if (this._toggleBtn) {
      this._toggleBtn.setAttribute('aria-label', isVisible ? 'Скрыть пароль' : 'Показать пароль');
    }
  }

  _sanitizePhoneDigits(raw) {
    let digits = String(raw || '').replace(/\D/g, '');
    if (!digits.length) {
      return '';
    }
    // Убираем 8 в начале (российский формат начинается с 7, не с 8)
    if (digits[0] === '8') {
      digits = digits.slice(1);
    }
    // Убираем ВСЕ ведущие "7" (код страны)
    // Код страны "+7" мы всегда добавляем сами при форматировании
    // Поэтому все "7" в начале - это код страны, который нужно убрать
    while (digits.length > 0 && digits[0] === '7') {
      digits = digits.slice(1);
      // Останавливаемся, если осталась только одна "7" и больше нет цифр
      // (это может быть начальный ввод, не трогаем)
      if (digits.length === 0) break;
    }
    // Ограничиваем 10 цифрами (российский номер без кода страны)
    return digits.slice(0, 10);
  }

  _formatPhoneValue(digits) {
    if (!digits || digits.length === 0) {
      return '';
    }
    // Всегда начинаем с +7 для российских номеров
    const parts = ['+7'];
    const block1 = digits.slice(0, 3);
    if (block1.length > 0) {
      parts.push(` (${block1}`);
      if (block1.length === 3) {
        parts[parts.length - 1] += ')';
      }
    }
    const block2 = digits.slice(3, 6);
    if (block2.length > 0) {
      parts.push(` ${block2}`);
    }
    const block3 = digits.slice(6, 8);
    if (block3.length > 0) {
      parts.push(`-${block3}`);
    }
    const block4 = digits.slice(8, 10);
    if (block4.length > 0) {
      parts.push(`-${block4}`);
    }
    return parts.join('');
  }

  /**
   * Вычисляет позицию курсора после форматирования телефона
   * @param {number} oldPos - позиция курсора до форматирования
   * @param {string} oldValue - значение до форматирования
   * @param {string} newValue - значение после форматирования
   * @param {string} digits - извлечённые цифры
   * @returns {number} - новая позиция курсора
   */
  _calculatePhoneCaretPosition(oldPos, oldValue, newValue, digits) {
    // Считаем количество цифр до старой позиции курсора
    const digitsBeforeOldPos = (oldValue.slice(0, oldPos).match(/\d/g) || []).length;
    
    // Если мы удаляем (старая позиция больше текущей длины или значение уменьшилось)
    const isDeleting = oldPos < oldValue.length || digitsBeforeOldPos > digits.length;
    
    if (isDeleting && digitsBeforeOldPos > digits.length) {
      // При удалении: позиционируем курсор после последней цифры, которая осталась
      const targetDigitIndex = Math.max(0, digitsBeforeOldPos - 1);
      return this._getCaretPositionAfterDigit(newValue, targetDigitIndex);
    } else {
      // При добавлении: позиционируем курсор после следующей цифры после введённой
      const targetDigitIndex = Math.min(digitsBeforeOldPos, digits.length);
      return this._getCaretPositionAfterDigit(newValue, targetDigitIndex);
    }
  }

  /**
   * Находит позицию курсора после указанной цифры в отформатированном номере
   * @param {string} formatted - отформатированный номер телефона
   * @param {number} digitIndex - индекс цифры (0-based)
   * @returns {number} - позиция курсора
   */
  _getCaretPositionAfterDigit(formatted, digitIndex) {
    let digitCount = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted[i])) {
        if (digitCount === digitIndex) {
          // Возвращаем позицию после этой цифры
          return i + 1;
        }
        digitCount++;
      }
    }
    // Если все цифры пройдены, возвращаем конец строки
    return formatted.length;
  }

  _emitValidation() {
    const messages = this.state.messages || { error: [], success: [], info: [] };
    this._emitEvent('ui-input-text:validation', {
      status: this.state.status || 'default',
      messages
    });
  }

  _emitLifecycleEvent(type) {
    this._emitEvent(`ui-input-text:${type}`, { value: this.state.value });
  }

  _emitEvent(name, detail) {
    this.dispatchEvent(new CustomEvent(name, {
      bubbles: true,
      composed: true,
      detail: {
        field: this.getAttribute('name') || this.state.name || null,
        ...detail
      }
    }));
  }

  // Публичный API

  /**
   * Получить текущее значение
   * @returns {string}
   */
  value() {
    return this.state.value ?? '';
  }

  /**
   * Установить значение
   * @param {string} value - новое значение
   * @returns {this}
   */
  setValue(value) {
    const previousValue = this.state.value;
    let newValue = String(value ?? '');
    if (this.state.mask === 'phone') {
      const digits = this._sanitizePhoneDigits(newValue);
      newValue = this._formatPhoneValue(digits);
    } else {
      const allowed = this.state.allowedPattern;
      if (allowed) {
        try {
          const regex = new RegExp(allowed, 'g');
          newValue = (newValue.match(regex) || []).join('');
        } catch (e) {
          console.warn('[ui-input-text] Invalid allowed-pattern:', allowed, e);
        }
      }
    }
    
    // Обновляем через setter (если есть связь с полем)
    if (this.state._valueDescriptor) {
      this.state.value = newValue;
    } else {
      this.setState({ value: newValue });
    }
    
    // Обновляем DOM напрямую (не перерисовываем!)
    if (this._inputEl && this._inputEl.value !== newValue) {
      this._inputEl.value = newValue;
    }
    
    // Устанавливаем dirty флаг
    if (previousValue !== newValue) {
      this.setState({ dirty: true });
      this._emitEvent('ui-input-text:change', { value: newValue, previousValue });
    }
    
    return this;
  }

  /**
   * Сбросить к дефолтному значению
   * @returns {this}
   */
  reset() {
    this.setValue('');
    this.setState({ dirty: false, touched: false });
    this._updateStatus();
    if (this.state.mask === 'phone') {
      this._previousPhoneValue = '';
    }
    return this;
  }

  /**
   * Проверить валидность
   * @returns {boolean}
   */
  isValid() {
    return !this.state.status || this.state.status !== 'error';
  }

  /**
   * Установить фокус на инпут
   * @returns {this}
   */
  focus() {
    if (this._inputEl) {
      this._inputEl.focus();
    }
    return this;
  }

  /**
   * Убрать фокус с инпута
   * @returns {this}
   */
  blur() {
    if (this._inputEl) {
      this._inputEl.blur();
    }
    return this;
  }
}

customElements.define('ui-input-text', UITextInput);


