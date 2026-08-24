import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getPatient, updatePatient, getPatientLogs } from '../../api/patients'
import LoadingScreen from '../../components/LoadingScreen'
import { useMinDuration } from '../../hooks/useMinDuration'

function deriveStatus(p) {
  if (!p.chat_id) return 'waiting'
  if (!p.active_diet_plan_id) return 'nodiet'
  return 'active'
}

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function calcBmi(w, h) {
  if (!w || !h) return null
  return (w / ((h / 100) ** 2)).toFixed(1)
}

function bmiCategory(bmi) {
  if (!bmi) return { label: '—', tone: 'wait' }
  const v = +bmi
  if (v < 18.5) return { label: 'Sottopeso', tone: 'warn' }
  if (v < 25)   return { label: 'Normopeso', tone: 'ok' }
  if (v < 30)   return { label: 'Sovrappeso', tone: 'warn' }
  return { label: 'Obesità', tone: 'warn' }
}

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatLastSeen(dt) {
  if (!dt) return '—'
  const diffH = Math.round((Date.now() - new Date(dt)) / 3600000)
  if (diffH < 1) return 'Poco fa'
  if (diffH < 24) return `${diffH}h fa`
  return `${Math.floor(diffH / 24)}g fa`
}

const STATUS_CONFIG = {
  active:  { label: 'Attivo',      pill: 'ok' },
  nodiet:  { label: 'Senza dieta', pill: 'warn' },
  waiting: { label: 'In attesa',   pill: 'wait' },
}

function MealIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>
}
function WaterIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
}
function WeightIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
}
function MoodIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
}
function ChatIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
}

