import React, { useState, useEffect, useRef } from 'react';
import './BajaCatedra.css';
import Sidebar from '../../../components/Sidebar';
import Topbar from '../../../components/Topbar';
import {
  FiChevronLeft,
  FiChevronDown,
  FiTrash2,
  FiCheckSquare,
  FiSearch,
  FiAlertTriangle,
} from 'react-icons/fi';
import { isGlobalAdmin, getUserUnitInfo } from '../../../utils/auth';

interface BajaCatedraProps {
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
  estado?: string;
}

interface OptionItem {
  id: string | number;
  label: string;
  tipoUnidadId?: string | number;
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
  estado: '',
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

export default function BajaCatedra({
  initialCatedra,
  onLogout,
  onNavigate,
  onBack,
}: BajaCatedraProps) {
  const [formData, setFormData] = useState<FormState>(emptyFormState);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

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

  // Click outside listener for search suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
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
        console.error('Error fetching catalogs for Baja de Cátedra:', err);
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
        console.warn('Error loading unidades for Baja de Cátedra:', err);
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
        console.warn('Error fetching all materias for Baja de Cátedra:', err);
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
            unidadId:
              cat.unidadId ??
              (cat.materia &&
                cat.materia.unidad &&
                (cat.materia.unidad.unidadId ?? cat.materia.unidad.id)),
            unidadNombre:
              cat.unidadNombre ??
              (cat.materia && cat.materia.unidad && cat.materia.unidad.unidadNombre),
            tipoUnidadId:
              cat.tipoUnidadId ??
              (cat.materia && cat.materia.unidad && cat.materia.unidad.tipoUnidadId),
            raw: cat,
          }));
        }
      }
    } catch {
      // Endpoint may not have GET /api/catedras; fall back to materias
    }

    // 2. Fallback: inspect materias list to aggregate catedras
    const fromLoaded = extractCatedrasFromMaterias(allMaterias);
    if (fromLoaded.length > 0) return fromLoaded;

    return [];
  };

  // Populate form from a selected catedra
  const populateFormWithCatedra = async (catedra: CatedraSuggestion) => {
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

    const uId =
      catedra.unidadId ??
      (resolvedMateria &&
        (resolvedMateria.unidadId ??
          (resolvedMateria.unidad && (resolvedMateria.unidad.unidadId ?? resolvedMateria.unidad.id))));

    const depId =
      catedra.tipoUnidadId ??
      (resolvedMateria &&
        (resolvedMateria.tipoUnidadId ??
          (resolvedMateria.unidad && resolvedMateria.unidad.tipoUnidadId)));

    // Verify Admin de Unidad permission
    if (!isGlobal && userUnitId && uId && Number(uId) !== Number(userUnitId)) {
      setFeedback({
        type: 'error',
        message: 'No posee permisos para dar de baja cátedras pertenecientes a otra unidad académica.',
      });
      setFormData({
        ...emptyFormState,
        dependencia: !isGlobal && userUnitId ? formData.dependencia : '',
        unidad: !isGlobal && userUnitId ? String(userUnitId) : '',
      });
      return;
    }

    const estadoVal = catedra.estado || 'Activa';

    setFormData({
      catedraId: catedra.id,
      nombreCatedra: catedra.nombre || '',
      tipologia: catedra.tipologia ? String(catedra.tipologia) : '',
      dependencia: depId ? String(depId) : (!isGlobal && userUnitId ? formData.dependencia : ''),
      unidad: uId ? String(uId) : (!isGlobal && userUnitId ? String(userUnitId) : ''),
      materiaId: targetMateriaId ? String(targetMateriaId) : '',
      directorId: catedra.directorId ? String(catedra.directorId) : '',
      directorNombre: catedra.directorNombre || '',
      estado: estadoVal,
    });

    if (isCatedraDadaDeBaja(estadoVal)) {
      setFeedback({
        type: 'info',
        message: `La cátedra "${catedra.nombre}" ya se encuentra en estado "${estadoVal}".`,
      });
    } else {
      setFeedback({
        type: 'info',
        message: `Cátedra "${catedra.nombre}" cargada para dar de baja.`,
      });
    }
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
          nombre: data.nombre ?? fallback?.nombre ?? '',
          tipologia: data.tipologia ?? fallback?.tipologia,
          estado: data.estado ?? fallback?.estado,
          directorId: data.directorId ?? fallback?.directorId,
          directorNombre: data.directorNombre ?? fallback?.directorNombre,
          materiaId: data.materiaId ?? fallback?.materiaId,
          materiaNombre: data.materiaNombre ?? fallback?.materiaNombre,
          unidadId: data.unidadId ?? fallback?.unidadId,
          unidadNombre: data.unidadNombre ?? fallback?.unidadNombre,
          tipoUnidadId: data.tipoUnidadId ?? fallback?.tipoUnidadId,
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
      console.error('Error loading catedra details for Baja:', err);
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

  // Auto-load initialCatedra if provided
  useEffect(() => {
    if (initialCatedra) {
      if (initialCatedra.id) {
        loadCatedraDetails(initialCatedra.id, initialCatedra);
      } else {
        populateFormWithCatedra(initialCatedra);
      }
    }
  }, [initialCatedra]); // eslint-disable-line react-hooks/exhaustive-deps

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
        console.warn('Error fetching catedra suggestions for Baja:', err);
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
          await loadCatedraDetails(exactById.id, exactById);
          return;
        }
      }

      const activeOnly = scopedList.filter((cat) => !isCatedraDadaDeBaja(cat.estado));

      if (activeOnly.length === 0) {
        // Check if there was an inactive match
        const inactiveMatch = scopedList.find((cat) => isCatedraDadaDeBaja(cat.estado));
        if (inactiveMatch) {
          isSelectingRef.current = true;
          setSearchQuery(inactiveMatch.nombre || term);
          await populateFormWithCatedra(inactiveMatch);
          setFeedback({
            type: 'error',
            message: `La cátedra "${inactiveMatch.nombre || term}" ya se encuentra dada de baja.`,
          });
          return;
        } else {
          setFeedback({
            type: 'error',
            message: `No se encontró ninguna cátedra activa con "${term}".`,
          });
        }
        setFormData({
          ...emptyFormState,
          dependencia: !isGlobal && userUnitId ? formData.dependencia : '',
          unidad: !isGlobal && userUnitId ? String(userUnitId) : '',
        });
        return;
      }

      // Rank by closeness
      const scored = activeOnly
        .map((cat) => ({ cat, score: calculateCatedraCloseness(cat, term) }))
        .sort((a, b) => b.score - a.score);

      const best = scored[0].cat;
      isSelectingRef.current = true;
      setSearchQuery(best.nombre || term);
      await populateFormWithCatedra(best);
    } catch (err: any) {
      console.error('Error during catedra search for Baja:', err);
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

  const handleClear = () => {
    setFormData({
      ...emptyFormState,
      dependencia: !isGlobal && userUnitId ? formData.dependencia : '',
      unidad: !isGlobal && userUnitId ? String(userUnitId) : '',
    });
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setFeedback(null);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (onNavigate) {
      onNavigate('gestion');
    }
  };

  const handleOpenConfirmModal = () => {
    if (!formData.catedraId) {
      setFeedback({
        type: 'error',
        message: 'Debe buscar y seleccionar una cátedra antes de darla de baja.',
      });
      return;
    }

    if (!isGlobal && userUnitId && formData.unidad && Number(formData.unidad) !== Number(userUnitId)) {
      setFeedback({
        type: 'error',
        message: 'No posee permisos para dar de baja cátedras de otra unidad académica.',
      });
      return;
    }

    if (isCatedraDadaDeBaja(formData.estado)) {
      setFeedback({
        type: 'error',
        message: `La cátedra "${formData.nombreCatedra}" ya está en estado "Dada de baja".`,
      });
      return;
    }

    setShowConfirmModal(true);
  };

  const handleSubmitBaja = async () => {
    setShowConfirmModal(false);
    if (!formData.catedraId) {
      setFeedback({
        type: 'error',
        message: 'Debe buscar y seleccionar una cátedra antes de darla de baja.',
      });
      return;
    }

    if (!isGlobal && userUnitId && formData.unidad && Number(formData.unidad) !== Number(userUnitId)) {
      setFeedback({
        type: 'error',
        message: 'No posee permisos para dar de baja cátedras de otra unidad académica.',
      });
      return;
    }

    if (isCatedraDadaDeBaja(formData.estado)) {
      setFeedback({
        type: 'error',
        message: `La cátedra "${formData.nombreCatedra}" ya está en estado "Dada de baja".`,
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

      // Execute PATCH /api/catedras/{id}/baja with fallback to DELETE /api/catedras/{id}
      let response = await fetch(`${apiUrl}/api/catedras/${formData.catedraId}/baja`, {
        method: 'PATCH',
        headers,
      });

      if (response.status === 404 || response.status === 405) {
        const delRes = await fetch(`${apiUrl}/api/catedras/${formData.catedraId}`, {
          method: 'DELETE',
          headers,
        }).catch(() => null);
        if (delRes && delRes.ok) {
          response = delRes;
        }
      }

      if (response.status === 401) {
        if (onLogout) onLogout();
        return;
      }

      const data = await response.json().catch(() => null);

      if (response.ok) {
        setFormData((prev) => ({
          ...prev,
          estado: 'Dada de baja',
        }));
        setFeedback({
          type: 'success',
          message:
            data?.message ||
            `La cátedra "${formData.nombreCatedra}" ha sido dada de baja exitosamente.`,
        });
      } else {
        let errorMsg = 'Error al dar de baja la cátedra.';
        if (data && (data.message || data.error)) {
          errorMsg = data.message || data.error;
        } else if (response.status === 400) {
          errorMsg = 'La cátedra ya se encuentra dada de baja o no cumple las condiciones requeridas.';
        } else if (response.status === 403) {
          errorMsg = 'No posee permisos para dar de baja cátedras en esta unidad académica.';
        } else if (response.status === 404) {
          errorMsg = 'La cátedra especificada no existe o no fue encontrada.';
        } else if (response.status === 409) {
          errorMsg =
            data?.message ||
            'Conflicto: No se puede dar de baja la cátedra porque posee designaciones o cargos activos asociados.';
        }
        setFeedback({ type: 'error', message: errorMsg });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error de conexión al procesar la baja de la cátedra.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasLoadedCatedra = Boolean(formData.catedraId);

  return (
    <div className="baja-catedra-page">
      <Topbar onLogout={onLogout} />

      <div className="baja-catedra-body">
        <Sidebar activeItem="gestion" onNavigate={onNavigate} />

        <main className="baja-catedra-main">
          <div className="baja-catedra-content-area">
            {/* Top Back Navigation */}
            <div className="baja-catedra-top-nav">
              <button
                type="button"
                className="baja-catedra-back-btn"
                onClick={handleBack}
              >
                <FiChevronLeft className="baja-catedra-back-icon" />
                <span>Retroceder</span>
              </button>
            </div>

            {/* Container Card */}
            <div className="baja-catedra-container-card">
              {/* Header & Search Bar Row */}
              <div className="baja-catedra-header-row">
                <div className="baja-catedra-header-left">
                  <h1 className="baja-catedra-title">Gestión</h1>
                </div>

                {/* Search Bar matching Modificar Cátedra */}
                <div className="baja-catedra-search-card">
                  <label htmlFor="searchCatedraInput" className="baja-catedra-search-label">
                    Buscar Cátedra
                  </label>
                  <div className="baja-catedra-search-row">
                    <div className="baja-catedra-search-input-wrap" ref={searchWrapperRef}>
                      <input
                        id="searchCatedraInput"
                        ref={searchInputRef}
                        type="search"
                        className="baja-catedra-search-input"
                        placeholder="Nombre de cátedra o materia..."
                        value={searchQuery}
                        onChange={(e) => {
                          isSelectingRef.current = false;
                          setSearchQuery(e.target.value);
                        }}
                        onKeyDown={handleSearchKeyDown}
                        onFocus={() => {
                          if (suggestions.length > 0) setShowSuggestions(true);
                        }}
                        onClick={() => {
                          if (suggestions.length > 0) setShowSuggestions(true);
                        }}
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        data-lpignore="true"
                        data-form-type="other"
                      />
                      <FiSearch className="baja-catedra-search-icon" />

                      {/* Suggestions Dropdown */}
                      {showSuggestions && suggestions.length > 0 && (
                        <ul className="baja-catedra-suggestions-list" role="listbox">
                          {suggestions.map((item, idx) => (
                            <li
                              key={item.id ?? idx}
                              className={`baja-catedra-suggestion-item ${
                                idx === activeSuggestionIndex ? 'active' : ''
                              }`}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                selectSuggestion(item);
                              }}
                              onMouseEnter={() => setActiveSuggestionIndex(idx)}
                              role="option"
                              aria-selected={idx === activeSuggestionIndex}
                            >
                              <div className="baja-catedra-suggestion-header">
                                <span className="baja-catedra-suggestion-name">
                                  {item.nombre}
                                </span>
                                {item.tipologia ? (
                                  <span className="baja-catedra-suggestion-tipologia-badge">
                                    Tipología{' '}
                                    {TIPOLOGIA_OPTIONS.find((t) => t.id === item.tipologia)?.roman ||
                                      item.tipologia}
                                  </span>
                                ) : null}
                              </div>
                              {(item.materiaNombre || item.directorNombre) && (
                                <span className="baja-catedra-suggestion-sub">
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
                      className="baja-catedra-search-btn"
                      onClick={() => handleSearch()}
                      disabled={isSearching}
                    >
                      <FiSearch />
                      <span>{isSearching ? 'Buscando...' : 'Buscar Cátedra'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Card styled with Red Border & Dark Red Header matching Baja de Materia / Cargo */}
              <div className="baja-catedra-form-card">
                <div className="baja-catedra-card-header">
                  <h2>Baja de Cátedra</h2>
                </div>

                <div className="baja-catedra-card-body">
                  {feedback && (
                    <div className={`baja-catedra-feedback feedback-${feedback.type}`}>
                      {feedback.message}
                    </div>
                  )}

                  {hasLoadedCatedra &&
                    isCatedraDadaDeBaja(formData.estado) &&
                    feedback?.type !== 'success' && (
                      <div className="baja-catedra-warning-box">
                        <FiAlertTriangle className="baja-catedra-warning-icon" />
                        <span>
                          Esta cátedra ya ha sido dada de baja. Su estado actual es{' '}
                          <strong>{formData.estado || 'Dada de baja'}</strong>.
                        </span>
                      </div>
                    )}

                  <div className="baja-catedra-form">
                    {/* SECTION: DATOS DE CÁTEDRA */}
                    <h3 className="baja-catedra-section-title">Datos de Cátedra</h3>

                    {/* Row 1: Nombre de Cátedra, Tipología, Dependencia */}
                    <div className="baja-catedra-grid-row-1">
                      <div className="baja-catedra-field">
                        <label htmlFor="baja_nombreCatedra" className="baja-catedra-label">
                          Nombre de Cátedra *
                        </label>
                        <input
                          id="baja_nombreCatedra"
                          name="nombreCatedra"
                          type="text"
                          maxLength={50}
                          className="baja-catedra-input"
                          placeholder="Ingrese nombre de cátedra"
                          value={formData.nombreCatedra}
                          readOnly
                          disabled
                        />
                      </div>

                      <div className="baja-catedra-field">
                        <label htmlFor="baja_tipologia" className="baja-catedra-label">
                          Tipología *
                        </label>
                        <div className="baja-catedra-select-wrapper">
                          <select
                            id="baja_tipologia"
                            name="tipologia"
                            className="baja-catedra-select"
                            value={formData.tipologia}
                            disabled
                          >
                            <option value="">Seleccione</option>
                            {TIPOLOGIA_OPTIONS.map((tip) => (
                              <option key={tip.id} value={tip.id}>
                                {tip.roman}
                              </option>
                            ))}
                          </select>
                          <FiChevronDown className="baja-catedra-select-caret" />
                        </div>
                      </div>

                      <div className="baja-catedra-field">
                        <label htmlFor="baja_dependencia" className="baja-catedra-label">
                          Dependencia
                        </label>
                        <div className="baja-catedra-select-wrapper">
                          <select
                            id="baja_dependencia"
                            className="baja-catedra-select"
                            value={formData.dependencia}
                            disabled
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
                          <FiChevronDown className="baja-catedra-select-caret" />
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Unidad Académica, Materia, Director de Cátedra */}
                    <div className="baja-catedra-grid-row-1">
                      <div className="baja-catedra-field">
                        <label htmlFor="baja_unidad" className="baja-catedra-label">
                          Unidad Académica
                        </label>
                        <div className="baja-catedra-select-wrapper">
                          <select
                            id="baja_unidad"
                            className="baja-catedra-select"
                            value={formData.unidad}
                            disabled
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
                          <FiChevronDown className="baja-catedra-select-caret" />
                        </div>
                      </div>

                      <div className="baja-catedra-field">
                        <label htmlFor="baja_materia" className="baja-catedra-label">
                          Materia
                        </label>
                        <div className="baja-catedra-select-wrapper">
                          <select
                            id="baja_materia"
                            className="baja-catedra-select"
                            value={formData.materiaId}
                            disabled
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
                          <FiChevronDown className="baja-catedra-select-caret" />
                        </div>
                      </div>

                      <div className="baja-catedra-field">
                        <label htmlFor="baja_directorCatedra" className="baja-catedra-label">
                          Director de Cátedra *
                        </label>
                        <input
                          id="baja_directorCatedra"
                          name="directorCatedra"
                          type="text"
                          className="baja-catedra-input"
                          placeholder={
                            !formData.catedraId
                              ? 'Primero busque una cátedra'
                              : 'Sin director asignado'
                          }
                          value={formData.directorNombre}
                          readOnly
                          disabled
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions Toolbar: Borrar & Confirmar */}
            <div className="baja-catedra-actions">
              <button
                type="button"
                className="btn-baja-catedra btn-baja-catedra-borrar"
                onClick={handleClear}
                disabled={isSubmitting || (!formData.catedraId && !searchQuery)}
              >
                <FiTrash2 className="btn-icon" />
                <span>Borrar</span>
              </button>

              <button
                type="button"
                className="btn-baja-catedra btn-baja-catedra-confirmar"
                onClick={handleOpenConfirmModal}
                disabled={
                  isSubmitting ||
                  !hasLoadedCatedra ||
                  isCatedraDadaDeBaja(formData.estado)
                }
              >
                <FiCheckSquare className="btn-icon" />
                <span>
                  {isSubmitting
                    ? 'Procesando...'
                    : isCatedraDadaDeBaja(formData.estado)
                      ? 'Dada de baja'
                      : 'Confirmar'}
                </span>
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div
          className="baja-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="baja-catedra-modal-title"
        >
          <div className="baja-modal">
            <div className="baja-modal-header">
              <FiAlertTriangle className="baja-modal-warning-icon" />
              <h2 id="baja-catedra-modal-title">Confirmar Baja de Cátedra</h2>
              <FiAlertTriangle className="baja-modal-warning-icon" />
            </div>
            <div className="baja-modal-content">
              <p>
                ¿Está seguro de que desea dar de baja la cátedra{' '}
                <strong>"{formData.nombreCatedra}"</strong>?
              </p>
              <p className="baja-modal-subtext">
                Esta acción dará de baja la cátedra en el sistema y cambiará su estado a{' '}
                <strong>Dada de baja</strong>.
              </p>
              <div className="baja-modal-actions">
                <button
                  type="button"
                  className="baja-modal-btn-cancel"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="baja-modal-btn-confirm"
                  onClick={handleSubmitBaja}
                  disabled={isSubmitting}
                >
                  <FiTrash2 className="btn-icon" />
                  <span>{isSubmitting ? 'Procesando...' : 'Dar de baja'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

