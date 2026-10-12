import { useState, useEffect, useRef } from 'react';
import './CargoDetalle.css';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import { FiChevronLeft, FiCheckCircle, FiEdit3, FiLink } from 'react-icons/fi';
import { FaPaperclip, FaFilePdf, FaImage, FaFileWord, FaFileAlt } from 'react-icons/fa';
import { HiOutlineDownload } from 'react-icons/hi';
import { BiArchiveIn } from 'react-icons/bi';
import { BsArrowUp, BsArrowReturnRight } from 'react-icons/bs';
import { MdKeyboardArrowRight } from 'react-icons/md';

interface Cargo {
  id: number;
  numero: number;
  fechaCreacion: string;
  estado: string;
  apellidoNombre: string;
  categoria: string;
  dedicacion: string;
  caracter: string;
}

interface ActividadData {
  materiaProyecto: string;
  origen: string;
  horas: number;
  estado?: string;
}

interface CargoPredecesorData {
  id?: number;
  numero: number;
  estado: string;
  categoria: string;
}

interface SubcargoData {
  id?: number;
  numero: number;
  estado: string;
  categoria: string;
}

interface CargoDetailDTO {
  numero: number;
  categoria: string;
  estado: string;
  asignadoANombre: string;
  asignadoADni: number;
  nroResolucionDesignacion: number;
  fechaCreacion: string;
  dedicacion: string;
  caracter: string;
  designacionNroResolucion: number;
  designacionFechaInicio: string;
  designacionFechaFin: string;
  actividadesVinculadas: ActividadData[];
  cargoPredecesor?: CargoPredecesorData;
  cargoOrigenDivision?: CargoPredecesorData;
  cargosSubdivididos?: SubcargoData[];
  subcargosActivos: SubcargoData[];
  documentacionAdjunta?: string[];
}

interface CargoDetalleProps {
  cargo: Cargo;
  previousCargo?: Cargo | null;
  onBack?: () => void;
  onLogout?: () => void;
  onNavigate?: (page: any, data?: any) => void;
}

