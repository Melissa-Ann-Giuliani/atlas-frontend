import { useState, useEffect } from 'react';
import './DocenteDetalle.css';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { FiChevronLeft } from 'react-icons/fi';
import { FiCheckCircle } from 'react-icons/fi';
import { FiEdit3 } from 'react-icons/fi';
import { FaFilePdf, FaImage, FaHistory, FaCalendarAlt, FaPaperclip } from 'react-icons/fa';
import { HiOutlineDownload } from 'react-icons/hi';
import { BiArchiveIn } from 'react-icons/bi';

interface Docente {
  usuarioId?: number;
  nombre: string;
  apellido?: string;
  origen: string;
  unidad: string;
  categoria: string;
  dedicacion: string;
  caracter: string;
  estado: string;
  tipoUnidadNombre?: string;
}

interface DocenteDetailsDTO {
  datosPersonales: {
    dni: number;
    emailInstitucional: string;
    telefonos: string[];
    nombre: string;
    apellido: string;
    estado: string;
    unidadNombre: string;
    tipoUnidadNombre: string;
  };
  designacionesYCargos: {
    cargoId: number;
    legajo: number;
    nroResolucion: number;
    fechaInicio: string;
    fechaFin: string;
    nroCargo: number;
    categoria: string;
    dedicacion: string;
    caracter: string;
    origen: string;
    estado: string;
  }[];
  actividadesActuales: {
    funcionId: number;
    funcionNombre: string;
    funcionHoras: number;
    cargoId: number;
    materiaId: number;
    materiaNombre: string;
  }[];
  licenciasActuales: {
    nroResolucion: string;
    fechaInicio: string;
    fechaFin: string;
    motivo: string;
    cantidadDias: number;
  }[];
}

interface DocenteDetalleProps {
  docente: Docente;
  onLogout?: () => void;
  onNavigate?: (page: any, data?: any) => void;
}

