import React, { useState, useEffect } from 'react';
import './Inicio.css';
import Sidebar from './Sidebar';
import Topbar from './Topbar';


const FilterIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);



// Types
interface DonutData {
  label: string;
  value: number;
  color: string;
}

// Chart Component
const DonutChart = ({ data, size = 200, thickness = 30, centerText, centerSubtext }: { data: DonutData[], size?: number, thickness?: number, centerText: string, centerSubtext: string }) => {
  const center = size / 2;
  const radius = center - thickness / 2;
  const circumference = 2 * Math.PI * radius;
  
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentOffset = 0;
  
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {data.map((item, index) => {
        const valueRatio = total > 0 ? item.value / total : 0;
        const strokeDasharray = `${valueRatio * circumference} ${circumference}`;
        const strokeDashoffset = -currentOffset;
        currentOffset += valueRatio * circumference;
        
        return (
          <circle
            key={index}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={item.color}
            strokeWidth={thickness}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            transform={`rotate(-90 ${center} ${center})`}
            style={{ transition: 'stroke-dasharray 0.5s ease, stroke-dashoffset 0.5s ease' }}
          />
        );
      })}
      <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.18} fontWeight="bold" fill="#1f2937">
        {centerText}
      </text>
      <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.08} fill="#6b7280">
        {centerSubtext}
      </text>
    </svg>
  );
};

export default function Inicio({ onLogout }: { onLogout?: () => void }) {
  // Mock Data mimicking the backend RF-04 API response
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    // In a real scenario, this would be: 
    // fetch('/api/inicio/mapa-docente').then(res => res.json()).then(setData)
    setTimeout(() => {
      setData({
        totalDocentes: 700,
        unitTypes: [
          { label: 'Centros', value: 150, color: '#3b82f6' },
          { label: 'Departamentos', value: 350, color: '#8b5cf6' },
          { label: 'Institutos', value: 200, color: '#10b981' }
        ],
        centros: [
          { label: 'Creación. Art. Coral', value: 50, color: '#f472b6' },
          { label: 'Creación. Art. Orq.', value: 50, color: '#10b981' },
          { label: 'Tornambé Centro de Creación', value: 50, color: '#fbbf24' }
        ],
        departamentos: [
          { label: 'Artes Visuales', value: 100, color: '#ef4444' },
          { label: 'Física, Química y Tec.', value: 50, color: '#10b981' },
          { label: 'Filosofía y Cs. de la Edu.', value: 150, color: '#fbbf24' },
          { label: 'Geografía', value: 50, color: '#eab308' }
        ],
        institutos: [
          { label: 'Ciencias Básicas - ICB', value: 70, color: '#a855f7' },
          { label: 'Geografía Aplicada', value: 40, color: '#38bdf8' },
          { label: 'Instituto de Filosofía', value: 60, color: '#2dd4bf' },
          { label: 'Investig. Arqueológ. y Museo', value: 30, color: '#f43f5e' }
        ]
      });
    }, 500); // simulate loading
  }, []);

  return (
    <div className="dashboard-layout">
      <Topbar onLogout={onLogout} />

      <div className="dashboard-body">
        <Sidebar activeItem="inicio" />

        {/* Main Content */}
        <main className="main-content">
          <div className="content-area">
          <div className="filter-bar">
            <button className="filter-btn">
              <FilterIcon />
              <span>Filtros</span>
            </button>
            <div className="search-input-wrapper">
              <input type="text" placeholder="Ingrese valor" className="search-input" />
              <SearchIcon />
            </div>
          </div>

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
                      size={240} 
                      thickness={40} 
                      centerText={data.totalDocentes.toString()} 
                      centerSubtext="Docentes" 
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
                    <ul className="legend-list compact">
                      {data.centros.map((item: DonutData, idx: number) => (
                        <li key={idx} className="legend-item">
                          <span className="legend-color" style={{ backgroundColor: item.color }}></span>
                          <span className="legend-label">{item.label}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="chart-section-sm">
                      <DonutChart 
                        data={data.centros} 
                        size={140} 
                        thickness={25} 
                        centerText={data.centros.reduce((acc: number, val: any) => acc + val.value, 0).toString()} 
                        centerSubtext="Docentes" 
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
                    <ul className="legend-list compact">
                      {data.departamentos.map((item: DonutData, idx: number) => (
                        <li key={idx} className="legend-item">
                          <span className="legend-color" style={{ backgroundColor: item.color }}></span>
                          <span className="legend-label">{item.label}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="chart-section-sm">
                      <DonutChart 
                        data={data.departamentos} 
                        size={140} 
                        thickness={25} 
                        centerText={data.departamentos.reduce((acc: number, val: any) => acc + val.value, 0).toString()} 
                        centerSubtext="Docentes" 
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
                    <ul className="legend-list compact">
                      {data.institutos.map((item: DonutData, idx: number) => (
                        <li key={idx} className="legend-item">
                          <span className="legend-color" style={{ backgroundColor: item.color }}></span>
                          <span className="legend-label">{item.label}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="chart-section-sm">
                      <DonutChart 
                        data={data.institutos} 
                        size={140} 
                        thickness={25} 
                        centerText={data.institutos.reduce((acc: number, val: any) => acc + val.value, 0).toString()} 
                        centerSubtext="Docentes" 
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
