import React from 'react';
import './Gestion.css';
import Sidebar from '../../components/Sidebar';
import Topbar from '../../components/Topbar';
import { FiChevronRight } from 'react-icons/fi';
import { isGlobalAdmin } from '../../utils/auth';

interface GestionProps {
  onLogout?: () => void;
  onNavigate?: (page: any, data?: any) => void;
}

interface OptionItem {
  id: string;
  label: string;
  type: 'green' | 'blue' | 'red';
  targetPage?: string;
}

interface GestionCardData {
  id: string;
  title: string;
  headerClass: string;
  options: OptionItem[];
}

export default function Gestion({ onLogout, onNavigate }: GestionProps) {
  const userIsAdminGlobal = isGlobalAdmin();

  const cards: GestionCardData[] = [
    {
      id: 'cargos',
      title: 'Cargos',
      headerClass: 'header-cargos',
      options: [
        { id: 'alta_cargo', label: 'Alta de Cargo', type: 'green', targetPage: 'alta_cargo' },
        { id: 'modificacion_cargo', label: 'Modificación de Cargo', type: 'blue', targetPage: 'modificar_cargo' },
        ...(userIsAdminGlobal
          ? [{ id: 'baja_cargo', label: 'Baja de Cargo', type: 'red' as const, targetPage: 'baja_cargo' }]
          : []),
      ],
    },
    {
      id: 'catedras',
      title: 'Cátedras',
      headerClass: 'header-catedras',
      options: [
        { id: 'alta_catedra', label: 'Alta de Cátedra', type: 'green' },
        { id: 'modificacion_catedra', label: 'Modificación de Cátedra', type: 'blue' },
        { id: 'baja_catedra', label: 'Baja de Cátedra', type: 'red' },
      ],
    },
    {
      id: 'materias',
      title: 'Materias',
      headerClass: 'header-materias',
      options: [
        { id: 'alta_materia', label: 'Alta de Materia', type: 'green' },
        { id: 'modificacion_materia', label: 'Modificación de Materia', type: 'blue' },
        { id: 'baja_materia', label: 'Baja de Materia', type: 'red' },
      ],
    },
    {
      id: 'usuarios',
      title: 'Usuarios',
      headerClass: 'header-usuarios',
      options: [
        { id: 'alta_usuario', label: 'Alta de Usuario', type: 'green', targetPage: 'nuevo_usuario' },
        { id: 'modificacion_usuario', label: 'Modificación de Usuario', type: 'blue' },
        { id: 'baja_usuario', label: 'Baja de Usuario', type: 'red' },
      ],
    },
  ];

  const handleOptionClick = (option: OptionItem, cardTitle: string) => {
    if (option.targetPage && onNavigate) {
      onNavigate(option.targetPage);
    } else if ((option.id === 'alta_usuario' || option.id === 'nuevo_usuario') && onNavigate) {
      onNavigate('nuevo_usuario');
    } else if (option.id === 'alta_cargo' && onNavigate) {
      onNavigate('alta_cargo');
    } else if (option.id === 'modificacion_cargo' && onNavigate) {
      onNavigate('modificar_cargo');
    } else if (option.id === 'baja_cargo' && onNavigate) {
      if (userIsAdminGlobal) {
        onNavigate('baja_cargo');
      }
    } else {
      // Future navigation handlers can be added here
      console.log(`Seleccionado: ${option.label} (${cardTitle})`);
    }
  };

  const handleVencimientosClick = () => {
    console.log('Reporte de vencimientos seleccionado');
  };

  return (
    <div className="gestion-page">
      <Topbar onLogout={onLogout} />

      <div className="gestion-body">
        <Sidebar activeItem="gestion" onNavigate={onNavigate} />

        <main className="gestion-main">
          <div className="gestion-content-area">
            <div className="gestion-container-card">
              {/* Header Title with double underline */}
              <div className="gestion-header">
                <h1 className="gestion-title">Gestión</h1>
                <hr className="gestion-divider" />
              </div>

              {/* Cards layout */}
              <div className="gestion-cards-container">
                {/* Top row: Cargos, Cátedras, Materias */}
                <div className="gestion-cards-row gestion-cards-row-top">
                  {cards.slice(0, 3).map((card) => (
                    <div key={card.id} className="gestion-card">
                      <div className={`gestion-card-header ${card.headerClass}`}>
                        <h2>{card.title}</h2>
                      </div>
                      <div className="gestion-card-body">
                        <div className="gestion-option-list">
                          {card.options.map((option, idx) => (
                            <React.Fragment key={option.id}>
                              <button
                                type="button"
                                className="gestion-option"
                                onClick={() => handleOptionClick(option, card.title)}
                              >
                                <span className={`option-dot dot-${option.type}`} />
                                <span className="option-label">{option.label}</span>
                              </button>
                              {idx < card.options.length - 1 && (
                                <div className="gestion-option-divider" />
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom row: Usuarios, Vencimientos */}
                <div className="gestion-cards-row gestion-cards-row-bottom">
                  {/* Usuarios card */}
                  {cards.slice(3, 4).map((card) => (
                    <div key={card.id} className="gestion-card">
                      <div className={`gestion-card-header ${card.headerClass}`}>
                        <h2>{card.title}</h2>
                      </div>
                      <div className="gestion-card-body">
                        <div className="gestion-option-list">
                          {card.options.map((option, idx) => (
                            <React.Fragment key={option.id}>
                              <button
                                type="button"
                                className="gestion-option"
                                onClick={() => handleOptionClick(option, card.title)}
                              >
                                <span className={`option-dot dot-${option.type}`} />
                                <span className="option-label">{option.label}</span>
                              </button>
                              {idx < card.options.length - 1 && (
                                <div className="gestion-option-divider" />
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Vencimientos card */}
                  <div className="gestion-card">
                    <div className="gestion-card-header header-vencimientos">
                      <h2>Vencimientos</h2>
                    </div>
                    <div className="gestion-card-body vencimientos-body">
                      <p className="vencimientos-desc">
                        Lista de designaciones por vencer
                      </p>
                      <button
                        type="button"
                        className="vencimientos-link"
                        onClick={handleVencimientosClick}
                      >
                        <span>Ver reporte</span>
                        <FiChevronRight className="vencimientos-arrow" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
