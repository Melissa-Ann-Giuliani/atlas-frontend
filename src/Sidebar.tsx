import { useState } from 'react';
import { FiHome, FiList, FiFileText, FiBookOpen, FiClock, FiHelpCircle, FiChevronsLeft, FiChevronsRight } from "react-icons/fi";

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
}

export default function Sidebar({ activeItem }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>

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
