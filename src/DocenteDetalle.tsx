import { useState } from 'react';
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

interface DocenteDetalleProps {
  docente: Docente;
  onLogout?: () => void;
  onNavigate?: (page: any, data?: any) => void;
}

export default function DocenteDetalle({ docente, onLogout, onNavigate }: DocenteDetalleProps) {
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
                    {docente.apellido ? `${docente.apellido}, ${docente.nombre}` : docente.nombre || 'Sandra Castelli'}
                  </h1>
                  <p className="docente-department">
                    {docente.tipoUnidadNombre || 'Departamento'} de {docente.unidad || 'Artes Visuales'}
                  </p>
                </div>
                <div className="detalle-header-actions">
                  <div className="status-badge active-status">
                    <FiCheckCircle /> Activo
                  </div>
                  <button className="edit-btn">
                    <FiEdit3 /> Editar Docente
                  </button>
                </div>
              </div>

              <div className="detalle-body-two-cols">
                {/* Left Column */}
                <div className="detalle-col-left">
                  
                  <div className="section-block">
                    <h2 className="section-title">Datos Personales</h2>
                    <hr className="section-divider" />
                    
                    <div className="info-group">
                      <span className="info-label">DNI</span>
                      <span className="info-value">23.456.789</span>
                    </div>

                    <div className="info-group">
                      <span className="info-label">EMAIL INSTITUCIONAL</span>
                      <span className="info-value">scastelli@ffha.edu.ar</span>
                    </div>

                    <div className="info-group">
                      <span className="info-label">TELÉFONO</span>
                      <span className="info-value">+54 9 11 1234-5678</span>
                    </div>
                  </div>

                  <div className="section-block">
                    <h2 className="section-title">Designación y Cargo</h2>
                    <hr className="section-divider" />
                    
                    <div className="info-grid-2">
                      <div className="info-group">
                        <span className="info-label">N° LEGAJO</span>
                        <span className="info-value">5648976</span>
                      </div>
                      <div className="info-group">
                        <span className="info-label">N° RESOLUCIÓN</span>
                        <span className="info-value">2046-48</span>
                      </div>
                      
                      <div className="info-group">
                        <span className="info-label">FECHA DE INICIO</span>
                        <span className="info-value">DD/MM/AAAA</span>
                      </div>
                      <div className="info-group">
                        <span className="info-label">FECHA DE FINALIZACIÓN</span>
                        <span className="info-value">DD/MM/AAAA</span>
                      </div>

                      <div className="info-group">
                        <span className="info-label">N° CARGO</span>
                        <span className="info-value">25647</span>
                      </div>
                      <div className="info-group">
                        <span className="info-label">CATEGORÍA</span>
                        <span className="info-value">{docente.categoria || 'JTP - Jefe de Trabajos Prácticos'}</span>
                      </div>

                      <div className="info-group">
                        <span className="info-label">DEDICACIÓN</span>
                        <span className="info-value">{docente.dedicacion || 'Exclusiva'}</span>
                      </div>
                      <div className="info-group">
                        <span className="info-label">CARÁCTER</span>
                        <span className="info-value">{docente.caracter || 'Efectivo'}</span>
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
                            <th>Origen</th>
                            <th>Horas</th>
                            <th>Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>Historia del Arte Moderno II</td>
                            <td>Planta</td>
                            <td>8</td>
                            <td className="status-en-curso">En curso</td>
                          </tr>
                          <tr>
                            <td>Seminario de Tesis</td>
                            <td>Planta</td>
                            <td>4</td>
                            <td className="status-en-curso">En curso</td>
                          </tr>
                          <tr>
                            <td>Prácticas Contemporáneas</td>
                            <td>Investigación</td>
                            <td>12</td>
                            <td className="status-en-curso">En curso</td>
                          </tr>
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

                    <div className="empty-state-card">
                      <div className="empty-state-icon">
                        <FaCalendarAlt />
                      </div>
                      <h4 className="empty-state-title">No hay licencias vigentes</h4>
                      <p className="empty-state-text">El docente se encuentra en actividad normal.</p>
                    </div>
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
