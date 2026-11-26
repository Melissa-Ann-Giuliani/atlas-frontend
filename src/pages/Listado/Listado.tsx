import { useState, useEffect, useMemo } from 'react';
import './Listado.css';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import FilterBar, { type FilterCategory, type FilterOption } from '../../components/FilterBar';
import ExportButton from '../../components/ExportButton';
import { FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight, FiChevronUp, FiChevronDown } from 'react-icons/fi';

type SortDirection = 'asc' | 'desc';

type DocenteSortColumn =
  | 'legajo'
  | 'nombre'
  | 'origen'
  | 'unidad'
  | 'categoria'
  | 'dedicacion'
  | 'caracter'
  | 'estado';

type CargoSortColumn =
  | 'numero'
  | 'fechaCreacion'
  | 'estado'
  | 'docente'
  | 'categoria'
  | 'dedicacion'
  | 'caracter';

type LicenciaSortColumn =
  | 'nroResolucion'
  | 'motivoNombre'
  | 'docenteNombreCompleto'
  | 'fechaInicio'
  | 'fechaFin'
  | 'diasUsados'
  | 'estado';

interface SortConfig<T extends string> {
  column: T;
  direction: SortDirection;
}

interface Licencia {
  id: number;
  nroResolucion: string;
  motivoNombre: string;
  docenteNombreCompleto: string;
  fechaInicio: string;
  fechaFin: string;
  diasUsados: number;
  estado: string;
}

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
  legajo?: number | string;
  nombre: string;
  apellido?: string;
  origen: string;
  unidad: string;
  categoria: string;
  dedicacion: string;
  caracter: string;
  estado: string;
}

interface ListadoProps {
  onLogout?: () => void;
  onNavigate?: (page: any, data?: any) => void;
  initialTab?: 'docentes' | 'cargos' | 'licencias';
  initialFilters?: string[] | null;
  onTabChange?: (tab: 'docentes' | 'cargos' | 'licencias') => void;
}

const calculateRowsPerPage = (height: number): number => {
  if (height < 700) {
    return 6;
  } else if (height < 900) {
    return 8;
  } else {
    return 12;
  }
};

