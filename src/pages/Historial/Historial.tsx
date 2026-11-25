import { useState, useEffect, useMemo } from 'react';
import './Historial.css';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import FilterBar, { type FilterCategory, type FilterOption } from '../../components/FilterBar';
import ExportButton from '../../components/ExportButton';
import { FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import { getUserRole, isGlobalAdmin } from '../../utils/auth';

interface UsuarioResumen {
  id: number;
  username: string;
  nombre?: string;
  apellido?: string;
}

interface CambioRecord {
  id: number;
  fechaHora: string;
  usuarioResponsable?: UsuarioResumen | null;
  categoria?: string | null;
  campoAfectado?: string | null;
  valorAnterior?: string | null;
  valorNuevo?: string | null;
  tipoOperacion?: 'ALTA' | 'MODIFICACION' | 'BAJA' | string | null;
  usuarioAfectadoId?: number | null;
  usuarioAfectadoNombreCompleto?: string | null;
  unidadId?: number | null;
}

type HistorialTab = 'usuarios' | 'cambios' | 'tramites';

type SortColumn =
  | 'fechaHora'
  | 'responsable'
  | 'usuarioAfectado'
  | 'categoria'
  | 'campoAfectado'
  | 'valorAnterior'
  | 'valorNuevo'
  | 'tipoOperacion';

type SortDirection = 'asc' | 'desc';

interface SortConfig {
  column: SortColumn;
  direction: SortDirection;
}

interface HistorialProps {
  onLogout?: () => void;
  onNavigate?: (page: any, data?: any) => void;
}

const calculateRowsPerPage = (height: number): number => {
  if (height < 700) {
    return 6;
  } else if (height < 900) {
    return 8;
  } else {
    return 12;
  }
};

const CATEGORIAS_OPTIONS: FilterOption[] = [
  { id: 'Docente', label: 'Docente' },
  { id: 'Designación', label: 'Designación' },
  { id: 'Cargo', label: 'Cargo' },
  { id: 'Función', label: 'Función' },
  { id: 'Licencia', label: 'Licencia' },
  { id: 'Renuncia', label: 'Renuncia' },
  { id: 'Subrogancia', label: 'Subrogancia' },
  { id: 'Unidad', label: 'Unidad' },
  { id: 'Materia', label: 'Materia' },
  { id: 'Cátedra', label: 'Cátedra' },
  { id: 'Usuario', label: 'Usuario' }
];

const OPERACION_OPTIONS: FilterOption[] = [
  { id: 'ALTA', label: 'Alta' },
  { id: 'MODIFICACION', label: 'Modificación' },
  { id: 'BAJA', label: 'Baja' }
];

export default function Historial({ onLogout, onNavigate }: HistorialProps) {
  const [activeTab, setActiveTab] = useState<HistorialTab>('cambios');
  const [appliedFilters, setAppliedFilters] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [responsablesOptions, setResponsablesOptions] = useState<FilterOption[]>([]);
  const [unidadesOptions, setUnidadesOptions] = useState<FilterOption[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const canFilterByUnidad = useMemo(() => {
    if (isGlobalAdmin()) return true;
    const role = getUserRole()?.toUpperCase().trim() || '';
    return role === 'AUDITOR' || role === 'ROLE_AUDITOR';
  }, []);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [cambiosData, setCambiosData] = useState<CambioRecord[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const [rowsPerPage, setRowsPerPage] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return calculateRowsPerPage(window.innerHeight);
    }
    return 12;
  });

  useEffect(() => {
    const handleResize = () => {
      setRowsPerPage(calculateRowsPerPage(window.innerHeight));
      setCurrentPage(1);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchResponsables = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8081'}/api/usuarios?page=0&size=100`,
          { headers }
        );
        if (response.status === 401) {
          if (onLogout) onLogout();
          return;
        }
        if (response.ok) {
          const data = await response.json();
          const list = Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : [];
          setResponsablesOptions(
            list.map((u: any) => {
              const id = (u.id ?? u.usuarioId)?.toString() || '';
              const fullName =
                u.apellido && u.nombre
                  ? `${u.apellido}, ${u.nombre}`
                  : u.nombre || u.apellido || u.username || `Usuario #${id}`;
              return { id, label: fullName };
            })
          );
        }
      } catch (err) {
        console.error('Error fetching usuarios for filter:', err);
      }
    };

    fetchResponsables();
  }, [onLogout]);

  useEffect(() => {
    if (!canFilterByUnidad) {
      return;
    }

    const fetchUnidades = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8081'}/api/unidades`,
          { headers }
        );
        if (response.status === 401) {
          if (onLogout) onLogout();
          return;
        }
        if (response.ok) {
          const data = await response.json();
          const list = Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : [];
          setUnidadesOptions(
            list.map((u: any) => {
              const id = (u.id ?? u.unidadId)?.toString() || '';
              const label = u.nombre || u.descripcion || `Unidad #${id}`;
              return { id, label };
            })
          );
        }
      } catch (err) {
        console.error('Error fetching unidades for filter:', err);
      }
    };

    fetchUnidades();
  }, [canFilterByUnidad, onLogout]);

  const availableFilters: FilterCategory[] = useMemo(() => {
    if (activeTab !== 'cambios') {
      return [];
    }
    const filters: FilterCategory[] = [
      {
        id: 'tipoOperacion',
        name: 'Operación',
        options: OPERACION_OPTIONS
      },
      {
        id: 'categoria',
        name: 'Categoría',
        options: CATEGORIAS_OPTIONS
      }
    ];
    if (responsablesOptions.length > 0) {
      filters.push({
        id: 'usuarioId',
        name: 'Responsable',
        options: responsablesOptions
      });
    }
    if (canFilterByUnidad && unidadesOptions.length > 0) {
      filters.push({
        id: 'unidadId',
        name: 'Unidad',
        options: unidadesOptions
      });
    }
    return filters;
  }, [activeTab, responsablesOptions, canFilterByUnidad, unidadesOptions]);

  const handleAddFilter = (newFilter: string) => {
    const [categoryName] = newFilter.split(': ');
    // Replace any existing filter of the same category since backend expects single values per filter param
    setAppliedFilters((prev) => {
      const withoutSameCategory = prev.filter((f) => !f.startsWith(`${categoryName}: `));
      return [...withoutSameCategory, newFilter];
    });
    setCurrentPage(1);
  };

  const handleRemoveFilter = (filterToRemove: string) => {
    setAppliedFilters((prev) => prev.filter((f) => f !== filterToRemove));
    setCurrentPage(1);
  };

  const handleTabChange = (tab: HistorialTab) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setExportError(null);
  };

  useEffect(() => {
    if (activeTab !== 'cambios') {
      setErrorMessage(null);
      return;
    }

    if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
      setErrorMessage('La fecha "Desde" no puede ser posterior a la fecha "Hasta".');
      setCambiosData([]);
      setTotalElements(0);
      setTotalPages(1);
      return;
    }

    const controller = new AbortController();

    const fetchCambios = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const params = new URLSearchParams({
          page: (currentPage - 1).toString(),
          size: rowsPerPage.toString()
        });

        if (debouncedSearchTerm.trim()) {
          params.append('usuarioAfectado', debouncedSearchTerm.trim());
        }
        if (fechaDesde) {
          params.append('fechaDesde', fechaDesde);
        }
        if (fechaHasta) {
          params.append('fechaHasta', fechaHasta);
        }

        appliedFilters.forEach((filter) => {
          const separatorIdx = filter.indexOf(': ');
          if (separatorIdx === -1) return;
          const categoryName = filter.slice(0, separatorIdx);
          const optionLabel = filter.slice(separatorIdx + 2);
          const category = availableFilters.find((c) => c.name === categoryName);
          if (!category) return;
          const option = category.options.find((o) => o.label === optionLabel);
          if (!option) return;
          params.append(category.id, option.id);
        });

        const token = localStorage.getItem('token');
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8081'}/api/cambios?${params.toString()}`,
          { headers, signal: controller.signal }
        );

        if (response.ok) {
          const data = await response.json();
          setCambiosData(data.content || []);
          setTotalElements(data.totalElements || 0);
          setTotalPages(Math.max(1, data.totalPages || 1));
        } else if (response.status === 401) {
          if (onLogout) onLogout();
        } else if (response.status === 403) {
          setErrorMessage('No tiene permisos para consultar el historial de cambios.');
          setCambiosData([]);
          setTotalElements(0);
          setTotalPages(1);
        } else if (response.status === 400) {
          setErrorMessage('Los filtros ingresados no son válidos. Verifique el rango de fechas.');
          setCambiosData([]);
          setTotalElements(0);
          setTotalPages(1);
        } else {
          setErrorMessage('Ocurrió un error al cargar el historial de cambios.');
          setCambiosData([]);
          setTotalElements(0);
          setTotalPages(1);
        }
      } catch (error: any) {
        if (error?.name === 'AbortError') return;
        console.error('Error fetching cambios:', error);
        setErrorMessage('No se pudo conectar con el servidor para obtener el historial de cambios.');
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchCambios();
    return () => controller.abort();
  }, [activeTab, currentPage, rowsPerPage, debouncedSearchTerm, fechaDesde, fechaHasta, appliedFilters, availableFilters, onLogout]);

  const exportConfig = useMemo(() => {
    const params = new URLSearchParams();
    const trimmedSearch = searchTerm.trim();

    if (activeTab === 'usuarios') {
      if (trimmedSearch) {
        params.append('search', trimmedSearch);
        params.append('filtros', `Búsqueda: ${trimmedSearch}`);
      }
      return {
        endpoint: '/api/usuarios/exportar',
        fallbackBaseName: 'listado_usuarios',
        params,
        disabled: false,
      };
    }

    if (activeTab === 'tramites') {
      return {
        endpoint: '/api/designaciones/vencimientos/exportar',
        fallbackBaseName: 'vencimientos_designaciones',
        params,
        disabled: false,
      };
    }

    if (trimmedSearch) {
      params.append('usuarioAfectado', trimmedSearch);
      params.append('filtros', `Búsqueda: ${trimmedSearch}`);
    }
    if (fechaDesde) {
      params.append('fechaDesde', fechaDesde);
      params.append('filtros', `Desde: ${fechaDesde}`);
    }
    if (fechaHasta) {
      params.append('fechaHasta', fechaHasta);
      params.append('filtros', `Hasta: ${fechaHasta}`);
    }

    appliedFilters.forEach((filter) => {
      const separatorIdx = filter.indexOf(': ');
      if (separatorIdx === -1) return;
      const categoryName = filter.slice(0, separatorIdx);
      const optionLabel = filter.slice(separatorIdx + 2);
      const category = availableFilters.find((c) => c.name === categoryName);
      if (!category) return;
      const option = category.options.find((o) => o.label === optionLabel);
      if (!option) return;
      params.append(category.id, option.id);
      params.append('filtros', filter);
    });

    const hasInvalidDateRange = Boolean(fechaDesde && fechaHasta && fechaDesde > fechaHasta);

    return {
      endpoint: '/api/cambios/exportar',
      fallbackBaseName: 'historial_cambios',
      params,
      disabled: hasInvalidDateRange,
    };
  }, [activeTab, searchTerm, fechaDesde, fechaHasta, appliedFilters, availableFilters]);

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalElements);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const renderPageButtons = () => {
    const buttons = [];
    const maxVisibleButtons = 3;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisibleButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxVisibleButtons - 1);

    if (endPage - startPage + 1 < maxVisibleButtons) {
      startPage = Math.max(1, endPage - maxVisibleButtons + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          className={`historial-page-btn ${currentPage === i ? 'active' : ''}`}
          onClick={() => goToPage(i)}
        >
          {i}
        </button>
      );
    }
    return buttons;
  };

  const formatDateTime = (dateTimeStr?: string) => {
    if (!dateTimeStr) return '-';
    const date = new Date(dateTimeStr);
    if (Number.isNaN(date.getTime())) return dateTimeStr;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const formatResponsable = (responsable?: UsuarioResumen | null) => {
    if (!responsable) return '-';
    const apellido = responsable.apellido?.trim() || '';
    const nombre = responsable.nombre?.trim() || '';
    if (apellido && nombre) return `${apellido}, ${nombre}`;
    if (apellido) return apellido;
    if (nombre) return nombre;
    return responsable.username || '-';
  };

  const formatOperacion = (op?: string | null) => {
    if (!op) return { label: '-', className: '' };
    const upper = op.toUpperCase();
    if (upper === 'ALTA') return { label: 'Alta', className: 'op-alta' };
    if (upper === 'MODIFICACION') return { label: 'Modificación', className: 'op-modificacion' };
    if (upper === 'BAJA') return { label: 'Baja', className: 'op-baja' };
    return { label: op, className: '' };
  };

  const handleSort = (column: SortColumn) => {
    setSortConfig((prev) => {
      if (!prev || prev.column !== column) {
        return { column, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { column, direction: 'desc' };
      }
      return null;
    });
  };

  const sortedCambiosData = useMemo(() => {
    if (!sortConfig) return cambiosData;

    const { column, direction } = sortConfig;
    const multiplier = direction === 'asc' ? 1 : -1;

    return [...cambiosData].sort((a, b) => {
      if (column === 'fechaHora') {
        const timeA = a.fechaHora ? new Date(a.fechaHora).getTime() : NaN;
        const timeB = b.fechaHora ? new Date(b.fechaHora).getTime() : NaN;
        const validA = !Number.isNaN(timeA);
        const validB = !Number.isNaN(timeB);
        if (validA && validB) return (timeA - timeB) * multiplier;
        if (validA) return -1 * multiplier;
        if (validB) return 1 * multiplier;
        return 0;
      }

      const getTextValue = (record: CambioRecord): string => {
        switch (column) {
          case 'responsable':
            return formatResponsable(record.usuarioResponsable);
          case 'usuarioAfectado':
            return record.usuarioAfectadoNombreCompleto || '';
          case 'categoria':
            return record.categoria || '';
          case 'campoAfectado':
            return record.campoAfectado || '';
          case 'valorAnterior':
            return record.valorAnterior ?? '';
          case 'valorNuevo':
            return record.valorNuevo ?? '';
          case 'tipoOperacion':
            return formatOperacion(record.tipoOperacion).label;
        }
      };

      const valA = getTextValue(a);
      const valB = getTextValue(b);
      return valA.localeCompare(valB, 'es', { numeric: true, sensitivity: 'base' }) * multiplier;
    });
  }, [cambiosData, sortConfig]);

  const getAriaSort = (column: SortColumn): 'ascending' | 'descending' | 'none' => {
    if (!sortConfig || sortConfig.column !== column) return 'none';
    return sortConfig.direction === 'asc' ? 'ascending' : 'descending';
  };

  const renderSortHeader = (column: SortColumn, label: string) => {
    const isActive = sortConfig?.column === column;
    return (
      <th aria-sort={getAriaSort(column)} className="historial-sortable-th">
        <button
          type="button"
          className={`historial-sort-btn ${isActive ? 'active' : ''}`}
          onClick={() => handleSort(column)}
        >
          <span>{label}</span>
          <span className="historial-sort-icons" aria-hidden="true">
            <FiChevronUp
              className={`historial-sort-icon ${isActive && sortConfig.direction === 'asc' ? 'active' : ''}`}
            />
            <FiChevronDown
              className={`historial-sort-icon ${isActive && sortConfig.direction === 'desc' ? 'active' : ''}`}
            />
          </span>
        </button>
      </th>
    );
  };

  const getTitle = () => {
    if (activeTab === 'usuarios') return 'Historial de Usuarios';
    if (activeTab === 'tramites') return 'Historial de Trámites';
    return 'Historial de Cambios';
  };

  return (
    <div className="dashboard-layout">
      <Topbar onLogout={onLogout} />

      <div className="dashboard-body">
        <Sidebar activeItem="historial" onNavigate={onNavigate} />

        <main className="main-content">
          <div className="content-area historial-content-area">
            <div className="historial-inner-container">
              <div className="historial-header-row">
                <div className="historial-header-left">
                  <h1 className="historial-title">{getTitle()}</h1>
                  <div className="historial-tabs-row">
                    <div className="historial-tabs">
                      <button
                        className={`historial-tab-btn ${activeTab === 'usuarios' ? 'active' : ''}`}
                        onClick={() => handleTabChange('usuarios')}
                      >
                        Usuarios
                      </button>
                      <button
                        className={`historial-tab-btn ${activeTab === 'cambios' ? 'active' : ''}`}
                        onClick={() => handleTabChange('cambios')}
                      >
                        Cambios
                      </button>
                      <button
                        className={`historial-tab-btn ${activeTab === 'tramites' ? 'active' : ''}`}
                        onClick={() => handleTabChange('tramites')}
                      >
                        Trámites
                      </button>
                    </div>
                    <ExportButton
                      endpoint={exportConfig.endpoint}
                      params={exportConfig.params}
                      fallbackBaseName={exportConfig.fallbackBaseName}
                      disabled={exportConfig.disabled}
                      onUnauthorized={onLogout}
                      onError={setExportError}
                    />
                  </div>
                </div>

                <div className="historial-filter-wrapper">
                  <FilterBar
                    availableFilters={availableFilters}
                    appliedFilters={activeTab === 'cambios' ? appliedFilters : []}
                    onAddFilter={handleAddFilter}
                    onRemoveFilter={handleRemoveFilter}
                    onSearch={(term) => {
                      setSearchTerm(term);
                      setCurrentPage(1);
                    }}
                  />
                  <div className="historial-date-filters">
                    <label className="historial-date-field">
                      <span>Desde:</span>
                      <input
                        type="date"
                        className="historial-date-input"
                        value={fechaDesde}
                        onChange={(e) => {
                          setFechaDesde(e.target.value);
                          setCurrentPage(1);
                        }}
                      />
                    </label>
                    <label className="historial-date-field">
                      <span>Hasta:</span>
                      <input
                        type="date"
                        className="historial-date-input"
                        value={fechaHasta}
                        onChange={(e) => {
                          setFechaHasta(e.target.value);
                          setCurrentPage(1);
                        }}
                      />
                    </label>
                    {(fechaDesde || fechaHasta) && (
                      <button
                        type="button"
                        className="historial-clear-dates-btn"
                        onClick={() => {
                          setFechaDesde('');
                          setFechaHasta('');
                          setCurrentPage(1);
                        }}
                      >
                        Limpiar fechas
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {activeTab === 'cambios' && errorMessage && (
                <div className="historial-error-banner" role="alert">
                  {errorMessage}
                </div>
              )}

              {exportError && (
                <div className="historial-error-banner historial-export-error" role="alert">
                  <span>{exportError}</span>
                  <button
                    type="button"
                    className="historial-error-close"
                    onClick={() => setExportError(null)}
                    aria-label="Cerrar mensaje de error"
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="historial-table-container">
                {activeTab === 'cambios' ? (
                  <table className="historial-table">
                    <thead>
                      <tr>
                        {renderSortHeader('fechaHora', 'Fecha y Hora')}
                        {renderSortHeader('responsable', 'Responsable')}
                        {renderSortHeader('usuarioAfectado', 'Usuario Afectado')}
                        {renderSortHeader('categoria', 'Categoría')}
                        {renderSortHeader('campoAfectado', 'Campo')}
                        {renderSortHeader('valorAnterior', 'Valor Anterior')}
                        {renderSortHeader('valorNuevo', 'Valor Nuevo')}
                        {renderSortHeader('tipoOperacion', 'Operación')}
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', padding: '24px' }}>
                            Cargando historial de cambios...
                          </td>
                        </tr>
                      ) : sortedCambiosData.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', padding: '24px' }}>
                            No se encontraron cambios
                          </td>
                        </tr>
                      ) : (
                        sortedCambiosData.map((cambio) => {
                          const opInfo = formatOperacion(cambio.tipoOperacion);
                          return (
                            <tr key={cambio.id}>
                              <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(cambio.fechaHora)}</td>
                              <td>{formatResponsable(cambio.usuarioResponsable)}</td>
                              <td>{cambio.usuarioAfectadoNombreCompleto || '-'}</td>
                              <td>{cambio.categoria || '-'}</td>
                              <td>{cambio.campoAfectado || '-'}</td>
                              <td className="historial-valor-cell" title={cambio.valorAnterior || ''}>
                                {cambio.valorAnterior ?? '-'}
                              </td>
                              <td className="historial-valor-cell" title={cambio.valorNuevo || ''}>
                                {cambio.valorNuevo ?? '-'}
                              </td>
                              <td>
                                <span className={`historial-op-badge ${opInfo.className}`}>
                                  {opInfo.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                ) : activeTab === 'usuarios' ? (
                  <table className="historial-table">
                    <thead>
                      <tr>
                        <th>Usuario</th>
                        <th>Rol</th>
                        <th>Unidad</th>
                        <th>Tipo de Unidad</th>
                        <th>Último Acceso</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>
                          Próximamente: Historial de Usuarios
                        </td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <table className="historial-table">
                    <thead>
                      <tr>
                        <th>N° Trámite</th>
                        <th>Tipo</th>
                        <th>Fecha</th>
                        <th>Responsable</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '24px' }}>
                          Próximamente: Historial de Trámites
                        </td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {activeTab === 'cambios' && (
              <div className="historial-pagination">
                <span className="historial-pagination-info">
                  {totalElements > 0
                    ? `${startIndex + 1}-${endIndex} cambios de ${totalElements}`
                    : '0 cambios'}
                </span>
                <div className="historial-pagination-controls">
                  <button
                    className="historial-page-btn"
                    onClick={() => goToPage(1)}
                    disabled={currentPage === 1}
                  >
                    <FiChevronsLeft />
                  </button>
                  <button
                    className="historial-page-btn"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <FiChevronLeft />
                  </button>

                  {renderPageButtons()}

                  {totalPages > 3 && currentPage < totalPages - 1 && (
                    <button className="historial-page-btn dots" disabled>
                      ...
                    </button>
                  )}

                  <button
                    className="historial-page-btn"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <FiChevronRight />
                  </button>
                  <button
                    className="historial-page-btn"
                    onClick={() => goToPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    <FiChevronsRight />
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
