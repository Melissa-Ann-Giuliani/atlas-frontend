import { useState, useEffect, useRef } from 'react';
import './AltaCatedra.css';
import Sidebar from '../../../components/Sidebar';
import Topbar from '../../../components/Topbar';
import { FiChevronLeft, FiChevronDown, FiTrash2, FiCheckSquare, FiSearch } from 'react-icons/fi';
import { isGlobalAdmin, getUserUnitInfo } from '../../../utils/auth';

interface AltaCatedraProps {
  onLogout?: () => void;
  onNavigate?: (page: any, data?: any) => void;
  onBack?: () => void;
}

interface FormState {
  nombreCatedra: string;
  tipologia: string;
  dependencia: string;
  unidad: string;
  materiaId: string;
  directorId: string;
  directorNombre: string;
}

interface OptionItem {
  id: string | number;
  label: string;
  tipoUnidadId?: string | number;
}

interface DocenteSuggestion {
  id: number;
  nombreCompleto: string;
  dni?: string;
  unidad?: string;
}

const TIPOLOGIA_OPTIONS: { id: number; roman: string; label: string }[] = [
  { id: 1, roman: 'I', label: 'I' },
  { id: 2, roman: 'II', label: 'II' },
  { id: 3, roman: 'III', label: 'III' },
  { id: 4, roman: 'IV', label: 'IV' },
];

const initialFormState: FormState = {
  nombreCatedra: '',
  tipologia: '',
  dependencia: '',
  unidad: '',
  materiaId: '',
  directorId: '',
  directorNombre: '',
};

