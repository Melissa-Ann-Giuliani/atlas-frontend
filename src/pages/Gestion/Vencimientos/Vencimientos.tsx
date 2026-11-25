import { useState, useEffect, useMemo } from 'react';
import './Vencimientos.css';
import Sidebar from '../../../components/Sidebar';
import Topbar from '../../../components/Topbar';
import ExportButton from '../../../components/ExportButton';
import { FiChevronLeft, FiCheckCircle, FiCheckSquare, FiAlertTriangle, FiFilter } from 'react-icons/fi';
import { isGlobalAdmin } from '../../../utils/auth';

interface VencimientosProps {
  onLogout?: () => void;
  onNavigate?: (page: any, data?: any) => void;
  onBack?: () => void;
}

interface DocenteDTO {
  docenteId?: number;
  nombre?: string;
  apellido?: string;
  documento?: string;
  legajo?: string;
}

interface CargoDTO {
  cargoId?: number;
  codigo?: string | number;
  categoria?: string;
  dedicacion?: string;
  caracter?: string;
  origen?: string;
}

interface UnidadDTO {
  unidadId?: number;
  nombre?: string;
}

interface DesignacionVencimientoDTO {
  designacionId: number;
  numeroResolucion?: string;
  fechaInicio?: string;
  fechaFin?: string;
  diasRestantes: number;
  estadoActual: string;
  docente?: DocenteDTO;
  unidad?: UnidadDTO;
  cargos?: CargoDTO[];
}

interface UnidadSelectOption {
  unidadId: number;
  nombre: string;
}

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return 'DD/MM/YYYY';
  if (dateStr.includes('/')) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
  return dateStr;
};

