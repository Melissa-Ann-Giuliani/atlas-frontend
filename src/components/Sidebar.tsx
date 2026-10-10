import { useState } from 'react';
import { FiHome, FiList, FiFileText, FiBookOpen, FiClock, FiHelpCircle, FiChevronsLeft, FiChevronsRight } from "react-icons/fi";
import './Sidebar.css';

// SVG Icons
const HomeIcon = () => (
  <FiHome size={24} />
);

const ListIcon = () => (
  <FiList size={24} />
);

const DocsIcon = () => (
  <FiFileText size={24} />
);

const SettingsIcon = () => (
  <FiBookOpen size={24} />
);

const HistoryIcon = () => (
  <FiClock size={24} />
);

const HelpIcon = () => (
  <FiHelpCircle size={28} />
);

const CollapseIcon = ({ isCollapsed }: { isCollapsed: boolean }) => (
  isCollapsed ?
    <FiChevronsRight size={32} /> :
    <FiChevronsLeft size={32} />
);

export type SidebarItem = 'inicio' | 'listado' | 'tramites' | 'gestion' | 'historial';

interface SidebarProps {
  activeItem: SidebarItem;
  onNavigate?: (item: SidebarItem) => void;
}

export default function Sidebar({ activeItem, onNavigate }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleNavClick = (e: React.MouseEvent, item: SidebarItem) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate(item);
    }
  };

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>

      <nav className="sidebar-nav">
        <a href="/inicio" className={`nav-item ${activeItem === 'inicio' ? 'active' : ''}`} onClick={(e) => handleNavClick(e, 'inicio')}>
          <HomeIcon />
          <span>Inicio</span>
        </a>
        <a href="/listado" className={`nav-item ${activeItem === 'listado' ? 'active' : ''}`} onClick={(e) => handleNavClick(e, 'listado')}>
          <ListIcon />
          <span>Listado</span>
        </a>
        <a href="/tramites" className={`nav-item ${activeItem === 'tramites' ? 'active' : ''}`} onClick={(e) => handleNavClick(e, 'tramites')}>
          <DocsIcon />
          <span>Trámites</span>
        </a>
        <a href="/gestion" className={`nav-item ${activeItem === 'gestion' ? 'active' : ''}`} onClick={(e) => handleNavClick(e, 'gestion')}>
          <SettingsIcon />
          <span>Gestión</span>
        </a>
        <a href="/historial" className={`nav-item ${activeItem === 'historial' ? 'active' : ''}`} onClick={(e) => handleNavClick(e, 'historial')}>
          <HistoryIcon />
          <span>Historial</span>
        </a>
      </nav>

      <div className="sidebar-collapse">
        <button className="collapse-btn" onClick={() => setIsCollapsed(!isCollapsed)}>
          <CollapseIcon isCollapsed={isCollapsed} />
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
