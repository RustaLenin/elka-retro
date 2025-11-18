const ACTION_ATTR = 'data-app-action';
const PAYLOAD_ATTR = 'data-app-payload';
const PREVENT_DEFAULT_ATTR = 'data-app-prevent-default';
const STOP_PROP_ATTR = 'data-app-stop';
const DISABLED_ATTR = 'data-app-action-disabled';

function parseActionIdentifier(action) {
  if (!action || typeof action !== 'string') {
    console.warn('[app.events] Action must be a non-empty string');
    return null;
  }

  const trimmed = action.trim();
  const dotIndex = trimmed.indexOf('.');
  if (dotIndex === -1) {
    console.warn('[app.events] Action must use "namespace.action" format. Received:', action);
    return null;
  }

  const namespace = trimmed.slice(0, dotIndex);
  const name = trimmed.slice(dotIndex + 1);

  if (!namespace || !name) {
    console.warn('[app.events] Invalid action format:', action);
    return null;
  }

  return { namespace, name, action: `${namespace}.${name}` };
}

function parsePayloadAttr(value, element) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn('[app.events] Failed to parse data-app-payload JSON:', value, 'Element:', element, error);
    return null;
  }
}

export function createEventBus() {
  const registry = new Map(); // namespace -> Map<actionName, handler>

  function register(namespace, handlers) {
    if (!namespace || typeof namespace !== 'string') {
      console.warn('[app.events] register() requires namespace string');
      return;
    }
    if (!handlers || typeof handlers !== 'object') {
      console.warn('[app.events] register() requires handlers object');
      return;
    }

    const normalizedNamespace = namespace.trim();
    const existing = registry.get(normalizedNamespace) || new Map();

    Object.entries(handlers).forEach(([name, handler]) => {
      if (typeof handler !== 'function') {
        console.warn(`[app.events] Handler for "${normalizedNamespace}.${name}" must be a function`);
        return;
      }
      existing.set(name, handler);
    });

    registry.set(normalizedNamespace, existing);
  }

  function unregister(namespace, handlerName) {
    if (!namespace || typeof namespace !== 'string') return;
    const normalizedNamespace = namespace.trim();
    const existing = registry.get(normalizedNamespace);
    if (!existing) return;

    if (handlerName) {
      existing.delete(handlerName);
      if (existing.size === 0) {
        registry.delete(normalizedNamespace);
      }
      return;
    }

    registry.delete(normalizedNamespace);
  }

  function emit(action, payload = null, ctxOverrides = {}) {
    const descriptor = parseActionIdentifier(action);
    if (!descriptor) return null;

    const handlers = registry.get(descriptor.namespace);
    const handler = handlers?.get(descriptor.name);

    if (!handler) {
      console.warn('[app.events] No handler registered for action:', descriptor.action);
      return null;
    }

    const context = {
      action: descriptor.action,
      namespace: descriptor.namespace,
      name: descriptor.name,
      payload,
      ...ctxOverrides,
    };

    try {
      return handler(context);
    } catch (error) {
      console.error('[app.events] Error while executing handler', descriptor.action, error);
      return null;
    }
  }

  function getInteractiveTarget(event) {
    if (!event || !(event.target instanceof Element)) return null;
    return event.target.closest(`[${ACTION_ATTR}]`);
  }

  function dispatchFromDom(event) {
    const target = getInteractiveTarget(event);
    if (!target) return false;
    if (target.getAttribute(DISABLED_ATTR) === 'true') {
      return false;
    }

    const action = target.getAttribute(ACTION_ATTR);
    if (!action) return false;

    const preventAttr = target.getAttribute(PREVENT_DEFAULT_ATTR);
    if (preventAttr !== 'false') {
      event.preventDefault();
    }

    const stopAttr = target.getAttribute(STOP_PROP_ATTR);
    if (stopAttr === 'true') {
      event.stopPropagation();
    }

    const payloadAttr = target.getAttribute(PAYLOAD_ATTR);
    const payload = parsePayloadAttr(payloadAttr, target);

    return emit(action, payload, {
      element: target,
      originalEvent: event,
    });
  }

  return {
    register,
    unregister,
    emit,
    dispatchFromDom,
    _registry: registry, // for debugging
  };
}


