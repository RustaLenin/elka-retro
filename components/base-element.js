export class BaseElement extends HTMLElement {
  static get observedAttributes() {
    const schema = this.stateSchema || {};
    return Object.values(schema)
      .filter(def => def && def.attribute && def.attribute.observed)
      .map(def => def.attribute.name);
  }

  constructor() {
    super();
    // По умолчанию автоматический рендер включен
    // Компонент может установить static autoRender = false для ручного управления рендером
    if (this.constructor.autoRender === undefined) {
      this.constructor.autoRender = true;
    }
    this.state = this.buildDefaultState();
  }

  buildDefaultState() {
    const schema = this.constructor.stateSchema || {};
    const state = {};
    for (const key in schema) state[key] = schema[key].default;
    return state;
  }

  parseByType(def, raw) {
    switch (def.type) {
      case 'boolean': return raw !== null && raw !== 'false' && raw !== '0';
      case 'number':  return raw == null || raw === '' ? null : Number(raw);
      case 'json':
        if (!raw) return null;
        try { return JSON.parse(raw); } catch { return null; }
      default:        return raw ?? null;
    }
  }

  formatForAttribute(def, value) {
    switch (def.type) {
      case 'boolean': return value ? '' : null; // presence boolean
      case 'json':    return value == null ? null : JSON.stringify(value);
      default:        return value == null ? null : String(value);
    }
  }

  initStateFromAttributes() {
    const schema = this.constructor.stateSchema || {};
    for (const key in schema) {
      const def = schema[key];
      if (def.attribute?.name && this.hasAttribute(def.attribute.name)) {
        this.state[key] = this.parseByType(def, this.getAttribute(def.attribute.name));
      }
    }
  }

  attributeChangedCallback(name, _old, value) {
    const schema = this.constructor.stateSchema || {};
    for (const key in schema) {
      const def = schema[key];
      if (def.attribute?.name === name && def.attribute.observed) {
        const prev = this.state[key];
        this.state[key] = this.parseByType(def, value);
        
        // Вызываем onStateChanged
        if (prev !== this.state[key]) {
          this.onStateChanged(key);
          
          // Автоматический рендер, если включен
          if (this.constructor.autoRender && typeof this.render === 'function') {
            this.render();
          }
        }
        return;
      }
    }
  }

  setState(partial) {
    const schema = this.constructor.stateSchema || {};
    const changedKeys = [];
    for (const key in partial) {
      const next = partial[key];
      const prev = this.state[key];
      
      // Обновляем состояние
      this.state[key] = next;
      
      // Отслеживаем измененные ключи
      if (prev !== next) {
        changedKeys.push(key);
      }
      
      // Обновляем атрибуты, если нужно
      const def = schema[key];
      if (def && def.attribute?.reflect) {
        const attrName = def.attribute.name;
        const attrVal = this.formatForAttribute(def, next);
        if (attrVal === null) this.removeAttribute(attrName);
        else this.setAttribute(attrName, attrVal);
      }
    }
    
    // Вызываем onStateChanged для каждого измененного ключа
    if (changedKeys.length > 0 && typeof this.onStateChanged === 'function') {
      changedKeys.forEach(key => {
        this.onStateChanged(key);
      });
      
      // Автоматический рендер, если включен
      if (this.constructor.autoRender && typeof this.render === 'function') {
        this.render();
      }
    }
  }

  onStateChanged(_key) {}

  connectedCallback() {
    // By default only init from attributes; rendering is responsibility of child
    this.initStateFromAttributes();
  }
}


