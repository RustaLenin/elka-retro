export function main_sidebar_template(state) {
  const sections = [
    { id: 'hero', label: 'Hero', icon: 'star' },
    { id: 'catalog', label: 'Catalog', icon: 'grid' },
    { id: 'news', label: 'News', icon: 'news' },
    { id: 'new-arrivals', label: 'New', icon: 'gift' },
    { id: 'popular', label: 'Popular', icon: 'fire' }
  ];
  
  const getIcon = (type) => {
    const icons = {
      star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
      grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
      news: '<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/>',
      gift: '<polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>',
      fire: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>'
    };
    return icons[type] || icons.star;
  };
  
  return `
    <div class="sidebar_toc-container ${state.collapsed ? 'sidebar_toc-container--collapsed' : ''}">
      <button class="sidebar_toc-toggle_button ToggleSidebar" aria-label="Toggle sidebar">
        <svg class="sidebar_toc-toggle_icon ${state.collapsed ? 'sidebar_toc-toggle_icon--collapsed' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
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
            <svg class="sidebar_toc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              ${getIcon(section.icon)}
            </svg>
            <span class="sidebar_toc-label">${section.label}</span>
          </a>
        `).join('')}
      </nav>
    </div>
  `;
}