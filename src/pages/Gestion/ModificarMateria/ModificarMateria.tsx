import React, { useState, useEffect, useRef } from 'react';
import './ModificarMateria.css';
import Sidebar from '../../../components/Sidebar';
import Topbar from '../../../components/Topbar';
import { FiChevronLeft, FiChevronDown, FiTrash2, FiCheckSquare, FiSearch } from 'react-icons/fi';
import { isGlobalAdmin, getUserUnitInfo } from '../../../utils/auth';

interface ModificarMateriaProps {
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
  materia?: any;
}

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
 * Higher score = closer match. Returns 0 if not a relevant match.
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

  // 1b. Exact match with plan (e.g. "algebra 2023" or "algebra plan 2023")
  if (planStr && (name + ' ' + planStr === q || name + ' plan ' + planStr === q)) {
    return 9500;
  }

  // 2. Starts with query (prefix match) - penalize slightly by extra length so concise titles rank closer
  if (name.startsWith(q)) {
    const lengthPenalty = Math.min(300, (name.length - q.length) * 2);
    return 8000 - lengthPenalty;
  }

  // 3. Word starts with query (e.g. query "sistemas" -> "Análisis de Sistemas")
  const words = name.split(' ');
  const qWords = q.split(' ');
  const wordIdx = words.findIndex((w) => w.startsWith(q));
  if (wordIdx !== -1) {
    return 6000 - wordIdx * 50 - Math.min(200, name.length - q.length);
  }

  // 4. Multi-word query where all query words are contained or start words in title
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

  // 6. Plan number search (e.g. "2023")
  if (planStr && q === planStr) {
    return 3500;
  }

  // 7. Fuzzy matching for typos (e.g. "algbra" -> "álgebra", "quimca" -> "química", "sitemas" -> "sistemas")
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
    if (bestWordSim >= 0.65) {
      return Math.round(3000 * bestWordSim);
    }

    if (name.length >= q.length) {
      const prefix = name.slice(0, q.length + 1);
      const dist = getLevenshteinDistance(prefix, q);
      const sim = 1 - dist / Math.max(prefix.length, q.length);
      if (sim >= 0.7) {
        return Math.round(2500 * sim);
      }
    }
  }

  return 0;
}

const ANIO_EDUCATIVO_OPTIONS = ['1°', '2°', '3°', '4°', '5°'];

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
};

