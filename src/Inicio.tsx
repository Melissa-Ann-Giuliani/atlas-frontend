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
      <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.1} fill="#6b7280" pointerEvents="none">
        {centerSubtext}
      </text>
    </svg>
  );
};

export default function Inicio({ onLogout, onNavigate, onNavigateToListado }: { onLogout?: () => void, onNavigate?: (page: any) => void, onNavigateToListado?: (filter: string) => void }) {
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
  const [availableFilters, setAvailableFilters] = useState<FilterCategory[]>([]);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };

        const [resCaracteres, resCategorias, resDedicaciones, resTiposUnidad] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/api/caracteres`, { headers }),
          fetch(`${import.meta.env.VITE_API_URL}/api/categorias`, { headers }),
          fetch(`${import.meta.env.VITE_API_URL}/api/dedicaciones`, { headers }),
          fetch(`${import.meta.env.VITE_API_URL}/api/tipos-unidad`, { headers })
        ]);

        const [caracteres, categorias, dedicaciones, tiposUnidad] = await Promise.all([
          resCaracteres.ok ? resCaracteres.json() : [],
          resCategorias.ok ? resCategorias.json() : [],
          resDedicaciones.ok ? resDedicaciones.json() : [],
          resTiposUnidad.ok ? resTiposUnidad.json() : []
        ]);

        setAvailableFilters([
          {
            id: 'caracter',
            name: 'Caracter',
            options: caracteres.map((item: any) => ({
              id: (item.caracterId || item.id)?.toString() || '',
              label: item.caracterNombre || item.nombre || 'Desconocido'
            }))
          },
          {
            id: 'categoria',
            name: 'Categoría',
            options: categorias.map((item: any) => ({
              id: (item.categoriaId || item.id)?.toString() || '',
              label: item.categoriaNombre || item.nombre || 'Desconocido'
            }))
          },
          {
            id: 'dedicacion',
            name: 'Dedicación',
            options: dedicaciones.map((item: any) => ({
              id: (item.dedicacionId || item.id)?.toString() || '',
              label: item.dedicacionNombre || item.nombre || 'Desconocido'
            }))
          },
          {
            id: 'tipoUnidad',
            name: 'Tipo de Unidad',
            options: tiposUnidad.map((item: any) => ({
              id: (item.tipoUnidadId || item.id)?.toString() || '',
              label: item.tipoUnidadNombre || item.nombre || 'Desconocido'
            }))
          }
        ]);
      } catch (err) {
        console.error("Error fetching filter options:", err);
      }
    };

    fetchFilters();
  }, []);

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
    // ---- BACKEND INTEGRATION ----
    const queryParams = new URLSearchParams();
    appliedFilters.forEach(filter => {
      const [categoryName, optionLabel] = filter.split(': ');
      if (categoryName && optionLabel) {
        const category = availableFilters.find(c => c.name === categoryName);
        if (category) {
          const option = category.options.find(o => o.label === optionLabel);
          if (option) queryParams.append(`${category.id}Id`, option.id);
        }
      }
    });

    const token = localStorage.getItem('token');
    fetch(`${import.meta.env.VITE_API_URL}/api/inicio/mapa-docente?${queryParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Error en la respuesta del servidor');
        return res.json();
      })
      .then(fetchedData => {
        console.log("=== BACKEND JSON DATA ===", fetchedData);
        const CENTROS_COLORS = ['#e87a98', '#00b171', '#efc562', '#f4a261', '#e76f51'];
        const DEPARTAMENTOS_COLORS = ['#f24c3d', '#7d0f36', '#fdc500', '#e9f5b9', '#f97316', '#ef4444', '#b91c1c'];
        const INSTITUTOS_COLORS = ['#b388ff', '#68d8d6', '#22b2da', '#1e4a5d', '#ed2b59', '#312e81', '#3b82f6', '#0ea5e9'];
        const DEFAULT_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f472b6', '#fbbf24'];

        const addColors = (items: any[], palette: string[]) => items?.map((item, idx) => ({
          ...item,
          color: item.color || palette[idx % palette.length]
        })) || [];

        // Apply colors and update state directly from the flattened backend data
        setData({
          totalDocentes: fetchedData.totalDocentes || 0,
          unitTypes: addColors(fetchedData.unitTypes || [], DEFAULT_COLORS),
          centros: addColors(fetchedData.centros || [], CENTROS_COLORS),
          departamentos: addColors(fetchedData.departamentos || [], DEPARTAMENTOS_COLORS),
          institutos: addColors(fetchedData.institutos || [], INSTITUTOS_COLORS)
        });
      })
      .catch(err => console.error("Error fetching teaching map data:", err));
    // ------------------------------------------------------------------------
  }, [appliedFilters, availableFilters]);

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
        <Sidebar activeItem="inicio" onNavigate={onNavigate} />

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
                        data={data.unitTypes || []}
                        size={200}
                        thickness={40}
                        centerText={(data.totalDocentes || 0).toString()}
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
                          data={data.centros || []}
                          size={100}
                          thickness={20}
                          centerText={(data.centros || []).reduce((acc: number, val: DonutData) => acc + val.value, 0).toString()}
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
                          data={data.departamentos || []}
                          size={100}
                          thickness={20}
                          centerText={(data.departamentos || []).reduce((acc: number, val: DonutData) => acc + val.value, 0).toString()}
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
                          data={data.institutos || []}
                          size={100}
                          thickness={20}
                          centerText={(data.institutos || []).reduce((acc: number, val: DonutData) => acc + val.value, 0).toString()}
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
