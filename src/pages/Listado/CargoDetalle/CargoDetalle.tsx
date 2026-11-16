import { useState, useEffect, useRef } from 'react';
import './CargoDetalle.css';
import Sidebar from '../../../components/Sidebar';
import Topbar from '../../../components/Topbar';
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
  origenId?: number | null;
  origen?: string | null;
  unidadId?: number | null;
  unidadNombre?: string | null;
  tipoUnidadNombre?: string | null;
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
      const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
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
      let resolvedId = cargo?.id;

      if (!resolvedId && cargo?.numero) {
        try {
          const token = localStorage.getItem('token');
          const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
          const response = await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:8081'}/api/cargos?search=${cargo.numero}`,
            { headers }
          );
          if (response.ok) {
            const data = await response.json();
            const found = data.content?.find((c: any) => Number(c.numero) === Number(cargo.numero)) || data.content?.[0];
            if (found && found.id) {
              resolvedId = found.id;
              try {
                sessionStorage.setItem('atlas_selected_cargo', JSON.stringify({ ...cargo, id: resolvedId }));
              } catch {
                // ignore
              }
            }
          }
        } catch (err) {
          console.error('Error resolving cargo ID:', err);
        }
      }

      if (!resolvedId) {
        setError('No se proporcionó un ID válido para el cargo.');
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8081'}/api/cargos/${resolvedId}`, { headers });
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
  }, [cargo?.id, cargo?.numero]);

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

  const targetCargoNum = detalle?.numero ?? cargo.numero;
  const rawDocs: any[] = detalle?.documentacionAdjunta || [];
  const normalizedBackendDocs = rawDocs.map((item: any) => {
    if (typeof item === 'string') {
      return {
        name: item.endsWith('.pdf') ? item : `${item}.pdf`,
        type: 'application/pdf',
        size: 'PDF Oficial',
        date: formatDate(detalle?.designacionFechaInicio || detalle?.fechaCreacion || cargo.fechaCreacion),
      };
    }
    return {
      ...item,
      name: item.name || item.nombreOriginal || item.documentoNombre || 'Acta_Designacion.pdf',
      type: item.type || item.tipoContenido || 'application/pdf',
      size: item.size || 'PDF Oficial',
      date: item.date || formatDate(item.fechaSubida || detalle?.designacionFechaInicio),
    };
  });

  let localStoredDocs: any[] = [];
  try {
    const rawLocal = localStorage.getItem('atlas_confirmed_designaciones_docs');
    if (rawLocal) {
      const parsed: any[] = JSON.parse(rawLocal);
      localStoredDocs = parsed.filter(
        (d) =>
          (cargo.id && Number(d.cargoId) === Number(cargo.id)) ||
          (targetCargoNum && Number(d.cargoNumero) === Number(targetCargoNum))
      );
    }
  } catch {
    // ignore
  }

  const documentosAdjuntos: any[] =
    normalizedBackendDocs.length > 0
      ? normalizedBackendDocs.map((bDoc) => ({
          ...(localStoredDocs[0] || {}),
          ...bDoc,
        }))
      : localStoredDocs;

  const handleDownloadOrOpenDoc = (doc: any) => {
    const resolucion = doc.nroResolucion || detalle?.designacionNroResolucion || detalle?.nroResolucionDesignacion || 'S/N';
    const docenteName =
      doc.docenteApellido && doc.docenteNombre
        ? `${String(doc.docenteApellido).toUpperCase()}, ${doc.docenteNombre}`
        : detalle?.asignadoANombre || cargo.apellidoNombre || 'Docente Designado';
    const legajoStr = doc.legajo || detalle?.asignadoADni || 'S/N';
    const dedicacionStr = doc.dedicacion || detalle?.dedicacion || cargo.dedicacion || 'Simple';
    const horasDedicacion = doc.horasDedicacion || (String(dedicacionStr).toLowerCase().includes('exclusiva') && !String(dedicacionStr).toLowerCase().includes('semi') ? 40 : String(dedicacionStr).toLowerCase().includes('semi') ? 20 : 10);
    const funcionesList: any[] =
      doc.funciones ||
      (detalle?.actividadesVinculadas || []).map((a) => ({
        nombre: a.materiaProyecto,
        tipo: a.origen || 'Planta',
        horas: a.horas,
        materiaNombre: a.materiaProyecto,
      }));
    const totalHoras = doc.horasTotales || funcionesList.reduce((acc, f) => acc + (Number(f.horas) || 0), 0) || horasDedicacion;
    const fechaInicioStr = doc.fechaComienzo || formatDate(detalle?.designacionFechaInicio);
    const fechaFinStr = doc.fechaFinalizacion || (detalle?.designacionFechaFin ? formatDate(detalle.designacionFechaFin) : null);
    const stampDate = new Date()
      .toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
      .toUpperCase()
      .replace('.', '');

    const fallbackBodyHtml = `
      <div class="designacion-a4-header">
        <div class="designacion-a4-institution">
          <div class="designacion-a4-emblem" aria-hidden="true">
            <svg width="58" height="58" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="30" stroke="#111111" stroke-width="2.5" />
              <circle cx="32" cy="32" r="24" stroke="#111111" stroke-width="1.2" />
              <circle cx="32" cy="24" r="5" stroke="#111111" stroke-width="1.8" />
              <path d="M18 40h28M22 45h20M20 35h24" stroke="#111111" stroke-width="1.6" />
            </svg>
          </div>
          <div class="designacion-a4-uni-script">Universidad Nacional de San Juan</div>
          <div class="designacion-a4-facultad">FACULTAD DE FILOSOFÍA, HUMANIDADES Y ARTES</div>
        </div>
        <div class="designacion-a4-date-line">
          <span>SAN JUAN, </span>
          <span class="designacion-a4-stamp-date">${stampDate}</span>
        </div>
      </div>
      <div class="designacion-a4-body">
        <p class="designacion-a4-section-heading">VISTO:</p>
        <p class="designacion-a4-paragraph">
          Las actuaciones administrativas relativas a la designación dispuesta por Resolución N° <strong>${resolucion}</strong>, para proveer UN (1) cargo de categoría <strong>${detalle?.categoria || cargo.categoria || 'Docente'}</strong>, dedicación <strong>${dedicacionStr} (${horasDedicacion} hs)</strong>, carácter <strong>${detalle?.caracter || cargo.caracter || 'Ordinario'}</strong>, Código N° <strong>${targetCargoNum}</strong>, para cumplir funciones en ${funcionesList.map((f, i) => `${i > 0 ? (i === funcionesList.length - 1 ? ' y ' : ', ') : ''}“${f.materiaNombre || f.nombre}” (${f.nombre})`).join('')}, en el ámbito de la Unidad Académica <strong>${detalle?.unidadNombre || doc.unidad || 'General'}</strong>, y
        </p>
        <p class="designacion-a4-section-heading">CONSIDERANDO:</p>
        <p class="designacion-a4-paragraph">
          Que se han cumplido los procedimientos reglamentarios vigentes en la Universidad Nacional de San Juan para la cobertura del cargo docente mencionado;
        </p>
        <p class="designacion-a4-paragraph">
          Que corresponde designar al/a la docente <strong>${docenteName}</strong> (Legajo N° <strong>${legajoStr}</strong>), a partir del <strong>${fechaInicioStr}</strong>${fechaFinStr ? ` y hasta el ${fechaFinStr}` : ', con carácter indeterminado'}, asignándole una carga horaria total de <strong>${totalHoras} horas semanales</strong>;
        </p>
        <p class="designacion-a4-por-ello">POR ELLO,</p>
        <p class="designacion-a4-authority">LA DECANA DE LA FACULTAD DE FILOSOFÍA, HUMANIDADES Y ARTES</p>
        <p class="designacion-a4-resuelve">RESUELVE:</p>
        <p class="designacion-a4-paragraph">
          <strong>ARTÍCULO 1°.-</strong> Designar a <strong>${docenteName}</strong> (Legajo N° <strong>${legajoStr}</strong>) en el Cargo N° <strong>${targetCargoNum}</strong>, Categoría <strong>${detalle?.categoria || cargo.categoria || 'Sin especificar'}</strong>, Carácter <strong>${detalle?.caracter || cargo.caracter || 'Sin especificar'}</strong>, Dedicación <strong>${dedicacionStr} (${horasDedicacion} hs)</strong>, dependiente de la Unidad <strong>${detalle?.unidadNombre || doc.unidad || 'Sin especificar'}</strong>, bajo Resolución N° <strong>${resolucion}</strong>, pasando a revestir en estado <strong>ACTIVO</strong>.
        </p>
        <p class="designacion-a4-paragraph">
          <strong>ARTÍCULO 2°.-</strong> Asignar al cargo mencionado las siguientes funciones académicas:
        </p>
        <ul class="designacion-a4-funciones-list">
          ${funcionesList.map((f, idx) => `<li><strong>Función N°${idx + 1}:</strong> ${f.nombre} — <em>Tipo:</em> ${f.tipo || 'Planta'} — <em>Carga horaria:</em> ${f.horas} hs semanales — <em>Materia:</em> ${f.materiaNombre || f.nombre}.</li>`).join('')}
        </ul>
        <p class="designacion-a4-paragraph">
          <strong>ARTÍCULO 3°.-</strong> Regístrese, comuníquese, notifíquese al/a la interesado/a y archívese.
        </p>
      </div>
    `;

    const cleanDocTitle = String(doc.name || `Acta_Designacion_${String(resolucion).replace(/\s+/g, '_')}_Cargo_${targetCargoNum}`).replace(/\.pdf$/i, '');
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${cleanDocTitle}</title>
  <style>
    @page { size: A4; margin: 0; }
    body { margin: 0; padding: 0; background: #E6DFCE; display: flex; justify-content: center; }
    .designacion-a4-sheet {
      background-color: #FFFFFF;
      width: 100%;
      max-width: 680px;
      min-height: 100vh;
      padding: 48px 56px;
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.12);
      box-sizing: border-box;
      color: #1A1A1A;
      font-family: 'Times New Roman', Times, Georgia, serif;
      line-height: 1.65;
      font-size: 14px;
    }
    .designacion-a4-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 32px; gap: 16px; flex-wrap: wrap; }
    .designacion-a4-institution { display: flex; flex-direction: column; align-items: center; text-align: center; max-width: 260px; }
    .designacion-a4-emblem { margin-bottom: 6px; }
    .designacion-a4-uni-script { font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-size: 13px; color: #222222; margin-bottom: 2px; }
    .designacion-a4-facultad { font-family: 'Times New Roman', Times, serif; font-size: 10.5px; font-weight: 700; letter-spacing: 0.03em; color: #111111; line-height: 1.25; }
    .designacion-a4-date-line { font-family: 'Times New Roman', Times, serif; font-size: 13px; color: #111111; padding-bottom: 4px; }
    .designacion-a4-stamp-date { font-family: 'Courier New', Courier, monospace; font-size: 16px; font-weight: 700; letter-spacing: 0.08em; color: #2D3748; margin-left: 6px; }
    .designacion-a4-body { display: flex; flex-direction: column; gap: 12px; }
    .designacion-a4-section-heading { margin: 8px 0 0 48px; font-weight: 700; font-size: 13.5px; letter-spacing: 0.04em; }
    .designacion-a4-paragraph { margin: 0; text-indent: 48px; text-align: justify; font-size: 13.5px; }
    .designacion-a4-por-ello { margin: 8px 0 0 48px; font-weight: 700; font-size: 13.5px; }
    .designacion-a4-authority { margin: 4px 0 0 0; text-align: center; font-weight: 700; font-size: 13.5px; }
    .designacion-a4-resuelve { margin: 2px 0 6px 48px; font-weight: 700; font-size: 13.5px; }
    .designacion-a4-funciones-list { margin: 0 0 6px 48px; padding-left: 20px; font-size: 13.5px; }
    .designacion-a4-funciones-list li { margin-bottom: 6px; text-align: justify; }
    @media print {
      body { background: #FFFFFF; }
      .designacion-a4-sheet { box-shadow: none; max-width: 100%; padding: 20mm 22mm; }
    }
  </style>
</head>
<body>
  <div class="designacion-a4-sheet">
    ${doc.sheetHtml || fallbackBodyHtml}
  </div>
</body>
</html>`);
      win.document.close();
      win.focus();
    }
  };
  const parentCargo = detalle?.cargoPredecesor || detalle?.cargoOrigenDivision;
  const rawSubcargos = [
    ...(detalle?.subcargosActivos || []),
    ...(detalle?.cargosSubdivididos || []),
  ];
  const subcargosList = Array.from(
    new Map(
      rawSubcargos
        .filter((item) => {
          const st = item.estado?.toLowerCase()?.trim();
          return st !== 'dado de baja' && st !== 'inactivo';
        })
        .map((item) => [item.numero, item])
    ).values()
  );
  const hasPredecessor = Boolean(parentCargo);
  const hasSubcargos = Boolean(subcargosList && subcargosList.length > 0);
  const showTreeSection = hasPredecessor || hasSubcargos;

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
                  <button
                    className="edit-btn"
                    onClick={() => onNavigate && onNavigate('modificar_cargo', { ...cargo, ...detalle })}
                  >
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

                    {showTreeSection && (
                      <div className="cargo-tree-section">
                        {hasPredecessor && parentCargo && (
                          <>
                            <div className="tree-title">Cargo Predecesor / Origen</div>
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
                          </>
                        )}

                        <div className="tree-node-container" style={{ marginBottom: hasSubcargos ? undefined : 0 }}>
                          {hasPredecessor && <div className="tree-line-top"></div>}
                          <div className="tree-node">{detalle?.numero ?? cargo.numero ?? '----'}</div>
                          {hasSubcargos && <div className="tree-line-bottom"></div>}
                        </div>

                        {hasSubcargos && (
                          <>
                            <div className="tree-title">Subcargos Activos</div>
                            <div className="subcargos-list">
                              {subcargosList.map((sub, idx) => (
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
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}

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
                          <div
                            className="doc-card"
                            key={index}
                            onClick={() => handleDownloadOrOpenDoc(doc)}
                            style={{ cursor: 'pointer' }}
                            title="Abrir o descargar documento"
                          >
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