export default function DocenteDetalle({ docente, onLogout, onNavigate }: DocenteDetalleProps) {
  const [detalle, setDetalle] = useState<DocenteDetailsDTO | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetalle = async () => {
      if (!docente.usuarioId) {
        setError('No se proporcionó un ID válido para el docente (usuarioId).');
        setIsLoading(false);
        return;
      }
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8081'}/api/docentes/${docente.usuarioId}`, { headers });
        if (response.ok) {
          const data = await response.json();
          setDetalle(data);
        } else {
          setError(`No se pudieron cargar los detalles del docente. Estado: ${response.status}`);
        }
      } catch (err) {
        console.error(err);
        setError('Ocurrió un error al cargar los detalles.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetalle();
  }, [docente.usuarioId]);

  if (isLoading) {
    return (
      <div className="dashboard-layout">
        <Topbar onLogout={onLogout} />
        <div className="dashboard-body">
          <Sidebar activeItem="listado" onNavigate={onNavigate} />
          <main className="main-content">
            <div className="content-area docente-detalle-area" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <h2>Cargando detalles...</h2>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No especificado';
    const parts = dateString.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return new Date(dateString).toLocaleDateString();
  };

  const datosPersonales = detalle?.datosPersonales;
  const designacion = detalle?.designacionesYCargos?.[0]; // Mostrar el primer cargo/designación
  const actividades = detalle?.actividadesActuales || [];
  const licencias = detalle?.licenciasActuales || [];

  return (
    <div className="dashboard-layout">
      <Topbar onLogout={onLogout} />

      <div className="dashboard-body">
        <Sidebar activeItem="listado" onNavigate={onNavigate} />

        <main className="main-content">
          <div className="content-area docente-detalle-area">

            <div className="detalle-top-nav">
              <button className="back-button" onClick={() => onNavigate && onNavigate('listado')}>
                <FiChevronLeft /> Volver a Listado
              </button>
            </div>

            <div className="detalle-card-container">
              {/* Header */}
              <div className="detalle-header">
                <div className="detalle-header-info">
                  <h1 className="docente-name">
                    {datosPersonales ? `${datosPersonales.apellido}, ${datosPersonales.nombre}` : (docente.apellido ? `${docente.apellido}, ${docente.nombre}` : docente.nombre)}
                  </h1>
                  <p className="docente-department">
                    {datosPersonales?.tipoUnidadNombre || docente.tipoUnidadNombre || 'Departamento'} de {datosPersonales?.unidadNombre || docente.unidad || 'Artes Visuales'}
                  </p>
                </div>
                <div className="detalle-header-actions">
                  <div className="status-badge active-status">
                    <FiCheckCircle /> {datosPersonales?.estado || docente.estado || 'Activo'}
                  </div>
                  <button className="edit-btn">
                    <FiEdit3 /> Editar Docente
                  </button>
                </div>
              </div>

              {error && <div style={{ color: 'red', marginBottom: '20px', padding: '10px', backgroundColor: '#fee' }}>{error}</div>}

              <div className="detalle-body-two-cols">
                {/* Left Column */}
                <div className="detalle-col-left">

                  <div className="section-block">
                    <h2 className="section-title">Datos Personales</h2>
                    <hr className="section-divider" />

                    <div className="info-group">
                      <span className="info-label">DNI</span>
                      <span className="info-value">{datosPersonales?.dni || 'No especificado'}</span>
                    </div>

                    <div className="info-group">
                      <span className="info-label">EMAIL INSTITUCIONAL</span>
                      <span className="info-value">{datosPersonales?.emailInstitucional || 'No especificado'}</span>
                    </div>

                    <div className="info-group">
                      <span className="info-label">TELÉFONO</span>
                      <span className="info-value">
                        {datosPersonales?.telefonos && datosPersonales.telefonos.length > 0
                          ? datosPersonales.telefonos.join(', ')
                          : 'No especificado'}
                      </span>
                    </div>
                  </div>

                  <div className="section-block">
                    <h2 className="section-title">Designación y Cargo</h2>
                    <hr className="section-divider" />

                    <div className="info-grid-2">
                      <div className="info-group">
                        <span className="info-label">N° LEGAJO</span>
                        <span className="info-value">{designacion?.legajo || 'No especificado'}</span>
                      </div>
                      <div className="info-group">
                        <span className="info-label">N° RESOLUCIÓN</span>
                        <span className="info-value">{designacion?.nroResolucion || 'No especificado'}</span>
                      </div>

                      <div className="info-group">
                        <span className="info-label">FECHA DE INICIO</span>
                        <span className="info-value">{formatDate(designacion?.fechaInicio)}</span>
                      </div>
                      <div className="info-group">
                        <span className="info-label">FECHA DE FINALIZACIÓN</span>
                        <span className="info-value">{formatDate(designacion?.fechaFin)}</span>
                      </div>

                      <div className="info-group">
                        <span className="info-label">N° CARGO</span>
                        <span className="info-value">{designacion?.nroCargo || 'No especificado'}</span>
                      </div>
                      <div className="info-group">
                        <span className="info-label">CATEGORÍA</span>
                        <span className="info-value">{designacion?.categoria || docente.categoria || 'No especificado'}</span>
                      </div>

                      <div className="info-group">
                        <span className="info-label">DEDICACIÓN</span>
                        <span className="info-value">{designacion?.dedicacion || docente.dedicacion || 'No especificado'}</span>
                      </div>
                      <div className="info-group">
                        <span className="info-label">CARÁCTER</span>
                        <span className="info-value">{designacion?.caracter || docente.caracter || 'No especificado'}</span>
                      </div>
                      <div className="info-group">
                        <span className="info-label">ORIGEN</span>
                        <span className="info-value">{designacion?.origen || docente.origen || 'No especificado'}</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Right Column (Scrollable) */}
                <div className="detalle-col-right-scrollable">

                  {/* Actividades Actuales */}
                  <div className="section-block right-section">
                    <h2 className="section-title">Actividades Actuales</h2>
                    <hr className="section-divider" />

                    <div className="actividades-table-container">
                      <table className="actividades-table">
                        <thead>
                          <tr>
                            <th>Materia / Proyecto</th>
                            <th>Función</th>
                            <th>Origen</th>
                            <th>Horas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {actividades.length > 0 ? (
                            actividades.map((act, index) => {
                              const actCargo = detalle?.designacionesYCargos?.find(c => c.cargoId === act.cargoId || c.nroCargo === act.cargoId || c.legajo === act.cargoId);
                              const origen = actCargo?.origen || designacion?.origen || 'No especificado';

                              return (
                                <tr key={index}>
                                  <td>{act.materiaNombre}</td>
                                  <td>{act.funcionNombre}</td>
                                  <td>{origen}</td>
                                  <td>{act.funcionHoras}</td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={4} style={{ textAlign: 'center', padding: '16px' }}>No hay actividades registradas</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Licencias Actuales */}
                  <div className="section-block right-section">
                    <div className="section-title-row">
                      <h2 className="section-title">Licencias Actuales</h2>
                      <FaHistory className="history-icon" />
                    </div>
                    <hr className="section-divider" />

                    {licencias.length > 0 ? (
                      <div className="actividades-table-container">
                        <table className="actividades-table">
                          <thead>
                            <tr>
                              <th>Motivo</th>
                              <th>Fecha Inicio</th>
                              <th>Fecha Fin</th>
                            </tr>
                          </thead>
                          <tbody>
                            {licencias.map((lic, index) => (
                              <tr key={index}>
                                <td>{lic.motivo}</td>
                                <td>{formatDate(lic.fechaInicio)}</td>
                                <td>{formatDate(lic.fechaFin)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="empty-state-card">
                        <div className="empty-state-icon">
                          <FaCalendarAlt />
                        </div>
                        <h4 className="empty-state-title">No hay licencias vigentes</h4>
                        <p className="empty-state-text">El docente se encuentra en actividad normal.</p>
                      </div>
                    )}
                  </div>

                  {/* Documentación Adjunta */}
                  <div className="section-block right-section">
                    <h2 className="section-title">Documentación Adjunta</h2>
                    <hr className="section-divider" />

                    <div className="documentos-container">
                      <div className="documentos-header">
                        <button className="add-doc-btn">
                          <FaPaperclip /> Agregar Documento
                        </button>
                      </div>

                      <div className="documentos-grid">

                        {/* Doc 1 */}
                        <div className="doc-card">
                          <div className="doc-card-top">
                            <div className="doc-icon pdf-icon">
                              <FaFilePdf />
                            </div>
                            <HiOutlineDownload className="download-icon" />
                          </div>
                          <div className="doc-card-bottom">
                            <h5 className="doc-name">Resolución_Aprobación...</h5>
                            <p className="doc-meta">2.4 MB • 10 Oct 2025</p>
                          </div>
                        </div>

                        {/* Doc 2 */}
                        <div className="doc-card">
                          <div className="doc-card-top">
                            <div className="doc-icon img-icon">
                              <FaImage />
                            </div>
                            <HiOutlineDownload className="download-icon" />
                          </div>
                          <div className="doc-card-bottom">
                            <h5 className="doc-name">Certificado_Medico...</h5>
                            <p className="doc-meta">1.1 MB • 08 Oct 2025</p>
                          </div>
                        </div>

                        {/* Empty Doc slot */}
                        <div className="doc-empty-slot">
                          <BiArchiveIn className="empty-slot-icon" />
                          <p>No hay más documentos adjuntos.</p>
                        </div>

                      </div>
                    </div>
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
