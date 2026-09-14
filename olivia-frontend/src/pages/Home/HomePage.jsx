import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPatients, getCohortReport } from '../../api/patients'
import { getDiets } from '../../api/diets'
import { useAuth } from '../../context/AuthContext'
import { BarTrend } from '../../components/charts'

function deriveStatus(p) {
  if (!p.chat_id) return 'waiting'
  if (!p.active_diet_plan_id) return 'nodiet'
  return 'active'
}

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDayLabel(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
}

// "Dr.ssa Elena Russo" -> "Elena": il saluto usa solo il nome proprio.
const HONORIFICS = /^(dr|dr\.ssa|dott|dott\.ssa|prof|prof\.ssa)\.?$/i

function firstName(name) {
  const parts = String(name || '').split(/\s+/).filter(p => p && !HONORIFICS.test(p))
  return parts[0] || ''
}

function formatToday() {
  const d = new Date()
  const s = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const PERIODS = [
  [7, '7gg'],
  [14, '14gg'],
  [30, '30gg'],
]

function CohortSection() {
  const navigate = useNavigate()
  const [days, setDays] = useState(14)
  const [cohort, setCohort] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getCohortReport({ days })
      .then(setCohort)
      .catch(() => setCohort(null))
      .finally(() => setLoading(false))
  }, [days])

  const adherenceData = (cohort?.daily || []).map(d => ({
    label: formatDayLabel(d.date),
    value: d.adherence_pct,
  }))
  const hydrationData = (cohort?.daily || []).map(d => ({
    label: formatDayLabel(d.date),
    value: d.hydration_ml != null ? Math.round(d.hydration_ml) : null,
  }))

  return (
    <section aria-label="Andamento coorte" className="mb-24">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <h2 className="page-eyebrow" style={{ margin: 0 }}>Andamento pazienti</h2>
        <div className="period-select" role="group" aria-label="Periodo">
          {PERIODS.map(([v, l]) => (
            <button key={v} className={days === v ? 'active' : ''} onClick={() => setDays(v)}>{l}</button>
          ))}
        </div>
      </div>

      {!loading && cohort && cohort.active_patients === 0 && (
        <div className="card card-empty-note">
          <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
            Nessun paziente attivo collegato al bot: qui compariranno i grafici di
            aderenza, idratazione e umore non appena qualcuno sarà connesso.
          </p>
        </div>
      )}

      {(loading || (cohort && cohort.active_patients > 0)) && (
        <div className="home-charts-grid">
          <div className="card" style={{ gridColumn: 'span 2' }}>
            <div className="card__header">
              <h2 className="card__title">Aderenza alla dieta</h2>
              {cohort?.avg_adherence_pct != null && (
                <span className="pill pill--ok">{cohort.avg_adherence_pct}% media</span>
              )}
            </div>
            <div className="card__body">
              {loading
                ? <div className="chart-empty">Caricamento…</div>
                : <BarTrend data={adherenceData} target={80} unit="%" color="var(--brand)" />
              }
              <p className="muted" style={{ fontSize: 12, marginTop: 10, marginBottom: 0 }}>
                Media giornaliera sui {cohort?.active_patients ?? '—'} pazienti attivi collegati al bot · obiettivo 80%.
              </p>
            </div>
          </div>

          <div className="card">
            <div className="card__header">
              <h2 className="card__title">Serve attenzione</h2>
            </div>
            <div className="card__body">
              {loading ? (
                <div className="chart-empty">Caricamento…</div>
              ) : !cohort?.attention?.length ? (
                <p className="muted" style={{ fontSize: 13, margin: 0 }}>
                  Nessun paziente con aderenza bassa negli ultimi 7 giorni.
                </p>
              ) : (
                <div className="attention-list">
                  {cohort.attention.map(a => (
                    <div key={a.patient_id} className="attention-row" onClick={() => navigate(`/pazienti/${a.patient_id}`)}>
                      <span className="attention-row__name">{a.name || '—'}</span>
                      <span className="attention-row__meta">{a.days_logged}gg loggati</span>
                      <span className="attention-row__pct">{a.adherence_pct}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card__header">
              <h2 className="card__title">Idratazione</h2>
            </div>
            <div className="card__body">
              <div className="trend-head">
                <span className="trend-head__val">
                  {cohort?.avg_hydration_ml != null ? (cohort.avg_hydration_ml / 1000).toFixed(1) : '—'}
                </span>
                <span className="trend-head__sub">L medi al giorno · obiettivo 2,0 L</span>
              </div>
              {loading
                ? <div className="chart-empty">Caricamento…</div>
                : <BarTrend data={hydrationData} target={2000} unit=" ml" color="#8FB8CC" height={110} />
              }
            </div>
          </div>

          <div className="card">
            <div className="card__header">
              <h2 className="card__title">Umore</h2>
            </div>
            <div className="card__body">
              {loading ? (
                <div className="chart-empty">Caricamento…</div>
              ) : (
                <div className="mood-breakdown">
                  <div className="mood-tile">
                    <span className="mood-tile__val" style={{ color: 'var(--ok)' }}>{cohort?.mood.sereno ?? 0}</span>
                    <span className="mood-tile__label">Sereno</span>
                  </div>
                  <div className="mood-tile">
                    <span className="mood-tile__val" style={{ color: 'var(--ink-3)' }}>{cohort?.mood.neutro ?? 0}</span>
                    <span className="mood-tile__label">Neutro</span>
                  </div>
                  <div className="mood-tile">
                    <span className="mood-tile__val" style={{ color: 'var(--warn)' }}>{cohort?.mood.in_difficolta ?? 0}</span>
                    <span className="mood-tile__label">In difficoltà</span>
                  </div>
                  <div className="mood-tile">
                    <span className="mood-tile__val" style={{ color: 'var(--ink-5)' }}>{cohort?.mood.senza_dati ?? 0}</span>
                    <span className="mood-tile__label">Senza dati</span>
                  </div>
                </div>
              )}
              <p className="muted" style={{ fontSize: 12, marginTop: 14, marginBottom: 0 }}>
                Numero di pazienti per fascia, in base all&#39;umore medio riferito al bot nel periodo.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
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
          <div className="page-eyebrow">Studio · {user?.name || 'Olivia'}</div>
          <h1 className="page-title">{firstName(user?.name) ? `Ciao, ${firstName(user.name)}` : 'Ciao'}</h1>
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

      <CohortSection />

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
