import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPatients, getCohortReport } from '../../api/patients'
import { getDiets } from '../../api/diets'
import { useAuth } from '../../context/AuthContext'
import { BarTrend } from '../../components/charts'
import { CountUp } from '../../components/ui'
import MetricIcon from '../../components/MetricIcon'
import MetricsCustomizer from '../../components/MetricsCustomizer'
import useMetricPrefs from '../../hooks/useMetricPrefs'
import { HOME_DEFAULT_ORDER } from '../../utils/metrics'

const SLEEP_TILES = [
  ['buona', 'Buono', 'var(--ok)'],
  ['discreta', 'Discreto', 'var(--warn)'],
  ['scarsa', 'Scarso', 'var(--danger)'],
  ['senza_dati', 'Senza dati', 'var(--ink-5)'],
]
const HUNGER_TILES = [
  ['bassa', 'Bassa', 'var(--ok)'],
  ['moderata', 'Moderata', 'var(--warn)'],
  ['alta', 'Alta', 'var(--danger)'],
  ['senza_dati', 'Senza dati', 'var(--ink-5)'],
]

function deriveStatus(p) {
  if (p.active === false && p.deactivated_reason === 'pending_diet') return 'pending'
  if (p.active === false) return 'inactive'
  if (!p.bot_connected) return 'waiting'
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

// 0 = "Sempre": il backend parte dal primo report dei pazienti attivi.
const PERIODS = [
  [7, '7gg'],
  [14, '14gg'],
  [30, '30gg'],
  [365, '1 anno'],
  [0, 'Sempre'],
]
// Oltre questi giorni le barre giornaliere diventano illeggibili: si raggruppa.
const WEEKLY_FROM_DAYS = 60
const MONTHLY_FROM_DAYS = 400

function weekStartIso(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() - (d.getDay() + 6) % 7)
  return d.toISOString().slice(0, 10)
}

function formatMonth(monthStr, style) {
  const d = new Date(monthStr + '-15T12:00:00')
  return d.toLocaleDateString('it-IT', style === 'long' ? { month: 'long', year: 'numeric' } : { month: 'short', year: '2-digit' })
}

// Punti giornalieri -> medie per settimana (da lunedì) o per mese; giorni senza dato esclusi.
function groupDaily(daily, field, grouping, digits = 0) {
  if (grouping === 'day') {
    return daily.map(d => ({ label: formatDayLabel(d.date), value: d[field] == null ? null : +d[field].toFixed(digits) }))
  }
  const order = []
  const values = {}
  daily.forEach(d => {
    const key = grouping === 'month' ? d.date.slice(0, 7) : weekStartIso(d.date)
    if (!values[key]) { values[key] = []; order.push(key) }
    if (d[field] != null) values[key].push(d[field])
  })
  return order.map(key => {
    const vals = values[key]
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
    return {
      label: grouping === 'month' ? formatMonth(key) : formatDayLabel(key),
      tip: grouping === 'month' ? formatMonth(key, 'long') : `Settimana dal ${formatDayLabel(key)}`,
      value: avg == null ? null : +avg.toFixed(digits),
    }
  })
}

