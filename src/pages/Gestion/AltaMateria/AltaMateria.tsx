import React, { useState, useEffect } from 'react';
import './AltaMateria.css';
import Sidebar from '../../../components/Sidebar';
import Topbar from '../../../components/Topbar';
import { FiChevronLeft, FiChevronDown, FiTrash2, FiCheckSquare } from 'react-icons/fi';
import { isGlobalAdmin, getParsedToken } from '../../../utils/auth';

interface AltaMateriaProps {
  onLogout?: () => void;
  onNavigate?: (page: any, data?: any) => void;
  onBack?: () => void;
}

interface FormState {
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
}

const ANIO_EDUCATIVO_OPTIONS = ['1°', '2°', '3°', '4°', '5°'];

const initialFormState: FormState = {
  nombre: '',
  cantHoras: '',
  dependencia: '',
  unidad: '',
  anoEducativo: '',
  despliegueTipo: '',
  despliegueSemestre: '',
  nroPlan: '',
};

export default function AltaMateria({ onLogout, onNavigate, onBack }: AltaMateriaProps) {
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Role & Scoping
  const isGlobal = isGlobalAdmin();
  const [userUnitId, setUserUnitId] = useState<number | null>(null);

  // Dynamic catalog options fetched from backend
  const [dependencias, setDependencias] = useState<OptionItem[]>([]);
  const [unidades, setUnidades] = useState<OptionItem[]>([]);
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState<boolean>(true);
  const [isLoadingUnidades, setIsLoadingUnidades] = useState<boolean>(false);

  // Detect user's assigned unit if not global admin
  useEffect(() => {
    const tokenData = getParsedToken();
    if (tokenData) {
      const assignedId =
        tokenData.unidadId ||
        tokenData.unidad_id ||
        tokenData.unitId ||
        (tokenData.unidad && typeof tokenData.unidad === 'object' ? tokenData.unidad.id || tokenData.unidad.unidadId : null);
      if (assignedId) {
        setUserUnitId(Number(assignedId));
      }
    }
  }, []);

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
        console.error('Error fetching catalogs for Alta Materia:', error);
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
        console.warn('Error loading unidades for Alta Materia:', err);
      } finally {
        setIsLoadingUnidades(false);
      }
    };

    fetchUnidades();
  }, [formData.dependencia, userUnitId, isGlobal, onLogout]);

  const handleChange = (field: keyof FormState, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      // Reset dependent unidad if dependencia changed
      if (field === 'dependencia' && isGlobal) {
        next.unidad = '';
      }
      return next;
    });
    if (feedback) setFeedback(null);
  };

  const handleClear = () => {
    setFormData({
      ...initialFormState,
      // If admin de unidad, preserve assigned unit/dependencia
      dependencia: !isGlobal ? formData.dependencia : '',
      unidad: !isGlobal ? formData.unidad : '',
    });
    if (isGlobal) {
      setUnidades([]);
    }
    setFeedback(null);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Validations:
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

      const payload: {
        nombre: string;
        horas: number;
        anio: string;
        despliegue: string;
        unidadId: number;
        dependenciaId?: number;
        planEstudio: number;
      } = {
        nombre: trimmedNombre,
        horas: Math.round(horasNum),
        anio: formData.anoEducativo,
        despliegue: despliegueFinal,
        unidadId: Number(formData.unidad),
        planEstudio: Math.round(planNum),
      };

      if (formData.dependencia) {
        payload.dependenciaId = Number(formData.dependencia);
      }

      const response = await fetch(`${apiUrl}/api/materias`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        if (onLogout) onLogout();
        return;
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        let errorMsg = 'Error al registrar la materia.';
        if (data && data.message) {
          errorMsg = data.message;
        } else if (response.status === 400) {
          errorMsg = 'Datos inválidos. Verifique los campos ingresados.';
        } else if (response.status === 403) {
          errorMsg = 'No posee permisos para registrar materias en esta unidad académica.';
        } else if (response.status === 404) {
          errorMsg = 'La unidad académica especificada no existe.';
        } else if (response.status === 409) {
          errorMsg = 'Ya existe una materia con ese nombre para esta unidad y plan de estudio.';
        }
        setFeedback({ type: 'error', message: errorMsg });
        return;
      }

      setFeedback({
        type: 'success',
        message: `Materia "${data?.nombre || trimmedNombre}" registrada exitosamente.`,
      });

      // Clear form
      setFormData({
        ...initialFormState,
        dependencia: !isGlobal ? formData.dependencia : '',
        unidad: !isGlobal ? formData.unidad : '',
      });
      if (isGlobal) {
        setUnidades([]);
      }
    } catch (error: any) {
      console.error('Error submitting Alta de Materia:', error);
      setFeedback({
        type: 'error',
        message: error?.message || 'Ocurrió un error al registrar la materia.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="alta-materia-page">
      <Topbar onLogout={onLogout} />

      <div className="alta-materia-body">
        <Sidebar
          activeItem="gestion"
          onNavigate={onNavigate}
        />

        <main className="alta-materia-main">
          <div className="alta-materia-content-area">
            {/* Top Navigation: Retroceder */}
            <div className="alta-materia-top-nav">
              <button
                type="button"
                className="alta-materia-back-btn"
                onClick={onBack || (() => onNavigate && onNavigate('gestion'))}
              >
                <FiChevronLeft className="alta-materia-back-icon" />
                <span>Retroceder</span>
              </button>
            </div>

            {/* Container Card */}
            <div className="alta-materia-container-card">
              <div className="alta-materia-header">
                <h1 className="alta-materia-title">Gestión</h1>
              </div>

              {/* Form Card */}
              <div className="alta-materia-form-card">
                <div className="alta-materia-card-header">
                  <h2>Alta de Materia</h2>
                </div>

                <div className="alta-materia-card-body">
                  {feedback && (
                    <div className={`alta-materia-feedback feedback-${feedback.type}`}>
                      {feedback.message}
                    </div>
                  )}

                  <form className="alta-materia-form" onSubmit={handleSubmit}>
                    {/* SECTION: DATOS DE MATERIA */}
                    <h3 className="alta-materia-section-title">Datos de Materia</h3>

                    {/* Row 1: Nombre, Cantidad de Horas */}
                    <div className="alta-materia-grid-top">
                      <div className="alta-materia-field">
                        <label htmlFor="nombre" className="alta-materia-label">
                          Nombre *
                        </label>
                        <input
                          id="nombre"
                          name="nombre"
                          type="text"
                          maxLength={50}
                          className="alta-materia-input"
                          placeholder="Ingrese nombre de la materia (máx. 50 caracteres)"
                          value={formData.nombre}
                          onChange={(e) => handleChange('nombre', e.target.value)}
                          autoComplete="off"
                        />
                      </div>

                      <div className="alta-materia-field">
                        <label htmlFor="cantHoras" className="alta-materia-label">
                          Cantidad de Horas *
                        </label>
                        <input
                          id="cantHoras"
                          name="cantHoras"
                          type="number"
                          min="1"
                          max="40"
                          className="alta-materia-input"
                          placeholder="Horas semanales (1 a 40)"
                          value={formData.cantHoras}
                          onChange={(e) => handleChange('cantHoras', e.target.value)}
                          autoComplete="off"
                        />
                      </div>
                    </div>

                    {/* Row 2: Dependencia y Unidad Académica */}
                    <div className="alta-materia-grid-2">
                      <div className="alta-materia-field">
                        <label htmlFor="dependencia" className="alta-materia-label">
                          Dependencia
                        </label>
                        <div className="alta-materia-select-wrapper">
                          <select
                            id="dependencia"
                            className="alta-materia-select"
                            value={formData.dependencia}
                            onChange={(e) => handleChange('dependencia', e.target.value)}
                            disabled={!isGlobal || (isLoadingCatalogs && dependencias.length === 0)}
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
                          <FiChevronDown className="alta-materia-select-caret" />
                        </div>
                      </div>

                      <div className="alta-materia-field">
                        <label htmlFor="unidad" className="alta-materia-label">
                          Unidad Académica *
                        </label>
                        <div className="alta-materia-select-wrapper">
                          <select
                            id="unidad"
                            className="alta-materia-select"
                            value={formData.unidad}
                            onChange={(e) => handleChange('unidad', e.target.value)}
                            disabled={!isGlobal || isLoadingUnidades || (!formData.dependencia && unidades.length === 0)}
                          >
                            <option value="" disabled hidden>
                              {isLoadingUnidades
                                ? 'Cargando unidades...'
                                : !formData.dependencia && isGlobal
                                ? 'Primero seleccione una dependencia'
                                : 'Seleccione'}
                            </option>
                            {unidades.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.label}
                              </option>
                            ))}
                          </select>
                          <FiChevronDown className="alta-materia-select-caret" />
                        </div>
                      </div>
                    </div>

                    {/* Row 3: Año Educativo, Despliegue, N° de Plan */}
                    <div className={formData.despliegueTipo === 'Semestral' ? 'alta-materia-grid-bottom' : 'alta-materia-grid-3'}>
                      <div className="alta-materia-field">
                        <label htmlFor="anoEducativo" className="alta-materia-label">
                          Año Educativo *
                        </label>
                        <div className="alta-materia-select-wrapper">
                          <select
                            id="anoEducativo"
                            className="alta-materia-select"
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
                          <FiChevronDown className="alta-materia-select-caret" />
                        </div>
                      </div>

                      <div className="alta-materia-field">
                        <label htmlFor="despliegueTipo" className="alta-materia-label">
                          Despliegue *
                        </label>
                        <div className="alta-materia-select-wrapper">
                          <select
                            id="despliegueTipo"
                            className="alta-materia-select"
                            value={formData.despliegueTipo}
                            onChange={(e) => handleChange('despliegueTipo', e.target.value)}
                          >
                            <option value="" disabled hidden>
                              Seleccione
                            </option>
                            <option value="Anual">Anual</option>
                            <option value="Semestral">Semestral</option>
                          </select>
                          <FiChevronDown className="alta-materia-select-caret" />
                        </div>
                      </div>

                      {formData.despliegueTipo === 'Semestral' && (
                        <div className="alta-materia-field">
                          <label htmlFor="despliegueSemestre" className="alta-materia-label">
                            Semestre *
                          </label>
                          <div className="alta-materia-select-wrapper">
                            <select
                              id="despliegueSemestre"
                              className="alta-materia-select"
                              value={formData.despliegueSemestre}
                              onChange={(e) => handleChange('despliegueSemestre', e.target.value)}
                            >
                              <option value="" disabled hidden>
                                Seleccione
                              </option>
                              <option value="Primer Semestre">Primer Semestre</option>
                              <option value="Segundo Semestre">Segundo Semestre</option>
                            </select>
                            <FiChevronDown className="alta-materia-select-caret" />
                          </div>
                        </div>
                      )}

                      <div className="alta-materia-field">
                        <label htmlFor="nroPlan" className="alta-materia-label">
                          N° de Plan de Estudio *
                        </label>
                        <input
                          id="nroPlan"
                          name="nroPlan"
                          type="number"
                          min="1900"
                          max="2100"
                          className="alta-materia-input"
                          placeholder="Ej: 2023"
                          value={formData.nroPlan}
                          onChange={(e) => handleChange('nroPlan', e.target.value)}
                          autoComplete="off"
                        />
                      </div>
                    </div>

                    <hr className="alta-materia-divider" />
                  </form>
                </div>
              </div>
            </div>

            {/* Bottom Actions Toolbar: Borrar & Confirmar */}
            <div className="alta-materia-actions">
              <button
                type="button"
                className="btn-alta-materia btn-alta-materia-borrar"
                onClick={handleClear}
                disabled={isSubmitting}
              >
                <FiTrash2 className="btn-icon" />
                <span>Borrar</span>
              </button>

              <button
                type="button"
                className="btn-alta-materia btn-alta-materia-confirmar"
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