export default function Vencimientos({ onLogout, onNavigate, onBack }: VencimientosProps) {
  const [items, setItems] = useState<DesignacionVencimientoDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // Filters
  const [incluirVencidas, setIncluirVencidas] = useState<boolean>(false);
  const [diasUmbral, setDiasUmbral] = useState<string>('30');
  const [selectedUnidadId, setSelectedUnidadId] = useState<string>('');
  const [unidadesList, setUnidadesList] = useState<UnidadSelectOption[]>([]);

  const userIsGlobalAdmin = useMemo(() => isGlobalAdmin(), []);

  // Fetch Unidades if Admin Global
  useEffect(() => {
    if (!userIsGlobalAdmin) return;

    const fetchUnidades = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch(`${apiUrl}/api/unidades`, { headers });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setUnidadesList(
              data.map((u: any) => ({
                unidadId: Number(u.unidadId ?? u.id),
                nombre: u.unidadNombre ?? u.nombre ?? `Unidad ${u.unidadId ?? u.id}`,
              }))
            );
          }
        }
      } catch (err) {
        console.warn('No se pudieron cargar las unidades:', err);
      }
    };

    fetchUnidades();
  }, [userIsGlobalAdmin]);

  // Fetch Vencimientos
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setErrorMessage(null);

    const fetchVencimientos = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const query = new URLSearchParams();
        if (incluirVencidas) {
          query.append('incluirVencidas', 'true');
        }
        if (diasUmbral === '0' || diasUmbral === 'sinLimite') {
          query.append('dias', '0');
        } else if (diasUmbral) {
          query.append('dias', diasUmbral);
        }
        if (userIsGlobalAdmin && selectedUnidadId) {
          query.append('unidadId', selectedUnidadId);
        }

        const qs = query.toString();
        const url = `${apiUrl}/api/designaciones/vencimientos${qs ? `?${qs}` : ''}`;

        const res = await fetch(url, { headers });

        if (res.status === 401) {
          if (onLogout) onLogout();
          return;
        }

        if (res.status === 403) {
          throw new Error('No tienes permisos para consultar los vencimientos de la unidad seleccionada (403 Forbidden).');
        }

        if (!res.ok) {
          const errBody = await res.json().catch(() => null);
          const detalle = errBody?.message || errBody?.error;
          throw new Error(
            `Error en el servidor al cargar vencimientos (${res.status})${detalle ? `: ${detalle}` : '.'}`
          );
        }

        const data = await res.json();
        if (isMounted) {
          setItems(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Error al obtener vencimientos:', err);
          setErrorMessage(err.message || 'Error al cargar el listado de vencimientos.');
          setItems([]);
          setLoading(false);
        }
      }
    };

    fetchVencimientos();

    return () => {
      isMounted = false;
    };
  }, [incluirVencidas, diasUmbral, selectedUnidadId, userIsGlobalAdmin, onLogout]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (onNavigate) {
      onNavigate('gestion');
    }
  };

  const handleRenovar = (item: DesignacionVencimientoDTO) => {
    if (onNavigate) {
      onNavigate('designacion', {
        redesignacion: true,
        designacionId: item.designacionId,
        docente: item.docente,
        cargo: item.cargos?.[0],
        unidad: item.unidad,
        fechaFinAnterior: item.fechaFin,
        nroResolucionAnterior: item.numeroResolucion,
      });
    }
  };

  const getBadgeClass = (dias: number) => {
    if (dias < 0) return 'badge-vencida';
    if (dias <= 7) return 'badge-critico';
    if (dias <= 15) return 'badge-alerta';
    return 'badge-normal';
  };

  const renderBadgeContent = (dias: number) => {
    if (dias < 0) {
      return (
        <>
          <span className="dias-label">Vencida hace:</span>
          <span className="dias-count">{Math.abs(dias)} días</span>
        </>
      );
    }
    if (dias === 0) {
      return (
        <>
          <span className="dias-label">Vence:</span>
          <span className="dias-count">Hoy</span>
        </>
      );
    }
    return (
      <>
        <span className="dias-label">Vence en:</span>
        <span className="dias-count">{dias} días</span>
      </>
    );
  };

  const totalCriticos = useMemo(() => {
    return items.filter((i) => i.diasRestantes >= 0 && i.diasRestantes <= 7).length;
  }, [items]);

  const totalVencidas = useMemo(() => {
    return items.filter((i) => i.diasRestantes < 0).length;
  }, [items]);

  const exportParams = useMemo(() => {
    const params = new URLSearchParams();
    params.append('incluirVencidas', incluirVencidas ? 'true' : 'false');
    if (incluirVencidas) {
      params.append('filtros', 'Incluir vencidas: Sí');
    }
    if (diasUmbral === '0' || diasUmbral === 'sinLimite') {
      params.append('dias', '0');
      params.append('sinLimite', 'true');
      params.append('filtros', 'Umbral: Sin límite');
    } else if (diasUmbral) {
      params.append('dias', diasUmbral);
      params.append('sinLimite', 'false');
      params.append('filtros', `Próximos ${diasUmbral} días`);
    }
    if (userIsGlobalAdmin && selectedUnidadId) {
      params.append('unidadId', selectedUnidadId);
    }
    return params;
  }, [incluirVencidas, diasUmbral, selectedUnidadId, userIsGlobalAdmin]);

  return (
    <div className="vencimientos-page-layout">
      <Topbar onLogout={onLogout} />

      <div className="vencimientos-page-body">
        <Sidebar activeItem="gestion" onNavigate={onNavigate} />

        <main className="vencimientos-page-main">
          <div className="vencimientos-page-content-area">
            {/* Top Back Navigation */}
            <div className="vencimientos-page-top-nav">
              <button
                type="button"
                className="vencimientos-page-back-btn"
                onClick={handleBack}
              >
                <FiChevronLeft className="vencimientos-page-back-icon" />
                <span>Retroceder</span>
              </button>
            </div>

            {/* Container Card */}
            <div className="vencimientos-page-container-card">
              <div className="vencimientos-page-header">
                <h1 className="vencimientos-page-title">Gestión</h1>
              </div>

              {/* Filters Toolbar */}
              <div className="vencimientos-toolbar">
                <div className="vencimientos-filters-group">
                  {userIsGlobalAdmin && (
                    <div className="vencimientos-unit-selector">
                      <FiFilter />
                      <label htmlFor="unidad-select">Unidad Académica:</label>
                      <select
                        id="unidad-select"
                        value={selectedUnidadId}
                        onChange={(e) => setSelectedUnidadId(e.target.value)}
                      >
                        <option value="">Todas las unidades</option>
                        {unidadesList.map((u) => (
                          <option key={u.unidadId} value={u.unidadId}>
                            {u.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="vencimientos-horizonte-selector">
                    <label htmlFor="horizonte-select">Plazo:</label>
                    <select
                      id="horizonte-select"
                      value={diasUmbral}
                      onChange={(e) => setDiasUmbral(e.target.value)}
                    >
                      <option value="30">Próximos 30 días</option>
                      <option value="60">Próximos 60 días</option>
                      <option value="90">Próximos 90 días</option>
                      <option value="180">Próximos 180 días</option>
                      <option value="0">Todas las activas</option>
                    </select>
                  </div>

                  <label className="vencimientos-toggle-vencidas">
                    <input
                      type="checkbox"
                      checked={incluirVencidas}
                      onChange={(e) => setIncluirVencidas(e.target.checked)}
                    />
                    <span>Incluir designaciones ya vencidas</span>
                  </label>
                </div>

                <div className="vencimientos-toolbar-right">
                  <div className="vencimientos-summary-pills">
                    {totalCriticos > 0 && (
                      <span className="vencimientos-summary-pill critico">
                        <FiAlertTriangle style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        {totalCriticos} crítica{totalCriticos > 1 ? 's' : ''} (≤ 7 días)
                      </span>
                    )}
                    {incluirVencidas && totalVencidas > 0 && (
                      <span className="vencimientos-summary-pill">
                        {totalVencidas} ya vencida{totalVencidas > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <ExportButton
                    endpoint="/api/designaciones/vencimientos/exportar"
                    params={exportParams}
                    fallbackBaseName="vencimientos_designaciones"
                    align="right"
                    onUnauthorized={onLogout}
                    onError={setExportError}
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="vencimientos-error-msg">
                  <FiAlertTriangle style={{ marginRight: 6 }} />
                  {errorMessage}
                </div>
              )}

              {exportError && (
                <div className="vencimientos-error-msg vencimientos-export-error" role="alert">
                  <span>
                    <FiAlertTriangle style={{ marginRight: 6, verticalAlign: 'middle' }} />
                    {exportError}
                  </span>
                  <button
                    type="button"
                    className="vencimientos-error-close"
                    onClick={() => setExportError(null)}
                    aria-label="Cerrar mensaje de error"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Framed Inner Card with Pink Header */}
              <div className="vencimientos-table-card">
                <div className="vencimientos-table-header">
                  <h2>Vencimientos</h2>
                  <span className="vencimientos-header-badge">
                    {loading ? 'Cargando...' : `${items.length} designaciones`}
                  </span>
                </div>

                <div className="vencimientos-table-body">
                  {loading ? (
                    <div className="vencimientos-empty">Cargando vencimientos de designaciones...</div>
                  ) : items.length === 0 ? (
                    <div className="vencimientos-empty">
                      No hay designaciones próximas a vencer en los próximos 30 días
                      {incluirVencidas ? ' ni designaciones vencidas' : ''}.
                    </div>
                  ) : (
                    items.map((item) => {
                      const docente = item.docente;
                      const nombreDocente = docente?.apellido && docente?.nombre
                        ? `${docente.apellido.toUpperCase()}, ${docente.nombre}`
                        : docente?.nombre || 'Docente sin asignar';
                      const cargo: CargoDTO = (item.cargos && item.cargos[0]) || {};

                      return (
                        <div key={item.designacionId} className="vencimiento-card-item">
                          <div className="vencimiento-info">
                            {/* Row 1: Nombre, Departamento/Unidad, Estado Activo */}
                            <div className="vencimiento-row-1">
                              <span className="vencimiento-docente-nombre">
                                {nombreDocente}
                              </span>
                              {docente?.legajo && (
                                <span className="vencimiento-docente-doc">
                                  Leg: {docente.legajo}
                                </span>
                              )}
                              <span className="vencimiento-departamento">
                                <strong>Unidad:</strong> {item.unidad?.nombre || 'Sin unidad asignada'}
                              </span>
                              <span className="vencimiento-badge-activo">
                                <FiCheckCircle className="vencimiento-badge-icon" />
                                <span>{item.estadoActual || 'Activa'}</span>
                              </span>
                            </div>

                            {/* Row 2: Origen, Categoría, Dedicación, Caracter */}
                            <div className="vencimiento-row-2">
                              <span className="vencimiento-meta-item">
                                <span className="vencimiento-meta-label">Origen:</span>
                                <span className="vencimiento-meta-val">{cargo.origen || 'De Planta'}</span>
                              </span>
                              <span className="vencimiento-meta-item">
                                <span className="vencimiento-meta-label">Categoría:</span>
                                <span className="vencimiento-meta-val">{cargo.categoria || 'JTP'}</span>
                              </span>
                              <span className="vencimiento-meta-item">
                                <span className="vencimiento-meta-label">Dedicación:</span>
                                <span className="vencimiento-meta-val">{cargo.dedicacion || 'Exclusiva'}</span>
                              </span>
                              <span className="vencimiento-meta-item">
                                <span className="vencimiento-meta-label">Caracter:</span>
                                <span className="vencimiento-meta-val">{cargo.caracter || 'Efectivo'}</span>
                              </span>
                            </div>

                            {/* Row 3: N° Resolución, Fecha Inicio, Fecha Fin */}
                            <div className="vencimiento-row-3">
                              <span className="vencimiento-meta-item">
                                <span className="vencimiento-meta-label">N° Resolución:</span>
                                <span className="vencimiento-meta-val">{item.numeroResolucion || 'S/N'}</span>
                              </span>
                              <span className="vencimiento-meta-item">
                                <span className="vencimiento-meta-label">Fecha Inicio:</span>
                                <span className="vencimiento-meta-val">{formatDate(item.fechaInicio)}</span>
                              </span>
                              <span className="vencimiento-meta-item">
                                <span className="vencimiento-meta-label">Fecha Fin:</span>
                                <span className="vencimiento-meta-val">{formatDate(item.fechaFin)}</span>
                              </span>
                            </div>
                          </div>

                          {/* Right: Badge días and Renovar button */}
                          <div className="vencimiento-actions">
                            <div className={`vencimiento-badge-dias ${getBadgeClass(item.diasRestantes)}`}>
                              {renderBadgeContent(item.diasRestantes)}
                            </div>
                            <button
                              type="button"
                              className="vencimiento-btn-renovar"
                              onClick={() => handleRenovar(item)}
                            >
                              <FiCheckSquare className="vencimiento-renovar-icon" />
                              <span>Renovar</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