function AttentionAlert({ attention, threshold }) {
  const navigate = useNavigate()
  const loading = attention === undefined
  const hasItems = !!attention?.length

  return (
    <section
      className={`attention-alert mb-24${hasItems ? '' : ' attention-alert--calm'}`}
      aria-label="Serve attenzione: bassa aderenza"
    >
      <div className="attention-alert__head">
        <span className="attention-alert__icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </span>
        <h2 className="attention-alert__title">
          Serve attenzione <span className="attention-alert__reason">- bassa aderenza</span>
          <span className="attention-alert__threshold">(pazienti sotto il {threshold}%)</span>
        </h2>
        {hasItems && (
          <span className="attention-alert__count">
            {attention.length} {attention.length === 1 ? 'paziente' : 'pazienti'}
          </span>
        )}
      </div>

      {loading ? (
        <p className="attention-alert__empty">Caricamento…</p>
      ) : !hasItems ? (
        <p className="attention-alert__empty">Nessun paziente sotto il {threshold}% di aderenza negli ultimi 7 giorni.</p>
      ) : (
        <div className="attention-list">
          {attention.map(a => (
            <button key={a.patient_id} type="button" className="attention-row" onClick={() => navigate(`/pazienti/${a.patient_id}`)}>
              <span className="attention-row__name">{a.name || '—'}</span>
              <span className="attention-row__meta">
                {a.days_logged} {a.days_logged === 1 ? 'giorno registrato' : 'giorni registrati'}
              </span>
              <span className="attention-row__pct">{a.adherence_pct}%</span>
              <svg className="attention-row__arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          ))}
        </div>
      )}

      <p className="attention-alert__note">
        Pazienti con aderenza media sotto il {threshold}% negli ultimi 7 giorni, dal più basso (al
        massimo 5, solo chi ha registrato almeno 2 giorni), indipendentemente dal periodo dei grafici.
      </p>
    </section>
  )
}

// Griglia a 2 colonne: le card "larghe" occupano la riga intera. Una card stretta
// che resterebbe da sola (seguita da una larga, o ultima) si allarga, cosi' non
// restano buchi e l'ordine scelto non cambia.
function homeLayout(keys, cards) {
  const layout = []
  let col = 0
  keys.forEach((key, i) => {
    if (cards[key].wide) { layout.push({ key, span: 2 }); col = 0; return }
    const next = keys[i + 1]
    if (col === 0 && (!next || cards[next].wide)) { layout.push({ key, span: 2 }); return }
    layout.push({ key, span: 1 })
    col = col === 0 ? 1 : 0
  })
  return layout
}

function CohortSection({ days, setDays, cohort, loading, metrics, onSaveMetrics }) {
  const daily = cohort?.daily || []
  const grouping = daily.length > MONTHLY_FROM_DAYS ? 'month' : daily.length > WEEKLY_FROM_DAYS ? 'week' : 'day'

  const adherenceData = groupDaily(daily, 'adherence_pct', grouping, 1)
  const hydrationData = groupDaily(daily, 'hydration_ml', grouping)
  const satisfactionData = groupDaily(daily, 'satisfaction_pct', grouping, 1)
  const messagesData = groupDaily(daily, 'messages_avg', grouping, 1)

  const periodNote = !loading && daily.length > 0 && (days === 0 || grouping !== 'day')
    ? [
        days === 0 && `Dal ${formatDate(daily[0].date + 'T12:00:00')}, primo giorno registrato`,
        grouping === 'week' && 'medie settimanali',
        grouping === 'month' && 'medie mensili',
      ].filter(Boolean).join(' · ')
    : null

  const cards = {
    adherence: {
      wide: true,
      body: (
        <>
          <div className="card__header">
            <h2 className="card__title card__title--icon"><MetricIcon metric="adherence" />Aderenza alla dieta</h2>
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
        </>
      ),
    },
    hydration: {
      wide: true,
      body: (
        <>
          <div className="card__header">
            <h2 className="card__title card__title--icon"><MetricIcon metric="hydration" />Idratazione</h2>
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
              : <BarTrend data={hydrationData} target={2000} unit=" ml" color="#8FB8CC" height={140} />
            }
          </div>
        </>
      ),
    },
    satisfaction: {
      wide: true,
      body: (
        <>
          <div className="card__header">
            <h2 className="card__title card__title--icon"><MetricIcon metric="satisfaction" />Gradimento pasti</h2>
            {cohort?.avg_satisfaction_pct != null && (
              <span className="pill pill--ok">{cohort.avg_satisfaction_pct}% media</span>
            )}
          </div>
          <div className="card__body">
            {loading
              ? <div className="chart-empty">Caricamento…</div>
              : <BarTrend data={satisfactionData} unit="%" color="#C08552" />
            }
            <p className="muted" style={{ fontSize: 12, marginTop: 10, marginBottom: 0 }}>
              Media giornaliera di quanto i pazienti hanno gradito i pasti registrati.
            </p>
          </div>
        </>
      ),
    },
    mood: {
      wide: false,
      body: (
        <>
          <div className="card__header">
            <h2 className="card__title card__title--icon"><MetricIcon metric="mood" />Umore</h2>
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
        </>
      ),
    },
    sleep: {
      wide: false,
      body: (
        <>
          <div className="card__header">
            <h2 className="card__title card__title--icon"><MetricIcon metric="sleep" />Qualità del sonno</h2>
          </div>
          <div className="card__body">
            {loading ? (
              <div className="chart-empty">Caricamento…</div>
            ) : (
              <div className="mood-breakdown">
                {SLEEP_TILES.map(([key, label, color]) => (
                  <div key={key} className="mood-tile">
                    <span className="mood-tile__val" style={{ color }}>{cohort?.sleep?.[key] ?? 0}</span>
                    <span className="mood-tile__label">{label}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="muted" style={{ fontSize: 12, marginTop: 14, marginBottom: 0 }}>
              Numero di pazienti per qualità del sonno più riferita al bot nel periodo.
            </p>
          </div>
        </>
      ),
    },
    messages: {
      wide: false,
      body: (
        <>
          <div className="card__header">
            <h2 className="card__title card__title--icon"><MetricIcon metric="messages" />Messaggi scambiati col bot</h2>
          </div>
          <div className="card__body">
            <div className="trend-head">
              <span className="trend-head__val">{cohort?.avg_messages ?? '—'}</span>
              <span className="trend-head__sub">messaggi medi al giorno</span>
            </div>
            {loading
              ? <div className="chart-empty">Caricamento…</div>
              : <BarTrend data={messagesData} color="#7A9E8E" height={140} />
            }
          </div>
        </>
      ),
    },
    hunger: {
      wide: false,
      body: (
        <>
          <div className="card__header">
            <h2 className="card__title card__title--icon"><MetricIcon metric="hunger" />Livello di fame</h2>
          </div>
          <div className="card__body">
            {loading ? (
              <div className="chart-empty">Caricamento…</div>
            ) : (
              <div className="mood-breakdown">
                {HUNGER_TILES.map(([key, label, color]) => (
                  <div key={key} className="mood-tile">
                    <span className="mood-tile__val" style={{ color }}>{cohort?.hunger?.[key] ?? 0}</span>
                    <span className="mood-tile__label">{label}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="muted" style={{ fontSize: 12, marginTop: 14, marginBottom: 0 }}>
              Numero di pazienti per livello di fame più riferito al bot nel periodo.
            </p>
          </div>
        </>
      ),
    },
  }
  const visibleKeys = metrics.filter(m => m.visible && cards[m.key]).map(m => m.key)

  return (
    <section aria-label="Andamento coorte" className="mb-24">
      <div className="section-head" style={{ marginBottom: 12 }}>
        <h2 className="page-eyebrow" style={{ margin: 0 }}>Andamento pazienti</h2>
        <div className="section-head__actions">
          <div className="period-select" role="group" aria-label="Periodo">
            {PERIODS.map(([v, l]) => (
              <button key={v} className={days === v ? 'active' : ''} onClick={() => setDays(v)}>{l}</button>
            ))}
          </div>
          <MetricsCustomizer metrics={metrics} onSave={onSaveMetrics} defaultOrder={HOME_DEFAULT_ORDER} screen="home" />
        </div>
      </div>
      {periodNote && (
        <p className="muted" style={{ fontSize: 12.5, margin: '-4px 0 12px' }}>{periodNote}</p>
      )}

      {!loading && cohort && cohort.active_patients === 0 && (
        <div className="card card-empty-note">
          <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
            Nessun paziente attivo collegato al bot: qui compariranno i grafici di
            aderenza, idratazione e umore non appena qualcuno sarà connesso.
          </p>
        </div>
      )}

      {(loading || (cohort && cohort.active_patients > 0)) && (
        visibleKeys.length === 0 ? (
          <div className="card metrics-empty">
            <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
              Tutti i grafici sono nascosti: usa &laquo;Personalizza&raquo; per mostrarli.
            </p>
          </div>
        ) : (
          <div className="home-charts-grid">
            {homeLayout(visibleKeys, cards).map(({ key, span }) => (
              <div key={key} className="card" style={span === 2 ? { gridColumn: 'span 2' } : undefined}>
                {cards[key].body}
              </div>
            ))}
          </div>
        )
      )}
    </section>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [stats, setStats] = useState({ active: '—', nodiet: '—', diets: '—', lastDiet: '—' })
  const [days, setDays] = useState(14)
  const { metrics, save: saveMetrics } = useMetricPrefs(HOME_DEFAULT_ORDER)
  const [cohort, setCohort] = useState(null)
  const [loading, setLoading] = useState(true)
  // "Serve attenzione" guarda sempre gli ultimi 7 giorni: tenuto a parte, cosi'
  // cambiando periodo dei grafici l'avviso non torna a "Caricamento…".
  const [attention, setAttention] = useState(undefined)
  const [attentionThreshold, setAttentionThreshold] = useState(70)

  useEffect(() => {
    setLoading(true)
    getCohortReport({ days })
      .then(data => {
        setCohort(data)
        setAttention(data?.attention || [])
        if (data?.attention_threshold_pct != null) setAttentionThreshold(data.attention_threshold_pct)
      })
      .catch(() => {
        setCohort(null)
        setAttention(prev => prev ?? [])
      })
      .finally(() => setLoading(false))
  }, [days])

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
          <div className="stat__value"><CountUp value={stats.active} /></div>
          <div className="stat__meta">
            <span className="muted">con dieta e bot attivo</span>
          </div>
        </article>

        <article className="stat">
          <div className="stat__label">Pazienti senza dieta</div>
          <div className="stat__value"><CountUp value={stats.nodiet} /></div>
          <div className="stat__meta">
            <span className="stat__delta--warn">●</span>
            <span className="muted">in attesa di un piano dietetico</span>
          </div>
        </article>

        <article className="stat">
          <div className="stat__label">Piani dietetici caricati</div>
          <div className="stat__value"><CountUp value={stats.diets} /></div>
          <div className="stat__meta">
            <span className="muted">ultimo: {stats.lastDiet}</span>
          </div>
        </article>
      </section>

      <AttentionAlert attention={attention} threshold={attentionThreshold} />

      <CohortSection
        days={days}
        setDays={setDays}
        cohort={cohort}
        loading={loading}
        metrics={metrics}
        onSaveMetrics={saveMetrics}
      />

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
