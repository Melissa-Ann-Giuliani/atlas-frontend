import { useState, useEffect } from 'react';
import './Vencimientos.css';
import Sidebar from '../../../components/Sidebar';
import Topbar from '../../../components/Topbar';
import { FiChevronLeft, FiCheckCircle, FiCheckSquare } from 'react-icons/fi';

interface VencimientosProps {
  onLogout?: () => void;
  onNavigate?: (page: any, data?: any) => void;
  onBack?: () => void;
}

interface DocenteResumen {
  docenteId?: number;
  nombre?: string;
  apellido?: string;
  documento?: string;
  legajo?: string;
}

interface CargoResumen {
  cargoId?: number;
  codigo?: number;
  categoria?: string;
  dedicacion?: string;
  caracter?: string;
  origen?: string;
}

interface UnidadResumen {
  unidadId?: number;
  nombre?: string;
}

interface VencimientoItem {
  id: string | number;
  designacionId?: number;
  numeroResolucion?: string;
  fechaInicio?: string;
  fechaFin?: string;
  diasRestantes: number;
  estadoActual?: string;
  docente?: DocenteResumen;
  unidad?: UnidadResumen;
  cargos?: CargoResumen[];
  // Display fallbacks
  docenteNombre?: string;
  departamento?: string;
  origen?: string;
  categoria?: string;
  dedicacion?: string;
  caracter?: string;
}