function ProfileTab({ patient, onSave }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    name: patient.name || '',
    gender: patient.gender || '',
    living_at: patient.living_at || '',
    weight: patient.weight ?? '',
    height: patient.height ?? '',
    goal: patient.goal || '',
    allergies: Array.isArray(patient.allergies)
      ? patient.allergies.join(', ')
      : (patient.allergies || ''),
    notes: patient.notes || '',
  })

  const bmi = calcBmi(form.weight, form.height)
  const bmiCat = bmiCategory(bmi)

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(form)
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <div>
        <div className="card">
          <div className="card__header">
            <h2 className="card__title">Modifica scheda</h2>
            {saved && <span className="pill pill--ok">Salvato</span>}
          </div>
          <div className="card__body">
            <div className="form-grid">
              <div className="field">
                <label htmlFor="eName">Nome completo</label>
                <input className="input" id="eName" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
              </div>
              <div className="field">
                <label htmlFor="eGender">Sesso</label>
                <select className="select" id="eGender" value={form.gender} onChange={e => setForm(f => ({...f, gender: e.target.value}))}>
                  <option value="Femmina">Femminile</option>
                  <option value="Maschio">Maschile</option>
                  <option value="Non specificato">Non specificato</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="eCity">Città</label>
                <input className="input" id="eCity" value={form.living_at} onChange={e => setForm(f => ({...f, living_at: e.target.value}))} />
              </div>
              <div className="field">
                <label htmlFor="eGoal">Obiettivo</label>
                <select className="select" id="eGoal" value={form.goal} onChange={e => setForm(f => ({...f, goal: e.target.value}))}>
                  <option value="">—</option>
                  <option>Perdita di peso</option>
                  <option>Mantenimento</option>
                  <option>Aumento massa</option>
                  <option>Riduzione colesterolo</option>
                  <option>Regolarizzazione glicemia</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="eWeight">Peso</label>
                <div className="input-wrap">
                  <input className="input input--with-suffix" id="eWeight" type="number" step="0.1" value={form.weight} onChange={e => setForm(f => ({...f, weight: e.target.value}))} />
                  <span className="suffix">kg</span>
                </div>
              </div>
              <div className="field">
                <label htmlFor="eHeight">Altezza</label>
                <div className="input-wrap">
                  <input className="input input--with-suffix" id="eHeight" type="number" step="1" value={form.height} onChange={e => setForm(f => ({...f, height: e.target.value}))} />
                  <span className="suffix">cm</span>
                </div>
              </div>
              <div className="field field--full">
                <label htmlFor="eAllergies">Allergie / intolleranze</label>
                <textarea className="textarea" id="eAllergies" value={form.allergies} onChange={e => setForm(f => ({...f, allergies: e.target.value}))} />
              </div>
              <div className="field field--full">
                <label htmlFor="eNotes">Note cliniche</label>
                <textarea className="textarea" id="eNotes" rows={4} value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} />
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button className="btn btn--ghost" onClick={() => setEditing(false)}>Annulla</button>
          <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvataggio…' : 'Salva modifiche'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="profile-grid">
        <div className="card">
          <div className="card__header">
            <h2 className="card__title">Dati anagrafici</h2>
          </div>
          <div className="card__body" style={{ padding: '4px 24px 22px' }}>
            <dl className="kv">
              <dt>Nome</dt>         <dd>{patient.name || '—'}</dd>
              <dt>Sesso</dt>        <dd>{patient.gender || '—'}</dd>
              <dt>Età</dt>          <dd>{patient.age ? `${patient.age} anni` : '—'}</dd>
              <dt>Città</dt>        <dd>{patient.living_at || '—'}</dd>
              <dt>Registrato il</dt><dd>{formatDate(patient.created_at)}</dd>
            </dl>
          </div>
        </div>

        <div className="card">
          <div className="card__header">
            <h2 className="card__title">Stato bot</h2>
          </div>
          <div className="card__body">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: patient.chat_id ? 'var(--brand)' : 'var(--ink-5)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                {patient.chat_id ? 'Connesso a Telegram' : 'Non connesso'}
              </span>
            </div>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
              {patient.last_interaction_at
                ? 'Ultima interazione: ' + formatLastSeen(patient.last_interaction_at)
                : 'Il paziente non ha ancora attivato il bot'}
            </div>
            {patient.chat_id && (
              <>
                <div className="divider" />
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-4)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Chat ID</div>
                <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{patient.chat_id}</div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="card mt-16">
        <div className="card__header">
          <h2 className="card__title">Dati clinici</h2>
        </div>
        <div className="card__body" style={{ padding: '4px 24px 22px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            <div className="bot-metric">
              <div className="bot-metric__label">Peso attuale</div>
              <div className="bot-metric__value">
                {patient.weight ? `${parseFloat(patient.weight).toFixed(1)}` : '—'}
                {patient.weight && <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-4)' }}> kg</span>}
              </div>
            </div>
            <div className="bot-metric">
              <div className="bot-metric__label">Altezza</div>
              <div className="bot-metric__value">
                {patient.height || '—'}
                {patient.height && <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-4)' }}> cm</span>}
              </div>
            </div>
            <div className="bot-metric">
              <div className="bot-metric__label">BMI</div>
              <div className="bot-metric__value">{bmi || '—'}</div>
              {bmi && <div className="bot-metric__sub"><span className={`pill pill--${bmiCat.tone}`} style={{ height: 18, fontSize: 10.5, padding: '0 8px' }}>{bmiCat.label}</span></div>}
            </div>
            <div className="bot-metric">
              <div className="bot-metric__label">Obiettivo</div>
              <div className="bot-metric__value" style={{ fontSize: 16, lineHeight: 1.3, marginTop: 8 }}>{patient.goal || '—'}</div>
            </div>
          </div>
          <div className="divider" />
          <dl className="kv" style={{ paddingTop: 0 }}>
            <dt>Allergie / intolleranze</dt>
            <dd>{patient.allergies
              ? (Array.isArray(patient.allergies) ? patient.allergies.join(', ') : patient.allergies)
              : <span className="muted">Nessuna nota</span>
            }</dd>
          </dl>
        </div>
      </div>

      {patient.notes && (
        <div className="card mt-16">
          <div className="card__header">
            <h2 className="card__title">Note cliniche</h2>
          </div>
          <div className="card__body" style={{ color: 'var(--ink-2)', fontSize: 13.5, lineHeight: 1.65 }}>
            {patient.notes}
          </div>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <button className="btn btn--secondary" onClick={() => setEditing(true)}>Modifica scheda</button>
      </div>
    </div>
  )
}

function BotTab({ patientId, status }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const showLoading = useMinDuration(loading)

  useEffect(() => {
    if (status === 'waiting') { setLoading(false); return }
    const to = new Date().toISOString().slice(0, 10)
    const from = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)
    getPatientLogs(patientId, { from, to })
      .then(data => setLogs(data?.days || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }, [patientId, status])

  if (status === 'waiting') {
    return (
      <div className="card">
        <div className="card__body">
          <div className="empty-state">
            <div className="empty-state__icon"><ChatIcon /></div>
            <h3>Bot non ancora attivato</h3>
            <p>Il paziente non ha ancora connesso il bot Telegram. Invia il link di onboarding per iniziare la registrazione di pasti, peso e umore.</p>
            <button className="btn btn--primary btn--sm">Invia link di onboarding</button>
          </div>
        </div>
      </div>
    )
  }

  if (showLoading) return <LoadingScreen label="Caricamento attività bot…" />

  if (!logs.length) {
    return (
      <div className="card">
        <div className="card__body">
          <div className="empty-state">
            <div className="empty-state__icon"><ChatIcon /></div>
            <h3>Nessuna attività registrata</h3>
            <p>Il bot non ha ancora registrato interazioni negli ultimi 7 giorni.</p>
          </div>
        </div>
      </div>
    )
  }

  const lastDay = logs[logs.length - 1]
  const totalWaterMl = (lastDay.hydrations || []).reduce((s, h) => s + (h.value_ml || 0), 0)
  const lastWeight = (lastDay.weights || []).slice(-1)[0]?.value_kg
  const moodEntry = (lastDay.wellness || []).find(w => w.type === 'mood')
  const mealsDone = logs.reduce((s, d) => s + (d.meals || []).length, 0)
  const totalMeals = logs.length * 5
  const adherencePct = totalMeals > 0 ? Math.round(mealsDone / totalMeals * 100) : 0

  const DOW = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']

  return (
    <div>
      <div className="bot-metrics">
        <div className="bot-metric">
          <div className="bot-metric__label">Aderenza 7gg</div>
          <div className="bot-metric__value">{adherencePct}<span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-4)' }}>%</span></div>
          <div className="bot-metric__sub" style={{ color: 'var(--brand)' }}>ultimi 7 giorni</div>
        </div>
        <div className="bot-metric">
          <div className="bot-metric__label">Peso (ultimo)</div>
          <div className="bot-metric__value">
            {lastWeight ? lastWeight.toFixed(1) : '—'}
            {lastWeight && <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-4)' }}> kg</span>}
          </div>
        </div>
        <div className="bot-metric">
          <div className="bot-metric__label">Idratazione oggi</div>
          <div className="bot-metric__value">
            {totalWaterMl > 0 ? (totalWaterMl / 1000).toFixed(1) : '—'}
            {totalWaterMl > 0 && <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-4)' }}> L</span>}
          </div>
          <div className="bot-metric__sub">obiettivo 2,0 L</div>
        </div>
        <div className="bot-metric">
          <div className="bot-metric__label">Umore</div>
          <div className="bot-metric__value">{moodEntry?.mood || '—'}</div>
        </div>
      </div>

      <div className="card">
        <div className="card__header">
          <h2 className="card__title">Log conversazione</h2>
          <span className="muted" style={{ fontSize: 12 }}>Telegram · sola lettura</span>
        </div>
        <div className="feed">
          {logs.slice().reverse().map(day => {
            const d = new Date(day.date + 'T12:00:00')
            const label = `${DOW[d.getDay()]} ${d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}`
            const items = []
            ;(day.meals || []).forEach((m, i) => {
              items.push({
                type: 'meal',
                time: '—',
                title: m.meal_type || 'Pasto',
                desc: (m.food || []).join(', ') || '—',
                badge: m.adherence || 'n.d.',
                tone: (m.adherence || '').toLowerCase().includes('complet') ? 'ok' : 'wait',
              })
            })
            ;(day.weights || []).forEach(w => {
              items.push({
                type: 'weight',
                time: '—',
                title: 'Peso registrato',
                desc: `${w.value_kg} kg`,
                badge: null,
                tone: 'info',
              })
            })
            ;(day.hydrations || []).forEach(h => {
              items.push({
                type: 'water',
                time: '—',
                title: 'Idratazione',
                desc: `${h.value_ml} ml`,
                badge: null,
                tone: 'info',
              })
            })
            if (!items.length) return null
            return (
              <div key={day.date}>
                <div className="feed__day">{label}</div>
                {items.map((item, i) => (
                  <div key={i} className="feed__item">
                    <span className="feed__time">{item.time}</span>
                    <span className="feed__icon">
                      {item.type === 'meal' && <MealIcon />}
                      {item.type === 'water' && <WaterIcon />}
                      {item.type === 'weight' && <WeightIcon />}
                      {item.type === 'mood' && <MoodIcon />}
                    </span>
                    <div>
                      <div className="feed__title">{item.title}</div>
                      <div className="feed__desc">{item.desc}</div>
                    </div>
                    {item.badge && <span className={`pill pill--${item.tone}`}>{item.badge}</span>}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function PatientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [patient, setPatient] = useState(null)
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(true)
  const showLoading = useMinDuration(loading)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    setLoading(true)
    getPatient(id)
      .then(setPatient)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  async function handleSave(form) {
    await updatePatient(id, {
      ...form,
      weight: form.weight ? parseFloat(form.weight) : undefined,
      height: form.height ? parseFloat(form.height) : undefined,
    })
    setPatient(p => ({ ...p, ...form }))
    setToast('Scheda aggiornata')
    setTimeout(() => setToast(''), 2000)
  }

  if (showLoading) return <LoadingScreen label="Caricamento paziente…" />
  if (error || !patient) return (
    <div className="error-screen">
      {error || 'Paziente non trovato.'}
      <button className="btn btn--ghost" style={{ marginLeft: 16 }} onClick={() => navigate('/pazienti')}>← Pazienti</button>
    </div>
  )

  const status = deriveStatus(patient)
  const cfg = STATUS_CONFIG[status]
  const initials = getInitials(patient.name)
  const bmi = calcBmi(patient.weight, patient.height)

  return (
    <>
      <main className="page">
        <button className="back-link" onClick={() => navigate('/pazienti')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Tutti i pazienti
        </button>

        <div className="patient-header">
          <span className="patient-header__avatar">{initials}</span>
          <div>
            <h1 className="patient-header__name">{patient.name || '—'}</h1>
            <div className="patient-header__meta">
              <span className={`pill pill--${cfg.pill}`}>{cfg.label}</span>
              <span className="sep" />
              {patient.age && <span>{patient.age} anni</span>}
              {patient.gender && <><span className="sep" /><span>{patient.gender}</span></>}
              {patient.living_at && <><span className="sep" /><span>{patient.living_at}</span></>}
              {bmi && <><span className="sep" /><span>BMI {bmi}</span></>}
            </div>
          </div>
          <div className="patient-header__actions">
            <button className="btn btn--secondary btn--sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              Contatta
            </button>
          </div>
        </div>

        <nav className="tabs" role="tablist">
          {[['profile', 'Profilo'], ['bot', 'Attività bot']].map(([id, label]) => (
            <button
              key={id}
              className={`tab${activeTab === id ? ' active' : ''}`}
              onClick={() => setActiveTab(id)}
              role="tab"
            >
              {label}
            </button>
          ))}
        </nav>

        {activeTab === 'profile' && <ProfileTab patient={patient} onSave={handleSave} />}
        {activeTab === 'bot' && <BotTab patientId={patient.id} status={status} />}
      </main>

      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
    </>
  )
}
