import React, { useState, useEffect } from 'react';
import './Inicio.css';
import Sidebar from './Sidebar';
import Topbar from './Topbar';


import FilterBar, { type FilterCategory } from './FilterBar';



// Types
interface DonutData {
  label: string;
  value: number;
  color: string;
}

// Chart Component
const DonutChart = ({ data, size = 200, thickness = 30, centerText, centerSubtext, onMouseMove, onMouseLeave, onClick }: { 
  data: DonutData[], 
  size?: number, 
  thickness?: number, 
  centerText: string, 
  centerSubtext: string,
  onMouseMove?: (e: React.MouseEvent, label: string, value: number, color: string) => void,
  onMouseLeave?: () => void,
  onClick?: (label: string, value: number, color: string) => void
}) => {
  const center = size / 2;
  const radius = center - thickness / 2;
  const circumference = 2 * Math.PI * radius;

  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentOffset = 0;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      <circle cx={center} cy={center} r={radius - thickness / 2 + 1} fill="#FFFFFF" />
      {data.map((item, index) => {
        const valueRatio = total > 0 ? item.value / total : 0;
        const strokeDasharray = `${valueRatio * circumference} ${circumference}`;
        const strokeDashoffset = -currentOffset;
        currentOffset += valueRatio * circumference;

        return (
          <circle
            key={index}
            className="donut-segment"
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={item.color}
            strokeWidth={thickness}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            transform={`rotate(-90 ${center} ${center})`}
            style={{ transition: 'stroke-dasharray 0.5s ease, stroke-dashoffset 0.5s ease, opacity 0.2s ease', cursor: 'pointer' }}
            onMouseMove={(e) => onMouseMove && onMouseMove(e, item.label, item.value, item.color)}
            onMouseLeave={() => onMouseLeave && onMouseLeave()}
            onClick={() => onClick && onClick(item.label, item.value, item.color)}
          />
        );
      })}
      <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.18} fontWeight="bold" fill="#1f2937" pointerEvents="none">
        {centerText}
      </text>
      <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.08} fill="#6b7280" pointerEvents="none">
        {centerSubtext}
      </text>
    </svg>
  );
};

