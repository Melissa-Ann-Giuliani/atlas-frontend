import { useState, useEffect, useRef } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { es } from 'date-fns/locale/es';
import 'react-datepicker/dist/react-datepicker.css';
import './Designacion.css';
import Sidebar from '../../../components/Sidebar';
import Topbar from '../../../components/Topbar';
import { generateAndUploadDesignacionPdf } from '../../../utils/designacionPdf';
import logoUnsjImg from '../../../assets/membrete/logo-unsj.png';
import logo50AniosImg from '../../../assets/membrete/logo-50-anios.png';
import logoFfhaImg from '../../../assets/membrete/logo-ffha.png';
import certUnsjImg from '../../../assets/membrete/cert-unsj.png';
import certFfhaImg from '../../../assets/membrete/cert-ffha.png';
import {
  FiChevronLeft,
  FiSearch,
  FiUserPlus,
  FiCalendar,
  FiTrash2,
  FiEdit,
  FiX,
  FiChevronDown,
  FiArrowUp,
  FiArrowDown,
  FiFileText,
  FiPrinter,
  FiCheckSquare,
  FiZoomIn,
  FiZoomOut
} from 'react-icons/fi';
import { LuClipboardPlus } from 'react-icons/lu';

registerLocale('es', es);

export type TramiteTab = 'designaciones' | 'licencias' | 'subrogancias' | 'renuncias' | 'adscripciones';

interface DesignacionProps {
  onLogout?: () => void;
  onNavigate?: (page: any, data?: any) => void;
  onBack?: () => void;
  redesignacionData?: any;
  onClearRedesignacion?: () => void;
}

interface FormState {
  docenteId: number | null;
  legajo: string;
  nroResolucion: string;
  apellido: string;
  nombre: string;
  fechaComienzo: Date | null;
  fechaFinalizacion: Date | null;
}

interface DocenteDesignacionCargoDTO {
  cargoId?: number;
  legajo?: number;
  nroResolucion?: number | string;
  fechaInicio?: string;
  fechaFin?: string;
  fechaCreacion?: string | null;
  horasOcupadas?: number | null;
  nroCargo?: number;
  categoria?: string;
  dedicacion?: string;
  caracter?: string;
  origen?: string;
  estado?: string;
}

interface DocenteActividadActualDTO {
  funcionId?: number;
  funcionNombre?: string;
  funcionHoras?: number;
  cargoId?: number;
  materiaId?: number;
  materiaNombre?: string;
  plan?: number | null;
}

interface DocenteDetailsDTO {
  legajo?: number;
  datosPersonales?: {
    legajo?: number;
    estado?: string;
  };
  designacionesYCargos?: DocenteDesignacionCargoDTO[];
  actividadesActuales?: DocenteActividadActualDTO[];
}

interface CargoOption {
  id: number;
  codigo?: number;
  numero?: number;
  fechaCreacion?: string;
  horasOcupadas?: number | string;
  origen?: string;
  caracter?: string;
  categoria?: string;
  dedicacion?: string;
  dedicacionHoras?: number;
  designacion?: string | number;
  unidad?: string;
  unidadId?: number;
  unidadNombre?: string;
  materia?: string;
  plan?: string | number;
  estado?: string;
}

interface FuncionFormItem {
  id: string;
  nombre: string;
  tipo: string;
  horas: number | '';
  materiaNombre: string;
  materiaId: number | null;
}

const TIPO_FUNCION_OPTIONS = [
  'Planta',
  'Investigación',
  'Extensión',
  'Gestión',
  'Docencia'
];

const CrearCargoIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h7" />
    <path d="M14 2v6h6" />
    <path d="M18.5 15.5a1.5 1.5 0 0 1 2.12 2.12L16 22.24l-3 .76.76-3 4.74-4.5z" />
  </svg>
);

const formatCargoDate = (dateStr?: string): string => {
  if (!dateStr) return '--/--/----';
  const clean = String(dateStr).split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
  return clean;
};

const formatHorasOcupadas = (horas?: number | string | null): string => {
  if (horas === undefined || horas === null || horas === '') return '00';
  const num = Number(horas);
  return Number.isNaN(num) ? String(horas) : String(num).padStart(2, '0');
};

export const isDocenteInactivo = (docente: any): boolean => {
  if (!docente) return false;
  const rawEstado =
    docente.estado ??
    docente.docenteEstado ??
    docente.estadoDocente ??
    docente.datosPersonales?.estado ??
    docente.docente?.estado ??
    '';
  const estado = String(rawEstado).trim().toLowerCase();
  // Match 'inactivo' or newly created docentes without an assigned estado yet (excluding active/licencia)
  return estado === 'inactivo' || (!estado && !docente.cargoId && !docente.nroCargo);
};

const fetchInactivoDocentesByTerm = async (term: string, apiUrl: string, headers: HeadersInit): Promise<any[]> => {
  const resultsMap = new Map<string | number, any>();

  const addCandidates = (items: any[], fromUsuariosEndpoint = false) => {
    for (const item of items) {
      if (!item) continue;
      // Exclude soft-deleted users if activo === false
      if (item.activo === false) continue;

      const key = item.usuarioId ?? item.id ?? item.legajo ?? item.dni ?? `${item.apellido}-${item.nombre}`;
      if (fromUsuariosEndpoint) {
        if (!resultsMap.has(key)) {
          const rawEst = item.estado ?? item.docenteEstado ?? item.docente?.estado;
          const normalized = {
            ...item,
            usuarioId: item.usuarioId ?? item.id,
            apellido: item.apellido || item.datosPersonales?.apellido || '',
            nombre: item.nombre || item.datosPersonales?.nombre || '',
            legajo: item.legajo ?? item.docente?.legajo ?? item.datosPersonales?.legajo,
            estado: rawEst || 'Inactivo',
          };
          if (isDocenteInactivo(normalized)) {
            resultsMap.set(key, normalized);
          }
        }
      } else if (isDocenteInactivo(item)) {
        resultsMap.set(key, item);
      }
    }
  };

  // Query both /api/usuarios (with rol=Docente and rol=DOCENTE) and /api/docentes (for when backend supports estado=Inactivo)
  const [resUsersTitle, resUsersUpper, resDocentesInactivo] = await Promise.all([
    fetch(`${apiUrl}/api/usuarios?search=${encodeURIComponent(term)}&rol=Docente&size=20`, { headers }).catch(() => null),
    fetch(`${apiUrl}/api/usuarios?search=${encodeURIComponent(term)}&rol=DOCENTE&size=20`, { headers }).catch(() => null),
    fetch(`${apiUrl}/api/docentes?search=${encodeURIComponent(term)}&estado=Inactivo&size=20`, { headers }).catch(() => null),
  ]);

  if (resDocentesInactivo?.ok) {
    const data = await resDocentesInactivo.json().catch(() => null);
    const items: any[] = data?.content || (Array.isArray(data) ? data : []);
    addCandidates(items);
  }

  for (const resUsers of [resUsersTitle, resUsersUpper]) {
    if (resUsers?.ok) {
      const data = await resUsers.json().catch(() => null);
      const items: any[] = data?.content || (Array.isArray(data) ? data : []);
      addCandidates(items, true);
    }
  }

  const candidates = Array.from(resultsMap.values()).slice(0, 8);

  // Enrich candidates missing legajo from /api/docentes/{id}
  await Promise.all(
    candidates.map(async (item) => {
      if (item.legajo) return;
      const docId = item.usuarioId || item.id;
      if (!docId) return;
      try {
        const resDetail = await fetch(`${apiUrl}/api/docentes/${docId}`, { headers });
        if (resDetail.ok) {
          const detail = await resDetail.json();
          const resolvedLegajo =
            detail.legajo ??
            detail.datosPersonales?.legajo ??
            detail.designacionesYCargos?.[0]?.legajo;
          if (resolvedLegajo) {
            item.legajo = resolvedLegajo;
          }
          if (detail.datosPersonales?.estado && !item.estado) {
            item.estado = detail.datosPersonales.estado;
          }
        }
      } catch {
        // ignore enrichment error
      }
    })
  );

  return candidates;
};

const initialFormState: FormState = {
  docenteId: null,
  legajo: '',
  nroResolucion: '',
  apellido: '',
  nombre: '',
  fechaComienzo: null,
  fechaFinalizacion: null,
};

const createEmptyFuncion = (defaultMateriaName = '', defaultMateriaId: number | null = null): FuncionFormItem => ({
  id: String(Date.now() + Math.random()),
  nombre: '',
  tipo: 'Planta',
  horas: '',
  materiaNombre: defaultMateriaName,
  materiaId: defaultMateriaId,
});

