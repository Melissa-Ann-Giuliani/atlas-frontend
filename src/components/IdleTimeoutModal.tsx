import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiAlertTriangle } from 'react-icons/fi';
import './IdleTimeoutModal.css';

interface IdleTimeoutModalProps {
  onLogout: () => void;
  timeoutSeconds?: number;
  warningSeconds?: number;
}

const IdleTimeoutModal: React.FC<IdleTimeoutModalProps> = ({
  onLogout,
  timeoutSeconds = 3600, // 1 hour default
  warningSeconds = 60, // 1 minute warning
}) => {
  const [showModal, setShowModal] = useState(false);
  const showModalRef = useRef(false);
  const [countdown, setCountdown] = useState(warningSeconds);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningIntervalRef.current) clearInterval(warningIntervalRef.current);

    setShowModal(false);
    showModalRef.current = false;
    setCountdown(warningSeconds);

    timeoutRef.current = setTimeout(() => {
      setShowModal(true);
      showModalRef.current = true;
    }, (timeoutSeconds - warningSeconds) * 1000);
  }, [timeoutSeconds, warningSeconds]);

  useEffect(() => {
    // Event listeners for user activity
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

    const handleActivity = () => {
      if (!showModalRef.current) {
        resetTimer();
      }
    };

    events.forEach((event) => window.addEventListener(event, handleActivity));

    resetTimer();

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleActivity));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningIntervalRef.current) clearInterval(warningIntervalRef.current);
    };
  }, [resetTimer]);

  useEffect(() => {
    if (showModal) {
      warningIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(warningIntervalRef.current!);
            onLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (warningIntervalRef.current) clearInterval(warningIntervalRef.current);
    };
  }, [showModal, onLogout]);

  const handleStayLoggedIn = async () => {
    try {
      const currentToken = localStorage.getItem('token');

      // Request a fresh 1-hour token from the backend
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8081'}/api/auth/renew`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Overwrite the old token with the new 1-hour token!
        localStorage.setItem('token', data.token);
        resetTimer();
      } else {
        // If the server rejects the renewal, force logout
        onLogout();
      }
    } catch (error) {
      console.error("Error renewing token", error);
      onLogout();
    }
  };



  if (!showModal) return null;

  return (
    <div className="idle-modal-overlay">
      <div className="idle-modal">
        <div className="idle-modal-header">
          <FiAlertTriangle className="idle-warning-icon" />
          <h2>Inactividad detectada</h2>
          <FiAlertTriangle className="idle-warning-icon" />
        </div>
        <div className="idle-modal-content">
          <p>Tu sesión expirará en <strong>{countdown}</strong> segundos debido a inactividad.</p>
          <p>¿Deseas mantener tu sesión activa?</p>
          <div className="idle-modal-actions">
            <button className="idle-btn-stay" onClick={handleStayLoggedIn}>Mantener Sesión</button>
            <button className="idle-btn-logout" onClick={onLogout}>Cerrar Sesión</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IdleTimeoutModal;
