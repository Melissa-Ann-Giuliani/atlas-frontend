import { useState, useEffect } from 'react';
import './Listado.css';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import FilterBar, { type FilterCategory } from './FilterBar';
import { FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight } from 'react-icons/fi';

interface Docente {
  nombre: string;
  origen: string;
  unidad: string;
  categoria: string;
  dedicacion: string;
  caracter: string;
  estado: string;
}

export default function Listado({ onLogout, onNavigate }: { onLogout?: () => void, onNavigate?: (page: any) => void }) {
  const [appliedFilters, setAppliedFilters] = useState<string[]>([]);
  const [availableFilters, setAvailableFilters] = useState<FilterCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Tab state
  const [activeTab, setActiveTab] = useState<'docentes' | 'cargos' | 'licencias'>('docentes');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [docentesData, setDocentesData] = useState<Docente[]>([]);

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
    // Mock fetching filters
    setAvailableFilters([
      {
        id: 'caracter',
        name: 'Caracter',
        options: [
          { id: '1', label: 'Efectivo' },
          { id: '2', label: 'Interino' }
        ]
      }
    ]);
  }, []);

  const handleAddFilter = (newFilter: string) => {
    if (!appliedFilters.includes(newFilter)) {
      setAppliedFilters(prev => [...prev, newFilter]);
      setCurrentPage(1); // Reset to first page when filtering
    }
  };

  const handleRemoveFilter = (filterToRemove: string) => {
    setAppliedFilters(prev => prev.filter(f => f !== filterToRemove));
    setCurrentPage(1);
  };

  useEffect(() => {
    const fetchDocentes = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: (currentPage - 1).toString(),
          size: rowsPerPage.toString()
        });

        if (searchTerm) {
          params.append('search', searchTerm);
        }

        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8081'}/api/docentes?${params.toString()}`, {
          headers
        });
        if (response.ok) {
          const data = await response.json();
          setDocentesData(data.content || []);
          setTotalElements(data.totalElements || 0);
          setTotalPages(data.totalPages || 1);
        } else {
          console.error("Failed to fetch docentes, status:", response.status);
        }
      } catch (error) {
        console.error("Error fetching docentes:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocentes();
  }, [currentPage, rowsPerPage, searchTerm, appliedFilters]);

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
                <h1 className="listado-title">Listado de Docentes</h1>
                <div className="listado-filter-wrapper">
                  <FilterBar
                    availableFilters={availableFilters}
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

              <div className="listado-tabs">
                <button
                  className={`tab-btn ${activeTab === 'docentes' ? 'active' : ''}`}
                  onClick={() => setActiveTab('docentes')}
                >
                  Docentes
                </button>
                <button
                  className={`tab-btn ${activeTab === 'cargos' ? 'active' : ''}`}
                  onClick={() => setActiveTab('cargos')}
                >
                  Cargos
                </button>
                <button
                  className={`tab-btn ${activeTab === 'licencias' ? 'active' : ''}`}
                  onClick={() => setActiveTab('licencias')}
                >
                  Licencias
                </button>
              </div>

              <div className="listado-table-container">
                <table className="listado-table">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Origen</th>
                      <th>Unidad</th>
                      <th>Categoría</th>
                      <th>Dedicación</th>
                      <th>Caracter</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>Cargando docentes...</td>
                      </tr>
                    ) : docentesData.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>No se encontraron docentes</td>
                      </tr>
                    ) : (
                      docentesData.map((docente, idx) => (
                        <tr key={idx}>
                          <td>{docente.nombre}</td>
                          <td>{docente.origen}</td>
                          <td>{docente.unidad}</td>
                          <td>{docente.categoria}</td>
                          <td>{docente.dedicacion}</td>
                          <td>{docente.caracter}</td>
                          <td>{docente.estado}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="listado-pagination">
              <span className="pagination-info">
                {totalElements > 0 ? `${startIndex + 1}-${endIndex} docentes de ${totalElements}` : '0 docentes'}
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
