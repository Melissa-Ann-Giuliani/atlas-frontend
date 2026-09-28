import React, { useState, useEffect } from 'react';

// SVG Icons
const SunIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4"></circle>
    <path d="M12 2v2"></path>
    <path d="M12 20v2"></path>
    <path d="M4.93 4.93l1.41 1.41"></path>
    <path d="M17.66 17.66l1.41 1.41"></path>
    <path d="M2 12h2"></path>
    <path d="M20 12h2"></path>
    <path d="M4.93 19.07l1.41-1.41"></path>
    <path d="M17.66 6.34l1.41-1.41"></path>
  </svg>
);

const MoonIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
  </svg>
);

const LogoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
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
