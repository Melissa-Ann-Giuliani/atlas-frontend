import { useState, useEffect, useRef } from 'react';
import './DocenteDetalle.css';
import Sidebar from '../../../components/Sidebar';
import Topbar from '../../../components/Topbar';
import { tryDownloadBackendPdf } from '../../../utils/designacionPdf';
import { FiChevronLeft, FiCheckCircle, FiEdit3 } from 'react-icons/fi';
import { FaFilePdf, FaImage, FaCalendarAlt, FaPaperclip, FaFileWord, FaFileAlt } from 'react-icons/fa';
import { HiOutlineDownload } from 'react-icons/hi';
import { BiArchiveIn } from 'react-icons/bi';

interface Docente {
  usuarioId?: number;
  nombre: string;
  apellido?: string;
  origen?: string;
  unidad?: string;
  categoria?: string;
  dedicacion?: string;
  caracter?: string;
  estado?: string;
  tipoUnidadNombre?: string;
  dni?: number | string;
  legajo?: number | string;
}

interface DocenteDetailsDTO {
  legajo?: number;
  datosPersonales: {
    dni: number;
    legajo?: number;
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
    fechaCreacion?: string;
    horasOcupadas?: number;
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
    plan?: number;
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
  const [cargoDocs, setCargoDocs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('File selected for upload:', file.name);
    }
  };

