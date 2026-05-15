import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import TopNav from './components/TopNav'
import HomePage from './pages/Home/HomePage'
import PazientiPage from './pages/Pazienti/PazientiPage'
import PatientDetail from './pages/PatientDetail'
import NuovoPaziente from './pages/NuovoPaziente/NuovoPaziente'
import DietePage from './pages/Diete/DietePage'

export default function App() {
  const [isDemo, setIsDemo] = useState(false)

  useEffect(() => {
    const handler = () => setIsDemo(true)
    window.addEventListener('olivia:demo-activated', handler)
    return () => window.removeEventListener('olivia:demo-activated', handler)
  }, [])

  return (
    <div className="app">
      <TopNav />
      {isDemo && (
        <div className="demo-banner">Modalità demo — dati di esempio</div>
      )}
      <Routes>
        <Route path='/' element={<HomePage />} />
        <Route path='/pazienti' element={<PazientiPage />} />
        <Route path='/pazienti/:id' element={<PatientDetail />} />
        <Route path='/nuovo-paziente' element={<NuovoPaziente />} />
        <Route path='/diete' element={<DietePage />} />
        <Route path='*' element={<Navigate to='/' replace />} />
      </Routes>
    </div>
  )
}
