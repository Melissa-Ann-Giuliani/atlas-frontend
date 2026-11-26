import { useState, useRef, useEffect } from 'react';
import { FiDownload, FiChevronDown, FiFileText, FiGrid, FiLoader } from 'react-icons/fi';
import { exportFile, type ExportFormat, type ExportQueryParams } from '../utils/exportFile';
import './ExportButton.css';

export interface ExportButtonProps {
  endpoint: string;
  params?: ExportQueryParams;
  fallbackBaseName: string;
  disabled?: boolean;
  onUnauthorized?: () => void;
  onError?: (message: string | null) => void;
  className?: string;
  align?: 'left' | 'right';
}

export default function ExportButton({
  endpoint,
  params,
  fallbackBaseName,
  disabled = false,
  onUnauthorized,
  onError,
  className = '',
  align = 'left',
}: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingFormat, setLoadingFormat] = useState<ExportFormat | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isExporting = loadingFormat !== null;
  const isDisabled = disabled || isExporting;

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleExport = async (format: ExportFormat) => {
    if (isExporting) return;

    setIsOpen(false);
    setLoadingFormat(format);
    setLocalError(null);
    if (onError) onError(null);

    try {
      await exportFile({
        endpoint,
        format,
        params,
        fallbackFilename: `${fallbackBaseName}.${format}`,
        onUnauthorized,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Ocurrió un error al exportar el archivo.';
      if (onError) {
        onError(message);
      } else {
        setLocalError(message);
      }
    } finally {
      setLoadingFormat(null);
    }
  };

  return (
    <div className={`export-dropdown-container ${className}`.trim()} ref={containerRef}>
      <button
        type="button"
        className={`export-trigger-btn ${isOpen ? 'active' : ''}`}
        onClick={() => !isDisabled && setIsOpen((prev) => !prev)}
        disabled={isDisabled}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-busy={isExporting}
      >
        {isExporting ? (
          <>
            <FiLoader className="export-spinner-icon" size={15} aria-hidden="true" />
            <span>{loadingFormat === 'pdf' ? 'Exportando PDF...' : 'Exportando Excel...'}</span>
          </>
        ) : (
          <>
            <FiDownload size={15} aria-hidden="true" />
            <span>Exportar</span>
            <FiChevronDown
              size={14}
              className={`export-chevron-icon ${isOpen ? 'open' : ''}`}
              aria-hidden="true"
            />
          </>
        )}
      </button>

      {isOpen && !isDisabled && (
        <div
          className={`export-dropdown-menu ${align === 'right' ? 'align-right' : 'align-left'}`}
          role="menu"
        >
          <button
            type="button"
            className="export-dropdown-item"
            role="menuitem"
            onClick={() => handleExport('pdf')}
          >
            <FiFileText size={15} className="export-item-icon pdf" aria-hidden="true" />
            <span className="export-item-label">Exportar PDF</span>
            <span className="export-item-ext">.pdf</span>
          </button>
          <button
            type="button"
            className="export-dropdown-item"
            role="menuitem"
            onClick={() => handleExport('xlsx')}
          >
            <FiGrid size={15} className="export-item-icon xlsx" aria-hidden="true" />
            <span className="export-item-label">Exportar Excel</span>
            <span className="export-item-ext">.xlsx</span>
          </button>
        </div>
      )}

      {!onError && localError && (
        <div className="export-inline-error" role="alert">
          <span>{localError}</span>
          <button
            type="button"
            className="export-inline-error-close"
            onClick={() => setLocalError(null)}
            aria-label="Cerrar error"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

