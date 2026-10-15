import React, { useState, useEffect } from 'react';
import './NuevoUsuario.css';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import { FiChevronLeft, FiChevronDown, FiTrash2, FiCheckSquare, FiRefreshCw, FiEye, FiEyeOff } from 'react-icons/fi';

interface NuevoUsuarioProps {
  onLogout?: () => void;
  onNavigate?: (page: any, data?: any) => void;
  onBack?: () => void;
}

interface FormState {
  apellido: string;
  nombre: string;
  username: string;
  password: string;
  rol: string;
}

interface RoleOption {
  id: string | number;
  label: string;
}

const defaultRoles: RoleOption[] = [
  { id: 'ADMIN_GLOBAL', label: 'Admin Global' },
  { id: 'ADMIN_UNIDAD', label: 'Admin de Unidad' },
  { id: 'AUDITOR', label: 'Auditor' },
  { id: 'DOCENTE', label: 'Docente' },
];

const initialFormState: FormState = {
  apellido: '',
  nombre: '',
  username: '',
  password: '',
  rol: '',
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
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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
                return { id: item, label: item };
              }
              return {
                id: item.rolId ?? item.id ?? item.codigo ?? item.nombre,
                label: item.rolNombre ?? item.nombre ?? item.descripcion ?? item.name ?? String(item.id || item),
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
    setFormData((prev) => ({ ...prev, [field]: value }));
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

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!formData.apellido.trim() || !formData.nombre.trim() || !formData.username.trim() || !formData.password.trim() || !formData.rol) {
      setFeedback({
        type: 'error',
        message: 'Por favor, complete todos los campos requeridos antes de confirmar.',
      });
      return;
    }

    setFeedback({
      type: 'success',
      message: `Usuario "${formData.username}" registrado exitosamente con rol ${formData.rol}.`,
    });
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

                  <form className="nuevo-usuario-form" onSubmit={handleSubmit}>
                    <div className="nuevo-usuario-form-grid">
                      <div className="nuevo-usuario-field">
                        <label htmlFor="apellido" className="nuevo-usuario-label">
                          Apellido/s
                        </label>
                        <input
                          id="apellido"
                          type="text"
                          className="nuevo-usuario-input"
                          placeholder="Ingrese valor"
                          value={formData.apellido}
                          onChange={(e) => handleChange('apellido', e.target.value)}
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
              >
                <FiCheckSquare className="btn-icon" />
                <span>Confirmar</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
