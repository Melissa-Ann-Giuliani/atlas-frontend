import React, { useState, useEffect, useRef } from 'react';
import './BajaMateria.css';
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

interface BajaMateriaProps {
  initialMateria?: any;
  onLogout?: () => void;
  onNavigate?: (page: any, data?: any) => void;
  onBack?: () => void;
}

interface FormState {
  materiaId: number | null;
  nombre: string;
  cantHoras: string;
  dependencia: string; // tipoUnidadId
  unidad: string;      // unidadId
  anoEducativo: string; // "1°" | "2°" | "3°" | "4°" | "5°"
  despliegueTipo: string; // "Anual" | "Semestral"
  despliegueSemestre: string; // "Primer Semestre" | "Segundo Semestre"
  nroPlan: string;    // study plan year (e.g. "2023")
  estado?: string;
}

interface OptionItem {
  id: string | number;
  label: string;
  tipoUnidadId?: string | number;
}

interface MateriaSuggestion {
  id: number;
  nombre: string;
  unidad?: string;
  anio?: string;
  planEstudio?: number | string;
  estado?: string;
  materia?: any;
}

export const isMateriaDadaDeBaja = (estado?: string | null): boolean => {
  if (!estado) return false;
  const normalized = estado.trim().toLowerCase();
  return (
    normalized === 'dada de baja' ||
    normalized === 'dado de baja' ||
    normalized === 'inactiva' ||
    normalized === 'inactivo'
  );
};

const emptyFormState: FormState = {
  materiaId: null,
  nombre: '',
  cantHoras: '',
  dependencia: '',
  unidad: '',
  anoEducativo: '',
  despliegueTipo: '',
  despliegueSemestre: '',
  nroPlan: '',
  estado: '',
};

const ANIO_EDUCATIVO_OPTIONS = ['1°', '2°', '3°', '4°', '5°'];

/**
 * Normalizes text: lowercase, removes accents/diacritics, and strips extra spaces.
 */
function normalizeSearchText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Levenshtein distance between two strings for typo tolerance.
 */
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
        matrix[i - 1][j] + 1,       // deletion
        matrix[i][j - 1] + 1,       // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return matrix[a.length][b.length];
}

/**
 * Calculates a closeness / relevance score between a materia and the search query.
 */
function calculateMateriaCloseness(materia: any, rawQuery: string): number {
  const q = normalizeSearchText(rawQuery);
  if (!q) return 0;

  const rawName = materia.nombre || materia.materiaNombre || '';
  const name = normalizeSearchText(rawName);
  if (!name) return 0;

  const rawPlan = materia.planEstudio ?? materia.plan ?? materia.nroPlan ?? '';
  const planStr = String(rawPlan).trim();

  // 1. Exact match
  if (name === q) {
    return 10000;
  }

  // 1b. Exact match with plan
  if (planStr && (name + ' ' + planStr === q || name + ' plan ' + planStr === q)) {
    return 9500;
  }

  // 2. Starts with query (prefix match)
  if (name.startsWith(q)) {
    const lengthPenalty = Math.min(300, (name.length - q.length) * 2);
    return 8000 - lengthPenalty;
  }

  // 3. Word starts with query
  const words = name.split(' ');
  const qWords = q.split(' ');
  const wordIdx = words.findIndex((w) => w.startsWith(q));
  if (wordIdx !== -1) {
    return 6000 - wordIdx * 50 - Math.min(200, name.length - q.length);
  }

  // 4. Multi-word query where all query words match
  if (qWords.length > 1) {
    const allWordsMatch = qWords.every((qw) =>
      words.some((w) => w.startsWith(qw) || w.includes(qw))
    );
    if (allWordsMatch) {
      return 5500 - Math.min(300, name.length - q.length);
    }
  }

  // 5. Query is a substring of the title
  const subIdx = name.indexOf(q);
  if (subIdx !== -1) {
    return 4000 - subIdx * 10 - Math.min(200, name.length - q.length);
  }

  // 6. Plan number search
  if (planStr && q === planStr) {
    return 3500;
  }

  // 7. Fuzzy matching for typos
  if (q.length >= 3) {
    let bestWordSim = 0;
    for (const w of words) {
      if (Math.abs(w.length - q.length) <= 2) {
        const dist = getLevenshteinDistance(w, q);
        const maxLen = Math.max(w.length, q.length);
        const sim = 1 - dist / maxLen;
        if (sim > bestWordSim) {
          bestWordSim = sim;
        }
      }
    }
    if (bestWordSim >= 0.7) {
      return Math.round(3000 * bestWordSim);
    }
  }

  return 0;
}

