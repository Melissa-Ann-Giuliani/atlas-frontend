import React, { useState, useEffect, useRef } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { es } from 'date-fns/locale/es';
import 'react-datepicker/dist/react-datepicker.css';
import './BajaCargo.css';
import Sidebar from '../../../components/Sidebar';
import Topbar from '../../../components/Topbar';
import {
  FiChevronLeft,
  FiChevronDown,
  FiCheckSquare,
  FiCalendar,
  FiSearch,
  FiTrash2,
  FiAlertTriangle,
} from 'react-icons/fi';

registerLocale('es', es);

interface BajaCargoProps {
  initialCargo?: any;
  onLogout?: () => void;
  onNavigate?: (page: any, data?: any) => void;
  onBack?: () => void;
}

interface FormState {
  cargoId: number | null;
  numeroCargo: string;
  fechaCreacion: string;
  estado: string;
  dependencia: string;
  departamento: string;
  origen: string;
  caracter: string;
  categoria: string;
  dedicacion: string;
  cantHoras: string;
  nroDesignacionAsociado: string;
  nroCargoPredecesor: string;
}

interface OptionItem {
  id: string | number;
  label: string;
  horas?: number;
}

export const isCargoDadoDeBaja = (estado?: string | null): boolean => {
  if (!estado) return false;
  const normalized = estado.trim().toLowerCase();
  return normalized === 'dado de baja' || normalized === 'inactivo';
};

const getUserRole = (): string | null => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    if (parsed.rol) return String(parsed.rol);
    if (parsed.role) return String(parsed.role);
    if (Array.isArray(parsed.roles) && parsed.roles.length > 0) return String(parsed.roles[0]);
    if (Array.isArray(parsed.authorities) && parsed.authorities.length > 0) {
      const auth = parsed.authorities[0];
      return typeof auth === 'string' ? auth : auth.authority;
    }
    return null;
  } catch {
    return null;
  }
};

const emptyFormState: FormState = {
  cargoId: null,
  numeroCargo: '',
  fechaCreacion: '',
  estado: '',
  dependencia: '',
  departamento: '',
  origen: '',
  caracter: '',
  categoria: '',
  dedicacion: '',
  cantHoras: '',
  nroDesignacionAsociado: '',
  nroCargoPredecesor: '',
};

