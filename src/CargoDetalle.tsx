import { useState, useRef } from 'react';
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

interface CargoDetalleProps {
  cargo: Cargo;
  onLogout?: () => void;
  onNavigate?: (page: any, data?: any) => void;
}

export default function CargoDetalle({ cargo, onLogout, onNavigate }: CargoDetalleProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('File selected for upload:', file.name);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'DD/MM/AAAA';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  // Mock data to match Figma since these might not be in the Cargo model yet
  const actividadesVinculadas = [
    { materia: 'Historia del Arte Moderno II', origen: 'Planta', horas: 8 },
    { materia: 'Seminario de Tesis', origen: 'Planta', horas: 4 },
    { materia: 'Prácticas Contemporáneas', origen: 'Investigación', horas: 12 },
  ];

  const subcargos = [
    { nombre: `JTP (${cargo.numero}-A)` },
    { nombre: `JTP (${cargo.numero}-B)` }
  ];

  const documentosAdjuntos: any[] = []; // Empty for now

  return (
    <div className="dashboard-layout">
      <Topbar onLogout={onLogout} />

      <div className="dashboard-body">
        <Sidebar activeItem="listado" onNavigate={onNavigate} />

        <main className="main-content">
          <div className="content-area cargo-detalle-area">

            <div className="detalle-top-nav">
              <button className="back-button" onClick={() => onNavigate && onNavigate('listado')}>
                <FiChevronLeft /> Volver a Listado
              </button>
            </div>

            <div className="cargo-detalle-card-container">

              {/* Header */}
              <div className="cargo-detalle-header">
                <div className="cargo-header-info">
                  <h1 className="cargo-title">Cargo N°{cargo.numero || '----'}</h1>
                  <h2 className="cargo-subtitle">
                    {cargo.categoria}
                  </h2>
                </div>
                <div className="cargo-header-actions">
                  <div className={`status-badge asignado-status`}>
                    <FiCheckCircle /> {cargo.estado || 'Asignado'}
                  </div>
                  <button className="edit-btn">
                    <FiEdit3 /> Editar Cargo
                  </button>
                </div>
              </div>

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
                          <span className="cargo-info-value">{cargo.apellidoNombre || 'No asignado'}</span>
                        </div>
                        <div className="cargo-info-group">
                          <span className="cargo-info-label">DNI</span>
                          <span className="cargo-info-value">23.456.789</span>
                        </div>

                        <div className="cargo-info-group">
                          <span className="cargo-info-label">N° RESOLUCIÓN</span>
                          <span className="cargo-info-value">2046-48</span>
                        </div>
                        <div className="cargo-info-group">
                          <span className="cargo-info-label">FECHA DE CREACIÓN</span>
                          <span className="cargo-info-value">{formatDate(cargo.fechaCreacion)}</span>
                        </div>

                        <div className="cargo-info-group">
                          <span className="cargo-info-label">DEDICACIÓN</span>
                          <span className="cargo-info-value">{cargo.dedicacion || 'Exclusiva (40hs)'}</span>
                        </div>
                        <div className="cargo-info-group">
                          <span className="cargo-info-label">CARÁCTER</span>
                          <span className="cargo-info-value">{cargo.caracter || 'Efectivo'}</span>
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
                            {actividadesVinculadas.map((act, idx) => (
                              <tr key={idx}>
                                <td>{act.materia}</td>
                                <td>{act.origen}</td>
                                <td>{act.horas}</td>
                              </tr>
                            ))}
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
                          <span className="cargo-info-value">RES-CS-2021-045</span>
                        </div>
                        <div className="cargo-info-group">
                          <span className="cargo-info-label">PERÍODO</span>
                          <span className="cargo-info-value">01/04/2025 - 31/03/2027</span>
                        </div>
                      </div>
                    </div>

                    <div className="cargo-tree-section">
                      <div className="tree-title">Cargo Predecesor</div>
                      <div className="tree-card">
                        <BsArrowUp className="tree-card-icon" />
                        <div className="tree-card-content">
                          <h5>Jefe de Trabajos Prácticos (JTP)</h5>
                          <p>Vinculado el 15/03/2026</p>
                        </div>
                      </div>

                      <div className="tree-node-container">
                        <div className="tree-line-top"></div>
                        <div className="tree-node">{cargo.numero || '4532'}</div>
                        <div className="tree-line-bottom"></div>
                      </div>

                      <div className="tree-title">Subcargos Activos</div>
                      <div className="subcargos-list">
                        {subcargos.map((sub, idx) => (
                          <div className="subcargo-card" key={idx}>
                            <div className="subcargo-card-left">
                              <BsArrowReturnRight className="subcargo-icon" />
                              <span>{sub.nombre}</span>
                            </div>
                            <MdKeyboardArrowRight className="subcargo-arrow" />
                          </div>
                        ))}
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
                      documentosAdjuntos.map((doc, index) => (
                        <div className="doc-card" key={index}>
                          <div className="doc-card-top">
                            <FaFilePdf style={{ color: '#ff4d4f', fontSize: '24px' }} />
                            <HiOutlineDownload style={{ color: '#666', fontSize: '20px', cursor: 'pointer' }} />
                          </div>
                          <div className="doc-card-bottom">
                            <h5>{doc.name}</h5>
                            <p>{doc.size} • {doc.date}</p>
                          </div>
                        </div>
                      ))
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