export default function ModificarMateria({
  initialMateria,
  onLogout,
  onNavigate,
  onBack,
}: ModificarMateriaProps) {
  const [searchQuery, setSearchQuery] = useState<string>(
    initialMateria?.nombre ? String(initialMateria.nombre) : ''
  );
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [formData, setFormData] = useState<FormState>(emptyFormState);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<MateriaSuggestion[]>([]);
  const [allMaterias, setAllMaterias] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const isSelectingRef = useRef<boolean>(false);

  // Role & Scoping
  const isGlobal = isGlobalAdmin();
  const [userUnitId, setUserUnitId] = useState<number | null>(null);

  // Dynamic catalog options fetched from backend
  const [dependencias, setDependencias] = useState<OptionItem[]>([]);
  const [unidades, setUnidades] = useState<OptionItem[]>([]);
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState<boolean>(true);
  const [isLoadingUnidades, setIsLoadingUnidades] = useState<boolean>(false);

  // Detect user's assigned unit & dependency if not global admin
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

  // Load Tipos de Unidad (Dependencias) on mount
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
        console.error('Error fetching catalogs for Modificar Materia:', error);
      } finally {
        setIsLoadingCatalogs(false);
      }
    };

    fetchCatalogs();
  }, [onLogout]);

  // Pre-load materias catalog on mount to guarantee instant, typo-tolerant closeness matching
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
        console.warn('Error loading unidades for Modificar Materia:', err);
      } finally {
        setIsLoadingUnidades(false);
      }
    };

    fetchUnidades();
  }, [formData.dependencia, userUnitId, isGlobal, onLogout]);

  // Load initialMateria if provided
  useEffect(() => {
    if (initialMateria) {
      if (initialMateria.id) {
        loadMateriaDetails(initialMateria.id, initialMateria);
      } else if (initialMateria.nombre) {
        setSearchQuery(initialMateria.nombre);
        handleSearch(initialMateria.nombre);
      }
    }
  }, [initialMateria]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-search suggestions as user types - ranked by closeness to user input
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

        const mapped: MateriaSuggestion[] = scored.slice(0, 8).map(({ m }) => ({
          id: m.id || m.materiaId,
          nombre: m.nombre || m.materiaNombre,
          unidad: m.unidad?.nombre || m.unidad?.unidadNombre || m.unidadNombre || m.unidadAcademica,
          anio: m.anio || m.anoEducativo,
          planEstudio: m.planEstudio !== undefined && m.planEstudio !== null
            ? m.planEstudio
            : (m.plan !== undefined && m.plan !== null ? m.plan : (m.nroPlan ?? '')),
          materia: m,
        }));

        setSuggestions(mapped);
        setShowSuggestions(mapped.length > 0);
        setActiveSuggestionIndex(-1);
      } catch (err) {
        console.warn('Error calculating closest materias:', err);
        setSuggestions([]);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [searchQuery, allMaterias]);

  // Click outside listener for suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const populateFormWithMateria = (materia: any) => {
    const mId = materia.id || materia.materiaId;
    const nombre = materia.nombre || materia.materiaNombre || '';
    const cantHoras = materia.horas !== undefined ? String(materia.horas) : (materia.cantHoras ? String(materia.cantHoras) : '');

    let depId = '';
    if (materia.dependenciaId) depId = String(materia.dependenciaId);
    else if (materia.tipoUnidadId) depId = String(materia.tipoUnidadId);
    else if (materia.unidad?.tipoUnidad?.id) depId = String(materia.unidad.tipoUnidad.id);
    else if (materia.unidad?.tipoUnidadId) depId = String(materia.unidad.tipoUnidadId);
    else if (materia.dependencia?.id) depId = String(materia.dependencia.id);

    let uniId = '';
    if (materia.unidadId) uniId = String(materia.unidadId);
    else if (materia.unidad?.id) uniId = String(materia.unidad.id);
    else if (materia.unidad?.unidadId) uniId = String(materia.unidad.unidadId);

    const anoEducativo = materia.anio || materia.anoEducativo || '';

    let despliegueTipo = '';
    let despliegueSemestre = '';
    const rawDespliegue = materia.despliegue || '';
    if (rawDespliegue === 'Anual') {
      despliegueTipo = 'Anual';
    } else if (rawDespliegue === 'Primer Semestre' || rawDespliegue === 'Segundo Semestre' || rawDespliegue.toLowerCase().includes('semestre')) {
      despliegueTipo = 'Semestral';
      despliegueSemestre = rawDespliegue;
    } else if (rawDespliegue) {
      despliegueTipo = rawDespliegue;
    }

    const nroPlan = materia.planEstudio !== undefined ? String(materia.planEstudio) : (materia.plan ? String(materia.plan) : '');

    setFormData({
      materiaId: mId,
      nombre,
      cantHoras,
      dependencia: depId || (!isGlobal && userUnitId ? String(getUserUnitInfo().tipoUnidadId || '') : ''),
      unidad: uniId || (!isGlobal && userUnitId ? String(userUnitId) : ''),
      anoEducativo,
      despliegueTipo,
      despliegueSemestre,
      nroPlan,
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
        populateFormWithMateria(data);
        setFeedback({
          type: 'info',
          message: `Materia "${data.nombre || id}" cargada para modificación.`,
        });
      } else if (fallbackData) {
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

      // Combine backend search results with preloaded catalog for closest match resolution
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

      // Score candidates to find the closest match
      const scored = candidates
        .map((m) => ({ m, score: calculateMateriaCloseness(m, term) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score);

      if (scored.length > 0) {
        const chosen = scored[0].m;
        const chosenId = chosen.id || chosen.materiaId;
        isSelectingRef.current = true;
        setSearchQuery(chosen.nombre || chosen.materiaNombre || term);
        if (chosenId) {
          await loadMateriaDetails(chosenId, chosen);
        } else {
          populateFormWithMateria(chosen);
          setFeedback({
            type: 'info',
            message: `Materia "${chosen.nombre}" cargada para modificación.`,
          });
        }
      } else {
        setFeedback({
          type: 'error',
          message: `No se encontró ninguna materia coincidente con "${term}".`,
        });
        setFormData(emptyFormState);
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

  const handleChange = (field: keyof FormState, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'dependencia' && (!userUnitId || isGlobal)) {
        next.unidad = '';
      }
      return next;
    });
    if (feedback && feedback.type !== 'info') setFeedback(null);
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
    setFeedback({
      type: 'info',
      message: 'Formulario limpiado. Busque una nueva materia para modificar.',
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!formData.materiaId) {
      setFeedback({
        type: 'error',
        message: 'Debe buscar y seleccionar una materia antes de guardar modificaciones.',
      });
      return;
    }

    // Validations (identical restrictions to Alta de Materia):
    // 1. Nombre: Obligatorio, máx 50 caracteres
    const trimmedNombre = formData.nombre.trim();
    if (!trimmedNombre) {
      setFeedback({ type: 'error', message: 'El campo Nombre es obligatorio.' });
      return;
    }
    if (trimmedNombre.length > 50) {
      setFeedback({ type: 'error', message: 'El Nombre no puede superar los 50 caracteres.' });
      return;
    }

    // 2. Horas: Entre 1 y 40
    const horasNum = Number(formData.cantHoras);
    if (!formData.cantHoras || isNaN(horasNum) || horasNum < 1 || horasNum > 40) {
      setFeedback({ type: 'error', message: 'La Cantidad de Horas debe ser un número entero entre 1 y 40.' });
      return;
    }

    // 3. Dependencia & Unidad
    if (!formData.unidad) {
      setFeedback({ type: 'error', message: 'Debe seleccionar una Unidad Académica.' });
      return;
    }

    // 4. Año Educativo
    if (!formData.anoEducativo) {
      setFeedback({ type: 'error', message: 'Debe seleccionar el Año Educativo.' });
      return;
    }

    // 5. Despliegue
    if (!formData.despliegueTipo) {
      setFeedback({ type: 'error', message: 'Debe seleccionar el Despliegue.' });
      return;
    }

    let despliegueFinal = formData.despliegueTipo;
    if (formData.despliegueTipo === 'Semestral') {
      if (!formData.despliegueSemestre) {
        setFeedback({ type: 'error', message: 'Debe seleccionar el semestre correspondiente.' });
        return;
      }
      despliegueFinal = formData.despliegueSemestre;
    }

    // 6. Plan de Estudio: Entre 1900 y 2100
    const planNum = Number(formData.nroPlan);
    if (!formData.nroPlan || isNaN(planNum) || planNum < 1900 || planNum > 2100) {
      setFeedback({ type: 'error', message: 'El N° de Plan de Estudio debe ser un año entre 1900 y 2100.' });
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

      // Partial patch request for RF-25
      const payload: {
        nombre: string;
        horas: number;
        anio: string;
        despliegue: string;
      } = {
        nombre: trimmedNombre,
        horas: Math.round(horasNum),
        anio: formData.anoEducativo,
        despliegue: despliegueFinal,
      };

      // Try PATCH first (standard RF-25 endpoint), fallback to PUT if needed
      let response = await fetch(`${apiUrl}/api/materias/${formData.materiaId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
      });

      if (response.status === 405) {
        // Fallback to PUT if backend only provides PUT
        const fullPayload = {
          ...payload,
          unidadId: Number(formData.unidad),
          planEstudio: Math.round(planNum),
          dependenciaId: formData.dependencia ? Number(formData.dependencia) : undefined,
        };
        response = await fetch(`${apiUrl}/api/materias/${formData.materiaId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(fullPayload),
        });
      }

      if (response.status === 401) {
        if (onLogout) onLogout();
        return;
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        let errorMsg = 'Error al modificar la materia.';
        if (data && (data.message || data.error)) {
          errorMsg = data.message || data.error;
        } else if (response.status === 400) {
          errorMsg = 'Datos inválidos. Verifique los campos ingresados.';
        } else if (response.status === 403) {
          errorMsg = 'No posee permisos para modificar materias en esta unidad académica.';
        } else if (response.status === 404) {
          errorMsg = 'La materia o la unidad académica especificada no existe.';
        } else if (response.status === 409) {
          errorMsg = data?.message || 'Conflicto: Ya existe otra materia con ese nombre o posee cátedras activas asociadas.';
        }
        setFeedback({ type: 'error', message: errorMsg });
        return;
      }

      setFeedback({
        type: 'success',
        message: `Materia "${data?.nombre || trimmedNombre}" modificada exitosamente.`,
      });
    } catch (error: any) {
      console.error('Error submitting Modificar Materia:', error);
      setFeedback({
        type: 'error',
        message: error?.message || 'Ocurrió un error al modificar la materia.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (onNavigate) {
      onNavigate('gestion');
    } else {
      window.history.back();
    }
  };

  return (
    <div className="modificar-materia-page">
      <Topbar onLogout={onLogout} />

      <div className="modificar-materia-body">
        <Sidebar activeItem="gestion" onNavigate={onNavigate} />

        <main className="modificar-materia-main">
          <div className="modificar-materia-content-area">
            {/* Top Navigation: Retroceder */}
            <div className="modificar-materia-top-nav">
              <button
                type="button"
                className="modificar-materia-back-btn"
                onClick={handleBack}
              >
                <FiChevronLeft className="modificar-materia-back-icon" />
                <span>Retroceder</span>
              </button>
            </div>

            {/* Container Card */}
            <div className="modificar-materia-container-card">
              {/* Header & Search Bar Row */}
              <div className="modificar-materia-header-row">
                <div className="modificar-materia-header-left">
                  <h1 className="modificar-materia-title">Gestión</h1>
                </div>

                {/* Search Bar matching ModificarCargo style */}
                <div className="modificar-materia-search-card">
                  <label htmlFor="searchMateriaInput" className="modificar-materia-search-label">
                    Buscar Materia a Modificar por Nombre
                  </label>
                  <div className="modificar-materia-search-row">
                    <div className="modificar-materia-search-input-wrap" ref={searchContainerRef}>
                      <input
                        id="searchMateriaInput"
                        name="busqueda_materia_query"
                        type="search"
                        className="modificar-materia-search-input"
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
                      <FiSearch className="modificar-materia-search-icon" />

                      {/* Suggestions Dropdown */}
                      {showSuggestions && suggestions.length > 0 && (
                        <ul className="modificar-materia-suggestions-list" role="listbox">
                          {suggestions.map((item, idx) => (
                            <li
                              key={item.id ?? idx}
                              className={`modificar-materia-suggestion-item ${idx === activeSuggestionIndex ? 'active' : ''}`}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                selectSuggestion(item);
                              }}
                              onMouseEnter={() => setActiveSuggestionIndex(idx)}
                              role="option"
                              aria-selected={idx === activeSuggestionIndex}
                            >
                              <div className="modificar-materia-suggestion-header">
                                <span className="modificar-materia-suggestion-name">
                                  {item.nombre}
                                </span>
                                {item.planEstudio ? (
                                  <span className="modificar-materia-suggestion-plan-badge">
                                    Plan {item.planEstudio}
                                  </span>
                                ) : null}
                              </div>
                              {(item.unidad || item.anio) && (
                                <span className="modificar-materia-suggestion-sub">
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
                      className="modificar-materia-search-btn"
                      onClick={() => handleSearch()}
                      disabled={isSearching}
                    >
                      <FiSearch />
                      <span>{isSearching ? 'Buscando...' : 'Buscar Materia'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Card */}
              <div className="modificar-materia-form-card">
                <div className="modificar-materia-card-header">
                  <h2>Modificar Materia</h2>
                </div>

                <div className="modificar-materia-card-body">
                  {feedback && (
                    <div className={`modificar-materia-feedback feedback-${feedback.type}`}>
                      {feedback.message}
                    </div>
                  )}

                  <form
                    className="modificar-materia-form"
                    onSubmit={handleSubmit}
                    onFocusCapture={() => {
                      if (feedback && feedback.type !== 'info') setFeedback(null);
                    }}
                  >
                    {/* SECTION: DATOS DE MATERIA */}
                    <h3 className="modificar-materia-section-title">Datos de Materia</h3>

                    {/* Row 1: Nombre, Cantidad de Horas */}
                    <div className="modificar-materia-grid-top">
                      <div className="modificar-materia-field">
                        <label htmlFor="nombre" className="modificar-materia-label">
                          Nombre *
                        </label>
                        <input
                          id="nombre"
                          name="nombre"
                          type="text"
                          maxLength={50}
                          className="modificar-materia-input"
                          placeholder="Ingrese nombre de la materia (máx. 50 caracteres)"
                          value={formData.nombre}
                          onChange={(e) => handleChange('nombre', e.target.value)}
                          autoComplete="off"
                        />
                      </div>

                      <div className="modificar-materia-field">
                        <label htmlFor="cantHoras" className="modificar-materia-label">
                          Cantidad de Horas *
                        </label>
                        <input
                          id="cantHoras"
                          name="cantHoras"
                          type="number"
                          min="1"
                          max="40"
                          className="modificar-materia-input"
                          placeholder="Horas semanales (1 a 40)"
                          value={formData.cantHoras}
                          onChange={(e) => handleChange('cantHoras', e.target.value)}
                          autoComplete="off"
                        />
                      </div>
                    </div>

                    {/* Row 2: Dependencia y Unidad Académica (Exact same inputs and selectors as Alta de Materia) */}
                    <div className="modificar-materia-grid-2">
                      <div className="modificar-materia-field">
                        <label htmlFor="dependencia" className="modificar-materia-label">
                          Dependencia
                        </label>
                        <div className="modificar-materia-select-wrapper">
                          <select
                            id="dependencia"
                            className="modificar-materia-select"
                            value={formData.dependencia}
                            onChange={(e) => handleChange('dependencia', e.target.value)}
                            disabled={(!isGlobal && !!userUnitId) || (isLoadingCatalogs && dependencias.length === 0)}
                          >
                            <option value="" disabled hidden>
                              {isLoadingCatalogs && dependencias.length === 0 ? 'Cargando dependencias...' : 'Seleccione'}
                            </option>
                            {dependencias.map((dep) => (
                              <option key={dep.id} value={dep.id}>
                                {dep.label}
                              </option>
                            ))}
                          </select>
                          <FiChevronDown className="modificar-materia-select-caret" />
                        </div>
                      </div>

                      <div className="modificar-materia-field">
                        <label htmlFor="unidad" className="modificar-materia-label">
                          Unidad Académica *
                        </label>
                        <div className="modificar-materia-select-wrapper">
                          <select
                            id="unidad"
                            className="modificar-materia-select"
                            value={formData.unidad}
                            onChange={(e) => handleChange('unidad', e.target.value)}
                            disabled={(!isGlobal && !!userUnitId) || isLoadingUnidades || (!formData.dependencia && unidades.length === 0)}
                          >
                            <option value="" disabled hidden>
                              {isLoadingUnidades
                                ? 'Cargando unidades...'
                                : !formData.dependencia
                                  ? 'Primero seleccione una dependencia'
                                  : 'Seleccione'}
                            </option>
                            {unidades.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.label}
                              </option>
                            ))}
                          </select>
                          <FiChevronDown className="modificar-materia-select-caret" />
                        </div>
                      </div>
                    </div>

                    {/* Row 3: Año Educativo, Despliegue, N° de Plan (Exact same inputs and selectors as Alta de Materia) */}
                    <div className={formData.despliegueTipo === 'Semestral' ? 'modificar-materia-grid-bottom' : 'modificar-materia-grid-3'}>
                      <div className="modificar-materia-field">
                        <label htmlFor="anoEducativo" className="modificar-materia-label">
                          Año Educativo *
                        </label>
                        <div className="modificar-materia-select-wrapper">
                          <select
                            id="anoEducativo"
                            className="modificar-materia-select"
                            value={formData.anoEducativo}
                            onChange={(e) => handleChange('anoEducativo', e.target.value)}
                          >
                            <option value="" disabled hidden>
                              Seleccione
                            </option>
                            {ANIO_EDUCATIVO_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                          <FiChevronDown className="modificar-materia-select-caret" />
                        </div>
                      </div>

                      <div className="modificar-materia-field">
                        <label htmlFor="despliegueTipo" className="modificar-materia-label">
                          Despliegue *
                        </label>
                        <div className="modificar-materia-select-wrapper">
                          <select
                            id="despliegueTipo"
                            className="modificar-materia-select"
                            value={formData.despliegueTipo}
                            onChange={(e) => handleChange('despliegueTipo', e.target.value)}
                          >
                            <option value="" disabled hidden>
                              Seleccione
                            </option>
                            <option value="Anual">Anual</option>
                            <option value="Semestral">Semestral</option>
                          </select>
                          <FiChevronDown className="modificar-materia-select-caret" />
                        </div>
                      </div>

                      {formData.despliegueTipo === 'Semestral' && (
                        <div className="modificar-materia-field">
                          <label htmlFor="despliegueSemestre" className="modificar-materia-label">
                            Semestre *
                          </label>
                          <div className="modificar-materia-select-wrapper">
                            <select
                              id="despliegueSemestre"
                              className="modificar-materia-select"
                              value={formData.despliegueSemestre}
                              onChange={(e) => handleChange('despliegueSemestre', e.target.value)}
                            >
                              <option value="" disabled hidden>
                                Seleccione
                              </option>
                              <option value="Primer Semestre">Primer Semestre</option>
                              <option value="Segundo Semestre">Segundo Semestre</option>
                            </select>
                            <FiChevronDown className="modificar-materia-select-caret" />
                          </div>
                        </div>
                      )}

                      <div className="modificar-materia-field">
                        <label htmlFor="nroPlan" className="modificar-materia-label">
                          N° de Plan de Estudio *
                        </label>
                        <input
                          id="nroPlan"
                          name="nroPlan"
                          type="number"
                          min="1900"
                          max="2100"
                          className="modificar-materia-input"
                          placeholder="Ej: 2023"
                          value={formData.nroPlan}
                          onChange={(e) => handleChange('nroPlan', e.target.value)}
                          autoComplete="off"
                        />
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* Bottom Actions Toolbar: Borrar & Confirmar */}
            <div className="modificar-materia-actions">
              <button
                type="button"
                className="btn-modificar-materia btn-modificar-materia-borrar"
                onClick={handleClear}
                disabled={isSubmitting}
              >
                <FiTrash2 className="btn-icon" />
                <span>Borrar</span>
              </button>

              <button
                type="button"
                className="btn-modificar-materia btn-modificar-materia-confirmar"
                onClick={() => handleSubmit()}
                disabled={isSubmitting}
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
