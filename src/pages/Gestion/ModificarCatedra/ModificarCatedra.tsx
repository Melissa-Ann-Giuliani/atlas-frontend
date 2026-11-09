import React, { useState, useEffect, useRef } from 'react';
import './ModificarCatedra.css';
import Sidebar from '../../../components/Sidebar';
import Topbar from '../../../components/Topbar';
import { FiChevronLeft, FiChevronDown, FiTrash2, FiCheckSquare, FiSearch } from 'react-icons/fi';
import { isGlobalAdmin, getUserUnitInfo } from '../../../utils/auth';

interface ModificarCatedraProps {
  initialCatedra?: any;
  onLogout?: () => void;
  onNavigate?: (page: any, data?: any) => void;
  onBack?: () => void;
}

interface FormState {
  catedraId: number | null;
  nombreCatedra: string;
  tipologia: string;
  dependencia: string;
  unidad: string;
  materiaId: string;
  directorId: string;
  directorNombre: string;
}

interface OptionItem {
  id: string | number;
  label: string;
  tipoUnidadId?: string | number;
}

interface DocenteSuggestion {
  id: number;
  nombreCompleto: string;
  dni?: string;
  unidad?: string;
}

interface CatedraSuggestion {
  id: number;
  nombre: string;
  tipologia?: number;
  estado?: string;
  directorId?: number;
  directorNombre?: string;
  materiaId?: number;
  materiaNombre?: string;
  unidadId?: number;
  unidadNombre?: string;
  tipoUnidadId?: number;
  tipoUnidadNombre?: string;
  raw?: any;
}

const TIPOLOGIA_OPTIONS: { id: number; roman: string; label: string }[] = [
  { id: 1, roman: 'I', label: 'I' },
  { id: 2, roman: 'II', label: 'II' },
  { id: 3, roman: 'III', label: 'III' },
  { id: 4, roman: 'IV', label: 'IV' },
];

const emptyFormState: FormState = {
  catedraId: null,
  nombreCatedra: '',
  tipologia: '',
  dependencia: '',
  unidad: '',
  materiaId: '',
  directorId: '',
  directorNombre: '',
};

export const isCatedraDadaDeBaja = (estado?: string | null): boolean => {
  if (!estado) return false;
  const normalized = estado.trim().toLowerCase();
  return (
    normalized === 'dada de baja' ||
    normalized === 'dado de baja' ||
    normalized === 'de baja' ||
    normalized === 'inactiva' ||
    normalized === 'inactivo'
  );
};

function normalizeSearchText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getLevenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) matrix[i] = [i];
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

function calculateCatedraCloseness(item: CatedraSuggestion, rawQuery: string): number {
  const q = normalizeSearchText(rawQuery);
  if (!q) return 0;

  const rawName = item.nombre || '';
  const nName = normalizeSearchText(rawName);
  const rawMateria = item.materiaNombre || '';
  const nMateria = normalizeSearchText(rawMateria);

  if (nName === q) return 1000;
  if (nName.startsWith(q)) return 800 - (nName.length - q.length);
  if (nName.includes(q)) return 600 - (nName.length - q.length);

  const queryTokens = q.split(' ');
  const nameTokens = nName.split(' ');
  const tokenMatches = queryTokens.filter((qt) => nameTokens.some((nt) => nt.startsWith(qt)));
  if (tokenMatches.length > 0) {
    return 400 + tokenMatches.length * 50 - nName.length;
  }

  if (nMateria.includes(q)) return 300;

  if (q.length >= 3) {
    const dist = getLevenshteinDistance(q, nName.slice(0, q.length));
    if (dist <= 2) return 200 - dist * 30;
  }

  return 0;
}

