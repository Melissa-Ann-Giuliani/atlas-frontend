import React, { useState, useEffect, useRef } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { es } from 'date-fns/locale/es';
import 'react-datepicker/dist/react-datepicker.css';
import './ModificarUsuario.css';
import Sidebar from '../../../components/Sidebar';
import Topbar from '../../../components/Topbar';
import {
  FiChevronLeft,
  FiChevronDown,
  FiTrash2,
  FiCheckSquare,
  FiSearch,
  FiRefreshCw,
  FiEye,
  FiEyeOff,
  FiCalendar,
} from 'react-icons/fi';

registerLocale('es', es);

interface ModificarUsuarioProps {
  initialDocente?: any;
  onLogout?: () => void;
  onNavigate?: (page: any, data?: any) => void;
  onBack?: () => void;
}

interface FormState {
  usuarioId: number | null;
  apellido: string;
  nombre: string;
  correo: string;
  username: string;
  password: string;
  rol: string;
  cargo: string;
  dependencia: string;
  unidad: string;
  tipoDni: string;
  numeroDni: string;
  cuil: string;
  domicilio: string;
  emailInstitucional: string;
  fechaIngreso: string;
  antigPrevia: string;
}

interface CargoOption {
  id: string;
  label: string;
}

interface TipoDniOption {
  value: string;
  nombre?: string;
  label: string;
}

interface DependenciaOption {
  id: string | number;
  label: string;
}

interface UnidadOption {
  id: string | number;
  label: string;
  tipoUnidadId?: number;
  tipoUnidadNombre?: string;
}

interface UserSuggestion {
  id: number;
  usuarioId?: number;
  nombreCompleto: string;
  dni?: string;
  unidad?: string;
  role?: string;
  userData?: any;
}

const defaultTiposDni: TipoDniOption[] = [
  { value: 'DNI', label: 'DNI' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
];

const defaultCargosAuditor: CargoOption[] = [
  { id: 'DECANO', label: 'Decano' },
  { id: 'VICEDECANO', label: 'Vicedecano' },
  { id: 'SECRETARIA_ADMINISTRATIVA', label: 'Secretaría Administrativa' },
];

const initialFormState: FormState = {
  usuarioId: null,
  apellido: '',
  nombre: '',
  correo: '',
  username: '',
  password: '',
  rol: 'DOCENTE',
  cargo: '',
  dependencia: '',
  unidad: '',
  tipoDni: 'DNI',
  numeroDni: '',
  cuil: '',
  domicilio: '',
  emailInstitucional: '',
  fechaIngreso: '',
  antigPrevia: '',
};

/**
 * Extracts and canonicalizes the role string from diverse backend formats:
 * - String: 'ADMIN_UNIDAD', 'ROLE_ADMIN_UNIDAD', etc.
 * - Object: { id: 2, nombre: 'ADMIN_UNIDAD' }, { rolNombre: 'ADMIN_UNIDAD' }, etc.
 */
function extractRole(roleCandidate: any): string | null {
  if (!roleCandidate) return null;
  let raw = '';
  if (typeof roleCandidate === 'string') {
    raw = roleCandidate;
  } else if (typeof roleCandidate === 'object') {
    raw =
      roleCandidate.nombre ||
      roleCandidate.rolNombre ||
      roleCandidate.rol_nombre ||
      roleCandidate.name ||
      roleCandidate.authority ||
      roleCandidate.codigo ||
      roleCandidate.id ||
      '';
  }
  if (!raw || typeof raw !== 'string') return null;

  const upper = raw.toUpperCase().trim();
  if (upper.includes('ADMIN_GLOBAL') || upper === 'ADMIN GLOBAL' || upper === 'ADMINISTRADOR GLOBAL') {
    return 'ADMIN_GLOBAL';
  }
  if (upper.includes('ADMIN_UNIDAD') || upper.includes('UNIDAD')) {
    return 'ADMIN_UNIDAD';
  }
  if (upper.includes('AUDITOR')) {
    return 'AUDITOR';
  }
  if (upper.includes('DOCENTE')) {
    return 'DOCENTE';
  }
  return upper;
}

/**
 * Formats enum-style or uppercase strings (e.g. DIRECCION_DE_PERSONAL) into
 * human-readable title case with accents (e.g. Dirección de Personal).
 */
function formatDisplayText(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  const upper = trimmed.toUpperCase();

  const exactDict: Record<string, string> = {
    DIRECCION_DE_PERSONAL: 'Dirección de Personal',
    'DIRECCION DE PERSONAL': 'Dirección de Personal',
    SECRETARIA_ADMINISTRATIVA: 'Secretaría Administrativa',
    'SECRETARIA ADMINISTRATIVA': 'Secretaría Administrativa',
    ADMIN_GLOBAL: 'Admin Global',
    ADMIN_UNIDAD: 'Admin de Unidad',
    AUDITOR: 'Auditor',
    DOCENTE: 'Docente',
    DECANO: 'Decano',
    VICEDECANO: 'Vicedecano',
  };

  if (exactDict[upper]) {
    return exactDict[upper];
  }

  // If it's UPPER_SNAKE_CASE or all caps
  if (trimmed.includes('_') || trimmed === upper) {
    const minorWords = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'en', 'a']);
    return trimmed
      .split(/[_\s]+/)
      .map((word, index) => {
        const lower = word.toLowerCase();
        if (index > 0 && minorWords.has(lower)) {
          return lower;
        }
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      })
      .join(' ');
  }

  return trimmed;
}

/**
 * Normalizes text: lowercase, removes accents/diacritics, and extra spaces.
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
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

/**
 * Calculates a closeness / relevance score between a user and the search query,
 * similar to calculateMateriaCloseness in ModificarMateria.
 * Higher score = closer match. Returns 0 if not a relevant match.
 */
function calculateUserCloseness(user: any, rawQuery: string): number {
  const q = normalizeSearchText(rawQuery);
  if (!q) return 0;

  const apellido = user.apellido || user.docenteApellido || user.usuario?.apellido || user.datosPersonales?.apellido || '';
  const nombre = user.nombre || user.docenteNombre || user.usuario?.nombre || user.datosPersonales?.nombre || '';
  const username = user.username || user.usuario?.username || '';
  const correo = user.correo || user.email || user.usuario?.correo || '';
  const dni = String(user.dni || user.numeroDni || user.datosPersonales?.dni || '').trim();

  const fullDirect = normalizeSearchText(`${nombre} ${apellido}`);
  const fullReverse = normalizeSearchText(`${apellido} ${nombre}`);
  const normUsername = normalizeSearchText(username);
  const normCorreo = normalizeSearchText(correo);

  // 1. Exact match on DNI, username, or full name
  if (dni && (dni === q || dni.replace(/\D/g, '') === q.replace(/\D/g, ''))) {
    return 10000;
  }
  if (fullDirect === q || fullReverse === q || normUsername === q) {
    return 9800;
  }

  // 2. Starts with query (prefix match)
  if (fullReverse.startsWith(q) || fullDirect.startsWith(q) || normUsername.startsWith(q)) {
    const minLen = Math.min(fullReverse.length, fullDirect.length);
    const lengthPenalty = Math.min(300, (minLen - q.length) * 2);
    return 8000 - lengthPenalty;
  }

  // 3. Word starts with query (e.g. query "gonzalez" matches "Carlos Gonzalez")
  const words = [...fullReverse.split(' '), ...fullDirect.split(' '), normUsername].filter(Boolean);
  const qWords = q.split(' ');
  const wordIdx = words.findIndex((w) => w.startsWith(q));
  if (wordIdx !== -1) {
    return 6000 - wordIdx * 50 - Math.min(200, fullReverse.length - q.length);
  }

  // 4. Multi-word query where all words are contained
  if (qWords.length > 1) {
    const allWordsMatch = qWords.every((qw) =>
      words.some((w) => w.startsWith(qw) || w.includes(qw))
    );
    if (allWordsMatch) {
      return 5500 - Math.min(300, fullReverse.length - q.length);
    }
  }

  // 5. Query is a substring of the full name, username, or correo
  if (fullReverse.includes(q) || fullDirect.includes(q) || normUsername.includes(q) || normCorreo.includes(q)) {
    return 4000 - Math.min(200, fullReverse.length - q.length);
  }

  // 6. DNI prefix match
  if (dni && dni.startsWith(q)) {
    return 3500;
  }

  // 7. Fuzzy matching for typos (Levenshtein distance)
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

    if (fullReverse.length >= q.length) {
      const prefix = fullReverse.slice(0, q.length + 1);
      const dist = getLevenshteinDistance(prefix, q);
      const sim = 1 - dist / Math.max(prefix.length, q.length);
      if (sim >= 0.7) {
        return Math.round(2500 * sim);
      }
    }
  }

  return 0;
}

