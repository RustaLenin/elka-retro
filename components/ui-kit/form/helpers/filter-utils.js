/**
 * Утилита для получения активных фильтров из формы
 * @param {HTMLElement} formController - экземпляр ui-form-controller
 * @returns {Array<{id: string, label: string, value: any, fieldConfig: object}>}
 */
export function getActiveFilters(formController) {
  if (!formController || typeof formController.getValues !== 'function') {
    console.warn('getActiveFilters: formController должен быть экземпляром ui-form-controller');
    return [];
  }

  const values = formController.getValues();
  const config = formController.state?.config || {};
  const fields = Array.isArray(config.fields) ? config.fields : [];
  const activeFilters = [];

  fields.forEach(fieldConfig => {
    const fieldId = fieldConfig.id;
    if (!fieldId) return;

    const value = values[fieldId];
    if (value === null || value === undefined || value === '') return;
    if (Array.isArray(value) && value.length === 0) return;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Для range: проверяем, что хотя бы одно значение заполнено
      if (value.min === null && value.max === null) return;
      if (value.min === undefined && value.max === undefined) return;
    }

    activeFilters.push({
      id: fieldId,
      label: fieldConfig.label || fieldId,
      value: value,
      fieldConfig: fieldConfig
    });
  });

  return activeFilters;
}

