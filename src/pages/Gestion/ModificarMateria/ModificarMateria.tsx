import React, { useState, useEffect, useRef } from 'react';
import './ModificarMateria.css';
import Sidebar from '../../../components/Sidebar';
import Topbar from '../../../components/Topbar';
import { FiChevronLeft, FiChevronDown, FiTrash2, FiCheckSquare, FiSearch, FiFilter } from 'react-icons/fi';
import { isGlobalAdmin, getUserUnitInfo } from '../../../utils/auth';

interface ModificarMateriaProps {
  initialMateria?: any;
  onLogout?: () => void;
  onNavigate?: (page: any, data?: any) => void;
  onBack?: () => void;
}

interface FormState {
  materiaId: number | null;
  nombre: string;
  cantHoras: string;
  dependencia: string; // tipoUnidadId
  unidad: string;      // unidadId
  anoEducativo: string; // "1°" | "2°" | "3°" | "4°" | "5°"
  despliegueTipo: string; // "Anual" | "Semestral"
  despliegueSemestre: string; // "Primer Semestre" | "Segundo Semestre"
  nroPlan: string;    // study plan year (e.g. "2023")
}

interface OptionItem {
  id: string | number;
  label: string;
  tipoUnidadId?: string | number;
}

interface MateriaSuggestion {
  id: number;
  nombre: string;
  unidad?: string;
  anio?: string;
  planEstudio?: number | string;
  materia?: any;
}

const ANIO_EDUCATIVO_OPTIONS = ['1°', '2°', '3°', '4°', '5°'];

const emptyFormState: FormState = {
  materiaId: null,
  nombre: '',
  cantHoras: '',
  dependencia: '',
  unidad: '',
  anoEducativo: '',
  despliegueTipo: '',
  despliegueSemestre: '',
  nroPlan: '',
};

