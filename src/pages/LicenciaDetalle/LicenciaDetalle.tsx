import { useState, useEffect, useRef } from 'react';
import './LicenciaDetalle.css';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import { FiChevronLeft, FiCheckCircle, FiEdit3, FiExternalLink } from 'react-icons/fi';
import { FaPaperclip, FaFilePdf, FaImage, FaFileAlt } from 'react-icons/fa';
import { HiOutlineDownload } from 'react-icons/hi';
import { BiArchiveIn } from 'react-icons/bi';

export interface Licencia {
  id: number;
  nroResolucion: string;
  motivoNombre?: string;
  motivo?: string;
  docenteNombreCompleto?: string;
  fechaInicio?: string;
  fechaFin?: string;
  fechaFinEstimada?: string;
  fechaFinActual?: string;
  diasUsados?: number;
  diasTotales?: number;
  cantidadDias?: number;
  estado?: string;
  categoria?: string;
  dedicacion?: string;
  legajo?: number | string;
  dni?: number | string;
  docenteId?: number;
  usuarioId?: number;
  cargoId?: number;
  numeroCargo?: number;
  documentos?: Array<{
    name: string;
    size: string;
    date: string;
    type?: string;
  }>;
}

interface LicenciaDetalleProps {
  licencia: Licencia;
  onBack?: () => void;
  onLogout?: () => void;
  onNavigate?: (page: any, data?: any) => void;
}

