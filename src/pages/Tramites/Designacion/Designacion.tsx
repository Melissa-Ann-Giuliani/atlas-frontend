import { useState, useEffect, useRef } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { es } from 'date-fns/locale/es';
import 'react-datepicker/dist/react-datepicker.css';
import './Designacion.css';
import Sidebar from '../../../components/Sidebar';
import Topbar from '../../../components/Topbar';
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
  FiDownload,
  FiPrinter,
  FiCheck
} from 'react-icons/fi';
import { LuClipboardPlus } from 'react-icons/lu';

registerLocale('es', es);

export type TramiteTab = 'designaciones' | 'licencias' | 'subrogancias' | 'renuncias' | 'adscripciones';

interface DesignacionProps {
  onLogout?: () => void;
  onNavigate?: (page: any, data?: any) => void;
  onBack?: () => void;
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

export default function Designacion({ onLogout, onNavigate, onBack }: DesignacionProps) {
  const [activeTab, setActiveTab] = useState<TramiteTab>('designaciones');
  const [formData, setFormData] = useState<FormState>(initialFormState);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number>(-1);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Cargos section & selection state
  const [showCargosSection, setShowCargosSection] = useState(false);
  const [availableCargos, setAvailableCargos] = useState<CargoOption[]>([]);
  const [selectedCargoId, setSelectedCargoId] = useState<number | null>(null);
  const [isLoadingCargos, setIsLoadingCargos] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cargoSortBy, setCargoSortBy] = useState<'numero' | 'fechaCreacion' | 'materia' | 'categoria' | 'dedicacion' | 'horasOcupadas'>('numero');
  const [cargoSortDirection, setCargoSortDirection] = useState<'asc' | 'desc'>('asc');

  // Step state: 'seleccion-cargo' (Paso 1) vs 'asignacion-funciones' (Paso 2)
  const [step, setStep] = useState<'seleccion-cargo' | 'asignacion-funciones'>('seleccion-cargo');
  const [funciones, setFunciones] = useState<FuncionFormItem[]>([]);
  const [materiasList, setMateriasList] = useState<any[]>([]);
  const [activeMateriaDropdownIndex, setActiveMateriaDropdownIndex] = useState<number | null>(null);
  const [materiaFilterQueries, setMateriaFilterQueries] = useState<{ [index: number]: string }>({});

  // Success Modal state
  const [successModalData, setSuccessModalData] = useState<{
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
    setSuccessModalData(null);
  };

