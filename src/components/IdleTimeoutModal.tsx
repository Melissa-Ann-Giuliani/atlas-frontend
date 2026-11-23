import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiAlertTriangle } from 'react-icons/fi';
import { getTokenExpirationMs, isTokenExpired } from '../utils/auth';
import './IdleTimeoutModal.css';

interface IdleTimeoutModalProps {
  onLogout: () => void;
  warningSeconds?: number;
}

const MAX_TIMEOUT_MS = 2_147_483_647;

const IdleTimeoutModal: React.FC<IdleTimeoutModalProps> = ({
  onLogout,
  warningSeconds = 60, // 1 minute warning before JWT expiration
}) => {
  const [showModal, setShowModal] = useState(false);
  const [countdown, setCountdown] = useState(warningSeconds);
  const [isRenewing, setIsRenewing] = useState(false);
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modalIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logoutTriggeredRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
      checkTimeoutRef.current = null;
    }
    if (modalIntervalRef.current) {
      clearInterval(modalIntervalRef.current);
      modalIntervalRef.current = null;
    }
  }, []);

  const triggerLogout = useCallback(() => {
    if (logoutTriggeredRef.current) return;
    logoutTriggeredRef.current = true;
    clearTimers();
    setShowModal(false);
    onLogout();
  }, [clearTimers, onLogout]);

  const evaluateExpiration = useCallback(() => {
    const expMs = getTokenExpirationMs();
    const now = Date.now();

    if (expMs === null || now >= expMs) {
      triggerLogout();
      return;
    }

    const remainingMs = expMs - now;
    const warningMs = warningSeconds * 1000;

    if (remainingMs <= warningMs) {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
        checkTimeoutRef.current = null;
      }
      setShowModal(true);
      setCountdown(Math.max(0, Math.ceil(remainingMs / 1000)));
    } else {
      if (modalIntervalRef.current) {
        clearInterval(modalIntervalRef.current);
        modalIntervalRef.current = null;
      }
      setShowModal(false);
      setCountdown(warningSeconds);

      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }

      const delayToWarning = Math.min(remainingMs - warningMs, MAX_TIMEOUT_MS);
      checkTimeoutRef.current = setTimeout(() => {
        evaluateExpiration();
      }, delayToWarning);
    }
  }, [triggerLogout, warningSeconds]);

  useEffect(() => {
    logoutTriggeredRef.current = false;
    evaluateExpiration();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        evaluateExpiration();
      }
    };

    const handleFocus = () => {
      evaluateExpiration();
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'token') {
        evaluateExpiration();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorage);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorage);
      clearTimers();
    };
  }, [evaluateExpiration, clearTimers]);

  useEffect(() => {
    if (!showModal) {
      if (modalIntervalRef.current) {
        clearInterval(modalIntervalRef.current);
        modalIntervalRef.current = null;
      }
      return;
    }

    const updateRemaining = () => {
      const expMs = getTokenExpirationMs();
      const now = Date.now();

      if (expMs === null || now >= expMs) {
        triggerLogout();
        return;
      }

      const remainingMs = expMs - now;
      setCountdown(Math.max(0, Math.ceil(remainingMs / 1000)));
    };

    updateRemaining();
    modalIntervalRef.current = setInterval(updateRemaining, 500);

    return () => {
      if (modalIntervalRef.current) {
        clearInterval(modalIntervalRef.current);
        modalIntervalRef.current = null;
      }
    };
  }, [showModal, triggerLogout]);

  const handleStayLoggedIn = async () => {
    if (isRenewing) return;
    setIsRenewing(true);

    try {
      const currentToken = localStorage.getItem('token');
      if (!currentToken || isTokenExpired(currentToken)) {
        triggerLogout();
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8081'}/api/auth/renew`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data?.token && !isTokenExpired(data.token)) {
          localStorage.setItem('token', data.token);
          evaluateExpiration();
        } else {
          triggerLogout();
        }
      } else {
        triggerLogout();
      }
    } catch (error) {
      console.error('Error renewing token', error);
      triggerLogout();
    } finally {
      setIsRenewing(false);
    }
  };

  if (!showModal) return null;

  return (
    <div className="idle-modal-overlay">
      <div className="idle-modal">
        <div className="idle-modal-header">
          <FiAlertTriangle className="idle-warning-icon" />
          <h2>Sesión por expirar</h2>
          <FiAlertTriangle className="idle-warning-icon" />
        </div>
        <div className="idle-modal-content">
          <p>Tu sesión expirará en <strong>{countdown}</strong> segundos.</p>
          <p>¿Deseas mantener tu sesión activa?</p>
          <div className="idle-modal-actions">
            <button
              className="idle-btn-stay"
              onClick={handleStayLoggedIn}
              disabled={isRenewing}
            >
              {isRenewing ? 'Renovando...' : 'Mantener Sesión'}
            </button>
            <button className="idle-btn-logout" onClick={triggerLogout}>
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IdleTimeoutModal;
