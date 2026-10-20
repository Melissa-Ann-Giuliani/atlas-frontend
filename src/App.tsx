import { useState, useEffect } from 'react'
import Login from './pages/Login/Login'
import Inicio from './pages/Inicio/Inicio'
import Listado from './pages/Listado/Listado'
import DocenteDetalle from './pages/Listado/DocenteDetalle/DocenteDetalle'
import CargoDetalle from './pages/Listado/CargoDetalle/CargoDetalle.tsx'
import LicenciaDetalle from './pages/Listado/LicenciaDetalle/LicenciaDetalle'
import Gestion from './pages/Gestion/Gestion'
import NuevoUsuario from './pages/Gestion/NuevoUsuario/NuevoUsuario'
import AltaCargo from './pages/Gestion/AltaCargo/AltaCargo'
import ModificarCargo from './pages/Gestion/ModificarCargo/ModificarCargo'
import BajaCargo from './pages/Gestion/BajaCargo/BajaCargo'

type Page = 'inicio' | 'listado' | 'tramites' | 'gestion' | 'historial' | 'docente_detalle' | 'cargo_detalle' | 'licencia_detalle' | 'modificar_docente' | 'nuevo_usuario' | 'alta_cargo' | 'modificar_cargo' | 'baja_cargo';

const getPathFromPage = (page: Page): string => {
  if (page === 'docente_detalle') return 'listado/docente_detalle';
  if (page === 'cargo_detalle') return 'listado/cargo_detalle';
  if (page === 'licencia_detalle') return 'listado/licencia_detalle';
  if (page === 'modificar_docente') return 'gestion/modificar_docente';
  if (page === 'nuevo_usuario') return 'gestion/nuevo_usuario';
  if (page === 'alta_cargo') return 'gestion/alta_cargo';
  if (page === 'modificar_cargo') return 'gestion/modificar_cargo';
  if (page === 'baja_cargo') return 'gestion/baja_cargo';
  return page;
};

const getPageFromPath = (path: string): Page => {
  if (path === 'listado/docente_detalle' || path === 'listado/docente_listado') return 'docente_detalle';
  if (path === 'listado/cargo_detalle') return 'cargo_detalle';
  if (path === 'listado/licencia_detalle') return 'licencia_detalle';
  if (path === 'gestion/modificar_docente') return 'modificar_docente';
  if (path === 'gestion/nuevo_usuario' || path === 'gestion/alta_usuario') return 'nuevo_usuario';
  if (path === 'gestion/alta_cargo') return 'alta_cargo';
  if (path === 'gestion/modificar_cargo') return 'modificar_cargo';
  if (path === 'gestion/baja_cargo') {
    return isGlobalAdmin() ? 'baja_cargo' : 'gestion';
  }

  const validPages: Page[] = ['inicio', 'listado', 'tramites', 'gestion', 'historial', 'docente_detalle', 'cargo_detalle', 'licencia_detalle', 'modificar_docente', 'nuevo_usuario', 'alta_cargo', 'modificar_cargo', 'baja_cargo'];
  const resolved = validPages.includes(path as Page) ? (path as Page) : 'inicio';
  if (resolved === 'baja_cargo' && !isGlobalAdmin()) {
    return 'gestion';
  }
  return resolved;
};

