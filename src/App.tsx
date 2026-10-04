import { useState, useEffect } from 'react'
import Login from './Login'
import Inicio from './Inicio'
import Listado from './Listado'

type Page = 'inicio' | 'listado' | 'tramites' | 'gestion' | 'historial';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('token');
  });
  
  const [activePage, setActivePage] = useState<Page>('inicio');

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  const handleNavigate = (page: Page) => {
    setActivePage(page);
  };

  if (isAuthenticated) {
    if (activePage === 'listado') {
      return <Listado onLogout={handleLogout} onNavigate={handleNavigate} />;
    }
    return <Inicio onLogout={handleLogout} onNavigate={handleNavigate} />;
  }

  return <Login onLogin={handleLogin} />
}

export default App