export default function Listado({
  onLogout,
  onNavigate,
  initialTab = 'docentes',
  initialFilters = null,
  onTabChange
}: ListadoProps) {
  const [docentesFilters, setDocentesFilters] = useState<string[]>(() =>
    initialFilters && initialFilters.length > 0 ? initialFilters : ['Estado: Activo']
  );
  const [cargosFilters, setCargosFilters] = useState<string[]>(['Estado: Asignado']);
  const [licenciasFilters, setLicenciasFilters] = useState<string[]>([]);
  const [motivosOptions, setMotivosOptions] = useState<FilterOption[]>([]);
  const [filtersLoaded, setFiltersLoaded] = useState(false);
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
  const [activeTab, setActiveTab] = useState<'docentes' | 'cargos' | 'licencias'>(initialTab);

  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
      setCurrentPage(1);
    }
  }, [initialTab]);

  const handleTabChange = (tab: 'docentes' | 'cargos' | 'licencias') => {
    setActiveTab(tab);
    setCurrentPage(1);
    setExportError(null);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  const appliedFilters = activeTab === 'docentes' ? docentesFilters : activeTab === 'cargos' ? cargosFilters : licenciasFilters;

  const dynamicAvailableFilters = useMemo(() => {
    if (activeTab === 'licencias') {
      return [
        {
          id: 'motivo',
          name: 'Motivo',
          options: motivosOptions
        }
      ];
    }
    return availableFilters
      .filter(filter => !(activeTab === 'cargos' && filter.id === 'unidad'))
      .map(filter => {
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
  }, [availableFilters, activeTab, motivosOptions]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [docentesData, setDocentesData] = useState<Docente[]>([]);
  const [cargosData, setCargosData] = useState<Cargo[]>([]);
  const [licenciasData, setLicenciasData] = useState<Licencia[]>([]);
  const [docentesSort, setDocentesSort] = useState<SortConfig<DocenteSortColumn> | null>(null);
  const [cargosSort, setCargosSort] = useState<SortConfig<CargoSortColumn> | null>(null);
  const [licenciasSort, setLicenciasSort] = useState<SortConfig<LicenciaSortColumn> | null>(null);

  // Rows per page based on screen height
  const [rowsPerPage, setRowsPerPage] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return calculateRowsPerPage(window.innerHeight);
    }
    return 12;
  });

  useEffect(() => {
    const handleResize = () => {
      const height = window.innerHeight;
      setRowsPerPage(calculateRowsPerPage(height));
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
        const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};

        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';
        const [resCaracteres, resCategorias, resDedicaciones, resTiposUnidad, resUnidades, resMotivos] = await Promise.all([
          fetch(`${apiUrl}/api/caracteres`, { headers }),
          fetch(`${apiUrl}/api/categorias`, { headers }),
          fetch(`${apiUrl}/api/dedicaciones`, { headers }),
          fetch(`${apiUrl}/api/tipos-unidad`, { headers }),
          fetch(`${apiUrl}/api/unidades`, { headers }),
          fetch(`${apiUrl}/api/motivos-licencias`, { headers })
        ]);

        if (resCaracteres.status === 401 || resCategorias.status === 401 || resDedicaciones.status === 401 || resTiposUnidad.status === 401 || resUnidades.status === 401 || resMotivos.status === 401) {
          if (onLogout) onLogout();
          return;
        }

        const [caracteres, categorias, dedicaciones, tiposUnidad, unidades, motivos] = await Promise.all([
          resCaracteres.ok ? resCaracteres.json() : [],
          resCategorias.ok ? resCategorias.json() : [],
          resDedicaciones.ok ? resDedicaciones.json() : [],
          resTiposUnidad.ok ? resTiposUnidad.json() : [],
          resUnidades.ok ? resUnidades.json() : [],
          resMotivos.ok ? resMotivos.json() : []
        ]);

        if (Array.isArray(motivos)) {
          setMotivosOptions(
            motivos.map((item: any) => ({
              id: item.id?.toString() || '',
              label: item.nombre || 'Desconocido'
            }))
          );
        }

        const unidadesOptions: FilterOption[] = Array.isArray(unidades)
          ? unidades
              .map((item: any) => ({
                id: (item.unidadId || item.id)?.toString() || '',
                label: item.unidadNombre || item.nombre || 'Desconocido'
              }))
              .sort((a: FilterOption, b: FilterOption) =>
                a.label.localeCompare(b.label, 'es', { sensitivity: 'base' })
              )
          : [];

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
          },
          {
            id: 'unidad',
            name: 'Unidad',
            options: unidadesOptions
          }
        ]);
      } catch (err) {
        console.error("Error fetching filter options:", err);
      } finally {
        setFiltersLoaded(true);
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

  const activeSort = activeTab === 'docentes' ? docentesSort : activeTab === 'cargos' ? cargosSort : licenciasSort;
  const isSorting = activeSort !== null;
  const selectedUnidades = useMemo(() => {
    if (activeTab !== 'docentes') return [];
    return appliedFilters
      .filter(f => f.startsWith('Unidad: '))
      .map(f => f.slice('Unidad: '.length).trim().replace(/\s+/g, ' ').toLowerCase())
      .filter(Boolean);
  }, [activeTab, appliedFilters]);

  const hasUnresolvedFilters = useMemo(() => {
    if (filtersLoaded) return false;
    return appliedFilters.some(filter => {
      const separatorIdx = filter.indexOf(': ');
      if (separatorIdx === -1) return false;
      const categoryName = filter.slice(0, separatorIdx);
      return !dynamicAvailableFilters.some(c => c.name === categoryName);
    });
  }, [filtersLoaded, appliedFilters, dynamicAvailableFilters]);

  const resolvedFilterQuery = useMemo(() => {
    const params = new URLSearchParams();
    appliedFilters.forEach(filter => {
      const separatorIdx = filter.indexOf(': ');
      if (separatorIdx === -1) return;
      const categoryName = filter.slice(0, separatorIdx);
      const optionLabel = filter.slice(separatorIdx + 2);
      if (!categoryName || !optionLabel) return;

      const category = dynamicAvailableFilters.find(c => c.name === categoryName);
      if (category) {
        const option = category.options.find(
          o => o.label === optionLabel || o.label.toLowerCase() === optionLabel.toLowerCase()
        );
        if (option) {
          if (activeTab === 'licencias') {
            if (category.id === 'motivo') {
              params.append('motivoId', option.id);
            }
          } else if (category.id !== 'unidad') {
            // Send both the ID (like categoryId=1) and the exact label (like categoria=Titular)
            // so the backend can use whichever it is actually looking for.
            params.append(`${category.id}Id`, option.id);
            params.append(category.id, option.label);
          }
        } else if (activeTab !== 'licencias' && category.id === 'tipoUnidad') {
          params.append('tipoUnidad', optionLabel);
        }
      } else if (activeTab !== 'licencias' && categoryName === 'Tipo de Unidad') {
        params.append('tipoUnidad', optionLabel);
      }
    });
    return params.toString();
  }, [appliedFilters, dynamicAvailableFilters, activeTab]);

  const needsAllRows = isSorting || selectedUnidades.length > 0;
  const fetchPage = needsAllRows ? 0 : currentPage - 1;
  const fetchSize = needsAllRows ? 1000 : rowsPerPage;

  useEffect(() => {
    if (hasUnresolvedFilters) {
      return;
    }

    const controller = new AbortController();

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const buildParams = (pageNum: number, sizeNum: number) => {
          const params = new URLSearchParams(resolvedFilterQuery);
          params.set('page', pageNum.toString());
          params.set('size', sizeNum.toString());

          if (searchTerm) {
            params.set('search', searchTerm);
          }

          return params;
        };

        const token = localStorage.getItem('token');
        const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

        const endpoint = activeTab === 'cargos'
          ? '/api/cargos'
          : activeTab === 'licencias'
          ? '/api/licencias'
          : '/api/docentes';

        const firstParams = buildParams(fetchPage, fetchSize);
        const response = await fetch(`${apiUrl}${endpoint}?${firstParams.toString()}`, {
          headers,
          signal: controller.signal
        });

        if (response.ok) {
          const data = await response.json();
          let items = data.content || [];

          if (needsAllRows && (data.totalPages || 1) > 1) {
            const remainingPages = Array.from({ length: data.totalPages - 1 }, (_, i) => i + 1);
            const remainingResponses = await Promise.all(
              remainingPages.map((p) =>
                fetch(`${apiUrl}${endpoint}?${buildParams(p, fetchSize).toString()}`, {
                  headers,
                  signal: controller.signal
                }).then((res) => (res.ok ? res.json() : { content: [] }))
              )
            );
            for (const pageData of remainingResponses) {
              if (Array.isArray(pageData.content)) {
                items = items.concat(pageData.content);
              }
            }
          }

          if (activeTab === 'docentes' && selectedUnidades.length > 0) {
            items = items.filter((d: Docente) => {
              const docenteUnidad = (d.unidad || '').trim().replace(/\s+/g, ' ').toLowerCase();
              return selectedUnidades.includes(docenteUnidad);
            });
          }

          if (activeTab === 'cargos') {
            setCargosData(items);
          } else if (activeTab === 'licencias') {
            setLicenciasData(items);
          } else {
            setDocentesData(items);
          }
          setTotalElements(needsAllRows ? items.length : (data.totalElements || 0));
          setTotalPages(needsAllRows ? Math.max(1, Math.ceil(items.length / rowsPerPage)) : (data.totalPages || 1));
        } else {
          console.error(`Failed to fetch ${activeTab}, status:`, response.status);
          if (response.status === 401) {
            if (onLogout) onLogout();
          }
        }
      } catch (error: any) {
        if (error?.name === 'AbortError') return;
        console.error(`Error fetching ${activeTab}:`, error);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();
    return () => controller.abort();
  }, [fetchPage, fetchSize, needsAllRows, hasUnresolvedFilters, resolvedFilterQuery, selectedUnidades, searchTerm, activeTab, rowsPerPage]);

  const exportConfig = useMemo(() => {
    const params = new URLSearchParams();
    const trimmedSearch = searchTerm.trim();
    if (trimmedSearch) {
      params.append('search', trimmedSearch);
      params.append('filtros', `Búsqueda: ${trimmedSearch}`);
    }

    appliedFilters.forEach((filter) => {
      const separatorIdx = filter.indexOf(': ');
      if (separatorIdx === -1) return;
      const categoryName = filter.slice(0, separatorIdx);
      const optionLabel = filter.slice(separatorIdx + 2);
      const category = dynamicAvailableFilters.find((c) => c.name === categoryName);
      if (!category) return;
      const option = category.options.find((o) => o.label === optionLabel);
      if (!option) return;

      if (activeTab === 'docentes') {
        if (['origen', 'dedicacion', 'categoria', 'caracter', 'tipoUnidad', 'estado'].includes(category.id)) {
          params.append(category.id, option.label);
          params.append('filtros', filter);
        }
      } else if (activeTab === 'cargos') {
        if (category.id === 'estado') {
          params.append('estado', option.label);
          params.append('filtros', filter);
        } else if (['categoria', 'dedicacion', 'caracter'].includes(category.id)) {
          params.append(`${category.id}Id`, option.id);
          params.append('filtros', filter);
        }
      } else if (activeTab === 'licencias') {
        if (category.id === 'motivo') {
          params.append('motivoId', option.id);
          params.append('filtros', filter);
        }
      }
    });

    if (activeTab === 'cargos') {
      return {
        endpoint: '/api/cargos/exportar',
        fallbackBaseName: 'listado_cargos',
        params,
      };
    }
    if (activeTab === 'licencias') {
      return {
        endpoint: '/api/licencias/exportar',
        fallbackBaseName: 'listado_licencias',
        params,
      };
    }
    return {
      endpoint: '/api/docentes/exportar',
      fallbackBaseName: 'listado_docentes',
      params,
    };
  }, [activeTab, searchTerm, appliedFilters, dynamicAvailableFilters]);

  const effectiveTotalPages = needsAllRows ? Math.max(1, Math.ceil(totalElements / rowsPerPage)) : totalPages;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalElements);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= effectiveTotalPages) {
      setCurrentPage(page);
    }
  };

  const renderPageButtons = () => {
    const buttons = [];
    const maxVisibleButtons = 3;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisibleButtons / 2));
    let endPage = Math.min(effectiveTotalPages, startPage + maxVisibleButtons - 1);

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

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
    return new Date(dateStr).toLocaleDateString();
  };

  const toggleSort = <T extends string>(
    prev: SortConfig<T> | null,
    column: T
  ): SortConfig<T> | null => {
    if (!prev || prev.column !== column) {
      return { column, direction: 'asc' };
    }
    if (prev.direction === 'asc') {
      return { column, direction: 'desc' };
    }
    return null;
  };

  const compareDates = (dateA: string | undefined, dateB: string | undefined, multiplier: number) => {
    const timeA = dateA ? new Date(dateA).getTime() : NaN;
    const timeB = dateB ? new Date(dateB).getTime() : NaN;
    const validA = !Number.isNaN(timeA);
    const validB = !Number.isNaN(timeB);
    if (validA && validB) return (timeA - timeB) * multiplier;
    if (validA) return -1 * multiplier;
    if (validB) return 1 * multiplier;
    return 0;
  };

  const compareNumbers = (numA: number | undefined | null, numB: number | undefined | null, multiplier: number) => {
    const validA = typeof numA === 'number' && !Number.isNaN(numA);
    const validB = typeof numB === 'number' && !Number.isNaN(numB);
    if (validA && validB) return (numA - numB) * multiplier;
    if (validA) return -1 * multiplier;
    if (validB) return 1 * multiplier;
    return 0;
  };

  const sortedDocentesData = useMemo(() => {
    if (!docentesSort) return docentesData;
    const { column, direction } = docentesSort;
    const multiplier = direction === 'asc' ? 1 : -1;

    return [...docentesData].sort((a, b) => {
      const getTextValue = (d: Docente): string => {
        switch (column) {
          case 'legajo':
            return d.legajo != null ? String(d.legajo) : '';
          case 'nombre':
            return d.apellido ? `${d.apellido}, ${d.nombre}` : d.nombre || '';
          case 'origen':
            return d.origen || '';
          case 'unidad':
            return d.unidad || '';
          case 'categoria':
            return d.categoria || '';
          case 'dedicacion':
            return d.dedicacion || '';
          case 'caracter':
            return d.caracter || '';
          case 'estado':
            return d.estado || '';
        }
      };

      return getTextValue(a).localeCompare(getTextValue(b), 'es', { numeric: true, sensitivity: 'base' }) * multiplier;
    });
  }, [docentesData, docentesSort]);

  const sortedCargosData = useMemo(() => {
    if (!cargosSort) return cargosData;
    const { column, direction } = cargosSort;
    const multiplier = direction === 'asc' ? 1 : -1;

    return [...cargosData].sort((a, b) => {
      if (column === 'numero') {
        return compareNumbers(a.numero, b.numero, multiplier);
      }
      if (column === 'fechaCreacion') {
        return compareDates(a.fechaCreacion, b.fechaCreacion, multiplier);
      }

      const getTextValue = (c: Cargo): string => {
        switch (column) {
          case 'estado':
            return c.estado || '';
          case 'docente':
            return c.estado === 'Libre' ? '-' : c.apellidoNombre || '';
          case 'categoria':
            return c.categoria || '';
          case 'dedicacion':
            return c.dedicacion || '';
          case 'caracter':
            return c.caracter || '';
        }
      };

      return getTextValue(a).localeCompare(getTextValue(b), 'es', { numeric: true, sensitivity: 'base' }) * multiplier;
    });
  }, [cargosData, cargosSort]);

  const sortedLicenciasData = useMemo(() => {
    if (!licenciasSort) return licenciasData;
    const { column, direction } = licenciasSort;
    const multiplier = direction === 'asc' ? 1 : -1;

    return [...licenciasData].sort((a, b) => {
      if (column === 'fechaInicio') {
        return compareDates(a.fechaInicio, b.fechaInicio, multiplier);
      }
      if (column === 'fechaFin') {
        return compareDates(a.fechaFin, b.fechaFin, multiplier);
      }
      if (column === 'diasUsados') {
        return compareNumbers(a.diasUsados, b.diasUsados, multiplier);
      }

      const getTextValue = (l: Licencia): string => {
        switch (column) {
          case 'nroResolucion':
            return l.nroResolucion || '';
          case 'motivoNombre':
            return l.motivoNombre || '';
          case 'docenteNombreCompleto':
            return l.docenteNombreCompleto || '';
          case 'estado':
            return l.estado || '';
        }
      };

      return getTextValue(a).localeCompare(getTextValue(b), 'es', { numeric: true, sensitivity: 'base' }) * multiplier;
    });
  }, [licenciasData, licenciasSort]);

  const displayedDocentesData = useMemo(
    () => (needsAllRows ? sortedDocentesData.slice(startIndex, startIndex + rowsPerPage) : sortedDocentesData),
    [needsAllRows, sortedDocentesData, startIndex, rowsPerPage]
  );

  const displayedCargosData = useMemo(
    () => (isSorting ? sortedCargosData.slice(startIndex, startIndex + rowsPerPage) : sortedCargosData),
    [isSorting, sortedCargosData, startIndex, rowsPerPage]
  );

  const displayedLicenciasData = useMemo(
    () => (isSorting ? sortedLicenciasData.slice(startIndex, startIndex + rowsPerPage) : sortedLicenciasData),
    [isSorting, sortedLicenciasData, startIndex, rowsPerPage]
  );

  const handleDocenteSort = (col: DocenteSortColumn) => {
    setDocentesSort((prev) => toggleSort(prev, col));
    setCurrentPage(1);
  };

  const handleCargoSort = (col: CargoSortColumn) => {
    setCargosSort((prev) => toggleSort(prev, col));
    setCurrentPage(1);
  };

  const handleLicenciaSort = (col: LicenciaSortColumn) => {
    setLicenciasSort((prev) => toggleSort(prev, col));
    setCurrentPage(1);
  };

  const getAriaSort = <T extends string>(
    sortConfig: SortConfig<T> | null,
    column: T
  ): 'ascending' | 'descending' | 'none' => {
    if (!sortConfig || sortConfig.column !== column) return 'none';
    return sortConfig.direction === 'asc' ? 'ascending' : 'descending';
  };

  const renderSortHeader = <T extends string>(
    sortConfig: SortConfig<T> | null,
    onSort: (column: T) => void,
    column: T,
    label: string
  ) => {
    const isActive = sortConfig?.column === column;
    return (
      <th aria-sort={getAriaSort(sortConfig, column)} className="listado-sortable-th">
        <button
          type="button"
          className={`listado-sort-btn ${isActive ? 'active' : ''}`}
          onClick={() => onSort(column)}
        >
          <span>{label}</span>
          <span className="listado-sort-icons" aria-hidden="true">
            <FiChevronUp
              className={`listado-sort-icon ${isActive && sortConfig.direction === 'asc' ? 'active' : ''}`}
            />
            <FiChevronDown
              className={`listado-sort-icon ${isActive && sortConfig.direction === 'desc' ? 'active' : ''}`}
            />
          </span>
        </button>
      </th>
    );
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
                  <h1 className="listado-title">
                    {activeTab === 'cargos'
                      ? 'Listado de Cargos'
                      : activeTab === 'licencias'
                      ? 'Listado de Licencias'
                      : 'Listado de Docentes'}
                  </h1>
                  <div className="listado-tabs-row">
                    <div className="listado-tabs">
                      <button
                        className={`tab-btn ${activeTab === 'docentes' ? 'active' : ''}`}
                        onClick={() => handleTabChange('docentes')}
                      >
                        Docentes
                      </button>
                      <button
                        className={`tab-btn ${activeTab === 'cargos' ? 'active' : ''}`}
                        onClick={() => handleTabChange('cargos')}
                      >
                        Cargos
                      </button>
                      <button
                        className={`tab-btn ${activeTab === 'licencias' ? 'active' : ''}`}
                        onClick={() => handleTabChange('licencias')}
                      >
                        Licencias
                      </button>
                    </div>
                    <ExportButton
                      endpoint={exportConfig.endpoint}
                      params={exportConfig.params}
                      fallbackBaseName={exportConfig.fallbackBaseName}
                      onUnauthorized={onLogout}
                      onError={setExportError}
                    />
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

              {exportError && (
                <div className="listado-error-banner" role="alert">
                  <span>{exportError}</span>
                  <button
                    type="button"
                    className="listado-error-close"
                    onClick={() => setExportError(null)}
                    aria-label="Cerrar mensaje de error"
                  >
                    ×
                  </button>
                </div>
              )}

              <div className="listado-table-container">
                <table className="listado-table">
                  <thead>
                    {activeTab === 'cargos' ? (
                      <tr>
                        {renderSortHeader(cargosSort, handleCargoSort, 'numero', 'Número')}
                        {renderSortHeader(cargosSort, handleCargoSort, 'fechaCreacion', 'FechaCreación')}
                        {renderSortHeader(cargosSort, handleCargoSort, 'estado', 'Estado')}
                        {renderSortHeader(cargosSort, handleCargoSort, 'docente', 'Docente')}
                        {renderSortHeader(cargosSort, handleCargoSort, 'categoria', 'Categoría')}
                        {renderSortHeader(cargosSort, handleCargoSort, 'dedicacion', 'Dedicación')}
                        {renderSortHeader(cargosSort, handleCargoSort, 'caracter', 'Caracter')}
                      </tr>
                    ) : activeTab === 'licencias' ? (
                      <tr>
                        {renderSortHeader(licenciasSort, handleLicenciaSort, 'nroResolucion', 'N° Resolución')}
                        {renderSortHeader(licenciasSort, handleLicenciaSort, 'motivoNombre', 'Motivo')}
                        {renderSortHeader(licenciasSort, handleLicenciaSort, 'docenteNombreCompleto', 'Docente')}
                        {renderSortHeader(licenciasSort, handleLicenciaSort, 'fechaInicio', 'Fecha Inicio')}
                        {renderSortHeader(licenciasSort, handleLicenciaSort, 'fechaFin', 'Fecha Fin')}
                        {renderSortHeader(licenciasSort, handleLicenciaSort, 'diasUsados', 'Días Usados')}
                        {renderSortHeader(licenciasSort, handleLicenciaSort, 'estado', 'Estado')}
                      </tr>
                    ) : (
                      <tr>
                        {renderSortHeader(docentesSort, handleDocenteSort, 'legajo', 'N° Legajo')}
                        {renderSortHeader(docentesSort, handleDocenteSort, 'nombre', 'Nombre')}
                        {renderSortHeader(docentesSort, handleDocenteSort, 'origen', 'Origen')}
                        {renderSortHeader(docentesSort, handleDocenteSort, 'unidad', 'Unidad')}
                        {renderSortHeader(docentesSort, handleDocenteSort, 'categoria', 'Categoría')}
                        {renderSortHeader(docentesSort, handleDocenteSort, 'dedicacion', 'Dedicación')}
                        {renderSortHeader(docentesSort, handleDocenteSort, 'caracter', 'Caracter')}
                        {renderSortHeader(docentesSort, handleDocenteSort, 'estado', 'Estado')}
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {isLoading || hasUnresolvedFilters ? (
                      <tr>
                        <td colSpan={activeTab === 'docentes' ? 8 : 7} style={{ textAlign: 'center', padding: '24px' }}>Cargando {activeTab}...</td>
                      </tr>
                    ) : activeTab === 'cargos' ? (
                      displayedCargosData.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>No se encontraron cargos</td>
                        </tr>
                      ) : (
                        displayedCargosData.map((cargo, idx) => (
                          <tr key={idx} onClick={() => onNavigate && onNavigate('cargo_detalle', cargo)} style={{ cursor: 'pointer' }}>
                            <td>{cargo.numero}</td>
                            <td>{cargo.fechaCreacion ? new Date(cargo.fechaCreacion).toLocaleDateString() : ''}</td>
                            <td>{cargo.estado}</td>
                            <td>{cargo.estado === 'Libre' ? '-' : cargo.apellidoNombre}</td>
                            <td>{cargo.categoria}</td>
                            <td>{cargo.dedicacion}</td>
                            <td>{cargo.caracter}</td>
                          </tr>
                        ))
                      )
                    ) : activeTab === 'licencias' ? (
                      displayedLicenciasData.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>No se encontraron licencias</td>
                        </tr>
                      ) : (
                        displayedLicenciasData.map((licencia, idx) => (
                          <tr key={idx} onClick={() => onNavigate && onNavigate('licencia_detalle', licencia)} style={{ cursor: 'pointer' }}>
                            <td>{licencia.nroResolucion}</td>
                            <td>{licencia.motivoNombre}</td>
                            <td>{licencia.docenteNombreCompleto}</td>
                            <td>{formatDate(licencia.fechaInicio)}</td>
                            <td>{formatDate(licencia.fechaFin)}</td>
                            <td>{licencia.diasUsados ?? '-'}</td>
                            <td>{licencia.estado}</td>
                          </tr>
                        ))
                      )
                    ) : (
                      displayedDocentesData.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', padding: '24px' }}>No se encontraron docentes</td>
                        </tr>
                      ) : (
                        displayedDocentesData.map((docente, idx) => (
                          <tr key={idx} onClick={() => onNavigate && onNavigate('docente_detalle', docente)} style={{ cursor: 'pointer' }}>
                            <td>{docente.legajo ?? '-'}</td>
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

                {effectiveTotalPages > 3 && currentPage < effectiveTotalPages - 1 && (
                  <button className="page-btn dots">...</button>
                )}

                <button className="page-btn" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === effectiveTotalPages}><FiChevronRight /></button>
                <button className="page-btn" onClick={() => goToPage(effectiveTotalPages)} disabled={currentPage === effectiveTotalPages}><FiChevronsRight /></button>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
