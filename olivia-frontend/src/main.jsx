import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/global.css'
import App from './App'
import { AuthProvider } from './context/AuthContext'

// Il build per GitHub Pages vive sotto /Olivia-Webapp/, quello del VPS sulla root:
// senza basename gli URL delle rotte (a partire da /login) uscirebbero dall'app.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
