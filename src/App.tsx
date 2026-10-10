import { useState, useEffect } from 'react'
import Login from './Login'
import Inicio from './Inicio'
import Listado from './Listado'
import DocenteDetalle from './DocenteDetalle'



type Page = 'inicio' | 'listado' | 'tramites' | 'gestion' | 'historial' | 'docente_detalle' | 'cargo_detalle' | 'licencia_detalle' | 'modificar_docente';

const getPathFromPage = (page: Page): string => {
  if (page === 'docente_detalle') return 'listado/docente_detalle';
  if (page === 'cargo_detalle') return 'listado/cargo_detalle';
  if (page === 'licencia_detalle') return 'listado/licencia_detalle';
  if (page === 'modificar_docente') return 'gestion/modificar_docente';
  return page;
};

const getPageFromPath = (path: string): Page => {
  if (path === 'listado/docente_detalle' || path === 'listado/docente_listado') return 'docente_detalle';
  if (path === 'listado/cargo_detalle') return 'cargo_detalle';
  if (path === 'listado/licencia_detalle') return 'licencia_detalle';
  if (path === 'gestion/modificar_docente') return 'modificar_docente';
  
  const validPages: Page[] = ['inicio', 'listado', 'tramites', 'gestion', 'historial', 'docente_detalle', 'cargo_detalle', 'licencia_detalle', 'modificar_docente'];
  return validPages.includes(path as Page) ? (path as Page) : 'inicio';
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('token');
  });
  
  const [activePage, setActivePage] = useState<Page>(() => {
    return getPageFromPath(window.location.pathname.substring(1));
  });
  const [selectedDocente, setSelectedDocente] = useState<any>(null);

  useEffect(() => {
    const currentPath = window.location.pathname.substring(1);
    const targetPath = getPathFromPage(activePage);
    if (currentPath !== targetPath) {
      window.history.pushState({}, '', `/${targetPath}`);
    }
  }, [activePage]);

  useEffect(() => {
    const handlePopState = () => {
      setActivePage(getPageFromPath(window.location.pathname.substring(1)));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