export default function BajaCargo({
  initialCargo,
  onLogout,
  onNavigate,
  onBack,
}: BajaCargoProps) {
  const userRole = getUserRole();
  const isNonAdminGlobal =
    userRole !== null &&
    userRole !== 'ADMIN_GLOBAL' &&
    userRole !== 'ROLE_ADMIN_GLOBAL';

  const [searchQuery, setSearchQuery] = useState<string>(
    initialCargo?.numero ? String(initialCargo.numero) : ''
  );
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [formData, setFormData] = useState<FormState>(emptyFormState);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<
    Array<{ id: number; numero: string | number; categoria?: string; unidad?: string }>
  >([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Catalogs
  const [dependencias, setDependencias] = useState<OptionItem[]>([]);
  const [origenes, setOrigenes] = useState<OptionItem[]>([]);
  const [caracteres, setCaracteres] = useState<OptionItem[]>([]);
  const [categorias, setCategorias] = useState<OptionItem[]>([]);
  const [dedicaciones, setDedicaciones] = useState<OptionItem[]>([]);

  const [loadedCargoData, setLoadedCargoData] = useState<{ id: number; data: any } | null>(
    null
  );

  // Parse YYYY-MM-DD from formData into Date object for DatePicker
  const parseIsoToDate = (isoStr: string): Date | null => {
    if (!isoStr) return null;
    const [year, month, day] = isoStr.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };

  // Re-run matching whenever catalogs or loaded cargo change
  useEffect(() => {
    if (loadedCargoData) {
      populateForm(loadedCargoData.id, loadedCargoData.data);
    }
  }, [dependencias, origenes, caracteres, categorias, dedicaciones]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load catalogs on mount
  useEffect(() => {
    const fetchCatalogs = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

        const [
          resTiposUnidad,
          resCaracteres,
          resCategorias,
          resDedicaciones,
          resOrigenes,
        ] = await Promise.all([
          fetch(`${apiUrl}/api/tipos-unidad`, { headers }).catch(() => null),
          fetch(`${apiUrl}/api/caracteres`, { headers }).catch(() => null),
          fetch(`${apiUrl}/api/categorias`, { headers }).catch(() => null),
          fetch(`${apiUrl}/api/dedicaciones`, { headers }).catch(() => null),
          fetch(`${apiUrl}/api/origenes`, { headers }).catch(() => null),
        ]);

        if (resTiposUnidad && resTiposUnidad.status === 401) {
          if (onLogout) onLogout();
          return;
        }

        if (resTiposUnidad && resTiposUnidad.ok) {
          const data = await resTiposUnidad.json();
          if (Array.isArray(data)) {
            setDependencias(
              data.map((item: any) => ({
                id: item.tipoUnidadId ?? item.id ?? item.nombre,
                label:
                  item.tipoUnidadNombre ??
                  item.nombre ??
                  item.descripcion ??
                  String(item.id || item),
              }))
            );
          }
        }

        if (resCaracteres && resCaracteres.ok) {
          const data = await resCaracteres.json();
          if (Array.isArray(data)) {
            setCaracteres(
              data.map((item: any) => ({
                id: item.caracterId ?? item.id ?? item.nombre,
                label: item.caracterNombre ?? item.nombre ?? String(item.id || item),
              }))
            );
          }
        }

        if (resCategorias && resCategorias.ok) {
          const data = await resCategorias.json();
          if (Array.isArray(data)) {
            setCategorias(
              data.map((item: any) => ({
                id: item.categoriaId ?? item.id ?? item.nombre,
                label: item.categoriaNombre ?? item.nombre ?? String(item.id || item),
              }))
            );
          }
        }

        if (resDedicaciones && resDedicaciones.ok) {
          const data = await resDedicaciones.json();
          if (Array.isArray(data)) {
            setDedicaciones(
              data.map((item: any) => ({
                id: item.dedicacionId ?? item.id ?? item.nombre,
                label: item.dedicacionNombre ?? item.nombre ?? String(item.id || item),
                horas: item.horas,
              }))
            );
          }
        }

        if (resOrigenes && resOrigenes.ok) {
          const data = await resOrigenes.json();
          if (Array.isArray(data)) {
            setOrigenes(
              data.map((item: any) => ({
                id: item.origenId ?? item.id ?? item.nombre,
                label: item.origenNombre ?? item.nombre ?? String(item.id || item),
              }))
            );
          }
        }
      } catch (err) {
        console.error('Error al cargar catálogos:', err);
      }
    };

    fetchCatalogs();
  }, [onLogout]);

  // Handle initialCargo prop if provided
  useEffect(() => {
    if (initialCargo) {
      if (initialCargo.id) {
        loadCargoDetails(initialCargo.id);
      } else if (initialCargo.numero) {
        handleSearch(String(initialCargo.numero));
      }
    } else {
      setSearchQuery('');
      setFormData(emptyFormState);
      setLoadedCargoData(null);
      setFeedback(null);
    }
  }, [initialCargo]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCargoDetails = async (cargoId: number) => {
    setIsSearching(true);
    setFeedback(null);
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

      const response = await fetch(`${apiUrl}/api/cargos/${cargoId}`, { headers });
      if (response.ok) {
        const data = await response.json();
        setLoadedCargoData({ id: cargoId, data });
        populateForm(cargoId, data);
      } else {
        setFeedback({
          type: 'error',
          message: `No se pudo encontrar el cargo con ID ${cargoId}.`,
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error de conexión al cargar datos del cargo.',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const populateForm = (cargoId: number, data: any) => {
    let matchedOrigenId = '';
    const rawOrigenVal =
      data.origenId ??
      data.origen?.origenId ??
      data.origenNombre ??
      data.origen?.origenNombre ??
      data.origen;
    if (rawOrigenVal !== undefined && rawOrigenVal !== null && rawOrigenVal !== '') {
      const found = origenes.find(
        (o) =>
          String(o.id) === String(rawOrigenVal) ||
          o.label.toLowerCase() === String(rawOrigenVal).toLowerCase()
      );
      matchedOrigenId = found ? String(found.id) : String(rawOrigenVal);
    } else if (
      data.actividadesVinculadas &&
      data.actividadesVinculadas.length > 0 &&
      data.actividadesVinculadas[0].origen
    ) {
      const actOrigen = data.actividadesVinculadas[0].origen;
      const found = origenes.find(
        (o) => o.label.toLowerCase() === actOrigen.toLowerCase()
      );
      matchedOrigenId = found ? String(found.id) : '';
    }

    let matchedCaracterId = '';
    const rawCaracterVal =
      data.caracterId ??
      data.caracter?.caracterId ??
      data.caracterNombre ??
      data.caracter;
    if (rawCaracterVal !== undefined && rawCaracterVal !== null && rawCaracterVal !== '') {
      const found = caracteres.find(
        (c) =>
          String(c.id) === String(rawCaracterVal) ||
          c.label.toLowerCase() === String(rawCaracterVal).toLowerCase()
      );
      matchedCaracterId = found ? String(found.id) : String(rawCaracterVal);
    }

    let matchedCategoriaId = '';
    const rawCategoriaVal =
      data.categoriaId ??
      data.categoria?.categoriaId ??
      data.categoriaNombre ??
      data.categoria;
    if (rawCategoriaVal !== undefined && rawCategoriaVal !== null && rawCategoriaVal !== '') {
      const found = categorias.find(
        (cat) =>
          String(cat.id) === String(rawCategoriaVal) ||
          cat.label.toLowerCase() === String(rawCategoriaVal).toLowerCase()
      );
      matchedCategoriaId = found ? String(found.id) : String(rawCategoriaVal);
    }

    let matchedDedicacionId = '';
    let cantHorasVal = '';
    const rawDedicacionVal =
      data.dedicacionId ??
      data.dedicacion?.dedicacionId ??
      data.dedicacionNombre ??
      data.dedicacion;
    if (rawDedicacionVal !== undefined && rawDedicacionVal !== null && rawDedicacionVal !== '') {
      const found = dedicaciones.find(
        (d) =>
          String(d.id) === String(rawDedicacionVal) ||
          d.label.toLowerCase() === String(rawDedicacionVal).toLowerCase()
      );
      matchedDedicacionId = found ? String(found.id) : String(rawDedicacionVal);
      if (found && found.horas !== undefined && found.horas !== null) {
        cantHorasVal = String(found.horas);
      }
    }

    let predecesorCode = '';
    if (data.cargoPredecesor?.numero) {
      predecesorCode = String(data.cargoPredecesor.numero);
    } else if (data.predecesorCodigo) {
      predecesorCode = String(data.predecesorCodigo);
    }

    let designacionCode = '';
    if (data.nroResolucionDesignacion) {
      designacionCode = String(data.nroResolucionDesignacion);
    } else if (data.designacionNroResolucion) {
      designacionCode = String(data.designacionNroResolucion);
    }

    const resolvedDependencia =
      data.tipoUnidadNombre ||
      data.unidad?.tipoUnidad?.tipoUnidadNombre ||
      data.unidad?.tipoUnidadNombre ||
      data.dependencia ||
      '';

    const resolvedDepartamento =
      data.unidadNombre ||
      data.unidad?.unidadNombre ||
      data.unidad?.nombre ||
      data.departamento ||
      '';

    const estadoVal = data.estado || 'Libre';

    setFormData({
      cargoId,
      numeroCargo: String(data.numero || data.codigo || ''),
      fechaCreacion: data.fechaCreacion ? data.fechaCreacion.split('T')[0] : '',
      estado: estadoVal,
      dependencia: resolvedDependencia,
      departamento: resolvedDepartamento,
      origen: matchedOrigenId,
      caracter: matchedCaracterId,
      categoria: matchedCategoriaId,
      dedicacion: matchedDedicacionId,
      cantHoras: cantHorasVal || String(data.horasOcupadas || ''),
      nroDesignacionAsociado: designacionCode,
      nroCargoPredecesor: predecesorCode,
    });

    if (isCargoDadoDeBaja(estadoVal)) {
      setFeedback({
        type: 'info',
        message: `El Cargo N° ${data.numero || data.codigo} ya se encuentra en estado "${estadoVal}".`,
      });
    }
  };

  // Suggestions search effect
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

        const response = await fetch(
          `${apiUrl}/api/cargos?search=${encodeURIComponent(trimmed)}&size=8`,
          { headers }
        );
        if (response.ok) {
          const data = await response.json();
          const items = data.content || (Array.isArray(data) ? data : []);
          const mapped = items
            .filter((c: any) => c.numero !== undefined && c.numero !== null)
            .map((c: any) => ({
              id: c.id || c.cargoId,
              numero: c.numero || c.codigo,
              categoria: c.categoriaNombre || c.categoria?.categoriaNombre,
              unidad: c.unidadNombre || c.unidad?.unidadNombre,
            }));
          setSuggestions(mapped);
          setShowSuggestions(mapped.length > 0);
          setActiveSuggestionIndex(-1);
        }
      } catch (err) {
        console.error('Error fetching suggestions:', err);
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Click outside to dismiss suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectSuggestion = (item: { id: number; numero: string | number }) => {
    setSearchQuery(String(item.numero));
    setShowSuggestions(false);
    if (item.id) {
      loadCargoDetails(item.id);
    } else {
      handleSearch(String(item.numero));
    }
  };

  const handleSearch = async (queryToSearch?: string) => {
    const term = (queryToSearch !== undefined ? queryToSearch : searchQuery).trim();
    setShowSuggestions(false);
    if (!term) {
      setFeedback({
        type: 'error',
        message: 'Por favor, ingrese un número de cargo a buscar.',
      });
      return;
    }

    setIsSearching(true);
    setFeedback(null);

    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

      const response = await fetch(
        `${apiUrl}/api/cargos?search=${encodeURIComponent(term)}`,
        { headers }
      );
      if (response.ok) {
        const data = await response.json();
        const cargosList = data.content || (Array.isArray(data) ? data : []);
        const found = cargosList.find(
          (c: any) => String(c.numero) === term || String(c.codigo) === term
        );

        if (found && (found.id || found.cargoId)) {
          const resolvedId = found.id || found.cargoId;
          await loadCargoDetails(resolvedId);
        } else if (!isNaN(Number(term))) {
          // If not in active cargos (e.g. already "Dado de baja"), try loading directly
          try {
            const directRes = await fetch(`${apiUrl}/api/cargos/${term}`, { headers });
            if (directRes.ok) {
              const directData = await directRes.json();
              if (
                directData &&
                (String(directData.numero) === term || String(directData.id) === term)
              ) {
                const resolvedId = directData.id || Number(term);
                setLoadedCargoData({ id: resolvedId, data: directData });
                populateForm(resolvedId, directData);
                return;
              }
            }
          } catch {
            // ignore fallback error
          }
          setFeedback({
            type: 'error',
            message: `No se encontró ningún cargo activo con el número ${term}.`,
          });
          setFormData(emptyFormState);
        } else {
          setFeedback({
            type: 'error',
            message: `No se encontró ningún cargo con el número ${term}.`,
          });
          setFormData(emptyFormState);
        }
      } else {
        setFeedback({
          type: 'error',
          message: 'Error en la búsqueda del cargo.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error de conexión al buscar el cargo.',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestionIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestionIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length) {
          selectSuggestion(suggestions[activeSuggestionIndex]);
          return;
        }
        setShowSuggestions(false);
        handleSearch();
        return;
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        return;
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleClear = () => {
    setFormData(emptyFormState);
    setSearchQuery('');
    setLoadedCargoData(null);
    setFeedback({
      type: 'info',
      message: 'Formulario limpiado. Ingrese un nuevo número de cargo para buscar.',
    });
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (onNavigate) {
      onNavigate('gestion');
    } else {
      window.history.back();
    }
  };

  // Submit Baja de Cargo: executes PATCH /api/cargos/{id}/baja
  const handleSubmit = async () => {
    if (!formData.cargoId) {
      setFeedback({
        type: 'error',
        message: 'Debe buscar y seleccionar un cargo antes de darlo de baja.',
      });
      return;
    }

    if (isCargoDadoDeBaja(formData.estado)) {
      setFeedback({
        type: 'error',
        message: `El Cargo N° ${formData.numeroCargo} ya está en estado "Dado de Baja".`,
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

      const response = await fetch(`${apiUrl}/api/cargos/${formData.cargoId}/baja`, {
        method: 'PATCH',
        headers,
      });

      if (response.status === 401) {
        if (onLogout) onLogout();
        return;
      }

      const data = await response.json().catch(() => null);

      if (response.ok) {
        // Backend returns CargoDetailDTO with estado: "Dado de baja"
        if (data) {
          setLoadedCargoData({ id: formData.cargoId, data });
          populateForm(formData.cargoId, data);
        } else {
          setFormData((prev) => ({
            ...prev,
            estado: 'Dado de baja',
          }));
        }

        // Keep session storage in sync if selected_cargo matches
        try {
          const storedSelectedCargo = sessionStorage.getItem('atlas_selected_cargo');
          if (storedSelectedCargo) {
            const parsed = JSON.parse(storedSelectedCargo);
            if (
              parsed &&
              (parsed.id === formData.cargoId || parsed.numero === Number(formData.numeroCargo))
            ) {
              sessionStorage.setItem(
                'atlas_selected_cargo',
                JSON.stringify(data || { ...parsed, estado: 'Dado de baja' })
              );
            }
          }
        } catch {
          // ignore storage error
        }

        setFeedback({
          type: 'success',
          message: `El Cargo N° ${formData.numeroCargo} ha sido dado de baja exitosamente.`,
        });
      } else if (response.status === 400) {
        // Validation errors: designación vigente, subcargos derivados activos, o ya dado de baja
        setFeedback({
          type: 'error',
          message:
            data?.message ||
            'No se puede dar de baja el cargo. Verifique las condiciones requeridas.',
        });
      } else if (response.status === 403) {
        // Exclusivo ADMIN_GLOBAL
        setFeedback({
          type: 'error',
          message:
            data?.message ||
            'Solo el Administrador Global tiene permisos para dar de baja un cargo',
        });
      } else if (response.status === 404) {
        setFeedback({
          type: 'error',
          message: data?.message || 'Cargo no encontrado',
        });
      } else {
        setFeedback({
          type: 'error',
          message:
            data?.message ||
            data?.error ||
            'Ocurrió un error al procesar la baja del cargo.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error de conexión al procesar la baja del cargo.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasLoadedCargo = Boolean(formData.cargoId);

  return (
    <div className="baja-cargo-page">
      <Topbar onLogout={onLogout} />

      <div className="baja-cargo-body">
        <Sidebar activeItem="gestion" onNavigate={onNavigate} />

        <main className="baja-cargo-main">
          <div className="baja-cargo-content-area">
            {/* Top Back Navigation */}
            <div className="baja-cargo-top-nav">
              <button
                type="button"
                className="baja-cargo-back-btn"
                onClick={handleBack}
              >
                <FiChevronLeft className="baja-cargo-back-icon" />
                <span>Retroceder</span>
              </button>
            </div>

            {/* Container Card */}
            <div className="baja-cargo-container-card">
              {/* Header & Search Bar Row */}
              <div className="baja-cargo-header-row">
                <div className="baja-cargo-header-left">
                  <h1 className="baja-cargo-title">Gestión</h1>
                </div>

                {/* Search Bar matching Modificar Cargo style */}
                <div className="baja-cargo-search-card">
                  <label htmlFor="searchCargoInput" className="baja-cargo-search-label">
                    Buscar Cargo a Dar de Baja por Número
                  </label>
                  <div className="baja-cargo-search-row">
                    <div
                      className="baja-cargo-search-input-wrap"
                      ref={searchContainerRef}
                    >
                      <input
                        id="searchCargoInput"
                        name="busqueda_cargo_query"
                        type="search"
                        className="baja-cargo-search-input"
                        placeholder="Ingrese valor"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => {
                          if (suggestions.length > 0) setShowSuggestions(true);
                        }}
                        onKeyDown={handleKeyDown}
                        autoComplete="one-time-code"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        data-lpignore="true"
                        data-form-type="other"
                        data-1p-ignore="true"
                      />
                      <FiSearch className="baja-cargo-search-icon" />

                      {/* Suggestions Dropdown */}
                      {showSuggestions && suggestions.length > 0 && (
                        <ul className="baja-cargo-suggestions-list" role="listbox">
                          {suggestions.map((item, idx) => (
                            <li
                              key={item.id ?? idx}
                              className={`baja-cargo-suggestion-item ${
                                idx === activeSuggestionIndex ? 'active' : ''
                              }`}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                selectSuggestion(item);
                              }}
                              onMouseEnter={() => setActiveSuggestionIndex(idx)}
                              role="option"
                              aria-selected={idx === activeSuggestionIndex}
                            >
                              <span className="baja-cargo-suggestion-number">
                                Cargo N° {item.numero}
                              </span>
                              {(item.categoria || item.unidad) && (
                                <span className="baja-cargo-suggestion-sub">
                                  {[item.categoria, item.unidad]
                                    .filter(Boolean)
                                    .join(' • ')}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <button
                      type="button"
                      className="baja-cargo-search-btn"
                      onClick={() => handleSearch()}
                      disabled={isSearching}
                    >
                      <FiSearch />
                      <span>{isSearching ? 'Buscando...' : 'Buscar Cargo'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Card with Red Border & Red Header */}
              <div className="baja-cargo-form-card">
                <div className="baja-cargo-card-header">
                  <h2>Baja de Cargo</h2>
                </div>

                <div className="baja-cargo-card-body">
                  {isNonAdminGlobal && (
                    <div className="baja-cargo-role-notice">
                      <FiAlertTriangle className="baja-cargo-warning-icon" />
                      <span>
                        Nota de permisos: Se requiere rol de <strong>Administrador Global</strong> para dar de baja un cargo.
                      </span>
                    </div>
                  )}

                  {feedback && (
                    <div className={`baja-cargo-feedback feedback-${feedback.type}`}>
                      {feedback.message}
                    </div>
                  )}

                  {hasLoadedCargo && isCargoDadoDeBaja(formData.estado) && (
                    <div className="baja-cargo-warning-box">
                      <FiAlertTriangle className="baja-cargo-warning-icon" />
                      <span>
                        Este cargo ya ha sido dado de baja. Su estado actual es{' '}
                        <strong>{formData.estado || 'Dado de baja'}</strong>.
                      </span>
                    </div>
                  )}

                  <div className="baja-cargo-form">
                    {/* SECTION 1: DATOS DE CARGOS */}
                    <h3 className="baja-cargo-section-title">Datos de Cargos</h3>

                    {/* Row 1: N° de Cargo, Fecha de Creación, Estado */}
                    <div className="baja-cargo-grid-3">
                      <div className="baja-cargo-field">
                        <label htmlFor="baja_numeroCargo" className="baja-cargo-label">
                          N° de Cargo
                        </label>
                        <input
                          id="baja_numeroCargo"
                          type="text"
                          className="baja-cargo-input"
                          placeholder="Ingrese valor"
                          value={formData.numeroCargo}
                          readOnly
                          disabled
                        />
                      </div>

                      <div className="baja-cargo-field">
                        <label
                          htmlFor="baja_fechaCreacion"
                          className="baja-cargo-label"
                        >
                          Fecha de Creación
                        </label>
                        <div className="baja-cargo-datepicker-container">
                          <DatePicker
                            id="baja_fechaCreacion"
                            selected={parseIsoToDate(formData.fechaCreacion)}
                            onChange={() => { }}
                            dateFormat="dd/MM/yyyy"
                            placeholderText="DD/MM/AAAA"
                            locale="es"
                            className="baja-cargo-input baja-cargo-datepicker-input"
                            autoComplete="off"
                            disabled
                          />
                          <FiCalendar className="baja-cargo-datepicker-icon" />
                        </div>
                      </div>

                      <div className="baja-cargo-field">
                        <label htmlFor="baja_estado" className="baja-cargo-label">
                          Estado
                        </label>
                        <input
                          id="baja_estado"
                          type="text"
                          className="baja-cargo-input"
                          value={formData.estado || (hasLoadedCargo ? 'Libre' : '')}
                          readOnly
                          disabled
                        />
                      </div>
                    </div>

                    {/* Row 2: Dependencia, Departamento */}
                    <div className="baja-cargo-grid-2">
                      <div className="baja-cargo-field">
                        <label
                          htmlFor="baja_dependencia"
                          className="baja-cargo-label"
                        >
                          Dependencia
                        </label>
                        <div className="baja-cargo-select-wrapper">
                          <select
                            id="baja_dependencia"
                            className="baja-cargo-select"
                            value={formData.dependencia}
                            disabled
                          >
                            <option value={formData.dependencia}>
                              {formData.dependencia || 'Departamento'}
                            </option>
                          </select>
                          <FiChevronDown className="baja-cargo-select-caret" />
                        </div>
                      </div>

                      <div className="baja-cargo-field">
                        <label
                          htmlFor="baja_departamento"
                          className="baja-cargo-label"
                        >
                          Departamento
                        </label>
                        <div className="baja-cargo-select-wrapper">
                          <select
                            id="baja_departamento"
                            className="baja-cargo-select"
                            value={formData.departamento}
                            disabled
                          >
                            <option value={formData.departamento}>
                              {formData.departamento || 'Seleccione'}
                            </option>
                          </select>
                          <FiChevronDown className="baja-cargo-select-caret" />
                        </div>
                      </div>
                    </div>

                    <hr className="baja-cargo-divider" />

                    {/* SECTION 2: CLASIFICACIÓN */}
                    <h3 className="baja-cargo-section-title">Clasificación</h3>

                    {/* Row 1: Origen, Carácter, Categoría */}
                    <div className="baja-cargo-grid-3">
                      <div className="baja-cargo-field">
                        <label htmlFor="baja_origen" className="baja-cargo-label">
                          Origen
                        </label>
                        <div className="baja-cargo-select-wrapper">
                          <select
                            id="baja_origen"
                            className="baja-cargo-select"
                            value={formData.origen}
                            disabled
                          >
                            <option value="">
                              {origenes.find((o) => String(o.id) === String(formData.origen))?.label ||
                                formData.origen ||
                                'Seleccione'}
                            </option>
                          </select>
                          <FiChevronDown className="baja-cargo-select-caret" />
                        </div>
                      </div>

                      <div className="baja-cargo-field">
                        <label htmlFor="baja_caracter" className="baja-cargo-label">
                          Carácter
                        </label>
                        <div className="baja-cargo-select-wrapper">
                          <select
                            id="baja_caracter"
                            className="baja-cargo-select"
                            value={formData.caracter}
                            disabled
                          >
                            <option value="">
                              {caracteres.find((c) => String(c.id) === String(formData.caracter))?.label ||
                                formData.caracter ||
                                'Seleccione'}
                            </option>
                          </select>
                          <FiChevronDown className="baja-cargo-select-caret" />
                        </div>
                      </div>

                      <div className="baja-cargo-field">
                        <label htmlFor="baja_categoria" className="baja-cargo-label">
                          Categoría
                        </label>
                        <div className="baja-cargo-select-wrapper">
                          <select
                            id="baja_categoria"
                            className="baja-cargo-select"
                            value={formData.categoria}
                            disabled
                          >
                            <option value="">
                              {categorias.find((cat) => String(cat.id) === String(formData.categoria))?.label ||
                                formData.categoria ||
                                'Seleccione'}
                            </option>
                          </select>
                          <FiChevronDown className="baja-cargo-select-caret" />
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Dedicación, Cant. de Horas */}
                    <div className="baja-cargo-grid-2">
                      <div className="baja-cargo-field">
                        <label htmlFor="baja_dedicacion" className="baja-cargo-label">
                          Dedicación
                        </label>
                        <div className="baja-cargo-select-wrapper">
                          <select
                            id="baja_dedicacion"
                            className="baja-cargo-select"
                            value={formData.dedicacion}
                            disabled
                          >
                            <option value="">
                              {dedicaciones.find((d) => String(d.id) === String(formData.dedicacion))?.label ||
                                formData.dedicacion ||
                                'Seleccione'}
                            </option>
                          </select>
                          <FiChevronDown className="baja-cargo-select-caret" />
                        </div>
                      </div>

                      <div className="baja-cargo-field">
                        <label htmlFor="baja_cantHoras" className="baja-cargo-label">
                          Cant. de Horas
                        </label>
                        <input
                          id="baja_cantHoras"
                          type="text"
                          className="baja-cargo-input"
                          value={formData.cantHoras}
                          readOnly
                          disabled
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions Toolbar: Borrar & Confirmar */}
            <div className="baja-cargo-actions">
              <button
                type="button"
                className="btn-baja-cargo btn-baja-cargo-borrar"
                onClick={handleClear}
              >
                <FiTrash2 className="btn-icon" />
                <span>Borrar</span>
              </button>

              <button
                type="button"
                className="btn-baja-cargo btn-baja-cargo-confirmar"
                onClick={() => handleSubmit()}
                disabled={
                  isSubmitting ||
                  !hasLoadedCargo ||
                  isCargoDadoDeBaja(formData.estado)
                }
              >
                <FiCheckSquare className="btn-icon" />
                <span>
                  {isSubmitting
                    ? 'Procesando...'
                    : isCargoDadoDeBaja(formData.estado)
                      ? 'Dado de baja'
                      : 'Confirmar'}
                </span>
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
