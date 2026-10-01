import React from 'react';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import ViewListRoundedIcon from '@mui/icons-material/ViewListRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import HelpRoundedIcon from '@mui/icons-material/HelpRounded';
import KeyboardDoubleArrowLeftRoundedIcon from '@mui/icons-material/KeyboardDoubleArrowLeftRounded';

// SVG Icons
const HomeIcon = () => (
  <HomeRoundedIcon style={{ fontSize: 24 }} />
);

const ListIcon = () => (
  <ViewListRoundedIcon style={{ fontSize: 24 }} />
);

const DocsIcon = () => (
  <DescriptionRoundedIcon style={{ fontSize: 24 }} />
);

const SettingsIcon = () => (
  <SettingsRoundedIcon style={{ fontSize: 24 }} />
);

const HistoryIcon = () => (
  <HistoryRoundedIcon style={{ fontSize: 24 }} />
);

const HelpIcon = () => (
  <HelpRoundedIcon style={{ fontSize: 28 }} />
);

const CollapseIcon = () => (
  <KeyboardDoubleArrowLeftRoundedIcon style={{ fontSize: 32 }} />
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