  useEffect(() => {
    const fetchDetalle = async () => {
      let resolvedId = docente.usuarioId;

      if (!resolvedId) {
        // Fallback: search by apellido, nombre or DNI to find usuarioId
        const searchTerms: string[] = [];
        if (docente.apellido) searchTerms.push(docente.apellido);
        if (docente.nombre) {
          const parts = docente.nombre.split(',').map((p) => p.trim());
          if (parts[0]) searchTerms.push(parts[0]);
          if (parts[1]) searchTerms.push(parts[1]);
        }
        if (docente.dni) {
          searchTerms.push(String(docente.dni).replace(/\D/g, ''));
        }

        const token = localStorage.getItem('token');
        const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};

        for (const term of searchTerms) {
          if (!term) continue;
          try {
            const searchRes = await fetch(
              `${import.meta.env.VITE_API_URL || 'http://localhost:8081'}/api/docentes?search=${encodeURIComponent(term)}`,
              { headers }
            );
            if (searchRes.ok) {
              const searchData = await searchRes.json();
              const matched = searchData.content?.find((d: any) => {
                const fullName = `${d.apellido || ''} ${d.nombre || ''}`.toLowerCase();
                if (docente.apellido && fullName.includes(docente.apellido.toLowerCase())) return true;
                if (docente.nombre && fullName.includes(docente.nombre.split(',')[0].trim().toLowerCase())) return true;
                return false;
              }) || searchData.content?.[0];

              if (matched && (matched.usuarioId || matched.id)) {
                resolvedId = matched.usuarioId || matched.id;
                try {
                  sessionStorage.setItem('atlas_selected_docente', JSON.stringify({ ...docente, usuarioId: resolvedId }));
                } catch {
                  // ignore
                }
                break;
              }
            }
          } catch (e) {
            console.error('Failed to resolve docente by search:', e);
          }
        }
      }

      if (!resolvedId) {
        setError('No se proporcionó un ID válido para el docente (usuarioId).');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8081'}/api/docentes/${resolvedId}`, { headers });
        if (response.ok) {
          const data = await response.json();
          setDetalle(data);
          const firstCargoId = data?.designacionesYCargos?.[0]?.cargoId;
          if (firstCargoId) {
            try {
              const cargoRes = await fetch(
                `${import.meta.env.VITE_API_URL || 'http://localhost:8081'}/api/cargos/${firstCargoId}`,
                { headers }
              );
              if (cargoRes.ok) {
                const cargoData = await cargoRes.json();
                if (Array.isArray(cargoData?.documentacionAdjunta)) {
                  setCargoDocs(cargoData.documentacionAdjunta);
                }
              }
            } catch {
              // ignore cargo docs fetch error
            }
          }
        } else {
          setError(`No se pudieron cargar los detalles del docente. Estado: ${response.status}`);
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
  }, [docente.usuarioId, docente.nombre, docente.apellido, docente.dni]);

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
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const datosPersonales = detalle?.datosPersonales;
  const designacion = detalle?.designacionesYCargos?.[0];
  const actividades = detalle?.actividadesActuales || [];
  const licencias = detalle?.licenciasActuales || [];

  const cleanResDocente = String(designacion?.nroResolucion || 'SN').replace(/\s+/g, '_');
  const targetCargoNumDocente = designacion?.nroCargo ?? 'SN';
  const defaultActaName = `Acta_Designacion_${cleanResDocente}_Cargo_${targetCargoNumDocente}.pdf`;
  const normalizedCargoDocs = cargoDocs.map((item: any) => {
    if (typeof item === 'string') {
      const isApiPath = item.startsWith('/api/') || item.startsWith('http');
      return {
        name: isApiPath ? defaultActaName : (item.endsWith('.pdf') ? item : `${item}.pdf`),
        url: isApiPath ? item : undefined,
        type: 'application/pdf',
        size: 'PDF Oficial',
        date: formatDate(designacion?.fechaInicio),
      };
    }
    const rawName = item.name || item.nombreOriginal || item.documentoNombre || defaultActaName;
    const isApiPath = typeof rawName === 'string' && (rawName.startsWith('/api/') || rawName.startsWith('http'));
    return {
      ...item,
      name: isApiPath ? defaultActaName : rawName,
      type: item.type || item.tipoContenido || 'application/pdf',
      size: item.size || 'PDF Oficial',
      date: item.date || formatDate(item.fechaSubida || designacion?.fechaInicio),
    };
  });

  let localStoredDocs: any[] = [];
  try {
    const rawLocal = localStorage.getItem('atlas_confirmed_designaciones_docs');
    if (rawLocal) {
      const parsed: any[] = JSON.parse(rawLocal);
      const resolvedLegajo = datosPersonales?.legajo || detalle?.legajo || designacion?.legajo || docente.legajo;
      localStoredDocs = parsed.filter(
        (d) =>
          (docente.usuarioId && Number(d.docenteId) === Number(docente.usuarioId)) ||
          (resolvedLegajo && String(d.legajo) === String(resolvedLegajo)) ||
          (designacion?.cargoId && Number(d.cargoId) === Number(designacion.cargoId)) ||
          (designacion?.nroCargo && Number(d.cargoNumero) === Number(designacion.nroCargo))
      );
    }
  } catch {
    // ignore
  }

  const documentosAdjuntos: any[] =
    normalizedCargoDocs.length > 0
      ? normalizedCargoDocs.map((bDoc) => ({
          ...(localStoredDocs[0] || {}),
          ...bDoc,
          name: bDoc.url ? (localStoredDocs[0]?.name || bDoc.name) : bDoc.name,
        }))
      : localStoredDocs;

  const handleDownloadOrOpenDoc = async (doc: any) => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    const token = localStorage.getItem('token');
    const downloaded = await tryDownloadBackendPdf({ apiUrl, token, doc });
    if (downloaded) return;

    const resolucion = doc.nroResolucion || designacion?.nroResolucion || 'S/N';
    const docenteName = datosPersonales
      ? `${datosPersonales.apellido.toUpperCase()}, ${datosPersonales.nombre}`
      : docente.apellido
        ? `${docente.apellido.toUpperCase()}, ${docente.nombre}`
        : docente.nombre;
    const targetCargoNum = doc.cargoNumero || designacion?.nroCargo || 'S/N';
    const legajoStr = doc.legajo || datosPersonales?.legajo || detalle?.legajo || designacion?.legajo || docente.legajo || 'S/N';
    const dedicacionStr = doc.dedicacion || designacion?.dedicacion || docente.dedicacion || 'Simple';
    const horasDedicacion = doc.horasDedicacion || (String(dedicacionStr).toLowerCase().includes('exclusiva') && !String(dedicacionStr).toLowerCase().includes('semi') ? 40 : String(dedicacionStr).toLowerCase().includes('semi') ? 20 : 10);
    const funcionesList: any[] =
      doc.funciones ||
      actividades.map((a) => ({
        nombre: a.funcionNombre,
        tipo: designacion?.origen || 'Planta',
        horas: a.funcionHoras,
        materiaNombre: a.materiaNombre,
      }));
    const totalHoras = doc.horasTotales || funcionesList.reduce((acc, f) => acc + (Number(f.horas) || 0), 0) || horasDedicacion;
    const fechaInicioStr = doc.fechaComienzo || formatDate(designacion?.fechaInicio);
    const fechaFinStr = doc.fechaFinalizacion || (designacion?.fechaFin ? formatDate(designacion.fechaFin) : null);
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
          Las actuaciones administrativas relativas a la designación dispuesta por Resolución N° <strong>${resolucion}</strong>, para proveer UN (1) cargo de categoría <strong>${designacion?.categoria || docente.categoria || 'Docente'}</strong>, dedicación <strong>${dedicacionStr} (${horasDedicacion} hs)</strong>, carácter <strong>${designacion?.caracter || docente.caracter || 'Ordinario'}</strong>, Código N° <strong>${targetCargoNum}</strong>, para cumplir funciones en ${funcionesList.map((f, i) => `${i > 0 ? (i === funcionesList.length - 1 ? ' y ' : ', ') : ''}“${f.materiaNombre || f.nombre}” (${f.nombre})`).join('')}, en el ámbito de la Unidad Académica <strong>${datosPersonales?.unidadNombre || docente.unidad || 'General'}</strong>, y
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
          <strong>ARTÍCULO 1°.-</strong> Designar a <strong>${docenteName}</strong> (Legajo N° <strong>${legajoStr}</strong>) en el Cargo N° <strong>${targetCargoNum}</strong>, Categoría <strong>${designacion?.categoria || docente.categoria || 'Sin especificar'}</strong>, Carácter <strong>${designacion?.caracter || docente.caracter || 'Sin especificar'}</strong>, Dedicación <strong>${dedicacionStr} (${horasDedicacion} hs)</strong>, dependiente de la Unidad <strong>${datosPersonales?.unidadNombre || docente.unidad || 'Sin especificar'}</strong>, bajo Resolución N° <strong>${resolucion}</strong>, pasando a revestir en estado <strong>ACTIVO</strong>.
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
    .designacion-a4-header { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
    .designacion-a4-membrete-row { display: flex; align-items: center; justify-content: center; gap: 24px; width: 100%; }
    .designacion-a4-logo-unsj { height: 76px; width: auto; display: block; object-fit: contain; }
    .designacion-a4-logo-50 { height: 46px; width: auto; display: block; object-fit: contain; }
    .designacion-a4-logo-ffha { height: 52px; width: auto; display: block; object-fit: contain; }
    .designacion-a4-membrete-cert { display: flex; align-items: center; justify-content: space-between; gap: 16px; width: 100%; }
    .designacion-a4-cert-logo { height: 68px; width: auto; display: block; object-fit: contain; }
    .designacion-a4-cert-text { flex: 1; text-align: center; font-family: 'Segoe UI', Calibri, Arial, sans-serif; color: #111111; line-height: 1.45; }
    .designacion-a4-cert-uni { font-size: 15px; font-weight: 400; margin-bottom: 2px; }
    .designacion-a4-cert-fac { font-size: 13px; font-weight: 700; }
    .designacion-a4-cert-sec { font-size: 12.5px; font-weight: 700; }
    .designacion-a4-date-row { display: flex; justify-content: flex-end; width: 100%; }
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

  const handleBack = () => {
    if (onNavigate) {
      onNavigate('listado', { tab: 'docentes' });
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
          <div className="content-area docente-detalle-area">

            <div className="detalle-top-nav">
              <button className="back-button" onClick={handleBack}>
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
                  <div className={`status-badge ${(datosPersonales?.estado || docente.estado)?.toLowerCase().includes('licencia') ? 'licencia-status' : 'active-status'}`}>
                    <FiCheckCircle /> {datosPersonales?.estado || docente.estado || 'Activo'}
                  </div>
                  <button className="edit-btn" onClick={() => onNavigate && onNavigate('modificar_docente', docente)}>
                    <FiEdit3 /> Editar Docente
                  </button>
                </div>
              </div>

              {error && <div style={{ color: 'red', marginBottom: '20px', padding: '10px', backgroundColor: '#fee', borderRadius: '4px' }}>{error}</div>}

              <div className="detalle-body-two-cols">
                {/* Left Column */}
                <div className="detalle-col-left">

                  <div className="section-block-left">
                    <h2 className="section-title">Datos Personales</h2>
                    <hr className="section-divider" />
                    <div className="info-grid-2">
                      <div className="info-group">
                        <span className="info-label">DNI</span>
                        <span className="info-value">{datosPersonales?.dni || docente.dni || 'No especificado'}</span>
                      </div>

                      <div className="info-group">
                        <span className="info-label">N° LEGAJO</span>
                        <span className="info-value">{datosPersonales?.legajo || detalle?.legajo || docente.legajo || 'No especificado'}</span>
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

                  </div>

                  <div className="section-block-left">
                    <h2 className="section-title">Designación y Cargo</h2>
                    <hr className="section-divider" />

                    <div className="info-grid-2">
                      <div className="info-group">
                        <span className="info-label">N° LEGAJO</span>
                        <span className="info-value">{datosPersonales?.legajo || detalle?.legajo || designacion?.legajo || docente.legajo || 'No especificado'}</span>
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
                  <div className="section-block-right">
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
                  <div className="section-block-right">
                    <div className="section-title-row">
                      <h2 className="section-title">Licencias Actuales</h2>
                    </div>
                    <hr className="section-divider" />

                    {licencias.length > 0 ? (
                      <div className="actividades-table-container">
                        <table className="actividades-table licencias-table">
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
                  <div className="section-block-right">
                    <h2 className="section-title">Documentación Adjunta</h2>
                    <hr className="section-divider" />

                    <div className="documentos-container">
                      <div className="documentos-header">
                        <input type="file" style={{ display: 'none' }} ref={fileInputRef} onChange={handleFileChange} />
                        <button className="add-doc-btn" onClick={() => fileInputRef.current?.click()}>
                          <FaPaperclip /> Agregar Documento
                        </button>
                      </div>

                      <div className="documentos-content">
                        <div className="documentos-grid">

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
                                    <div className={`doc-icon ${className}`}>
                                      {icon}
                                    </div>
                                    <HiOutlineDownload className="download-icon" />
                                  </div>
                                  <div className="doc-card-bottom">
                                    <h5 className="doc-name">{doc.name}</h5>
                                    <p className="doc-meta">{doc.size} • {doc.date}</p>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="doc-empty-slot" style={{ gridColumn: '1 / -1' }}>
                              <div className="empty-slot-icon">
                                <BiArchiveIn />
                              </div>
                              <p>No hay documentación adjunta de momento.</p>
                            </div>
                          )}

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
