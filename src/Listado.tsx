import { useState, useEffect, useMemo } from 'react';
import './Listado.css';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import FilterBar, { type FilterCategory } from './components/FilterBar';
import { FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight } from 'react-icons/fi';

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

interface Docente {
  usuarioId?: number;
  nombre: string;
  apellido?: string;
  origen: string;
  unidad: string;
  categoria: string;
  dedicacion: string;
  caracter: string;
  estado: string;
}

export default function Listado({ onLogout, onNavigate }: { onLogout?: () => void, onNavigate?: (page: any, data?: any) => void }) {
  const [docentesFilters, setDocentesFilters] = useState<string[]>(['Estado: Activo']);
  const [cargosFilters, setCargosFilters] = useState<string[]>(['Estado: Asignado']);
  const [licenciasFilters, setLicenciasFilters] = useState<string[]>([]);
  const [availableFilters, setAvailableFilters] = useState<FilterCategory[]>([
    {
      id: 'estado',
      name: 'Estado',
      options: [
        { id: 'Activo', label: 'Activo' },
        { id: 'Licencia', label: 'Licencia' }
      ]
    }
  ]);
  const [searchTerm, setSearchTerm] = useState('');

  // Tab state
  const [activeTab, setActiveTab] = useState<'docentes' | 'cargos' | 'licencias'>('docentes');

  const appliedFilters = activeTab === 'docentes' ? docentesFilters : activeTab === 'cargos' ? cargosFilters : licenciasFilters;

  const dynamicAvailableFilters = useMemo(() => {
    return availableFilters.map(filter => {
      if (filter.id === 'estado') {
        if (activeTab === 'cargos') {
          return {
            ...filter,
            options: [
              { id: 'Asignado', label: 'Asignado' },
              { id: 'Libre', label: 'Libre' }
            ]
          };
        }
        return {
          ...filter,
          options: [
            { id: 'Activo', label: 'Activo' },
            { id: 'Licencia', label: 'Licencia' }
          ]
        };
      }
      return filter;
    });
  }, [availableFilters, activeTab]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [docentesData, setDocentesData] = useState<Docente[]>([]);
  const [cargosData, setCargosData] = useState<Cargo[]>([]);

  // Rows per page based on screen height
  const [rowsPerPage, setRowsPerPage] = useState(12);

  useEffect(() => {
    const handleResize = () => {
      const height = window.innerHeight;
      if (height < 700) {
        setRowsPerPage(6);
      } else if (height < 900) {
        setRowsPerPage(8);
      } else {
        setRowsPerPage(12);
      }
      setCurrentPage(1); // Reset to page 1 on resize to prevent out of bounds
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        const [resCaracteres, resCategorias, resDedicaciones, resTiposUnidad] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8081'}/api/caracteres`, { headers }),
          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8081'}/api/categorias`, { headers }),
          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8081'}/api/dedicaciones`, { headers }),
          fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8081'}/api/tipos-unidad`, { headers })
        ]);

        if (resCaracteres.status === 401 || resCategorias.status === 401 || resDedicaciones.status === 401 || resTiposUnidad.status === 401) {
          onLogout();
          return;
        }

        const [caracteres, categorias, dedicaciones, tiposUnidad] = await Promise.all([
          resCaracteres.ok ? resCaracteres.json() : [],
          resCategorias.ok ? resCategorias.json() : [],
          resDedicaciones.ok ? resDedicaciones.json() : [],
          resTiposUnidad.ok ? resTiposUnidad.json() : []
        ]);

        setAvailableFilters([
          {
            id: 'estado',
            name: 'Estado',
            options: [
              { id: 'Activo', label: 'Activo' },
              { id: 'Licencia', label: 'Licencia' }
            ]
          },
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
            id: 'origen',
            name: 'Origen',
            options: dedicaciones.map((item: any) => ({
              id: (item.origenId || item.id)?.toString() || '',
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
    if (activeTab === 'docentes') {
      if (!docentesFilters.includes(newFilter)) setDocentesFilters(prev => [...prev, newFilter]);
    } else if (activeTab === 'cargos') {
      if (!cargosFilters.includes(newFilter)) setCargosFilters(prev => [...prev, newFilter]);
    } else {
      if (!licenciasFilters.includes(newFilter)) setLicenciasFilters(prev => [...prev, newFilter]);
    }
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleRemoveFilter = (filterToRemove: string) => {
    if (activeTab === 'docentes') {
      setDocentesFilters(prev => prev.filter(f => f !== filterToRemove));
    } else if (activeTab === 'cargos') {
      setCargosFilters(prev => prev.filter(f => f !== filterToRemove));
    } else {
      setLicenciasFilters(prev => prev.filter(f => f !== filterToRemove));
    }
    setCurrentPage(1);
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: (currentPage - 1).toString(),
          size: rowsPerPage.toString()
        });

        if (searchTerm) {
          params.append('search', searchTerm);
        }

        appliedFilters.forEach(filter => {
          const [categoryName, optionLabel] = filter.split(': ');
          if (categoryName && optionLabel) {
            const category = dynamicAvailableFilters.find(c => c.name === categoryName);
            if (category) {
              const option = category.options.find(o => o.label === optionLabel);
              if (option) {
                // Send both the ID (like categoryId=1) and the exact label (like categoria=Titular)
                // so the backend can use whichever it is actually looking for.
                params.append(`${category.id}Id`, option.id);
                params.append(category.id, option.label);
              }
            }
          }
        });

        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        const endpoint = activeTab === 'cargos' ? '/api/cargos' : '/api/docentes';

        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8081'}${endpoint}?${params.toString()}`, {
          headers
        });
        if (response.ok) {
          const data = await response.json();
          if (activeTab === 'cargos') {
            setCargosData(data.content || []);
          } else {
            setDocentesData(data.content || []);
          }
          setTotalElements(data.totalElements || 0);
          setTotalPages(data.totalPages || 1);
        } else {
          console.error(`Failed to fetch ${activeTab}, status:`, response.status);
          if (response.status === 401) {
            if (onLogout) onLogout();
          }
        }
      } catch (error) {
        console.error(`Error fetching ${activeTab}:`, error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentPage, rowsPerPage, searchTerm, appliedFilters, activeTab]);

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalElements);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const renderPageButtons = () => {
    const buttons = [];
    const maxVisibleButtons = 3;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisibleButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxVisibleButtons - 1);

    if (endPage - startPage + 1 < maxVisibleButtons) {
      startPage = Math.max(1, endPage - maxVisibleButtons + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          className={`page-btn ${currentPage === i ? 'active' : ''}`}
          onClick={() => goToPage(i)}
        >
          {i}
        </button>
      );
    }
    return buttons;
  };

  return (
    <div className="dashboard-layout">
      <Topbar onLogout={onLogout} />

      <div className="dashboard-body">
        <Sidebar activeItem="listado" onNavigate={onNavigate} />

        <main className="main-content">
          <div className="content-area listado-content-area">

            <div className="listado-inner-container">
              <div className="listado-header-row">
                <div className="listado-header-left">
                  <h1 className="listado-title">{activeTab === 'cargos' ? 'Listado de Cargos' : 'Listado de Docentes'}</h1>
                  <div className="listado-tabs">
                    <button
                      className={`tab-btn ${activeTab === 'docentes' ? 'active' : ''}`}
                      onClick={() => { setActiveTab('docentes'); setCurrentPage(1); }}
                    >
                      Docentes
                    </button>
                    <button
                      className={`tab-btn ${activeTab === 'cargos' ? 'active' : ''}`}
                      onClick={() => { setActiveTab('cargos'); setCurrentPage(1); }}
                    >
                      Cargos
                    </button>
                    <button
                      className={`tab-btn ${activeTab === 'licencias' ? 'active' : ''}`}
                      onClick={() => { setActiveTab('licencias'); setCurrentPage(1); }}
                    >
                      Licencias
                    </button>
                  </div>
                </div>

                <div className="listado-filter-wrapper">
                  <FilterBar
                    availableFilters={dynamicAvailableFilters}
                    appliedFilters={appliedFilters}
                    onAddFilter={handleAddFilter}
                    onRemoveFilter={handleRemoveFilter}
                    onSearch={(term) => {
                      setSearchTerm(term);
                      setCurrentPage(1);
                    }}
                  />
                </div>
              </div>

              <div className="listado-table-container">
                <table className="listado-table">
                  <thead>
                    {activeTab === 'cargos' ? (
                      <tr>
                        <th>Número</th>
                        <th>FechaCreación</th>
                        <th>Estado</th>
                        <th>Docente</th>
                        <th>Categoría</th>
                        <th>Dedicación</th>
                        <th>Caracter</th>
                      </tr>
                    ) : (
                      <tr>
                        <th>Nombre</th>
                        <th>Origen</th>
                        <th>Unidad</th>
                        <th>Categoría</th>
                        <th>Dedicación</th>
                        <th>Caracter</th>
                        <th>Estado</th>
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>Cargando {activeTab}...</td>
                      </tr>
                    ) : activeTab === 'cargos' ? (
                      cargosData.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>No se encontraron cargos</td>
                        </tr>
                      ) : (
                        cargosData.map((cargo, idx) => (
                          <tr key={idx}>
                            <td>{cargo.numero}</td>
                            <td>{cargo.fechaCreacion ? new Date(cargo.fechaCreacion).toLocaleDateString() : ''}</td>
                            <td>{cargo.estado}</td>
                            <td>{cargo.apellidoNombre}</td>
                            <td>{cargo.categoria}</td>
                            <td>{cargo.dedicacion}</td>
                            <td>{cargo.caracter}</td>
                          </tr>
                        ))
                      )
                    ) : (
                      docentesData.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>No se encontraron docentes</td>
                        </tr>
                      ) : (
                        docentesData.map((docente, idx) => (
                          <tr key={idx} onClick={() => onNavigate && onNavigate('docente_detalle', docente)} style={{ cursor: 'pointer' }}>
                            <td>{docente.apellido ? `${docente.apellido}, ${docente.nombre}` : docente.nombre}</td>
                            <td>{docente.origen}</td>
                            <td>{docente.unidad}</td>
                            <td>{docente.categoria}</td>
                            <td>{docente.dedicacion}</td>
                            <td>{docente.caracter}</td>
                            <td>{docente.estado}</td>
                          </tr>
                        ))
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="listado-pagination">
              <span className="pagination-info">
                {totalElements > 0 ? `${startIndex + 1}-${endIndex} ${activeTab} de ${totalElements}` : `0 ${activeTab}`}
              </span>
              <div className="pagination-controls">
                <button className="page-btn" onClick={() => goToPage(1)} disabled={currentPage === 1}><FiChevronsLeft /></button>
                <button className="page-btn" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}><FiChevronLeft /></button>

                {renderPageButtons()}

                {totalPages > 3 && currentPage < totalPages - 1 && (
                  <button className="page-btn dots">...</button>
                )}

                <button className="page-btn" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}><FiChevronRight /></button>
                <button className="page-btn" onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages}><FiChevronsRight /></button>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
