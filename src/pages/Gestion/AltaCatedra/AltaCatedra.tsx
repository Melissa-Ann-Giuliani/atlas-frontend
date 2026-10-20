import React, { useState, useEffect } from 'react';
import './AltaCatedra.css';
import Sidebar from '../../../components/Sidebar';
import Topbar from '../../../components/Topbar';
import { FiChevronLeft, FiChevronDown, FiTrash2, FiCheckSquare } from 'react-icons/fi';

interface AltaCatedraProps {
  onLogout?: () => void;
  onNavigate?: (page: any, data?: any) => void;
  onBack?: () => void;
}

interface FormState {
  nombreMateria: string;
  tipologia: string;
  dependencia: string;
  nombreDirectorCatedra: string;
}

interface OptionItem {
  id: string | number;
  label: string;
}

const initialFormState: FormState = {
  nombreMateria: '',
  tipologia: '',
  dependencia: '',
  nombreDirectorCatedra: '',
};

export default function AltaCatedra({ onLogout, onNavigate, onBack }: AltaCatedraProps) {
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
      } catch (err) {
        console.error('Error fetching catalogs for Alta de Cátedra:', err);
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

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (onNavigate) {
      onNavigate('gestion');
    }
  };

  const handleSubmit = async () => {
    setFeedback(null);

    // Validation
    if (!formData.nombreMateria.trim()) {
      setFeedback({ type: 'error', message: 'Por favor complete el Nombre de Materia.' });
      return;
    }
    if (!formData.tipologia.trim()) {
      setFeedback({ type: 'error', message: 'Por favor complete la Tipología.' });
      return;
    }
    if (!formData.dependencia) {
      setFeedback({ type: 'error', message: 'Por favor seleccione una Dependencia.' });
      return;
    }
    if (!formData.nombreDirectorCatedra.trim()) {
      setFeedback({ type: 'error', message: 'Por favor complete el Nombre de Director de Cátedra.' });
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

      const payload = {
        nombreMateria: formData.nombreMateria.trim(),
        tipologia: formData.tipologia.trim(),
        dependenciaId: formData.dependencia,
        nombreDirectorCatedra: formData.nombreDirectorCatedra.trim(),
      };

      const response = await fetch(`${apiUrl}/api/catedras`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        if (onLogout) onLogout();
        return;
      }

      if (!response.ok) {
        let errorMsg = 'Error al dar de alta la cátedra.';
        try {
          const errorData = await response.json();
          if (errorData && (errorData.message || errorData.error)) {
            errorMsg = errorData.message || errorData.error;
          }
        } catch {
          // ignore parsing error
        }
        setFeedback({ type: 'error', message: errorMsg });
        return;
      }

      setFeedback({ type: 'success', message: '¡Cátedra creada con éxito!' });
      // Optionally clear or keep state
    } catch (err: any) {
      console.error('Error submitting alta catedra:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Error de conexión con el servidor al registrar la cátedra.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="alta-catedra-page">
      <Topbar onLogout={onLogout} />

      <div className="alta-catedra-body">
        <Sidebar activeItem="gestion" onNavigate={onNavigate} />

        <main className="alta-catedra-main">
          <div className="alta-catedra-content-area">
            {/* Top Back Navigation */}
            <div className="alta-catedra-top-nav">
              <button
                type="button"
                className="alta-catedra-back-btn"
                onClick={handleBack}
              >
                <FiChevronLeft className="alta-catedra-back-icon" />
                <span>Retroceder</span>
              </button>
            </div>

            {/* Container Card */}
            <div className="alta-catedra-container-card">
              <div className="alta-catedra-header">
                <h1 className="alta-catedra-title">Gestión</h1>
              </div>

              {/* Form Card */}
              <div className="alta-catedra-form-card">
                <div className="alta-catedra-card-header">
                  <h2>Alta de Cátedra</h2>
                </div>

                <div className="alta-catedra-card-body">
                  {feedback && (
                    <div className={`alta-catedra-feedback feedback-${feedback.type}`}>
                      {feedback.message}
                    </div>
                  )}

                  <div className="alta-catedra-form">
                    {/* SECTION: DATOS DE CÁTEDRA */}
                    <h3 className="alta-catedra-section-title">Datos de Cátedra</h3>

                    {/* Row 1: Nombre de Materia, Tipología, Dependencia */}
                    <div className="alta-catedra-grid-row-1">
                      <div className="alta-catedra-field">
                        <label htmlFor="nombreMateria" className="alta-catedra-label">
                          Nombre de Materia
                        </label>
                        <input
                          id="nombreMateria"
                          name="nombreMateria"
                          type="text"
                          className="alta-catedra-input"
                          placeholder="Ingrese valor"
                          value={formData.nombreMateria}
                          onChange={(e) => handleChange('nombreMateria', e.target.value)}
                          autoComplete="off"
                          autoCorrect="off"
                          spellCheck={false}
                          data-lpignore="true"
                          data-form-type="other"
                        />
                      </div>

                      <div className="alta-catedra-field">
                        <label htmlFor="tipologia" className="alta-catedra-label">
                          Tipología
                        </label>
                        <input
                          id="tipologia"
                          name="tipologia"
                          type="text"
                          className="alta-catedra-input"
                          placeholder="Ingrese valor"
                          value={formData.tipologia}
                          onChange={(e) => handleChange('tipologia', e.target.value)}
                          autoComplete="off"
                          autoCorrect="off"
                          spellCheck={false}
                          data-lpignore="true"
                          data-form-type="other"
                        />
                      </div>

                      <div className="alta-catedra-field">
                        <label htmlFor="dependencia" className="alta-catedra-label">
                          Dependencia
                        </label>
                        <div className="alta-catedra-select-wrapper">
                          <select
                            id="dependencia"
                            className="alta-catedra-select"
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
                          <FiChevronDown className="alta-catedra-select-caret" />
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Nombre de Director de Cátedra */}
                    <div className="alta-catedra-grid-row-2">
                      <div className="alta-catedra-field">
                        <label htmlFor="nombreDirectorCatedra" className="alta-catedra-label">
                          Nombre de Director de Cátedra
                        </label>
                        <input
                          id="nombreDirectorCatedra"
                          name="nombreDirectorCatedra"
                          type="text"
                          className="alta-catedra-input"
                          placeholder="Ingrese valor"
                          value={formData.nombreDirectorCatedra}
                          onChange={(e) => handleChange('nombreDirectorCatedra', e.target.value)}
                          autoComplete="off"
                          autoCorrect="off"
                          spellCheck={false}
                          data-lpignore="true"
                          data-form-type="other"
                        />
                      </div>
                    </div>

                    <hr className="alta-catedra-divider" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions Toolbar: Borrar & Confirmar */}
            <div className="alta-catedra-actions">
              <button
                type="button"
                className="btn-alta-catedra btn-alta-catedra-borrar"
                onClick={handleClear}
              >
                <FiTrash2 className="btn-icon" />
                <span>Borrar</span>
              </button>

              <button
                type="button"
                className="btn-alta-catedra btn-alta-catedra-confirmar"
                onClick={handleSubmit}
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
