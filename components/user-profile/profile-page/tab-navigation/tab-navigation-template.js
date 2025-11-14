/**
 * Tab Navigation Template
 */

export function renderTabNavigationTemplate(state) {
  const { activeTab, tabs } = state;

  if (!tabs || tabs.length === 0) {
    return '<nav class="tab-navigation"></nav>';
  }

  const tabsHtml = tabs.map(tab => `
    <ui-button 
      type="ghost"
      label="${tab.label}"
      event="tab-navigation:tab-click"
      data-tab-id="${tab.id}"
      aria-label="${tab.label}"
      ${tab.id === activeTab ? 'aria-current="page"' : ''}
      class="tab-navigation__button ${tab.id === activeTab ? 'tab-navigation__button--active' : ''}"
    ></ui-button>
  `).join('');

  return `
    <nav class="tab-navigation" role="tablist">
      ${tabsHtml}
    </nav>
  `;
}

