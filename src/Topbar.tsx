import React, { useState, useEffect } from 'react';
import { FiSun, FiMoon, FiLogOut } from "react-icons/fi";

// SVG Icons
const SunIcon = () => (
  <FiSun size={20} />
);

const MoonIcon = () => (
  <FiMoon size={20} />
);

const LogoutIcon = () => (
  <FiLogOut size={20} />
);

interface TopbarProps {
  onLogout?: () => void;
}

export default function Topbar({ onLogout }: TopbarProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Optionally sync with localStorage or system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDark(true);
      document.body.classList.add('dark-theme');
    }
  }, []);

  const toggleTheme = () => {
    setIsDark(prev => {
      const newTheme = !prev;
      if (newTheme) {
        document.body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
      } else {
        document.body.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
      }
      return newTheme;
    });
  };

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <div className="logo-icon">
          <div className="logo-quadrant yellow">F</div>
          <div className="logo-quadrant green">F</div>
          <div className="logo-quadrant green-dark">H</div>
          <div className="logo-quadrant green">A</div>
        </div>
        <h1 className="logo-text">Atlas</h1>
      </div>
      <div className="topbar-actions">
        <button className="icon-btn" onClick={toggleTheme} title={isDark ? "Modo Claro" : "Modo Oscuro"}>
          {isDark ? <SunIcon /> : <MoonIcon />}
        </button>
        <button className="icon-btn" onClick={onLogout} title="Cerrar sesión">
          <LogoutIcon />
        </button>
        <div className="user-avatar">F</div>
      </div>
    </header>
  );
}
