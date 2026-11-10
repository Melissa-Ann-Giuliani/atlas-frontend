import { useState, useEffect, useRef } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { es } from 'date-fns/locale/es';
import 'react-datepicker/dist/react-datepicker.css';
import './Designacion.css';
import Sidebar from '../../../components/Sidebar';
import Topbar from '../../../components/Topbar';
import {
  FiChevronLeft,
  FiFilter,
  FiSearch,
  FiUserPlus,
  FiCalendar,
  FiTrash2,
  FiX,
  FiCheck
} from 'react-icons/fi';

registerLocale('es', es);

export type TramiteTab = 'designaciones' | 'licencias' | 'subrogancias' | 'renuncias' | 'adscripciones';

interface DesignacionProps {
  onLogout?: () => void;
  onNavigate?: (page: any, data?: any) => void;
  onBack?: () => void;
}

interface FormState {
  docenteId: number | null;
  legajo: string;
  nroResolucion: string;
  apellido: string;
  nombre: string;
  fechaComienzo: Date | null;
  fechaFinalizacion: Date | null;
}

interface CargoOption {
  id: number;
  codigo?: number;
  numero?: number;
  categoria?: string;
  dedicacion?: string;
  unidad?: string;
  unidadNombre?: string;
  estado?: string;
}

const initialFormState: FormState = {
  docenteId: null,
  legajo: '',
  nroResolucion: '',
  apellido: '',
  nombre: '',
  fechaComienzo: null,
  fechaFinalizacion: null,
};

// Custom SVG icon matching the document-with-assign-arrow symbol from screenshot
const AsignarCargoIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="M9 15l3 3 5-5" />
  </svg>
);

