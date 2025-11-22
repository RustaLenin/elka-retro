const DEFAULT_AREA_CLASS = 'UIModalArea';

function ensureModalArea() {
  let area = document.querySelector(`.${DEFAULT_AREA_CLASS}`);
  if (!area) {
    area = document.createElement('div');
    area.className = DEFAULT_AREA_CLASS;
    document.body.appendChild(area);
  }
  return area;
}

function waitForModalRender(modal) {
  return new Promise((resolve) => {
    const container = modal._getContainerElement?.() || modal.__getContainerElement?.();
    if (container && container.querySelector('.modal_body')) {
      resolve(container);
      return;
    }
    const onRendered = () => {
      modal.removeEventListener('ui-modal:rendered', onRendered);
      resolve(modal);
    };
    modal.addEventListener('ui-modal:rendered', onRendered);
  });
}

function applyBodyContent(modal, html) {
  if (!modal?.setBodyContent) return;
  modal.setBodyContent(html);
  // Обработчики для ссылок теперь работают через глобальный делегат кликов (data-app-action)
  // Не нужно навешивать их вручную
}

export function createModalManager() {
  const schemas = new Map();
  const instances = new Map();
  const modalStack = [];

  function attachManagedHandlers(modal, id) {
    if (modal.__modalManagerAttached) return;
    modal.addEventListener('ui-modal:request-close', (event) => {
      event.preventDefault();
      close(id);
    });
    modal.__modalManagerAttached = true;
  }

  function hideAllExcept(id) {
    modalStack.forEach((modalId) => {
      if (modalId === id) return;
      const existing = instances.get(modalId);
      if (existing && existing.isVisible?.()) {
        existing.hide?.();
      }
    });
  }

  function runBodyReady(modal, schema, id) {
    if (!schema || typeof schema.onBodyReady !== 'function') return;
    const helpers = {
      updateBody: async (html) => {
        applyBodyContent(modal, html);
        await waitForModalRender(modal);
        runBodyReady(modal, schema, id);
      },
      close: () => close(id),
    };
    schema.onBodyReady(modal, helpers);
  }

  function register(schema) {
    if (!schema || !schema.id) {
      console.warn('[app.modal] Schema must contain id');
      return;
    }
    schemas.set(schema.id, schema);
  }

  function unregister(id) {
    schemas.delete(id);
    const modal = instances.get(id);
    if (modal) {
      modal.remove();
      instances.delete(id);
    }
  }

  function getSchema(id) {
    return schemas.get(id);
  }

  function getInstance(id) {
    return instances.get(id) || null;
  }

  async function open(id, overrides = {}) {
    const schema = { ...schemas.get(id), ...overrides };
    if (!schema) {
      console.warn('[app.modal] Unknown modal schema:', id);
      return null;
    }

    let modal = instances.get(id);
    if (!modal) {
      modal = document.createElement('ui-modal');
      modal.dataset.modalId = id;
      ensureModalArea().appendChild(modal);
      instances.set(id, modal);
    } else {
      modal.dataset.modalId = id;
    }
    attachManagedHandlers(modal, id);

    const existingIndex = modalStack.indexOf(id);
    if (existingIndex !== -1) {
      modalStack.splice(existingIndex, 1);
    }
    modalStack.push(id);
    hideAllExcept(id);

    if (schema.title && modal.setTitle) {
      modal.setTitle(schema.title);
    }
    if (schema.size && modal.setSize) {
      modal.setSize(schema.size);
    }
    if (typeof schema.closable === 'boolean' && modal.setClosable) {
      modal.setClosable(schema.closable);
    }
    if (schema.bodyPadding) {
      modal.setAttribute('body-padding', schema.bodyPadding);
    }
    if (typeof schema.footer !== 'undefined') {
      if (schema.footer === false || schema.footer === 'none') {
        modal.setAttribute('footer', 'none');
      } else if (typeof schema.footer === 'string') {
        modal.setAttribute('footer', schema.footer);
      } else {
        modal.removeAttribute('footer');
      }
    } else {
      modal.removeAttribute('footer');
    }

    await waitForModalRender(modal);
    const container =
      modal._getContainerElement?.() ||
      modal.__getContainerElement?.() ||
      modal.querySelector?.('.modal_container');
    if (container) {
      container.dataset.modalId = id;
    }

    const bodyContent =
      typeof schema.body === 'function' ? schema.body({ modal, schema }) : schema.body || '';
    applyBodyContent(modal, bodyContent);

    if (typeof schema.footerContent !== 'undefined') {
      const footerContent = typeof schema.footerContent === 'function'
        ? schema.footerContent({ modal, schema })
        : schema.footerContent;
      modal.setFooterContent?.(footerContent || '');
    } else {
      modal.setFooterContent?.('');
    }

    schema.onBeforeShow?.(modal);
    modal.show?.();
    await waitForModalRender(modal);
    schema.onAfterShow?.(modal);

    runBodyReady(modal, schema, id);

    return modal;
  }

  function close(id) {
    const modal = instances.get(id);
    if (!modal) return;

    modal.hide?.();
    modal.remove();
    instances.delete(id);

    const stackIndex = modalStack.indexOf(id);
    if (stackIndex !== -1) {
      modalStack.splice(stackIndex, 1);
    }

    const previousId = modalStack[modalStack.length - 1];
    if (previousId) {
      const previousModal = instances.get(previousId);
      if (previousModal && !previousModal.isVisible?.()) {
        previousModal.show?.();
        const prevSchema = schemas.get(previousId);
        waitForModalRender(previousModal).then(() => {
          prevSchema?.onAfterShow?.(previousModal);
          runBodyReady(previousModal, prevSchema, previousId);
        });
      }
    }
  }

  function hideAll() {
    [...modalStack].forEach((modalId) => close(modalId));
  }

  function updateBody(id, html) {
    const modal = instances.get(id);
    if (modal) {
      applyBodyContent(modal, html);
    }
  }

  return {
    register,
    unregister,
    getSchema,
    getInstance,
    open,
    close,
    hideAll,
    updateBody,
    list: () => Array.from(schemas.keys()),
  };
}


