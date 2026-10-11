import { useState, useEffect } from 'react'
import Login from './Login'
import Inicio from './Inicio'
import Listado from './Listado'
import DocenteDetalle from './DocenteDetalle'
import CargoDetalle from './CargoDetalle'



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

import IdleTimeoutModal from './components/IdleTimeoutModal.tsx';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('token');
  });

  const [activePage, setActivePage] = useState<Page>(() => {
    return getPageFromPath(window.location.pathname.substring(1));
  });
  const [selectedDocente, setSelectedDocente] = useState<any>(() => {
    try {
      const saved = sessionStorage.getItem('atlas_selected_docente');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [selectedCargo, setSelectedCargo] = useState<any>(() => {
    try {
      const saved = sessionStorage.getItem('atlas_selected_cargo');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [listadoTab, setListadoTab] = useState<'docentes' | 'cargos' | 'licencias'>(() => {
    const saved = sessionStorage.getItem('atlas_listado_tab');
    if (saved === 'cargos' || saved === 'licencias' || saved === 'docentes') {
      return saved;
    }
    return 'docentes';
  });

  const updateListadoTab = (tab: 'docentes' | 'cargos' | 'licencias') => {
    setListadoTab(tab);
    sessionStorage.setItem('atlas_listado_tab', tab);
    if (activePage === 'listado') {
      window.history.replaceState({ page: 'listado', tab }, '', window.location.href);
    }
  };

  useEffect(() => {
    const currentPath = window.location.pathname.substring(1);
    const targetPath = getPathFromPage(activePage);
    if (currentPath !== targetPath) {
      window.history.pushState({ page: activePage, tab: listadoTab }, '', `/${targetPath}`);
    }
  }, [activePage, listadoTab]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const page = getPageFromPath(window.location.pathname.substring(1));
      setActivePage(page);
      if (event.state?.tab) {
        setListadoTab(event.state.tab);
        sessionStorage.setItem('atlas_listado_tab', event.state.tab);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('atlas_selected_docente');
    sessionStorage.removeItem('atlas_selected_cargo');
    sessionStorage.removeItem('atlas_listado_tab');
    setIsAuthenticated(false);
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const renewToken = async () => {
      try {
        const currentToken = localStorage.getItem('token');
        if (!currentToken) {
          handleLogout();
          return;
        }

        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8081'}/api/auth/renew`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentToken}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          localStorage.setItem('token', data.token);
        } else {
          handleLogout();
        }
      } catch (error) {
        console.error("Error auto-renewing token", error);
        handleLogout();
      }
    };

    // 45 minutes in milliseconds
    const intervalId = setInterval(renewToken, 45 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNavigate = (page: Page, data?: any) => {
    if (activePage === 'inicio' && page === 'listado' && !data?.tab) {
      updateListadoTab('docentes');
    }
    setActivePage(page);
    if (page === 'docente_detalle' && data) {
      setSelectedDocente(data);
      sessionStorage.setItem('atlas_selected_docente', JSON.stringify(data));
      updateListadoTab('docentes');
    }
    if (page === 'cargo_detalle' && data) {
      setSelectedCargo(data);
      sessionStorage.setItem('atlas_selected_cargo', JSON.stringify(data));
      updateListadoTab('cargos');
    }
    if (page === 'listado') {
      if (data?.tab) {
        updateListadoTab(data.tab);
      }
    }
  };

  if (isAuthenticated) {
    let content;
    if (activePage === 'listado') {
      content = (
        <Listado
          onLogout={handleLogout}
          onNavigate={handleNavigate}
          initialTab={listadoTab}
          onTabChange={updateListadoTab}
        />
      );
    } else if (activePage === 'docente_detalle' && selectedDocente) {
      content = <DocenteDetalle docente={selectedDocente} onLogout={handleLogout} onNavigate={handleNavigate} />;
    } else if (activePage === 'cargo_detalle' && selectedCargo) {
      content = <CargoDetalle cargo={selectedCargo} onLogout={handleLogout} onNavigate={handleNavigate} />;
    } else {
      content = <Inicio onLogout={handleLogout} onNavigate={handleNavigate} />;
    }

    return (
      <>
        {content}
        <IdleTimeoutModal onLogout={handleLogout} timeoutSeconds={3600} warningSeconds={60} />
      </>
    );
  }

  return <Login onLogin={handleLogin} />
}

export default App
