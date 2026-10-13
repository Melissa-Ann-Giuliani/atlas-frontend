import React, { useState } from 'react';
import './NuevoUsuario.css';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import { FiChevronLeft, FiChevronDown, FiTrash2, FiCheckSquare } from 'react-icons/fi';

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

const initialFormState: FormState = {
  apellido: '',
  nombre: '',
  username: '',
  password: '',
  rol: '',
};

export default function NuevoUsuario({ onLogout, onNavigate, onBack }: NuevoUsuarioProps) {
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

  const handleClear = () => {
    setFormData(initialFormState);
    setFeedback({
      type: 'success',
      message: 'Los campos del formulario han sido limpiados.',
    });
    setTimeout(() => {
      setFeedback(null);
    }, 3000);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Validation
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
            {/* Retroceder navigation button */}
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

            {/* Outer cream container card */}
            <div className="nuevo-usuario-container-card">
              <div className="nuevo-usuario-header">
                <h1 className="nuevo-usuario-title">Gestión</h1>
              </div>

              {/* Inner card with green header bar and border */}
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
                      {/* Column 1, Row 1: Apellido/s */}
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

                      {/* Column 2, Row 1: Nombre/s */}
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

                      {/* Column 1, Row 2: Nombre de Usuario */}
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

                      {/* Column 2, Row 2: Contraseña */}
                      <div className="nuevo-usuario-field">
                        <label htmlFor="password" className="nuevo-usuario-label">
                          Contraseña
                        </label>
                        <input
                          id="password"
                          type="password"
                          className="nuevo-usuario-input"
                          placeholder="••••••••"
                          value={formData.password}
                          onChange={(e) => handleChange('password', e.target.value)}
                        />
                      </div>

                      {/* Column 1, Row 3: Rol */}
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
                          >
                            <option value="">Seleccione</option>
                            <option value="Admin Global">Admin Global</option>
                            <option value="Admin de Unidad">Admin de Unidad</option>
                            <option value="Auditor">Auditor</option>
                            <option value="Docente">Docente</option>
                          </select>
                          <FiChevronDown className="nuevo-usuario-select-caret" />
                        </div>
                      </div>
                    </div>

                    {/* Horizontal divider below Rol */}
                    <hr className="nuevo-usuario-divider" />
                  </form>
                </div>
              </div>
            </div>

            {/* Bottom Actions Row */}
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
