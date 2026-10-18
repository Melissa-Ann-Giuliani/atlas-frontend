import React, { useState, useEffect } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { es } from 'date-fns/locale/es';
import 'react-datepicker/dist/react-datepicker.css';
import './ModificarCargo.css';
import Sidebar from '../../../components/Sidebar';
import Topbar from '../../../components/Topbar';
import { FiChevronLeft, FiChevronDown, FiCheckSquare, FiCalendar, FiSearch, FiTrash2 } from 'react-icons/fi';

registerLocale('es', es);

interface ModificarCargoProps {
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
  horasOcupadas: number;
}

interface OptionItem {
  id: string | number;
  label: string;
  horas?: number;
}

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
  horasOcupadas: 0,
};

export default function ModificarCargo({ initialCargo, onLogout, onNavigate, onBack }: ModificarCargoProps) {
  const [searchQuery, setSearchQuery] = useState<string>(initialCargo?.numero ? String(initialCargo.numero) : '');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [formData, setFormData] = useState<FormState>(emptyFormState);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Catalogs
  const [dependencias, setDependencias] = useState<OptionItem[]>([]);
  const [departamentos, setDepartamentos] = useState<OptionItem[]>([]);
  const [origenes, setOrigenes] = useState<OptionItem[]>([]);
  const [caracteres, setCaracteres] = useState<OptionItem[]>([]);
  const [categorias, setCategorias] = useState<OptionItem[]>([]);
  const [dedicaciones, setDedicaciones] = useState<OptionItem[]>([]);

  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState<boolean>(true);

  const [loadedCargoData, setLoadedCargoData] = useState<{ id: number; data: any } | null>(null);

  // Parse YYYY-MM-DD from formData into Date object for DatePicker
  const parseIsoToDate = (isoStr: string): Date | null => {
    if (!isoStr) return null;
    const [year, month, day] = isoStr.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };

  // Format Date object to YYYY-MM-DD
  const formatDateToIso = (date: Date | null): string => {
    if (!date || isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
                horas: item.dedicacionHoras ?? item.horas,
              }))
            );
          }
        }

        if (resOrigenes && resOrigenes.ok) {
          const data = await resOrigenes.json();
          if (Array.isArray(data) && data.length > 0) {
            setOrigenes(
              data.map((item: any) => ({
                id: item.origenId ?? item.id ?? item.origenNombre ?? item.nombre,
                label: item.origenNombre ?? item.nombre ?? String(item.id || item),
              }))
            );
          } else {
            setOrigenes([
              { id: 1, label: 'Planta' },
              { id: 2, label: 'Investigación' },
              { id: 3, label: 'Extensión' },
              { id: 4, label: 'Gestión' },
            ]);
          }
        } else {
          setOrigenes([
            { id: 1, label: 'Planta' },
            { id: 2, label: 'Investigación' },
            { id: 3, label: 'Extensión' },
            { id: 4, label: 'Gestión' },
          ]);
        }
      } catch (err) {
        console.warn('Error fetching catalogs for ModificarCargo:', err);
      } finally {
        setIsLoadingCatalogs(false);
      }
    };

    fetchCatalogs();
  }, [onLogout]);

  // Load initialCargo if passed via props
  useEffect(() => {
    if (initialCargo) {
      if (initialCargo.id) {
        loadCargoDetails(initialCargo.id);
      } else if (initialCargo.numero) {
        handleSearch(String(initialCargo.numero));
      }
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
    // Match catalog IDs if data has names
    let matchedOrigenId = '';
    const rawOrigenVal = data.origenId ?? data.origen?.origenId ?? data.origenNombre ?? data.origen?.origenNombre ?? data.origen;
    if (rawOrigenVal !== undefined && rawOrigenVal !== null && rawOrigenVal !== '') {
      const found = origenes.find(
        (o) => String(o.id) === String(rawOrigenVal) || o.label.toLowerCase() === String(rawOrigenVal).toLowerCase()
      );
      matchedOrigenId = found ? String(found.id) : String(rawOrigenVal);
    } else if (data.actividadesVinculadas && data.actividadesVinculadas.length > 0 && data.actividadesVinculadas[0].origen) {
      const actOrigen = data.actividadesVinculadas[0].origen;
      const found = origenes.find((o) => o.label.toLowerCase() === actOrigen.toLowerCase());
      matchedOrigenId = found ? String(found.id) : '';
    }

    let matchedCaracterId = '';
    const rawCaracterVal = data.caracterId ?? data.caracter?.caracterId ?? data.caracterNombre ?? data.caracter;
    if (rawCaracterVal !== undefined && rawCaracterVal !== null && rawCaracterVal !== '') {
      const found = caracteres.find(
        (c) => String(c.id) === String(rawCaracterVal) || c.label.toLowerCase() === String(rawCaracterVal).toLowerCase()
      );
      matchedCaracterId = found ? String(found.id) : String(rawCaracterVal);
    }

    let matchedCategoriaId = '';
    const rawCategoriaVal = data.categoriaId ?? data.categoria?.categoriaId ?? data.categoriaNombre ?? data.categoria;
    if (rawCategoriaVal !== undefined && rawCategoriaVal !== null && rawCategoriaVal !== '') {
      const found = categorias.find(
        (cat) => String(cat.id) === String(rawCategoriaVal) || cat.label.toLowerCase() === String(rawCategoriaVal).toLowerCase()
      );
      matchedCategoriaId = found ? String(found.id) : String(rawCategoriaVal);
    }

    let matchedDedicacionId = '';
    let cantHorasVal = '';
    const rawDedicacionVal = data.dedicacionId ?? data.dedicacion?.dedicacionId ?? data.dedicacionNombre ?? data.dedicacion;
    if (rawDedicacionVal !== undefined && rawDedicacionVal !== null && rawDedicacionVal !== '') {
      const found = dedicaciones.find(
        (d) => String(d.id) === String(rawDedicacionVal) || d.label.toLowerCase() === String(rawDedicacionVal).toLowerCase()
      );
      matchedDedicacionId = found ? String(found.id) : String(rawDedicacionVal);
      if (found && found.horas !== undefined && found.horas !== null) {
        cantHorasVal = String(found.horas);
      }
    }

    // Predecessor code
    let predecesorCode = '';
    if (data.cargoPredecesor?.numero) {
      predecesorCode = String(data.cargoPredecesor.numero);
    } else if (data.predecesorCodigo) {
      predecesorCode = String(data.predecesorCodigo);
    }

    // Designation number
    let designacionCode = '';
    if (data.nroResolucionDesignacion) {
      designacionCode = String(data.nroResolucionDesignacion);
    } else if (data.designacionNroResolucion) {
      designacionCode = String(data.designacionNroResolucion);
    }

    // Dependencia & Departamento fallbacks
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

    setFormData({
      cargoId,
      numeroCargo: String(data.numero || data.codigo || ''),
      fechaCreacion: data.fechaCreacion ? data.fechaCreacion.split('T')[0] : '',
      estado: data.estado || 'Libre',
      dependencia: resolvedDependencia,
      departamento: resolvedDepartamento,
      origen: matchedOrigenId,
      caracter: matchedCaracterId,
      categoria: matchedCategoriaId,
      dedicacion: matchedDedicacionId,
      cantHoras: cantHorasVal || String(data.horasOcupadas || ''),
      nroDesignacionAsociado: designacionCode,
      nroCargoPredecesor: predecesorCode,
      horasOcupadas: data.horasOcupadas || 0,
    });

    setFeedback({
      type: 'info',
      message: `Información cargada para el Cargo N° ${data.numero || data.codigo}. Puede modificar los campos habilitados.`,
    });
  };

  const handleSearch = async (queryToSearch?: string) => {
    const term = (queryToSearch !== undefined ? queryToSearch : searchQuery).trim();
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

      const response = await fetch(`${apiUrl}/api/cargos?search=${encodeURIComponent(term)}`, { headers });
      if (response.ok) {
        const data = await response.json();
        const cargosList = data.content || (Array.isArray(data) ? data : []);
        const found = cargosList.find((c: any) => String(c.numero) === term || String(c.codigo) === term) || cargosList[0];

        if (found && (found.id || found.cargoId)) {
          const resolvedId = found.id || found.cargoId;
          await loadCargoDetails(resolvedId);
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
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleChange = (field: keyof FormState, value: string) => {
    setFormData((prev) => {
      if (field === 'dedicacion') {
        const selectedDed = dedicaciones.find((d) => String(d.id) === String(value));
        return {
          ...prev,
          dedicacion: value,
          cantHoras: selectedDed && selectedDed.horas !== undefined && selectedDed.horas !== null
            ? String(selectedDed.horas)
            : (value === '' ? '' : prev.cantHoras),
        };
      }
      return { ...prev, [field]: value };
    });
    if (feedback && feedback.type !== 'info') setFeedback(null);
  };

  const handleClear = () => {
    setFormData(emptyFormState);
    setSearchQuery('');
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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!formData.cargoId) {
      setFeedback({
        type: 'error',
        message: 'Debe buscar y seleccionar un cargo antes de modificarlo.',
      });
      return;
    }

    if (!formData.fechaCreacion) {
      setFeedback({
        type: 'error',
        message: 'La fecha de creación es obligatoria.',
      });
      return;
    }

    if (!formData.origen) {
      setFeedback({
        type: 'error',
        message: 'Por favor, seleccione el Origen.',
      });
      return;
    }

    if (!formData.caracter) {
      setFeedback({
        type: 'error',
        message: 'Por favor, seleccione el Carácter.',
      });
      return;
    }

    if (!formData.categoria) {
      setFeedback({
        type: 'error',
        message: 'Por favor, seleccione la Categoría.',
      });
      return;
    }

    if (!formData.dedicacion) {
      setFeedback({
        type: 'error',
        message: 'Por favor, seleccione la Dedicación.',
      });
      return;
    }

    // Validation: hours cannot be lower than occupied hours (Risk R1)
    const selectedDed = dedicaciones.find((d) => String(d.id) === String(formData.dedicacion));
    if (selectedDed && selectedDed.horas !== undefined && formData.horasOcupadas > selectedDed.horas) {
      setFeedback({
        type: 'error',
        message: `No se puede asignar una dedicación de ${selectedDed.horas} horas porque el cargo tiene actualmente ${formData.horasOcupadas} horas ocupadas.`,
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

      const payload: any = {
        fechaCreacion: formData.fechaCreacion,
        origenId: Number(formData.origen),
        caracterId: Number(formData.caracter),
        categoriaId: Number(formData.categoria),
        dedicacionId: Number(formData.dedicacion),
      };

      if (formData.nroCargoPredecesor && !isNaN(Number(formData.nroCargoPredecesor))) {
        payload.predecesorCodigo = Number(formData.nroCargoPredecesor);
      }

      const response = await fetch(`${apiUrl}/api/cargos/${formData.cargoId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (response.ok) {
        setFeedback({
          type: 'success',
          message: data?.message || `El Cargo N° ${formData.numeroCargo} ha sido modificado exitosamente.`,
        });
      } else if (response.status === 403) {
        setFeedback({
          type: 'error',
          message: data?.message || 'No tiene permisos para modificar cargos de esta unidad académica.',
        });
      } else if (response.status === 404) {
        setFeedback({
          type: 'error',
          message: data?.message || 'No se encontró el cargo o alguno de los catálogos especificados.',
        });
      } else {
        setFeedback({
          type: 'error',
          message: data?.message || 'Error al modificar el cargo en el servidor.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error de conexión con el servidor al modificar el cargo.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasLoadedCargo = formData.cargoId !== null;

  return (
    <div className="modificar-cargo-page">
      <Topbar onLogout={onLogout} />

      <div className="modificar-cargo-body">
        <Sidebar activeItem="gestion" onNavigate={onNavigate} />

        <main className="modificar-cargo-main">
          <div className="modificar-cargo-content-area">
            {/* Top Back Navigation */}
            <div className="modificar-cargo-top-nav">
              <button
                type="button"
                className="modificar-cargo-back-btn"
                onClick={handleBack}
              >
                <FiChevronLeft className="modificar-cargo-back-icon" />
                <span>Retroceder</span>
              </button>
            </div>

            {/* Container Card */}
            <div className="modificar-cargo-container-card">
              <div className="modificar-cargo-header">
                <h1 className="modificar-cargo-title">Gestión</h1>
              </div>

              {/* Search Card */}
              <div className="modificar-cargo-search-card">
                <label htmlFor="searchCargoInput" className="modificar-cargo-search-label">
                  Buscar Cargo a Modificar por Número
                </label>
                <div className="modificar-cargo-search-row">
                  <div className="modificar-cargo-search-input-wrap">
                    <FiSearch className="modificar-cargo-search-icon" />
                    <input
                      id="searchCargoInput"
                      type="text"
                      className="modificar-cargo-search-input"
                      placeholder="Ingrese N° de Cargo (ej: 1001)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleKeyDown}
                      autoComplete="off"
                    />
                  </div>
                  <button
                    type="button"
                    className="modificar-cargo-search-btn"
                    onClick={() => handleSearch()}
                    disabled={isSearching}
                  >
                    <FiSearch />
                    <span>{isSearching ? 'Buscando...' : 'Buscar Cargo'}</span>
                  </button>
                </div>
              </div>

              {/* Form Card */}
              <div className="modificar-cargo-form-card">
                <div className="modificar-cargo-card-header">
                  <h2>Modificación de Cargo</h2>
                </div>

                <div className="modificar-cargo-card-body">
                  {feedback && (
                    <div className={`modificar-cargo-feedback feedback-${feedback.type}`}>
                      {feedback.message}
                    </div>
                  )}

                  <div className="modificar-cargo-form">
                    {/* SECTION 1: DATOS DE CARGOS */}
                    <h3 className="modificar-cargo-section-title">Datos de Cargos</h3>

                    {/* Row 1: N° de Cargo, Fecha de Creación, Estado */}
                    <div className="modificar-cargo-grid-3">
                      <div className="modificar-cargo-field">
                        <label htmlFor="mod_numeroCargo" className="modificar-cargo-label">
                          N° de Cargo
                        </label>
                        <input
                          id="mod_numeroCargo"
                          type="text"
                          className="modificar-cargo-input"
                          placeholder="Número del cargo"
                          value={formData.numeroCargo}
                          readOnly
                          disabled
                        />
                      </div>

                      <div className="modificar-cargo-field">
                        <label htmlFor="mod_fechaCreacion" className="modificar-cargo-label">
                          Fecha de Creación
                        </label>
                        <div className="modificar-cargo-datepicker-container">
                          <DatePicker
                            id="mod_fechaCreacion"
                            selected={parseIsoToDate(formData.fechaCreacion)}
                            onChange={(date: Date | null) => handleChange('fechaCreacion', formatDateToIso(date))}
                            dateFormat="dd/MM/yyyy"
                            placeholderText="DD/MM/AAAA"
                            locale="es"
                            className="modificar-cargo-input modificar-cargo-datepicker-input"
                            autoComplete="off"
                            showYearDropdown
                            showMonthDropdown
                            dropdownMode="select"
                            disabled={!hasLoadedCargo}
                          />
                          <FiCalendar className="modificar-cargo-datepicker-icon" />
                        </div>
                      </div>

                      <div className="modificar-cargo-field">
                        <label htmlFor="mod_estado" className="modificar-cargo-label">
                          Estado
                        </label>
                        <input
                          id="mod_estado"
                          type="text"
                          className="modificar-cargo-input"
                          value={formData.estado}
                          readOnly
                          disabled
                        />
                      </div>
                    </div>

                    {/* Row 2: Dependencia, Departamento (Protected Invariants) */}
                    <div className="modificar-cargo-grid-2">
                      <div className="modificar-cargo-field">
                        <label htmlFor="mod_dependencia" className="modificar-cargo-label">
                          Dependencia
                        </label>
                        <input
                          id="mod_dependencia"
                          type="text"
                          className="modificar-cargo-input"
                          value={formData.dependencia}
                          readOnly
                          disabled
                        />
                      </div>

                      <div className="modificar-cargo-field">
                        <label htmlFor="mod_departamento" className="modificar-cargo-label">
                          Departamento
                        </label>
                        <input
                          id="mod_departamento"
                          type="text"
                          className="modificar-cargo-input"
                          value={formData.departamento}
                          readOnly
                          disabled
                        />
                      </div>
                    </div>

                    <hr className="modificar-cargo-divider" />

                    {/* SECTION 2: CLASIFICACIÓN (Editable) */}
                    <h3 className="modificar-cargo-section-title">Clasificación</h3>

                    {/* Row 1: Origen, Carácter, Categoría */}
                    <div className="modificar-cargo-grid-3">
                      <div className="modificar-cargo-field">
                        <label htmlFor="mod_origen" className="modificar-cargo-label">
                          Origen
                        </label>
                        <div className="modificar-cargo-select-wrapper">
                          <select
                            id="mod_origen"
                            className="modificar-cargo-select"
                            value={formData.origen}
                            onChange={(e) => handleChange('origen', e.target.value)}
                            disabled={!hasLoadedCargo || isLoadingCatalogs}
                          >
                            <option value="">Seleccione</option>
                            {origenes.map((ori) => (
                              <option key={ori.id} value={ori.id}>
                                {ori.label}
                              </option>
                            ))}
                          </select>
                          <FiChevronDown className="modificar-cargo-select-caret" />
                        </div>
                      </div>

                      <div className="modificar-cargo-field">
                        <label htmlFor="mod_caracter" className="modificar-cargo-label">
                          Carácter
                        </label>
                        <div className="modificar-cargo-select-wrapper">
                          <select
                            id="mod_caracter"
                            className="modificar-cargo-select"
                            value={formData.caracter}
                            onChange={(e) => handleChange('caracter', e.target.value)}
                            disabled={!hasLoadedCargo || (isLoadingCatalogs && caracteres.length === 0)}
                          >
                            <option value="">
                              {isLoadingCatalogs && caracteres.length === 0 ? 'Cargando...' : 'Seleccione'}
                            </option>
                            {caracteres.map((car) => (
                              <option key={car.id} value={car.id}>
                                {car.label}
                              </option>
                            ))}
                          </select>
                          <FiChevronDown className="modificar-cargo-select-caret" />
                        </div>
                      </div>

                      <div className="modificar-cargo-field">
                        <label htmlFor="mod_categoria" className="modificar-cargo-label">
                          Categoría
                        </label>
                        <div className="modificar-cargo-select-wrapper">
                          <select
                            id="mod_categoria"
                            className="modificar-cargo-select"
                            value={formData.categoria}
                            onChange={(e) => handleChange('categoria', e.target.value)}
                            disabled={!hasLoadedCargo || (isLoadingCatalogs && categorias.length === 0)}
                          >
                            <option value="">
                              {isLoadingCatalogs && categorias.length === 0 ? 'Cargando...' : 'Seleccione'}
                            </option>
                            {categorias.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.label}
                              </option>
                            ))}
                          </select>
                          <FiChevronDown className="modificar-cargo-select-caret" />
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Dedicación, Cant. de Horas */}
                    <div className="modificar-cargo-grid-2">
                      <div className="modificar-cargo-field">
                        <label htmlFor="mod_dedicacion" className="modificar-cargo-label">
                          Dedicación
                        </label>
                        <div className="modificar-cargo-select-wrapper">
                          <select
                            id="mod_dedicacion"
                            className="modificar-cargo-select"
                            value={formData.dedicacion}
                            onChange={(e) => handleChange('dedicacion', e.target.value)}
                            disabled={!hasLoadedCargo || (isLoadingCatalogs && dedicaciones.length === 0)}
                          >
                            <option value="">
                              {isLoadingCatalogs && dedicaciones.length === 0 ? 'Cargando...' : 'Seleccione'}
                            </option>
                            {dedicaciones.map((ded) => (
                              <option key={ded.id} value={ded.id}>
                                {ded.label}
                              </option>
                            ))}
                          </select>
                          <FiChevronDown className="modificar-cargo-select-caret" />
                        </div>
                      </div>

                      <div className="modificar-cargo-field">
                        <label htmlFor="mod_cantHoras" className="modificar-cargo-label">
                          Cant. de Horas
                        </label>
                        <input
                          id="mod_cantHoras"
                          type="number"
                          min="0"
                          className="modificar-cargo-input"
                          placeholder="Horas asignadas"
                          value={formData.cantHoras}
                          onChange={(e) => handleChange('cantHoras', e.target.value)}
                          disabled={!hasLoadedCargo}
                        />
                      </div>
                    </div>

                    <hr className="modificar-cargo-divider" />

                    {/* SECTION 3: VINCULACIONES */}
                    <h3 className="modificar-cargo-section-title">Vinculaciones</h3>

                    <div className="modificar-cargo-grid-2">
                      <div className="modificar-cargo-field">
                        <label htmlFor="mod_nroDesignacionAsociado" className="modificar-cargo-label">
                          N° Designación Asociado
                        </label>
                        <input
                          id="mod_nroDesignacionAsociado"
                          type="text"
                          className="modificar-cargo-input"
                          value={formData.nroDesignacionAsociado}
                          readOnly
                          disabled
                        />
                      </div>

                      <div className="modificar-cargo-field">
                        <label htmlFor="mod_nroCargoPredecesor" className="modificar-cargo-label">
                          N° Cargo Predecesor (Opcional)
                        </label>
                        <input
                          id="mod_nroCargoPredecesor"
                          type="text"
                          className="modificar-cargo-input"
                          placeholder="Ingrese número de cargo predecesor"
                          value={formData.nroCargoPredecesor}
                          onChange={(e) => handleChange('nroCargoPredecesor', e.target.value)}
                          disabled={!hasLoadedCargo}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions Toolbar: Limpiar & Confirmar */}
            <div className="modificar-cargo-actions">
              <button
                type="button"
                className="btn-modificar-cargo btn-modificar-cargo-borrar"
                onClick={handleClear}
              >
                <FiTrash2 className="btn-icon" />
                <span>Limpiar</span>
              </button>

              <button
                type="button"
                className="btn-modificar-cargo btn-modificar-cargo-confirmar"
                onClick={() => handleSubmit()}
                disabled={isSubmitting || !hasLoadedCargo}
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