export default function Designacion({
  onLogout,
  onNavigate,
  onBack,
  redesignacionData,
  onClearRedesignacion,
}: DesignacionProps) {
  const [activeTab, setActiveTab] = useState<TramiteTab>('designaciones');
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [isRedesignacion, setIsRedesignacion] = useState<boolean>(false);
  const [originalDesignacionId, setOriginalDesignacionId] = useState<number | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(-1);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Fetch materias catalog independently
  const fetchMaterias = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

      const resMaterias = await fetch(`${apiUrl}/api/materias?size=500`, { headers }).catch(() => null);
      if (resMaterias?.ok) {
        const matData = await resMaterias.json().catch(() => null);
        const materiasListRaw: any[] = matData?.content || (Array.isArray(matData) ? matData : []);
        setMateriasList(materiasListRaw);
        return materiasListRaw;
      }
    } catch (err) {
      console.error('Error fetching materias:', err);
    }
    return [];
  };

  // Cargos section & selection state
  const [showCargosSection, setShowCargosSection] = useState(false);
  const [availableCargos, setAvailableCargos] = useState<CargoOption[]>([]);
  const [selectedCargoId, setSelectedCargoId] = useState<number | null>(null);
  const [isLoadingCargos, setIsLoadingCargos] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cargoSortBy, setCargoSortBy] = useState<'numero' | 'fechaCreacion' | 'materia' | 'categoria' | 'dedicacion' | 'horasOcupadas'>('numero');
  const [cargoSortDirection, setCargoSortDirection] = useState<'asc' | 'desc'>('asc');

  // Step state: 'seleccion-cargo' (Paso 1) vs 'asignacion-funciones' (Paso 2) vs 'documento-generado' (Paso 3)
  const [step, setStep] = useState<'seleccion-cargo' | 'asignacion-funciones' | 'documento-generado'>('seleccion-cargo');
  const [funciones, setFunciones] = useState<FuncionFormItem[]>([]);
  const [materiasList, setMateriasList] = useState<any[]>([]);
  const [activeMateriaDropdownIndex, setActiveMateriaDropdownIndex] = useState<number | null>(null);
  const [materiaFilterQueries, setMateriaFilterQueries] = useState<{ [index: number]: string }>({});
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [membreteType, setMembreteType] = useState<'ffha' | 'certificados'>('ffha');

  // Confirmed designation state (set when user presses "Confirmar" on Step 3)
  const [confirmedData, setConfirmedData] = useState<{
    designacionId: number;
    documentoId?: number;
    docenteNombre: string;
    cargoNumero: string | number;
    nroResolucion: string;
    horasOcupadas: number;
    horasDedicacion: number;
    notificacionEnviada: boolean;
  } | null>(null);

  // Feedback notification
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const cargosHeaderRef = useRef<HTMLHeadingElement>(null);
  const a4SheetRef = useRef<HTMLDivElement>(null);

  // Initialize redesignación data if passed
  useEffect(() => {
    if (!redesignacionData || !redesignacionData.redesignacion) {
      setIsRedesignacion(false);
      setOriginalDesignacionId(null);
      return;
    }

    setIsRedesignacion(true);
    setOriginalDesignacionId(redesignacionData.designacionId || null);

    const doc = redesignacionData.docente;
    const docId = doc?.docenteId || doc?.usuarioId || doc?.id || null;
    const cargo = redesignacionData.cargo;
    const cargoId = cargo?.cargoId || cargo?.id || null;

    // Calcular fecha de inicio sugerida: día siguiente a fechaFinAnterior o hoy si no existe
    let suggestedFechaInicio: Date = new Date();
    if (redesignacionData.fechaFinAnterior) {
      try {
        const parts = String(redesignacionData.fechaFinAnterior).split('T')[0].split('-');
        if (parts.length === 3) {
          const prevEnd = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          prevEnd.setDate(prevEnd.getDate() + 1);
          suggestedFechaInicio = prevEnd;
        }
      } catch {
        suggestedFechaInicio = new Date();
      }
    }

    setFormData({
      docenteId: docId,
      legajo: String(doc?.legajo || doc?.documento || ''),
      nroResolucion: '', // Nuevo número de resolución obligatorio
      apellido: doc?.apellido || '',
      nombre: doc?.nombre || '',
      fechaComienzo: suggestedFechaInicio,
      fechaFinalizacion: null,
    });

    if (cargoId) {
      setSelectedCargoId(cargoId);
      setShowCargosSection(true);
      // Pre-cargar el cargo en availableCargos si no está
      const mockCargo: CargoOption = {
        id: cargoId,
        numero: cargo.codigo ?? cargo.numero ?? cargoId,
        fechaCreacion: cargo.fechaCreacion,
        categoria: cargo.categoria || 'Docente',
        dedicacion: cargo.dedicacion || 'Simple',
        caracter: cargo.caracter || 'Ordinario',
        origen: cargo.origen || 'De Planta',
        unidad: redesignacionData.unidad?.nombre || cargo.unidad || 'General',
        unidadId: Number(redesignacionData.unidad?.unidadId ?? cargo.unidadId) || undefined,
        horasOcupadas: cargo.horasOcupadas !== undefined && cargo.horasOcupadas !== null
          ? formatHorasOcupadas(cargo.horasOcupadas)
          : '00',
        materia: cargo.materia || 'Sin asignar',
        plan: cargo.plan ?? cargo.planEstudio,
        estado: 'Activa',
      };
      setAvailableCargos((prev) => {
        if (prev.some((c) => c.id === cargoId)) return prev;
        return [mockCargo, ...prev];
      });

      // Enriquecer con GET /api/docentes/{id} (fechaCreacion, horasOcupadas, plan)
      if (docId) {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

        fetch(`${apiUrl}/api/docentes/${docId}`, { headers })
          .then((res) => (res.ok ? res.json() : null))
          .then((detail: DocenteDetailsDTO | null) => {
            if (!detail) return;
            const matchedCargo = detail.designacionesYCargos?.find(
              (c) => c.cargoId === cargoId || (cargo.codigo !== undefined && c.nroCargo === cargo.codigo)
            );
            const matchedAct = detail.actividadesActuales?.find(
              (a) => a.cargoId === cargoId || (matchedCargo?.cargoId !== undefined && a.cargoId === matchedCargo.cargoId)
            );

            if (!matchedCargo && !matchedAct) return;

            setAvailableCargos((prev) =>
              prev.map((item) => {
                if (item.id !== cargoId) return item;
                return {
                  ...item,
                  fechaCreacion: matchedCargo?.fechaCreacion ?? item.fechaCreacion,
                  horasOcupadas:
                    matchedCargo?.horasOcupadas !== undefined && matchedCargo?.horasOcupadas !== null
                      ? formatHorasOcupadas(matchedCargo.horasOcupadas)
                      : item.horasOcupadas,
                  materia: matchedAct?.materiaNombre || item.materia,
                  plan: matchedAct?.plan !== undefined && matchedAct?.plan !== null ? matchedAct.plan : item.plan,
                };
              })
            );
          })
          .catch(() => {
            // Keep preloaded cargo data if enrichment fails
          });
      }
    }

    // Cargar materias si aún no están cargadas para que el paso de asignación de funciones disponga del catálogo
    fetchMaterias();

    // Informar al usuario
    setFeedback({
      type: 'info',
      message: `Modo Re-designación activo para ${doc?.apellido ? `${doc.apellido}, ${doc.nombre}` : 'el docente'}. Por favor complete el nuevo N° de Resolución y confirme las fechas.`,
    });
  }, [redesignacionData]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
      if (!(e.target as HTMLElement)?.closest('.designacion-materia-field-wrap')) {
        setActiveMateriaDropdownIndex(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Debounced search for docentes
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

        const inactivosDocentes = await fetchInactivoDocentesByTerm(trimmed, apiUrl, headers);
        setSuggestions(inactivosDocentes);
        setShowSuggestions(inactivosDocentes.length > 0);
        setActiveSuggestionIndex(-1);
      } catch (err) {
        console.error('Error fetching suggestions:', err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectDocente = async (docente: any) => {
    const docId = docente.usuarioId || docente.id;
    let resolvedLegajo = String(docente.legajo || docente.usuarioId || docente.dni || '');
    let resolvedResolucion = '';

    // Optionally fetch full details if available
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';
      const res = await fetch(`${apiUrl}/api/docentes/${docId}`, { headers });
      if (res.ok) {
        const fullData = await res.json();
        const des = fullData.designacionesYCargos?.[0];
        if (fullData.legajo || fullData.datosPersonales?.legajo || des?.legajo) {
          resolvedLegajo = String(fullData.legajo || fullData.datosPersonales?.legajo || des?.legajo);
        }
        if (des?.nroResolucion) {
          resolvedResolucion = String(des.nroResolucion);
        }
      }
    } catch {
      // Use basic info on error
    }

    setFormData((prev) => ({
      ...prev,
      docenteId: docId,
      legajo: resolvedLegajo || prev.legajo,
      apellido: docente.apellido || docente.apellidos || '',
      nombre: docente.nombre || docente.nombres || '',
      nroResolucion: resolvedResolucion || prev.nroResolucion,
    }));

    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);
    setSearchQuery('');
  };

  const handleSearch = async (termToSearch?: string) => {
    const term = (termToSearch !== undefined ? termToSearch : searchQuery).trim();
    if (!term) return;

    setIsSearching(true);
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

      const inactivosDocentes = await fetchInactivoDocentesByTerm(term, apiUrl, headers);
      setSuggestions(inactivosDocentes);
      setActiveSuggestionIndex(-1);
      if (inactivosDocentes.length === 1) {
        handleSelectDocente(inactivosDocentes[0]);
      } else if (inactivosDocentes.length > 0) {
        setShowSuggestions(true);
      } else {
        setFeedback({
          type: 'info',
          message: `No se encontraron docentes disponibles en estado "Inactivo" con el término "${term}".`,
        });
      }
    } catch (err: any) {
      console.error('Error al buscar docente:', err);
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
          handleSelectDocente(suggestions[activeSuggestionIndex]);
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
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleFieldChange = (field: keyof FormState, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLimpiar = () => {
    setFormData(initialFormState);
    setSearchQuery('');
    setSelectedCargoId(null);
    setShowCargosSection(false);
    setFeedback(null);
    setStep('seleccion-cargo');
    setFunciones([]);
    setConfirmedData(null);
    setZoomLevel(100);
    if (isRedesignacion && onClearRedesignacion) {
      onClearRedesignacion();
    }
    setIsRedesignacion(false);
    setOriginalDesignacionId(null);
  };

  const handleBack = () => {
    if (step === 'documento-generado') {
      setStep('asignacion-funciones');
      setFeedback(null);
      return;
    }
    if (step === 'asignacion-funciones') {
      setStep('seleccion-cargo');
      setFeedback(null);
      return;
    }
    if (isRedesignacion && onClearRedesignacion) {
      onClearRedesignacion();
    }
    if (onBack) {
      onBack();
    } else if (onNavigate) {
      onNavigate(isRedesignacion ? 'vencimientos' : 'inicio');
    } else {
      window.history.back();
    }
  };

  const handleIngresarDocenteNuevo = () => {
    if (onNavigate) {
      onNavigate('nuevo_usuario', { initialRol: 'DOCENTE', returnPage: 'designacion' });
    }
  };

  const handleCrearCargo = () => {
    if (onNavigate) {
      onNavigate('alta_cargo', { returnPage: 'designacion' });
    }
  };

  const handleTabClick = (tab: TramiteTab) => {
    setActiveTab(tab);
    if (tab !== 'designaciones') {
      setFeedback({
        type: 'info',
        message: `El módulo de ${tab.charAt(0).toUpperCase() + tab.slice(1)} está en proceso de diseño.`,
      });
    } else {
      setFeedback(null);
    }
  };

  const fetchAvailableCargos = async () => {
    setIsLoadingCargos(true);
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

      const [resCargosLibre, resCargosAll, resMaterias, resDedicaciones] = await Promise.all([
        fetch(`${apiUrl}/api/cargos?estado=Libre&size=50`, { headers }).catch(() => null),
        fetch(`${apiUrl}/api/cargos?size=50`, { headers }).catch(() => null),
        fetch(`${apiUrl}/api/materias?size=500`, { headers }).catch(() => null),
        fetch(`${apiUrl}/api/dedicaciones`, { headers }).catch(() => null),
      ]);

      let materiasListRaw: any[] = [];
      if (resMaterias?.ok) {
        const matData = await resMaterias.json().catch(() => null);
        materiasListRaw = matData?.content || (Array.isArray(matData) ? matData : []);
        setMateriasList(materiasListRaw);
      }

      let dedicacionesList: any[] = [];
      if (resDedicaciones?.ok) {
        const dedData = await resDedicaciones.json().catch(() => null);
        dedicacionesList = Array.isArray(dedData) ? dedData : (dedData?.content || []);
      }

      const rawMap = new Map<number, any>();
      for (const res of [resCargosLibre, resCargosAll]) {
        if (res?.ok) {
          const data = await res.json().catch(() => null);
          const items: any[] = data?.content || (Array.isArray(data) ? data : []);
          for (const item of items) {
            if (!item) continue;
            const id = item.id ?? item.cargoId ?? item.numero;
            const estado = String(item.estado || '').trim().toLowerCase();
            if (estado === 'libre' && id !== undefined && !rawMap.has(id)) {
              rawMap.set(id, item);
            }
          }
        }
      }

      const libreCargos = Array.from(rawMap.values());

      // Enrich each 'Libre' cargo with full detail from /api/cargos/{id}
      const enriched: CargoOption[] = await Promise.all(
        libreCargos.map(async (c: any) => {
          const cargoId = c.id ?? c.cargoId;
          let detail: any = null;
          if (cargoId) {
            try {
              const resDet = await fetch(`${apiUrl}/api/cargos/${cargoId}`, { headers });
              if (resDet.ok) {
                detail = await resDet.json();
              }
            } catch {
              // ignore detail fetch failure
            }
          }

          const actividades: any[] = detail?.actividadesVinculadas || c.actividadesVinculadas || [];
          const firstAct = actividades[0];

          const rawHoras =
            detail?.horasOcupadas ??
            c.horasOcupadas ??
            (actividades.length > 0
              ? actividades.reduce((sum: number, act: any) => sum + (Number(act.horas) || 0), 0)
              : 0);
          const formattedHoras = String(Number(rawHoras) || 0).padStart(2, '0');

          const materiaName =
            detail?.materiaNombre ??
            detail?.materia?.nombre ??
            firstAct?.materiaProyecto ??
            firstAct?.materiaNombre ??
            c.materiaNombre ??
            c.materia ??
            'Sin asignar';

          const matchedMateria =
            materiaName && materiaName !== 'Sin asignar'
              ? materiasListRaw.find(
                (m: any) =>
                  String(m.nombre || m.materiaNombre || '')
                    .trim()
                    .toLowerCase() === String(materiaName).trim().toLowerCase()
              )
              : null;

          const planVal =
            detail?.planEstudio ??
            detail?.plan ??
            detail?.nroPlan ??
            detail?.materia?.planEstudio ??
            firstAct?.planEstudio ??
            firstAct?.plan ??
            matchedMateria?.planEstudio ??
            matchedMateria?.plan ??
            matchedMateria?.nroPlan ??
            c.planEstudio ??
            c.plan ??
            'Sin asignar';

          const origenVal =
            detail?.origen ??
            detail?.origenNombre ??
            detail?.origen?.origenNombre ??
            firstAct?.origen ??
            c.origen ??
            c.origenNombre ??
            'Planta';

          const resolvedUnidadId = detail?.unidadId ?? c.unidadId ?? c.unidad?.unidadId;

          const unidadVal =
            detail?.unidadNombre ??
            detail?.unidad?.unidadNombre ??
            detail?.unidad?.nombre ??
            c.unidadNombre ??
            c.unidad?.unidadNombre ??
            c.unidad ??
            'Sin asignar';

          const designacionVal =
            detail?.designacionNroResolucion ??
            detail?.nroResolucionDesignacion ??
            detail?.designacion ??
            c.designacionNroResolucion ??
            c.nroResolucionDesignacion ??
            'Libre';

          const dedicacionStr = String(detail?.dedicacion ?? detail?.dedicacionNombre ?? c.dedicacion ?? 'Simple');

          // Resolve Dedicacion Horas
          let resolvedDedicacionHoras = 10;
          const matchedDedicacion = dedicacionesList.find(
            (d: any) =>
              String(d.dedicacionNombre || '').trim().toLowerCase() === dedicacionStr.trim().toLowerCase()
          );
          if (matchedDedicacion?.dedicacionHoras) {
            resolvedDedicacionHoras = Number(matchedDedicacion.dedicacionHoras);
          } else if (dedicacionStr.toLowerCase().includes('exclusiva') && !dedicacionStr.toLowerCase().includes('semi')) {
            resolvedDedicacionHoras = 40;
          } else if (dedicacionStr.toLowerCase().includes('semi')) {
            resolvedDedicacionHoras = 20;
          } else if (dedicacionStr.toLowerCase().includes('simple')) {
            resolvedDedicacionHoras = 10;
          }

          return {
            id: cargoId ?? c.numero,
            numero: detail?.numero ?? c.numero ?? c.codigo ?? cargoId,
            fechaCreacion: detail?.fechaCreacion ?? c.fechaCreacion,
            horasOcupadas: formattedHoras,
            origen: String(origenVal),
            caracter: detail?.caracter ?? detail?.caracterNombre ?? c.caracter ?? 'Ordinario',
            categoria: detail?.categoria ?? detail?.categoriaNombre ?? c.categoria ?? 'Sin categoría',
            dedicacion: dedicacionStr,
            dedicacionHoras: resolvedDedicacionHoras,
            designacion: String(designacionVal),
            unidad: String(unidadVal),
            unidadId: resolvedUnidadId ? Number(resolvedUnidadId) : undefined,
            materia: String(materiaName),
            plan: String(planVal),
            estado: detail?.estado ?? c.estado ?? 'Libre',
          };
        })
      );

      setAvailableCargos(enriched);
    } catch (err) {
      console.error('Error fetching cargos:', err);
    } finally {
      setIsLoadingCargos(false);
    }
  };

  // Sorted list of available cargos
  const sortedAvailableCargos = [...availableCargos].sort((a, b) => {
    let comparison = 0;
    if (cargoSortBy === 'numero') {
      const numA = Number(a.numero ?? a.codigo ?? a.id) || 0;
      const numB = Number(b.numero ?? b.codigo ?? b.id) || 0;
      comparison = numA - numB;
    } else if (cargoSortBy === 'fechaCreacion') {
      const dateA = a.fechaCreacion ? new Date(a.fechaCreacion).getTime() : 0;
      const dateB = b.fechaCreacion ? new Date(b.fechaCreacion).getTime() : 0;
      comparison = dateA - dateB;
    } else if (cargoSortBy === 'materia') {
      const matA = (a.materia || '').toLowerCase();
      const matB = (b.materia || '').toLowerCase();
      comparison = matA.localeCompare(matB);
    } else if (cargoSortBy === 'categoria') {
      const catA = (a.categoria || '').toLowerCase();
      const catB = (b.categoria || '').toLowerCase();
      comparison = catA.localeCompare(catB);
    } else if (cargoSortBy === 'dedicacion') {
      const dedA = (a.dedicacion || '').toLowerCase();
      const dedB = (b.dedicacion || '').toLowerCase();
      comparison = dedA.localeCompare(dedB);
    } else if (cargoSortBy === 'horasOcupadas') {
      const horA = Number(a.horasOcupadas) || 0;
      const horB = Number(b.horasOcupadas) || 0;
      comparison = horA - horB;
    }
    return cargoSortDirection === 'asc' ? comparison : -comparison;
  });

  const selectedCargo = availableCargos.find((c) => c.id === selectedCargoId) || null;

  // Filter materias scoped to the selected cargo's academic unit
  const filteredMaterias = materiasList.filter((m: any) => {
    if (!selectedCargo?.unidadId) return true;
    const matUnidadId = m.unidadId ?? m.unidad?.unidadId ?? m.unidad?.id;
    return !matUnidadId || Number(matUnidadId) === Number(selectedCargo.unidadId);
  });

  // Action button click in Step 1: Open cargos section or transition to Step 2
  const handleAsignarCargoClick = async () => {
    setFeedback(null);

    if (!showCargosSection) {
      setShowCargosSection(true);
      await fetchAvailableCargos();
      setTimeout(() => {
        cargosHeaderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
      return;
    }

    if (!selectedCargoId) {
      setFeedback({
        type: 'info',
        message: 'Seleccione un cargo disponible de la ventana "Cargos para Designación".',
      });
      return;
    }

    // Validate Docente data before moving to Actividades step
    if (!formData.apellido.trim() || !formData.nombre.trim()) {
      setFeedback({
        type: 'error',
        message: 'Por favor complete o seleccione el Docente (Apellido y Nombre).',
      });
      return;
    }

    if (!formData.nroResolucion.trim()) {
      setFeedback({
        type: 'error',
        message: 'Por favor complete el N° de Resolución.',
      });
      return;
    }

    if (!formData.fechaComienzo) {
      setFeedback({
        type: 'error',
        message: 'Por favor seleccione la Fecha de Comienzo.',
      });
      return;
    }

    if (formData.fechaFinalizacion && formData.fechaFinalizacion < formData.fechaComienzo) {
      setFeedback({
        type: 'error',
        message: 'La Fecha de Finalización no puede ser anterior a la Fecha de Comienzo.',
      });
      return;
    }

    // Transition to Step 2: Asignar Actividades / Funciones
    let currentMaterias = materiasList;
    if (currentMaterias.length === 0) {
      currentMaterias = await fetchMaterias();
    }

    const defaultMateriaName = selectedCargo?.materia && selectedCargo.materia !== 'Sin asignar' ? selectedCargo.materia : '';
    const matchedMateria = defaultMateriaName
      ? currentMaterias.find((m: any) => String(m.nombre || '').trim().toLowerCase() === defaultMateriaName.trim().toLowerCase())
      : null;

    setFunciones([createEmptyFuncion(defaultMateriaName, matchedMateria?.id || null)]);
    setStep('asignacion-funciones');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Add a new function card
  const handleAddFuncion = () => {
    setFunciones((prev) => [...prev, createEmptyFuncion()]);
  };

  // Remove function card
  const handleRemoveFuncion = (index: number) => {
    if (funciones.length <= 1) {
      setFeedback({
        type: 'info',
        message: 'Debe conservar al menos una función para la designación.',
      });
      return;
    }
    setFunciones((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Update a function field
  const handleUpdateFuncion = (index: number, field: keyof FuncionFormItem, value: any) => {
    setFunciones((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Select materia from dropdown
  const handleSelectMateriaForFuncion = (index: number, materia: any) => {
    handleUpdateFuncion(index, 'materiaNombre', materia.nombre);
    handleUpdateFuncion(index, 'materiaId', materia.id);
    setActiveMateriaDropdownIndex(null);
  };

  // Calculate current total hours
  const totalHorasAsignadas = funciones.reduce((sum, f) => sum + (Number(f.horas) || 0), 0);
  const maxHorasPermitidas = selectedCargo?.dedicacionHoras ?? 40;

  // Validate functions and resolve materiaId for each row
  const validateAndResolveFunciones = (): {
    resolved: { nombre: string; tipo: string; horas: number; materiaId: number }[];
    updatedItems: FuncionFormItem[];
  } | null => {
    if (!selectedCargoId || !selectedCargo) {
      setFeedback({
        type: 'error',
        message: 'No se encuentra seleccionado ningún cargo válido.',
      });
      return null;
    }

    if (funciones.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Debe ingresar al menos una función.',
      });
      return null;
    }

    const resolvedFunciones: { nombre: string; tipo: string; horas: number; materiaId: number }[] = [];
    const updatedItems: FuncionFormItem[] = [];

    for (let i = 0; i < funciones.length; i++) {
      const f = funciones[i];
      const numLabel = `Función N°${i + 1}`;

      if (!f.nombre.trim()) {
        setFeedback({
          type: 'error',
          message: `Por favor ingrese el Nombre de la ${numLabel}.`,
        });
        return null;
      }

      if (!f.tipo.trim()) {
        setFeedback({
          type: 'error',
          message: `Por favor seleccione el Tipo para la ${numLabel}.`,
        });
        return null;
      }

      const horasNum = Number(f.horas);
      if (isNaN(horasNum) || horasNum < 1) {
        setFeedback({
          type: 'error',
          message: `La Cantidad de Horas de la ${numLabel} debe ser al menos 1 hora.`,
        });
        return null;
      }

      let targetMateriaId = f.materiaId;
      let targetMateriaNombre = f.materiaNombre.trim();
      if (!targetMateriaId) {
        const matched =
          filteredMaterias.find(
            (m: any) => String(m.nombre || '').trim().toLowerCase() === targetMateriaNombre.toLowerCase()
          ) ||
          materiasList.find(
            (m: any) => String(m.nombre || '').trim().toLowerCase() === targetMateriaNombre.toLowerCase()
          );
        if (matched?.id) {
          targetMateriaId = matched.id;
          targetMateriaNombre = matched.nombre || targetMateriaNombre;
        } else {
          setFeedback({
            type: 'error',
            message: `Por favor seleccione una materia válida para la ${numLabel}.`,
          });
          return null;
        }
      }

      resolvedFunciones.push({
        nombre: f.nombre.trim(),
        tipo: f.tipo.trim(),
        horas: horasNum,
        materiaId: Number(targetMateriaId),
      });

      updatedItems.push({
        ...f,
        nombre: f.nombre.trim(),
        tipo: f.tipo.trim(),
        horas: horasNum,
        materiaNombre: targetMateriaNombre,
        materiaId: Number(targetMateriaId),
      });
    }

    if (totalHorasAsignadas > maxHorasPermitidas) {
      setFeedback({
        type: 'error',
        message: `La suma de horas asignadas (${totalHorasAsignadas} hs) supera la dedicación del cargo (${maxHorasPermitidas} hs).`,
      });
      return null;
    }

    return { resolved: resolvedFunciones, updatedItems };
  };

  // Step 2 Action: "Generar Documento" -> Validates and transitions to Step 3 (Vista previa de documento)
  const handleGenerarDocumento = () => {
    setFeedback(null);
    const validation = validateAndResolveFunciones();
    if (!validation) return;

    setFunciones(validation.updatedItems);
    setConfirmedData(null);
    setZoomLevel(100);
    setStep('documento-generado');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Step 3 Action: "Confirmar" -> Confirms Docente & Cargo Functions in backend, transitioning Docente to Activo
  const handleConfirmarDesignacion = async () => {
    setFeedback(null);
    const validation = validateAndResolveFunciones();
    if (!validation || !selectedCargo) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

      const formatIso = (date: Date | null) => {
        if (!date) return null;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      if (isRedesignacion && originalDesignacionId) {
        // Flujo Re-designación: POST /api/designaciones/{id}/redesignar
        const redesignarPayload = {
          nroResolucion: formData.nroResolucion.trim(),
          fechaInicio: formatIso(formData.fechaComienzo),
          ...(formData.fechaFinalizacion ? { fechaFin: formatIso(formData.fechaFinalizacion) } : {}),
          cargoId: selectedCargoId,
          funciones: validation.resolved.map((f) => ({
            materiaId: f.materiaId,
            nombre: f.nombre,
            tipo: f.tipo.toUpperCase(),
            horas: f.horas,
          })),
        };

        const resRed = await fetch(`${apiUrl}/api/designaciones/${originalDesignacionId}/redesignar`, {
          method: 'POST',
          headers,
          body: JSON.stringify(redesignarPayload),
        });

        const redData = await resRed.json().catch(() => null);

        if (!resRed.ok && resRed.status !== 201) {
          const errorMsg =
            redData?.message ||
            (resRed.status === 400
              ? 'Datos inválidos. Verifique que el número de resolución no esté duplicado y que la fecha de fin sea mayor o igual a la fecha de inicio.'
              : resRed.status === 403
              ? 'No tienes permisos para re-designar cargos de esta unidad académica.'
              : 'Error al procesar la re-designación.');
          setFeedback({ type: 'error', message: errorMsg });
          setIsSubmitting(false);
          return;
        }

        const docName = `${formData.apellido}, ${formData.nombre}`;
        const cargoNum = selectedCargo.numero ?? selectedCargo.codigo ?? selectedCargoId ?? '';

        const resultObj = {
          designacionId: redData?.designacionId ?? redData?.id ?? originalDesignacionId,
          documentoId: redData?.documentoId,
          docenteNombre: docName,
          cargoNumero: cargoNum,
          nroResolucion: formData.nroResolucion,
          horasOcupadas: totalHorasAsignadas,
          horasDedicacion: maxHorasPermitidas,
          notificacionEnviada: true,
        };

        const cleanResRed = String(formData.nroResolucion || 'SN').replace(/\s+/g, '_');
        const pdfFilenameRed = `Acta_Designacion_${cleanResRed}_Cargo_${cargoNum}.pdf`;
        const uploadedRedDoc = await generateAndUploadDesignacionPdf({
          element: a4SheetRef.current,
          filename: pdfFilenameRed,
          designacionId: resultObj.designacionId,
          apiUrl,
          token,
        });
        if (uploadedRedDoc?.archivoId) {
          resultObj.documentoId = uploadedRedDoc.archivoId;
        }

        setConfirmedData(resultObj);

        // Persist rich document metadata so CargoDetalle and DocenteDetalle in Listado can display and open/download it
        try {
          const storedRaw = localStorage.getItem('atlas_confirmed_designaciones_docs');
          const storedList: any[] = storedRaw ? JSON.parse(storedRaw) : [];
          const docEntry = {
            documentoId: resultObj.documentoId,
            nombreEncriptado: uploadedRedDoc?.nombreEncriptado,
            designacionId: resultObj.designacionId,
            cargoId: selectedCargoId,
            cargoNumero: cargoNum,
            docenteId: formData.docenteId,
            legajo: formData.legajo,
            docenteApellido: formData.apellido,
            docenteNombre: formData.nombre,
            nroResolucion: formData.nroResolucion,
            fechaComienzo: formData.fechaComienzo ? formData.fechaComienzo.toLocaleDateString('es-AR') : '--/--/----',
            fechaFinalizacion: formData.fechaFinalizacion ? formData.fechaFinalizacion.toLocaleDateString('es-AR') : null,
            categoria: selectedCargo.categoria || 'Docente',
            dedicacion: selectedCargo.dedicacion || 'Simple',
            caracter: selectedCargo.caracter || 'Ordinario',
            unidad: selectedCargo.unidad || selectedCargo.unidadNombre || 'General',
            horasTotales: totalHorasAsignadas,
            horasDedicacion: maxHorasPermitidas,
            funciones: validation.updatedItems,
            sheetHtml: a4SheetRef.current?.innerHTML || '',
            name: pdfFilenameRed,
            type: 'application/pdf',
            size: 'PDF Oficial',
            date: new Date().toLocaleDateString('es-AR'),
          };
          const filtered = storedList.filter(
            (item) => Number(item.cargoId) !== Number(selectedCargoId) && Number(item.cargoNumero) !== Number(cargoNum)
          );
          filtered.unshift(docEntry);
          localStorage.setItem('atlas_confirmed_designaciones_docs', JSON.stringify(filtered));
        } catch {
          // ignore storage error
        }

        // Limpiar sessionStorage de redesignacion para no quedar en loop
        if (onClearRedesignacion) {
          onClearRedesignacion();
        }

        setFeedback({
          type: 'success',
          message: `¡Re-designación confirmada con éxito para ${docName}! La designación previa ha sido renovada.`,
        });
        setIsSubmitting(false);
        return;
      }

      // 1. Vincular cargo y crear/verificar designación
      const desPayload = {
        docenteId: formData.docenteId || (formData.legajo ? Number(formData.legajo) : 1),
        cargoId: selectedCargoId,
        nroResolucion: formData.nroResolucion,
        fechaInicio: formatIso(formData.fechaComienzo),
        fechaFin: formatIso(formData.fechaFinalizacion),
      };

      const resDes = await fetch(`${apiUrl}/api/designaciones`, {
        method: 'POST',
        headers,
        body: JSON.stringify(desPayload),
      });

      const desData = await resDes.json().catch(() => null);

      if (!resDes.ok && resDes.status !== 201) {
        const errorMsg = desData?.message || 'Error al registrar la designación del docente.';
        if (!errorMsg.toLowerCase().includes('ya posee')) {
          setFeedback({ type: 'error', message: errorMsg });
          setIsSubmitting(false);
          return;
        }
      }

      // 2. Asignar funciones al cargo via POST /api/cargos/{cargoId}/funciones (cambia Docente a Activo y genera PDF)
      const funcionesPayload = {
        funciones: validation.resolved,
      };

      const resFunc = await fetch(`${apiUrl}/api/cargos/${selectedCargoId}/funciones`, {
        method: 'POST',
        headers,
        body: JSON.stringify(funcionesPayload),
      });

      const funcData = await resFunc.json().catch(() => null);

      if (resFunc.ok || resFunc.status === 200) {
        const docName = `${formData.apellido}, ${formData.nombre}`;
        const cargoNum = selectedCargo.numero ?? selectedCargo.codigo ?? selectedCargoId ?? '';

        const resultObj = {
          designacionId: funcData?.designacionId ?? desData?.id ?? 0,
          documentoId: funcData?.documentoId,
          docenteNombre: docName,
          cargoNumero: cargoNum,
          nroResolucion: formData.nroResolucion,
          horasOcupadas: funcData?.horasOcupadas ?? totalHorasAsignadas,
          horasDedicacion: funcData?.horasDedicacion ?? maxHorasPermitidas,
          notificacionEnviada: !!funcData?.notificacionEnviada,
        };

        const cleanResRed = String(formData.nroResolucion || 'SN').replace(/\s+/g, '_');
        const pdfFilenameRed = `Acta_Designacion_${cleanResRed}_Cargo_${cargoNum}.pdf`;
        const uploadedRedDoc = await generateAndUploadDesignacionPdf({
          element: a4SheetRef.current,
          filename: pdfFilenameRed,
          designacionId: resultObj.designacionId,
          apiUrl,
          token,
        });
        if (uploadedRedDoc?.archivoId) {
          resultObj.documentoId = uploadedRedDoc.archivoId;
        }

        setConfirmedData(resultObj);

        // Persist rich document metadata so CargoDetalle and DocenteDetalle in Listado can display and open/download it
        try {
          const storedRaw = localStorage.getItem('atlas_confirmed_designaciones_docs');
          const storedList: any[] = storedRaw ? JSON.parse(storedRaw) : [];
          const docEntry = {
            documentoId: resultObj.documentoId,
            nombreEncriptado: uploadedRedDoc?.nombreEncriptado,
            designacionId: resultObj.designacionId,
            cargoId: selectedCargoId,
            cargoNumero: cargoNum,
            docenteId: formData.docenteId,
            legajo: formData.legajo,
            docenteApellido: formData.apellido,
            docenteNombre: formData.nombre,
            nroResolucion: formData.nroResolucion,
            fechaComienzo: formData.fechaComienzo ? formData.fechaComienzo.toLocaleDateString('es-AR') : '--/--/----',
            fechaFinalizacion: formData.fechaFinalizacion ? formData.fechaFinalizacion.toLocaleDateString('es-AR') : null,
            categoria: selectedCargo.categoria || 'Docente',
            dedicacion: selectedCargo.dedicacion || 'Simple',
            caracter: selectedCargo.caracter || 'Ordinario',
            unidad: selectedCargo.unidad || selectedCargo.unidadNombre || 'General',
            horasTotales: totalHorasAsignadas,
            horasDedicacion: maxHorasPermitidas,
            funciones: validation.updatedItems,
            sheetHtml: a4SheetRef.current?.innerHTML || '',
            name: pdfFilenameRed,
            type: 'application/pdf',
            size: 'PDF Oficial',
            date: new Date().toLocaleDateString('es-AR'),
          };
          const filtered = storedList.filter(
            (item) => Number(item.cargoId) !== Number(selectedCargoId) && Number(item.cargoNumero) !== Number(cargoNum)
          );
          filtered.unshift(docEntry);
          localStorage.setItem('atlas_confirmed_designaciones_docs', JSON.stringify(filtered));
        } catch {
          // ignore storage error
        }

        setFeedback({
          type: 'success',
          message: `Designación confirmada con éxito para ${docName}. El docente ha pasado al estado Activo.`,
        });
      } else {
        const errorMsg = funcData?.message || 'Error al confirmar y asignar las funciones al cargo.';
        setFeedback({
          type: 'error',
          message: errorMsg,
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error de conexión con el servidor al confirmar la designación.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Print / Save PDF document (uses the exact A4 preview sheet and sets document.title to the system filename)
  const handleImprimirDocumento = () => {
    const cleanRes = String(formData.nroResolucion || 'SN').replace(/\s+/g, '_');
    const cargoNum = selectedCargo?.numero ?? selectedCargo?.codigo ?? selectedCargoId ?? 'SN';
    const pdfTitle = `Acta_Designacion_${cleanRes}_Cargo_${cargoNum}`;
    const originalTitle = document.title;
    document.title = pdfTitle;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 500);
  };

  return (
    <div className="designacion-page">
      <Topbar onLogout={onLogout} />

      <div className="designacion-body">
        <Sidebar activeItem="tramites" onNavigate={onNavigate} />

        <main className="designacion-main">
          <div className="designacion-content-area">
            {/* Top Horizontal Tabs */}
            <nav className="tramites-tabs-container" aria-label="Pestañas de trámites">
              <button
                type="button"
                className={`tramite-tab tab-designaciones ${activeTab === 'designaciones' ? 'active' : ''}`}
                onClick={() => handleTabClick('designaciones')}
              >
                Designaciones
              </button>
              <button
                type="button"
                className={`tramite-tab tab-licencias ${activeTab === 'licencias' ? 'active' : ''}`}
                onClick={() => handleTabClick('licencias')}
              >
                Licencias
              </button>
              <button
                type="button"
                className={`tramite-tab tab-subrogancias ${activeTab === 'subrogancias' ? 'active' : ''}`}
                onClick={() => handleTabClick('subrogancias')}
              >
                Subrogancias
              </button>
              <button
                type="button"
                className={`tramite-tab tab-renuncias ${activeTab === 'renuncias' ? 'active' : ''}`}
                onClick={() => handleTabClick('renuncias')}
              >
                Renuncias
              </button>
              <button
                type="button"
                className={`tramite-tab tab-adscripciones ${activeTab === 'adscripciones' ? 'active' : ''}`}
                onClick={() => handleTabClick('adscripciones')}
              >
                Adscripciones
              </button>
            </nav>

            {/* Retroceder Link */}
            <div className="designacion-top-nav">
              <button type="button" className="designacion-back-btn" onClick={handleBack}>
                <FiChevronLeft className="designacion-back-icon" />
                <span>Retroceder</span>
              </button>
            </div>

            {/* Main Card */}
            <div className={`designacion-card ${step === 'documento-generado' ? 'designacion-card-generada' : ''}`}>
              {step === 'documento-generado' && (
                <div className="designacion-generada-banner">
                  <h1 className="designacion-generada-banner-title">Designación Generada</h1>
                </div>
              )}
              <div className="designacion-card-scrollable">

                {/* =========================================================================
                    PASO 1: SELECCIÓN DE DOCENTE Y CARGO LIBRE
                   ========================================================================= */}
                {step === 'seleccion-cargo' ? (
                  <>
                    {/* Header Row: Title & Search Card */}
                    <div className="designacion-card-header">
                      <div>
                        <h1 className="designacion-title">
                          {isRedesignacion ? 'Re-designación de Cargo' : 'Datos de Designación'}
                        </h1>
                      </div>

                      {/* Search Bar matching Gestion style */}
                      {!isRedesignacion && (
                        <div className="designacion-search-card">
                          <label htmlFor="searchDocenteInput" className="designacion-search-label">
                            Buscar Docente por Nombre, Apellido o Legajo
                          </label>
                          <div className="designacion-search-row">
                            <div className="designacion-search-input-wrap" ref={searchContainerRef}>
                              <input
                                id="searchDocenteInput"
                                name="busqueda_docente_query"
                                type="search"
                                className="designacion-search-input"
                                placeholder="Ingrese valor"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => {
                                  if (suggestions.length > 0) setShowSuggestions(true);
                                }}
                                onKeyDown={handleKeyDown}
                                autoComplete="off"
                                spellCheck={false}
                              />
                              <FiSearch className="designacion-search-icon" />

                              {/* Suggestions Dropdown */}
                              {showSuggestions && suggestions.length > 0 && (
                                <ul className="designacion-suggestions-list" role="listbox">
                                  {suggestions.map((item, idx) => (
                                    <li
                                      key={item.usuarioId || item.id || idx}
                                      className={`designacion-suggestion-item ${idx === activeSuggestionIndex ? 'active' : ''}`}
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleSelectDocente(item);
                                      }}
                                      onMouseEnter={() => setActiveSuggestionIndex(idx)}
                                      role="option"
                                      aria-selected={idx === activeSuggestionIndex}
                                    >
                                      <span className="designacion-suggestion-name">
                                        {item.apellido || item.apellidos}, {item.nombre || item.nombres}
                                      </span>
                                      <span className="designacion-suggestion-sub">
                                        {[
                                          item.categoria,
                                          item.unidad,
                                          item.legajo ? `Legajo: ${item.legajo}` : '',
                                          item.estado ? `Estado: ${item.estado}` : '',
                                        ]
                                          .filter(Boolean)
                                          .join(' • ')}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>

                            <button
                              type="button"
                              className="designacion-search-btn"
                              onClick={() => handleSearch()}
                              disabled={isSearching}
                            >
                              <FiSearch />
                              <span>{isSearching ? 'Buscando...' : 'Buscar Docente'}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Divider between Card Header and Form */}
                    <hr className="designacion-card-divider" />

                    {/* Form Fields */}
                    <form
                      className="designacion-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleAsignarCargoClick();
                      }}
                    >
                      {/* Section 1: Datos del Docente */}
                      <div className="designacion-form-section">
                        <div className="designacion-section-header">
                          <h3 className="designacion-section-title">
                            {isRedesignacion ? 'Datos del Docente (A Re-designar)' : 'Datos del Docente'}
                          </h3>
                          {!isRedesignacion && (
                            <button
                              type="button"
                              className="designacion-btn-nuevo-docente"
                              onClick={handleIngresarDocenteNuevo}
                            >
                              <FiUserPlus size={18} />
                              <span>Ingresar docente nuevo</span>
                            </button>
                          )}
                        </div>

                        <div className="designacion-form-row">
                          <div className="designacion-field-group small">
                            <label htmlFor="legajoInput" className="designacion-label">
                              N° Legajo
                            </label>
                            <input
                              id="legajoInput"
                              type="text"
                              className="designacion-input"
                              placeholder="Ingrese valor"
                              value={formData.legajo}
                              onChange={(e) => handleFieldChange('legajo', e.target.value)}
                              disabled={isRedesignacion}
                            />
                          </div>

                          <div className="designacion-field-group medium">
                            <label htmlFor="apellidoInput" className="designacion-label">
                              Apellido/s
                            </label>
                            <input
                              id="apellidoInput"
                              type="text"
                              className="designacion-input"
                              placeholder="Castelli"
                              value={formData.apellido}
                              onChange={(e) => handleFieldChange('apellido', e.target.value)}
                              disabled={isRedesignacion}
                            />
                          </div>

                          <div className="designacion-field-group medium">
                            <label htmlFor="nombreInput" className="designacion-label">
                              Nombre/s
                            </label>
                            <input
                              id="nombreInput"
                              type="text"
                              className="designacion-input"
                              placeholder="Sandra"
                              value={formData.nombre}
                              onChange={(e) => handleFieldChange('nombre', e.target.value)}
                              disabled={isRedesignacion}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Período y Resolución */}
                      <div className="designacion-form-section">
                        <div className="designacion-section-header">
                          <h3 className="designacion-section-title">
                            {isRedesignacion ? 'Nuevo Período y Resolución' : 'Período y Resolución'}
                          </h3>
                        </div>

                        <div className="designacion-form-row">
                          <div className="designacion-field-group small">
                            <label htmlFor="nroResolucionInput" className="designacion-label">
                              {isRedesignacion ? 'Nueva N° Resolución *' : 'N° Resolución'}
                            </label>
                            <input
                              id="nroResolucionInput"
                              type="text"
                              className="designacion-input"
                              placeholder={isRedesignacion ? "Ej: RES-2026-890" : "Ingrese valor"}
                              value={formData.nroResolucion}
                              onChange={(e) => handleFieldChange('nroResolucion', e.target.value)}
                            />
                          </div>

                          <div className="designacion-field-group date">
                            <label htmlFor="fechaComienzoInput" className="designacion-label">
                              {isRedesignacion ? 'Nueva Fecha Inicio *' : 'Fecha de Comienzo'}
                            </label>
                            <div className="designacion-date-wrapper">
                              <DatePicker
                                id="fechaComienzoInput"
                                selected={formData.fechaComienzo}
                                onChange={(date: Date | null) => handleFieldChange('fechaComienzo', date)}
                                dateFormat="dd/MM/yyyy"
                                locale="es"
                                placeholderText="01/09/2026"
                                autoComplete="off"
                              />
                              <FiCalendar className="designacion-calendar-icon" />
                            </div>
                          </div>

                          <div className="designacion-field-group date">
                            <label htmlFor="fechaFinalizacionInput" className="designacion-label">
                              {isRedesignacion ? 'Nueva Fecha Fin (Opcional)' : 'Fecha Finalización'}
                            </label>
                            <div className="designacion-date-wrapper">
                              <DatePicker
                                id="fechaFinalizacionInput"
                                selected={formData.fechaFinalizacion}
                                onChange={(date: Date | null) => handleFieldChange('fechaFinalizacion', date)}
                                dateFormat="dd/MM/yyyy"
                                locale="es"
                                placeholderText="06/10/2026"
                                autoComplete="off"
                              />
                              <FiCalendar className="designacion-calendar-icon" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </form>

                    {/* Section shown when pressing "Asignar cargo": Divider + Title + Crear Cargo button + Libre Cargos window */}
                    {showCargosSection && (
                      <div className="designacion-cargos-section">
                        <hr className="designacion-cargos-divider" />

                        <div className="designacion-cargos-header">
                          <h2 className="designacion-cargos-title" ref={cargosHeaderRef}>
                            {isRedesignacion ? 'Cargo Actual Asignado' : 'Cargos para Designación'}
                          </h2>

                          <div className="designacion-cargos-actions">
                            {/* Sort Selector */}
                            <div className="designacion-cargos-sort-wrap">
                              <label htmlFor="cargoSortSelect" className="designacion-cargos-sort-label">
                                Ordenar por:
                              </label>
                              <div className="designacion-cargos-select-box">
                                <select
                                  id="cargoSortSelect"
                                  className="designacion-cargos-sort-select"
                                  value={cargoSortBy}
                                  onChange={(e) => setCargoSortBy(e.target.value as any)}
                                >
                                  <option value="numero">N° Cargo</option>
                                  <option value="fechaCreacion">Fecha Creación</option>
                                  <option value="materia">Materia</option>
                                  <option value="categoria">Categoría</option>
                                  <option value="dedicacion">Dedicación</option>
                                  <option value="horasOcupadas">Horas Ocupadas</option>
                                </select>
                                <FiChevronDown className="designacion-cargos-select-icon" />
                              </div>

                              <button
                                type="button"
                                className="designacion-cargos-sort-dir-btn"
                                onClick={() => setCargoSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                                title={cargoSortDirection === 'asc' ? 'Orden Ascendente (clic para Descendente)' : 'Orden Descendente (clic para Ascendente)'}
                                aria-label="Cambiar dirección de orden"
                              >
                                {cargoSortDirection === 'asc' ? <FiArrowUp size={15} /> : <FiArrowDown size={15} />}
                                <span>{cargoSortDirection === 'asc' ? 'Asc' : 'Desc'}</span>
                              </button>
                            </div>

                            <button
                              type="button"
                              className="designacion-btn-crear-cargo"
                              onClick={handleCrearCargo}
                            >
                              <CrearCargoIcon />
                              <span>Crear Cargo</span>
                            </button>
                          </div>
                        </div>

                        <div className="designacion-cargos-window" role="listbox" aria-label="Cargos disponibles en estado libre">
                          {isLoadingCargos ? (
                            <div className="designacion-cargos-empty">
                              Cargando cargos disponibles...
                            </div>
                          ) : sortedAvailableCargos.length === 0 ? (
                            <div className="designacion-cargos-empty">
                              No se encontraron cargos disponibles en estado Libre.
                            </div>
                          ) : (
                            sortedAvailableCargos.map((cargo) => {
                              const isSelected = selectedCargoId === cargo.id;
                              const numero = cargo.numero ?? cargo.codigo ?? cargo.id;
                              return (
                                <div
                                  key={cargo.id}
                                  role="option"
                                  aria-selected={isSelected}
                                  tabIndex={0}
                                  className={`designacion-cargo-card ${isSelected ? 'selected' : ''}`}
                                  onClick={() => setSelectedCargoId(cargo.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      setSelectedCargoId(cargo.id);
                                    }
                                  }}
                                >
                                  <div className="designacion-cargo-card-row">
                                    <span className="designacion-cargo-field">
                                      <strong>N° Cargo:</strong> {numero}
                                    </span>
                                    <span className="designacion-cargo-field">
                                      <strong>Fecha Creación:</strong> {formatCargoDate(cargo.fechaCreacion)}
                                    </span>
                                    <span className="designacion-cargo-field">
                                      <strong>Horas Ocupadas:</strong> {formatHorasOcupadas(cargo.horasOcupadas)}
                                    </span>
                                    <span className="designacion-cargo-field">
                                      <strong>Origen:</strong> {cargo.origen || 'Sin especificar'}
                                    </span>
                                  </div>

                                  <div className="designacion-cargo-card-row">
                                    <span className="designacion-cargo-field">
                                      <strong>Caracter:</strong> {cargo.caracter || 'Sin especificar'}
                                    </span>
                                    <span className="designacion-cargo-field">
                                      <strong>Categoría:</strong> {cargo.categoria || 'Sin especificar'}
                                    </span>
                                    <span className="designacion-cargo-field">
                                      <strong>Dedicación:</strong> {cargo.dedicacion || 'Sin especificar'}
                                    </span>
                                    <span className="designacion-cargo-field">
                                      <strong>Designación:</strong> {cargo.designacion || 'Libre'}
                                    </span>
                                  </div>

                                  <div className="designacion-cargo-card-row">
                                    <span className="designacion-cargo-field">
                                      <strong>Unidad:</strong> {cargo.unidad || cargo.unidadNombre || 'Sin especificar'}
                                    </span>
                                    <span className="designacion-cargo-field">
                                      <strong>Materia:</strong> {cargo.materia || 'Sin asignar'}
                                    </span>
                                    <span className="designacion-cargo-field">
                                      <strong>Plan:</strong> {cargo.plan !== undefined && cargo.plan !== null && cargo.plan !== '' ? cargo.plan : 'Sin asignar'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : step === 'asignacion-funciones' ? (
                  /* =========================================================================
                     PASO 2: ASIGNACIÓN DE ACTIVIDADES / FUNCIONES (MOCKUP EXACT MATCH)
                     ========================================================================= */
                  <div className="designacion-actividades-view">
                    {/* Header Block 1: Datos de Designación Summary */}
                    <div className="designacion-summary-block">
                      <h2 className="designacion-summary-title">Datos de Designación</h2>
                      <div className="designacion-summary-row">
                        <span className="designacion-summary-item">
                          <strong>N° Legajo:</strong> {formData.legajo || 'Sin especificar'}
                        </span>
                        <span className="designacion-summary-item">
                          <strong>N° Resolución:</strong> {formData.nroResolucion}
                        </span>
                        <span className="designacion-summary-item">
                          <strong>Docente:</strong> {formData.apellido.toUpperCase()}, {formData.nombre}
                        </span>
                      </div>
                      <div className="designacion-summary-row" style={{ marginTop: '8px' }}>
                        <span className="designacion-summary-item">
                          <strong>Fecha de Comienzo:</strong>{' '}
                          {formData.fechaComienzo ? formData.fechaComienzo.toLocaleDateString('es-AR') : '--/--/----'}
                        </span>
                        <span className="designacion-summary-item">
                          <strong>Fecha de Finalización:</strong>{' '}
                          {formData.fechaFinalizacion
                            ? formData.fechaFinalizacion.toLocaleDateString('es-AR')
                            : 'Indeterminada'}
                        </span>
                      </div>
                    </div>

                    <hr className="designacion-card-divider" />

                    {/* Header Block 2: Cargo de Designación Summary */}
                    <div className="designacion-summary-block">
                      <h2 className="designacion-summary-title">Cargo de Designación</h2>
                      <div className="designacion-cargo-box">
                        <div className="designacion-cargo-box-row">
                          <span className="designacion-cargo-box-item">
                            <strong>N° Cargo:</strong> {selectedCargo?.numero ?? selectedCargo?.codigo ?? selectedCargoId}
                          </span>
                          <span className="designacion-cargo-box-item">
                            <strong>Fecha Creación:</strong> {formatCargoDate(selectedCargo?.fechaCreacion)}
                          </span>
                          <span className="designacion-cargo-box-item">
                            <strong>Horas Ocupadas:</strong> {formatHorasOcupadas(selectedCargo?.horasOcupadas)}
                          </span>
                          <span className="designacion-cargo-box-item">
                            <strong>Origen:</strong> {selectedCargo?.origen || 'Sin especificar'}
                          </span>
                        </div>

                        <div className="designacion-cargo-box-row">
                          <span className="designacion-cargo-box-item">
                            <strong>Caracter:</strong> {selectedCargo?.caracter || 'Sin especificar'}
                          </span>
                          <span className="designacion-cargo-box-item">
                            <strong>Categoría:</strong> {selectedCargo?.categoria || 'Sin especificar'}
                          </span>
                          <span className="designacion-cargo-box-item">
                            <strong>Dedicación:</strong> {selectedCargo?.dedicacion || 'Simple'} ({maxHorasPermitidas} hs)
                          </span>
                          <span className="designacion-cargo-box-item">
                            <strong>Designación:</strong> {selectedCargo?.designacion || 'Libre'}
                          </span>
                        </div>

                        <div className="designacion-cargo-box-row">
                          <span className="designacion-cargo-box-item">
                            <strong>Unidad:</strong> {selectedCargo?.unidad || selectedCargo?.unidadNombre || 'Sin especificar'}
                          </span>
                          <span className="designacion-cargo-box-item">
                            <strong>Materia:</strong> {selectedCargo?.materia || 'Sin asignar'}
                          </span>
                          <span className="designacion-cargo-box-item">
                            <strong>Plan:</strong> {selectedCargo?.plan !== undefined && selectedCargo?.plan !== null && selectedCargo?.plan !== '' ? selectedCargo.plan : 'Sin asignar'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <hr className="designacion-card-divider" />

                    {/* Header Block 3: Funciones Dynamic Form */}
                    <div className="designacion-funciones-section">
                      <div className="designacion-funciones-header">
                        <h2 className="designacion-funciones-title">Funciones</h2>
                        <button
                          type="button"
                          className="designacion-btn-anadir-funcion"
                          onClick={handleAddFuncion}
                        >
                          <FiFileText size={16} />
                          <span>Añadir Función</span>
                        </button>
                      </div>

                      {/* List of Functions Cards */}
                      {funciones.map((funcion, idx) => {
                        const searchQuery = materiaFilterQueries[idx] ?? '';
                        const filteredSuggestions = filteredMaterias.filter((m: any) =>
                          !searchQuery ||
                          String(m.nombre || '')
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase())
                        );

                        return (
                          <div key={funcion.id} className="designacion-funcion-card">
                            <div className="designacion-funcion-card-header">
                              <span className="designacion-funcion-number">FUNCIÓN N°{idx + 1}</span>
                              {funciones.length > 1 && (
                                <button
                                  type="button"
                                  className="designacion-funcion-btn-eliminar"
                                  onClick={() => handleRemoveFuncion(idx)}
                                  title="Eliminar función"
                                >
                                  <FiTrash2 size={14} />
                                  <span>Eliminar</span>
                                </button>
                              )}
                            </div>

                            <div className="designacion-funcion-fields-grid">
                              {/* Field 1: Nombre de Función */}
                              <div className="designacion-funcion-field">
                                <label className="designacion-funcion-label">
                                  Nombre de Función
                                </label>
                                <input
                                  type="text"
                                  className="designacion-funcion-input"
                                  placeholder="Ingrese valor"
                                  value={funcion.nombre}
                                  onChange={(e) => handleUpdateFuncion(idx, 'nombre', e.target.value)}
                                />
                              </div>

                              {/* Field 2: Tipo de Función */}
                              <div className="designacion-funcion-field">
                                <label className="designacion-funcion-label">
                                  Tipo de Función
                                </label>
                                <div style={{ position: 'relative' }}>
                                  <select
                                    className="designacion-funcion-select"
                                    value={funcion.tipo}
                                    onChange={(e) => handleUpdateFuncion(idx, 'tipo', e.target.value)}
                                  >
                                    {TIPO_FUNCION_OPTIONS.map((opt) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                  <FiChevronDown className="designacion-funcion-select-icon" />
                                </div>
                              </div>

                              {/* Field 3: Cantidad Horas */}
                              <div className="designacion-funcion-field">
                                <label className="designacion-funcion-label">
                                  Cantidad Horas
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  className="designacion-funcion-input"
                                  placeholder="Ingrese valor"
                                  value={funcion.horas}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? '' : Math.max(1, Number(e.target.value));
                                    handleUpdateFuncion(idx, 'horas', val);
                                  }}
                                />
                              </div>

                              {/* Field 4: Nombre de Materia (Autocomplete) */}
                              <div className="designacion-funcion-field designacion-materia-field-wrap">
                                <label className="designacion-funcion-label">
                                  Nombre de Materia
                                </label>
                                <input
                                  type="text"
                                  className="designacion-funcion-input"
                                  placeholder="Ingrese valor"
                                  value={funcion.materiaNombre}
                                  onFocus={() => {
                                    setActiveMateriaDropdownIndex(idx);
                                    setMateriaFilterQueries((prev) => ({ ...prev, [idx]: funcion.materiaNombre }));
                                  }}
                                  onChange={(e) => {
                                    const text = e.target.value;
                                    handleUpdateFuncion(idx, 'materiaNombre', text);
                                    handleUpdateFuncion(idx, 'materiaId', null);
                                    setMateriaFilterQueries((prev) => ({ ...prev, [idx]: text }));
                                    setActiveMateriaDropdownIndex(idx);
                                  }}
                                />

                                {activeMateriaDropdownIndex === idx && filteredSuggestions.length > 0 && (
                                  <ul className="designacion-materia-suggestions">
                                    {filteredSuggestions.slice(0, 8).map((m: any) => (
                                      <li
                                        key={m.id}
                                        className="designacion-materia-item"
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          handleSelectMateriaForFuncion(idx, m);
                                        }}
                                      >
                                        <strong>{m.nombre}</strong>
                                        <span className="designacion-materia-item-sub">
                                          {[m.unidadNombre || m.unidad?.unidadNombre, m.planEstudio ? `Plan ${m.planEstudio}` : '']
                                            .filter(Boolean)
                                            .join(' • ')}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Summary Counter Bar */}
                      <div className="designacion-horas-counter-bar">
                        <span>
                          Horas Asignadas:{' '}
                          <strong>
                            {totalHorasAsignadas} / {maxHorasPermitidas} hs
                          </strong>
                        </span>
                        <span
                          className={`designacion-horas-badge ${totalHorasAsignadas > maxHorasPermitidas ? 'exceeded' : 'valid'
                            }`}
                        >
                          {totalHorasAsignadas > maxHorasPermitidas
                            ? `Excede por ${totalHorasAsignadas - maxHorasPermitidas} hs`
                            : `Disponibles: ${maxHorasPermitidas - totalHorasAsignadas} hs`}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* =========================================================================
                     PASO 3: DESIGNACIÓN GENERADA - VISTA PREVIA DE DOCUMENTO
                     ========================================================================= */
                  <div className="designacion-documento-view">
                    {/* Left Column: Document Preview */}
                    <div className="designacion-preview-main">
                      <div className="designacion-preview-header">
                        <h2 className="designacion-preview-title">Vista previa de documento</h2>
                        <div className="designacion-preview-controls">
                          <select
                            className="designacion-membrete-select"
                            value={membreteType}
                            onChange={(e) => setMembreteType(e.target.value as 'ffha' | 'certificados')}
                            aria-label="Seleccionar tipo de membrete"
                            title="Seleccionar tipo de membrete"
                          >
                            <option value="ffha">Membrete Oficial (FFHA)</option>
                            <option value="certificados">Membrete Certificados (SEU)</option>
                          </select>
                          <div className="designacion-zoom-controls">
                          <button
                            type="button"
                            className="designacion-zoom-btn"
                            onClick={() => setZoomLevel((z) => Math.min(140, z + 10))}
                            title="Acercar documento"
                            aria-label="Acercar documento"
                          >
                            <FiZoomIn size={18} />
                          </button>
                          <button
                            type="button"
                            className="designacion-zoom-btn"
                            onClick={() => setZoomLevel((z) => Math.max(70, z - 10))}
                            title="Alejar documento"
                            aria-label="Alejar documento"
                          >
                            <FiZoomOut size={18} />
                          </button>
                          </div>
                        </div>
                      </div>

                      <div className="designacion-preview-viewport">
                        <div
                          ref={a4SheetRef}
                          className="designacion-a4-sheet"
                          style={{ zoom: `${zoomLevel}%` }}
                        >
                          {/* A4 Top Header: Official UNSJ / FFHA Membrete */}
                          <div className="designacion-a4-header">
                            {membreteType === 'ffha' ? (
                              <div className="designacion-a4-membrete-row">
                                <img
                                  src={logoUnsjImg}
                                  alt="Universidad Nacional de San Juan"
                                  className="designacion-a4-logo-unsj"
                                />
                                <img
                                  src={logo50AniosImg}
                                  alt="1976-2026 50 Años Por la memoria, la verdad y la justicia. Nunca Más"
                                  className="designacion-a4-logo-50"
                                />
                                <img
                                  src={logoFfhaImg}
                                  alt="Facultad de Filosofía, Humanidades y Artes"
                                  className="designacion-a4-logo-ffha"
                                />
                              </div>
                            ) : (
                              <div className="designacion-a4-membrete-cert">
                                <img
                                  src={certUnsjImg}
                                  alt="Universidad Nacional de San Juan"
                                  className="designacion-a4-cert-logo"
                                />
                                <div className="designacion-a4-cert-text">
                                  <div className="designacion-a4-cert-uni">Universidad Nacional de San Juan</div>
                                  <div className="designacion-a4-cert-fac">Facultad de Filosofía, Humanidades y Artes</div>
                                  <div className="designacion-a4-cert-sec">Secretaría de Extensión Universitaria</div>
                                </div>
                                <img
                                  src={certFfhaImg}
                                  alt="FFHA"
                                  className="designacion-a4-cert-logo"
                                />
                              </div>
                            )}
                            <div className="designacion-a4-date-row">
                              <div className="designacion-a4-date-line">
                                <span>SAN JUAN, </span>
                                <span className="designacion-a4-stamp-date">
                                  {new Date()
                                    .toLocaleDateString('es-AR', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                    })
                                    .toUpperCase()
                                    .replace('.', '')}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* A4 Body Content */}
                          <div className="designacion-a4-body">
                            <p className="designacion-a4-section-heading">VISTO:</p>
                            <p className="designacion-a4-paragraph">
                              Las actuaciones administrativas relativas a la designación dispuesta por Resolución N°{' '}
                              <strong>{formData.nroResolucion || 'S/N'}</strong>, para proveer UN (1) cargo de categoría{' '}
                              <strong>{selectedCargo?.categoria || 'Docente'}</strong>, dedicación{' '}
                              <strong>
                                {selectedCargo?.dedicacion || 'Simple'} ({maxHorasPermitidas} hs)
                              </strong>
                              , carácter <strong>{selectedCargo?.caracter || 'Ordinario'}</strong>, Código N°{' '}
                              <strong>{selectedCargo?.numero ?? selectedCargo?.codigo ?? selectedCargoId}</strong>, para
                              cumplir funciones en{' '}
                              {funciones.map((f, i) => (
                                <span key={f.id}>
                                  {i > 0 ? (i === funciones.length - 1 ? ' y ' : ', ') : ''}
                                  “{f.materiaNombre}” ({f.nombre})
                                </span>
                              ))}
                              , en el ámbito de la Unidad Académica{' '}
                              <strong>{selectedCargo?.unidad || selectedCargo?.unidadNombre || 'General'}</strong>, y
                            </p>

                            <p className="designacion-a4-section-heading">CONSIDERANDO:</p>
                            <p className="designacion-a4-paragraph">
                              Que se han cumplido los procedimientos reglamentarios vigentes en la Universidad Nacional de
                              San Juan para la cobertura del cargo docente mencionado;
                            </p>
                            <p className="designacion-a4-paragraph">
                              Que corresponde designar al/a la docente{' '}
                              <strong>
                                {formData.apellido.toUpperCase()}, {formData.nombre}
                              </strong>{' '}
                              (Legajo N° <strong>{formData.legajo || 'S/N'}</strong>), a partir del{' '}
                              <strong>
                                {formData.fechaComienzo
                                  ? formData.fechaComienzo.toLocaleDateString('es-AR')
                                  : '--/--/----'}
                              </strong>
                              {formData.fechaFinalizacion
                                ? ` y hasta el ${formData.fechaFinalizacion.toLocaleDateString('es-AR')}`
                                : ', con carácter indeterminado'}
                              , asignándole una carga horaria total de{' '}
                              <strong>
                                {totalHorasAsignadas} horas semanales
                              </strong>
                              ;
                            </p>

                            <p className="designacion-a4-por-ello">POR ELLO,</p>
                            <p className="designacion-a4-authority">
                              LA DECANA DE LA FACULTAD DE FILOSOFÍA, HUMANIDADES Y ARTES
                            </p>
                            <p className="designacion-a4-resuelve">RESUELVE:</p>

                            <p className="designacion-a4-paragraph">
                              <strong>ARTÍCULO 1°.-</strong> Designar a{' '}
                              <strong>
                                {formData.apellido.toUpperCase()}, {formData.nombre}
                              </strong>{' '}
                              (Legajo N° <strong>{formData.legajo || 'S/N'}</strong>) en el Cargo N°{' '}
                              <strong>{selectedCargo?.numero ?? selectedCargo?.codigo ?? selectedCargoId}</strong>,
                              Categoría <strong>{selectedCargo?.categoria || 'Sin especificar'}</strong>, Carácter{' '}
                              <strong>{selectedCargo?.caracter || 'Sin especificar'}</strong>, Dedicación{' '}
                              <strong>
                                {selectedCargo?.dedicacion || 'Simple'} ({maxHorasPermitidas} hs)
                              </strong>
                              , dependiente de la Unidad{' '}
                              <strong>{selectedCargo?.unidad || selectedCargo?.unidadNombre || 'Sin especificar'}</strong>
                              , bajo Resolución N° <strong>{formData.nroResolucion}</strong>, pasando a revestir en
                              estado <strong>ACTIVO</strong>.
                            </p>

                            <p className="designacion-a4-paragraph">
                              <strong>ARTÍCULO 2°.-</strong> Asignar al cargo mencionado las siguientes funciones
                              académicas:
                            </p>

                            <ul className="designacion-a4-funciones-list">
                              {funciones.map((f, idx) => (
                                <li key={f.id}>
                                  <strong>Función N°{idx + 1}:</strong> {f.nombre} — <em>Tipo:</em> {f.tipo} —{' '}
                                  <em>Carga horaria:</em> {f.horas} hs semanales — <em>Materia:</em> {f.materiaNombre}.
                                </li>
                              ))}
                            </ul>

                            <p className="designacion-a4-paragraph">
                              <strong>ARTÍCULO 3°.-</strong> Regístrese, comuníquese, notifíquese al/a la interesado/a y
                              archívese.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Sidebar Actions & Delete */}
                    <aside className="designacion-preview-sidebar">
                      <div className="designacion-acciones-card">
                        <h3 className="designacion-acciones-title">Acciones</h3>
                        <div className="designacion-acciones-list">
                          <button
                            type="button"
                            className="designacion-accion-btn confirmar"
                            onClick={handleConfirmarDesignacion}
                            disabled={isSubmitting || !!confirmedData}
                          >
                            <FiCheckSquare size={18} />
                            <span>
                              {isSubmitting
                                ? 'Confirmando...'
                                : confirmedData
                                  ? 'Confirmado'
                                  : 'Confirmar'}
                            </span>
                          </button>

                          <button
                            type="button"
                            className="designacion-accion-btn modificar"
                            onClick={() => {
                              setFeedback(null);
                              setStep('asignacion-funciones');
                            }}
                            disabled={isSubmitting}
                          >
                            <FiEdit size={18} />
                            <span>Modificar</span>
                          </button>

                          <button
                            type="button"
                            className="designacion-accion-btn imprimir"
                            onClick={handleImprimirDocumento}
                          >
                            <FiPrinter size={18} />
                            <span>Imprimir</span>
                          </button>
                        </div>
                      </div>

                      <div className="designacion-eliminar-card">
                        <button
                          type="button"
                          className="designacion-accion-btn eliminar"
                          onClick={handleLimpiar}
                          disabled={isSubmitting}
                        >
                          <FiTrash2 size={18} />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </aside>
                  </div>
                )}
              </div>

              {/* Feedback Alert */}
              {feedback && (
                <div className={`designacion-feedback ${feedback.type}`}>
                  <span>{feedback.message}</span>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    onClick={() => setFeedback(null)}
                  >
                    <FiX />
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Actions Row (Only in Step 1 and Step 2) */}
            {step !== 'documento-generado' && (
              <div className="designacion-actions-row">
                {step === 'seleccion-cargo' ? (
                  <>
                    <button
                      type="button"
                      className="designacion-btn-limpiar"
                      onClick={handleLimpiar}
                    >
                      <FiTrash2 size={18} />
                      <span>Limpiar</span>
                    </button>

                    {selectedCargoId ? (
                      <button
                        type="button"
                        className="designacion-btn-asignar-actividades"
                        onClick={handleAsignarCargoClick}
                        disabled={isSubmitting}
                      >
                        <LuClipboardPlus size={18} />
                        <span>{isSubmitting ? 'Asignando...' : 'Asignar funciones'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="designacion-btn-asignar"
                        onClick={handleAsignarCargoClick}
                        disabled={isSubmitting}
                      >
                        <FiEdit size={18} />
                        <span>{isSubmitting ? 'Asignando...' : 'Asignar cargo'}</span>
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {/* Step 2 Actions: Borrar (Red) on left, Generar Documento on right */}
                    <button
                      type="button"
                      className="designacion-btn-borrar"
                      onClick={handleLimpiar}
                      disabled={isSubmitting}
                    >
                      <FiTrash2 size={18} />
                      <span>Borrar</span>
                    </button>

                    <button
                      type="button"
                      className="designacion-btn-generar-documento"
                      onClick={handleGenerarDocumento}
                      disabled={isSubmitting || totalHorasAsignadas > maxHorasPermitidas}
                    >
                      <FiFileText size={18} />
                      <span>{isSubmitting ? 'Generando...' : 'Generar Documento'}</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