export default function BajaMateria({
  initialMateria,
  onLogout,
  onNavigate,
  onBack,
}: BajaMateriaProps) {
  // Role & Scoping (identical to Alta and Modificar Materia)
  const isGlobal = isGlobalAdmin();
  const [userUnitId, setUserUnitId] = useState<number | null>(null);

  const [formData, setFormData] = useState<FormState>(emptyFormState);
  const [dependencias, setDependencias] = useState<OptionItem[]>([]);
  const [unidades, setUnidades] = useState<OptionItem[]>([]);
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState<boolean>(true);
  const [isLoadingUnidades, setIsLoadingUnidades] = useState<boolean>(false);

  // Searchbar & suggestions state
  const [searchQuery, setSearchQuery] = useState<string>(
    initialMateria?.nombre ? String(initialMateria.nombre) : ''
  );
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<MateriaSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(-1);
  const [allMaterias, setAllMaterias] = useState<any[]>([]);

  // Submitting, Feedback, Modal
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const isSelectingRef = useRef<boolean>(false);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch dependencias (tipos-unidad) on mount
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
            const mappedDeps = data.map((item: any) => ({
              id: item.tipoUnidadId ?? item.id ?? item.nombre,
              label: item.tipoUnidadNombre ?? item.nombre ?? item.descripcion ?? String(item.id || item),
            }));
            setDependencias(mappedDeps);
          }
        }
      } catch (error) {
        console.error('Error fetching catalogs for Baja Materia:', error);
      } finally {
        setIsLoadingCatalogs(false);
      }
    };

    fetchCatalogs();
  }, [onLogout]);

  // Initialize and lock user's assigned unit & dependency if not global admin
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

  // Pre-load materias catalog for instant search & suggestions (scoped to unit for unit admins)
  useEffect(() => {
    const fetchAllMaterias = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

        const res = await fetch(`${apiUrl}/api/materias?size=500`, { headers });
        if (res.ok) {
          const data = await res.json();
          const list = data.content || (Array.isArray(data) ? data : []);
          setAllMaterias(list);
        }
      } catch (err) {
        console.warn('Error fetching all materias catalog:', err);
      }
    };

    fetchAllMaterias();
  }, []);

  // Helper to extract the unidad ID from any materia record
  const getMateriaUnidadId = (m: any): number | null => {
    if (!m) return null;
    const raw =
      m.unidadId ??
      m.unidad?.id ??
      m.unidad?.unidadId ??
      (m.materiaUnidadId !== undefined ? m.materiaUnidadId : null);
    const parsed = Number(raw);
    return isNaN(parsed) ? null : parsed;
  };

  // Helper to check if a materia belongs to the current user's permitted unit
  const isMateriaInPermittedUnit = (m: any): boolean => {
    if (isGlobal || !userUnitId) return true;
    const mUnitId = getMateriaUnidadId(m);
    return mUnitId !== null && Number(mUnitId) === Number(userUnitId);
  };

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

            // Scoping: If user is ADMIN_UNIDAD and matched assigned unit, lock it
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
        console.warn('Error loading unidades for Baja Materia:', err);
      } finally {
        setIsLoadingUnidades(false);
      }
    };

    fetchUnidades();
  }, [formData.dependencia, userUnitId, isGlobal, onLogout]);

  // Auto-search suggestions as user types - matching Modificar Materia behavior
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
        const token = localStorage.getItem('token');
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

        // 1. Fetch matching candidates from backend search endpoint
        let backendList: any[] = [];
        try {
          const res = await fetch(`${apiUrl}/api/materias?search=${encodeURIComponent(term)}&size=50`, { headers });
          if (res.ok) {
            const data = await res.json();
            backendList = data.content || (Array.isArray(data) ? data : []);
          }
        } catch {
          backendList = [];
        }

        // 2. Combine with preloaded allMaterias to catch unaccented, typos, and partial phrases
        const combinedMap = new Map<number, any>();
        for (const m of backendList) {
          const id = m.id || m.materiaId;
          if (id) combinedMap.set(id, m);
        }
        for (const m of allMaterias) {
          const id = m.id || m.materiaId;
          if (id && !combinedMap.has(id)) {
            combinedMap.set(id, m);
          }
        }
        const candidates = Array.from(combinedMap.values());

        // 3. Score and sort candidates by closeness to whatever the user is typing
        const scored = candidates
          .map((m: any) => ({
            m,
            score: calculateMateriaCloseness(m, term),
          }))
          .filter((item) => item.score > 0)
          .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            // Higher / more recent plan de estudio first
            const planA = Number(a.m.planEstudio ?? a.m.plan ?? a.m.nroPlan ?? 0) || 0;
            const planB = Number(b.m.planEstudio ?? b.m.plan ?? b.m.nroPlan ?? 0) || 0;
            if (planB !== planA) return planB - planA;
            return String(a.m.nombre || '').localeCompare(String(b.m.nombre || ''));
          });

        const mappedSuggestions: MateriaSuggestion[] = scored.slice(0, 8).map(({ m }) => {
          const id = m.id || m.materiaId;
          const nombre = m.nombre || m.materiaNombre || `Materia #${id}`;
          const unidad = m.unidad?.nombre || m.unidad?.unidadNombre || m.unidadNombre || m.unidadAcademica;
          const anio = m.anio || m.anoEducativo || m.materiaAnio;
          const planEstudio = m.planEstudio !== undefined && m.planEstudio !== null
            ? m.planEstudio
            : (m.plan !== undefined && m.plan !== null ? m.plan : (m.nroPlan ?? ''));
          const estado = m.estado || m.materiaEstado;

          return {
            id,
            nombre,
            unidad,
            anio,
            planEstudio,
            estado,
            materia: m,
          };
        });

        setSuggestions(mappedSuggestions);
        setShowSuggestions(mappedSuggestions.length > 0);
        setActiveSuggestionIndex(-1);
      } catch (err) {
        console.warn('Error calculating closest materias for Baja:', err);
        setSuggestions([]);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [searchQuery, allMaterias]);

  // Initial materia loading if passed via navigation
  useEffect(() => {
    if (initialMateria) {
      if (!isMateriaInPermittedUnit(initialMateria)) {
        setFeedback({
          type: 'error',
          message: 'No posee permisos para dar de baja materias de otra unidad académica.',
        });
        return;
      }
      populateFormWithMateria(initialMateria);
    }
  }, [initialMateria, userUnitId, isGlobal]); // eslint-disable-line react-hooks/exhaustive-deps

  const populateFormWithMateria = (m: any) => {
    const rawId = m.id || m.materiaId;
    const nombre = m.nombre || m.materiaNombre || '';
    const cantHoras = m.horas !== undefined && m.horas !== null ? String(m.horas) : (m.materiaHoras ? String(m.materiaHoras) : '');
    const anoEducativo = m.anio || m.materiaAnio || '';
    const nroPlan = m.planEstudio !== undefined && m.planEstudio !== null ? String(m.planEstudio) : (m.materiaPlanEstudio ? String(m.materiaPlanEstudio) : '');
    const estado = m.estado || m.materiaEstado || 'Activa';

    let depId = '';
    let uniId = '';

    if (m.dependenciaId) {
      depId = String(m.dependenciaId);
    } else if (m.unidad && m.unidad.tipoUnidad) {
      depId = String(m.unidad.tipoUnidad.tipoUnidadId || m.unidad.tipoUnidad.id || '');
    }

    if (m.unidadId) {
      uniId = String(m.unidadId);
    } else if (m.unidad && (m.unidad.unidadId || m.unidad.id)) {
      uniId = String(m.unidad.unidadId || m.unidad.id);
    }

    // Parse despliegue
    const rawDespliegue = m.despliegue || m.materiaDespliegue || '';
    let despliegueTipo = '';
    let despliegueSemestre = '';

    if (rawDespliegue === 'Anual') {
      despliegueTipo = 'Anual';
    } else if (rawDespliegue === 'Primer Semestre' || rawDespliegue === 'Segundo Semestre') {
      despliegueTipo = 'Semestral';
      despliegueSemestre = rawDespliegue;
    } else if (rawDespliegue.toLowerCase().includes('semestr')) {
      despliegueTipo = 'Semestral';
      if (rawDespliegue.toLowerCase().includes('segundo') || rawDespliegue.includes('2')) {
        despliegueSemestre = 'Segundo Semestre';
      } else {
        despliegueSemestre = 'Primer Semestre';
      }
    }

    setFormData({
      materiaId: rawId ? Number(rawId) : null,
      nombre,
      cantHoras,
      dependencia: depId || (!isGlobal && userUnitId ? String(getUserUnitInfo().tipoUnidadId || '') : ''),
      unidad: uniId || (!isGlobal && userUnitId ? String(userUnitId) : ''),
      anoEducativo,
      despliegueTipo,
      despliegueSemestre,
      nroPlan,
      estado,
    });
  };

  const loadMateriaDetails = async (id: number, fallbackData?: any) => {
    setIsSearching(true);
    setFeedback(null);
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

      const response = await fetch(`${apiUrl}/api/materias/${id}`, { headers });
      if (response.ok) {
        const data = await response.json();
        if (!isMateriaInPermittedUnit(data)) {
          setFeedback({
            type: 'error',
            message: 'No posee permisos para dar de baja materias de otra unidad académica.',
          });
          return;
        }
        populateFormWithMateria(data);
        setFeedback({
          type: 'info',
          message: `Materia "${data.nombre || id}" cargada para dar de baja.`,
        });
      } else if (fallbackData) {
        if (!isMateriaInPermittedUnit(fallbackData)) {
          setFeedback({
            type: 'error',
            message: 'No posee permisos para dar de baja materias de otra unidad académica.',
          });
          return;
        }
        populateFormWithMateria(fallbackData);
        setFeedback({
          type: 'info',
          message: `Materia "${fallbackData.nombre || id}" cargada.`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: `No se pudo encontrar la materia con ID ${id}.`,
        });
      }
    } catch (err: any) {
      if (fallbackData) {
        if (!isMateriaInPermittedUnit(fallbackData)) {
          setFeedback({
            type: 'error',
            message: 'No posee permisos para dar de baja materias de otra unidad académica.',
          });
          return;
        }
        populateFormWithMateria(fallbackData);
      } else {
        setFeedback({
          type: 'error',
          message: err.message || 'Error de conexión al cargar la materia.',
        });
      }
    } finally {
      setIsSearching(false);
    }
  };

  const selectSuggestion = (sug: MateriaSuggestion) => {
    isSelectingRef.current = true;
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);
    setSearchQuery(sug.nombre);
    if (sug.id) {
      loadMateriaDetails(sug.id, sug.materia);
    } else if (sug.materia) {
      if (!isMateriaInPermittedUnit(sug.materia)) {
        setFeedback({
          type: 'error',
          message: 'No posee permisos para dar de baja materias de otra unidad académica.',
        });
        return;
      }
      populateFormWithMateria(sug.materia);
    } else {
      handleSearch(sug.nombre);
    }
  };

  const handleSearch = async (termToSearch?: string) => {
    const term = (termToSearch !== undefined ? termToSearch : searchQuery).trim();
    setShowSuggestions(false);
    if (!term) {
      setFeedback({
        type: 'error',
        message: 'Por favor, ingrese el nombre de la materia a buscar.',
      });
      return;
    }

    setIsSearching(true);
    setFeedback(null);

    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

      let list: any[] = [];
      try {
        const response = await fetch(`${apiUrl}/api/materias?search=${encodeURIComponent(term)}&size=50`, { headers });
        if (response.ok) {
          const data = await response.json();
          list = data.content || (Array.isArray(data) ? data : []);
        }
      } catch {
        list = [];
      }

      const combinedMap = new Map<number, any>();
      for (const m of list) {
        const id = m.id || m.materiaId;
        if (id) combinedMap.set(id, m);
      }
      for (const m of allMaterias) {
        const id = m.id || m.materiaId;
        if (id && !combinedMap.has(id)) {
          combinedMap.set(id, m);
        }
      }
      const candidates = Array.from(combinedMap.values());

      const scored = candidates
        .map((m) => ({ m, score: calculateMateriaCloseness(m, term) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score);

      if (scored.length > 0) {
        const chosen = scored[0].m;
        const chosenId = chosen.id || chosen.materiaId;

        // Verify user has permission for this materia
        if (!isMateriaInPermittedUnit(chosen)) {
          setFeedback({
            type: 'error',
            message: 'No posee permisos para dar de baja materias de otra unidad académica.',
          });
          return;
        }

        isSelectingRef.current = true;
        setSearchQuery(chosen.nombre || chosen.materiaNombre || term);
        if (chosenId) {
          await loadMateriaDetails(chosenId, chosen);
        } else {
          populateFormWithMateria(chosen);
          setFeedback({
            type: 'info',
            message: `Materia "${chosen.nombre}" cargada para dar de baja.`,
          });
        }
      } else {
        setFeedback({
          type: 'error',
          message: `No se encontró ninguna materia coincidente con "${term}".`,
        });
        setFormData({
          ...emptyFormState,
          dependencia: (!isGlobal && userUnitId) ? formData.dependencia : '',
          unidad: (!isGlobal && userUnitId) ? formData.unidad : '',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error de conexión durante la búsqueda.',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
      dependencia: (!isGlobal && userUnitId) ? formData.dependencia : '',
      unidad: (!isGlobal && userUnitId) ? formData.unidad : '',
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
    if (!formData.materiaId) {
      setFeedback({
        type: 'error',
        message: 'Debe buscar y seleccionar una materia antes de darla de baja.',
      });
      return;
    }

    // Scoping guard: Admin de Unidad cannot make changes to other units
    if (!isGlobal && userUnitId && formData.unidad && Number(formData.unidad) !== Number(userUnitId)) {
      setFeedback({
        type: 'error',
        message: 'No posee permisos para dar de baja materias de otra unidad académica.',
      });
      return;
    }

    if (isMateriaDadaDeBaja(formData.estado)) {
      setFeedback({
        type: 'error',
        message: `La materia "${formData.nombre}" ya está en estado "Dada de baja".`,
      });
      return;
    }

    setShowConfirmModal(true);
  };

  // Submit Baja de Materia: executes PATCH /api/materias/{id}/baja
  const handleSubmitBaja = async () => {
    setShowConfirmModal(false);
    if (!formData.materiaId) {
      setFeedback({
        type: 'error',
        message: 'Debe buscar y seleccionar una materia antes de darla de baja.',
      });
      return;
    }

    // Scoping guard: Admin de Unidad cannot make changes to other units
    if (!isGlobal && userUnitId && formData.unidad && Number(formData.unidad) !== Number(userUnitId)) {
      setFeedback({
        type: 'error',
        message: 'No posee permisos para dar de baja materias de otra unidad académica.',
      });
      return;
    }

    if (isMateriaDadaDeBaja(formData.estado)) {
      setFeedback({
        type: 'error',
        message: `La materia "${formData.nombre}" ya está en estado "Dada de baja".`,
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

      // PATCH /api/materias/{id}/baja (RF-26) with fallback if DELETE endpoint is used
      let response = await fetch(`${apiUrl}/api/materias/${formData.materiaId}/baja`, {
        method: 'PATCH',
        headers,
      });

      if (response.status === 404 || response.status === 405) {
        // Fallback check: DELETE /api/materias/{id}
        const delRes = await fetch(`${apiUrl}/api/materias/${formData.materiaId}`, {
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
          message: `La materia "${formData.nombre}" ha sido dada de baja exitosamente.`,
        });

        // Update in-memory allMaterias list
        setAllMaterias((prev) =>
          prev.map((item) =>
            (item.id || item.materiaId) === formData.materiaId
              ? { ...item, estado: 'Dada de baja' }
              : item
          )
        );
      } else {
        let errorMsg = 'Error al dar de baja la materia.';
        if (data && (data.message || data.error)) {
          errorMsg = data.message || data.error;
        } else if (response.status === 400) {
          errorMsg = 'La materia ya se encuentra dada de baja.';
        } else if (response.status === 403) {
          errorMsg = 'No posee permisos para dar de baja materias en esta unidad académica.';
        } else if (response.status === 404) {
          errorMsg = 'La materia especificada no existe o no fue encontrada.';
        } else if (response.status === 409) {
          errorMsg = data?.message || 'Conflicto: No se puede dar de baja la materia porque posee cátedras activas asociadas.';
        }
        setFeedback({ type: 'error', message: errorMsg });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error de conexión al procesar la baja de la materia.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasLoadedMateria = Boolean(formData.materiaId);

  return (
    <div className="baja-materia-page">
      <Topbar onLogout={onLogout} />

      <div className="baja-materia-body">
        <Sidebar activeItem="gestion" onNavigate={onNavigate} />

        <main className="baja-materia-main">
          <div className="baja-materia-content-area">
            {/* Top Back Navigation */}
            <div className="baja-materia-top-nav">
              <button
                type="button"
                className="baja-materia-back-btn"
                onClick={handleBack}
              >
                <FiChevronLeft className="baja-materia-back-icon" />
                <span>Retroceder</span>
              </button>
            </div>

            {/* Container Card */}
            <div className="baja-materia-container-card">
              {/* Header & Search Bar Row */}
              <div className="baja-materia-header-row">
                <div className="baja-materia-header-left">
                  <h1 className="baja-materia-title">Gestión</h1>
                </div>

                {/* Search Bar matching Modificar Materia selectors/inputs */}
                <div className="baja-materia-search-card">
                  <label htmlFor="searchMateriaInput" className="baja-materia-search-label">
                    Buscar Materia a Dar de Baja por Nombre
                  </label>
                  <div className="baja-materia-search-row">
                    <div className="baja-materia-search-input-wrap" ref={searchContainerRef}>
                      <input
                        id="searchMateriaInput"
                        name="busqueda_materia_query"
                        type="search"
                        className="baja-materia-search-input"
                        placeholder="Ingrese valor"
                        value={searchQuery}
                        onChange={(e) => {
                          isSelectingRef.current = false;
                          setSearchQuery(e.target.value);
                        }}
                        onFocus={() => {
                          if (suggestions.length > 0) setShowSuggestions(true);
                        }}
                        onClick={() => {
                          if (suggestions.length > 0) setShowSuggestions(true);
                        }}
                        onKeyDown={handleKeyDown}
                        autoComplete="one-time-code"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        data-lpignore="true"
                        data-form-type="other"
                        data-1p-ignore="true"
                      />
                      <FiSearch className="baja-materia-search-icon" />

                      {/* Suggestions Dropdown */}
                      {showSuggestions && suggestions.length > 0 && (
                        <ul className="baja-materia-suggestions-list" role="listbox">
                          {suggestions.map((item, idx) => (
                            <li
                              key={item.id ?? idx}
                              className={`baja-materia-suggestion-item ${idx === activeSuggestionIndex ? 'active' : ''}`}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                selectSuggestion(item);
                              }}
                              onMouseEnter={() => setActiveSuggestionIndex(idx)}
                              role="option"
                              aria-selected={idx === activeSuggestionIndex}
                            >
                              <div className="baja-materia-suggestion-header">
                                <span className="baja-materia-suggestion-name">
                                  {item.nombre}
                                </span>
                                {item.planEstudio ? (
                                  <span className="baja-materia-suggestion-plan-badge">
                                    Plan {item.planEstudio}
                                  </span>
                                ) : null}
                              </div>
                              {(item.unidad || item.anio) && (
                                <span className="baja-materia-suggestion-sub">
                                  {[
                                    item.unidad,
                                    item.anio ? `Año: ${item.anio}` : null,
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
                      className="baja-materia-search-btn"
                      onClick={() => handleSearch()}
                      disabled={isSearching}
                    >
                      <FiSearch />
                      <span>{isSearching ? 'Buscando...' : 'Buscar Materia'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Card styled with Red Border & Dark Red Header matching Baja de Cargo */}
              <div className="baja-materia-form-card">
                <div className="baja-materia-card-header">
                  <h2>Baja de Materia</h2>
                </div>

                <div className="baja-materia-card-body">
                  {feedback && (
                    <div className={`baja-materia-feedback feedback-${feedback.type}`}>
                      {feedback.message}
                    </div>
                  )}

                  {hasLoadedMateria &&
                    isMateriaDadaDeBaja(formData.estado) &&
                    feedback?.type !== 'success' && (
                      <div className="baja-materia-warning-box">
                        <FiAlertTriangle className="baja-materia-warning-icon" />
                        <span>
                          Esta materia ya ha sido dada de baja. Su estado actual es{' '}
                          <strong>{formData.estado || 'Dada de baja'}</strong>.
                        </span>
                      </div>
                    )}

                  <div className="baja-materia-form">
                    {/* SECTION: DATOS DE MATERIA */}
                    <h3 className="baja-materia-section-title">Datos de Materia</h3>

                    {/* Row 1: Nombre, Cantidad de Horas */}
                    <div className="baja-materia-grid-top">
                      <div className="baja-materia-field">
                        <label htmlFor="baja_nombre" className="baja-materia-label">
                          Nombre *
                        </label>
                        <input
                          id="baja_nombre"
                          name="nombre"
                          type="text"
                          maxLength={50}
                          className="baja-materia-input"
                          placeholder="Ingrese nombre de la materia (máx. 50 caracteres)"
                          value={formData.nombre}
                          readOnly
                          disabled
                        />
                      </div>

                      <div className="baja-materia-field">
                        <label htmlFor="baja_cantHoras" className="baja-materia-label">
                          Cantidad de Horas *
                        </label>
                        <input
                          id="baja_cantHoras"
                          name="cantHoras"
                          type="text"
                          className="baja-materia-input"
                          placeholder="Horas semanales (1 a 40)"
                          value={formData.cantHoras}
                          readOnly
                          disabled
                        />
                      </div>
                    </div>

                    {/* Row 2: Dependencia y Unidad Académica */}
                    <div className="baja-materia-grid-2">
                      <div className="baja-materia-field">
                        <label htmlFor="baja_dependencia" className="baja-materia-label">
                          Dependencia
                        </label>
                        <div className="baja-materia-select-wrapper">
                          <select
                            id="baja_dependencia"
                            className="baja-materia-select"
                            value={formData.dependencia}
                            disabled
                          >
                            <option value="">
                              {dependencias.find((d) => String(d.id) === String(formData.dependencia))?.label ||
                                formData.dependencia ||
                                'Seleccione'}
                            </option>
                          </select>
                          <FiChevronDown className="baja-materia-select-caret" />
                        </div>
                      </div>

                      <div className="baja-materia-field">
                        <label htmlFor="baja_unidad" className="baja-materia-label">
                          Unidad Académica *
                        </label>
                        <div className="baja-materia-select-wrapper">
                          <select
                            id="baja_unidad"
                            className="baja-materia-select"
                            value={formData.unidad}
                            disabled
                          >
                            <option value="">
                              {unidades.find((u) => String(u.id) === String(formData.unidad))?.label ||
                                formData.unidad ||
                                (!formData.dependencia ? 'Primero seleccione una dependencia' : 'Seleccione')}
                            </option>
                          </select>
                          <FiChevronDown className="baja-materia-select-caret" />
                        </div>
                      </div>
                    </div>

                    {/* Row 3: Año Educativo, Despliegue, Semestre (if Semestral), N° de Plan */}
                    <div className={formData.despliegueTipo === 'Semestral' ? 'baja-materia-grid-bottom' : 'baja-materia-grid-3'}>
                      <div className="baja-materia-field">
                        <label htmlFor="baja_anoEducativo" className="baja-materia-label">
                          Año Educativo *
                        </label>
                        <div className="baja-materia-select-wrapper">
                          <select
                            id="baja_anoEducativo"
                            className="baja-materia-select"
                            value={formData.anoEducativo}
                            disabled
                          >
                            <option value="">
                              {formData.anoEducativo || 'Seleccione'}
                            </option>
                          </select>
                          <FiChevronDown className="baja-materia-select-caret" />
                        </div>
                      </div>

                      <div className="baja-materia-field">
                        <label htmlFor="baja_despliegueTipo" className="baja-materia-label">
                          Despliegue *
                        </label>
                        <div className="baja-materia-select-wrapper">
                          <select
                            id="baja_despliegueTipo"
                            className="baja-materia-select"
                            value={formData.despliegueTipo}
                            disabled
                          >
                            <option value="">
                              {formData.despliegueTipo || 'Seleccione'}
                            </option>
                          </select>
                          <FiChevronDown className="baja-materia-select-caret" />
                        </div>
                      </div>

                      {formData.despliegueTipo === 'Semestral' && (
                        <div className="baja-materia-field">
                          <label htmlFor="baja_despliegueSemestre" className="baja-materia-label">
                            Semestre *
                          </label>
                          <div className="baja-materia-select-wrapper">
                            <select
                              id="baja_despliegueSemestre"
                              className="baja-materia-select"
                              value={formData.despliegueSemestre}
                              disabled
                            >
                              <option value="">
                                {formData.despliegueSemestre || 'Seleccione'}
                              </option>
                            </select>
                            <FiChevronDown className="baja-materia-select-caret" />
                          </div>
                        </div>
                      )}

                      <div className="baja-materia-field">
                        <label htmlFor="baja_nroPlan" className="baja-materia-label">
                          N° de Plan de Estudio *
                        </label>
                        <input
                          id="baja_nroPlan"
                          name="nroPlan"
                          type="text"
                          className="baja-materia-input"
                          placeholder="Ej: 2023"
                          value={formData.nroPlan}
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
            <div className="baja-materia-actions">
              <button
                type="button"
                className="btn-baja-materia btn-baja-materia-borrar"
                onClick={handleClear}
                disabled={isSubmitting}
              >
                <FiTrash2 className="btn-icon" />
                <span>Borrar</span>
              </button>

              <button
                type="button"
                className="btn-baja-materia btn-baja-materia-confirmar"
                onClick={handleOpenConfirmModal}
                disabled={
                  isSubmitting ||
                  !hasLoadedMateria ||
                  isMateriaDadaDeBaja(formData.estado)
                }
              >
                <FiCheckSquare className="btn-icon" />
                <span>
                  {isSubmitting
                    ? 'Procesando...'
                    : isMateriaDadaDeBaja(formData.estado)
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
        <div className="baja-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="baja-materia-modal-title">
          <div className="baja-modal">
            <div className="baja-modal-header">
              <FiAlertTriangle className="baja-modal-warning-icon" />
              <h2 id="baja-materia-modal-title">Confirmar Baja de Materia</h2>
              <FiAlertTriangle className="baja-modal-warning-icon" />
            </div>
            <div className="baja-modal-content">
              <p>
                ¿Está seguro de que desea dar de baja la materia <strong>"{formData.nombre}"</strong>?
              </p>
              <p className="baja-modal-subtext">
                Esta acción dará de baja la materia en el sistema y cambiará su estado a <strong>Dada de baja</strong>.
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
