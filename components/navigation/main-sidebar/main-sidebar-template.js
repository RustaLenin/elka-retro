export function main_sidebar_template(state) {
  const sections = [
    { id: 'hero', label: 'Hero', icon: 'star' },
    { id: 'catalog', label: 'Catalog', icon: 'grid' },
    { id: 'news', label: 'News', icon: 'news' },
    { id: 'new-arrivals', label: 'New', icon: 'gift' },
    { id: 'popular', label: 'Popular', icon: 'fire' }
  ];
  
  return `
    <div class="sidebar_toc-container ${state.collapsed ? 'sidebar_toc-container--collapsed' : ''}">
      <button class="sidebar_toc-toggle_button ToggleSidebar" aria-label="Toggle sidebar">
        <ui-icon name="chevron_left" size="medium" class="sidebar_toc-toggle_icon ${state.collapsed ? 'sidebar_toc-toggle_icon--collapsed' : ''}"></ui-icon>
      </button>
      
      <nav class="sidebar_toc-nav" aria-label="Table of contents">
        ${sections.map(section => `
          <a 
            href="#${section.id}" 
            class="sidebar_toc-link ${state.activeSection === section.id ? 'sidebar_toc-link--active' : ''} ScrollToSection"
            data-section="${section.id}"
            title="${section.label}"
            aria-label="${section.label}"
          >
            <ui-icon name="${section.icon}" size="medium" class="sidebar_toc-icon"></ui-icon>
            <span class="sidebar_toc-label">${section.label}</span>
          </a>
        `).join('')}
      </nav>
    </div>
  `;
}