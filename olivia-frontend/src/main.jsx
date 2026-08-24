import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/global.css'
import App from './App'
import { AuthProvider } from './context/AuthContext'

// BASE_URL riflette il base path passato in build (VITE_BASE, default "/"):
// senza basename gli URL delle rotte (a partire da /login) uscirebbero dall'app
// se l'app venisse mai servita sotto un sottopercorso.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
