import { useState } from 'react'
import Login from './Login'
import Inicio from './Inicio'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(true)

  if (isAuthenticated) {
    return <Inicio onLogout={() => setIsAuthenticated(false)} />
  }

  return <Login />
}

export default App
