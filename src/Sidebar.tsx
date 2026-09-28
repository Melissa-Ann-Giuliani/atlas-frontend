import React from 'react';

// SVG Icons
const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
);

const ListIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 6h13"></path>
    <path d="M8 12h13"></path>
    <path d="M8 18h13"></path>
    <rect x="3" y="4" width="2" height="2"></rect>
    <rect x="3" y="10" width="2" height="2"></rect>
    <rect x="3" y="16" width="2" height="2"></rect>
  </svg>
);

const DocsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);

const HistoryIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v2"></path>
    <path d="M12 20v2"></path>
    <path d="M2 12h2"></path>
    <path d="M20 12h2"></path>
    <circle cx="12" cy="12" r="8"></circle>
    <polyline points="12 8 12 12 15 15"></polyline>
  </svg>
);

const HelpIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

const CollapseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="11 17 6 12 11 7"></polyline>
    <polyline points="18 17 13 12 18 7"></polyline>
  </svg>
);

export type SidebarItem = 'inicio' | 'listado' | 'tramites' | 'gestion' | 'historial';

interface SidebarProps {
  activeItem: SidebarItem;
}

export default function Sidebar({ activeItem }: SidebarProps) {
  return (
    <aside className="sidebar">

      <nav className="sidebar-nav">
        <a href="#" className={`nav-item ${activeItem === 'inicio' ? 'active' : ''}`}>
          <HomeIcon />
          <span>Inicio</span>
        </a>
        <a href="#" className={`nav-item ${activeItem === 'listado' ? 'active' : ''}`}>
          <ListIcon />
          <span>Listado</span>
        </a>
        <a href="#" className={`nav-item ${activeItem === 'tramites' ? 'active' : ''}`}>
          <DocsIcon />
          <span>Trámites</span>
        </a>
        <a href="#" className={`nav-item ${activeItem === 'gestion' ? 'active' : ''}`}>
          <SettingsIcon />
          <span>Gestión</span>
        </a>
        <a href="#" className={`nav-item ${activeItem === 'historial' ? 'active' : ''}`}>
          <HistoryIcon />
          <span>Historial</span>
        </a>
      </nav>

      <div className="sidebar-collapse">
        <button className="collapse-btn">
          <CollapseIcon />
        </button>
      </div>

      <div className="sidebar-footer">
        <button className="help-btn">
          <HelpIcon />
          <span>Ayuda</span>
        </button>
      </div>
    </aside>
  );
}
