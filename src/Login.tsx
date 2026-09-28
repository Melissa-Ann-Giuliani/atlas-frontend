import { useState } from 'react';
import './Login.css';

export default function Login() {
  const [view, setView] = useState<'login' | 'forgot-password'>('login');
  
  // Login states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Forgot password states
  const [resetUsername, setResetUsername] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState({ type: '', text: '' });

  const handleLoginSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const response = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        setErrorMessage(errorData?.message || 'Nombre de usuario o contraseña inválidos.');
        return;
      }

      const data = await response.json();
      setErrorMessage('');
      alert('Sesión iniciada correctamente.');
    } catch (err) {
      setErrorMessage('Error de conexión con el servidor.');
    }
  };

  const handleResetSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResetMessage({ type: '', text: '' });

    if (!resetUsername || !resetEmail) {
      setResetMessage({ type: 'error', text: 'Por favor complete todos los campos.' });
      return;
    }

    try {
      const response = await fetch('http://localhost:8080/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: resetUsername, email: resetEmail }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        setResetMessage({ type: 'error', text: errorData?.message || 'No se pudo procesar la solicitud. Verifique sus datos.' });
        return;
      }

      setResetMessage({ type: 'success', text: 'Se ha generado y enviado una contraseña provisoria a su correo.' });
      setResetUsername('');
      setResetEmail('');
    } catch (err) {
      setResetMessage({ type: 'error', text: 'Error de conexión con el servidor.' });
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <p className="welcome-text">Bienvenido a</p>
          <div className="logo-container">
            <div className="logo-icon">
              <div className="logo-quadrant yellow">F</div>
              <div className="logo-quadrant green">F</div>
              <div className="logo-quadrant green-dark">H</div>
              <div className="logo-quadrant green">A</div>
            </div>
            <h1 className="logo-text">Atlas</h1>
          </div>
        </div>

        {view === 'login' ? (
          <>
            {errorMessage && (
              <div className="alert-error">
                {errorMessage}
              </div>
            )}

            <form className="login-form" onSubmit={handleLoginSubmit}>
              <div className="form-group">
                <label htmlFor="username">Nombre de Usuario</label>
                <input
                  type="text"
                  id="username"
                  placeholder="Ingrese valor"
                  className={`form-input ${errorMessage ? 'input-error' : ''}`}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Contraseña</label>
                <input
                  type="password"
                  id="password"
                  placeholder="Ingrese valor"
                  className={`form-input ${errorMessage ? 'input-error' : ''}`}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                />
              </div>

              <div className="form-checkbox">
                <input type="checkbox" id="remember" />
                <label htmlFor="remember">Recordar mi dispositivo</label>
              </div>

              <button type="submit" className="login-button">
                Iniciar Sesión
              </button>
            </form>

            <div className="forgot-password">
              <p>Ha olvidado su contraseña?</p>
              <a 
                href="#" 
                className="forgot-link" 
                onClick={(e) => {
                  e.preventDefault();
                  setView('forgot-password');
                  setErrorMessage('');
                }}
              >
                Presione aquí para renovarla
              </a>
            </div>
          </>
        ) : (
          <>
            <h2 className="reset-title" style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#1a1a1a' }}>
              Recuperar Contraseña
            </h2>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px', textAlign: 'center' }}>
              Ingrese su nombre de usuario y correo electrónico para generar una nueva contraseña provisoria.
            </p>

            {resetMessage.text && (
              <div className={resetMessage.type === 'error' ? 'alert-error' : 'alert-success'}>
                {resetMessage.text}
              </div>
            )}

            <form className="login-form" onSubmit={handleResetSubmit}>
              <div className="form-group">
                <label htmlFor="resetUsername">Nombre de Usuario</label>
                <input
                  type="text"
                  id="resetUsername"
                  placeholder="Ingrese su usuario"
                  className={`form-input ${resetMessage.type === 'error' ? 'input-error' : ''}`}
                  value={resetUsername}
                  onChange={(e) => {
                    setResetUsername(e.target.value);
                    if (resetMessage.text) setResetMessage({ type: '', text: '' });
                  }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="resetEmail">Correo Electrónico</label>
                <input
                  type="email"
                  id="resetEmail"
                  placeholder="Ingrese su correo"
                  className={`form-input ${resetMessage.type === 'error' ? 'input-error' : ''}`}
                  value={resetEmail}
                  onChange={(e) => {
                    setResetEmail(e.target.value);
                    if (resetMessage.text) setResetMessage({ type: '', text: '' });
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button 
                  type="button" 
                  className="login-button" 
                  style={{ backgroundColor: '#ccc', color: '#1a1a1a' }}
                  onClick={() => {
                    setView('login');
                    setResetMessage({ type: '', text: '' });
                    setResetUsername('');
                    setResetEmail('');
                  }}
                >
                  Volver
                </button>
                <button type="submit" className="login-button" style={{ width: '100%', padding: '12px 16px' }}>
                  Solicitar
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