export default function ModificarCatedra({
  initialCatedra,
  onLogout,
  onNavigate,
  onBack,
}: ModificarCatedraProps) {
  const [formData, setFormData] = useState<FormState>(emptyFormState);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Search bar state
  const [searchQuery, setSearchQuery] = useState<string>(
    initialCatedra?.nombre ? String(initialCatedra.nombre) : ''
  );
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<CatedraSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const isSelectingRef = useRef<boolean>(false);

  // Scoping & user unit
  const isGlobal = isGlobalAdmin();
  const [userUnitId, setUserUnitId] = useState<number | null>(null);

  // Catalogs
  const [dependencias, setDependencias] = useState<OptionItem[]>([]);
  const [unidades, setUnidades] = useState<OptionItem[]>([]);
  const [allMaterias, setAllMaterias] = useState<any[]>([]);
  const [filteredMaterias, setFilteredMaterias] = useState<OptionItem[]>([]);

  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState<boolean>(true);
  const [isLoadingUnidades, setIsLoadingUnidades] = useState<boolean>(false);
  const [isLoadingMaterias, setIsLoadingMaterias] = useState<boolean>(false);

  // Director autocomplete state
  const [directorSuggestions, setDirectorSuggestions] = useState<DocenteSuggestion[]>([]);
  const [showDirectorSuggestions, setShowDirectorSuggestions] = useState<boolean>(false);
  const [isSearchingDirector, setIsSearchingDirector] = useState<boolean>(false);
  const [activeDirectorIndex, setActiveDirectorIndex] = useState<number>(-1);

  const directorWrapperRef = useRef<HTMLDivElement>(null);
  const searchDirectorTimeoutRef = useRef<any>(null);

  // Pre-load current user unit info if ADMIN_UNIDAD
  useEffect(() => {
    if (!isGlobal) {
      const unitInfo = getUserUnitInfo();
      if (unitInfo.unidadId) {
        setUserUnitId(unitInfo.unidadId);
        setFormData((prev) => ({
          ...prev,
          unidad: String(unitInfo.unidadId),
          dependencia: unitInfo.tipoUnidadId ? String(unitInfo.tipoUnidadId) : prev.dependencia,
        }));
      }
    }
  }, [isGlobal]);

  // Click outside listener for director autocomplete suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (directorWrapperRef.current && !directorWrapperRef.current.contains(event.target as Node)) {
        setShowDirectorSuggestions(false);
      }
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Load Tipos de Unidad (Dependencia) on mount
  useEffect(() => {
    const fetchCatalogs = async () => {
      setIsLoadingCatalogs(true);
      try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

        const resTiposUnidad = await fetch(`${apiUrl}/api/tipos-unidad`, { headers }).catch(() => null);

        if (resTiposUnidad && resTiposUnidad.status === 401) {
          if (onLogout) onLogout();
          return;
        }

        if (resTiposUnidad && resTiposUnidad.ok) {
          const data = await resTiposUnidad.json();
          if (Array.isArray(data)) {
            setDependencias(
              data.map((item: any) => ({
                id: item.tipoUnidadId ?? item.id ?? item.nombre,
                label: item.tipoUnidadNombre ?? item.nombre ?? item.descripcion ?? String(item.id || item),
              }))
            );
          }
        }
      } catch (err) {
        console.error('Error fetching catalogs for Modificar Cátedra:', err);
      } finally {
        setIsLoadingCatalogs(false);
      }
    };

    fetchCatalogs();
  }, [onLogout]);

  // Load Unidades when Dependencia changes (or if userUnitId is present)
  useEffect(() => {
    if (!formData.dependencia && !userUnitId) {
      setUnidades([]);
      return;
    }

    const fetchUnidades = async () => {
      setIsLoadingUnidades(true);
      try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

        const url = formData.dependencia
          ? `${apiUrl}/api/unidades?tipoUnidadId=${encodeURIComponent(formData.dependencia)}`
          : `${apiUrl}/api/unidades`;

        const response = await fetch(url, { headers });

        if (response.status === 401) {
          if (onLogout) onLogout();
          return;
        }

        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            const mapped = data.map((item: any) => ({
              id: item.unidadId ?? item.id,
              label: item.unidadNombre ?? item.nombre ?? String(item.unidadId || item.id),
              tipoUnidadId: item.tipoUnidadId ?? (item.tipoUnidad && item.tipoUnidad.id),
            }));
            setUnidades(mapped);

            if (!isGlobal && userUnitId) {
              const matched = mapped.find((u: any) => Number(u.id) === Number(userUnitId));
              if (matched) {
                setFormData((prev) => ({
                  ...prev,
                  unidad: String(matched.id),
                  dependencia: matched.tipoUnidadId ? String(matched.tipoUnidadId) : prev.dependencia,
                }));
              }
            }
          }
        }
      } catch (err) {
        console.warn('Error loading unidades for Modificar Cátedra:', err);
      } finally {
        setIsLoadingUnidades(false);
      }
    };

    fetchUnidades();
  }, [formData.dependencia, userUnitId, isGlobal, onLogout]);

  // Load all materias once
  useEffect(() => {
    const fetchMaterias = async () => {
      setIsLoadingMaterias(true);
      try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

        const response = await fetch(`${apiUrl}/api/materias`, { headers });

        if (response.status === 401) {
          if (onLogout) onLogout();
          return;
        }

        if (response.ok) {
          const data = await response.json();
          const list = data.content || (Array.isArray(data) ? data : []);
          setAllMaterias(list);
        }
      } catch (err) {
        console.warn('Error fetching all materias for Modificar Cátedra:', err);
      } finally {
        setIsLoadingMaterias(false);
      }
    };

    fetchMaterias();
  }, [onLogout]);

  // Filter materias when selected unidad changes
  useEffect(() => {
    const targetUnitId = formData.unidad || (userUnitId ? String(userUnitId) : '');
    if (!targetUnitId) {
      setFilteredMaterias([]);
      return;
    }

    const filtered = allMaterias.filter((mat: any) => {
      const uId =
        mat.unidadId ??
        mat.unidad_id ??
        (mat.unidad && (mat.unidad.unidadId ?? mat.unidad.id));
      return String(uId) === String(targetUnitId);
    });

    setFilteredMaterias(
      filtered.map((mat: any) => {
        const id = mat.materiaId ?? mat.id;
        const nombre = mat.materiaNombre ?? mat.nombre ?? String(id);
        const plan = mat.planEstudio ?? mat.materiaPlanEstudio ?? mat.nroPlan;
        const label = plan ? `${nombre} (Plan ${plan})` : nombre;
        return { id, label };
      })
    );
  }, [formData.unidad, userUnitId, allMaterias]);

  // Convert raw catedra / materia object to unified suggestion format
  const extractCatedrasFromMaterias = (materiasList: any[]): CatedraSuggestion[] => {
    const result: CatedraSuggestion[] = [];
    materiasList.forEach((mat) => {
      const catedras = mat.catedras || mat.catedraList || [];
      const matUnidad = mat.unidadNombre || (mat.unidad && mat.unidad.unidadNombre) || '';
      const matUnidadId = mat.unidadId || (mat.unidad && (mat.unidad.unidadId ?? mat.unidad.id));
      const matTipoUnidadId = mat.tipoUnidadId || (mat.unidad && mat.unidad.tipoUnidadId);

      catedras.forEach((cat: any) => {
        result.push({
          id: cat.id ?? cat.catedraId,
          nombre: cat.nombre ?? cat.catedraNombre ?? '',
          tipologia: cat.tipologia ?? cat.catedraTipologia,
          estado: cat.estado ?? cat.catedraEstado ?? 'Activa',
          directorId: cat.directorId ?? (cat.director && cat.director.id),
          directorNombre:
            cat.directorNombre ??
            (cat.director
              ? `${cat.director.nombre || ''} ${cat.director.apellido || ''}`.trim()
              : ''),
          materiaId: mat.id ?? mat.materiaId,
          materiaNombre: mat.nombre ?? mat.materiaNombre,
          unidadId: matUnidadId,
          unidadNombre: matUnidad,
          tipoUnidadId: matTipoUnidadId,
          raw: { ...cat, materia: mat },
        });
      });
    });
    return result;
  };

  // Helper to fetch matching catedras
  const fetchMatchingCatedras = async (term: string): Promise<CatedraSuggestion[]> => {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

    // 1. Try dedicated endpoint /api/catedras?search=... or /api/catedras
    try {
      const resCatedras = await fetch(
        `${apiUrl}/api/catedras${term ? `?search=${encodeURIComponent(term)}` : ''}`,
        { headers }
      );
      if (resCatedras.ok) {
        const data = await resCatedras.json();
        const list = data.content || (Array.isArray(data) ? data : []);
        if (list.length > 0) {
          return list.map((cat: any) => ({
            id: cat.id ?? cat.catedraId,
            nombre: cat.nombre ?? cat.catedraNombre ?? '',
            tipologia: cat.tipologia ?? cat.catedraTipologia,
            estado: cat.estado ?? cat.catedraEstado ?? 'Activa',
            directorId: cat.directorId ?? (cat.director && cat.director.id),
            directorNombre:
              cat.directorNombre ??
              (cat.director
                ? `${cat.director.nombre || ''} ${cat.director.apellido || ''}`.trim()
                : ''),
            materiaId: cat.materiaId ?? (cat.materia && cat.materia.id),
            materiaNombre: cat.materiaNombre ?? (cat.materia && cat.materia.nombre),
            unidadId: cat.unidadId ?? (cat.materia && cat.materia.unidad && (cat.materia.unidad.unidadId ?? cat.materia.unidad.id)),
            unidadNombre: cat.unidadNombre ?? (cat.materia && cat.materia.unidad && cat.materia.unidad.unidadNombre),
            tipoUnidadId: cat.tipoUnidadId ?? (cat.materia && cat.materia.unidad && cat.materia.unidad.tipoUnidadId),
            raw: cat,
          }));
        }
      }
    } catch {
      // Endpoint may not have GET /api/catedras; fall back to materias
    }

    // 2. Fallback: inspect materias list (and /api/materias/{id}) to aggregate catedras
    const fromLoaded = extractCatedrasFromMaterias(allMaterias);
    if (fromLoaded.length > 0) return fromLoaded;

    return [];
  };

  // Populate form from a selected catedra
  const populateFormWithCatedra = async (catedra: CatedraSuggestion) => {
    // Check if dada de baja
    if (isCatedraDadaDeBaja(catedra.estado)) {
      setFeedback({
        type: 'error',
        message: `La cátedra "${catedra.nombre || catedra.id}" está dada de baja y no puede ser modificada.`,
      });
      setFormData(emptyFormState);
      return;
    }

    // Resolve materia details if needed to resolve unit / dependency
    let resolvedMateria: any = null;
    const targetMateriaId = catedra.materiaId;
    if (targetMateriaId) {
      resolvedMateria = allMaterias.find(
        (m: any) => Number(m.id ?? m.materiaId) === Number(targetMateriaId)
      );
      if (!resolvedMateria) {
        try {
          const token = localStorage.getItem('token');
          const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';
          const res = await fetch(`${apiUrl}/api/materias/${targetMateriaId}`, { headers });
          if (res.ok) {
            resolvedMateria = await res.json();
          }
        } catch {
          // ignore
        }
      }
    }

    // Resolve director name if only directorId was returned by the DTO
    let resolvedDirectorNombre = catedra.directorNombre || '';
    if (!resolvedDirectorNombre && catedra.directorId) {
      try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';
        const resDoc = await fetch(`${apiUrl}/api/docentes/${catedra.directorId}`, { headers }).catch(() => null);
        if (resDoc && resDoc.ok) {
          const docData = await resDoc.json();
          const apellido = docData.apellido || docData.docenteApellido || '';
          const nombre = docData.nombre || docData.docenteNombre || '';
          resolvedDirectorNombre =
            docData.nombreCompleto ||
            (apellido && nombre ? `${apellido}, ${nombre}` : `${nombre} ${apellido}`.trim()) ||
            `Docente #${catedra.directorId}`;
        }
      } catch {
        // ignore
      }
      if (!resolvedDirectorNombre) {
        resolvedDirectorNombre = `Docente #${catedra.directorId}`;
      }
    }

    const uId =
      catedra.unidadId ??
      (resolvedMateria &&
        (resolvedMateria.unidadId ??
          (resolvedMateria.unidad && (resolvedMateria.unidad.unidadId ?? resolvedMateria.unidad.id))));

    const depId =
      catedra.tipoUnidadId ??
      (resolvedMateria &&
        (resolvedMateria.tipoUnidadId ??
          resolvedMateria.dependenciaId ??
          (resolvedMateria.unidad &&
            (resolvedMateria.unidad.tipoUnidadId ??
              (resolvedMateria.unidad.tipoUnidad &&
                (resolvedMateria.unidad.tipoUnidad.tipoUnidadId ?? resolvedMateria.unidad.tipoUnidad.id))))));

    // Verify Admin de Unidad permission
    if (!isGlobal && userUnitId && uId && Number(uId) !== Number(userUnitId)) {
      setFeedback({
        type: 'error',
        message: 'No posee permisos para modificar cátedras pertenecientes a otra unidad académica.',
      });
      setFormData(emptyFormState);
      return;
    }

    setFormData({
      catedraId: catedra.id,
      nombreCatedra: catedra.nombre || '',
      tipologia: catedra.tipologia ? String(catedra.tipologia) : '',
      dependencia: depId ? String(depId) : (!isGlobal && userUnitId ? formData.dependencia : ''),
      unidad: uId ? String(uId) : (!isGlobal && userUnitId ? String(userUnitId) : ''),
      materiaId: targetMateriaId ? String(targetMateriaId) : '',
      directorId: catedra.directorId ? String(catedra.directorId) : '',
      directorNombre: resolvedDirectorNombre,
    });

    setFeedback({
      type: 'info',
      message: `Cátedra "${catedra.nombre}" cargada. Puede modificar el Nombre, la Tipología o el Director de Cátedra.`,
    });
  };

  // Load catedra details by id
  const loadCatedraDetails = async (id: number, fallback?: CatedraSuggestion) => {
    setIsSearching(true);
    setFeedback(null);
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

      const response = await fetch(`${apiUrl}/api/catedras/${id}`, { headers }).catch(() => null);

      if (response && response.status === 401) {
        if (onLogout) onLogout();
        return;
      }

      if (response && response.ok) {
        const data = await response.json();
        const mapped: CatedraSuggestion = {
          id: data.id ?? id,
          nombre: data.nombre ?? '',
          tipologia: data.tipologia,
          estado: data.estado,
          directorId: data.directorId,
          directorNombre: data.directorNombre,
          materiaId: data.materiaId,
          materiaNombre: data.materiaNombre,
          raw: data,
        };
        await populateFormWithCatedra(mapped);
        return;
      }

      if (fallback) {
        await populateFormWithCatedra(fallback);
      } else {
        setFeedback({
          type: 'error',
          message: `No se pudo obtener la información de la cátedra #${id}.`,
        });
      }
    } catch (err) {
      console.error('Error loading catedra details:', err);
      if (fallback) {
        await populateFormWithCatedra(fallback);
      } else {
        setFeedback({
          type: 'error',
          message: 'Error de conexión al cargar la cátedra seleccionada.',
        });
      }
    } finally {
      setIsSearching(false);
    }
  };

  // Auto-search suggestions as user types
  useEffect(() => {
    if (isSelectingRef.current) {
      isSelectingRef.current = false;
      return;
    }

    const term = searchQuery.trim();
    if (!term) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const list = await fetchMatchingCatedras(term);

        // Filter by user unit if Admin de Unidad
        const scopedList = list.filter((cat) => {
          if (isGlobal || !userUnitId) return true;
          return !cat.unidadId || Number(cat.unidadId) === Number(userUnitId);
        });

        // Filter out inactive / de baja catedras
        const activeOnly = scopedList.filter((cat) => !isCatedraDadaDeBaja(cat.estado));

        // Score and sort by closeness
        const scored = activeOnly
          .map((cat) => ({ cat, score: calculateCatedraCloseness(cat, term) }))
          .filter((item) => item.score > 0)
          .sort((a, b) => b.score - a.score)
          .map((item) => item.cat);

        setSuggestions(scored.slice(0, 10));
        setShowSuggestions(scored.length > 0);
        setActiveSuggestionIndex(-1);
      } catch (err) {
        console.warn('Error fetching catedra suggestions:', err);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchQuery, isGlobal, userUnitId, allMaterias]); // eslint-disable-line react-hooks/exhaustive-deps

  // Select a suggestion from search dropdown
  const selectSuggestion = (sug: CatedraSuggestion) => {
    isSelectingRef.current = true;
    setSearchQuery(sug.nombre);
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);
    loadCatedraDetails(sug.id, sug);
  };

  // Perform search on button click or Enter key
  const handleSearch = async (termToSearch?: string) => {
    const term = (termToSearch !== undefined ? termToSearch : searchQuery).trim();
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);

    if (!term) {
      setFeedback({
        type: 'error',
        message: 'Por favor ingrese un nombre o identificador de cátedra para buscar.',
      });
      return;
    }

    setIsSearching(true);
    setFeedback(null);
    try {
      const list = await fetchMatchingCatedras(term);

      const scopedList = list.filter((cat) => {
        if (isGlobal || !userUnitId) return true;
        return !cat.unidadId || Number(cat.unidadId) === Number(userUnitId);
      });

      // If user typed exact numeric ID
      const numericId = parseInt(term, 10);
      if (!isNaN(numericId) && String(numericId) === term) {
        const exactById = scopedList.find((cat) => cat.id === numericId);
        if (exactById) {
          if (isCatedraDadaDeBaja(exactById.estado)) {
            setFeedback({
              type: 'error',
              message: `La cátedra con ID ${numericId} está dada de baja y no puede ser modificada.`,
            });
            setFormData(emptyFormState);
            return;
          }
          await loadCatedraDetails(exactById.id, exactById);
          return;
        }
      }

      const activeOnly = scopedList.filter((cat) => !isCatedraDadaDeBaja(cat.estado));

      if (activeOnly.length === 0) {
        // Check if there was an inactive match
        const hasInactive = scopedList.some((cat) => isCatedraDadaDeBaja(cat.estado));
        if (hasInactive) {
          setFeedback({
            type: 'error',
            message: `La cátedra buscada se encuentra dada de baja y no puede ser modificada.`,
          });
        } else {
          setFeedback({
            type: 'error',
            message: `No se encontró ninguna cátedra activa con "${term}".`,
          });
        }
        setFormData(emptyFormState);
        return;
      }

      // Rank by closeness
      const scored = activeOnly
        .map((cat) => ({ cat, score: calculateCatedraCloseness(cat, term) }))
        .sort((a, b) => b.score - a.score);

      const best = scored[0].cat;
      setSearchQuery(best.nombre || term);
      await populateFormWithCatedra(best);
    } catch (err: any) {
      console.error('Error during catedra search:', err);
      setFeedback({
        type: 'error',
        message: 'Error de comunicación al buscar la cátedra.',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestionIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestionIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length) {
          selectSuggestion(suggestions[activeSuggestionIndex]);
          return;
        }
        setShowSuggestions(false);
        handleSearch();
        return;
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        return;
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  // Director autocomplete search (filtering active docentes in selected unit)
  const handleDirectorInputChange = (val: string) => {
    setFormData((prev) => ({
      ...prev,
      directorNombre: val,
      directorId: '',
    }));
    setActiveDirectorIndex(-1);
    if (feedback && feedback.type !== 'info') setFeedback(null);

    if (searchDirectorTimeoutRef.current) {
      clearTimeout(searchDirectorTimeoutRef.current);
    }

    const trimmed = val.trim();
    if (!trimmed) {
      setDirectorSuggestions([]);
      setShowDirectorSuggestions(false);
      return;
    }

    searchDirectorTimeoutRef.current = setTimeout(async () => {
      setIsSearchingDirector(true);
      setShowDirectorSuggestions(true);
      try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

        const targetUnitId = formData.unidad || (userUnitId ? String(userUnitId) : '');

        let url = `${apiUrl}/api/docentes?search=${encodeURIComponent(trimmed)}&size=30`;
        if (targetUnitId) {
          url += `&unidadId=${encodeURIComponent(targetUnitId)}`;
        }

        const response = await fetch(url, { headers });

        if (response.status === 401) {
          if (onLogout) onLogout();
          return;
        }

        if (response.ok) {
          const data = await response.json();
          const list = data.content || (Array.isArray(data) ? data : []);

          const filtered = list.filter((doc: any) => {
            const estado = doc.estado || doc.docenteEstado || '';
            const isActive = estado.toLowerCase() === 'activo';
            if (!isActive) return false;

            if (targetUnitId) {
              const docUnidadId =
                doc.unidadId ??
                doc.unidad_id ??
                (doc.unidad && (doc.unidad.unidadId ?? doc.unidad.id));
              if (docUnidadId && String(docUnidadId) !== String(targetUnitId)) {
                return false;
              }
            }
            return true;
          });

          const mapped: DocenteSuggestion[] = filtered.map((doc: any) => {
            const id = doc.docenteId ?? doc.id;
            const nombre = doc.nombre ?? '';
            const apellido = doc.apellido ?? '';
            const nombreCompleto =
              doc.nombreCompleto || `${nombre} ${apellido}`.trim() || `Docente #${id}`;
            const dni = doc.documento ?? doc.dni;
            const unidad =
              doc.unidadNombre ??
              (doc.unidad && (doc.unidad.unidadNombre ?? doc.unidad.nombre));
            return { id, nombreCompleto, dni, unidad };
          });

          setDirectorSuggestions(mapped);
        } else {
          setDirectorSuggestions([]);
        }
      } catch (err) {
        console.warn('Error fetching docentes for director search:', err);
      } finally {
        setIsSearchingDirector(false);
      }
    }, 280);
  };

  const handleSelectDirector = (doc: DocenteSuggestion) => {
    setFormData((prev) => ({
      ...prev,
      directorId: String(doc.id),
      directorNombre: doc.nombreCompleto,
    }));
    setShowDirectorSuggestions(false);
    setActiveDirectorIndex(-1);
    if (feedback && feedback.type !== 'info') setFeedback(null);
  };

  const handleDirectorKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDirectorSuggestions || directorSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveDirectorIndex((prev) => (prev < directorSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveDirectorIndex((prev) => (prev > 0 ? prev - 1 : directorSuggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeDirectorIndex >= 0 && activeDirectorIndex < directorSuggestions.length) {
        handleSelectDirector(directorSuggestions[activeDirectorIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowDirectorSuggestions(false);
    }
  };

  const handleChange = (field: keyof FormState, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (feedback && feedback.type !== 'info') setFeedback(null);
  };

  const handleClear = () => {
    setFormData({
      ...emptyFormState,
      dependencia: !isGlobal && userUnitId ? formData.dependencia : '',
      unidad: !isGlobal && userUnitId ? String(userUnitId) : '',
    });
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setDirectorSuggestions([]);
    setShowDirectorSuggestions(false);
    setFeedback(null);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (onNavigate) {
      onNavigate('gestion');
    }
  };

  // Submit modification
  const handleSubmit = async () => {
    setFeedback(null);

    if (!formData.catedraId) {
      setFeedback({
        type: 'error',
        message: 'Primero debe buscar y seleccionar una cátedra activa para modificar.',
      });
      return;
    }

    if (!formData.nombreCatedra.trim()) {
      setFeedback({ type: 'error', message: 'Por favor complete el Nombre de Cátedra.' });
      return;
    }
    if (formData.nombreCatedra.trim().length > 50) {
      setFeedback({
        type: 'error',
        message: 'El nombre de la cátedra no puede superar los 50 caracteres.',
      });
      return;
    }
    if (!formData.tipologia) {
      setFeedback({ type: 'error', message: 'Por favor seleccione una Tipología (I a IV).' });
      return;
    }
    if (!formData.directorId) {
      setFeedback({
        type: 'error',
        message: 'Por favor seleccione un Director de Cátedra de la lista de sugerencias.',
      });
      return;
    }

    const updatedName = formData.nombreCatedra.trim();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

      const payload = {
        nombre: updatedName,
        tipologia: Number(formData.tipologia),
        directorId: Number(formData.directorId),
      };

      const response = await fetch(`${apiUrl}/api/catedras/${formData.catedraId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        if (onLogout) onLogout();
        return;
      }

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        let errorMsg = 'Error al modificar la cátedra.';
        if (responseData && (responseData.message || responseData.error)) {
          errorMsg = responseData.message || responseData.error;
        } else if (response.status === 400) {
          errorMsg = 'Datos inválidos. Verifique los campos ingresados.';
        } else if (response.status === 403) {
          errorMsg = 'No posee permisos para modificar cátedras en esta unidad académica.';
        } else if (response.status === 404) {
          errorMsg = 'La cátedra o el director especificado no fueron encontrados.';
        } else if (response.status === 409) {
          errorMsg = 'Ya existe otra cátedra con ese nombre para la materia seleccionada.';
        }
        setFeedback({ type: 'error', message: errorMsg });
        return;
      }

      // Updated successfully
      const confirmedName = responseData?.nombre || updatedName;
      setSearchQuery(confirmedName);
      setFeedback({
        type: 'success',
        message:
          responseData?.message ||
          `Cátedra "${confirmedName}" modificada exitosamente.`,
      });
    } catch (err: any) {
      console.error('Error modifying catedra:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Error de conexión con el servidor al modificar la cátedra.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modificar-catedra-page">
      <Topbar onLogout={onLogout} />

      <div className="modificar-catedra-body">
        <Sidebar activeItem="gestion" onNavigate={onNavigate} />

        <main className="modificar-catedra-main">
          <div className="modificar-catedra-content-area">
            {/* Top Back Navigation */}
            <div className="modificar-catedra-top-nav">
              <button
                type="button"
                className="modificar-catedra-back-btn"
                onClick={handleBack}
              >
                <FiChevronLeft className="modificar-catedra-back-icon" />
                <span>Retroceder</span>
              </button>
            </div>

            {/* Container Card */}
            <div className="modificar-catedra-container-card">
              {/* Header & Search Bar Row */}
              <div className="modificar-catedra-header-row">
                <div className="modificar-catedra-header-left">
                  <h1 className="modificar-catedra-title">Gestión</h1>
                </div>

                <div className="modificar-catedra-search-card">
                  <span className="modificar-catedra-search-label">Buscar Cátedra</span>
                  <div className="modificar-catedra-search-row">
                    <div className="modificar-catedra-search-input-wrap" ref={searchWrapperRef}>
                      <input
                        ref={searchInputRef}
                        type="search"
                        className="modificar-catedra-search-input"
                        placeholder="Nombre de cátedra o materia..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        onFocus={() => {
                          if (suggestions.length > 0) setShowSuggestions(true);
                        }}
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        data-lpignore="true"
                        data-form-type="other"
                      />
                      <FiSearch className="modificar-catedra-search-icon" />

                      {/* Suggestions Dropdown */}
                      {showSuggestions && suggestions.length > 0 && (
                        <ul className="modificar-catedra-suggestions-list" role="listbox">
                          {suggestions.map((item, idx) => (
                            <li
                              key={item.id ?? idx}
                              className={`modificar-catedra-suggestion-item ${idx === activeSuggestionIndex ? 'active' : ''
                                }`}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                selectSuggestion(item);
                              }}
                              onMouseEnter={() => setActiveSuggestionIndex(idx)}
                              role="option"
                              aria-selected={idx === activeSuggestionIndex}
                            >
                              <div className="modificar-catedra-suggestion-header">
                                <span className="modificar-catedra-suggestion-name">
                                  {item.nombre}
                                </span>
                                {item.tipologia ? (
                                  <span className="modificar-catedra-suggestion-tipologia-badge">
                                    Tipología{' '}
                                    {TIPOLOGIA_OPTIONS.find((t) => t.id === item.tipologia)?.roman ||
                                      item.tipologia}
                                  </span>
                                ) : null}
                              </div>
                              {(item.materiaNombre || item.directorNombre) && (
                                <span className="modificar-catedra-suggestion-sub">
                                  {[
                                    item.materiaNombre ? `Materia: ${item.materiaNombre}` : null,
                                    item.directorNombre ? `Director: ${item.directorNombre}` : null,
                                  ]
                                    .filter(Boolean)
                                    .join(' • ')}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <button
                      type="button"
                      className="modificar-catedra-search-btn"
                      onClick={() => handleSearch()}
                      disabled={isSearching}
                    >
                      <FiSearch />
                      <span>{isSearching ? 'Buscando...' : 'Buscar Cátedra'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Card */}
              <div className="modificar-catedra-form-card">
                <div className="modificar-catedra-card-header">
                  <h2>Modificar Cátedra</h2>
                </div>

                <div
                  className="modificar-catedra-card-body"
                  onFocusCapture={() => {
                    if (feedback && feedback.type !== 'info') setFeedback(null);
                  }}
                >
                  {feedback && (
                    <div className={`modificar-catedra-feedback feedback-${feedback.type}`}>
                      {feedback.message}
                    </div>
                  )}

                  <div className="modificar-catedra-form">
                    {/* SECTION: DATOS DE CÁTEDRA */}
                    <h3 className="modificar-catedra-section-title">Datos de Cátedra</h3>

                    {/* Row 1: Nombre de Cátedra, Tipología, Dependencia */}
                    <div className="modificar-catedra-grid-row-1">
                      <div className="modificar-catedra-field">
                        <label htmlFor="nombreCatedra" className="modificar-catedra-label">
                          Nombre de Cátedra *
                        </label>
                        <input
                          id="nombreCatedra"
                          name="nombreCatedra"
                          type="text"
                          maxLength={50}
                          className="modificar-catedra-input"
                          placeholder="Ingrese nombre de cátedra"
                          value={formData.nombreCatedra}
                          onChange={(e) => handleChange('nombreCatedra', e.target.value)}
                          autoComplete="off"
                          autoCorrect="off"
                          spellCheck={false}
                          data-lpignore="true"
                          data-form-type="other"
                          disabled={!formData.catedraId}
                        />
                      </div>

                      <div className="modificar-catedra-field">
                        <label htmlFor="tipologia" className="modificar-catedra-label">
                          Tipología *
                        </label>
                        <div className="modificar-catedra-select-wrapper">
                          <select
                            id="tipologia"
                            name="tipologia"
                            className="modificar-catedra-select"
                            value={formData.tipologia}
                            onChange={(e) => handleChange('tipologia', e.target.value)}
                            disabled={!formData.catedraId}
                          >
                            <option value="">Seleccione</option>
                            {TIPOLOGIA_OPTIONS.map((tip) => (
                              <option key={tip.id} value={tip.id}>
                                {tip.roman}
                              </option>
                            ))}
                          </select>
                          <FiChevronDown className="modificar-catedra-select-caret" />
                        </div>
                      </div>

                      <div className="modificar-catedra-field">
                        <label htmlFor="dependencia" className="modificar-catedra-label">
                          Dependencia
                        </label>
                        <div className="modificar-catedra-select-wrapper">
                          <select
                            id="dependencia"
                            className="modificar-catedra-select"
                            value={formData.dependencia}
                            disabled={true}
                            title="La dependencia está vinculada a la materia asociada y no puede modificarse"
                          >
                            <option value="">
                              {isLoadingCatalogs && dependencias.length === 0
                                ? 'Cargando dependencias...'
                                : 'Seleccione'}
                            </option>
                            {dependencias.map((dep) => (
                              <option key={dep.id} value={dep.id}>
                                {dep.label}
                              </option>
                            ))}
                          </select>
                          <FiChevronDown className="modificar-catedra-select-caret" />
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Unidad Académica, Materia, Director de Cátedra */}
                    <div className="modificar-catedra-grid-row-1">
                      <div className="modificar-catedra-field">
                        <label htmlFor="unidad" className="modificar-catedra-label">
                          Unidad Académica
                        </label>
                        <div className="modificar-catedra-select-wrapper">
                          <select
                            id="unidad"
                            className="modificar-catedra-select"
                            value={formData.unidad}
                            disabled={true}
                            title="La unidad académica está vinculada a la materia asociada y no puede modificarse"
                          >
                            <option value="">
                              {isLoadingUnidades
                                ? 'Cargando unidades...'
                                : !formData.dependencia && isGlobal
                                  ? 'Sin unidad seleccionada'
                                  : 'Seleccione'}
                            </option>
                            {unidades.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.label}
                              </option>
                            ))}
                          </select>
                          <FiChevronDown className="modificar-catedra-select-caret" />
                        </div>
                      </div>

                      <div className="modificar-catedra-field">
                        <label htmlFor="materia" className="modificar-catedra-label">
                          Materia
                        </label>
                        <div className="modificar-catedra-select-wrapper">
                          <select
                            id="materia"
                            className="modificar-catedra-select"
                            value={formData.materiaId}
                            disabled={true}
                            title="La materia asignada a la cátedra permanece fija tras su creación"
                          >
                            <option value="">
                              {isLoadingMaterias
                                ? 'Cargando materias...'
                                : !formData.unidad && !userUnitId
                                  ? 'Sin materia'
                                  : filteredMaterias.length === 0
                                    ? 'No hay materias para esta unidad'
                                    : 'Seleccione'}
                            </option>
                            {filteredMaterias.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.label}
                              </option>
                            ))}
                          </select>
                          <FiChevronDown className="modificar-catedra-select-caret" />
                        </div>
                      </div>

                      <div className="modificar-catedra-field">
                        <label htmlFor="directorCatedra" className="modificar-catedra-label">
                          Director de Cátedra *
                        </label>
                        <div className="modificar-catedra-search-wrapper" ref={directorWrapperRef}>
                          <input
                            id="directorCatedra"
                            name="directorCatedra"
                            type="text"
                            className="modificar-catedra-input"
                            placeholder={
                              !formData.catedraId
                                ? 'Primero busque una cátedra'
                                : 'Escriba el nombre o apellido...'
                            }
                            value={formData.directorNombre}
                            onChange={(e) => handleDirectorInputChange(e.target.value)}
                            onFocus={() => {
                              if (directorSuggestions.length > 0) setShowDirectorSuggestions(true);
                            }}
                            onKeyDown={handleDirectorKeyDown}
                            disabled={!formData.catedraId}
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck={false}
                            data-lpignore="true"
                            data-form-type="other"
                          />

                          {showDirectorSuggestions && (
                            <ul
                              className="modificar-catedra-director-suggestions-list"
                              role="listbox"
                            >
                              {isSearchingDirector ? (
                                <li className="modificar-catedra-director-suggestion-item disabled">
                                  <span className="modificar-catedra-director-suggestion-name">
                                    Buscando docentes...
                                  </span>
                                </li>
                              ) : directorSuggestions.length === 0 ? (
                                <li className="modificar-catedra-director-suggestion-item disabled">
                                  <span className="modificar-catedra-director-suggestion-name">
                                    No se encontraron docentes activos
                                  </span>
                                </li>
                              ) : (
                                directorSuggestions.map((doc, idx) => (
                                  <li
                                    key={doc.id}
                                    className={`modificar-catedra-director-suggestion-item ${idx === activeDirectorIndex ? 'active' : ''
                                      }`}
                                    onClick={() => handleSelectDirector(doc)}
                                  >
                                    <div className="modificar-catedra-director-suggestion-header">
                                      <span className="modificar-catedra-director-suggestion-name">
                                        {doc.nombreCompleto}
                                      </span>
                                      {doc.dni && (
                                        <span className="modificar-catedra-director-suggestion-badge">
                                          DNI: {doc.dni}
                                        </span>
                                      )}
                                    </div>
                                    {doc.unidad && (
                                      <span className="modificar-catedra-director-suggestion-subtitle">
                                        {doc.unidad}
                                      </span>
                                    )}
                                  </li>
                                ))
                              )}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions Toolbar: Borrar & Confirmar */}
            <div className="modificar-catedra-actions">
              <button
                type="button"
                className="btn-modificar-catedra btn-modificar-catedra-borrar"
                onClick={handleClear}
                disabled={!formData.catedraId && !searchQuery}
              >
                <FiTrash2 className="btn-icon" />
                <span>Borrar</span>
              </button>

              <button
                type="button"
                className="btn-modificar-catedra btn-modificar-catedra-confirmar"
                onClick={handleSubmit}
                disabled={isSubmitting || !formData.catedraId}
              >
                <FiCheckSquare className="btn-icon" />
                <span>{isSubmitting ? 'Guardando...' : 'Confirmar'}</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