export default function AltaCatedra({ onLogout, onNavigate, onBack }: AltaCatedraProps) {
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Role and unit scoping
  const isGlobal = isGlobalAdmin();
  const [userUnitId, setUserUnitId] = useState<number | null>(null);

  // Catalogs
  const [dependencias, setDependencias] = useState<OptionItem[]>([]);
  const [unidades, setUnidades] = useState<OptionItem[]>([]);
  const [allMaterias, setAllMaterias] = useState<any[]>([]);
  const [filteredMaterias, setFilteredMaterias] = useState<OptionItem[]>([]);

  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState<boolean>(true);
  const [isLoadingUnidades, setIsLoadingUnidades] = useState<boolean>(false);
  const [isLoadingMaterias, setIsLoadingMaterias] = useState<boolean>(false);

  // Director autocomplete state
  const [directorSuggestions, setDirectorSuggestions] = useState<DocenteSuggestion[]>([]);
  const [showDirectorSuggestions, setShowDirectorSuggestions] = useState<boolean>(false);
  const [isSearchingDirector, setIsSearchingDirector] = useState<boolean>(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(-1);

  const directorWrapperRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<any>(null);

  // Click outside listener for director autocomplete suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (directorWrapperRef.current && !directorWrapperRef.current.contains(event.target as Node)) {
        setShowDirectorSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Pre-load current user unit info if ADMIN_UNIDAD
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

  // Load Tipos de Unidad (Dependencia) on mount
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
            setDependencias(
              data.map((item: any) => ({
                id: item.tipoUnidadId ?? item.id ?? item.nombre,
                label: item.tipoUnidadNombre ?? item.nombre ?? item.descripcion ?? String(item.id || item),
              }))
            );
          }
        }
      } catch (err) {
        console.error('Error fetching catalogs for Alta de Cátedra:', err);
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

            // If user is Admin Unidad and matched their assigned unit, lock it
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
        console.warn('Error loading unidades for Alta Catedra:', err);
      } finally {
        setIsLoadingUnidades(false);
      }
    };

    fetchUnidades();
  }, [formData.dependencia, userUnitId, isGlobal, onLogout]);

  // Load Materias catalog on mount
  useEffect(() => {
    const fetchMaterias = async () => {
      setIsLoadingMaterias(true);
      try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

        const response = await fetch(`${apiUrl}/api/materias?size=1000`, { headers });
        if (response.status === 401) {
          if (onLogout) onLogout();
          return;
        }
        if (response.ok) {
          const data = await response.json();
          const list = data.content || (Array.isArray(data) ? data : []);
          setAllMaterias(list);
        }
      } catch (err) {
        console.warn('Error loading materias for Alta Catedra:', err);
      } finally {
        setIsLoadingMaterias(false);
      }
    };

    fetchMaterias();
  }, [onLogout]);

  // Filter Materias based on selected Unidad (or user's unit for ADMIN_UNIDAD)
  useEffect(() => {
    const targetUnitId = userUnitId || (formData.unidad ? Number(formData.unidad) : null);

    const getMateriaUnidadId = (m: any): number | null => {
      if (!m) return null;
      const raw =
        m.unidadId ??
        m.unidad?.id ??
        m.unidad?.unidadId ??
        (m.materiaUnidadId !== undefined ? m.materiaUnidadId : null);
      const parsed = Number(raw);
      return isNaN(parsed) ? null : parsed;
    };

    let filtered = allMaterias;
    if (targetUnitId) {
      filtered = allMaterias.filter((m) => {
        const mUnit = getMateriaUnidadId(m);
        return mUnit !== null && Number(mUnit) === Number(targetUnitId);
      });
    }

    const mapped = filtered.map((m: any) => ({
      id: m.materiaId ?? m.id,
      label: m.nombreMateria ?? m.nombre ?? `Materia #${m.materiaId || m.id}`,
    }));

    setFilteredMaterias(mapped);

    // If currently selected materia is not in filtered list, reset it
    if (formData.materiaId && !mapped.some((item) => String(item.id) === String(formData.materiaId))) {
      setFormData((prev) => ({ ...prev, materiaId: '' }));
    }
  }, [allMaterias, formData.unidad, userUnitId]);

  // Debounced search for Active Docentes filtered by selected Unidad & Dependencia
  const handleDirectorInputChange = (text: string) => {
    setFormData((prev) => ({
      ...prev,
      directorNombre: text,
      directorId: '', // Clear previous ID if user types anew
    }));
    if (feedback) setFeedback(null);

    const trimmed = text.trim();
    if (trimmed.length < 2) {
      setDirectorSuggestions([]);
      setShowDirectorSuggestions(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Determine target unidad and dependencia to enforce matching
    const targetUnitId = userUnitId || (formData.unidad ? Number(formData.unidad) : null);
    const selectedUnitObj = unidades.find((u) => Number(u.id) === Number(targetUnitId));
    const targetUnitLabel = selectedUnitObj?.label?.toLowerCase().trim();
    const targetDepId = formData.dependencia ? Number(formData.dependencia) : selectedUnitObj?.tipoUnidadId ? Number(selectedUnitObj.tipoUnidadId) : null;
    const selectedDepObj = dependencias.find((d) => Number(d.id) === Number(targetDepId));
    const targetDepLabel = selectedDepObj?.label?.toLowerCase().trim();

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearchingDirector(true);
      try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

        // Query active teachers with search term
        const url = `${apiUrl}/api/docentes?search=${encodeURIComponent(trimmed)}&size=100`;

        const res = await fetch(url, { headers });
        if (res.ok) {
          const data = await res.json();
          const list = data.content || (Array.isArray(data) ? data : []);

          // Filter only Activo docentes matching the selected Unidad & Dependencia
          const filtered = list.filter((item: any) => {
            // 1. Must be active
            const estado = String(item.estado || item.estadoDocente || '').trim().toLowerCase();
            const isActive = !estado || estado === 'activo' || estado === 'activa';
            if (!isActive) return false;

            // 2. Unit check: compare name and ID against item.unidad / item.unidadNombre / item.unidadId
            if (targetUnitId || targetUnitLabel) {
              const itemUnitId =
                item.unidadId ??
                item.unidad?.id ??
                item.unidad?.unidadId ??
                item.datosPersonales?.unidadId;

              const itemUnitName = String(
                item.unidad ||
                item.unidadNombre ||
                item.unidad?.nombre ||
                item.datosPersonales?.unidadNombre ||
                ''
              ).toLowerCase().trim();

              const idMatches =
                targetUnitId &&
                itemUnitId !== undefined &&
                itemUnitId !== null &&
                itemUnitId !== '' &&
                Number(itemUnitId) === Number(targetUnitId);

              const nameMatches =
                targetUnitLabel &&
                itemUnitName &&
                (itemUnitName === targetUnitLabel ||
                  itemUnitName.includes(targetUnitLabel) ||
                  targetUnitLabel.includes(itemUnitName));

              if (!idMatches && !nameMatches) {
                return false;
              }
            }

            // 3. Dependencia / Tipo de Unidad check (if available on the record)
            if (targetDepId || targetDepLabel) {
              const itemDepId =
                item.tipoUnidadId ??
                item.tipoUnidad?.id ??
                item.unidad?.tipoUnidadId ??
                item.unidad?.tipoUnidad?.id ??
                item.datosPersonales?.tipoUnidadId;

              const itemDepName = String(
                item.tipoUnidadNombre ||
                item.dependencia ||
                item.tipoUnidad ||
                item.datosPersonales?.tipoUnidadNombre ||
                ''
              ).toLowerCase().trim();

              // Only reject if the record actually specifies a tipoUnidad that conflicts
              if (itemDepId !== undefined && itemDepId !== null && itemDepId !== '') {
                if (targetDepId && Number(itemDepId) !== Number(targetDepId)) return false;
              } else if (itemDepName && targetDepLabel) {
                if (!itemDepName.includes(targetDepLabel) && !targetDepLabel.includes(itemDepName)) {
                  return false;
                }
              }
            }

            return true;
          });

          const mapped: DocenteSuggestion[] = filtered.map((d: any) => {
            const apellido = d.apellido || d.docenteApellido || '';
            const nombre = d.nombre || d.docenteNombre || '';
            const nombreCompleto = apellido && nombre ? `${apellido}, ${nombre}` : nombre || apellido || `Docente #${d.id || d.usuarioId}`;
            return {
              id: d.usuarioId || d.id,
              nombreCompleto,
              dni: d.dni ? String(d.dni) : undefined,
              unidad: d.unidad || d.unidadNombre || '',
            };
          });

          setDirectorSuggestions(mapped);
          setShowDirectorSuggestions(true);
          setActiveSuggestionIndex(-1);
        }
      } catch (err) {
        console.warn('Error fetching docentes for director search:', err);
      } finally {
        setIsSearchingDirector(false);
      }
    }, 280);
  };

  const handleSelectDirector = (doc: DocenteSuggestion) => {
    setFormData((prev) => ({
      ...prev,
      directorId: String(doc.id),
      directorNombre: doc.nombreCompleto,
    }));
    setShowDirectorSuggestions(false);
    setActiveSuggestionIndex(-1);
    if (feedback) setFeedback(null);
  };

  const handleDirectorKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDirectorSuggestions || directorSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev < directorSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev > 0 ? prev - 1 : directorSuggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeSuggestionIndex >= 0 && activeSuggestionIndex < directorSuggestions.length) {
        handleSelectDirector(directorSuggestions[activeSuggestionIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowDirectorSuggestions(false);
    }
  };

  const handleChange = (field: keyof FormState, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'dependencia') {
        // Reset unidad, materiaId and director when dependencia changes (if global)
        if (isGlobal) {
          next.unidad = '';
          next.materiaId = '';
          next.directorId = '';
          next.directorNombre = '';
        }
      } else if (field === 'unidad') {
        // Reset materiaId and director when unidad changes
        next.materiaId = '';
        next.directorId = '';
        next.directorNombre = '';
      }
      return next;
    });
    setDirectorSuggestions([]);
    setShowDirectorSuggestions(false);
    if (feedback) setFeedback(null);
  };

  const handleClear = () => {
    setFormData({
      ...initialFormState,
      dependencia: !isGlobal && userUnitId ? formData.dependencia : '',
      unidad: !isGlobal && userUnitId ? String(userUnitId) : '',
    });
    setDirectorSuggestions([]);
    setShowDirectorSuggestions(false);
    setFeedback(null);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (onNavigate) {
      onNavigate('gestion');
    }
  };

  const handleSubmit = async () => {
    setFeedback(null);

    // Validation matching backend expectations
    if (!formData.nombreCatedra.trim()) {
      setFeedback({ type: 'error', message: 'Por favor complete el Nombre de Cátedra.' });
      return;
    }
    if (formData.nombreCatedra.trim().length > 50) {
      setFeedback({ type: 'error', message: 'El nombre de la cátedra no puede superar los 50 caracteres.' });
      return;
    }
    if (!formData.tipologia) {
      setFeedback({ type: 'error', message: 'Por favor seleccione una Tipología (I a IV).' });
      return;
    }
    if (isGlobal && !formData.dependencia) {
      setFeedback({ type: 'error', message: 'Por favor seleccione una Dependencia.' });
      return;
    }
    if (isGlobal && !formData.unidad) {
      setFeedback({ type: 'error', message: 'Por favor seleccione una Unidad Académica.' });
      return;
    }
    if (!formData.materiaId) {
      setFeedback({ type: 'error', message: 'Por favor seleccione la Materia.' });
      return;
    }
    if (!formData.directorId) {
      setFeedback({
        type: 'error',
        message: 'Por favor seleccione un Director de Cátedra de la lista de sugerencias.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

      const payload = {
        nombre: formData.nombreCatedra.trim(),
        tipologia: Number(formData.tipologia),
        directorId: Number(formData.directorId),
        materiaId: Number(formData.materiaId),
      };

      const response = await fetch(`${apiUrl}/api/catedras`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        if (onLogout) onLogout();
        return;
      }

      if (!response.ok) {
        let errorMsg = 'Error al dar de alta la cátedra.';
        try {
          const errorData = await response.json();
          if (errorData && (errorData.message || errorData.error)) {
            errorMsg = errorData.message || errorData.error;
          }
        } catch {
          // ignore parsing error
        }
        setFeedback({ type: 'error', message: errorMsg });
        return;
      }

      setFeedback({ type: 'success', message: '¡Cátedra creada con éxito!' });
      // Clear form except user's scoped unit
      handleClear();
    } catch (err: any) {
      console.error('Error submitting alta catedra:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Error de conexión con el servidor al registrar la cátedra.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="alta-catedra-page">
      <Topbar onLogout={onLogout} />

      <div className="alta-catedra-body">
        <Sidebar activeItem="gestion" onNavigate={onNavigate} />

        <main className="alta-catedra-main">
          <div className="alta-catedra-content-area">
            {/* Top Back Navigation */}
            <div className="alta-catedra-top-nav">
              <button
                type="button"
                className="alta-catedra-back-btn"
                onClick={handleBack}
              >
                <FiChevronLeft className="alta-catedra-back-icon" />
                <span>Retroceder</span>
              </button>
            </div>

            {/* Container Card */}
            <div className="alta-catedra-container-card">
              <div className="alta-catedra-header">
                <h1 className="alta-catedra-title">Gestión</h1>
              </div>

              {/* Form Card */}
              <div className="alta-catedra-form-card">
                <div className="alta-catedra-card-header">
                  <h2>Alta de Cátedra</h2>
                </div>

                <div className="alta-catedra-card-body">
                  {feedback && (
                    <div className={`alta-catedra-feedback feedback-${feedback.type}`}>
                      {feedback.message}
                    </div>
                  )}

                  <div className="alta-catedra-form">
                    {/* SECTION: DATOS DE CÁTEDRA */}
                    <h3 className="alta-catedra-section-title">Datos de Cátedra</h3>

                    {/* Row 1: Nombre de Cátedra, Tipología, Dependencia */}
                    <div className="alta-catedra-grid-row-1">
                      <div className="alta-catedra-field">
                        <label htmlFor="nombreCatedra" className="alta-catedra-label">
                          Nombre de Cátedra *
                        </label>
                        <input
                          id="nombreCatedra"
                          name="nombreCatedra"
                          type="text"
                          maxLength={50}
                          className="alta-catedra-input"
                          placeholder="Ingrese nombre de cátedra"
                          value={formData.nombreCatedra}
                          onChange={(e) => handleChange('nombreCatedra', e.target.value)}
                          autoComplete="off"
                          autoCorrect="off"
                          spellCheck={false}
                          data-lpignore="true"
                          data-form-type="other"
                        />
                      </div>

                      <div className="alta-catedra-field">
                        <label htmlFor="tipologia" className="alta-catedra-label">
                          Tipología *
                        </label>
                        <div className="alta-catedra-select-wrapper">
                          <select
                            id="tipologia"
                            name="tipologia"
                            className="alta-catedra-select"
                            value={formData.tipologia}
                            onChange={(e) => handleChange('tipologia', e.target.value)}
                          >
                            <option value="">Seleccione</option>
                            {TIPOLOGIA_OPTIONS.map((tip) => (
                              <option key={tip.id} value={tip.id}>
                                {tip.roman}
                              </option>
                            ))}
                          </select>
                          <FiChevronDown className="alta-catedra-select-caret" />
                        </div>
                      </div>

                      <div className="alta-catedra-field">
                        <label htmlFor="dependencia" className="alta-catedra-label">
                          Dependencia *
                        </label>
                        <div className="alta-catedra-select-wrapper">
                          <select
                            id="dependencia"
                            className="alta-catedra-select"
                            value={formData.dependencia}
                            onChange={(e) => handleChange('dependencia', e.target.value)}
                            disabled={(!isGlobal && !!userUnitId) || (isLoadingCatalogs && dependencias.length === 0)}
                          >
                            <option value="">
                              {isLoadingCatalogs && dependencias.length === 0 ? 'Cargando dependencias...' : 'Seleccione'}
                            </option>
                            {dependencias.map((dep) => (
                              <option key={dep.id} value={dep.id}>
                                {dep.label}
                              </option>
                            ))}
                          </select>
                          <FiChevronDown className="alta-catedra-select-caret" />
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Unidad Académica, Materia, Director de Cátedra */}
                    <div className="alta-catedra-grid-row-1">
                      <div className="alta-catedra-field">
                        <label htmlFor="unidad" className="alta-catedra-label">
                          Unidad Académica *
                        </label>
                        <div className="alta-catedra-select-wrapper">
                          <select
                            id="unidad"
                            className="alta-catedra-select"
                            value={formData.unidad}
                            onChange={(e) => handleChange('unidad', e.target.value)}
                            disabled={(!isGlobal && !!userUnitId) || isLoadingUnidades || (!formData.dependencia && unidades.length === 0)}
                          >
                            <option value="">
                              {isLoadingUnidades
                                ? 'Cargando unidades...'
                                : !formData.dependencia && isGlobal
                                  ? 'Primero seleccione dependencia'
                                  : 'Seleccione'}
                            </option>
                            {unidades.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.label}
                              </option>
                            ))}
                          </select>
                          <FiChevronDown className="alta-catedra-select-caret" />
                        </div>
                      </div>

                      <div className="alta-catedra-field">
                        <label htmlFor="materia" className="alta-catedra-label">
                          Materia *
                        </label>
                        <div className="alta-catedra-select-wrapper">
                          <select
                            id="materia"
                            className="alta-catedra-select"
                            value={formData.materiaId}
                            onChange={(e) => handleChange('materiaId', e.target.value)}
                            disabled={isLoadingMaterias || (!formData.unidad && !userUnitId)}
                          >
                            <option value="">
                              {isLoadingMaterias
                                ? 'Cargando materias...'
                                : !formData.unidad && !userUnitId
                                  ? 'Primero seleccione unidad'
                                  : filteredMaterias.length === 0
                                    ? 'No hay materias para esta unidad'
                                    : 'Seleccione'}
                            </option>
                            {filteredMaterias.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.label}
                              </option>
                            ))}
                          </select>
                          <FiChevronDown className="alta-catedra-select-caret" />
                        </div>
                      </div>

                      <div className="alta-catedra-field">
                        <label htmlFor="directorCatedra" className="alta-catedra-label">
                          Director de Cátedra *
                        </label>
                        <div className="alta-catedra-search-wrapper" ref={directorWrapperRef}>
                          <input
                            id="directorCatedra"
                            name="directorCatedra"
                            type="text"
                            className="alta-catedra-input alta-catedra-input-search"
                            placeholder={
                              isGlobal && !formData.unidad
                                ? 'Primero seleccione una unidad académica'
                                : 'Escriba el nombre o apellido...'
                            }
                            value={formData.directorNombre}
                            onChange={(e) => handleDirectorInputChange(e.target.value)}
                            onFocus={() => {
                              if (directorSuggestions.length > 0) setShowDirectorSuggestions(true);
                            }}
                            onKeyDown={handleDirectorKeyDown}
                            disabled={isGlobal && !formData.unidad && !userUnitId}
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck={false}
                            data-lpignore="true"
                            data-form-type="other"
                          />
                          <FiSearch className="alta-catedra-search-icon" />

                          {showDirectorSuggestions && (
                            <ul className="alta-catedra-suggestions-list" role="listbox">
                              {isSearchingDirector ? (
                                <li className="alta-catedra-suggestion-item disabled">
                                  <span className="alta-catedra-suggestion-name">Buscando docentes...</span>
                                </li>
                              ) : directorSuggestions.length === 0 ? (
                                <li className="alta-catedra-suggestion-item disabled">
                                  <span className="alta-catedra-suggestion-name">No se encontraron docentes activos</span>
                                </li>
                              ) : (
                                directorSuggestions.map((doc, idx) => (
                                  <li
                                    key={doc.id}
                                    className={`alta-catedra-suggestion-item ${
                                      idx === activeSuggestionIndex ? 'active' : ''
                                    }`}
                                    onClick={() => handleSelectDirector(doc)}
                                  >
                                    <div className="alta-catedra-suggestion-header">
                                      <span className="alta-catedra-suggestion-name">{doc.nombreCompleto}</span>
                                      {doc.dni && (
                                        <span className="alta-catedra-suggestion-badge">DNI: {doc.dni}</span>
                                      )}
                                    </div>
                                    {doc.unidad && (
                                      <span className="alta-catedra-suggestion-subtitle">{doc.unidad}</span>
                                    )}
                                  </li>
                                ))
                              )}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>

                    <hr className="alta-catedra-divider" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions Toolbar: Borrar & Confirmar */}
            <div className="alta-catedra-actions">
              <button
                type="button"
                className="btn-alta-catedra btn-alta-catedra-borrar"
                onClick={handleClear}
              >
                <FiTrash2 className="btn-icon" />
                <span>Borrar</span>
              </button>

              <button
                type="button"
                className="btn-alta-catedra btn-alta-catedra-confirmar"
                onClick={handleSubmit}
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
