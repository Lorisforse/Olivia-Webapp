import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPatients } from '../../api/patients'
import { getDiets } from '../../api/diets'

function deriveStatus(p) {
  if (!p.chat_id) return 'waiting'
  if (!p.active_diet_plan_id) return 'nodiet'
  return 'active'
}

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatToday() {
  const d = new Date()
  const s = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function HomePage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ active: '—', nodiet: '—', diets: '—', lastDiet: '—' })

  useEffect(() => {
    Promise.all([getPatients(), getDiets()])
      .then(([patients, diets]) => {
        const active = (patients || []).filter(p => deriveStatus(p) === 'active').length
        const nodiet = (patients || []).filter(p => deriveStatus(p) === 'nodiet').length
        const sorted = [...(diets || [])].sort((a, b) =>
          (b.created_at || '').localeCompare(a.created_at || '')
        )
        setStats({
          active,
          nodiet,
          diets: (diets || []).length,
          lastDiet: sorted[0] ? formatDate(sorted[0].created_at) : '—',
        })
      })
      .catch(() => {})
  }, [])

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <div className="page-eyebrow">Studio · Dr.ssa Russo</div>
          <h1 className="page-title">Benvenuta, Elena</h1>
          <p className="page-subtitle">{formatToday()} · panoramica dello studio</p>
        </div>
      </header>

      <section className="stat-grid mb-24" aria-label="Indicatori principali">
        <article className="stat">
          <div className="stat__label">Pazienti attivi</div>
          <div className="stat__value">{stats.active}</div>
          <div className="stat__meta">
            <span className="muted">con dieta e bot attivo</span>
          </div>
        </article>

        <article className="stat">
          <div className="stat__label">Pazienti senza dieta</div>
          <div className="stat__value">{stats.nodiet}</div>
          <div className="stat__meta">
            <span className="stat__delta--warn">●</span>
            <span className="muted">in attesa di un piano dietetico</span>
          </div>
        </article>

        <article className="stat">
          <div className="stat__label">Piani dietetici caricati</div>
          <div className="stat__value">{stats.diets}</div>
          <div className="stat__meta">
            <span className="muted">ultimo: {stats.lastDiet}</span>
          </div>
        </article>
      </section>

      <section aria-label="Azioni rapide">
        <h2 className="page-eyebrow" style={{ marginBottom: 12 }}>Azioni rapide</h2>
        <div className="qa-grid">
          <button className="qa" onClick={() => navigate('/nuovo-paziente')}>
            <span className="qa__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"/>
                <line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
            </span>
            <span>
              <div className="qa__title">Nuovo paziente</div>
              <div className="qa__desc">Inserisci dati anagrafici e clinici</div>
            </span>
            <span className="qa__arrow" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </span>
          </button>

          <button className="qa" onClick={() => navigate('/diete')}>
            <span className="qa__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </span>
            <span>
              <div className="qa__title">Carica dieta</div>
              <div className="qa__desc">PDF del piano dietetico, fino a 10 MB</div>
            </span>
            <span className="qa__arrow" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </span>
          </button>
        </div>
      </section>
    </main>
  )
}
