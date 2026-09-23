import { useState } from 'react';
import './Login.css';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
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
      // Limpiar errores si el login es exitoso
      setErrorMessage('');
      alert('Sesión iniciada correctamente.');
    } catch (err) {
      setErrorMessage('Error de conexión con el servidor.');
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

        {errorMessage && (
          <div className="alert-error">
            {errorMessage}
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
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
          <a href="#" className="forgot-link">Presione aquí para renovarla</a>
        </div>
      </div>
    </div>
  );
}
