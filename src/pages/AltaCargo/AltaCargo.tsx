import React, { useState, useEffect } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { es } from 'date-fns/locale/es';
import 'react-datepicker/dist/react-datepicker.css';
import './AltaCargo.css';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import { FiChevronLeft, FiChevronDown, FiTrash2, FiCheckSquare, FiCalendar } from 'react-icons/fi';

registerLocale('es', es);

interface AltaCargoProps {
  onLogout?: () => void;
  onNavigate?: (page: any, data?: any) => void;
  onBack?: () => void;
}

interface FormState {
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
}

const getTodayIso = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const initialFormState: FormState = {
  numeroCargo: '',
  fechaCreacion: getTodayIso(),
  estado: 'Libre',
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

export default function AltaCargo({ onLogout, onNavigate, onBack }: AltaCargoProps) {
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Dynamic catalog options fetched from backend
  const [dependencias, setDependencias] = useState<OptionItem[]>([]);
  const [departamentos, setDepartamentos] = useState<OptionItem[]>([]);
  const [origenes, setOrigenes] = useState<OptionItem[]>([]);
  const [caracteres, setCaracteres] = useState<OptionItem[]>([]);
  const [categorias, setCategorias] = useState<OptionItem[]>([]);
  const [dedicaciones, setDedicaciones] = useState<OptionItem[]>([]);

  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState<boolean>(true);
  const [isLoadingDepartamentos, setIsLoadingDepartamentos] = useState<boolean>(false);

  // Parse YYYY-MM-DD from formData into Date object for DatePicker
  const parseIsoToDate = (isoStr: string): Date | null => {
    if (!isoStr) return null;
    const [year, month, day] = isoStr.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };

  // Format Date object to YYYY-MM-DD for formData & backend
  const formatDateToIso = (date: Date | null): string => {
    if (!date || isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Load catalogs on mount
  useEffect(() => {
    const fetchCatalogs = async () => {
      setIsLoadingCatalogs(true);
      try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

        const [resTiposUnidad, resCaracteres, resCategorias, resDedicaciones, resOrigenes] = await Promise.all([
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

        // Tipos de unidad (Dependencia)
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

        // Caracteres
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

        // Categorías
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

        // Dedicaciones
        if (resDedicaciones && resDedicaciones.ok) {
          const data = await resDedicaciones.json();
          if (Array.isArray(data)) {
            setDedicaciones(
              data.map((item: any) => ({
                id: item.dedicacionId ?? item.id ?? item.nombre,
                label: item.dedicacionNombre ?? item.nombre ?? String(item.id || item),
              }))
            );
          }
        }

        // Origenes
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
        } else {
          // Default fallbacks for Origen
          setOrigenes([
            { id: 'CREACION', label: 'Creación' },
            { id: 'DIVISION', label: 'División' },
            { id: 'SUBDIVISION', label: 'Subdivisión' },
            { id: 'TRANSFERENCIA', label: 'Transferencia' },
          ]);
        }
      } catch (err) {
        console.warn('Error fetching catalogs for AltaCargo:', err);
      } finally {
        setIsLoadingCatalogs(false);
      }
    };

    fetchCatalogs();
  }, [onLogout]);

  // Fetch unidades / departamentos when dependencia changes
  useEffect(() => {
    if (!formData.dependencia) {
      setDepartamentos([]);
      return;
    }

    const fetchDepartamentos = async () => {
      setIsLoadingDepartamentos(true);
      try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

        const response = await fetch(`${apiUrl}/api/unidades?tipoUnidadId=${encodeURIComponent(formData.dependencia)}`, { headers });
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            setDepartamentos(
              data.map((item: any) => ({
                id: item.unidadId ?? item.id,
                label: item.unidadNombre ?? item.nombre ?? String(item.unidadId || item.id),
              }))
            );
          }
        }
      } catch (err) {
        console.warn('Error loading departamentos:', err);
      } finally {
        setIsLoadingDepartamentos(false);
      }
    };

    fetchDepartamentos();
  }, [formData.dependencia]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (onNavigate) {
      onNavigate('gestion');
    } else {
      window.history.back();
    }
  };

  const handleChange = (field: keyof FormState, value: string) => {
    setFormData((prev) => {
      if (field === 'dependencia') {
        return { ...prev, dependencia: value, departamento: '' };
      }
      return { ...prev, [field]: value };
    });
    if (feedback) setFeedback(null);
  };

  const handleClear = () => {
    setFormData(initialFormState);
    setFeedback({
      type: 'success',
      message: 'Los campos del formulario han sido limpiados.',
    });
    setTimeout(() => {
      setFeedback(null);
    }, 3000);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!formData.numeroCargo.trim()) {
      setFeedback({
        type: 'error',
        message: 'Por favor, ingrese el N° de Cargo.',
      });
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

      const payload = {
        numero: Number(formData.numeroCargo.trim()) || formData.numeroCargo.trim(),
        fechaCreacion: formData.fechaCreacion || undefined,
        estado: formData.estado || 'Libre',
        dependenciaId: formData.dependencia ? Number(formData.dependencia) || formData.dependencia : undefined,
        departamentoId: formData.departamento ? Number(formData.departamento) || formData.departamento : undefined,
        origen: formData.origen || undefined,
        caracter: formData.caracter || undefined,
        caracterId: formData.caracter ? Number(formData.caracter) || undefined : undefined,
        categoria: formData.categoria || undefined,
        categoriaId: formData.categoria ? Number(formData.categoria) || undefined : undefined,
        dedicacion: formData.dedicacion || undefined,
        dedicacionId: formData.dedicacion ? Number(formData.dedicacion) || undefined : undefined,
        cantHoras: formData.cantHoras ? Number(formData.cantHoras) : undefined,
        nroDesignacionAsociado: formData.nroDesignacionAsociado ? Number(formData.nroDesignacionAsociado) || formData.nroDesignacionAsociado : undefined,
        cargoPredecesorNumero: formData.nroCargoPredecesor ? Number(formData.nroCargoPredecesor) || formData.nroCargoPredecesor : undefined,
      };

      const response = await fetch(`${apiUrl}/api/cargos`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (response.status === 201 || response.ok) {
        setFeedback({
          type: 'success',
          message: data?.message || `Cargo N° ${formData.numeroCargo} registrado exitosamente.`,
        });
        setFormData(initialFormState);
      } else if (response.status === 409) {
        setFeedback({
          type: 'error',
          message: data?.message || 'Ya existe un cargo registrado con ese número.',
        });
      } else if (response.status === 403) {
        setFeedback({
          type: 'error',
          message: 'No tiene permisos para registrar un nuevo cargo.',
        });
      } else {
        setFeedback({
          type: 'error',
          message: data?.message || 'Error al registrar el cargo en el servidor.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error de conexión con el servidor al registrar el cargo.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="alta-cargo-page">
      <Topbar onLogout={onLogout} />

      <div className="alta-cargo-body">
        <Sidebar activeItem="gestion" onNavigate={onNavigate} />

        <main className="alta-cargo-main">
          <div className="alta-cargo-content-area">
            {/* Top Back Navigation */}
            <div className="alta-cargo-top-nav">
              <button
                type="button"
                className="alta-cargo-back-btn"
                onClick={handleBack}
              >
                <FiChevronLeft className="alta-cargo-back-icon" />
                <span>Retroceder</span>
              </button>
            </div>

            {/* Container Card */}
            <div className="alta-cargo-container-card">
              <div className="alta-cargo-header">
                <h1 className="alta-cargo-title">Gestión</h1>
              </div>

              {/* Form Card */}
              <div className="alta-cargo-form-card">
                <div className="alta-cargo-card-header">
                  <h2>Alta de Cargo</h2>
                </div>

                <div className="alta-cargo-card-body">
                  {feedback && (
                    <div className={`alta-cargo-feedback feedback-${feedback.type}`}>
                      {feedback.message}
                    </div>
                  )}

                  <form className="alta-cargo-form" onSubmit={handleSubmit} autoComplete="off">
                    {/* SECTION 1: DATOS DE CARGOS */}
                    <h3 className="alta-cargo-section-title">Datos de Cargos</h3>

                    {/* Row 1: N° de Cargo, Fecha de Creación, Estado */}
                    <div className="alta-cargo-grid-3">
                      <div className="alta-cargo-field">
                        <label htmlFor="numeroCargo" className="alta-cargo-label">
                          N° de Cargo
                        </label>
                        <input
                          id="numeroCargo"
                          name="numeroCargo"
                          type="text"
                          className="alta-cargo-input"
                          placeholder="Ingrese valor"
                          value={formData.numeroCargo}
                          onChange={(e) => handleChange('numeroCargo', e.target.value)}
                          autoComplete="off"
                        />
                      </div>

                      <div className="alta-cargo-field">
                        <label htmlFor="fechaCreacion" className="alta-cargo-label">
                          Fecha de Creación
                        </label>
                        <div className="alta-cargo-datepicker-container">
                          <DatePicker
                            id="fechaCreacion"
                            name="fechaCreacion"
                            selected={parseIsoToDate(formData.fechaCreacion)}
                            onChange={(date: Date | null) => handleChange('fechaCreacion', formatDateToIso(date))}
                            dateFormat="dd/MM/yyyy"
                            placeholderText="DD/MM/AAAA"
                            locale="es"
                            className="alta-cargo-input alta-cargo-datepicker-input"
                            autoComplete="off"
                            showYearDropdown
                            showMonthDropdown
                            dropdownMode="select"
                          />
                          <FiCalendar className="alta-cargo-datepicker-icon" />
                        </div>
                      </div>

                      <div className="alta-cargo-field">
                        <label htmlFor="estado" className="alta-cargo-label">
                          Estado
                        </label>
                        <input
                          id="estado"
                          name="estado"
                          type="text"
                          className="alta-cargo-input"
                          value={formData.estado}
                          readOnly
                        />
                      </div>
                    </div>

                    {/* Row 2: Dependencia, Departamento */}
                    <div className="alta-cargo-grid-2">
                      <div className="alta-cargo-field">
                        <label htmlFor="dependencia" className="alta-cargo-label">
                          Dependencia
                        </label>
                        <div className="alta-cargo-select-wrapper">
                          <select
                            id="dependencia"
                            className="alta-cargo-select"
                            value={formData.dependencia}
                            onChange={(e) => handleChange('dependencia', e.target.value)}
                            disabled={isLoadingCatalogs && dependencias.length === 0}
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
                          <FiChevronDown className="alta-cargo-select-caret" />
                        </div>
                      </div>

                      <div className="alta-cargo-field">
                        <label htmlFor="departamento" className="alta-cargo-label">
                          Departamento
                        </label>
                        <div className="alta-cargo-select-wrapper">
                          <select
                            id="departamento"
                            className="alta-cargo-select"
                            value={formData.departamento}
                            onChange={(e) => handleChange('departamento', e.target.value)}
                            disabled={!formData.dependencia || isLoadingDepartamentos}
                          >
                            <option value="">
                              {isLoadingDepartamentos
                                ? 'Cargando...'
                                : !formData.dependencia
                                  ? 'Seleccione dependencia primero'
                                  : 'Seleccione'}
                            </option>
                            {departamentos.map((dep) => (
                              <option key={dep.id} value={dep.id}>
                                {dep.label}
                              </option>
                            ))}
                          </select>
                          <FiChevronDown className="alta-cargo-select-caret" />
                        </div>
                      </div>
                    </div>

                    <hr className="alta-cargo-divider" />

                    {/* SECTION 2: CLASIFICACIÓN */}
                    <h3 className="alta-cargo-section-title">Clasificación</h3>

                    {/* Row 1: Origen, Carácter, Categoría */}
                    <div className="alta-cargo-grid-3">
                      <div className="alta-cargo-field">
                        <label htmlFor="origen" className="alta-cargo-label">
                          Origen
                        </label>
                        <div className="alta-cargo-select-wrapper">
                          <select
                            id="origen"
                            className="alta-cargo-select"
                            value={formData.origen}
                            onChange={(e) => handleChange('origen', e.target.value)}
                          >
                            <option value="">Seleccione</option>
                            {origenes.map((ori) => (
                              <option key={ori.id} value={ori.id}>
                                {ori.label}
                              </option>
                            ))}
                          </select>
                          <FiChevronDown className="alta-cargo-select-caret" />
                        </div>
                      </div>

                      <div className="alta-cargo-field">
                        <label htmlFor="caracter" className="alta-cargo-label">
                          Carácter
                        </label>
                        <div className="alta-cargo-select-wrapper">
                          <select
                            id="caracter"
                            className="alta-cargo-select"
                            value={formData.caracter}
                            onChange={(e) => handleChange('caracter', e.target.value)}
                            disabled={isLoadingCatalogs && caracteres.length === 0}
                          >
                            <option value="">
                              {isLoadingCatalogs && caracteres.length === 0 ? 'Cargando caracteres...' : 'Seleccione'}
                            </option>
                            {caracteres.map((car) => (
                              <option key={car.id} value={car.id}>
                                {car.label}
                              </option>
                            ))}
                          </select>
                          <FiChevronDown className="alta-cargo-select-caret" />
                        </div>
                      </div>

                      <div className="alta-cargo-field">
                        <label htmlFor="categoria" className="alta-cargo-label">
                          Categoría
                        </label>
                        <div className="alta-cargo-select-wrapper">
                          <select
                            id="categoria"
                            className="alta-cargo-select"
                            value={formData.categoria}
                            onChange={(e) => handleChange('categoria', e.target.value)}
                            disabled={isLoadingCatalogs && categorias.length === 0}
                          >
                            <option value="">
                              {isLoadingCatalogs && categorias.length === 0 ? 'Cargando categorías...' : 'Seleccione'}
                            </option>
                            {categorias.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.label}
                              </option>
                            ))}
                          </select>
                          <FiChevronDown className="alta-cargo-select-caret" />
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Dedicación, Cant. de Horas */}
                    <div className="alta-cargo-grid-2">
                      <div className="alta-cargo-field">
                        <label htmlFor="dedicacion" className="alta-cargo-label">
                          Dedicación
                        </label>
                        <div className="alta-cargo-select-wrapper">
                          <select
                            id="dedicacion"
                            className="alta-cargo-select"
                            value={formData.dedicacion}
                            onChange={(e) => handleChange('dedicacion', e.target.value)}
                            disabled={isLoadingCatalogs && dedicaciones.length === 0}
                          >
                            <option value="">
                              {isLoadingCatalogs && dedicaciones.length === 0 ? 'Cargando dedicaciones...' : 'Seleccione'}
                            </option>
                            {dedicaciones.map((ded) => (
                              <option key={ded.id} value={ded.id}>
                                {ded.label}
                              </option>
                            ))}
                          </select>
                          <FiChevronDown className="alta-cargo-select-caret" />
                        </div>
                      </div>

                      <div className="alta-cargo-field">
                        <label htmlFor="cantHoras" className="alta-cargo-label">
                          Cant. de Horas
                        </label>
                        <input
                          id="cantHoras"
                          name="cantHoras"
                          type="number"
                          min="0"
                          className="alta-cargo-input"
                          placeholder="Ingrese valor"
                          value={formData.cantHoras}
                          onChange={(e) => handleChange('cantHoras', e.target.value)}
                          autoComplete="off"
                        />
                      </div>
                    </div>

                    <hr className="alta-cargo-divider" />

                    {/* SECTION 3: VINCULACIONES */}
                    <h3 className="alta-cargo-section-title">Vinculaciones</h3>

                    <div className="alta-cargo-grid-2">
                      <div className="alta-cargo-field">
                        <label htmlFor="nroDesignacionAsociado" className="alta-cargo-label">
                          N° Designación Asociado
                        </label>
                        <input
                          id="nroDesignacionAsociado"
                          name="nroDesignacionAsociado"
                          type="text"
                          className="alta-cargo-input"
                          placeholder="Ingrese valor"
                          value={formData.nroDesignacionAsociado}
                          onChange={(e) => handleChange('nroDesignacionAsociado', e.target.value)}
                          autoComplete="off"
                        />
                      </div>

                      <div className="alta-cargo-field">
                        <label htmlFor="nroCargoPredecesor" className="alta-cargo-label">
                          N° Cargo Predecesor (Opcional)
                        </label>
                        <input
                          id="nroCargoPredecesor"
                          name="nroCargoPredecesor"
                          type="text"
                          className="alta-cargo-input"
                          placeholder="Ingrese valor"
                          value={formData.nroCargoPredecesor}
                          onChange={(e) => handleChange('nroCargoPredecesor', e.target.value)}
                          autoComplete="off"
                        />
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* Bottom Actions Toolbar: Borrar & Confirmar */}
            <div className="alta-cargo-actions">
              <button
                type="button"
                className="btn-alta-cargo btn-alta-cargo-borrar"
                onClick={handleClear}
              >
                <FiTrash2 className="btn-icon" />
                <span>Borrar</span>
              </button>

              <button
                type="button"
                className="btn-alta-cargo btn-alta-cargo-confirmar"
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
