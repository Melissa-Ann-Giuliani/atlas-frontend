import React, { useState, useEffect } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { es } from 'date-fns/locale/es';
import 'react-datepicker/dist/react-datepicker.css';
import './NuevoUsuario.css';
import Sidebar from '../../../components/Sidebar';
import Topbar from '../../../components/Topbar';
import { FiChevronLeft, FiChevronDown, FiTrash2, FiCheckSquare, FiRefreshCw, FiEye, FiEyeOff, FiCalendar } from 'react-icons/fi';

registerLocale('es', es);

interface NuevoUsuarioProps {
  onLogout?: () => void;
  onNavigate?: (page: any, data?: any) => void;
  onBack?: () => void;
}

interface FormState {
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

interface RoleOption {
  id: string | number;
  nombre?: string;
  label: string;
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

const defaultRoles: RoleOption[] = [
  { id: 'ADMIN_GLOBAL', nombre: 'ADMIN_GLOBAL', label: 'Admin Global' },
  { id: 'ADMIN_UNIDAD', nombre: 'ADMIN_UNIDAD', label: 'Admin de Unidad' },
  { id: 'AUDITOR', nombre: 'AUDITOR', label: 'Auditor' },
  { id: 'DOCENTE', nombre: 'DOCENTE', label: 'Docente' },
];

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
  apellido: '',
  nombre: '',
  correo: '',
  username: '',
  password: '',
  rol: '',
  cargo: '',
  dependencia: '',
  unidad: '',
  tipoDni: '',
  numeroDni: '',
  cuil: '',
  domicilio: '',
  emailInstitucional: '',
  fechaIngreso: '',
  antigPrevia: '',
};

const generateSecureRandomPassword = (): string => {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*';
  let result = '';
  const cryptoObj = window.crypto || (window as any).msCrypto;
  if (cryptoObj && cryptoObj.getRandomValues) {
    const values = new Uint32Array(10);
    cryptoObj.getRandomValues(values);
    for (let i = 0; i < 10; i++) {
      result += chars[values[i] % chars.length];
    }
  } else {
    for (let i = 0; i < 10; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return result;
};

export default function NuevoUsuario({ onLogout, onNavigate, onBack }: NuevoUsuarioProps) {
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [roles, setRoles] = useState<RoleOption[]>(defaultRoles);
  const [isLoadingRoles, setIsLoadingRoles] = useState<boolean>(true);
  const [isLoadingPassword, setIsLoadingPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

  const fetchRandomPassword = async () => {
    setIsLoadingPassword(true);
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

      let res = await fetch(`${apiUrl}/api/usuarios/generar-password`, { headers });

      if (res.ok) {
        const data = await res.json().catch(async () => {
          return await res.text();
        });
        const passwordValue = typeof data === 'string' ? data : (data.password || data.contrasena || data.generatedPassword || '');
        if (passwordValue) {
          setFormData((prev) => ({ ...prev, password: passwordValue }));
          return;
        }
      }
    } catch (err) {
      console.warn('No se pudo obtener la contraseña del backend, generando temporalmente en cliente.', err);
    } finally {
      setIsLoadingPassword(false);
    }

    setFormData((prev) => ({ ...prev, password: generateSecureRandomPassword() }));
    setIsLoadingPassword(false);
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      fetchRandomPassword();

      try {
        const token = localStorage.getItem('token');
        const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

        let response = await fetch(`${apiUrl}/api/roles`, { headers });
        if (!response.ok && response.status === 404) {
          response = await fetch(`${apiUrl}/api/usuarios/roles`, { headers });
        }

        if (response.status === 401 && onLogout) {
          onLogout();
          return;
        }

        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            const mappedRoles: RoleOption[] = data.map((item: any) => {
              if (typeof item === 'string') {
                return { id: item, nombre: item, label: item };
              }
              const roleName = item.nombre ?? item.rolNombre ?? item.rol_nombre ?? item.name ?? '';
              const idVal = item.id ?? item.rolId ?? item.rol_id ?? item.codigo ?? roleName;
              const labelVal = item.descripcion ?? item.rolDescripcion ?? item.rol_descripcion ?? item.rolNombre ?? item.rol_nombre ?? roleName ?? String(idVal);
              return {
                id: idVal,
                nombre: roleName || labelVal,
                label: labelVal,
              };
            });
            setRoles(mappedRoles);
          }
        }
      } catch (err) {
        console.warn('No se pudieron obtener los roles del backend, usando roles predeterminados.', err);
      } finally {
        setIsLoadingRoles(false);
      }
    };

    fetchInitialData();
  }, [onLogout]);

  const [cargosAdminGlobal, setCargosAdminGlobal] = useState<CargoOption[]>([]);
  const [isLoadingCargos, setIsLoadingCargos] = useState<boolean>(false);

  const [cargosAdminUnidad, setCargosAdminUnidad] = useState<CargoOption[]>([]);
  const [isLoadingCargosUnidad, setIsLoadingCargosUnidad] = useState<boolean>(false);

  const [cargosAuditor, setCargosAuditor] = useState<CargoOption[]>([]);
  const [isLoadingCargosAuditor, setIsLoadingCargosAuditor] = useState<boolean>(false);

  const [dependencias, setDependencias] = useState<DependenciaOption[]>([]);
  const [isLoadingDependencias, setIsLoadingDependencias] = useState<boolean>(false);

  const [unidades, setUnidades] = useState<UnidadOption[]>([]);
  const [isLoadingUnidades, setIsLoadingUnidades] = useState<boolean>(false);

  const [tiposDni, setTiposDni] = useState<TipoDniOption[]>(defaultTiposDni);
  const [isLoadingTiposDni, setIsLoadingTiposDni] = useState<boolean>(false);

  const fetchTiposDni = async () => {
    setIsLoadingTiposDni(true);
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
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
    } catch (err) {
      console.warn('No se pudieron obtener los tipos de DNI del backend, usando predeterminados.', err);
      setTiposDni(defaultTiposDni);
    } finally {
      setIsLoadingTiposDni(false);
    }
  };

  const fetchCargosAdminGlobal = async () => {
    setIsLoadingCargos(true);
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

      const response = await fetch(`${apiUrl}/api/usuarios/admin-global/cargos`, { headers });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          const mapped: CargoOption[] = data.map((item: any) => {
            const idVal = typeof item === 'string' ? item : (item.id ?? item.nombre ?? String(item));
            const rawLabel = typeof item === 'string' ? item : (item.nombre ?? item.descripcion ?? idVal);
            const formattedLabel = rawLabel
              .split('_')
              .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
              .join(' ');
            return { id: idVal, label: formattedLabel };
          });
          setCargosAdminGlobal(mapped);
        }
      }
    } catch (err) {
      console.warn('No se pudieron obtener los cargos de Admin Global del backend.', err);
    } finally {
      setIsLoadingCargos(false);
    }
  };

  const fetchCargosAuditor = async () => {
    setIsLoadingCargosAuditor(true);
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

      let response = await fetch(`${apiUrl}/api/usuarios/auditor/cargos`, { headers });
      if (!response.ok && response.status === 404) {
        response = await fetch(`${apiUrl}/api/usuarios/auditores/cargos`, { headers });
      }

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          const mapped: CargoOption[] = data.map((item: any) => {
            const idVal = typeof item === 'string' ? item : (item.value ?? item.id ?? item.nombre ?? String(item));
            const rawLabel = typeof item === 'string' ? item : (item.label ?? item.nombre ?? item.descripcion ?? idVal);
            const formattedLabel = rawLabel.includes('_')
              ? rawLabel
                .split('_')
                .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ')
              : rawLabel;
            return { id: idVal, label: formattedLabel };
          });
          setCargosAuditor(mapped);
          return;
        }
      }
      setCargosAuditor(defaultCargosAuditor);
    } catch (err) {
      console.warn('No se pudieron obtener los cargos de Auditor del backend, usando predeterminados.', err);
      setCargosAuditor(defaultCargosAuditor);
    } finally {
      setIsLoadingCargosAuditor(false);
    }
  };

  const fetchCargosAdminUnidad = async () => {
    setIsLoadingCargosUnidad(true);
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

      const response = await fetch(`${apiUrl}/api/usuarios/admin-unidad/cargos`, { headers });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          const mapped: CargoOption[] = data.map((item: any) => {
            const idVal = typeof item === 'string' ? item : (item.value ?? item.id ?? item.nombre ?? String(item));
            const rawLabel = typeof item === 'string' ? item : (item.label ?? item.nombre ?? item.descripcion ?? idVal);
            const formattedLabel = rawLabel.includes('_')
              ? rawLabel
                .split('_')
                .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ')
              : rawLabel;
            return { id: idVal, label: formattedLabel };
          });
          setCargosAdminUnidad(mapped);
        }
      }
    } catch (err) {
      console.warn('No se pudieron obtener los cargos de Admin de Unidad del backend.', err);
    } finally {
      setIsLoadingCargosUnidad(false);
    }
  };

  const fetchDependencias = async () => {
    setIsLoadingDependencias(true);
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

      const response = await fetch(`${apiUrl}/api/tipos-unidad`, { headers });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          const mapped: DependenciaOption[] = data.map((item: any) => {
            return {
              id: item.tipoUnidadId ?? item.id ?? item.nombre,
              label: item.tipoUnidadNombre ?? item.nombre ?? item.descripcion ?? String(item.id || item),
            };
          });
          setDependencias(mapped);
        }
      }
    } catch (err) {
      console.warn('No se pudieron obtener las dependencias (tipos de unidad) del backend.', err);
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
      const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
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
    } catch (err) {
      console.warn('No se pudieron obtener las unidades del backend.', err);
    } finally {
      setIsLoadingUnidades(false);
    }
  };

  const selectedRole = roles.find(
    (r) =>
      String(r.id) === String(formData.rol) ||
      String(r.nombre || '').toLowerCase() === String(formData.rol || '').toLowerCase() ||
      String(r.label || '').toLowerCase() === String(formData.rol || '').toLowerCase()
  );

  const isAdminGlobal = Boolean(
    (selectedRole && (
      selectedRole.nombre === 'Administrador Global' ||
      selectedRole.nombre === 'ADMIN_GLOBAL' ||
      String(selectedRole.id || '').toUpperCase() === 'ADMIN_GLOBAL' ||
      (selectedRole.label.toLowerCase().includes('admin') && selectedRole.label.toLowerCase().includes('global'))
    )) ||
    String(formData.rol).toUpperCase() === 'ADMIN_GLOBAL' ||
    (String(formData.rol).toLowerCase().includes('admin') && String(formData.rol).toLowerCase().includes('global'))
  );

  const isAdminUnidad = Boolean(
    (selectedRole && (
      selectedRole.nombre === 'Administrador de Unidad' ||
      selectedRole.nombre === 'ADMIN_UNIDAD' ||
      String(selectedRole.id || '').toUpperCase() === 'ADMIN_UNIDAD' ||
      (selectedRole.label.toLowerCase().includes('admin') && selectedRole.label.toLowerCase().includes('unidad'))
    )) ||
    String(formData.rol).toUpperCase() === 'ADMIN_UNIDAD' ||
    (String(formData.rol).toLowerCase().includes('admin') && String(formData.rol).toLowerCase().includes('unidad'))
  );

  const isAuditor = Boolean(
    (selectedRole && (
      selectedRole.nombre === 'Auditor' ||
      selectedRole.nombre === 'AUDITOR' ||
      String(selectedRole.nombre || '').toLowerCase().includes('auditor') ||
      String(selectedRole.label || '').toLowerCase().includes('auditor') ||
      String(selectedRole.id || '').toLowerCase().includes('auditor')
    )) ||
    String(formData.rol).toLowerCase().includes('auditor')
  );

  const isDocente = Boolean(
    (selectedRole && (
      selectedRole.nombre === 'Docente' ||
      selectedRole.nombre === 'DOCENTE' ||
      String(selectedRole.nombre || '').toLowerCase().includes('docente') ||
      String(selectedRole.label || '').toLowerCase().includes('docente') ||
      String(selectedRole.id || '').toLowerCase().includes('docente')
    )) ||
    String(formData.rol).toLowerCase().includes('docente')
  );

  const selectedDependencia = dependencias.find(
    (d) => String(d.id) === String(formData.dependencia) || d.label === formData.dependencia
  );

  const dynamicUnidadLabel = selectedDependencia?.label || 'Unidad';

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
    } else {
      setFormData((prev) => (prev.cargo || prev.dependencia || prev.unidad ? { ...prev, cargo: '', dependencia: '', unidad: '' } : prev));
      setUnidades([]);
    }
  }, [isAdminGlobal, isAdminUnidad, isAuditor, isDocente]);

  useEffect(() => {
    if (isAdminUnidad && formData.dependencia) {
      fetchUnidadesPorTipo(formData.dependencia);
    } else {
      setUnidades([]);
    }
  }, [isAdminUnidad, formData.dependencia]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (onNavigate) {
      onNavigate('gestion');
    } else {
      window.history.back();
    }
  };

  const handleChange = (field: keyof FormState, value: string) => {
    setFormData((prev) => {
      if (field === 'rol') {
        // Al cambiar de rol, reseteamos cargo, dependencia y unidad para evitar estados inconsistentes
        return { ...prev, rol: value, cargo: '', dependencia: '', unidad: '' };
      }
      if (field === 'dependencia') {
        // Al cambiar de dependencia, reseteamos la unidad elegida
        return { ...prev, dependencia: value, unidad: '' };
      }
      return { ...prev, [field]: value };
    });
    if (feedback) setFeedback(null);
  };

  const [showPassword, setShowPassword] = useState<boolean>(false);

  const handleClear = () => {
    setFormData(initialFormState);
    fetchRandomPassword();
    setFeedback({
      type: 'success',
      message: 'Los campos del formulario han sido limpiados y se generó una nueva contraseña.',
    });
    setTimeout(() => {
      setFeedback(null);
    }, 3000);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (
      !formData.apellido.trim() ||
      !formData.nombre.trim() ||
      !formData.correo.trim() ||
      !formData.username.trim() ||
      !formData.password.trim() ||
      !formData.rol
    ) {
      setFeedback({
        type: 'error',
        message: 'Por favor, complete todos los campos requeridos antes de confirmar.',
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
      if (!formData.cuil.trim()) {
        setFeedback({
          type: 'error',
          message: 'Por favor, ingrese el CUIL.',
        });
        return;
      }
      if (!formData.emailInstitucional.trim()) {
        setFeedback({
          type: 'error',
          message: 'Por favor, ingrese el correo electrónico institucional.',
        });
        return;
      }
      if (!emailRegex.test(formData.emailInstitucional.trim())) {
        setFeedback({
          type: 'error',
          message: 'Por favor, ingrese un formato de email institucional válido.',
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
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      };
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8081';

      let endpoint = `${apiUrl}/api/usuarios`;
      if (isAdminGlobal) {
        endpoint = `${apiUrl}/api/usuarios/admin-global`;
      } else if (isAdminUnidad) {
        endpoint = `${apiUrl}/api/usuarios/admin-unidad`;
      } else if (isAuditor) {
        endpoint = `${apiUrl}/api/usuarios/auditor`;
      } else if (isDocente) {
        endpoint = `${apiUrl}/api/usuarios/docente`;
      }

      const payload = {
        nombre: formData.nombre.trim(),
        apellido: formData.apellido.trim(),
        correo: formData.correo.trim(),
        username: formData.username.trim(),
        password: formData.password,
        rol: formData.rol,
        ...(isAdminGlobal
          ? {
            cargo: formData.cargo,
            cargoNombre: formData.cargo, // matches backend CargoAdminGlobal enum
          }
          : {}),
        ...(isAuditor
          ? {
            cargo: formData.cargo,
            cargoNombre: formData.cargo,
            cargoAudNombre: formData.cargo,
          }
          : {}),
        ...(isAdminUnidad
          ? {
            cargo: formData.cargo,
            cargoNombre: formData.cargo,
            cargoAdNombre: formData.cargo,
            unidadId: !isNaN(Number(formData.unidad)) ? Number(formData.unidad) : formData.unidad,
            dependencia: formData.dependencia,
            tipoUnidadId: !isNaN(Number(formData.dependencia)) ? Number(formData.dependencia) : formData.dependencia,
          }
          : {}),
        ...(isDocente
          ? {
            tipoDni: formData.tipoDni,
            dni: formData.numeroDni.trim() ? Number(formData.numeroDni.trim().replace(/\D/g, '')) || formData.numeroDni.trim() : undefined,
            cuil: formData.cuil.trim() ? Number(formData.cuil.trim().replace(/\D/g, '')) || formData.cuil.trim() : undefined,
            domicilio: formData.domicilio.trim() || undefined,
            emailInstitucional: formData.emailInstitucional.trim() || undefined,
            fechaIngreso: formData.fechaIngreso || undefined,
            antigPrevia: formData.antigPrevia.trim() ? Number(formData.antigPrevia.trim()) : 0,
          }
          : {}),
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (response.status === 201 || response.ok) {
        setFeedback({
          type: 'success',
          message: data?.message || `Usuario "${formData.username}" registrado exitosamente.`,
        });
        setFormData(initialFormState);
        fetchRandomPassword();
      } else if (response.status === 409) {
        setFeedback({
          type: 'error',
          message: data?.message || 'El nombre de usuario o usuario ya existe.',
        });
      } else if (response.status === 403) {
        setFeedback({
          type: 'error',
          message: 'No tiene permisos para registrar este tipo de usuario.',
        });
      } else {
        setFeedback({
          type: 'error',
          message: data?.message || 'Error al registrar el usuario en el servidor.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error de conexión con el servidor al registrar el usuario.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="nuevo-usuario-page">
      <Topbar onLogout={onLogout} />

      <div className="nuevo-usuario-body">
        <Sidebar activeItem="gestion" onNavigate={onNavigate} />

        <main className="nuevo-usuario-main">
          <div className="nuevo-usuario-content-area">
            <div className="nuevo-usuario-top-nav">
              <button
                type="button"
                className="nuevo-usuario-back-btn"
                onClick={handleBack}
              >
                <FiChevronLeft className="nuevo-usuario-back-icon" />
                <span>Retroceder</span>
              </button>
            </div>

            <div className="nuevo-usuario-container-card">
              <div className="nuevo-usuario-header">
                <h1 className="nuevo-usuario-title">Gestión</h1>
              </div>

              <div className="nuevo-usuario-form-card">
                <div className="nuevo-usuario-card-header">
                  <h2>Nuevo Usuario</h2>
                </div>

                <div className="nuevo-usuario-card-body">
                  <h3 className="nuevo-usuario-section-title">Datos de Usuario</h3>

                  {feedback && (
                    <div className={`nuevo-usuario-feedback feedback-${feedback.type}`}>
                      {feedback.message}
                    </div>
                  )}

                  <form className="nuevo-usuario-form" onSubmit={handleSubmit} autoComplete="off">
                    <div className="nuevo-usuario-form-grid">
                      <div className="nuevo-usuario-field">
                        <label htmlFor="apellido" className="nuevo-usuario-label">
                          Apellido/s
                        </label>
                        <input
                          id="apellido"
                          name="atlas_user_apellido"
                          type="text"
                          className="nuevo-usuario-input"
                          placeholder="Ingrese valor"
                          value={formData.apellido}
                          onChange={(e) => handleChange('apellido', e.target.value)}
                          autoComplete="off"
                        />
                      </div>

                      <div className="nuevo-usuario-field">
                        <label htmlFor="nombre" className="nuevo-usuario-label">
                          Nombre/s
                        </label>
                        <input
                          id="nombre"
                          type="text"
                          className="nuevo-usuario-input"
                          placeholder="Ingrese valor"
                          value={formData.nombre}
                          onChange={(e) => handleChange('nombre', e.target.value)}
                        />
                      </div>

                      <div className="nuevo-usuario-field">
                        <label htmlFor="correo" className="nuevo-usuario-label">
                          Correo Electrónico
                        </label>
                        <input
                          id="correo"
                          type="email"
                          className="nuevo-usuario-input"
                          placeholder="ejemplo@correo.com"
                          value={formData.correo}
                          onChange={(e) => handleChange('correo', e.target.value)}
                        />
                      </div>

                      <div className="nuevo-usuario-field">
                        <label htmlFor="username" className="nuevo-usuario-label">
                          Nombre de Usuario
                        </label>
                        <input
                          id="username"
                          type="text"
                          className="nuevo-usuario-input"
                          placeholder="Nombre Provisorio"
                          value={formData.username}
                          onChange={(e) => handleChange('username', e.target.value)}
                        />
                      </div>

                      <div className="nuevo-usuario-field">
                        <label htmlFor="password" className="nuevo-usuario-label">
                          Contraseña
                        </label>
                        <div className="nuevo-usuario-password-wrapper">
                          <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            className="nuevo-usuario-input nuevo-usuario-password-input"
                            placeholder={isLoadingPassword ? 'Generando contraseña...' : '••••••••'}
                            value={formData.password}
                            onChange={(e) => handleChange('password', e.target.value)}
                          />
                          <div className="nuevo-usuario-password-actions">
                            <button
                              type="button"
                              className="password-action-btn"
                              title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                              onClick={() => setShowPassword(!showPassword)}
                              tabIndex={-1}
                            >
                              {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                            </button>
                            <button
                              type="button"
                              className={`password-action-btn ${isLoadingPassword ? 'spinning' : ''}`}
                              title="Regenerar contraseña"
                              onClick={() => fetchRandomPassword()}
                              disabled={isLoadingPassword}
                              tabIndex={-1}
                            >
                              <FiRefreshCw size={15} />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="nuevo-usuario-field">
                        <label htmlFor="rol" className="nuevo-usuario-label">
                          Rol
                        </label>
                        <div className="nuevo-usuario-select-wrapper">
                          <select
                            id="rol"
                            className="nuevo-usuario-select"
                            value={formData.rol}
                            onChange={(e) => handleChange('rol', e.target.value)}
                            disabled={isLoadingRoles && roles.length === 0}
                          >
                            <option value="">
                              {isLoadingRoles && roles.length === 0 ? 'Cargando roles...' : 'Seleccione'}
                            </option>
                            {roles.map((role) => (
                              <option key={role.id} value={role.id}>
                                {role.label}
                              </option>
                            ))}
                          </select>
                          <FiChevronDown className="nuevo-usuario-select-caret" />
                        </div>
                      </div>
                    </div>

                    <hr className="nuevo-usuario-divider" />

                    {isAdminGlobal && (
                      <div className="nuevo-usuario-extra-section">
                        <div className="nuevo-usuario-extra-grid nuevo-usuario-single-grid">
                          <div className="nuevo-usuario-field nuevo-usuario-field-cargo">
                            <label htmlFor="cargo" className="nuevo-usuario-label">
                              Cargo
                            </label>
                            <div className="nuevo-usuario-select-wrapper">
                              <select
                                id="cargo"
                                className="nuevo-usuario-select"
                                value={formData.cargo}
                                onChange={(e) => handleChange('cargo', e.target.value)}
                                disabled={isLoadingCargos && cargosAdminGlobal.length === 0}
                              >
                                <option value="">
                                  {isLoadingCargos && cargosAdminGlobal.length === 0
                                    ? 'Cargando cargos...'
                                    : 'Seleccione'}
                                </option>
                                {cargosAdminGlobal.map((cargoOpt) => (
                                  <option key={cargoOpt.id} value={cargoOpt.id}>
                                    {cargoOpt.label}
                                  </option>
                                ))}
                              </select>
                              <FiChevronDown className="nuevo-usuario-select-caret" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {isAuditor && (
                      <div className="nuevo-usuario-extra-section">
                        <div className="nuevo-usuario-extra-grid nuevo-usuario-single-grid">
                          <div className="nuevo-usuario-field nuevo-usuario-field-cargo">
                            <label htmlFor="cargo" className="nuevo-usuario-label">
                              Cargo
                            </label>
                            <div className="nuevo-usuario-select-wrapper">
                              <select
                                id="cargo"
                                className="nuevo-usuario-select"
                                value={formData.cargo}
                                onChange={(e) => handleChange('cargo', e.target.value)}
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
                              <FiChevronDown className="nuevo-usuario-select-caret" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {isAdminUnidad && (
                      <div className="nuevo-usuario-extra-section">
                        <div className="nuevo-usuario-extra-grid nuevo-usuario-admin-unidad-grid">
                          <div className="nuevo-usuario-field nuevo-usuario-field-cargo">
                            <label htmlFor="cargo" className="nuevo-usuario-label">
                              Cargo
                            </label>
                            <div className="nuevo-usuario-select-wrapper">
                              <select
                                id="cargo"
                                className="nuevo-usuario-select"
                                value={formData.cargo}
                                onChange={(e) => handleChange('cargo', e.target.value)}
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
                              <FiChevronDown className="nuevo-usuario-select-caret" />
                            </div>
                          </div>

                          <div className="nuevo-usuario-field nuevo-usuario-field-dependencia">
                            <label htmlFor="dependencia" className="nuevo-usuario-label">
                              Dependencia
                            </label>
                            <div className="nuevo-usuario-select-wrapper">
                              <select
                                id="dependencia"
                                className="nuevo-usuario-select"
                                value={formData.dependencia}
                                onChange={(e) => handleChange('dependencia', e.target.value)}
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
                              <FiChevronDown className="nuevo-usuario-select-caret" />
                            </div>
                          </div>

                          {formData.dependencia && (
                            <div className="nuevo-usuario-field nuevo-usuario-field-unidad">
                              <label htmlFor="unidad" className="nuevo-usuario-label">
                                {dynamicUnidadLabel}
                              </label>
                              <div className="nuevo-usuario-select-wrapper">
                                <select
                                  id="unidad"
                                  className="nuevo-usuario-select"
                                  value={formData.unidad}
                                  onChange={(e) => handleChange('unidad', e.target.value)}
                                  disabled={isLoadingUnidades}
                                >
                                  <option value="">
                                    {isLoadingUnidades ? `Cargando ${dynamicUnidadLabel.toLowerCase()}s...` : 'Seleccione'}
                                  </option>
                                  {unidades.map((uniOpt) => (
                                    <option key={uniOpt.id} value={uniOpt.id}>
                                      {uniOpt.label}
                                    </option>
                                  ))}
                                </select>
                                <FiChevronDown className="nuevo-usuario-select-caret" />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {isDocente && (
                      <div className="nuevo-usuario-extra-section">
                        <div className="nuevo-usuario-docente-grid">
                          {/* Fila 1 */}
                          <div className="nuevo-usuario-field">
                            <label htmlFor="tipoDni" className="nuevo-usuario-label">
                              Tipo DNI
                            </label>
                            <div className="nuevo-usuario-select-wrapper">
                              <select
                                id="tipoDni"
                                className="nuevo-usuario-select"
                                value={formData.tipoDni}
                                onChange={(e) => handleChange('tipoDni', e.target.value)}
                                disabled={isLoadingTiposDni && tiposDni.length === 0}
                              >
                                <option value="">
                                  {isLoadingTiposDni && tiposDni.length === 0 ? 'Cargando tipos...' : 'Seleccione'}
                                </option>
                                {tiposDni.map((tipo) => (
                                  <option key={tipo.value} value={tipo.value}>
                                    {tipo.label}
                                  </option>
                                ))}
                              </select>
                              <FiChevronDown className="nuevo-usuario-select-caret" />
                            </div>
                          </div>

                          <div className="nuevo-usuario-field">
                            <label htmlFor="numeroDni" className="nuevo-usuario-label">
                              Número
                            </label>
                            <input
                              id="numeroDni"
                              name="docente_numero_documento"
                              type="text"
                              className="nuevo-usuario-input"
                              placeholder="Ingrese valor"
                              value={formData.numeroDni}
                              onChange={(e) => handleChange('numeroDni', e.target.value)}
                              autoComplete="off"
                            />
                          </div>

                          <div className="nuevo-usuario-field">
                            <label htmlFor="cuil" className="nuevo-usuario-label">
                              CUIL
                            </label>
                            <input
                              id="cuil"
                              name="docente_cuil"
                              type="text"
                              className="nuevo-usuario-input"
                              placeholder="Ingrese valor"
                              value={formData.cuil}
                              onChange={(e) => handleChange('cuil', e.target.value)}
                              autoComplete="off"
                            />
                          </div>

                          <div className="nuevo-usuario-field">
                            <label htmlFor="domicilio" className="nuevo-usuario-label">
                              Domicilio
                            </label>
                            <input
                              id="domicilio"
                              name="docente_domicilio"
                              type="text"
                              className="nuevo-usuario-input"
                              placeholder="Ingrese valor"
                              value={formData.domicilio}
                              onChange={(e) => handleChange('domicilio', e.target.value)}
                              autoComplete="off"
                            />
                          </div>

                          {/* Fila 2 */}
                          <div className="nuevo-usuario-field">
                            <label htmlFor="emailInstitucional" className="nuevo-usuario-label">
                              Email Institucional
                            </label>
                            <input
                              id="emailInstitucional"
                              name="docente_email_institucional"
                              type="email"
                              className="nuevo-usuario-input"
                              placeholder="Ingrese valor"
                              value={formData.emailInstitucional}
                              onChange={(e) => handleChange('emailInstitucional', e.target.value)}
                              autoComplete="off"
                              required
                            />
                          </div>

                          <div className="nuevo-usuario-field">
                            <label htmlFor="fechaIngreso" className="nuevo-usuario-label">
                              Fecha de Ingreso a la Universidad
                            </label>
                            <div className="nuevo-usuario-datepicker-container">
                              <DatePicker
                                id="fechaIngreso"
                                name="docente_fecha_ingreso"
                                selected={parseIsoToDate(formData.fechaIngreso)}
                                onChange={(date: Date | null) => handleChange('fechaIngreso', formatDateToIso(date))}
                                dateFormat="dd/MM/yyyy"
                                placeholderText="DD/MM/AAAA"
                                locale="es"
                                className="nuevo-usuario-input nuevo-usuario-datepicker-input"
                                autoComplete="off"
                                showYearDropdown
                                showMonthDropdown
                                dropdownMode="select"
                              />
                              <FiCalendar className="nuevo-usuario-datepicker-icon" />
                            </div>
                          </div>

                          <div className="nuevo-usuario-field">
                            <label htmlFor="antigPrevia" className="nuevo-usuario-label">
                              Antigüedad Previa
                            </label>
                            <input
                              id="antigPrevia"
                              name="docente_antiguedad_previa"
                              type="number"
                              min="0"
                              className="nuevo-usuario-input"
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

            <div className="nuevo-usuario-actions">
              <button
                type="button"
                className="btn-nuevo-usuario btn-borrar"
                onClick={handleClear}
              >
                <FiTrash2 className="btn-icon" />
                <span>Borrar</span>
              </button>

              <button
                type="button"
                className="btn-nuevo-usuario btn-confirmar"
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