export default function Inicio({ onLogout, onNavigateToListado }: { onLogout?: () => void, onNavigateToListado?: (filter: string) => void }) {
  // Mock Data mimicking the backend RF-04 API response
  const [data, setData] = useState<{
    totalDocentes: number;
    unitTypes: DonutData[];
    centros: DonutData[];
    departamentos: DonutData[];
    institutos: DonutData[];
  } | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number, y: number, label: string, value: number, color: string } | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<string[]>([]); // added some mock filters for demo
  const [availableFilters] = useState<FilterCategory[]>([
    {
      id: 'caracter',
      name: 'Caracter',
      options: [
        { id: '1', label: 'Efectivo' },
        { id: '2', label: 'Extraordinario' },
        { id: '3', label: 'Interino' },
        { id: '4', label: 'Suplente Constituido' },
        { id: '5', label: 'Suplente Reemplazante' }
      ]
    },
    {
      id: 'categoria',
      name: 'Categoría',
      options: [
        { id: '1', label: 'Adjunto' },
        { id: '2', label: 'Asociado' },
        { id: '3', label: 'Auxiliar de 1º' },
        { id: '4', label: 'Auxiliar de 2º' },
        { id: '5', label: 'Jefe de T. Prác.' },
        { id: '6', label: 'Titular' }
      ]
    },
    {
      id: 'dedicacion',
      name: 'Dedicación',
      options: [
        { id: '1', label: 'Exclusivo' },
        { id: '2', label: 'Semi-Exclusivo' },
        { id: '3', label: 'Simple' }
      ]
    },
    {
      id: 'origen',
      name: 'Origen',
      options: [
        { id: '1', label: 'Planta' },
        { id: '2', label: 'Extensión' },
        { id: '3', label: 'Gestión' },
        { id: '4', label: 'Investigación' }
      ]
    }
  ]); // Mock categorized filters

  const handleAddFilter = (newFilter: string) => {
    if (!appliedFilters.includes(newFilter)) {
      setAppliedFilters(prev => [...prev, newFilter]);
    }
  };

  const handleRemoveFilter = (filterToRemove: string) => {
    setAppliedFilters(prev => prev.filter(f => f !== filterToRemove));
  };

  const handleChartClick = (label: string) => {
    if (onNavigateToListado) {
      onNavigateToListado(label);
    } else {
      // If we're not navigating, maybe add the label as a filter to demonstrate functionality
      if (!appliedFilters.includes(label)) {
        setAppliedFilters(prev => [...prev, label]);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent, label: string, value: number, color: string) => {
    setTooltip({
      x: e.clientX,
      y: e.clientY,
      label,
      value,
      color
    });
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  useEffect(() => {
    // In a real scenario, this would be: 
    // fetch('/api/inicio/mapa-docente').then(res => res.json()).then(setData)
    
    // Simulate factor based on applied filters count to update graphs
    const factor = appliedFilters.length > 0 ? (1 / (appliedFilters.length + 1)) : 1;
    const applyFactor = (val) => Math.max(1, Math.round(val * factor));

    setTimeout(() => {
      setData({
        totalDocentes: applyFactor(700),
        unitTypes: [
          { label: 'Centros', value: applyFactor(150), color: '#3b82f6' },
          { label: 'Departamentos', value: applyFactor(350), color: '#8b5cf6' },
          { label: 'Institutos', value: applyFactor(200), color: '#10b981' }
        ],
        centros: [
          { label: 'Creación. Art. Coral', value: applyFactor(50), color: '#f472b6' },
          { label: 'Creación. Art. Orq.', value: applyFactor(50), color: '#10b981' },
          { label: 'Tornambé Centro de Creación', value: applyFactor(50), color: '#fbbf24' }
        ],
        departamentos: [
          { label: 'Artes Visuales', value: applyFactor(100), color: '#7F072D' },
          { label: 'Filosofía y Cs. de la Edu.', value: applyFactor(150), color: '#FA4A3B' },
          { label: 'Física, Química y Tec.', value: applyFactor(50), color: '#FFC801' },
          { label: 'Geografía', value: applyFactor(50), color: '#F9E83A' },
          { label: 'Historia', value: applyFactor(50), color: '#FFB605' },
          { label: 'Lengua y Lit. Inglesa', value: applyFactor(50), color: '#BC0032' },
          { label: 'Letras', value: applyFactor(50), color: '#F0F6BA' },
          { label: 'Matemática', value: applyFactor(50), color: '#FF8728' },
          { label: 'Música', value: applyFactor(50), color: '#5B0A2B' },
          { label: 'Turismo', value: applyFactor(50), color: '#FFD703' }
        ],
        institutos: [
          { label: 'Ciencias Básicas - ICB', value: applyFactor(70), color: '#BC88FF' },
          { label: 'Geografía Aplicada', value: applyFactor(40), color: '#08485E' },
          { label: 'Instituto de Est. Musicales', value: applyFactor(50), color: '#3CB0CD' },
          { label: 'Instituto de Exp. Visual', value: applyFactor(50), color: '#75D5F3' },
          { label: 'Instituto de Filosofía', value: applyFactor(60), color: '#B4E7F8' },
          { label: 'Instituto de Inv. Ling. y Filolog.', value: applyFactor(50), color: '#ADFFBC' },
          { label: 'Investig. Aqueológ. y Museo', value: applyFactor(30), color: '#1BEE9A' },
          { label: 'Investig. en Cs. de la Edu.', value: applyFactor(50), color: '#21C063' },
          { label: 'Investig. en Ed. en Cs. Exper.', value: applyFactor(50), color: '#229631' },
          { label: 'Investig. en Historia Reg. y Arg.', value: applyFactor(50), color: '#0C5A23' },
          { label: 'Litertura - Ricardo Güiraldes', value: applyFactor(50), color: '#8A38F5' }
        ]
      });
    }, 500); // simulate loading
  }, [appliedFilters]);

  return (
    <div className="dashboard-layout">
      <Topbar onLogout={onLogout} />

      {tooltip && (
        <div className="chart-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', backgroundColor: tooltip.color, borderRadius: '50%' }}></span>
            <span>{tooltip.label}</span>
          </div>
          <div style={{ marginTop: '4px', paddingLeft: '16px' }}>
            <strong>{tooltip.value}</strong> docentes asignados
          </div>
        </div>
      )}

      <div className="dashboard-body">
        <Sidebar activeItem="inicio" />

        {/* Main Content */}
        <main className="main-content">
          <div className="content-area">
            <FilterBar 
              availableFilters={availableFilters}
              appliedFilters={appliedFilters}
              onAddFilter={handleAddFilter}
              onRemoveFilter={handleRemoveFilter}
              onSearch={(term) => console.log('Searching for:', term)}
            />

            {!data ? (
              <div className="loading-state">Cargando tablero...</div>
            ) : (
              <div className="dashboard-grid">
                {/* Main Card */}
                <div className="card main-card">
                  <div className="card-header main-card-header">
                    <h2>Fac. de Filosofía, Humanidades y Artes</h2>
                  </div>
                  <div className="card-content main-card-content">
                    <div className="legend-section">
                      <ul className="legend-list">
                        {data.unitTypes.map((item: DonutData, idx: number) => (
                          <li key={idx} className="legend-item">
                            <span className="legend-color" style={{ backgroundColor: item.color }}></span>
                            <span className="legend-label">{item.label}</span>
                          </li>
                        ))}
                      </ul>
                      <button className="details-btn">Ver Detalles</button>
                    </div>
                    <div className="chart-section">
                      <DonutChart
                        data={data.unitTypes}
                        size={200}
                        thickness={40}
                        centerText={data.totalDocentes.toString()}
                        centerSubtext="Docentes"
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                        onClick={handleChartClick}
                      />
                    </div>
                  </div>
                </div>

                {/* Sub Cards */}
                <div className="sub-cards-container">
                  {/* Centros */}
                  <div className="card sub-card">
                    <div className="card-header sub-card-header">
                      <h3>Centros</h3>
                    </div>
                    <div className="card-content sub-card-content">
                      <div className="legend-wrapper-sm">
                        <ul className="legend-list compact">
                          {data.centros.map((item: DonutData, idx: number) => (
                            <li key={idx} className="legend-item">
                              <span className="legend-color" style={{ backgroundColor: item.color }}></span>
                              <span className="legend-label">{item.label}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="chart-section-sm">
                        <DonutChart
                          data={data.centros}
                          size={100}
                          thickness={20}
                          centerText={data.centros.reduce((acc: number, val: DonutData) => acc + val.value, 0).toString()}
                          centerSubtext="Docentes"
                          onMouseMove={handleMouseMove}
                          onMouseLeave={handleMouseLeave}
                          onClick={handleChartClick}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Departamentos */}
                  <div className="card sub-card">
                    <div className="card-header sub-card-header">
                      <h3>Departamentos</h3>
                    </div>
                    <div className="card-content sub-card-content">
                      <div className="legend-wrapper-sm">
                        <ul className="legend-list compact">
                          {data.departamentos.map((item: DonutData, idx: number) => (
                            <li key={idx} className="legend-item">
                              <span className="legend-color" style={{ backgroundColor: item.color }}></span>
                              <span className="legend-label">{item.label}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="chart-section-sm">
                        <DonutChart
                          data={data.departamentos}
                          size={100}
                          thickness={20}
                          centerText={data.departamentos.reduce((acc: number, val: DonutData) => acc + val.value, 0).toString()}
                          centerSubtext="Docentes"
                          onMouseMove={handleMouseMove}
                          onMouseLeave={handleMouseLeave}
                          onClick={handleChartClick}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Institutos */}
                  <div className="card sub-card">
                    <div className="card-header sub-card-header">
                      <h3>Institutos</h3>
                    </div>
                    <div className="card-content sub-card-content">
                      <div className="legend-wrapper-sm">
                        <ul className="legend-list compact">
                          {data.institutos.map((item: DonutData, idx: number) => (
                            <li key={idx} className="legend-item">
                              <span className="legend-color" style={{ backgroundColor: item.color }}></span>
                              <span className="legend-label">{item.label}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="chart-section-sm">
                        <DonutChart
                          data={data.institutos}
                          size={100}
                          thickness={20}
                          centerText={data.institutos.reduce((acc: number, val: DonutData) => acc + val.value, 0).toString()}
                          centerSubtext="Docentes"
                          onMouseMove={handleMouseMove}
                          onMouseLeave={handleMouseLeave}
                          onClick={handleChartClick}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