export default function ModificarUsuario({
  initialDocente,
  onLogout,
  onNavigate,
  onBack,
}: ModificarUsuarioProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Search & Role Filter
  const [selectedFilterRole, setSelectedFilterRole] = useState<string>('DOCENTE');

  // Role Catalogs
  const [tiposDni, setTiposDni] = useState<TipoDniOption[]>(defaultTiposDni);
  const [cargosAdminGlobal, setCargosAdminGlobal] = useState<CargoOption[]>([]);
  const [cargosAdminUnidad, setCargosAdminUnidad] = useState<CargoOption[]>([]);
  const [cargosAuditor, setCargosAuditor] = useState<CargoOption[]>(defaultCargosAuditor);
  const [dependencias, setDependencias] = useState<DependenciaOption[]>([]);
  const [unidades, setUnidades] = useState<UnidadOption[]>([]);

  // Catalogs Loading Flags
  const [isLoadingTiposDni, setIsLoadingTiposDni] = useState<boolean>(false);
  const [isLoadingCargosGlobal, setIsLoadingCargosGlobal] = useState<boolean>(false);
  const [isLoadingCargosUnidad, setIsLoadingCargosUnidad] = useState<boolean>(false);
  const [isLoadingCargosAuditor, setIsLoadingCargosAuditor] = useState<boolean>(false);
  const [isLoadingDependencias, setIsLoadingDependencias] = useState<boolean>(false);
  const [isLoadingUnidades, setIsLoadingUnidades] = useState<boolean>(false);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const isSelectingRef = useRef<boolean>(false);

  // Password visibility & regeneration
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoadingPassword, setIsLoadingPassword] = useState<boolean>(false);

  // Parse YYYY-MM-DD from formData into Date object for DatePicker
  const parseIsoToDate = (isoStr: string): Date | null => {
    if (!isoStr) return null;
    const [year, month, day] = isoStr.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };

  // Format Date object to YYYY-MM-DD for formData & backend
  const formatDateToIso = (date: Date | null): string => {
    if (!date || isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Role evaluation booleans (same as NuevoUsuario)
  const isAdminGlobal =
    selectedFilterRole === 'ADMIN_GLOBAL' ||
    selectedFilterRole.toLowerCase().includes('global');

  const isAdminUnidad =
    selectedFilterRole === 'ADMIN_UNIDAD' ||
    selectedFilterRole.toLowerCase().includes('unidad');

  const isAuditor =
    selectedFilterRole === 'AUDITOR' ||
    selectedFilterRole.toLowerCase().includes('auditor');

  const isDocente =
    selectedFilterRole === 'DOCENTE' ||
    selectedFilterRole.toLowerCase().includes('docente');

  const selectedDependencia = dependencias.find(
    (d) => String(d.id) === String(formData.dependencia) || d.label === formData.dependencia
  );

  const dynamicUnidadLabel = selectedDependencia?.label || 'Unidad';

  // Catalog fetchers
  const fetchTiposDni = async () => {
    setIsLoadingTiposDni(true);
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

      const response = await fetch(`${apiUrl}/api/usuarios/docente/tipos-dni`, { headers });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          const mapped: TipoDniOption[] = data.map((item: any) => ({
            value: item.value ?? item.id ?? item.nombre,
            label: item.label ?? item.nombre ?? item.value ?? String(item),
          }));
          setTiposDni(mapped);
          return;
        }
      }
      setTiposDni(defaultTiposDni);
    } catch {
      setTiposDni(defaultTiposDni);
    } finally {
      setIsLoadingTiposDni(false);
    }
  };

  const fetchCargosAdminGlobal = async () => {
    setIsLoadingCargosGlobal(true);
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

      const response = await fetch(`${apiUrl}/api/usuarios/admin-global/cargos`, { headers });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          const mapped: CargoOption[] = data.map((item: any) => {
            const idVal = typeof item === 'string' ? item : item.id ?? item.nombre ?? String(item);
            const rawLabel = typeof item === 'string' ? item : item.nombre ?? item.descripcion ?? idVal;
            const formattedLabel = formatDisplayText(rawLabel);
            return { id: idVal, label: formattedLabel };
          });
          setCargosAdminGlobal(mapped);
        }
      }
    } catch (e) {
      console.warn('Error fetching cargos Admin Global:', e);
    } finally {
      setIsLoadingCargosGlobal(false);
    }
  };

  const fetchCargosAuditor = async () => {
    setIsLoadingCargosAuditor(true);
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

      let response = await fetch(`${apiUrl}/api/usuarios/auditor/cargos`, { headers });
      if (!response.ok && response.status === 404) {
        response = await fetch(`${apiUrl}/api/usuarios/auditores/cargos`, { headers });
      }

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          const mapped: CargoOption[] = data.map((item: any) => {
            const idVal = typeof item === 'string' ? item : item.value ?? item.id ?? item.nombre ?? String(item);
            const rawLabel = typeof item === 'string' ? item : item.label ?? item.nombre ?? item.descripcion ?? idVal;
            const formattedLabel = formatDisplayText(rawLabel);
            return { id: idVal, label: formattedLabel };
          });
          setCargosAuditor(mapped);
          return;
        }
      }
      setCargosAuditor(defaultCargosAuditor);
    } catch {
      setCargosAuditor(defaultCargosAuditor);
    } finally {
      setIsLoadingCargosAuditor(false);
    }
  };

  const fetchCargosAdminUnidad = async () => {
    setIsLoadingCargosUnidad(true);
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

      const response = await fetch(`${apiUrl}/api/usuarios/admin-unidad/cargos`, { headers });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          const mapped: CargoOption[] = data.map((item: any) => {
            const idVal = typeof item === 'string' ? item : item.value ?? item.id ?? item.nombre ?? String(item);
            const rawLabel = typeof item === 'string' ? item : item.label ?? item.nombre ?? item.descripcion ?? idVal;
            const formattedLabel = rawLabel.includes('_')
              ? rawLabel
                .split('_')
                .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                .join(' ')
              : rawLabel;
            return { id: idVal, label: formattedLabel };
          });
          setCargosAdminUnidad(mapped);
        }
      }
    } catch (e) {
      console.warn('Error fetching cargos Admin Unidad:', e);
    } finally {
      setIsLoadingCargosUnidad(false);
    }
  };

  const fetchDependencias = async () => {
    setIsLoadingDependencias(true);
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

      const response = await fetch(`${apiUrl}/api/tipos-unidad`, { headers });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          const mapped: DependenciaOption[] = data.map((item: any) => ({
            id: item.tipoUnidadId ?? item.id ?? item.nombre,
            label: item.tipoUnidadNombre ?? item.nombre ?? item.descripcion ?? String(item.id || item),
          }));
          setDependencias(mapped);
        }
      }
    } catch (e) {
      console.warn('Error fetching dependencias:', e);
    } finally {
      setIsLoadingDependencias(false);
    }
  };

  const fetchUnidadesPorTipo = async (tipoId: string | number) => {
    if (!tipoId) {
      setUnidades([]);
      return;
    }
    setIsLoadingUnidades(true);
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

      const response = await fetch(`${apiUrl}/api/unidades?tipoUnidadId=${encodeURIComponent(tipoId)}`, { headers });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          const mapped: UnidadOption[] = data.map((item: any) => ({
            id: item.unidadId ?? item.id,
            label: item.unidadNombre ?? item.nombre ?? String(item.unidadId || item.id),
            tipoUnidadId: item.tipoUnidadId,
            tipoUnidadNombre: item.tipoUnidadNombre,
          }));
          setUnidades(mapped);
        }
      }
    } catch (e) {
      console.warn('Error fetching unidades:', e);
    } finally {
      setIsLoadingUnidades(false);
    }
  };



  // Fetch catalogs dynamically based on active role
  useEffect(() => {
    if (isAdminGlobal) {
      fetchCargosAdminGlobal();
      setFormData((prev) => (prev.dependencia || prev.unidad ? { ...prev, dependencia: '', unidad: '' } : prev));
      setUnidades([]);
    } else if (isAdminUnidad) {
      fetchCargosAdminUnidad();
      fetchDependencias();
    } else if (isAuditor) {
      fetchCargosAuditor();
      setFormData((prev) => (prev.dependencia || prev.unidad ? { ...prev, dependencia: '', unidad: '' } : prev));
      setUnidades([]);
    } else if (isDocente) {
      fetchTiposDni();
      setFormData((prev) => (prev.cargo || prev.dependencia || prev.unidad ? { ...prev, cargo: '', dependencia: '', unidad: '' } : prev));
      setUnidades([]);
    }
  }, [selectedFilterRole]);

  useEffect(() => {
    if (isAdminUnidad && formData.dependencia) {
      fetchUnidadesPorTipo(formData.dependencia);
    } else {
      setUnidades([]);
    }
  }, [isAdminUnidad, formData.dependencia]);

  // Handle initialDocente prop if provided (e.g. from DocenteDetalle edit button)
  useEffect(() => {
    if (initialDocente) {
      const targetId = initialDocente.usuarioId || initialDocente.id;
      const targetName =
        initialDocente.apellido && initialDocente.nombre
          ? `${initialDocente.apellido}, ${initialDocente.nombre}`
          : initialDocente.nombre || '';
      if (targetName) {
        setSearchQuery(targetName);
      }
      setSelectedFilterRole('DOCENTE');
      if (targetId) {
        loadUserDetails(targetId, 'DOCENTE', initialDocente);
      } else {
        populateForm(initialDocente, 'DOCENTE');
      }
    }
  }, [initialDocente]);

  // Debounced search for suggestions based on selected role
  useEffect(() => {
    if (isSelectingRef.current) return;

    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

        let list: any[] = [];
        if (isDocente) {
          // Fetch docente suggestions
          try {
            const res = await fetch(`${apiUrl}/api/docentes?search=${encodeURIComponent(trimmed)}&size=20`, { headers });
            if (res.ok) {
              const data = await res.json();
              list = data.content || (Array.isArray(data) ? data : []);
            }
          } catch (e) {
            console.warn('Error fetching docentes:', e);
          }
        } else {
          // Fetch usuario suggestions filtered by role
          try {
            const res = await fetch(
              `${apiUrl}/api/usuarios?search=${encodeURIComponent(trimmed)}&rol=${encodeURIComponent(selectedFilterRole)}&size=20`,
              { headers }
            );
            if (res.ok) {
              const data = await res.json();
              list = data.content || (Array.isArray(data) ? data : []);
            }
          } catch (e) {
            console.warn('Error fetching usuarios:', e);
          }
        }

        if (list.length > 0) {
          // Score and rank candidates using calculateUserCloseness
          const scored = list
            .map((item: any) => ({
              item,
              score: calculateUserCloseness(item, trimmed),
            }))
            .filter((entry) => entry.score > 0)
            .sort((a: { score: number }, b: { score: number }) => b.score - a.score);

          // If some items matched fuzzy score, use them; otherwise fallback to backend order
          const rankedList = scored.length > 0 ? scored.map((s) => s.item) : list;

          const mapped: UserSuggestion[] = rankedList.slice(0, 10).map((item: any) => {
            const apellido = item.apellido || item.docenteApellido || item.usuario?.apellido || item.datosPersonales?.apellido || '';
            const nombre = item.nombre || item.docenteNombre || item.usuario?.nombre || item.datosPersonales?.nombre || '';
            const username = item.username || item.usuario?.username || '';
            const nombreCompleto =
              apellido && nombre
                ? `${apellido}, ${nombre}`
                : nombre || apellido || username || `Usuario #${item.id || item.usuarioId}`;

            const dniVal = item.dni ?? item.numeroDni ?? item.datosPersonales?.dni;

            const extractedItemRole =
              extractRole(item.rol) ||
              extractRole(item.rolNombre) ||
              extractRole(item.usuario?.rol) ||
              extractRole(item.role) ||
              selectedFilterRole;

            // Compute descriptive subtitle (especially for Admin de Unidad: "Director de Departamento de Matemática")
            let unidadVal = '';
            if (extractedItemRole === 'ADMIN_UNIDAD') {
              const rawCargo = item.cargo || item.cargoNombre || item.cargoAdNombre || '';
              const rawTipo =
                item.tipoUnidadNombre ||
                item.tipoUnidad ||
                item.dependencia ||
                item.unidad?.tipoUnidad?.nombre ||
                '';
              const rawUni =
                item.unidadNombre ||
                (typeof item.unidad === 'string' ? item.unidad : item.unidad?.nombre || item.unidad?.unidadNombre || '');

              const formattedCargo = formatDisplayText(rawCargo);
              const formattedTipo = formatDisplayText(rawTipo);
              const formattedUni = formatDisplayText(rawUni);

              const parts: string[] = [];
              if (formattedCargo) parts.push(formattedCargo);
              if (formattedTipo) parts.push(formattedTipo);
              if (formattedUni) parts.push(formattedUni);

              if (parts.length > 0) {
                unidadVal = parts.join(' de ');
              } else {
                unidadVal = formatDisplayText(item.unidad || item.cargo || '');
              }
            } else {
              const rawUnidadVal = item.unidad || item.unidadNombre || item.cargo || '';
              unidadVal = formatDisplayText(rawUnidadVal);
            }

            return {
              id: item.usuarioId || item.id,
              usuarioId: item.usuarioId || item.id,
              nombreCompleto,
              dni: dniVal ? String(dniVal) : undefined,
              unidad: unidadVal,
              role: extractedItemRole,
              userData: item,
            };
          });

          setSuggestions(mapped);
          setShowSuggestions(mapped.length > 0);
          setActiveSuggestionIndex(-1);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (err) {
        console.warn('Error fetching user suggestions:', err);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedFilterRole, isDocente]);

  // Click outside listener for suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const populateForm = (userData: any, roleHint?: string) => {
    // Collect all nested containers that backend endpoints might return
    const dp = userData.datosPersonales || {};
    const usr = userData.usuario || {};
    const doc = userData.docente || {};
    const des = (userData.designacionesYCargos && userData.designacionesYCargos[0]) || {};

    const uId =
      userData.usuarioId ||
      userData.id ||
      usr.id ||
      usr.usuarioId ||
      doc.usuarioId ||
      doc.id;

    // Names & Identity
    const apellido =
      dp.apellido ||
      userData.apellido ||
      usr.apellido ||
      doc.apellido ||
      userData.docenteApellido ||
      '';
    const nombre =
      dp.nombre ||
      userData.nombre ||
      usr.nombre ||
      doc.nombre ||
      userData.docenteNombre ||
      '';

    // Account & Contact
    const correo =
      dp.correo ||
      userData.correo ||
      usr.correo ||
      userData.email ||
      usr.email ||
      dp.email ||
      '';
    const username =
      usr.username ||
      userData.username ||
      doc.username ||
      '';
    const rawRole =
      extractRole(roleHint) ||
      extractRole(userData.rol) ||
      extractRole(usr.rol) ||
      extractRole(userData.rolNombre) ||
      extractRole(userData.role) ||
      extractRole(selectedFilterRole) ||
      'DOCENTE';

    const rol = rawRole;

    if (rol && rol !== selectedFilterRole) {
      setSelectedFilterRole(rol);
    }

    // Role specific fields
    const cargo =
      userData.cargo ||
      userData.cargoNombre ||
      userData.cargoAudNombre ||
      userData.cargoAdNombre ||
      des.cargo ||
      des.cargoNombre ||
      '';
    const dependencia =
      userData.dependencia ||
        userData.tipoUnidadId ||
        dp.tipoUnidadId ||
        '' ? String(userData.dependencia || userData.tipoUnidadId || dp.tipoUnidadId) : '';
    const unidad =
      userData.unidadId ||
        userData.unidad ||
        dp.unidadId ||
        dp.unidadNombre ||
        '' ? String(userData.unidadId || userData.unidad || dp.unidadId || dp.unidadNombre) : '';

    // Identification & Personal Data
    const tipoDni = dp.tipoDni || userData.tipoDni || 'DNI';
    const rawDni = dp.dni ?? userData.dni ?? doc.dni ?? usr.dni;
    const numeroDni = rawDni !== undefined && rawDni !== null ? String(rawDni) : '';

    const rawCuil = dp.cuil ?? userData.cuil ?? doc.cuil ?? usr.cuil;
    const cuil = rawCuil !== undefined && rawCuil !== null ? String(rawCuil) : '';

    const domicilio = dp.domicilio || userData.domicilio || doc.domicilio || '';
    const emailInstitucional =
      dp.emailInstitucional ||
      userData.emailInstitucional ||
      doc.emailInstitucional ||
      '';

    let fechaIngreso = '';
    const rawFecha =
      dp.fechaIngreso ||
      userData.fechaIngreso ||
      doc.fechaIngreso ||
      des.fechaInicio ||
      '';
    if (rawFecha) {
      fechaIngreso = String(rawFecha).split('T')[0];
    }

    const rawAntig =
      dp.antigPrevia ??
      userData.antigPrevia ??
      doc.antigPrevia;
    const antigPrevia =
      rawAntig !== undefined && rawAntig !== null ? String(rawAntig) : '';

    setFormData({
      usuarioId: uId ? Number(uId) : null,
      apellido,
      nombre,
      correo,
      username,
      password: '',
      rol,
      cargo,
      dependencia,
      unidad,
      tipoDni,
      numeroDni,
      cuil,
      domicilio,
      emailInstitucional,
      fechaIngreso,
      antigPrevia,
    });
  };

  const loadUserDetails = async (id: number, role: string, fallbackData?: any) => {
    setIsSearching(true);
    setFeedback(null);
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

      let endpoint = `${apiUrl}/api/usuarios/${id}`;
      if (role === 'DOCENTE') {
        endpoint = `${apiUrl}/api/docentes/${id}`;
      }

      const response = await fetch(endpoint, { headers });
      if (response.ok) {
        let data = await response.json();

        // If it's a DOCENTE and user credentials (username, correo) are not in the response,
        // fetch the linked usuario profile to populate them as well
        if (role === 'DOCENTE') {
          // Merge any personal data from fallbackData if the backend didn't supply them in data
          if (fallbackData) {
            data = {
              ...fallbackData,
              ...data,
              datosPersonales: {
                ...(fallbackData.datosPersonales || {}),
                ...(data.datosPersonales || {}),
                cuil: data.datosPersonales?.cuil ?? fallbackData.cuil ?? fallbackData.datosPersonales?.cuil,
                domicilio: data.datosPersonales?.domicilio ?? fallbackData.domicilio ?? fallbackData.datosPersonales?.domicilio,
                antigPrevia: data.datosPersonales?.antigPrevia ?? fallbackData.antigPrevia ?? fallbackData.datosPersonales?.antigPrevia,
                fechaIngreso: data.datosPersonales?.fechaIngreso ?? fallbackData.fechaIngreso ?? fallbackData.datosPersonales?.fechaIngreso,
                tipoDni: data.datosPersonales?.tipoDni ?? fallbackData.tipoDni ?? fallbackData.datosPersonales?.tipoDni,
              },
            };
          }

          const usrId = data.usuarioId || data.usuario?.id || fallbackData?.usuarioId || fallbackData?.id || id;
          if (!data.usuario?.username && !data.username && !data.correo) {
            try {
              // Try fetching by userId first
              let uRes = await fetch(`${apiUrl}/api/usuarios/${usrId}`, { headers });
              if (!uRes.ok && (data.datosPersonales?.dni || data.dni)) {
                // Fallback search by DNI to locate the linked Usuario
                const dniToSearch = data.datosPersonales?.dni || data.dni;
                uRes = await fetch(`${apiUrl}/api/usuarios?search=${encodeURIComponent(String(dniToSearch))}&size=1`, { headers });
              }

              if (uRes.ok) {
                const uData = await uRes.json();
                const resolvedUser = Array.isArray(uData?.content) ? uData.content[0] : (Array.isArray(uData) ? uData[0] : uData);
                if (resolvedUser) {
                  data = {
                    ...resolvedUser,
                    ...data,
                    usuario: { ...(resolvedUser.usuario || resolvedUser), ...(data.usuario || {}) },
                    correo: data.correo || resolvedUser.correo || resolvedUser.email,
                    username: data.username || resolvedUser.username,
                  };
                }
              }
            } catch {
              // ignore supplementary fetch failure
            }
          }
        }

        populateForm(data, role);
        const fullName =
          data.datosPersonales?.apellido && data.datosPersonales?.nombre
            ? `${data.datosPersonales.apellido}, ${data.datosPersonales.nombre}`
            : data.apellido && data.nombre
              ? `${data.apellido}, ${data.nombre}`
              : data.nombre || data.username || `ID #${id}`;
        setFeedback({
          type: 'info',
          message: `Usuario "${fullName}" cargado para modificación.`,
        });
      } else if (fallbackData) {
        populateForm(fallbackData, role);
        setFeedback({
          type: 'info',
          message: `Datos del usuario cargados.`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: `No se pudo encontrar el usuario con ID ${id}.`,
        });
      }
    } catch (err: any) {
      if (fallbackData) {
        populateForm(fallbackData, role);
      } else {
        setFeedback({
          type: 'error',
          message: err.message || 'Error de conexión al cargar el usuario.',
        });
      }
    } finally {
      setIsSearching(false);
    }
  };

  const selectSuggestion = (sug: UserSuggestion) => {
    isSelectingRef.current = true;
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);
    setSearchQuery(sug.nombreCompleto);
    const resolvedRole = sug.role || selectedFilterRole;
    if (sug.id) {
      loadUserDetails(sug.id, resolvedRole, sug.userData);
    } else if (sug.userData) {
      populateForm(sug.userData, resolvedRole);
    }
    setTimeout(() => {
      isSelectingRef.current = false;
    }, 300);
  };

  const handleSearch = async (termToSearch?: string) => {
    const term = (termToSearch !== undefined ? termToSearch : searchQuery).trim();
    setShowSuggestions(false);
    if (!term) {
      setFeedback({
        type: 'error',
        message: 'Por favor, ingrese un término de búsqueda (nombre, apellido, usuario o documento).',
      });
      return;
    }

    setIsSearching(true);
    setFeedback(null);

    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

      let endpoint = `${apiUrl}/api/docentes?search=${encodeURIComponent(term)}&size=20`;
      if (!isDocente) {
        endpoint = `${apiUrl}/api/usuarios?search=${encodeURIComponent(term)}&rol=${encodeURIComponent(selectedFilterRole)}&size=20`;
      }

      const response = await fetch(endpoint, { headers });

      if (response.ok) {
        const data = await response.json();
        const list = data.content || (Array.isArray(data) ? data : []);

        if (list.length > 0) {
          // Rank candidates using calculateUserCloseness
          const scored = list
            .map((u: any) => ({ u, score: calculateUserCloseness(u, term) }))
            .sort((a: { score: number }, b: { score: number }) => b.score - a.score);

          const exactOrFirst = scored[0]?.u || list[0];

          const targetId = exactOrFirst.usuarioId || exactOrFirst.id;
          if (targetId) {
            await loadUserDetails(targetId, selectedFilterRole, exactOrFirst);
          } else {
            populateForm(exactOrFirst, selectedFilterRole);
          }
        } else {
          setFeedback({
            type: 'error',
            message: `No se encontró ningún usuario con el criterio "${term}".`,
          });
        }
      } else {
        setFeedback({
          type: 'error',
          message: 'Error en la búsqueda del usuario.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error de conexión al buscar el usuario.',
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
        setActiveSuggestionIndex(-1);
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
      if (field === 'dependencia') {
        return { ...prev, dependencia: value, unidad: '' };
      }
      return { ...prev, [field]: value };
    });
    if (feedback) setFeedback(null);
  };

  const handleFilterRoleChange = (newRole: string) => {
    setSelectedFilterRole(newRole);
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setFormData({
      ...initialFormState,
      rol: newRole,
      cargo: '',
      dependencia: '',
      unidad: '',
    });
    setFeedback(null);
  };

  const fetchRandomPassword = async () => {
    setIsLoadingPassword(true);
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

      const res = await fetch(`${apiUrl}/api/usuarios/generar-password`, { headers });
      if (res.ok) {
        const data = await res.json();
        const pwd = data.password || data.generatedPassword || data.valor;
        if (pwd) {
          setFormData((prev) => ({ ...prev, password: pwd }));
          return;
        }
      }
      const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*';
      let result = '';
      for (let i = 0; i < 10; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
      }
      setFormData((prev) => ({ ...prev, password: result }));
    } catch {
      const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*';
      let result = '';
      for (let i = 0; i < 10; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
      }
      setFormData((prev) => ({ ...prev, password: result }));
    } finally {
      setIsLoadingPassword(false);
    }
  };

  const handleClear = () => {
    setFormData({ ...initialFormState, rol: selectedFilterRole });
    setSearchQuery('');
    setFeedback({
      type: 'info',
      message: 'Los campos del formulario han sido limpiados.',
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!formData.usuarioId) {
      setFeedback({
        type: 'error',
        message: 'Debe buscar y seleccionar un usuario antes de guardar las modificaciones.',
      });
      return;
    }

    if (
      !formData.apellido.trim() ||
      !formData.nombre.trim() ||
      !formData.correo.trim() ||
      !formData.username.trim()
    ) {
      setFeedback({
        type: 'error',
        message: 'Por favor, complete todos los campos obligatorios marcados con *.',
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.correo.trim())) {
      setFeedback({
        type: 'error',
        message: 'Por favor, ingrese un formato de correo electrónico válido.',
      });
      return;
    }

    // Role-specific validations (same as NuevoUsuario)
    if (isAdminGlobal && !formData.cargo) {
      setFeedback({
        type: 'error',
        message: 'Por favor, seleccione un cargo para el Administrador Global.',
      });
      return;
    }

    if (isAuditor && !formData.cargo) {
      setFeedback({
        type: 'error',
        message: 'Por favor, seleccione un cargo para el Auditor.',
      });
      return;
    }

    if (isAdminUnidad) {
      if (!formData.cargo) {
        setFeedback({
          type: 'error',
          message: 'Por favor, seleccione un cargo para el Administrador de Unidad.',
        });
        return;
      }
      if (!formData.dependencia) {
        setFeedback({
          type: 'error',
          message: 'Por favor, seleccione una dependencia para el Administrador de Unidad.',
        });
        return;
      }
      if (!formData.unidad) {
        setFeedback({
          type: 'error',
          message: `Por favor, seleccione un ${dynamicUnidadLabel.toLowerCase()} para el Administrador de Unidad.`,
        });
        return;
      }
    }

    if (isDocente) {
      if (!formData.tipoDni) {
        setFeedback({
          type: 'error',
          message: 'Por favor, seleccione un tipo de DNI para el Docente.',
        });
        return;
      }
      if (!formData.numeroDni.trim()) {
        setFeedback({
          type: 'error',
          message: 'Por favor, ingrese el número de documento.',
        });
        return;
      }
      const emailInst = formData.emailInstitucional.trim() || formData.correo.trim();
      if (!emailInst) {
        setFeedback({
          type: 'error',
          message: 'Por favor, ingrese el correo electrónico institucional.',
        });
        return;
      }
      if (!emailRegex.test(emailInst)) {
        setFeedback({
          type: 'error',
          message: 'Por favor, ingrese un formato de email institucional válido.',
        });
        return;
      }
      if (!formData.fechaIngreso) {
        setFeedback({
          type: 'error',
          message: 'Por favor, ingrese la fecha de ingreso.',
        });
        return;
      }
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

      let endpoint = '';
      let payload: any = {};

      if (isDocente) {
        // DocenteProfileUpdateRequest contract:
        // nombre, apellido, emailInstitucional, fechaIngreso (required)
        // tipoDni, dni, cuil, domicilio, antigPrevia, estado, telefonos (optional)
        endpoint = `${apiUrl}/api/docentes/${formData.usuarioId}`;

        const dniNum = formData.numeroDni.trim()
          ? Number(formData.numeroDni.trim().replace(/\D/g, '')) || undefined
          : undefined;
        const cuilNum = formData.cuil.trim()
          ? Number(formData.cuil.trim().replace(/\D/g, '')) || undefined
          : undefined;
        const antigNum = formData.antigPrevia.trim()
          ? parseInt(formData.antigPrevia.trim(), 10) || 0
          : 0;

        payload = {
          nombre: formData.nombre.trim(),
          apellido: formData.apellido.trim(),
          emailInstitucional: (formData.emailInstitucional.trim() || formData.correo.trim()),
          fechaIngreso: formData.fechaIngreso,
          tipoDni: formData.tipoDni || undefined,
          dni: dniNum,
          cuil: cuilNum,
          domicilio: formData.domicilio.trim() || undefined,
          antigPrevia: antigNum,
        };
      } else {
        endpoint = `${apiUrl}/api/usuarios/${formData.usuarioId}`;
        if (isAdminGlobal) {
          endpoint = `${apiUrl}/api/usuarios/admin-global/${formData.usuarioId}`;
          payload = {
            nombre: formData.nombre.trim(),
            apellido: formData.apellido.trim(),
            correo: formData.correo.trim(),
            username: formData.username.trim(),
            cargoNombre: formData.cargo,
          };
        } else if (isAdminUnidad) {
          endpoint = `${apiUrl}/api/usuarios/admin-unidad/${formData.usuarioId}`;
          payload = {
            nombre: formData.nombre.trim(),
            apellido: formData.apellido.trim(),
            correo: formData.correo.trim(),
            username: formData.username.trim(),
            cargoNombre: formData.cargo,
            unidadId: !isNaN(Number(formData.unidad)) ? Number(formData.unidad) : formData.unidad,
          };
        } else {
          if (isAuditor) {
            endpoint = `${apiUrl}/api/usuarios/auditor/${formData.usuarioId}`;
          }

          payload = {
            nombre: formData.nombre.trim(),
            apellido: formData.apellido.trim(),
            correo: formData.correo.trim(),
            username: formData.username.trim(),
            rol: selectedFilterRole,
            ...(isAuditor
              ? {
                cargo: formData.cargo,
                cargoNombre: formData.cargo,
                cargoAudNombre: formData.cargo,
              }
              : {}),
          };

          if (formData.password.trim()) {
            payload.password = formData.password.trim();
          }
        }
      }

      let response = await fetch(endpoint, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });

      // For non-docente roles (except admin-global and admin-unidad with dedicated contracts), fallback to generic /api/usuarios/{id} if 404/405
      if (!isDocente && !isAdminGlobal && !isAdminUnidad && (response.status === 404 || response.status === 405)) {
        const fallbackEndpoint = `${apiUrl}/api/usuarios/${formData.usuarioId}`;
        if (fallbackEndpoint !== endpoint) {
          response = await fetch(fallbackEndpoint, {
            method: 'PUT',
            headers,
            body: JSON.stringify(payload),
          });
        }
      }

      const data = await response.json().catch(() => null);

      if (response.ok) {
        // Option 2: Clear password upon success
        if (formData.password) {
          setFormData((prev) => ({ ...prev, password: '' }));
        }

        // Option 3: Update search query with latest name
        const updatedFullName = formData.apellido.trim() && formData.nombre.trim()
          ? `${formData.apellido.trim()}, ${formData.nombre.trim()}`
          : (formData.nombre.trim() || formData.apellido.trim());
        if (updatedFullName) {
          isSelectingRef.current = true;
          setSearchQuery(updatedFullName);
          setShowSuggestions(false);
          setTimeout(() => {
            isSelectingRef.current = false;
          }, 300);
        }

        setFeedback({
          type: 'success',
          message:
            `${isDocente ? 'Docente' : isAdminGlobal ? 'Administrador Global' : isAdminUnidad ? 'Administrador de Unidad' : isAuditor ? 'Auditor' : 'Usuario'} "${formData.apellido.trim()}, ${formData.nombre.trim()}" modificado exitosamente.`,
        });
      } else {
        console.warn('Backend returned error response:', response.status, data);
        const errorMsg =
          data?.message ||
          data?.error ||
          (response.status === 409
            ? 'El nombre de usuario o correo electrónico ya se encuentra registrado.'
            : response.status === 400
              ? 'Datos inválidos. Verifique los campos ingresados.'
              : response.status === 403
                ? 'No posee permisos para modificar este usuario.'
                : 'Ocurrió un error al guardar las modificaciones.');
        setFeedback({
          type: 'error',
          message: errorMsg,
        });
      }
    } catch (err: any) {
      console.error('Error submitting Modificar Usuario:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Error de conexión al guardar los cambios.',
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
    <div className="modificar-usuario-page">
      <Topbar onLogout={onLogout} />

      <div className="modificar-usuario-body">
        <Sidebar activeItem="gestion" onNavigate={onNavigate} />

        <main className="modificar-usuario-main">
          <div className="modificar-usuario-content-area">
            {/* Top Navigation: Retroceder */}
            <div className="modificar-usuario-top-nav">
              <button
                type="button"
                className="modificar-usuario-back-btn"
                onClick={handleBack}
              >
                <FiChevronLeft className="modificar-usuario-back-icon" />
                <span>Retroceder</span>
              </button>
            </div>

            {/* Container Card */}
            <div className="modificar-usuario-container-card">
              {/* Header & Search Bar Row */}
              <div className="modificar-usuario-header-row">
                <div className="modificar-usuario-header-left">
                  <h1 className="modificar-usuario-title">Gestión</h1>
                </div>

                {/* Search Bar & Role Filter Row */}
                <div className="modificar-usuario-search-card">
                  <label
                    htmlFor="searchUsuarioInput"
                    className="modificar-usuario-search-label"
                  >
                    Buscar Usuario a Modificar por Nombre o DNI
                  </label>
                  <div className="modificar-usuario-search-row">
                    {/* Role Filter Selector */}
                    <div className="modificar-usuario-role-filter-wrap">
                      <select
                        id="filterRol"
                        className="modificar-usuario-role-filter-select"
                        value={selectedFilterRole}
                        onChange={(e) => handleFilterRoleChange(e.target.value)}
                      >
                        <option value="DOCENTE">Docente</option>
                        <option value="ADMIN_GLOBAL">Admin Global</option>
                        <option value="ADMIN_UNIDAD">Admin de Unidad</option>
                        <option value="AUDITOR">Auditor</option>
                      </select>
                      <FiChevronDown className="modificar-usuario-role-filter-caret" />
                    </div>

                    <div
                      className="modificar-usuario-search-input-wrap"
                      ref={searchContainerRef}
                    >
                      <input
                        id="searchUsuarioInput"
                        name="busqueda_usuario_query"
                        type="search"
                        className="modificar-usuario-search-input"
                        placeholder="Ingrese nombre, apellido o DNI"
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
                        autoComplete="off"
                        spellCheck={false}
                      />
                      <FiSearch className="modificar-usuario-search-icon" />

                      {/* Suggestions Dropdown */}
                      {showSuggestions && suggestions.length > 0 && (
                        <ul className="modificar-usuario-suggestions-list" role="listbox">
                          {suggestions.map((item, idx) => (
                            <li
                              key={item.id ?? idx}
                              className={`modificar-usuario-suggestion-item ${idx === activeSuggestionIndex ? 'active' : ''
                                }`}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                selectSuggestion(item);
                              }}
                              onMouseEnter={() => setActiveSuggestionIndex(idx)}
                              role="option"
                              aria-selected={idx === activeSuggestionIndex}
                            >
                              <div className="modificar-usuario-suggestion-header">
                                <span className="modificar-usuario-suggestion-name">
                                  {item.nombreCompleto}
                                </span>
                                {item.dni ? (
                                  <span className="modificar-usuario-suggestion-badge">
                                    DNI {item.dni}
                                  </span>
                                ) : null}
                              </div>
                              {item.unidad && (
                                <span className="modificar-usuario-suggestion-sub">
                                  {item.unidad}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <button
                      type="button"
                      className="modificar-usuario-search-btn"
                      onClick={() => handleSearch()}
                      disabled={isSearching}
                    >
                      <FiSearch />
                      <span>{isSearching ? 'Buscando...' : 'Buscar'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Card */}
              <div className="modificar-usuario-form-card">
                <div className="modificar-usuario-card-header">
                  <h2>Modificar Usuario</h2>
                </div>

                <div className="modificar-usuario-card-body">
                  {feedback && (
                    <div className={`modificar-usuario-feedback feedback-${feedback.type}`}>
                      {feedback.message}
                    </div>
                  )}

                  <form
                    className="modificar-usuario-form"
                    onSubmit={handleSubmit}
                    onFocusCapture={() => {
                      if (feedback) setFeedback(null);
                    }}
                    onClickCapture={() => {
                      if (feedback) setFeedback(null);
                    }}
                  >
                    {/* SECTION: DATOS DE USUARIO */}
                    <h3 className="modificar-usuario-section-title">Datos de Usuario</h3>

                    <div className="modificar-usuario-form-grid">
                      {/* Apellido */}
                      <div className="modificar-usuario-field">
                        <label htmlFor="apellido" className="modificar-usuario-label">
                          Apellido *
                        </label>
                        <input
                          id="apellido"
                          name="apellido"
                          type="text"
                          className="modificar-usuario-input"
                          placeholder="Ingrese valor"
                          value={formData.apellido}
                          onChange={(e) => handleChange('apellido', e.target.value)}
                          autoComplete="off"
                        />
                      </div>

                      {/* Nombre */}
                      <div className="modificar-usuario-field">
                        <label htmlFor="nombre" className="modificar-usuario-label">
                          Nombre *
                        </label>
                        <input
                          id="nombre"
                          name="nombre"
                          type="text"
                          className="modificar-usuario-input"
                          placeholder="Ingrese valor"
                          value={formData.nombre}
                          onChange={(e) => handleChange('nombre', e.target.value)}
                          autoComplete="off"
                        />
                      </div>

                      {/* Correo Electrónico */}
                      <div className="modificar-usuario-field">
                        <label htmlFor="correo" className="modificar-usuario-label">
                          Correo Electrónico *
                        </label>
                        <input
                          id="correo"
                          name="correo"
                          type="email"
                          className="modificar-usuario-input"
                          placeholder="Ingrese valor"
                          value={formData.correo}
                          onChange={(e) => handleChange('correo', e.target.value)}
                          autoComplete="off"
                        />
                      </div>

                      {/* Nombre de Usuario */}
                      <div className="modificar-usuario-field">
                        <label htmlFor="username" className="modificar-usuario-label">
                          Nombre de Usuario *
                        </label>
                        <input
                          id="username"
                          name="username"
                          type="text"
                          className="modificar-usuario-input"
                          placeholder="Ingrese valor"
                          value={formData.username}
                          onChange={(e) => handleChange('username', e.target.value)}
                          autoComplete="off"
                        />
                      </div>

                      {/* Contraseña */}
                      <div className="modificar-usuario-field">
                        <label htmlFor="password" className="modificar-usuario-label">
                          Contraseña
                        </label>
                        <div className="modificar-usuario-password-wrapper">
                          <input
                            id="password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            className="modificar-usuario-input modificar-usuario-password-input"
                            placeholder="Ingrese nueva contraseña"
                            value={formData.password}
                            onChange={(e) => handleChange('password', e.target.value)}
                            autoComplete="new-password"
                          />
                          <div className="modificar-usuario-password-actions">
                            <button
                              type="button"
                              className="modificar-usuario-password-action-btn"
                              onClick={() => setShowPassword(!showPassword)}
                              title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                            >
                              {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                            </button>
                            <button
                              type="button"
                              className={`modificar-usuario-password-action-btn ${isLoadingPassword ? 'spinning' : ''
                                }`}
                              onClick={fetchRandomPassword}
                              title="Generar nueva contraseña"
                              disabled={isLoadingPassword}
                            >
                              <FiRefreshCw size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <hr className="modificar-usuario-divider" />

                    {/* SECTION: ADMIN GLOBAL */}
                    {isAdminGlobal && (
                      <div className="modificar-usuario-extra-section">
                        <div className="modificar-usuario-extra-grid modificar-usuario-single-grid">
                          <div className="modificar-usuario-field modificar-usuario-field-cargo">
                            <label htmlFor="cargo" className="modificar-usuario-label">
                              Cargo *
                            </label>
                            <div
                              className="modificar-usuario-select-wrapper"
                              onClick={() => {
                                if (feedback) setFeedback(null);
                              }}
                            >
                              <select
                                id="cargo"
                                className="modificar-usuario-select"
                                value={formData.cargo}
                                onChange={(e) => handleChange('cargo', e.target.value)}
                                onFocus={() => {
                                  if (feedback) setFeedback(null);
                                }}
                                disabled={isLoadingCargosGlobal && cargosAdminGlobal.length === 0}
                              >
                                <option value="">
                                  {isLoadingCargosGlobal && cargosAdminGlobal.length === 0
                                    ? 'Cargando cargos...'
                                    : 'Seleccione'}
                                </option>
                                {cargosAdminGlobal.map((cargoOpt) => (
                                  <option key={cargoOpt.id} value={cargoOpt.id}>
                                    {cargoOpt.label}
                                  </option>
                                ))}
                              </select>
                              <FiChevronDown className="modificar-usuario-select-caret" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SECTION: AUDITOR */}
                    {isAuditor && (
                      <div className="modificar-usuario-extra-section">
                        <div className="modificar-usuario-extra-grid modificar-usuario-single-grid">
                          <div className="modificar-usuario-field modificar-usuario-field-cargo">
                            <label htmlFor="cargo" className="modificar-usuario-label">
                              Cargo *
                            </label>
                            <div
                              className="modificar-usuario-select-wrapper"
                              onClick={() => {
                                if (feedback) setFeedback(null);
                              }}
                            >
                              <select
                                id="cargo"
                                className="modificar-usuario-select"
                                value={formData.cargo}
                                onChange={(e) => handleChange('cargo', e.target.value)}
                                onFocus={() => {
                                  if (feedback) setFeedback(null);
                                }}
                                disabled={isLoadingCargosAuditor && cargosAuditor.length === 0}
                              >
                                <option value="">
                                  {isLoadingCargosAuditor && cargosAuditor.length === 0
                                    ? 'Cargando cargos...'
                                    : 'Seleccione'}
                                </option>
                                {cargosAuditor.map((cargoOpt) => (
                                  <option key={cargoOpt.id} value={cargoOpt.id}>
                                    {cargoOpt.label}
                                  </option>
                                ))}
                              </select>
                              <FiChevronDown className="modificar-usuario-select-caret" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SECTION: ADMIN DE UNIDAD */}
                    {isAdminUnidad && (
                      <div className="modificar-usuario-extra-section">
                        <div className="modificar-usuario-extra-grid modificar-usuario-admin-unidad-grid">
                          <div className="modificar-usuario-field modificar-usuario-field-cargo">
                            <label htmlFor="cargo" className="modificar-usuario-label">
                              Cargo *
                            </label>
                            <div
                              className="modificar-usuario-select-wrapper"
                              onClick={() => {
                                if (feedback) setFeedback(null);
                              }}
                            >
                              <select
                                id="cargo"
                                className="modificar-usuario-select"
                                value={formData.cargo}
                                onChange={(e) => handleChange('cargo', e.target.value)}
                                onFocus={() => {
                                  if (feedback) setFeedback(null);
                                }}
                                disabled={isLoadingCargosUnidad && cargosAdminUnidad.length === 0}
                              >
                                <option value="">
                                  {isLoadingCargosUnidad && cargosAdminUnidad.length === 0
                                    ? 'Cargando cargos...'
                                    : 'Seleccione'}
                                </option>
                                {cargosAdminUnidad.map((cargoOpt) => (
                                  <option key={cargoOpt.id} value={cargoOpt.id}>
                                    {cargoOpt.label}
                                  </option>
                                ))}
                              </select>
                              <FiChevronDown className="modificar-usuario-select-caret" />
                            </div>
                          </div>

                          <div className="modificar-usuario-field modificar-usuario-field-dependencia">
                            <label htmlFor="dependencia" className="modificar-usuario-label">
                              Dependencia *
                            </label>
                            <div
                              className="modificar-usuario-select-wrapper"
                              onClick={() => {
                                if (feedback) setFeedback(null);
                              }}
                            >
                              <select
                                id="dependencia"
                                className="modificar-usuario-select"
                                value={formData.dependencia}
                                onChange={(e) => handleChange('dependencia', e.target.value)}
                                onFocus={() => {
                                  if (feedback) setFeedback(null);
                                }}
                                disabled={isLoadingDependencias && dependencias.length === 0}
                              >
                                <option value="">
                                  {isLoadingDependencias && dependencias.length === 0
                                    ? 'Cargando dependencias...'
                                    : 'Seleccione'}
                                </option>
                                {dependencias.map((depOpt) => (
                                  <option key={depOpt.id} value={depOpt.id}>
                                    {depOpt.label}
                                  </option>
                                ))}
                              </select>
                              <FiChevronDown className="modificar-usuario-select-caret" />
                            </div>
                          </div>

                          {formData.dependencia && (
                            <div className="modificar-usuario-field modificar-usuario-field-unidad">
                              <label htmlFor="unidad" className="modificar-usuario-label">
                                {dynamicUnidadLabel} *
                              </label>
                              <div
                                className="modificar-usuario-select-wrapper"
                                onClick={() => {
                                  if (feedback) setFeedback(null);
                                }}
                              >
                                <select
                                  id="unidad"
                                  className="modificar-usuario-select"
                                  value={formData.unidad}
                                  onChange={(e) => handleChange('unidad', e.target.value)}
                                  onFocus={() => {
                                    if (feedback) setFeedback(null);
                                  }}
                                  disabled={isLoadingUnidades}
                                >
                                  <option value="">
                                    {isLoadingUnidades
                                      ? `Cargando ${dynamicUnidadLabel.toLowerCase()}s...`
                                      : 'Seleccione'}
                                  </option>
                                  {unidades.map((uniOpt) => (
                                    <option key={uniOpt.id} value={uniOpt.id}>
                                      {uniOpt.label}
                                    </option>
                                  ))}
                                </select>
                                <FiChevronDown className="modificar-usuario-select-caret" />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* SECTION: DOCENTE */}
                    {isDocente && (
                      <div className="modificar-usuario-extra-section">
                        <div className="modificar-usuario-docente-grid">
                          {/* Fila 1 */}
                          <div className="modificar-usuario-field">
                            <label htmlFor="tipoDni" className="modificar-usuario-label">
                              Tipo DNI *
                            </label>
                            <div className="modificar-usuario-select-wrapper">
                              <select
                                id="tipoDni"
                                className="modificar-usuario-select"
                                value={formData.tipoDni}
                                onChange={(e) => handleChange('tipoDni', e.target.value)}
                                disabled={isLoadingTiposDni && tiposDni.length === 0}
                              >
                                <option value="">
                                  {isLoadingTiposDni && tiposDni.length === 0
                                    ? 'Cargando tipos...'
                                    : 'Seleccione'}
                                </option>
                                {tiposDni.map((tipo) => (
                                  <option key={tipo.value} value={tipo.value}>
                                    {tipo.label}
                                  </option>
                                ))}
                              </select>
                              <FiChevronDown className="modificar-usuario-select-caret" />
                            </div>
                          </div>

                          <div className="modificar-usuario-field">
                            <label htmlFor="numeroDni" className="modificar-usuario-label">
                              Número *
                            </label>
                            <input
                              id="numeroDni"
                              name="docente_numero_documento"
                              type="text"
                              className="modificar-usuario-input"
                              placeholder="Ingrese valor"
                              value={formData.numeroDni}
                              onChange={(e) => handleChange('numeroDni', e.target.value)}
                              autoComplete="off"
                            />
                          </div>

                          <div className="modificar-usuario-field">
                            <label htmlFor="cuil" className="modificar-usuario-label">
                              CUIL *
                            </label>
                            <input
                              id="cuil"
                              name="docente_cuil"
                              type="text"
                              className="modificar-usuario-input"
                              placeholder="Ingrese valor"
                              value={formData.cuil}
                              onChange={(e) => handleChange('cuil', e.target.value)}
                              autoComplete="off"
                            />
                          </div>

                          <div className="modificar-usuario-field">
                            <label htmlFor="domicilio" className="modificar-usuario-label">
                              Domicilio
                            </label>
                            <input
                              id="domicilio"
                              name="docente_domicilio"
                              type="text"
                              className="modificar-usuario-input"
                              placeholder="Ingrese valor"
                              value={formData.domicilio}
                              onChange={(e) => handleChange('domicilio', e.target.value)}
                              autoComplete="off"
                            />
                          </div>

                          {/* Fila 2 */}
                          <div className="modificar-usuario-field">
                            <label htmlFor="emailInstitucional" className="modificar-usuario-label">
                              Email Institucional
                            </label>
                            <input
                              id="emailInstitucional"
                              name="docente_email_institucional"
                              type="email"
                              className="modificar-usuario-input"
                              placeholder="Ingrese valor"
                              value={formData.emailInstitucional}
                              onChange={(e) => handleChange('emailInstitucional', e.target.value)}
                              autoComplete="off"
                            />
                          </div>

                          <div className="modificar-usuario-field">
                            <label htmlFor="fechaIngreso" className="modificar-usuario-label">
                              Fecha de Ingreso a la Universidad
                            </label>
                            <div className="modificar-usuario-datepicker-container">
                              <DatePicker
                                id="fechaIngreso"
                                name="docente_fecha_ingreso"
                                selected={parseIsoToDate(formData.fechaIngreso)}
                                onChange={(date: Date | null) =>
                                  handleChange('fechaIngreso', formatDateToIso(date))
                                }
                                dateFormat="dd/MM/yyyy"
                                placeholderText="DD/MM/AAAA"
                                locale="es"
                                className="modificar-usuario-input modificar-usuario-datepicker-input"
                                autoComplete="off"
                                showYearDropdown
                                showMonthDropdown
                                dropdownMode="select"
                              />
                              <FiCalendar className="modificar-usuario-datepicker-icon" />
                            </div>
                          </div>

                          <div className="modificar-usuario-field">
                            <label htmlFor="antigPrevia" className="modificar-usuario-label">
                              Antigüedad Previa
                            </label>
                            <input
                              id="antigPrevia"
                              name="docente_antiguedad_previa"
                              type="number"
                              min="0"
                              className="modificar-usuario-input"
                              placeholder="Ingrese valor"
                              value={formData.antigPrevia}
                              onChange={(e) => handleChange('antigPrevia', e.target.value)}
                              autoComplete="off"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </form>
                </div>
              </div>
            </div>

            {/* Bottom Actions Toolbar: Borrar & Confirmar */}
            <div className="modificar-usuario-actions">
              <button
                type="button"
                className="btn-modificar-usuario btn-modificar-usuario-borrar"
                onClick={handleClear}
                disabled={isSubmitting}
              >
                <FiTrash2 className="btn-icon" />
                <span>Borrar</span>
              </button>

              <button
                type="button"
                className="btn-modificar-usuario btn-modificar-usuario-confirmar"
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