const DEFAULT_ITEMS: VencimientoItem[] = [
  {
    id: 1,
    docenteNombre: 'CASTELLI, Sandra',
    departamento: 'Artes Visuales',
    estadoActual: 'Activo',
    origen: 'De Planta',
    categoria: 'JTP',
    dedicacion: 'Exclusiva',
    caracter: 'Efectivo',
    numeroResolucion: 'XXXXX',
    fechaInicio: 'DD/MM/YYYY',
    fechaFin: 'DD/MM/YYYY',
    diasRestantes: 7,
  },
  {
    id: 2,
    docenteNombre: 'CASTELLI, Sandra',
    departamento: 'Artes Visuales',
    estadoActual: 'Activo',
    origen: 'De Planta',
    categoria: 'JTP',
    dedicacion: 'Exclusiva',
    caracter: 'Efectivo',
    numeroResolucion: 'XXXXX',
    fechaInicio: 'DD/MM/YYYY',
    fechaFin: 'DD/MM/YYYY',
    diasRestantes: 10,
  },
  {
    id: 3,
    docenteNombre: 'CASTELLI, Sandra',
    departamento: 'Artes Visuales',
    estadoActual: 'Activo',
    origen: 'De Planta',
    categoria: 'JTP',
    dedicacion: 'Exclusiva',
    caracter: 'Efectivo',
    numeroResolucion: 'XXXXX',
    fechaInicio: 'DD/MM/YYYY',
    fechaFin: 'DD/MM/YYYY',
    diasRestantes: 30,
  },
  {
    id: 4,
    docenteNombre: 'CASTELLI, Sandra',
    departamento: 'Artes Visuales',
    estadoActual: 'Activo',
    origen: 'De Planta',
    categoria: 'JTP',
    dedicacion: 'Exclusiva',
    caracter: 'Efectivo',
    numeroResolucion: 'XXXXX',
    fechaInicio: 'DD/MM/YYYY',
    fechaFin: 'DD/MM/YYYY',
    diasRestantes: 7,
  },
];

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
  const [items, setItems] = useState<VencimientoItem[]>(DEFAULT_ITEMS);

  useEffect(() => {
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

        const res = await fetch(`${apiUrl}/api/designaciones/vencimientos`, { headers });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const mapped: VencimientoItem[] = data.map((d: any, idx: number) => {
              const docente = d.docente || {};
              const nombreDocente = docente.apellido && docente.nombre
                ? `${docente.apellido.toUpperCase()}, ${docente.nombre}`
                : docente.nombre || 'Docente sin asignar';
              const cargo = (d.cargos && d.cargos[0]) || {};

              return {
                id: d.designacionId || idx,
                designacionId: d.designacionId,
                docenteNombre: nombreDocente,
                departamento: d.unidad?.nombre || 'Artes Visuales',
                estadoActual: d.estadoActual || 'Activo',
                origen: cargo.origen || 'De Planta',
                categoria: cargo.categoria || 'JTP',
                dedicacion: cargo.dedicacion || 'Exclusiva',
                caracter: cargo.caracter || 'Efectivo',
                numeroResolucion: d.numeroResolucion || 'XXXXX',
                fechaInicio: d.fechaInicio,
                fechaFin: d.fechaFin,
                diasRestantes: typeof d.diasRestantes === 'number' ? d.diasRestantes : 7,
                docente: d.docente,
                unidad: d.unidad,
                cargos: d.cargos,
              };
            });
            setItems(mapped);
          }
        }
      } catch (err) {
        console.warn('No se pudo conectar al endpoint de vencimientos, usando datos por defecto:', err);
      }
    };

    fetchVencimientos();
  }, []);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (onNavigate) {
      onNavigate('gestion');
    }
  };

  const handleRenovar = (item: VencimientoItem) => {
    if (onNavigate) {
      onNavigate('designacion', {
        docente: item.docente,
        cargo: item.cargos?.[0],
        nroResolucion: item.numeroResolucion,
      });
    }
  };

  const getBadgeClass = (dias: number) => {
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

              {/* Framed Inner Card with Pink Header */}
              <div className="vencimientos-table-card">
                <div className="vencimientos-table-header">
                  <h2>Vencimientos</h2>
                </div>

                <div className="vencimientos-table-body">
                  {items.length === 0 ? (
                    <div className="vencimientos-empty">
                      No hay designaciones próximas a vencer.
                    </div>
                  ) : (
                    items.map((item) => (
                      <div key={item.id} className="vencimiento-card-item">
                        <div className="vencimiento-info">
                          {/* Row 1: Nombre, Departamento, Estado Activo */}
                          <div className="vencimiento-row-1">
                            <span className="vencimiento-docente-nombre">
                              {item.docenteNombre}
                            </span>
                            <span className="vencimiento-departamento">
                              <strong>Departamento:</strong> {item.departamento}
                            </span>
                            <span className="vencimiento-badge-activo">
                              <FiCheckCircle className="vencimiento-badge-icon" />
                              <span>{item.estadoActual || 'Activo'}</span>
                            </span>
                          </div>

                          {/* Row 2: Origen, Categoría, Dedicación, Caracter */}
                          <div className="vencimiento-row-2">
                            <span className="vencimiento-meta-item">
                              <span className="vencimiento-meta-label">Origen:</span>
                              <span className="vencimiento-meta-val">{item.origen || 'De Planta'}</span>
                            </span>
                            <span className="vencimiento-meta-item">
                              <span className="vencimiento-meta-label">Categoría:</span>
                              <span className="vencimiento-meta-val">{item.categoria || 'JTP'}</span>
                            </span>
                            <span className="vencimiento-meta-item">
                              <span className="vencimiento-meta-label">Dedicación:</span>
                              <span className="vencimiento-meta-val">{item.dedicacion || 'Exclusiva'}</span>
                            </span>
                            <span className="vencimiento-meta-item">
                              <span className="vencimiento-meta-label">Caracter:</span>
                              <span className="vencimiento-meta-val">{item.caracter || 'Efectivo'}</span>
                            </span>
                          </div>

                          {/* Row 3: N° Resolución, Fecha Inicio, Fecha Fin */}
                          <div className="vencimiento-row-3">
                            <span className="vencimiento-meta-item">
                              <span className="vencimiento-meta-label">N° Resolución:</span>
                              <span className="vencimiento-meta-val">{item.numeroResolucion || 'XXXXX'}</span>
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
                    ))
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
