import React, { useState, useEffect } from 'react';
import './AltaMateria.css';
import Sidebar from '../../../components/Sidebar';
import Topbar from '../../../components/Topbar';
import { FiChevronLeft, FiChevronDown, FiTrash2, FiCheckSquare } from 'react-icons/fi';

interface AltaMateriaProps {
  onLogout?: () => void;
  onNavigate?: (page: any, data?: any) => void;
  onBack?: () => void;
}

interface FormState {
  nombre: string;
  cantHoras: string;
  dependencia: string;
  anoEducativo: string;
  despliegue: string;
  nroPlan: string;
}

interface OptionItem {
  id: string | number;
  label: string;
}

const initialFormState: FormState = {
  nombre: '',
  cantHoras: '',
  dependencia: '',
  anoEducativo: '',
  despliegue: '',
  nroPlan: '',
};

export default function AltaMateria({ onLogout, onNavigate, onBack }: AltaMateriaProps) {
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Dynamic catalog options fetched from backend
  const [dependencias, setDependencias] = useState<OptionItem[]>([]);
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState<boolean>(true);

  // Load catalogs on mount
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

        // Tipos de unidad (Dependencia)
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
      } catch (error) {
        console.error('Error fetching catalogs for Alta Materia:', error);
      } finally {
        setIsLoadingCatalogs(false);
      }
    };

    fetchCatalogs();
  }, [onLogout]);

  const handleChange = (field: keyof FormState, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (feedback) setFeedback(null);
  };

  const handleClear = () => {
    setFormData(initialFormState);
    setFeedback(null);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!formData.nombre.trim()) {
      setFeedback({ type: 'error', message: 'El campo Nombre es obligatorio.' });
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

      const payload = {
        nombre: formData.nombre.trim(),
        cantidadHoras: formData.cantHoras ? Number(formData.cantHoras) : null,
        dependenciaId: formData.dependencia ? Number(formData.dependencia) || formData.dependencia : null,
        anoEducativo: formData.anoEducativo.trim(),
        despliegue: formData.despliegue.trim(),
        nroPlan: formData.nroPlan.trim(),
      };

      const response = await fetch(`${apiUrl}/api/materias`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        if (onLogout) onLogout();
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Error al crear la materia');
      }

      setFeedback({ type: 'success', message: 'Materia registrada exitosamente.' });
      setFormData(initialFormState);
    } catch (error: any) {
      console.error('Error submitting Alta de Materia:', error);
      setFeedback({
        type: 'error',
        message: error?.message || 'Ocurrió un error al registrar la materia.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="alta-materia-page">
      <Topbar onLogout={onLogout} />

      <div className="alta-materia-body">
        <Sidebar
          activeItem="gestion"
          onNavigate={onNavigate}
        />

        <main className="alta-materia-main">
          <div className="alta-materia-content-area">
            {/* Top Navigation: Retroceder */}
            <div className="alta-materia-top-nav">
              <button
                type="button"
                className="alta-materia-back-btn"
                onClick={onBack || (() => onNavigate && onNavigate('gestion'))}
              >
                <FiChevronLeft className="alta-materia-back-icon" />
                <span>Retroceder</span>
              </button>
            </div>

            {/* Big Container Card */}
            <div className="alta-materia-container-card">
              <div className="alta-materia-header">
                <h1 className="alta-materia-title">Gestión</h1>
              </div>

              {/* Form Card */}
              <div className="alta-materia-form-card">
                <div className="alta-materia-card-header">
                  <h2>Alta de Materia</h2>
                </div>

                <div className="alta-materia-card-body">
                  {feedback && (
                    <div className={`alta-materia-feedback feedback-${feedback.type}`}>
                      {feedback.message}
                    </div>
                  )}

                  <form className="alta-materia-form" onSubmit={handleSubmit}>
                    {/* SECTION: DATOS DE MATERIA */}
                    <h3 className="alta-materia-section-title">Datos de Materia</h3>

                    {/* Row 1: Nombre, Cantidad de Horas */}
                    <div className="alta-materia-grid-top">
                      <div className="alta-materia-field">
                        <label htmlFor="nombre" className="alta-materia-label">
                          Nombre
                        </label>
                        <input
                          id="nombre"
                          name="nombre"
                          type="text"
                          className="alta-materia-input"
                          placeholder="Ingrese valor"
                          value={formData.nombre}
                          onChange={(e) => handleChange('nombre', e.target.value)}
                          autoComplete="off"
                        />
                      </div>

                      <div className="alta-materia-field">
                        <label htmlFor="cantHoras" className="alta-materia-label">
                          Cantidad de Horas
                        </label>
                        <input
                          id="cantHoras"
                          name="cantHoras"
                          type="number"
                          min="0"
                          className="alta-materia-input"
                          placeholder="Ingrese valor"
                          value={formData.cantHoras}
                          onChange={(e) => handleChange('cantHoras', e.target.value)}
                          autoComplete="off"
                        />
                      </div>
                    </div>

                    {/* Row 2: Dependencia, Año Educativo, Despliegue, N° de Plan */}
                    <div className="alta-materia-grid-bottom">
                      <div className="alta-materia-field">
                        <label htmlFor="dependencia" className="alta-materia-label">
                          Dependencia
                        </label>
                        <div className="alta-materia-select-wrapper">
                          <select
                            id="dependencia"
                            className="alta-materia-select"
                            value={formData.dependencia}
                            onChange={(e) => handleChange('dependencia', e.target.value)}
                            disabled={isLoadingCatalogs && dependencias.length === 0}
                          >
                            <option value="">
                              {isLoadingCatalogs && dependencias.length === 0 ? 'Cargando dependencias...' : 'Seleccione'}
                            </option>
                            {dependencias.map((dep) => (
                              <option key={dep.id} value={dep.id}>
                                {dep.label}
                              </option>
                            ))}
                          </select>
                          <FiChevronDown className="alta-materia-select-caret" />
                        </div>
                      </div>

                      <div className="alta-materia-field">
                        <label htmlFor="anoEducativo" className="alta-materia-label">
                          Año Educativo
                        </label>
                        <input
                          id="anoEducativo"
                          name="anoEducativo"
                          type="text"
                          className="alta-materia-input"
                          placeholder="Nombre Provisorio"
                          value={formData.anoEducativo}
                          onChange={(e) => handleChange('anoEducativo', e.target.value)}
                          autoComplete="off"
                        />
                      </div>

                      <div className="alta-materia-field">
                        <label htmlFor="despliegue" className="alta-materia-label">
                          Despliegue
                        </label>
                        <input
                          id="despliegue"
                          name="despliegue"
                          type="text"
                          className="alta-materia-input"
                          placeholder="Ingrese valor"
                          value={formData.despliegue}
                          onChange={(e) => handleChange('despliegue', e.target.value)}
                          autoComplete="off"
                        />
                      </div>

                      <div className="alta-materia-field">
                        <label htmlFor="nroPlan" className="alta-materia-label">
                          N° de Plan
                        </label>
                        <input
                          id="nroPlan"
                          name="nroPlan"
                          type="text"
                          className="alta-materia-input"
                          placeholder="Ingrese valor"
                          value={formData.nroPlan}
                          onChange={(e) => handleChange('nroPlan', e.target.value)}
                          autoComplete="off"
                        />
                      </div>
                    </div>

                    <hr className="alta-materia-divider" />
                  </form>
                </div>
              </div>
            </div>

            {/* Bottom Actions Toolbar: Borrar & Confirmar */}
            <div className="alta-materia-actions">
              <button
                type="button"
                className="btn-alta-materia btn-alta-materia-borrar"
                onClick={handleClear}
              >
                <FiTrash2 className="btn-icon" />
                <span>Borrar</span>
              </button>

              <button
                type="button"
                className="btn-alta-materia btn-alta-materia-confirmar"
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
