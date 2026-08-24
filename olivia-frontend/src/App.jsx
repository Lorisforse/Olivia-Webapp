import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import TopNav from './components/TopNav'
import HomePage from './pages/Home/HomePage'
import PazientiPage from './pages/Pazienti/PazientiPage'
import PatientDetail from './pages/PatientDetail'
import NuovoPaziente from './pages/NuovoPaziente/NuovoPaziente'
import DietePage from './pages/Diete/DietePage'
import LoginPage from './pages/Login/LoginPage'
import { useAuth } from './context/AuthContext'

/**
 * Cancello sulle pagine cliniche: senza sessione si finisce sul login, che poi
 * riporta alla pagina richiesta (location in state).
 */
function RequireAuth({ children }) {
  const { user, checking } = useAuth()
  const location = useLocation()

  // Con una sessione ripristinata da storage si entra subito: la validazione
  // contro il backend prosegue in background e, se fallisce, riporta al login.
  if (user) return children
  if (checking) return <div className="loading-screen">Caricamento…</div>
  return <Navigate to="/login" replace state={{ from: location }} />
}

export default function App() {
  const { user } = useAuth()
  const location = useLocation()
  const isLoginPage = location.pathname === '/login'

  return (
    <div className="app">
      {user && !isLoginPage && <TopNav />}
      <Routes>
        <Route path='/login' element={<LoginPage />} />
        <Route path='/' element={<RequireAuth><HomePage /></RequireAuth>} />
        <Route path='/pazienti' element={<RequireAuth><PazientiPage /></RequireAuth>} />
        <Route path='/pazienti/:id' element={<RequireAuth><PatientDetail /></RequireAuth>} />
        <Route path='/nuovo-paziente' element={<RequireAuth><NuovoPaziente /></RequireAuth>} />
        <Route path='/diete' element={<RequireAuth><DietePage /></RequireAuth>} />
        <Route path='*' element={<Navigate to='/' replace />} />
      </Routes>
    </div>
  )
}