export default function ModificarMateria({
  initialMateria,
  onLogout,
  onNavigate,
  onBack,
}: ModificarMateriaProps) {
  const [searchQuery, setSearchQuery] = useState<string>(
    initialMateria?.nombre ? String(initialMateria.nombre) : ''
  );
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [formData, setFormData] = useState<FormState>(emptyFormState);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<MateriaSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Role & Scoping
  const isGlobal = isGlobalAdmin();
  const [userUnitId, setUserUnitId] = useState<number | null>(null);

  // Dynamic catalog options fetched from backend
  const [dependencias, setDependencias] = useState<OptionItem[]>([]);
  const [unidades, setUnidades] = useState<OptionItem[]>([]);
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState<boolean>(true);
  const [isLoadingUnidades, setIsLoadingUnidades] = useState<boolean>(false);

  // Detect user's assigned unit & dependency if not global admin
  useEffect(() => {
    if (!isGlobal) {
      const unitInfo = getUserUnitInfo();
      if (unitInfo.unidadId) {
        setUserUnitId(unitInfo.unidadId);
        setFormData((prev) => ({
          ...prev,
          unidad: String(unitInfo.unidadId),
          dependencia: unitInfo.tipoUnidadId ? String(unitInfo.tipoUnidadId) : prev.dependencia,
        }));
      }
    }
  }, [isGlobal]);

  // Load Tipos de Unidad (Dependencias) on mount
  useEffect(() => {
    const fetchCatalogs = async () => {
      setIsLoadingCatalogs(true);
      try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

        const resTiposUnidad = await fetch(`${apiUrl}/api/tipos-unidad`, { headers }).catch(() => null);

        if (resTiposUnidad && resTiposUnidad.status === 401) {
          if (onLogout) onLogout();
          return;
        }

        if (resTiposUnidad && resTiposUnidad.ok) {
          const data = await resTiposUnidad.json();
          if (Array.isArray(data)) {
            const mappedDeps = data.map((item: any) => ({
              id: item.tipoUnidadId ?? item.id ?? item.nombre,
              label: item.tipoUnidadNombre ?? item.nombre ?? item.descripcion ?? String(item.id || item),
            }));
            setDependencias(mappedDeps);
          }
        }
      } catch (error) {
        console.error('Error fetching catalogs for Modificar Materia:', error);
      } finally {
        setIsLoadingCatalogs(false);
      }
    };

    fetchCatalogs();
  }, [onLogout]);

  // Load Unidades when Dependencia changes (or if userUnitId is present)
  useEffect(() => {
    if (!formData.dependencia && !userUnitId) {
      setUnidades([]);
      return;
    }

    const fetchUnidades = async () => {
      setIsLoadingUnidades(true);
      try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

        const url = formData.dependencia
          ? `${apiUrl}/api/unidades?tipoUnidadId=${encodeURIComponent(formData.dependencia)}`
          : `${apiUrl}/api/unidades`;

        const response = await fetch(url, { headers });

        if (response.status === 401) {
          if (onLogout) onLogout();
          return;
        }

        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            const mapped = data.map((item: any) => ({
              id: item.unidadId ?? item.id,
              label: item.unidadNombre ?? item.nombre ?? String(item.unidadId || item.id),
              tipoUnidadId: item.tipoUnidadId ?? (item.tipoUnidad && item.tipoUnidad.id),
            }));
            setUnidades(mapped);

            // Scoping: If user is ADMIN_UNIDAD and matched assigned unit, lock it
            if (!isGlobal && userUnitId) {
              const matched = mapped.find((u: any) => Number(u.id) === Number(userUnitId));
              if (matched) {
                setFormData((prev) => ({
                  ...prev,
                  unidad: String(matched.id),
                  dependencia: matched.tipoUnidadId ? String(matched.tipoUnidadId) : prev.dependencia,
                }));
              }
            }
          }
        }
      } catch (err) {
        console.warn('Error loading unidades for Modificar Materia:', err);
      } finally {
        setIsLoadingUnidades(false);
      }
    };

    fetchUnidades();
  }, [formData.dependencia, userUnitId, isGlobal, onLogout]);

  // Load initialMateria if provided
  useEffect(() => {
    if (initialMateria) {
      if (initialMateria.id) {
        loadMateriaDetails(initialMateria.id, initialMateria);
      } else if (initialMateria.nombre) {
        setSearchQuery(initialMateria.nombre);
        handleSearch(initialMateria.nombre);
      }
    }
  }, [initialMateria]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-search suggestions as user types
  useEffect(() => {
    const term = searchQuery.trim();
    if (!term || term.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

        const res = await fetch(`${apiUrl}/api/materias?search=${encodeURIComponent(term)}`, { headers });
        if (res.ok) {
          const data = await res.json();
          const list = data.content || (Array.isArray(data) ? data : []);
          const mapped = list.slice(0, 8).map((m: any) => ({
            id: m.id || m.materiaId,
            nombre: m.nombre || m.materiaNombre,
            unidad: m.unidad?.nombre || m.unidad?.unidadNombre || m.unidadNombre || m.unidadAcademica,
            anio: m.anio || m.anoEducativo,
            planEstudio: m.planEstudio || m.plan || m.nroPlan,
            materia: m,
          }));
          setSuggestions(mapped);
          setShowSuggestions(mapped.length > 0);
          setActiveSuggestionIndex(-1);
        }
      } catch (err) {
        console.warn('Error searching materias autocomplete:', err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside listener for suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const populateFormWithMateria = (materia: any) => {
    const mId = materia.id || materia.materiaId;
    const nombre = materia.nombre || materia.materiaNombre || '';
    const cantHoras = materia.horas !== undefined ? String(materia.horas) : (materia.cantHoras ? String(materia.cantHoras) : '');

    let depId = '';
    if (materia.dependenciaId) depId = String(materia.dependenciaId);
    else if (materia.tipoUnidadId) depId = String(materia.tipoUnidadId);
    else if (materia.unidad?.tipoUnidad?.id) depId = String(materia.unidad.tipoUnidad.id);
    else if (materia.unidad?.tipoUnidadId) depId = String(materia.unidad.tipoUnidadId);
    else if (materia.dependencia?.id) depId = String(materia.dependencia.id);

    let uniId = '';
    if (materia.unidadId) uniId = String(materia.unidadId);
    else if (materia.unidad?.id) uniId = String(materia.unidad.id);
    else if (materia.unidad?.unidadId) uniId = String(materia.unidad.unidadId);

    const anoEducativo = materia.anio || materia.anoEducativo || '';

    let despliegueTipo = '';
    let despliegueSemestre = '';
    const rawDespliegue = materia.despliegue || '';
    if (rawDespliegue === 'Anual') {
      despliegueTipo = 'Anual';
    } else if (rawDespliegue === 'Primer Semestre' || rawDespliegue === 'Segundo Semestre' || rawDespliegue.toLowerCase().includes('semestre')) {
      despliegueTipo = 'Semestral';
      despliegueSemestre = rawDespliegue;
    } else if (rawDespliegue) {
      despliegueTipo = rawDespliegue;
    }

    const nroPlan = materia.planEstudio !== undefined ? String(materia.planEstudio) : (materia.plan ? String(materia.plan) : '');

    setFormData({
      materiaId: mId,
      nombre,
      cantHoras,
      dependencia: depId || (!isGlobal && userUnitId ? String(getUserUnitInfo().tipoUnidadId || '') : ''),
      unidad: uniId || (!isGlobal && userUnitId ? String(userUnitId) : ''),
      anoEducativo,
      despliegueTipo,
      despliegueSemestre,
      nroPlan,
    });
  };

  const loadMateriaDetails = async (id: number, fallbackData?: any) => {
    setIsSearching(true);
    setFeedback(null);
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

      const response = await fetch(`${apiUrl}/api/materias/${id}`, { headers });
      if (response.ok) {
        const data = await response.json();
        populateFormWithMateria(data);
        setFeedback({
          type: 'info',
          message: `Materia "${data.nombre || id}" cargada para modificación.`,
        });
      } else if (fallbackData) {
        populateFormWithMateria(fallbackData);
        setFeedback({
          type: 'info',
          message: `Materia "${fallbackData.nombre || id}" cargada.`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: `No se pudo encontrar la materia con ID ${id}.`,
        });
      }
    } catch (err: any) {
      if (fallbackData) {
        populateFormWithMateria(fallbackData);
      } else {
        setFeedback({
          type: 'error',
          message: err.message || 'Error de conexión al cargar la materia.',
        });
      }
    } finally {
      setIsSearching(false);
    }
  };

  const selectSuggestion = (sug: MateriaSuggestion) => {
    setShowSuggestions(false);
    setSearchQuery(sug.nombre);
    if (sug.materia) {
      populateFormWithMateria(sug.materia);
    } else {
      loadMateriaDetails(sug.id);
    }
  };

  const handleSearch = async (termToSearch?: string) => {
    const term = (termToSearch !== undefined ? termToSearch : searchQuery).trim();
    setShowSuggestions(false);
    if (!term) {
      setFeedback({
        type: 'error',
        message: 'Por favor, ingrese el nombre o valor de la materia a buscar.',
      });
      return;
    }

    setIsSearching(true);
    setFeedback(null);

    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

      const response = await fetch(`${apiUrl}/api/materias?search=${encodeURIComponent(term)}`, { headers });
      if (response.ok) {
        const data = await response.json();
        const list = data.content || (Array.isArray(data) ? data : []);
        if (list.length > 0) {
          const exact = list.find((m: any) => (m.nombre || '').toLowerCase() === term.toLowerCase());
          const chosen = exact || list[0];
          populateFormWithMateria(chosen);
          setFeedback({
            type: 'info',
            message: `Materia "${chosen.nombre}" cargada.`,
          });
        } else {
          setFeedback({
            type: 'error',
            message: `No se encontró ninguna materia coincidente con "${term}".`,
          });
          setFormData(emptyFormState);
        }
      } else {
        setFeedback({
          type: 'error',
          message: 'Error al buscar materias en el servidor.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error de conexión durante la búsqueda.',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestionIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestionIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
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

  const handleChange = (field: keyof FormState, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'dependencia' && (!userUnitId || isGlobal)) {
        next.unidad = '';
      }
      return next;
    });
    if (feedback && feedback.type !== 'info') setFeedback(null);
  };

  const handleClear = () => {
    setFormData({
      ...emptyFormState,
      dependencia: (!isGlobal && userUnitId) ? formData.dependencia : '',
      unidad: (!isGlobal && userUnitId) ? formData.unidad : '',
    });
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setFeedback({
      type: 'info',
      message: 'Formulario limpiado. Busque una nueva materia para modificar.',
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!formData.materiaId) {
      setFeedback({
        type: 'error',
        message: 'Debe buscar y seleccionar una materia antes de guardar modificaciones.',
      });
      return;
    }

    // Validations (identical restrictions to Alta de Materia):
    // 1. Nombre: Obligatorio, máx 50 caracteres
    const trimmedNombre = formData.nombre.trim();
    if (!trimmedNombre) {
      setFeedback({ type: 'error', message: 'El campo Nombre es obligatorio.' });
      return;
    }
    if (trimmedNombre.length > 50) {
      setFeedback({ type: 'error', message: 'El Nombre no puede superar los 50 caracteres.' });
      return;
    }

    // 2. Horas: Entre 1 y 40
    const horasNum = Number(formData.cantHoras);
    if (!formData.cantHoras || isNaN(horasNum) || horasNum < 1 || horasNum > 40) {
      setFeedback({ type: 'error', message: 'La Cantidad de Horas debe ser un número entero entre 1 y 40.' });
      return;
    }

    // 3. Dependencia & Unidad
    if (!formData.unidad) {
      setFeedback({ type: 'error', message: 'Debe seleccionar una Unidad Académica.' });
      return;
    }

    // 4. Año Educativo
    if (!formData.anoEducativo) {
      setFeedback({ type: 'error', message: 'Debe seleccionar el Año Educativo.' });
      return;
    }

    // 5. Despliegue
    if (!formData.despliegueTipo) {
      setFeedback({ type: 'error', message: 'Debe seleccionar el Despliegue.' });
      return;
    }

    let despliegueFinal = formData.despliegueTipo;
    if (formData.despliegueTipo === 'Semestral') {
      if (!formData.despliegueSemestre) {
        setFeedback({ type: 'error', message: 'Debe seleccionar el semestre correspondiente.' });
        return;
      }
      despliegueFinal = formData.despliegueSemestre;
    }

    // 6. Plan de Estudio: Entre 1900 y 2100
    const planNum = Number(formData.nroPlan);
    if (!formData.nroPlan || isNaN(planNum) || planNum < 1900 || planNum > 2100) {
      setFeedback({ type: 'error', message: 'El N° de Plan de Estudio debe ser un año entre 1900 y 2100.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

      // Partial patch request for RF-25
      const payload: {
        nombre: string;
        horas: number;
        anio: string;
        despliegue: string;
      } = {
        nombre: trimmedNombre,
        horas: Math.round(horasNum),
        anio: formData.anoEducativo,
        despliegue: despliegueFinal,
      };

      // Try PATCH first (standard RF-25 endpoint), fallback to PUT if needed
      let response = await fetch(`${apiUrl}/api/materias/${formData.materiaId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
      });

      if (response.status === 405) {
        // Fallback to PUT if backend only provides PUT
        const fullPayload = {
          ...payload,
          unidadId: Number(formData.unidad),
          planEstudio: Math.round(planNum),
          dependenciaId: formData.dependencia ? Number(formData.dependencia) : undefined,
        };
        response = await fetch(`${apiUrl}/api/materias/${formData.materiaId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(fullPayload),
        });
      }

      if (response.status === 401) {
        if (onLogout) onLogout();
        return;
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        let errorMsg = 'Error al modificar la materia.';
        if (data && (data.message || data.error)) {
          errorMsg = data.message || data.error;
        } else if (response.status === 400) {
          errorMsg = 'Datos inválidos. Verifique los campos ingresados.';
        } else if (response.status === 403) {
          errorMsg = 'No posee permisos para modificar materias en esta unidad académica.';
        } else if (response.status === 404) {
          errorMsg = 'La materia o la unidad académica especificada no existe.';
        } else if (response.status === 409) {
          errorMsg = data?.message || 'Conflicto: Ya existe otra materia con ese nombre o posee cátedras activas asociadas.';
        }
        setFeedback({ type: 'error', message: errorMsg });
        return;
      }

      setFeedback({
        type: 'success',
        message: `Materia "${data?.nombre || trimmedNombre}" modificada exitosamente.`,
      });
    } catch (error: any) {
      console.error('Error submitting Modificar Materia:', error);
      setFeedback({
        type: 'error',
        message: error?.message || 'Ocurrió un error al modificar la materia.',
      });
    } finally {
      setIsSubmitting(false);
    }
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

  return (
    <div className="modificar-materia-page">
      <Topbar onLogout={onLogout} />

      <div className="modificar-materia-body">
        <Sidebar activeItem="gestion" onNavigate={onNavigate} />

        <main className="modificar-materia-main">
          <div className="modificar-materia-content-area">
            {/* Top Navigation: Retroceder */}
            <div className="modificar-materia-top-nav">
              <button
                type="button"
                className="modificar-materia-back-btn"
                onClick={handleBack}
              >
                <FiChevronLeft className="modificar-materia-back-icon" />
                <span>Retroceder</span>
              </button>
            </div>

            {/* Container Card */}
            <div className="modificar-materia-container-card">
              {/* Header & Search Bar Row */}
              <div className="modificar-materia-header-row">
                <div className="modificar-materia-header-left">
                  <h1 className="modificar-materia-title">Gestión</h1>
                </div>

                {/* Filter and Search Bar Card */}
                <div className="modificar-materia-search-card">
                  <button
                    type="button"
                    className="modificar-materia-filtros-btn"
                    onClick={() => handleSearch()}
                    title="Filtrar o buscar materia"
                  >
                    <FiFilter />
                    <span>Filtros</span>
                  </button>

                  <div className="modificar-materia-search-input-wrap" ref={searchContainerRef}>
                    <input
                      id="searchMateriaInput"
                      name="busqueda_materia_query"
                      type="search"
                      className="modificar-materia-search-input"
                      placeholder="Ingrese valor"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => {
                        if (suggestions.length > 0) setShowSuggestions(true);
                      }}
                      onKeyDown={handleKeyDown}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                    />
                    <FiSearch className="modificar-materia-search-icon" />

                    {/* Suggestions Dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                      <ul className="modificar-materia-suggestions-list" role="listbox">
                        {suggestions.map((item, idx) => (
                          <li
                            key={item.id ?? idx}
                            className={`modificar-materia-suggestion-item ${idx === activeSuggestionIndex ? 'active' : ''}`}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              selectSuggestion(item);
                            }}
                            onMouseEnter={() => setActiveSuggestionIndex(idx)}
                            role="option"
                            aria-selected={idx === activeSuggestionIndex}
                          >
                            <span className="modificar-materia-suggestion-name">
                              {item.nombre}
                            </span>
                            {(item.unidad || item.anio || item.planEstudio) && (
                              <span className="modificar-materia-suggestion-sub">
                                {[
                                  item.unidad,
                                  item.anio ? `Año: ${item.anio}` : null,
                                  item.planEstudio ? `Plan: ${item.planEstudio}` : null,
                                ]
                                  .filter(Boolean)
                                  .join(' • ')}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Card */}
              <div className="modificar-materia-form-card">
                <div className="modificar-materia-card-header">
                  <h2>Modificar Materia</h2>
                </div>

                <div className="modificar-materia-card-body">
                  {feedback && (
                    <div className={`modificar-materia-feedback feedback-${feedback.type}`}>
                      {feedback.message}
                    </div>
                  )}

                  <form className="modificar-materia-form" onSubmit={handleSubmit}>
                    {/* SECTION: DATOS DE MATERIA */}
                    <h3 className="modificar-materia-section-title">Datos de Materia</h3>

                    {/* Row 1: Nombre, Cantidad de Horas */}
                    <div className="modificar-materia-grid-top">
                      <div className="modificar-materia-field">
                        <label htmlFor="nombre" className="modificar-materia-label">
                          Nombre *
                        </label>
                        <input
                          id="nombre"
                          name="nombre"
                          type="text"
                          maxLength={50}
                          className="modificar-materia-input"
                          placeholder="Ingrese nombre de la materia (máx. 50 caracteres)"
                          value={formData.nombre}
                          onChange={(e) => handleChange('nombre', e.target.value)}
                          autoComplete="off"
                        />
                      </div>

                      <div className="modificar-materia-field">
                        <label htmlFor="cantHoras" className="modificar-materia-label">
                          Cantidad de Horas *
                        </label>
                        <input
                          id="cantHoras"
                          name="cantHoras"
                          type="number"
                          min="1"
                          max="40"
                          className="modificar-materia-input"
                          placeholder="Horas semanales (1 a 40)"
                          value={formData.cantHoras}
                          onChange={(e) => handleChange('cantHoras', e.target.value)}
                          autoComplete="off"
                        />
                      </div>
                    </div>

                    {/* Row 2: Dependencia y Unidad Académica (Exact same inputs and selectors as Alta de Materia) */}
                    <div className="modificar-materia-grid-2">
                      <div className="modificar-materia-field">
                        <label htmlFor="dependencia" className="modificar-materia-label">
                          Dependencia
                        </label>
                        <div className="modificar-materia-select-wrapper">
                          <select
                            id="dependencia"
                            className="modificar-materia-select"
                            value={formData.dependencia}
                            onChange={(e) => handleChange('dependencia', e.target.value)}
                            disabled={(!isGlobal && !!userUnitId) || (isLoadingCatalogs && dependencias.length === 0)}
                          >
                            <option value="" disabled hidden>
                              {isLoadingCatalogs && dependencias.length === 0 ? 'Cargando dependencias...' : 'Seleccione'}
                            </option>
                            {dependencias.map((dep) => (
                              <option key={dep.id} value={dep.id}>
                                {dep.label}
                              </option>
                            ))}
                          </select>
                          <FiChevronDown className="modificar-materia-select-caret" />
                        </div>
                      </div>

                      <div className="modificar-materia-field">
                        <label htmlFor="unidad" className="modificar-materia-label">
                          Unidad Académica *
                        </label>
                        <div className="modificar-materia-select-wrapper">
                          <select
                            id="unidad"
                            className="modificar-materia-select"
                            value={formData.unidad}
                            onChange={(e) => handleChange('unidad', e.target.value)}
                            disabled={(!isGlobal && !!userUnitId) || isLoadingUnidades || (!formData.dependencia && unidades.length === 0)}
                          >
                            <option value="" disabled hidden>
                              {isLoadingUnidades
                                ? 'Cargando unidades...'
                                : !formData.dependencia
                                  ? 'Primero seleccione una dependencia'
                                  : 'Seleccione'}
                            </option>
                            {unidades.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.label}
                              </option>
                            ))}
                          </select>
                          <FiChevronDown className="modificar-materia-select-caret" />
                        </div>
                      </div>
                    </div>

                    {/* Row 3: Año Educativo, Despliegue, N° de Plan (Exact same inputs and selectors as Alta de Materia) */}
                    <div className={formData.despliegueTipo === 'Semestral' ? 'modificar-materia-grid-bottom' : 'modificar-materia-grid-3'}>
                      <div className="modificar-materia-field">
                        <label htmlFor="anoEducativo" className="modificar-materia-label">
                          Año Educativo *
                        </label>
                        <div className="modificar-materia-select-wrapper">
                          <select
                            id="anoEducativo"
                            className="modificar-materia-select"
                            value={formData.anoEducativo}
                            onChange={(e) => handleChange('anoEducativo', e.target.value)}
                          >
                            <option value="" disabled hidden>
                              Seleccione
                            </option>
                            {ANIO_EDUCATIVO_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                          <FiChevronDown className="modificar-materia-select-caret" />
                        </div>
                      </div>

                      <div className="modificar-materia-field">
                        <label htmlFor="despliegueTipo" className="modificar-materia-label">
                          Despliegue *
                        </label>
                        <div className="modificar-materia-select-wrapper">
                          <select
                            id="despliegueTipo"
                            className="modificar-materia-select"
                            value={formData.despliegueTipo}
                            onChange={(e) => handleChange('despliegueTipo', e.target.value)}
                          >
                            <option value="" disabled hidden>
                              Seleccione
                            </option>
                            <option value="Anual">Anual</option>
                            <option value="Semestral">Semestral</option>
                          </select>
                          <FiChevronDown className="modificar-materia-select-caret" />
                        </div>
                      </div>

                      {formData.despliegueTipo === 'Semestral' && (
                        <div className="modificar-materia-field">
                          <label htmlFor="despliegueSemestre" className="modificar-materia-label">
                            Semestre *
                          </label>
                          <div className="modificar-materia-select-wrapper">
                            <select
                              id="despliegueSemestre"
                              className="modificar-materia-select"
                              value={formData.despliegueSemestre}
                              onChange={(e) => handleChange('despliegueSemestre', e.target.value)}
                            >
                              <option value="" disabled hidden>
                                Seleccione
                              </option>
                              <option value="Primer Semestre">Primer Semestre</option>
                              <option value="Segundo Semestre">Segundo Semestre</option>
                            </select>
                            <FiChevronDown className="modificar-materia-select-caret" />
                          </div>
                        </div>
                      )}

                      <div className="modificar-materia-field">
                        <label htmlFor="nroPlan" className="modificar-materia-label">
                          N° de Plan de Estudio *
                        </label>
                        <input
                          id="nroPlan"
                          name="nroPlan"
                          type="number"
                          min="1900"
                          max="2100"
                          className="modificar-materia-input"
                          placeholder="Ej: 2023"
                          value={formData.nroPlan}
                          onChange={(e) => handleChange('nroPlan', e.target.value)}
                          autoComplete="off"
                        />
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* Bottom Actions Toolbar: Borrar & Confirmar */}
            <div className="modificar-materia-actions">
              <button
                type="button"
                className="btn-modificar-materia btn-modificar-materia-borrar"
                onClick={handleClear}
                disabled={isSubmitting}
              >
                <FiTrash2 className="btn-icon" />
                <span>Borrar</span>
              </button>

              <button
                type="button"
                className="btn-modificar-materia btn-modificar-materia-confirmar"
                onClick={() => handleSubmit()}
                disabled={isSubmitting}
              >
                <FiCheckSquare className="btn-icon" />
                <span>{isSubmitting ? 'Guardando...' : 'Confirmar'}</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
