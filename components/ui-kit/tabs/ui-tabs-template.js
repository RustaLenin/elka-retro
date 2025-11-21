/**
 * UI Tabs Template
 * 
 * Шаблон для рендеринга навигации табов
 * 
 * @package ElkaRetro
 */

export function renderTabsTemplate(state) {
  const { activeTab, tabs, size = 'medium' } = state;

  if (!tabs || tabs.length === 0) {
    return `<nav class="ui-tabs ui-tabs--${size}"></nav>`;
  }

  const tabsHtml = tabs.map(tab => `
    <ui-button 
      type="ghost"
      label="${tab.label}"
      event="ui-tabs:tab-click"
      data-tab-id="${tab.id}"
      aria-label="${tab.label}"
      ${tab.id === activeTab ? 'aria-current="page"' : ''}
      class="ui-tabs__button ui-tabs__button--${size} ${tab.id === activeTab ? 'ui-tabs__button--active' : ''}"
    ></ui-button>
  `).join('');

  return `
    <nav class="ui-tabs ui-tabs--${size}" role="tablist">
      ${tabsHtml}
    </nav>
  `;
}