export default function CargoDetalle({ cargo, previousCargo, onBack, onLogout, onNavigate }: CargoDetalleProps) {
  const [detalle, setDetalle] = useState<CargoDetailDTO | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [navigatingNumero, setNavigatingNumero] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('File selected for upload:', file.name);
    }
  };

  const handleCargoClick = async (numero: number, id?: number, extra?: any) => {
    if (!onNavigate) return;
    if (navigatingNumero !== null) return;

    setNavigatingNumero(numero);

    try {
      if (id) {
        onNavigate('cargo_detalle', { id, numero, ...extra });
        return;
      }

      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8081'}/api/cargos?search=${numero}`,
        { headers }
      );
      if (response.ok) {
        const data = await response.json();
        const found = data.content?.find((c: any) => Number(c.numero) === Number(numero));
        if (found) {
          onNavigate('cargo_detalle', { ...found, ...extra });
          return;
        }
      }
      // Fallback si no viene con búsqueda exacta
      onNavigate('cargo_detalle', { id: numero, numero, ...extra });
    } catch (err) {
      console.error('Error al navegar al cargo:', err);
      onNavigate('cargo_detalle', { id: numero, numero, ...extra });
    } finally {
      setNavigatingNumero(null);
    }
  };

  useEffect(() => {
    const fetchDetalle = async () => {
      if (!cargo?.id) {
        setError('No se proporcionó un ID válido para el cargo.');
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8081'}/api/cargos/${cargo.id}`, { headers });
        if (response.ok) {
          const data = await response.json();
          setDetalle(data);
        } else {
          setError(`No se pudieron cargar los detalles del cargo. Estado: ${response.status}`);
          if (response.status === 401 && onLogout) onLogout();
        }
      } catch (err) {
        console.error(err);
        setError('Ocurrió un error al cargar los detalles.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetalle();
  }, [cargo?.id]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No especificado';
    const parts = dateString.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const getDocIcon = (type?: string, name?: string) => {
    const lowerType = type?.toLowerCase() || '';
    const lowerName = name?.toLowerCase() || '';

    if (lowerType.includes('pdf') || lowerName.endsWith('.pdf')) {
      return { icon: <FaFilePdf />, className: 'pdf-icon' };
    } else if (lowerType.includes('word') || lowerName.endsWith('.doc') || lowerName.endsWith('.docx')) {
      return { icon: <FaFileWord />, className: 'word-icon' };
    } else if (lowerType.includes('image') || lowerName.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
      return { icon: <FaImage />, className: 'img-icon' };
    }
    return { icon: <FaFileAlt />, className: 'generic-icon' };
  };

  if (isLoading) {
    return (
      <div className="dashboard-layout">
        <Topbar onLogout={onLogout} />
        <div className="dashboard-body">
          <Sidebar activeItem="listado" onNavigate={onNavigate} />
          <main className="main-content">
            <div className="content-area cargo-detalle-area" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <h2>Cargando detalles del cargo...</h2>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const documentosAdjuntos: any[] = detalle?.documentacionAdjunta || [];
  const parentCargo = detalle?.cargoPredecesor || detalle?.cargoOrigenDivision;
  const subcargosList = (detalle?.subcargosActivos && detalle.subcargosActivos.length > 0)
    ? detalle.subcargosActivos
    : (detalle?.cargosSubdivididos || []);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (onNavigate) {
      onNavigate('listado', { tab: 'cargos' });
    } else {
      window.history.back();
    }
  };

  return (
    <div className="dashboard-layout">
      <Topbar onLogout={onLogout} />

      <div className="dashboard-body">
        <Sidebar activeItem="listado" onNavigate={onNavigate} />

        <main className="main-content">
          <div className="content-area cargo-detalle-area">

            <div className="detalle-top-nav">
              <button className="back-button" onClick={handleBack}>
                <FiChevronLeft /> {previousCargo ? `Volver a Cargo N°${previousCargo.numero}` : 'Volver a Listado'}
              </button>
            </div>

            <div className="cargo-detalle-card-container">

              {/* Header */}
              <div className="cargo-detalle-header">
                <div className="cargo-header-info">
                  <h1 className="cargo-title">Cargo N°{detalle?.numero ?? cargo.numero ?? '----'}</h1>
                  <h2 className="cargo-subtitle">
                    {detalle?.categoria || cargo.categoria || 'Sin Categoría'}
                  </h2>
                </div>
                <div className="cargo-header-actions">
                  <div className={`status-badge ${(detalle?.estado || cargo.estado)?.toLowerCase() === 'asignado' ? 'asignado-status' : 'active-status'}`}>
                    <FiCheckCircle /> {detalle?.estado || cargo.estado || 'Asignado'}
                  </div>
                  <button className="edit-btn">
                    <FiEdit3 /> Editar Cargo
                  </button>
                </div>
              </div>

              {error && (
                <div style={{ color: 'red', margin: '16px 32px 0 32px', padding: '12px', backgroundColor: '#fee', borderRadius: '8px' }}>
                  {error}
                </div>
              )}

              <div className="cargo-card-content">
                <div className="cargo-body-two-cols">

                  {/* Left Column */}
                  <div className="cargo-col-left">

                    <div className="cargo-section-block">
                      <h3 className="cargo-section-title">Datos Administrativos</h3>
                      <hr className="cargo-section-divider" />

                      <div className="cargo-info-grid-2">
                        <div className="cargo-info-group">
                          <span className="cargo-info-label">ASIGNADO A</span>
                          <span className="cargo-info-value">{detalle?.asignadoANombre || cargo.apellidoNombre || 'No asignado'}</span>
                        </div>
                        <div className="cargo-info-group">
                          <span className="cargo-info-label">DNI</span>
                          <span className="cargo-info-value">{detalle?.asignadoADni || 'No asignado'}</span>
                        </div>

                        <div className="cargo-info-group">
                          <span className="cargo-info-label">N° RESOLUCIÓN</span>
                          <span className="cargo-info-value">
                            {detalle?.nroResolucionDesignacion || detalle?.designacionNroResolucion ? `RES-${detalle.nroResolucionDesignacion || detalle.designacionNroResolucion}` : 'No especificado'}
                          </span>
                        </div>
                        <div className="cargo-info-group">
                          <span className="cargo-info-label">FECHA DE CREACIÓN</span>
                          <span className="cargo-info-value">{formatDate(detalle?.fechaCreacion || cargo.fechaCreacion)}</span>
                        </div>

                        <div className="cargo-info-group">
                          <span className="cargo-info-label">DEDICACIÓN</span>
                          <span className="cargo-info-value">{detalle?.dedicacion || cargo.dedicacion || 'No especificado'}</span>
                        </div>
                        <div className="cargo-info-group">
                          <span className="cargo-info-label">CARÁCTER</span>
                          <span className="cargo-info-value">{detalle?.caracter || cargo.caracter || 'No especificado'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="cargo-section-block">
                      <h3 className="cargo-section-title">Actividades Vinculadas</h3>
                      <hr className="cargo-section-divider" />

                      <div className="cargo-actividades-table-container">
                        <table className="cargo-actividades-table">
                          <thead>
                            <tr>
                              <th>Materia / Proyecto</th>
                              <th>Origen</th>
                              <th>Horas</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detalle?.actividadesVinculadas && detalle.actividadesVinculadas.length > 0 ? (
                              detalle.actividadesVinculadas.map((act, idx) => (
                                <tr key={idx}>
                                  <td>{act.materiaProyecto}</td>
                                  <td>{act.origen || 'No especificado'}</td>
                                  <td>{act.horas} hs</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={3} style={{ textAlign: 'center', padding: '16px', color: '#666' }}>
                                  No hay actividades vinculadas registradas
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>

                  {/* Right Column */}
                  <div className="cargo-col-right">

                    <div className="designacion-card">
                      <div className="designacion-card-title">
                        <FiLink /> Designación Vinculada
                      </div>

                      <div className="designacion-info-box">
                        <div className="cargo-info-group">
                          <span className="cargo-info-label">N° RESOLUCIÓN</span>
                          <span className="cargo-info-value">
                            {detalle?.designacionNroResolucion || detalle?.nroResolucionDesignacion ? `RES-${detalle.designacionNroResolucion || detalle.nroResolucionDesignacion}` : 'Sin designación'}
                          </span>
                        </div>
                        <div className="cargo-info-group">
                          <span className="cargo-info-label">PERÍODO</span>
                          <span className="cargo-info-value">
                            {detalle?.designacionFechaInicio
                              ? `${formatDate(detalle.designacionFechaInicio)} - ${detalle.designacionFechaFin ? formatDate(detalle.designacionFechaFin) : 'Actualidad'}`
                              : 'Sin designación activa'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="cargo-tree-section">
                      <div className="tree-title">Cargo Predecesor / Origen</div>
                      {parentCargo ? (
                        <div
                          className={`tree-card ${navigatingNumero === parentCargo.numero ? 'loading' : ''}`}
                          onClick={() => handleCargoClick(parentCargo.numero, parentCargo.id, { estado: parentCargo.estado, categoria: parentCargo.categoria })}
                          title={`Ver detalle del Cargo N°${parentCargo.numero}`}
                        >
                          <div className="tree-card-left">
                            <BsArrowUp className="tree-card-icon" />
                            <div className="tree-card-content">
                              <h5>Cargo N°{parentCargo.numero} {parentCargo.categoria ? `(${parentCargo.categoria})` : ''}</h5>
                              <p>Estado: {parentCargo.estado}</p>
                            </div>
                          </div>
                          <MdKeyboardArrowRight className="subcargo-arrow" />
                        </div>
                      ) : (
                        <div style={{ padding: '12px 16px', background: '#f5f3ee', borderRadius: '8px', border: '1px dashed #ccc', color: '#777', fontSize: '13px' }}>
                          Sin cargo predecesor ni origen de división
                        </div>
                      )}

                      <div className="tree-node-container">
                        <div className="tree-line-top"></div>
                        <div className="tree-node">{detalle?.numero ?? cargo.numero ?? '----'}</div>
                        <div className="tree-line-bottom"></div>
                      </div>

                      <div className="tree-title">Subcargos Activos</div>
                      <div className="subcargos-list">
                        {subcargosList && subcargosList.length > 0 ? (
                          subcargosList.map((sub, idx) => (
                            <div
                              className={`subcargo-card ${navigatingNumero === sub.numero ? 'loading' : ''}`}
                              key={idx}
                              onClick={() => handleCargoClick(sub.numero, sub.id, { estado: sub.estado, categoria: sub.categoria })}
                              title={`Ver detalle del Cargo N°${sub.numero}`}
                            >
                              <div className="subcargo-card-left">
                                <BsArrowReturnRight className="subcargo-icon" />
                                <span>Cargo N°{sub.numero} {sub.categoria ? `(${sub.categoria})` : ''} • {sub.estado}</span>
                              </div>
                              <MdKeyboardArrowRight className="subcargo-arrow" />
                            </div>
                          ))
                        ) : (
                          <div style={{ padding: '12px 16px', background: '#f5f3ee', borderRadius: '8px', border: '1px dashed #ccc', color: '#777', fontSize: '13px' }}>
                            No posee subcargos derivados
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                </div>

                {/* Documentación Adjunta */}
                <div className="doc-section-container">
                  <div className="doc-section-header">
                    <h3 className="doc-section-title">Documentación Adjunta</h3>
                    <input type="file" style={{ display: 'none' }} ref={fileInputRef} onChange={handleFileChange} />
                    <button className="doc-add-btn" onClick={() => fileInputRef.current?.click()}>
                      <FaPaperclip /> Agregar Documento
                    </button>
                  </div>

                  <div className="doc-section-body">
                    {documentosAdjuntos.length > 0 ? (
                      documentosAdjuntos.map((doc, index) => {
                        const { icon, className } = getDocIcon(doc.type, doc.name);
                        return (
                          <div className="doc-card" key={index}>
                            <div className="doc-card-top">
                              <div className={`doc-icon ${className || ''}`}>
                                {icon}
                              </div>
                              <HiOutlineDownload style={{ color: '#666', fontSize: '20px', cursor: 'pointer' }} />
                            </div>
                            <div className="doc-card-bottom">
                              <h5>{doc.name}</h5>
                              <p>{doc.size} • {doc.date}</p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ padding: '24px', width: '100%', textAlign: 'center', color: '#666', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <BiArchiveIn style={{ fontSize: '32px', color: '#aaa' }} />
                        <p style={{ margin: 0, fontSize: '14px' }}>No hay documentación adjunta de momento.</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
