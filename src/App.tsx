import { useState, useEffect } from 'react'
import Login from './Login'
import Inicio from './Inicio'
import Listado from './Listado'
import DocenteDetalle from './DocenteDetalle'



type Page = 'inicio' | 'listado' | 'tramites' | 'gestion' | 'historial' | 'docente_detalle' | 'modificar_docente';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('token');
  });
  
  const [activePage, setActivePage] = useState<Page>('inicio');
  const [selectedDocente, setSelectedDocente] = useState<any>(null);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  const handleNavigate = (page: Page, data?: any) => {
    setActivePage(page);
    if (page === 'docente_detalle' && data) {
      setSelectedDocente(data);
    }
  };

  if (isAuthenticated) {
    if (activePage === 'listado') {
      return <Listado onLogout={handleLogout} onNavigate={handleNavigate} />;
    }
    if (activePage === 'docente_detalle' && selectedDocente) {
      return <DocenteDetalle docente={selectedDocente} onLogout={handleLogout} onNavigate={handleNavigate} />;
    }
    return <Inicio onLogout={handleLogout} onNavigate={handleNavigate} />;
  }

  return <Login onLogin={handleLogin} />
}

export default App
