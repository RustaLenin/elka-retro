// Lightweight tooltip manager using event delegation

const DEFAULTS = {
  placement: 'top', // top|right|bottom|left
  trigger: 'hover', // hover|click|focus
  delay: 150,
  interactive: false,
  offset: 8,
};

class TooltipManager {
  constructor() {
    this.tooltipEl = null;
    this.arrowEl = null;
    this.currentTarget = null;
    this.hideTimer = null;
    this.showTimer = null;

    this.ensureDom();
    this.bindEvents();
  }

  ensureDom() {
    window.app.toolkit.loadCSSOnce(new URL('./tooltip-styles.css', import.meta.url));
    const el = document.createElement('div');
    el.className = 'ui-tooltip';
    el.setAttribute('role', 'tooltip');
    el.style.position = 'fixed';
    el.style.top = '-9999px';
    el.style.left = '-9999px';
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
    const arrow = document.createElement('div');
    arrow.className = 'ui-tooltip__arrow';
    el.appendChild(arrow);
    const content = document.createElement('div');
    content.className = 'ui-tooltip__content';
    el.appendChild(content);
    document.body.appendChild(el);
    this.tooltipEl = el;
    this.arrowEl = arrow;
  }

  bindEvents() {
    document.addEventListener('mouseenter', this.onEnter.bind(this), true);
    document.addEventListener('mouseleave', this.onLeave.bind(this), true);
    document.addEventListener('focusin', this.onFocus.bind(this));
    document.addEventListener('focusout', this.onBlur.bind(this));
    document.addEventListener('click', this.onClick.bind(this));
    window.addEventListener('scroll', () => this.reposition(), true);
    window.addEventListener('resize', () => this.reposition());
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.hide(); });
  }

  getOptionsFrom(el) {
    return {
      placement: el.getAttribute('data-hint-placement') || DEFAULTS.placement,
      trigger: el.getAttribute('data-hint-trigger') || DEFAULTS.trigger,
      delay: Number(el.getAttribute('data-hint-delay')) || DEFAULTS.delay,
      interactive: el.hasAttribute('data-hint-interactive') || DEFAULTS.interactive,
      offset: Number(el.getAttribute('data-hint-offset')) || DEFAULTS.offset,
    };
  }

  onEnter(e) {
    const target = this.findHintTarget(e.target);
    if (!target) return;
    const opts = this.getOptionsFrom(target);
    if (opts.trigger !== 'hover') return;
    this.scheduleShow(target, opts);
  }

  onLeave(e) {
    const target = this.findHintTarget(e.target);
    if (!target) return;
    const opts = this.getOptionsFrom(target);
    if (opts.trigger !== 'hover') return;
    this.scheduleHide(opts);
  }

  onFocus(e) {
    const target = this.findHintTarget(e.target);
    if (!target) return;
    const opts = this.getOptionsFrom(target);
    if (opts.trigger !== 'focus') return;
    this.show(target, opts);
  }

  onBlur(e) {
    const target = this.findHintTarget(e.target);
    if (!target) return;
    const opts = this.getOptionsFrom(target);
    if (opts.trigger !== 'focus') return;
    this.hide();
  }

  onClick(e) {
    const target = this.findHintTarget(e.target);
    if (!target) return;
    const opts = this.getOptionsFrom(target);
    if (opts.trigger !== 'click') return;
    if (this.currentTarget === target && this.tooltipEl.style.opacity === '1') {
      this.hide();
    } else {
      this.show(target, opts);
    }
  }

  findHintTarget(node) {
    let el = node;
    while (el && el !== document.documentElement) {
      if (el instanceof Element && el.hasAttribute('data-hint')) return el;
      el = el.parentNode;
    }
    return null;
  }

  scheduleShow(target, opts) {
    clearTimeout(this.hideTimer); clearTimeout(this.showTimer);
    this.showTimer = setTimeout(() => this.show(target, opts), opts.delay);
  }

  scheduleHide(opts) {
    clearTimeout(this.hideTimer); clearTimeout(this.showTimer);
    this.hideTimer = setTimeout(() => this.hide(), opts.delay);
  }

  show(target, opts) {
    const text = target.getAttribute('data-hint');
    if (!text) return;
    this.currentTarget = target;
    this.tooltipEl.querySelector('.ui-tooltip__content').textContent = text;
    this.tooltipEl.style.opacity = '1';
    this.tooltipEl.style.pointerEvents = opts.interactive ? 'auto' : 'none';
    this.reposition(opts);
    // a11y
    if (!target.id) target.id = `hint-${Math.random().toString(36).slice(2, 8)}`;
    this.tooltipEl.setAttribute('aria-describedby', target.id);
  }

  hide() {
    this.currentTarget = null;
    this.tooltipEl.style.opacity = '0';
    this.tooltipEl.style.top = '-9999px';
    this.tooltipEl.style.left = '-9999px';
  }

  reposition(opts) {
    if (!this.currentTarget) return;
    const rect = this.currentTarget.getBoundingClientRect();
    const tip = this.tooltipEl;
    const arrow = this.arrowEl;
    const { placement = DEFAULTS.placement, offset = DEFAULTS.offset } = opts || this.getOptionsFrom(this.currentTarget);

    tip.style.maxWidth = '320px';
    tip.style.visibility = 'hidden';
    tip.style.top = '0px'; tip.style.left = '0px';
    const tipRect = tip.getBoundingClientRect();

    let top = 0, left = 0;
    arrow.setAttribute('data-placement', placement);
    switch (placement) {
      case 'bottom':
        top = rect.bottom + offset;
        left = rect.left + (rect.width - tipRect.width) / 2;
        break;
      case 'left':
        top = rect.top + (rect.height - tipRect.height) / 2;
        left = rect.left - tipRect.width - offset;
        break;
      case 'right':
        top = rect.top + (rect.height - tipRect.height) / 2;
        left = rect.right + offset;
        break;
      case 'top':
      default:
        top = rect.top - tipRect.height - offset;
        left = rect.left + (rect.width - tipRect.width) / 2;
    }

    // keep within viewport
    const vw = window.innerWidth, vh = window.innerHeight;
    left = Math.max(8, Math.min(left, vw - tipRect.width - 8));
    top = Math.max(8, Math.min(top, vh - tipRect.height - 8));

    tip.style.visibility = 'visible';
    tip.style.top = `${Math.round(top)}px`;
    tip.style.left = `${Math.round(left)}px`;
  }
}

// Initialize singleton
if (!window.UIHintManager) {
  window.UIHintManager = new TooltipManager();
}

// Optional helpers
if (window.app && window.app.ui) {
  window.app.ui.showHint = function(target, opts = {}) {
    if (!target) return;
    window.UIHintManager.show(target, opts);
  };
  window.app.ui.hideHint = function() { window.UIHintManager.hide(); };
}