export default function Designacion({ onLogout, onNavigate, onBack }: DesignacionProps) {
  const [activeTab, setActiveTab] = useState<TramiteTab>('designaciones');
  const [formData, setFormData] = useState<FormState>(initialFormState);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [filterCriteria, setFilterCriteria] = useState<'todos' | 'docente' | 'legajo' | 'resolucion'>('todos');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Modal & Cargo selection state
  const [isCargoModalOpen, setIsCargoModalOpen] = useState(false);
  const [cargoSearchQuery, setCargoSearchQuery] = useState('');
  const [availableCargos, setAvailableCargos] = useState<CargoOption[]>([]);
  const [selectedCargoId, setSelectedCargoId] = useState<number | null>(null);
  const [isLoadingCargos, setIsLoadingCargos] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Feedback notification
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const filterRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close filter dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Debounced search for docentes
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

        const res = await fetch(`${apiUrl}/api/docentes?search=${encodeURIComponent(trimmed)}&size=8`, { headers });
        if (res.ok) {
          const data = await res.json();
          const items = data.content || data || [];
          setSuggestions(items);
          setShowSuggestions(items.length > 0);
        }
      } catch (err) {
        console.error('Error fetching suggestions:', err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectDocente = async (docente: any) => {
    const docId = docente.usuarioId || docente.id;
    let resolvedLegajo = String(docente.usuarioId || docente.legajo || docente.dni || '');
    let resolvedResolucion = '';

    // Optionally fetch full details if available
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';
      const res = await fetch(`${apiUrl}/api/docentes/${docId}`, { headers });
      if (res.ok) {
        const fullData = await res.json();
        const des = fullData.designacionesYCargos?.[0];
        if (des?.legajo) {
          resolvedLegajo = String(des.legajo);
        }
        if (des?.nroResolucion) {
          resolvedResolucion = String(des.nroResolucion);
        }
      }
    } catch {
      // Use basic info on error
    }

    setFormData((prev) => ({
      ...prev,
      docenteId: docId,
      legajo: resolvedLegajo || prev.legajo,
      apellido: docente.apellido || docente.apellidos || '',
      nombre: docente.nombre || docente.nombres || '',
      nroResolucion: resolvedResolucion || prev.nroResolucion,
    }));

    setShowSuggestions(false);
    setSearchQuery('');
  };

  const handleFieldChange = (field: keyof FormState, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLimpiar = () => {
    setFormData(initialFormState);
    setSearchQuery('');
    setFeedback(null);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (onNavigate) {
      onNavigate('inicio');
    } else {
      window.history.back();
    }
  };

  const handleIngresarDocenteNuevo = () => {
    if (onNavigate) {
      onNavigate('nuevo_usuario');
    }
  };

  const handleTabClick = (tab: TramiteTab) => {
    setActiveTab(tab);
    if (tab !== 'designaciones') {
      setFeedback({
        type: 'info',
        message: `El módulo de ${tab.charAt(0).toUpperCase() + tab.slice(1)} está en proceso de diseño.`,
      });
    } else {
      setFeedback(null);
    }
  };

  // Open Assign Cargo Modal and fetch free positions
  const handleOpenAsignarCargo = async () => {
    setFeedback(null);

    // Form validations
    if (!formData.apellido.trim() || !formData.nombre.trim()) {
      setFeedback({
        type: 'error',
        message: 'Por favor ingrese o seleccione el docente (Apellido y Nombre).',
      });
      return;
    }

    if (!formData.nroResolucion.trim()) {
      setFeedback({
        type: 'error',
        message: 'Por favor complete el N° de Resolución.',
      });
      return;
    }

    if (!formData.fechaComienzo) {
      setFeedback({
        type: 'error',
        message: 'Por favor seleccione la Fecha de Comienzo.',
      });
      return;
    }

    if (formData.fechaFinalizacion && formData.fechaFinalizacion < formData.fechaComienzo) {
      setFeedback({
        type: 'error',
        message: 'La Fecha de Finalización no puede ser anterior a la Fecha de Comienzo.',
      });
      return;
    }

    setIsCargoModalOpen(true);
    fetchAvailableCargos('');
  };

  const fetchAvailableCargos = async (search: string) => {
    setIsLoadingCargos(true);
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

      const url = search
        ? `${apiUrl}/api/cargos?search=${encodeURIComponent(search)}&size=20`
        : `${apiUrl}/api/cargos?size=30`;

      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        const list: CargoOption[] = data.content || data || [];
        // Filter cargos that are 'Libre' or allow user selection
        const libres = list.filter((c) => !c.estado || c.estado.toLowerCase() === 'libre');
        setAvailableCargos(libres.length > 0 ? libres : list);
      }
    } catch (err) {
      console.error('Error fetching cargos:', err);
    } finally {
      setIsLoadingCargos(false);
    }
  };

  // Submit designation
  const handleConfirmAsignacion = async () => {
    if (!selectedCargoId) {
      setFeedback({
        type: 'error',
        message: 'Debe seleccionar un cargo de la lista para completar la designación.',
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

      // Format dates to YYYY-MM-DD
      const formatIso = (date: Date | null) => {
        if (!date) return null;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const payload = {
        docenteId: formData.docenteId || (formData.legajo ? Number(formData.legajo) : 1),
        cargoId: selectedCargoId,
        nroResolucion: Number(formData.nroResolucion.replace(/\D/g, '') || formData.nroResolucion),
        fechaInicio: formatIso(formData.fechaComienzo),
        fechaFin: formatIso(formData.fechaFinalizacion),
      };

      const res = await fetch(`${apiUrl}/api/designaciones`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (res.status === 201 || res.ok) {
        setFeedback({
          type: 'success',
          message: `Designación con Resolución N° ${formData.nroResolucion} asignada exitosamente al docente ${formData.apellido}, ${formData.nombre}.`,
        });
        setIsCargoModalOpen(false);
        handleLimpiar();
      } else {
        const errorMsg = data?.message || 'Error al procesar la asignación de la designación.';
        setFeedback({
          type: 'error',
          message: errorMsg,
        });
        setIsCargoModalOpen(false);
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error de conexión con el servidor al registrar la designación.',
      });
      setIsCargoModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="designacion-page">
      <Topbar onLogout={onLogout} />

      <div className="designacion-body">
        <Sidebar activeItem="tramites" onNavigate={onNavigate} />

        <main className="designacion-main">
          <div className="designacion-content-area">
            {/* Top Horizontal Tabs */}
            <nav className="tramites-tabs-container" aria-label="Pestañas de trámites">
              <button
                type="button"
                className={`tramite-tab tab-designaciones ${activeTab === 'designaciones' ? 'active' : ''}`}
                onClick={() => handleTabClick('designaciones')}
              >
                Designaciones
              </button>
              <button
                type="button"
                className={`tramite-tab tab-licencias ${activeTab === 'licencias' ? 'active' : ''}`}
                onClick={() => handleTabClick('licencias')}
              >
                Licencias
              </button>
              <button
                type="button"
                className={`tramite-tab tab-subrogancias ${activeTab === 'subrogancias' ? 'active' : ''}`}
                onClick={() => handleTabClick('subrogancias')}
              >
                Subrogancias
              </button>
              <button
                type="button"
                className={`tramite-tab tab-renuncias ${activeTab === 'renuncias' ? 'active' : ''}`}
                onClick={() => handleTabClick('renuncias')}
              >
                Renuncias
              </button>
              <button
                type="button"
                className={`tramite-tab tab-adscripciones ${activeTab === 'adscripciones' ? 'active' : ''}`}
                onClick={() => handleTabClick('adscripciones')}
              >
                Adscripciones
              </button>
            </nav>

            {/* Retroceder Link */}
            <div className="designacion-top-nav">
              <button type="button" className="designacion-back-btn" onClick={handleBack}>
                <FiChevronLeft className="designacion-back-icon" />
                <span>Retroceder</span>
              </button>
            </div>

            {/* Main Form Card */}
            <div className="designacion-card">
              {/* Header Row: Title & Filter Widget */}
              <div className="designacion-card-header">
                <h1 className="designacion-title">Datos de Designación</h1>

                {/* Filter and Search Bar Widget */}
                <div className="designacion-filter-widget" ref={searchContainerRef}>
                  <div ref={filterRef} style={{ position: 'relative' }}>
                    <button
                      type="button"
                      className={`designacion-filter-btn ${isFilterDropdownOpen ? 'active' : ''}`}
                      onClick={() => setIsFilterDropdownOpen((prev) => !prev)}
                    >
                      <FiFilter />
                      <span>Filtros</span>
                    </button>

                    {isFilterDropdownOpen && (
                      <div className="designacion-filter-dropdown">
                        <button
                          type="button"
                          className="designacion-filter-dropdown-item"
                          onClick={() => {
                            setFilterCriteria('todos');
                            setIsFilterDropdownOpen(false);
                          }}
                        >
                          {filterCriteria === 'todos' ? '✓ ' : ''}Todos los campos
                        </button>
                        <button
                          type="button"
                          className="designacion-filter-dropdown-item"
                          onClick={() => {
                            setFilterCriteria('docente');
                            setIsFilterDropdownOpen(false);
                          }}
                        >
                          {filterCriteria === 'docente' ? '✓ ' : ''}Por Docente
                        </button>
                        <button
                          type="button"
                          className="designacion-filter-dropdown-item"
                          onClick={() => {
                            setFilterCriteria('legajo');
                            setIsFilterDropdownOpen(false);
                          }}
                        >
                          {filterCriteria === 'legajo' ? '✓ ' : ''}Por N° Legajo
                        </button>
                        <button
                          type="button"
                          className="designacion-filter-dropdown-item"
                          onClick={() => {
                            setFilterCriteria('resolucion');
                            setIsFilterDropdownOpen(false);
                          }}
                        >
                          {filterCriteria === 'resolucion' ? '✓ ' : ''}Por N° Resolución
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="designacion-search-wrapper">
                    <input
                      type="text"
                      className="designacion-search-input"
                      placeholder="Ingrese valor"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <FiSearch className="designacion-search-icon" />

                    {/* Suggestions dropdown */}
                    {showSuggestions && suggestions.length > 0 && (
                      <div className="designacion-suggestions-menu">
                        {suggestions.map((item) => (
                          <div
                            key={item.usuarioId || item.id}
                            className="designacion-suggestion-item"
                            onClick={() => handleSelectDocente(item)}
                          >
                            <span className="designacion-suggestion-name">
                              {item.apellido || item.apellidos}, {item.nombre || item.nombres}
                            </span>
                            <span className="designacion-suggestion-sub">
                              {item.categoria ? `${item.categoria} | ` : ''}
                              {item.unidad ? `${item.unidad} | ` : ''}
                              ID/Legajo: {item.usuarioId || item.id}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <form
                className="designacion-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleOpenAsignarCargo();
                }}
              >
                {/* Row 1: N° Legajo & N° Resolución */}
                <div className="designacion-form-row">
                  <div className="designacion-field-group small">
                    <label htmlFor="legajoInput" className="designacion-label">
                      N° Legajo
                    </label>
                    <input
                      id="legajoInput"
                      type="text"
                      className="designacion-input"
                      placeholder="Ingrese valor"
                      value={formData.legajo}
                      onChange={(e) => handleFieldChange('legajo', e.target.value)}
                    />
                  </div>

                  <div className="designacion-field-group small">
                    <label htmlFor="nroResolucionInput" className="designacion-label">
                      N° Resolución
                    </label>
                    <input
                      id="nroResolucionInput"
                      type="text"
                      className="designacion-input"
                      placeholder="Ingrese valor"
                      value={formData.nroResolucion}
                      onChange={(e) => handleFieldChange('nroResolucion', e.target.value)}
                    />
                  </div>
                </div>

                {/* Row 2: Apellido/s, Nombre/s & Button Ingresar docente nuevo */}
                <div className="designacion-form-row">
                  <div className="designacion-field-group medium">
                    <label htmlFor="apellidoInput" className="designacion-label">
                      Apellido/s
                    </label>
                    <input
                      id="apellidoInput"
                      type="text"
                      className="designacion-input"
                      placeholder="Castelli"
                      value={formData.apellido}
                      onChange={(e) => handleFieldChange('apellido', e.target.value)}
                    />
                  </div>

                  <div className="designacion-field-group medium">
                    <label htmlFor="nombreInput" className="designacion-label">
                      Nombre/s
                    </label>
                    <input
                      id="nombreInput"
                      type="text"
                      className="designacion-input"
                      placeholder="Sandra"
                      value={formData.nombre}
                      onChange={(e) => handleFieldChange('nombre', e.target.value)}
                    />
                  </div>

                  <button
                    type="button"
                    className="designacion-btn-nuevo-docente"
                    onClick={handleIngresarDocenteNuevo}
                  >
                    <FiUserPlus size={18} />
                    <span>Ingresar docente nuevo</span>
                  </button>
                </div>

                {/* Row 3: Fecha de Comienzo & Fecha Finalización */}
                <div className="designacion-form-row">
                  <div className="designacion-field-group date">
                    <label htmlFor="fechaComienzoInput" className="designacion-label">
                      Fecha de Comienzo
                    </label>
                    <div className="designacion-date-wrapper">
                      <DatePicker
                        id="fechaComienzoInput"
                        selected={formData.fechaComienzo}
                        onChange={(date: Date | null) => handleFieldChange('fechaComienzo', date)}
                        dateFormat="dd/MM/yyyy"
                        locale="es"
                        placeholderText="01/09/2026"
                        autoComplete="off"
                      />
                      <FiCalendar className="designacion-calendar-icon" />
                    </div>
                  </div>

                  <div className="designacion-field-group date">
                    <label htmlFor="fechaFinalizacionInput" className="designacion-label">
                      Fecha Finalización
                    </label>
                    <div className="designacion-date-wrapper">
                      <DatePicker
                        id="fechaFinalizacionInput"
                        selected={formData.fechaFinalizacion}
                        onChange={(date: Date | null) => handleFieldChange('fechaFinalizacion', date)}
                        dateFormat="dd/MM/yyyy"
                        locale="es"
                        placeholderText="06/10/2026"
                        autoComplete="off"
                      />
                      <FiCalendar className="designacion-calendar-icon" />
                    </div>
                  </div>
                </div>
              </form>

              {/* Feedback Alert */}
              {feedback && (
                <div className={`designacion-feedback ${feedback.type}`}>
                  <span>{feedback.message}</span>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    onClick={() => setFeedback(null)}
                  >
                    <FiX />
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Actions Row: Limpiar on left, Asignar cargo on right */}
            <div className="designacion-actions-row">
              <button
                type="button"
                className="designacion-btn-limpiar"
                onClick={handleLimpiar}
              >
                <FiTrash2 size={18} />
                <span>Limpiar</span>
              </button>

              <button
                type="button"
                className="designacion-btn-asignar"
                onClick={handleOpenAsignarCargo}
              >
                <AsignarCargoIcon />
                <span>Asignar cargo</span>
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* Modal: Asignar Cargo a la Designación */}
      {isCargoModalOpen && (
        <div className="designacion-modal-overlay">
          <div className="designacion-modal-card">
            <div className="designacion-modal-header">
              <h2 className="designacion-modal-title">Seleccionar Cargo a Asignar</h2>
              <button
                type="button"
                className="designacion-modal-close"
                onClick={() => setIsCargoModalOpen(false)}
              >
                <FiX />
              </button>
            </div>

            <div className="designacion-modal-body">
              {/* Summary of current designation data */}
              <div className="designacion-modal-summary">
                <div className="designacion-summary-item">
                  <span className="designacion-summary-label">Docente</span>
                  <span className="designacion-summary-val">
                    {formData.apellido}, {formData.nombre}
                  </span>
                </div>
                <div className="designacion-summary-item">
                  <span className="designacion-summary-label">N° Legajo</span>
                  <span className="designacion-summary-val">{formData.legajo || 'Sin especificar'}</span>
                </div>
                <div className="designacion-summary-item">
                  <span className="designacion-summary-label">N° Resolución</span>
                  <span className="designacion-summary-val">{formData.nroResolucion}</span>
                </div>
                <div className="designacion-summary-item">
                  <span className="designacion-summary-label">Período</span>
                  <span className="designacion-summary-val">
                    {formData.fechaComienzo ? formData.fechaComienzo.toLocaleDateString('es-AR') : ''}
                    {formData.fechaFinalizacion
                      ? ` hasta ${formData.fechaFinalizacion.toLocaleDateString('es-AR')}`
                      : ' (Indeterminado)'}
                  </span>
                </div>
              </div>

              {/* Cargo search input */}
              <div className="designacion-search-wrapper" style={{ width: '100%' }}>
                <input
                  type="text"
                  className="designacion-search-input"
                  style={{ width: '100%' }}
                  placeholder="Buscar cargo por número, categoría o departamento..."
                  value={cargoSearchQuery}
                  onChange={(e) => {
                    setCargoSearchQuery(e.target.value);
                    fetchAvailableCargos(e.target.value);
                  }}
                />
                <FiSearch className="designacion-search-icon" />
              </div>

              {/* Cargos list */}
              <div className="designacion-modal-cargos-list">
                {isLoadingCargos ? (
                  <div style={{ textAlign: 'center', padding: '16px', color: '#718096' }}>
                    Cargando cargos disponibles...
                  </div>
                ) : availableCargos.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '16px', color: '#718096' }}>
                    No se encontraron cargos disponibles para asignar.
                  </div>
                ) : (
                  availableCargos.map((cargo) => {
                    const isSelected = selectedCargoId === cargo.id;
                    const numero = cargo.codigo || cargo.numero || cargo.id;
                    return (
                      <div
                        key={cargo.id}
                        className={`designacion-cargo-option ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedCargoId(cargo.id)}
                      >
                        <div className="designacion-cargo-info">
                          <span className="designacion-cargo-title">
                            Cargo N° {numero} - {cargo.categoria || 'Sin categoría'}
                          </span>
                          <span className="designacion-cargo-meta">
                            Dedicación: {cargo.dedicacion || 'Simple'} | Unidad: {cargo.unidad || cargo.unidadNombre || 'FFHA'}
                          </span>
                        </div>
                        <span className="designacion-cargo-badge">
                          {isSelected ? <FiCheck size={14} /> : cargo.estado || 'Libre'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="designacion-modal-footer">
              <button
                type="button"
                className="designacion-modal-btn-cancel"
                onClick={() => setIsCargoModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="designacion-modal-btn-confirm"
                onClick={handleConfirmAsignacion}
                disabled={isSubmitting || !selectedCargoId}
              >
                {isSubmitting ? 'Asignando...' : 'Confirmar Asignación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