import IdleTimeoutModal from './components/IdleTimeoutModal.tsx';
import { isGlobalAdmin } from './utils/auth';

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
  const [selectedLicencia, setSelectedLicencia] = useState<any>(() => {
    try {
      const saved = sessionStorage.getItem('atlas_selected_licencia');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [cargoHistory, setCargoHistory] = useState<any[]>(() => {
    try {
      const saved = sessionStorage.getItem('atlas_cargo_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
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
      window.history.pushState({ page: activePage, tab: listadoTab, cargo: selectedCargo, docente: selectedDocente, licencia: selectedLicencia, cargoHistory }, '', `/${targetPath}`);
    }
  }, [activePage, listadoTab]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const page = getPageFromPath(window.location.pathname.substring(1));
      setActivePage(page);
      if (event.state?.cargo) {
        setSelectedCargo(event.state.cargo);
        sessionStorage.setItem('atlas_selected_cargo', JSON.stringify(event.state.cargo));
      }
      if (event.state?.docente) {
        setSelectedDocente(event.state.docente);
        sessionStorage.setItem('atlas_selected_docente', JSON.stringify(event.state.docente));
      }
      if (event.state?.licencia) {
        setSelectedLicencia(event.state.licencia);
        sessionStorage.setItem('atlas_selected_licencia', JSON.stringify(event.state.licencia));
      }
      if (event.state?.tab) {
        setListadoTab(event.state.tab);
        sessionStorage.setItem('atlas_listado_tab', event.state.tab);
      }
      if (event.state?.cargoHistory !== undefined) {
        setCargoHistory(event.state.cargoHistory);
        sessionStorage.setItem('atlas_cargo_history', JSON.stringify(event.state.cargoHistory));
      } else if (page === 'listado') {
        setCargoHistory([]);
        sessionStorage.setItem('atlas_cargo_history', JSON.stringify([]));
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
    sessionStorage.removeItem('atlas_selected_licencia');
    sessionStorage.removeItem('atlas_cargo_history');
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

  const handleBackCargo = () => {
    if (cargoHistory.length > 0) {
      const nextHistory = [...cargoHistory];
      const prevCargo = nextHistory.pop();
      setCargoHistory(nextHistory);
      sessionStorage.setItem('atlas_cargo_history', JSON.stringify(nextHistory));
      if (prevCargo) {
        setSelectedCargo(prevCargo);
        sessionStorage.setItem('atlas_selected_cargo', JSON.stringify(prevCargo));
      }
      try {
        window.history.back();
      } catch {
        // Fallback si no hay historial disponible en el navegador
      }
    } else {
      handleNavigate('listado', { tab: 'cargos' });
    }
  };

  const handleNavigate = (page: Page, data?: any) => {
    if (activePage === 'inicio' && page === 'listado' && !data?.tab) {
      updateListadoTab('docentes');
    }

    if (page !== 'cargo_detalle') {
      setCargoHistory([]);
      sessionStorage.removeItem('atlas_cargo_history');
    }

    if (page === 'baja_cargo' && !isGlobalAdmin()) {
      setActivePage('gestion');
      return;
    }

    setActivePage(page);

    if (page === 'docente_detalle' && data) {
      setSelectedDocente(data);
      sessionStorage.setItem('atlas_selected_docente', JSON.stringify(data));
      updateListadoTab('docentes');
    }

    if (page === 'cargo_detalle' && data) {
      if (activePage === 'cargo_detalle' && selectedCargo && (selectedCargo.id === data.id || selectedCargo.numero === data.numero)) {
        return;
      }

      let nextHistory = cargoHistory;
      if (activePage === 'cargo_detalle' && selectedCargo) {
        if (
          cargoHistory.length > 0 &&
          (cargoHistory[cargoHistory.length - 1].numero === data.numero ||
            cargoHistory[cargoHistory.length - 1].id === data.id)
        ) {
          nextHistory = cargoHistory.slice(0, -1);
        } else {
          nextHistory = [...cargoHistory, selectedCargo];
        }
        setCargoHistory(nextHistory);
        sessionStorage.setItem('atlas_cargo_history', JSON.stringify(nextHistory));
      } else {
        nextHistory = [];
        setCargoHistory([]);
        sessionStorage.setItem('atlas_cargo_history', JSON.stringify([]));
      }

      setSelectedCargo(data);
      sessionStorage.setItem('atlas_selected_cargo', JSON.stringify(data));
      updateListadoTab('cargos');

      if (activePage === 'cargo_detalle') {
        window.history.pushState(
          { page: 'cargo_detalle', tab: 'cargos', cargo: data, cargoHistory: nextHistory },
          '',
          '/listado/cargo_detalle'
        );
      }
    }

    if (page === 'modificar_cargo') {
      setSelectedCargo(data || null);
    }


    if (page === 'licencia_detalle' && data) {
      setSelectedLicencia(data);
      sessionStorage.setItem('atlas_selected_licencia', JSON.stringify(data));
      updateListadoTab('licencias');
    }

    if (page === 'listado') {
      if (data?.tab) {
        updateListadoTab(data.tab);
      }
    }
  };

  if (isAuthenticated) {
    const renderContent = () => {
      switch (activePage) {
        case 'listado':
          return (
            <Listado
              onLogout={handleLogout}
              onNavigate={handleNavigate}
              initialTab={listadoTab}
              onTabChange={updateListadoTab}
            />
          );

        case 'docente_detalle':
          return selectedDocente ? (
            <DocenteDetalle
              docente={selectedDocente}
              onLogout={handleLogout}
              onNavigate={handleNavigate}
            />
          ) : (
            <Listado
              onLogout={handleLogout}
              onNavigate={handleNavigate}
              initialTab="docentes"
              onTabChange={updateListadoTab}
            />
          );

        case 'cargo_detalle':
          return selectedCargo ? (
            <CargoDetalle
              cargo={selectedCargo}
              previousCargo={cargoHistory.length > 0 ? cargoHistory[cargoHistory.length - 1] : null}
              onBack={handleBackCargo}
              onLogout={handleLogout}
              onNavigate={handleNavigate}
            />
          ) : (
            <Listado
              onLogout={handleLogout}
              onNavigate={handleNavigate}
              initialTab="cargos"
              onTabChange={updateListadoTab}
            />
          );

        case 'licencia_detalle':
          return selectedLicencia ? (
            <LicenciaDetalle
              licencia={selectedLicencia}
              onBack={() => handleNavigate('listado', { tab: 'licencias' })}
              onLogout={handleLogout}
              onNavigate={handleNavigate}
            />
          ) : (
            <Listado
              onLogout={handleLogout}
              onNavigate={handleNavigate}
              initialTab="licencias"
              onTabChange={updateListadoTab}
            />
          );

        case 'nuevo_usuario':
          return (
            <NuevoUsuario
              onLogout={handleLogout}
              onNavigate={handleNavigate}
              onBack={() => handleNavigate('gestion')}
            />
          );

        case 'alta_cargo':
          return (
            <AltaCargo
              onLogout={handleLogout}
              onNavigate={handleNavigate}
              onBack={() => handleNavigate('gestion')}
            />
          );

        case 'modificar_cargo':
          return (
            <ModificarCargo
              initialCargo={selectedCargo}
              onLogout={handleLogout}
              onNavigate={handleNavigate}
              onBack={() => handleNavigate('gestion')}
            />
          );

        case 'baja_cargo':
          if (!isGlobalAdmin()) {
            return <Gestion onLogout={handleLogout} onNavigate={handleNavigate} />;
          }
          return (
            <BajaCargo
              onLogout={handleLogout}
              onNavigate={handleNavigate}
              onBack={() => handleNavigate('gestion')}
            />
          );

        case 'gestion':
          return <Gestion onLogout={handleLogout} onNavigate={handleNavigate} />;

        case 'inicio':
        default:
          return <Inicio onLogout={handleLogout} onNavigate={handleNavigate} />;
      }
    };

    return (
      <>
        {renderContent()}
        <IdleTimeoutModal onLogout={handleLogout} timeoutSeconds={3600} warningSeconds={60} />
      </>
    );
  }

  return <Login onLogin={handleLogin} />
}

export default App
