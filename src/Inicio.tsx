import React, { useState, useEffect } from 'react';
import './Inicio.css';

// SVG Icons
const SunIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4"></circle>
    <path d="M12 2v2"></path>
    <path d="M12 20v2"></path>
    <path d="M4.93 4.93l1.41 1.41"></path>
    <path d="M17.66 17.66l1.41 1.41"></path>
    <path d="M2 12h2"></path>
    <path d="M20 12h2"></path>
    <path d="M4.93 19.07l1.41-1.41"></path>
    <path d="M17.66 6.34l1.41-1.41"></path>
  </svg>
);

const LogoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);

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

const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
    <polyline points="9 22 9 12 15 12 15 22"></polyline>
  </svg>
);

const ListIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 6h13"></path>
    <path d="M8 12h13"></path>
    <path d="M8 18h13"></path>
    <rect x="3" y="4" width="2" height="2"></rect>
    <rect x="3" y="10" width="2" height="2"></rect>
    <rect x="3" y="16" width="2" height="2"></rect>
  </svg>
);

const DocsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);

const HistoryIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v2"></path>
    <path d="M12 20v2"></path>
    <path d="M2 12h2"></path>
    <path d="M20 12h2"></path>
    <circle cx="12" cy="12" r="8"></circle>
    <polyline points="12 8 12 12 15 15"></polyline>
  </svg>
);

const HelpIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

const CollapseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="11 17 6 12 11 7"></polyline>
    <polyline points="18 17 13 12 18 7"></polyline>
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
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-icon">
            <div className="logo-quadrant yellow">F</div>
            <div className="logo-quadrant green">F</div>
            <div className="logo-quadrant green-dark">H</div>
            <div className="logo-quadrant green">A</div>
          </div>
          <h1 className="logo-text">Atlas</h1>
        </div>

        <nav className="sidebar-nav">
          <a href="#" className="nav-item active">
            <HomeIcon />
            <span>Inicio</span>
          </a>
          <a href="#" className="nav-item">
            <ListIcon />
            <span>Listado</span>
          </a>
          <a href="#" className="nav-item">
            <DocsIcon />
            <span>Trámites</span>
          </a>
          <a href="#" className="nav-item">
            <SettingsIcon />
            <span>Gestión</span>
          </a>
          <a href="#" className="nav-item">
            <HistoryIcon />
            <span>Historial</span>
          </a>
        </nav>

        <div className="sidebar-collapse">
          <button className="collapse-btn">
            <CollapseIcon />
          </button>
        </div>

        <div className="sidebar-footer">
          <button className="help-btn">
            <HelpIcon />
            <span>Ayuda</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <div className="topbar-actions">
            <button className="icon-btn"><SunIcon /></button>
            <button className="icon-btn" onClick={onLogout} title="Cerrar sesión"><LogoutIcon /></button>
            <div className="user-avatar">F</div>
          </div>
        </header>

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
  );
}