export default function LicenciaDetalle({ licencia, onBack, onLogout, onNavigate }: LicenciaDetalleProps) {
  const [detalle, setDetalle] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [uploadedDocs, setUploadedDocs] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchDetalle = async () => {
      if (!licencia?.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8081'}/api/licencias/${licencia.id}`,
          { headers }
        );

        if (response.ok) {
          const data = await response.json();
          setDetalle(data);
        } else {
          if (response.status === 401 && onLogout) {
            onLogout();
          }
        }
      } catch (err) {
        console.warn('Could not fetch from /api/licencias/' + licencia.id, err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetalle();
  }, [licencia?.id]);

  const formatSpanishDate = (dateStr?: string) => {
    if (!dateStr) return 'Pendiente';
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      if (monthIndex >= 0 && monthIndex < 12) {
        return `${day} ${months[monthIndex]}, ${year}`;
      }
    }
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
      }
    } catch {
      // fallback
    }
    return dateStr;
  };

  const getInitials = (fullName?: string) => {
    if (!fullName) return 'MR';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (onNavigate) {
      onNavigate('listado', { tab: 'licencias' });
    } else {
      window.history.back();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const newDoc = {
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }),
        type: file.type.includes('pdf') ? 'pdf' : file.type.includes('image') ? 'image' : 'generic'
      };
      setUploadedDocs((prev) => [...prev, newDoc]);
    }
  };

  // Resolve values with graceful fallbacks to provided props and sensible defaults from design
  const id = detalle?.id ?? licencia.id ?? 8413;
  const nroResolucion = detalle?.nroResolucion ?? licencia.nroResolucion ?? '4156';
  const motivo = detalle?.motivoNombre || detalle?.motivo || licencia.motivoNombre || licencia.motivo || 'Enfermedad';
  const estado = detalle?.estado || licencia.estado || 'Activo';

  const fechaInicio = detalle?.fechaInicio || licencia.fechaInicio || '2026-10-15';
  const fechaFinEstimada = detalle?.fechaFinEstimada || detalle?.fechaFinEstim || detalle?.fechaFin || licencia.fechaFinEstimada || licencia.fechaFin || '2026-11-15';
  const fechaFinActual = detalle?.fechaFinActual || detalle?.fechaFin || licencia.fechaFinActual || null;

  // Calculate total duration in days assigned to this licencia
  const getDaysBetween = (startStr?: string, endStr?: string): number | null => {
    if (!startStr || !endStr) return null;
    try {
      const sParts = startStr.split('T')[0].split('-');
      const eParts = endStr.split('T')[0].split('-');
      if (sParts.length === 3 && eParts.length === 3) {
        const s = new Date(Number(sParts[0]), Number(sParts[1]) - 1, Number(sParts[2]));
        const e = new Date(Number(eParts[0]), Number(eParts[1]) - 1, Number(eParts[2]));
        if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
          const diffMs = e.getTime() - s.getTime();
          const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
          return diffDays > 0 ? diffDays : null;
        }
      }
    } catch {
      // fallback
    }
    return null;
  };

  // Calculate elapsed days used from fechaInicio to today (or fechaFinActual)
  const calculateDiasUsados = (
    startStr?: string,
    endActualStr?: string | null,
    endEstimadaStr?: string,
    maxTotal?: number
  ): number => {
    if (!startStr) return 0;
    try {
      const today = new Date();
      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      const startParts = startStr.split('T')[0].split('-');
      if (startParts.length !== 3) return 0;
      const startDate = new Date(Number(startParts[0]), Number(startParts[1]) - 1, Number(startParts[2]));

      if (todayDate.getTime() < startDate.getTime()) {
        return 0;
      }

      let endDate: Date | null = null;
      if (endActualStr) {
        const actParts = endActualStr.split('T')[0].split('-');
        if (actParts.length === 3) {
          endDate = new Date(Number(actParts[0]), Number(actParts[1]) - 1, Number(actParts[2]));
        }
      } else if (endEstimadaStr) {
        const estParts = endEstimadaStr.split('T')[0].split('-');
        if (estParts.length === 3) {
          endDate = new Date(Number(estParts[0]), Number(estParts[1]) - 1, Number(estParts[2]));
        }
      }

      const effectiveEndDate = endDate && todayDate.getTime() > endDate.getTime()
        ? endDate
        : todayDate;

      const diffMs = effectiveEndDate.getTime() - startDate.getTime();
      const usedDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
      const result = Math.max(0, usedDays);

      return maxTotal ? Math.min(result, maxTotal) : result;
    } catch {
      return 0;
    }
  };

  // Total days assigned to this specific licencia
  const diasTotalesCalculados = getDaysBetween(fechaInicio, fechaFinEstimada) || getDaysBetween(fechaInicio, fechaFinActual);
  const diasTotales =
    diasTotalesCalculados ??
    detalle?.cantidadDias ??
    licencia?.cantidadDias ??
    detalle?.diasTotales ??
    licencia?.diasTotales ??
    30;

  // Days used so far for this licencia (dynamically calculated from activation date to days passed)
  const diasUsados = calculateDiasUsados(
    fechaInicio,
    fechaFinActual,
    fechaFinEstimada,
    diasTotales
  );

  // Percentage completed of the progress bar
  const progressPercent = diasTotales > 0
    ? Math.min(100, Math.max(0, Math.round((diasUsados / diasTotales) * 100)))
    : 0;

  // Designación / Cargo
  const primaryCargo = (detalle?.cargosDetalle && detalle.cargosDetalle.length > 0)
    ? detalle.cargosDetalle[0]
    : null;

  const designacionCategoria = primaryCargo?.categoria || detalle?.categoria || licencia.categoria || 'Profesor Adjunto';
  const designacionDedicacion = primaryCargo?.dedicacion || detalle?.dedicacion || licencia.dedicacion || 'Dedicación Simple';
  const cargoNumero = primaryCargo?.codigo || detalle?.cargoCodigo || detalle?.numeroCargo || licencia.numeroCargo || detalle?.designacionNroResolucion || detalle?.legajo || licencia.legajo || 45920;
  const legajo = cargoNumero;

  // Docente Titular
  const docenteId = detalle?.docenteId || licencia.docenteId || licencia.usuarioId;
  const docenteNombreCompleto = detalle?.docenteNombreCompleto ||
    detalle?.docente?.nombreCompleto ||
    (detalle?.docente?.nombre ? `${detalle.docente.nombre} ${detalle.docente.apellido || ''}` : null) ||
    licencia.docenteNombreCompleto ||
    'María Rodríguez';
  const dni = detalle?.docenteDni || detalle?.docente?.dni || detalle?.dni || licencia.dni || '28.456.789';

  const handleNavigateDocente = async () => {
    if (!onNavigate) return;
    let targetUsuarioId = docenteId;

    const nameParts = docenteNombreCompleto ? docenteNombreCompleto.split(',').map((s: string) => s.trim()) : [];
    const apellido = nameParts.length > 1 ? nameParts[0] : undefined;
    const nombre = nameParts.length > 1 ? nameParts[1] : docenteNombreCompleto;

    if (!targetUsuarioId) {
      const searchTerms: string[] = [];
      if (apellido) searchTerms.push(apellido);
      if (nombre) searchTerms.push(nombre);
      if (dni) searchTerms.push(String(dni).replace(/\D/g, ''));

      for (const term of searchTerms) {
        if (!term) continue;
        try {
          const token = localStorage.getItem('token');
          const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
          const response = await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:8081'}/api/docentes?search=${encodeURIComponent(term)}`,
            { headers }
          );
          if (response.ok) {
            const data = await response.json();
            const found = data.content?.find((d: any) => {
              const full = `${d.apellido || ''} ${d.nombre || ''}`.toLowerCase();
              if (apellido && full.includes(apellido.toLowerCase())) return true;
              if (nombre && full.includes(nombre.toLowerCase())) return true;
              return false;
            }) || data.content?.[0];

            if (found && (found.usuarioId || found.id)) {
              onNavigate('docente_detalle', {
                ...found,
                usuarioId: found.usuarioId || found.id,
                nombre: found.nombre || nombre,
                apellido: found.apellido || apellido,
                dni: dni
              });
              return;
            }
          }
        } catch (err) {
          console.error('Error finding docente:', err);
        }
      }
    }

    onNavigate('docente_detalle', {
      usuarioId: targetUsuarioId,
      nombre: nombre || docenteNombreCompleto,
      apellido: apellido,
      dni: dni
    });
  };

  const handleNavigateCargo = async (specificCargo?: any) => {
    if (!onNavigate) return;
    const selected = specificCargo || primaryCargo;
    let targetId = selected?.id || detalle?.cargoId || licencia.cargoId;
    const targetNumero = selected?.codigo || cargoNumero;

    if (!targetId && targetNumero) {
      try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8081'}/api/cargos?search=${encodeURIComponent(targetNumero)}`,
          { headers }
        );
        if (response.ok) {
          const data = await response.json();
          const found = data.content?.find((c: any) => Number(c.numero) === Number(targetNumero)) || data.content?.[0];
          if (found && found.id) {
            targetId = found.id;
            onNavigate('cargo_detalle', found);
            return;
          }
        }
      } catch (err) {
        console.error('Error finding cargo:', err);
      }
    }

    onNavigate('cargo_detalle', {
      id: targetId,
      numero: targetNumero,
      categoria: selected?.categoria || designacionCategoria,
      dedicacion: selected?.dedicacion || designacionDedicacion,
      estado: selected?.estado || 'Ocupado'
    });
  };

  // Documentos
  const apiDocs = (detalle?.documentacionAdjunta && detalle.documentacionAdjunta.length > 0)
    ? detalle.documentacionAdjunta
    : (detalle?.documentos || licencia.documentos || []);
  const docs = [...apiDocs, ...uploadedDocs];

  return (
    <div className="dashboard-layout">
      <Topbar onLogout={onLogout} />

      <div className="dashboard-body">
        <Sidebar activeItem="listado" onNavigate={onNavigate} />

        <main className="main-content">
          <div className="content-area licencia-detalle-area">

            {/* Back Button */}
            <div className="licencia-top-nav">
              <button className="back-button" onClick={handleBack}>
                <FiChevronLeft /> Volver a Listado
              </button>
            </div>

            {/* Main Details Card */}
            <div className="licencia-detalle-card-container">

              {/* Card Header */}
              <div className="licencia-detalle-header">
                <div className="licencia-header-info">
                  <h1 className="licencia-title">
                    Licencia N° {id}
                  </h1>
                  <h2 className="licencia-subtitle">
                    N° Resolución: {nroResolucion}
                  </h2>
                </div>

                <div className="licencia-header-actions">
                  <div className={`licencia-status-badge ${estado?.toLowerCase() || 'activa'}`}>
                    <FiCheckCircle /> {estado}
                  </div>
                  <button className="licencia-edit-btn" onClick={() => console.log('Edit clicked')}>
                    <FiEdit3 /> Editar Licencia
                  </button>
                </div>
              </div>

              <div className="licencia-card-content">
                {/* Body Content */}
                <div className="licencia-body-container">

                {/* Top Two Columns */}
                <div className="licencia-two-cols">

                  {/* Column 1: Datos de la Licencia */}
                  <div className="licencia-section-card">
                    <div className="licencia-section-header header-datos">
                      <h3 className="licencia-section-title">Datos de la Licencia</h3>
                      <span className="licencia-motivo-pill">
                        Motivo: {motivo}
                      </span>
                    </div>

                    <div className="licencia-datos-body">
                      <div className="licencia-field-group">
                        <span className="licencia-field-label">ID Licencia</span>
                        <span className="licencia-field-value">{id}</span>
                      </div>

                      <div className="licencia-field-group">
                        <span className="licencia-field-label">N° Resolución</span>
                        <span className="licencia-field-value">{nroResolucion}</span>
                      </div>

                      <div className="licencia-field-group">
                        <span className="licencia-field-label">Fecha de Inicio</span>
                        <span className="licencia-field-value">{formatSpanishDate(fechaInicio)}</span>
                      </div>

                      <div className="licencia-field-group">
                        <span className="licencia-field-label">Fecha Fin Estimada</span>
                        <span className="licencia-field-value">{formatSpanishDate(fechaFinEstimada)}</span>
                      </div>

                      <div className="licencia-field-group">
                        <span className="licencia-field-label">Fecha Fin Actual</span>
                        <span className={`licencia-field-value ${!fechaFinActual ? 'pendiente' : ''}`}>
                          {fechaFinActual ? formatSpanishDate(fechaFinActual) : 'Pendiente'}
                        </span>
                      </div>

                      <div className="licencia-field-group">
                        <span className="licencia-field-label">Días Usados</span>
                        <div className="licencia-dias-container">
                          <span className="licencia-field-value">{diasUsados} días</span>
                          <div
                            className="licencia-progress-track"
                            title={`${diasUsados} de ${diasTotales} días usados (${progressPercent}%)`}
                          >
                            <div
                              className="licencia-progress-bar"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Vínculos */}
                  <div className="licencia-section-card">
                    <div className="licencia-section-header header-vinculos">
                      <h3 className="licencia-section-title">Vínculos</h3>
                    </div>

                    <div className="licencia-vinculos-body">
                      {/* Designación / Cargo Asociado */}
                      {detalle?.cargosDetalle && detalle.cargosDetalle.length > 1 ? (
                        detalle.cargosDetalle.map((c: any, index: number) => (
                          <div
                            key={c.id || index}
                            className="vinculo-card"
                            onClick={() => handleNavigateCargo(c)}
                            title={`Ver Cargo #${c.codigo || c.id}`}
                          >
                            <div className="vinculo-card-header">
                              <span className="vinculo-card-label">Cargo Asociado #{index + 1}</span>
                              <FiExternalLink className="vinculo-external-icon" />
                            </div>
                            <div className="vinculo-card-text">
                              {c.categoria || designacionCategoria} - {c.dedicacion || designacionDedicacion}
                            </div>
                            <div className="vinculo-card-subtext">
                              N° Cargo: {c.codigo || c.id || legajo}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div
                          className="vinculo-card"
                          onClick={() => handleNavigateCargo()}
                          title="Ver Designación Asociada"
                        >
                          <div className="vinculo-card-header">
                            <span className="vinculo-card-label">Designación Asociada</span>
                            <FiExternalLink className="vinculo-external-icon" />
                          </div>
                          <div className="vinculo-card-text">
                            {designacionCategoria} - {designacionDedicacion}
                          </div>
                          <div className="vinculo-card-subtext">
                            N° Legajo: {legajo}
                          </div>
                        </div>
                      )}

                      {/* Docente Titular */}
                      <div
                        className="vinculo-card"
                        onClick={handleNavigateDocente}
                        title="Ver Docente Titular"
                      >
                        <div className="vinculo-card-header">
                          <span className="vinculo-card-label">Docente Titular</span>
                          <FiExternalLink className="vinculo-external-icon" />
                        </div>
                        <div className="vinculo-docente-row">
                          <div className="vinculo-avatar">
                            {getInitials(docenteNombreCompleto)}
                          </div>
                          <div className="vinculo-docente-info">
                            <span className="vinculo-docente-nombre">{docenteNombreCompleto}</span>
                            <span className="vinculo-docente-dni">DNI: {dni}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Bottom Row: Documentación Adjunta */}
                <div className="licencia-doc-section">
                  <div className="licencia-section-header header-documentacion">
                    <h3 className="licencia-section-title">Documentación Adjunta</h3>
                    <input
                      type="file"
                      style={{ display: 'none' }}
                      ref={fileInputRef}
                      onChange={handleFileChange}
                    />
                    <button
                      className="licencia-doc-add-btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FaPaperclip /> Agregar Documento
                    </button>
                  </div>

                  <div className="licencia-doc-body">
                    {docs && docs.length > 0 ? (
                      docs.map((doc: any, idx: number) => {
                        const isPdf = doc.type === 'pdf' || doc.name?.toLowerCase().endsWith('.pdf');
                        const isImage = doc.type === 'image' || doc.name?.match(/\.(jpg|jpeg|png|svg)$/i);
                        return (
                          <div className="licencia-doc-card" key={idx}>
                            <div className="licencia-doc-top">
                              <div className={`licencia-doc-icon-wrapper ${isPdf ? 'pdf' : isImage ? 'image' : 'generic'}`}>
                                {isPdf ? <FaFilePdf /> : isImage ? <FaImage /> : <FaFileAlt />}
                              </div>
                              <HiOutlineDownload
                                className="licencia-doc-download"
                                title="Descargar documento"
                              />
                            </div>
                            <div className="licencia-doc-bottom">
                              <h5 title={doc.name}>{doc.name}</h5>
                              <p>{doc.size} • {doc.date}</p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="licencia-doc-empty-slot">
                        <div className="licencia-empty-slot-icon">
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
      </main>
    </div>
  </div>
);
}
