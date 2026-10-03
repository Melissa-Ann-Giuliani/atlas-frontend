import { useState, useEffect } from 'react'
import Login from './Login'
import Inicio from './Inicio'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('token');
  });

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  if (isAuthenticated) {
    return <Inicio onLogout={handleLogout} />
  }

  return <Login onLogin={handleLogin} />
}

export default App
