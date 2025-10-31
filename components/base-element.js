export class BaseElement extends HTMLElement {
  static get observedAttributes() {
    const schema = this.stateSchema || {};
    return Object.values(schema)
      .filter(def => def && def.attribute && def.attribute.observed)
      .map(def => def.attribute.name);
  }

  constructor() {
    super();
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
        this.state[key] = this.parseByType(def, value);
        this.onStateChanged(key);
        if (typeof this.render === 'function') this.render();
        return;
      }
    }
  }

  setState(partial) {
    const schema = this.constructor.stateSchema || {};
    let needRender = false;
    for (const key in partial) {
      const next = partial[key];
      this.state[key] = next;
      needRender = true;
      const def = schema[key];
      if (def && def.attribute?.reflect) {
        const attrName = def.attribute.name;
        const attrVal = this.formatForAttribute(def, next);
        if (attrVal === null) this.removeAttribute(attrName);
        else this.setAttribute(attrName, attrVal);
      }
    }
    if (needRender && typeof this.render === 'function') {
      this.onStateChanged(null);
      this.render();
    }
  }

  onStateChanged(_key) {}

  connectedCallback() {
    // By default only init from attributes; rendering is responsibility of child
    this.initStateFromAttributes();
  }
}