  const handleBack = () => {
    if (step === 'asignacion-funciones') {
      setStep('seleccion-cargo');
      setFeedback(null);
      return;
    }
    if (onBack) {
      onBack();
    } else if (onNavigate) {
      onNavigate('inicio');
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
    const defaultMateriaName = selectedCargo?.materia && selectedCargo.materia !== 'Sin asignar' ? selectedCargo.materia : '';
    const matchedMateria = defaultMateriaName
      ? materiasList.find((m: any) => String(m.nombre || '').trim().toLowerCase() === defaultMateriaName.trim().toLowerCase())
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

  // Final Action in Step 2: "Generar Documento"
  const handleGenerarDocumento = async () => {
    setFeedback(null);

    if (!selectedCargoId || !selectedCargo) {
      setFeedback({
        type: 'error',
        message: 'No se encuentra seleccionado ningún cargo válido.',
      });
      return;
    }

    if (funciones.length === 0) {
      setFeedback({
        type: 'error',
        message: 'Debe ingresar al menos una función.',
      });
      return;
    }

    // Prepare validated functions payload
    const resolvedFunciones: { nombre: string; tipo: string; horas: number; materiaId: number }[] = [];

    // Validate each function row
    for (let i = 0; i < funciones.length; i++) {
      const f = funciones[i];
      const numLabel = `Función N°${i + 1}`;

      if (!f.nombre.trim()) {
        setFeedback({
          type: 'error',
          message: `Por favor ingrese el Nombre de la ${numLabel}.`,
        });
        return;
      }

      if (!f.tipo.trim()) {
        setFeedback({
          type: 'error',
          message: `Por favor seleccione el Tipo para la ${numLabel}.`,
        });
        return;
      }

      const horasNum = Number(f.horas);
      if (isNaN(horasNum) || horasNum < 1) {
        setFeedback({
          type: 'error',
          message: `La Cantidad de Horas de la ${numLabel} debe ser al menos 1 hora.`,
        });
        return;
      }

      let targetMateriaId = f.materiaId;
      if (!targetMateriaId) {
        // Attempt to match by name in filteredMaterias or materiasList
        const matched = filteredMaterias.find(
          (m: any) => String(m.nombre || '').trim().toLowerCase() === f.materiaNombre.trim().toLowerCase()
        );
        if (matched?.id) {
          targetMateriaId = matched.id;
        } else {
          setFeedback({
            type: 'error',
            message: `Por favor seleccione una materia válida para la ${numLabel}.`,
          });
          return;
        }
      }

      resolvedFunciones.push({
        nombre: f.nombre.trim(),
        tipo: f.tipo.trim(),
        horas: horasNum,
        materiaId: Number(targetMateriaId),
      });
    }

    // Validate total hours vs Dedicación
    if (totalHorasAsignadas > maxHorasPermitidas) {
      setFeedback({
        type: 'error',
        message: `La suma de horas asignadas (${totalHorasAsignadas} hs) supera la dedicación del cargo (${maxHorasPermitidas} hs).`,
      });
      return;
    }

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
        // If already linked, try continuing or report error
        if (!errorMsg.toLowerCase().includes('ya posee')) {
          setFeedback({ type: 'error', message: errorMsg });
          setIsSubmitting(false);
          return;
        }
      }

      // 2. Asignar funciones al cargo via POST /api/cargos/{cargoId}/funciones
      const funcionesPayload = {
        funciones: resolvedFunciones,
      };

      const resFunc = await fetch(`${apiUrl}/api/cargos/${selectedCargoId}/funciones`, {
        method: 'POST',
        headers,
        body: JSON.stringify(funcionesPayload),
      });

      const funcData = await resFunc.json().catch(() => null);

      if (resFunc.ok || resFunc.status === 200) {
        const docName = `${formData.apellido}, ${formData.nombre}`;
        const cargoNum = selectedCargo.numero ?? selectedCargo.codigo ?? selectedCargoId;

        setSuccessModalData({
          designacionId: funcData?.designacionId ?? desData?.id ?? 0,
          documentoId: funcData?.documentoId,
          docenteNombre: docName,
          cargoNumero: cargoNum,
          nroResolucion: formData.nroResolucion,
          horasOcupadas: funcData?.horasOcupadas ?? totalHorasAsignadas,
          horasDedicacion: funcData?.horasDedicacion ?? maxHorasPermitidas,
          notificacionEnviada: !!funcData?.notificacionEnviada,
        });

        setFeedback({
          type: 'success',
          message: `Designación y funciones registradas con éxito para ${docName}. Documento oficial generado.`,
        });
      } else {
        const errorMsg = funcData?.message || 'Error al asignar las funciones al cargo.';
        setFeedback({
          type: 'error',
          message: errorMsg,
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error de conexión con el servidor al procesar la designación.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Download PDF document
  const handleDescargarDocumento = async () => {
    if (!successModalData) return;
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

      // 1. Fetch archivo details from /api/archivos/tramite/DESIGNACION/{designacionId}
      const res = await fetch(`${apiUrl}/api/archivos/tramite/DESIGNACION/${successModalData.designacionId}`, { headers });
      if (res.ok) {
        const archivos = await res.json();
        const archivo = Array.isArray(archivos) ? archivos[0] : archivos;
        if (archivo?.nombreEncriptado) {
          const downloadUrl = `${apiUrl}/api/archivos/descargar/${archivo.nombreEncriptado}`;
          const resBlob = await fetch(downloadUrl, { headers });
          if (resBlob.ok) {
            const blob = await resBlob.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = archivo.nombreOriginal || `designacion-${successModalData.designacionId}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(blobUrl);
            return;
          }
        }
      }
      setFeedback({
        type: 'info',
        message: 'El documento se encuentra registrado en el sistema bajo el ID ' + (successModalData.documentoId || ''),
      });
    } catch (err) {
      console.error('Error al descargar archivo:', err);
      setFeedback({
        type: 'error',
        message: 'No se pudo descargar el archivo automáticamente.',
      });
    }
  };

  // Print PDF document
  const handleImprimirDocumento = async () => {
    if (!successModalData) return;
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

      const res = await fetch(`${apiUrl}/api/archivos/tramite/DESIGNACION/${successModalData.designacionId}`, { headers });
      if (res.ok) {
        const archivos = await res.json();
        const archivo = Array.isArray(archivos) ? archivos[0] : archivos;
        if (archivo?.nombreEncriptado) {
          const downloadUrl = `${apiUrl}/api/archivos/descargar/${archivo.nombreEncriptado}`;
          const resBlob = await fetch(downloadUrl, { headers });
          if (resBlob.ok) {
            const blob = await resBlob.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const printWindow = window.open(blobUrl);
            if (printWindow) {
              printWindow.focus();
              printWindow.print();
            }
            return;
          }
        }
      }
      window.print();
    } catch {
      window.print();
    }
  };

  const handleCloseSuccessModal = () => {
    setSuccessModalData(null);
    handleLimpiar();
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
            <div className="designacion-card">
              <div className="designacion-card-scrollable">

                {/* =========================================================================
                    PASO 1: SELECCIÓN DE DOCENTE Y CARGO LIBRE
                   ========================================================================= */}
                {step === 'seleccion-cargo' ? (
                  <>
                    {/* Header Row: Title & Search Card */}
                    <div className="designacion-card-header">
                      <h1 className="designacion-title">Datos de Designación</h1>

                      {/* Search Bar matching Gestion style */}
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
                          <h3 className="designacion-section-title">Datos del Docente</h3>
                          <button
                            type="button"
                            className="designacion-btn-nuevo-docente"
                            onClick={handleIngresarDocenteNuevo}
                          >
                            <FiUserPlus size={18} />
                            <span>Ingresar docente nuevo</span>
                          </button>
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
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Período y Resolución */}
                      <div className="designacion-form-section">
                        <div className="designacion-section-header">
                          <h3 className="designacion-section-title">Período y Resolución</h3>
                        </div>

                        <div className="designacion-form-row">
                          <div className="designacion-field-group small">
                            <label htmlFor="nroResolucionInput" className="designacion-label">
                              N° Resolución
                            </label>
                            <input
                              id="nroResolucionInput"
                              type="text"
                              className="designacion-input"
                              placeholder="Ingrese valor"
                              value={formData.nroResolucion}
                              onChange={(e) => handleFieldChange('nroResolucion', e.target.value)}
                            />
                          </div>

                          <div className="designacion-field-group date">
                            <label htmlFor="fechaComienzoInput" className="designacion-label">
                              Fecha de Comienzo
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
                              Fecha Finalización
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
                            Cargos para Designación
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
                                      <strong>Horas Ocupadas:</strong> {cargo.horasOcupadas ?? '00'}
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
                                      <strong>Plan:</strong> {cargo.plan || 'Sin asignar'}
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
                ) : (
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
                            <strong>Horas Ocupadas:</strong> {selectedCargo?.horasOcupadas ?? '00'}
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
                            <strong>Plan:</strong> {selectedCargo?.plan || 'Sin asignar'}
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
                          className={`designacion-horas-badge ${
                            totalHorasAsignadas > maxHorasPermitidas ? 'exceeded' : 'valid'
                          }`}
                        >
                          {totalHorasAsignadas > maxHorasPermitidas
                            ? `Excede por ${totalHorasAsignadas - maxHorasPermitidas} hs`
                            : `Disponibles: ${maxHorasPermitidas - totalHorasAsignadas} hs`}
                        </span>
                      </div>
                    </div>
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

            {/* Bottom Actions Row */}
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
                      <span>{isSubmitting ? 'Asignando...' : 'Asignar actividades'}</span>
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
          </div>
        </main>
      </div>

      {/* Success Modal with Download / Print */}
      {successModalData && (
        <div className="designacion-success-modal-overlay">
          <div className="designacion-success-modal-card">
            <div className="designacion-success-modal-header">
              <div className="designacion-success-modal-icon">
                <FiCheck size={22} />
              </div>
              <h2 className="designacion-success-modal-title">Designación Completada</h2>
            </div>

            <div className="designacion-success-modal-body">
              <p>
                Se ha asignado satisfactoriamente el cargo y sus funciones para el docente{' '}
                <strong>{successModalData.docenteNombre}</strong>. Su estado ha pasado automáticamente a{' '}
                <strong>Activo</strong>.
              </p>

              <div className="designacion-success-details">
                <div className="designacion-success-details-row">
                  <strong>N° Cargo:</strong> {successModalData.cargoNumero}
                </div>
                <div className="designacion-success-details-row">
                  <strong>Resolución:</strong> {successModalData.nroResolucion}
                </div>
                <div className="designacion-success-details-row">
                  <strong>Horas Ocupadas:</strong> {successModalData.horasOcupadas} / {successModalData.horasDedicacion} hs
                </div>
                <div className="designacion-success-details-row">
                  <strong>Notificación por Correo:</strong>{' '}
                  {successModalData.notificacionEnviada ? 'Despachada al docente' : 'No requerida / pendiente'}
                </div>
              </div>

              <p style={{ fontSize: '13px', color: '#4A5568' }}>
                Puede descargar o imprimir la constancia de designación en PDF generada oficialmente.
              </p>
            </div>

            <div className="designacion-success-modal-footer">
              <button
                type="button"
                className="designacion-modal-btn-download"
                onClick={handleDescargarDocumento}
              >
                <FiDownload size={16} />
                <span>Descargar PDF</span>
              </button>
              <button
                type="button"
                className="designacion-modal-btn-print"
                onClick={handleImprimirDocumento}
              >
                <FiPrinter size={16} />
                <span>Imprimir</span>
              </button>
              <button
                type="button"
                className="designacion-modal-btn-close"
                onClick={handleCloseSuccessModal}
              >
                <span>Finalizar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
