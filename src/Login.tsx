import './Login.css';

export default function Login() {
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

        <form className="login-form">
          <div className="form-group">
            <label htmlFor="username">Nombre de Usuario</label>
            <input 
              type="text" 
              id="username" 
              placeholder="Ingrese valor" 
              className="form-input" 
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input 
              type="password" 
              id="password" 
              placeholder="Ingrese valor" 
              className="form-input" 
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
