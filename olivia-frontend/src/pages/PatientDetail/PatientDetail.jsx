import { useState, useEffect } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { getPatient, updatePatient, getPatientLogs, getPatientDiet, getPatientOnboarding, getDailyReports, deactivatePatient, reactivatePatient } from '../../api/patients'
import { downloadDietPdf } from '../../api/diets'
import LoadingScreen from '../../components/LoadingScreen'
import Breadcrumb from '../../components/Breadcrumb'
import WeeklyPlanGrid from '../../components/WeeklyPlanGrid'
import DeactivatePatientModal from '../../components/DeactivatePatientModal'
import ReactivatePatientModal from '../../components/ReactivatePatientModal'
import SuccessOverlay from '../../components/SuccessOverlay'
import { BarTrend, LineTrend, AdherenceStrip, CategoryStrip, SLEEP_TONE, HUNGER_TONE } from '../../components/charts'
import { splitList } from '../../utils/text'
import { saveBlob, saveDataUri, svgToPngDataUri, printImage } from '../../utils/download'
import { useMinDuration } from '../../hooks/useMinDuration'
import TimePicker from '../../components/TimePicker'
import GoalSelect from '../../components/GoalSelect'

function deriveStatus(p) {
  if (p.active === false) return 'inactive'
  if (!p.active_diet_plan_id) return 'nodiet'
  if (!p.chat_id) return 'waiting'
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

// Paziente silenzioso: pallino verde/giallo/rosso in base a quanto tempo è
// passato dall'ultimo messaggio al bot, null per chi non si è mai collegato.
function activityDotTone(dt) {
  if (!dt) return null
  const days = (Date.now() - new Date(dt)) / 86400000
  if (days < 2) return 'good'
  if (days < 7) return 'warn'
  return 'bad'
}
const ACTIVITY_DOT_TITLE = {
  good: 'Attivo di recente',
  warn: 'Non scrive al bot da qualche giorno',
  bad: 'Non scrive al bot da almeno una settimana',
}

const STATUS_CONFIG = {
  active:   { label: 'Attivo',      pill: 'ok' },
  nodiet:   { label: 'Senza dieta', pill: 'warn' },
  waiting:  { label: 'In attesa',   pill: 'wait' },
  inactive: { label: 'Disattivato', pill: 'off' },
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
function PauseIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
}
function PlayIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="6 3 20 12 6 21 6 3" /></svg>
}
function DownloadIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
}
function PrinterIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
}

function slugify(value) {
  return (value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'paziente'
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
    wakes_up_at: patient.wakes_up_at || '',
    goes_to_sleep_at: patient.goes_to_sleep_at || '',
    breakfast_at: patient.breakfast_at || '',
    lunch_at: patient.lunch_at || '',
    dinner_at: patient.dinner_at || '',
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
                <GoalSelect id="eGoal" value={form.goal} onChange={v => setForm(f => ({...f, goal: v}))} emptyLabel="—" />
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
              <div className="field">
                <label htmlFor="eWake">Orario sveglia</label>
                <TimePicker id="eWake" value={form.wakes_up_at} onChange={v => setForm(f => ({...f, wakes_up_at: v}))} defaultTime="07:00" />
              </div>
              <div className="field">
                <label htmlFor="eBreakfast">Colazione</label>
                <TimePicker id="eBreakfast" value={form.breakfast_at} onChange={v => setForm(f => ({...f, breakfast_at: v}))} defaultTime="08:00" />
              </div>
              <div className="field">
                <label htmlFor="eLunch">Pranzo</label>
                <TimePicker id="eLunch" value={form.lunch_at} onChange={v => setForm(f => ({...f, lunch_at: v}))} defaultTime="13:00" />
              </div>
              <div className="field">
                <label htmlFor="eDinner">Cena</label>
                <TimePicker id="eDinner" value={form.dinner_at} onChange={v => setForm(f => ({...f, dinner_at: v}))} defaultTime="20:00" />
              </div>
              <div className="field">
                <label htmlFor="eSleep">Orario in cui va a dormire</label>
                <TimePicker id="eSleep" value={form.goes_to_sleep_at} onChange={v => setForm(f => ({...f, goes_to_sleep_at: v}))} defaultTime="22:00" />
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
              {patient.last_interaction_at ? (
                <>
                  <span
                    className={`activity-dot activity-dot--${activityDotTone(patient.last_interaction_at)}`}
                    title={ACTIVITY_DOT_TITLE[activityDotTone(patient.last_interaction_at)]}
                  />
                  Ultima interazione: {formatLastSeen(patient.last_interaction_at)}
                </>
              ) : 'Il paziente non ha ancora attivato il bot'}
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

      <div className="card mt-16">
        <div className="card__header">
          <h2 className="card__title">Abitudini</h2>
        </div>
        <div className="card__body" style={{ padding: '4px 24px 22px' }}>
          <dl className="kv">
            <dt>Orario sveglia</dt>            <dd>{patient.wakes_up_at || '—'}</dd>
            <dt>Colazione</dt>                 <dd>{patient.breakfast_at || '—'}</dd>
            <dt>Pranzo</dt>                    <dd>{patient.lunch_at || '—'}</dd>
            <dt>Cena</dt>                      <dd>{patient.dinner_at || '—'}</dd>
            <dt>Orario in cui va a dormire</dt><dd>{patient.goes_to_sleep_at || '—'}</dd>
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

function copyText(value, onDone) {
  const fallback = () => {
    try {
      const ta = document.createElement('textarea')
      ta.value = value
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
      onDone()
    } catch { /* l'utente può comunque selezionare il testo a mano */ }
  }
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(value).then(onDone, fallback)
  } else {
    fallback()
  }
}

function OnboardingPanel({ patientId, patientName }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const showLoading = useMinDuration(loading)
  const [error, setError] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [copied, setCopied] = useState('')

  function load({ silent = false } = {}) {
    if (silent) setRefreshing(true)
    else { setLoading(true); setError(false) }
    getPatientOnboarding(patientId)
      .then(res => {
        if (silent && res.connected && data && !data.connected) {
          window.location.reload()
          return
        }
        setData(res)
      })
      .catch(() => { if (!silent) setError(true) })
      .finally(() => { setLoading(false); setRefreshing(false) })
  }

  useEffect(() => { load() }, [patientId])

  function copy(value, key) {
    copyText(value, () => { setCopied(key); setTimeout(() => setCopied(''), 1600) })
  }

  async function downloadQr() {
    const filename = `qr-${slugify(patientName)}`
    try {
      const pngUri = await svgToPngDataUri(data.qr_svg)
      saveDataUri(pngUri, `${filename}.png`)
    } catch {
      saveDataUri(data.qr_svg, `${filename}.svg`)
    }
  }

  if (showLoading) return <LoadingScreen label="Preparazione onboarding…" />

  if (error || !data) {
    return (
      <div className="card">
        <div className="card__body">
          <div className="empty-state">
            <div className="empty-state__icon"><ChatIcon /></div>
            <h3>Onboarding non disponibile</h3>
            <p>Non è stato possibile generare il QR di collegamento. Riprova più tardi.</p>
          </div>
        </div>
      </div>
    )
  }

  if (data.connected) {
    return (
      <div className="card">
        <div className="card__header">
          <h2 className="card__title">Collega il paziente al bot</h2>
          <span className="pill pill--ok">Collegato</span>
        </div>
        <div className="card__body">
          <p className="muted" style={{ fontSize: 13.5, margin: 0 }}>
            Il paziente ha avviato il bot ed è collegato a questa scheda. Da qui in poi
            pasti, peso e umore vengono registrati in automatico.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card__header">
        <h2 className="card__title">Collega il paziente al bot</h2>
        <div className="card__header-actions">
          <button className="btn btn--secondary btn--sm" onClick={() => load({ silent: true })} disabled={refreshing}>
            {refreshing ? 'Controllo…' : 'Ricontrolla'}
          </button>
          <span className="pill pill--wait">In attesa</span>
        </div>
      </div>
      <div className="card__body">
        <div className="onboarding-grid">
          <div className="onboarding-qr-col">
            <img className="onboarding-qr" src={data.qr_svg} alt="QR code per collegare il paziente al bot Telegram" width={200} height={200} />
            <div className="onboarding-qr-actions">
              <button className="btn btn--secondary btn--sm" onClick={downloadQr}>
                <DownloadIcon /> Scarica
              </button>
              <button
                className="btn btn--secondary btn--sm"
                onClick={() => printImage(data.qr_svg, {
                  title: patientName || 'Collegamento paziente',
                  subtitle: 'Inquadra con la fotocamera del telefono per collegarti al bot Olivia',
                })}
              >
                <PrinterIcon /> Stampa
              </button>
            </div>
          </div>
          <div className="onboarding-info">
            <p className="onboarding-hint">
              Il paziente inquadra il QR con la fotocamera del telefono: il bot si apre con
              il messaggio di collegamento già pronto, basta premere invio. In alternativa,
              aprire il link qui sotto.
            </p>
            <div className="onboarding-link">
              <code>{data.deep_link}</code>
              <button className="btn btn--secondary btn--sm" onClick={() => copy(data.deep_link, 'link')}>
                {copied === 'link' ? 'Copiato' : 'Copia link'}
              </button>
            </div>
            <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
              Il collegamento vale solo per questo paziente. Finché non lo avvia, la scheda resta “In attesa”.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function BotTab({ patientId, status, patientName }) {
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
    return <OnboardingPanel patientId={patientId} patientName={patientName} />
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

const TREND_PERIODS = [[7, '7gg'], [30, '30gg'], [90, '90gg']]
const MEAL_FIELDS = ['breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner']
const ADHERENCE_SCORE = { completa: 1, parziale: 0.5, nulla: 0 }
const SATISFACTION_SCORE = { soddisfatto: 1, neutro: 0.5, insoddisfatto: 0 }
const HEATMAP_DAYS = 30

function dayMealPct(mealIndicators, scoreMap) {
  if (!mealIndicators) return null
  const scores = MEAL_FIELDS
    .map(f => mealIndicators[f])
    .filter(v => v in scoreMap)
    .map(v => scoreMap[v])
  if (!scores.length) return null
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100)
}

function dayAdherencePct(dietCompliance) {
  return dayMealPct(dietCompliance, ADHERENCE_SCORE)
}

function daySatisfactionPct(mealSatisfaction) {
  return dayMealPct(mealSatisfaction, SATISFACTION_SCORE)
}

function dayMoodAvg(mood) {
  if (!mood) return null
  const vals = [mood.morning, mood.afternoon, mood.evening].filter(v => v != null)
  if (!vals.length) return null
  return +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)
}

function formatShortDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
}

function isoDaysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)
}

function TrendsTab({ patientId, status }) {
  const [days, setDays] = useState(30)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'waiting') { setLoading(false); return }
    setLoading(true)
    const fetchDays = Math.max(days, HEATMAP_DAYS)
    getDailyReports(patientId, { from: isoDaysAgo(fetchDays - 1), to: isoDaysAgo(0) })
      .then(setReports)
      .catch(() => setReports([]))
      .finally(() => setLoading(false))
  }, [patientId, days, status])

  if (status === 'waiting') {
    return (
      <div className="card">
        <div className="card__body">
          <div className="empty-state">
            <div className="empty-state__icon"><ChatIcon /></div>
            <h3>Nessun dato ancora</h3>
            <p>L&#39;andamento comparirà non appena il paziente sarà collegato al bot.</p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) return <LoadingScreen label="Caricamento andamento…" />

  const byDate = {}
  reports.forEach(r => { byDate[r.date] = r })

  const weightData = [], hydrationData = [], moodData = [], satisfactionData = [], messagesData = []
  for (let i = days - 1; i >= 0; i--) {
    const dateStr = isoDaysAgo(i)
    const r = byDate[dateStr]
    const label = formatShortDate(dateStr)
    weightData.push({ label, value: r?.indicators?.weight ?? null })
    hydrationData.push({ label, value: r?.indicators?.hydration != null ? Math.round(r.indicators.hydration) : null })
    moodData.push({ label, value: dayMoodAvg(r?.indicators?.mood) })
    satisfactionData.push({ label, value: daySatisfactionPct(r?.indicators?.meal_satisfaction) })
    messagesData.push({ label, value: r?.indicators?.engagement?.messages_sent ?? null })
  }

  const strip = [], sleepStrip = [], hungerStrip = []
  for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
    const dateStr = isoDaysAgo(i)
    const dayReport = byDate[dateStr]
    const label = formatShortDate(dateStr)
    const pct = dayAdherencePct(dayReport?.indicators?.diet_compliance)
    strip.push({ date: dateStr, label, tone: pct == null ? 'none' : pct >= 70 ? 'good' : 'warn' })
    sleepStrip.push({ date: dateStr, label, tone: dayReport?.indicators?.sleep_quality || 'none' })
    hungerStrip.push({ date: dateStr, label, tone: dayReport?.indicators?.hunger || 'none' })
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h2 className="page-eyebrow" style={{ margin: 0 }}>Andamento</h2>
        <div className="period-select" role="group" aria-label="Periodo">
          {TREND_PERIODS.map(([v, l]) => (
            <button key={v} className={days === v ? 'active' : ''} onClick={() => setDays(v)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card__header"><h2 className="card__title">Peso</h2></div>
        <div className="card__body">
          <LineTrend data={weightData} unit=" kg" color="var(--brand)" emptyLabel="Nessun peso registrato nel periodo" />
        </div>
      </div>

      <div className="card mt-16">
        <div className="card__header"><h2 className="card__title">Aderenza pasti — ultimi 30 giorni</h2></div>
        <div className="card__body">
          <AdherenceStrip days={strip} />
        </div>
      </div>

      <div className="card mt-16">
        <div className="card__header"><h2 className="card__title">Gradimento pasti</h2></div>
        <div className="card__body">
          <BarTrend data={satisfactionData} unit="%" color="#C08552" emptyLabel="Nessun gradimento registrato nel periodo" />
        </div>
      </div>

      <div className="card mt-16">
        <div className="card__header"><h2 className="card__title">Qualità del sonno — ultimi 30 giorni</h2></div>
        <div className="card__body">
          <CategoryStrip days={sleepStrip} legend={SLEEP_TONE} />
        </div>
      </div>

      <div className="card mt-16">
        <div className="card__header"><h2 className="card__title">Livello di fame — ultimi 30 giorni</h2></div>
        <div className="card__body">
          <CategoryStrip days={hungerStrip} legend={HUNGER_TONE} />
        </div>
      </div>

      <div className="card mt-16">
        <div className="card__header"><h2 className="card__title">Idratazione</h2></div>
        <div className="card__body">
          <BarTrend data={hydrationData} target={2000} unit=" ml" color="#8FB8CC" height={120} emptyLabel="Nessuna idratazione registrata nel periodo" />
        </div>
      </div>

      <div className="card mt-16">
        <div className="card__header"><h2 className="card__title">Messaggi scambiati col bot</h2></div>
        <div className="card__body">
          <BarTrend data={messagesData} emptyLabel="Nessun messaggio registrato nel periodo" color="#7A9E8E" height={120} />
        </div>
      </div>

      <div className="card mt-16">
        <div className="card__header"><h2 className="card__title">Umore</h2></div>
        <div className="card__body">
          <LineTrend data={moodData} color="#B98A3E" emptyLabel="Nessun umore registrato nel periodo" />
          <p className="muted" style={{ fontSize: 12, marginTop: 10, marginBottom: 0 }}>
            Scala da -1 (negativo) a +1 (positivo), media delle rilevazioni della giornata.
          </p>
        </div>
      </div>
    </div>
  )
}

function DietTab({ patientId }) {
  const [diet, setDiet] = useState(null)
  const [loading, setLoading] = useState(true)
  const showLoading = useMinDuration(loading)
  const [downloading, setDownloading] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    setLoading(true)
    getPatientDiet(patientId)
      .then(setDiet)
      .catch(err => { if (err.status !== 404) setMsg('Errore nel caricamento del piano'); setDiet(null) })
      .finally(() => setLoading(false))
  }, [patientId])

  async function handleDownload() {
    setDownloading(true)
    try {
      const { blob, filename } = await downloadDietPdf(diet.id)
      saveBlob(blob, filename)
    } catch {
      setMsg('Impossibile scaricare il PDF')
      setTimeout(() => setMsg(''), 2400)
    } finally {
      setDownloading(false)
    }
  }

  if (showLoading) return <LoadingScreen label="Caricamento piano alimentare…" />

  if (!diet) {
    return (
      <div className="card">
        <div className="card__body">
          <div className="empty-state">
            <div className="empty-state__icon"><MealIcon /></div>
            <h3>Nessun piano assegnato</h3>
            <p>Assegna un piano dietetico a questo paziente dalla sezione <strong>Diete</strong>.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="card">
        <div className="card__header">
          <h2 className="card__title">{diet.name}</h2>
          {diet.has_pdf && (
            <button className="btn btn--secondary btn--sm" onClick={handleDownload} disabled={downloading}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {downloading ? 'Scaricamento…' : 'Scarica PDF'}
            </button>
          )}
        </div>
        <div className="card__body">
          <WeeklyPlanGrid plan={diet.weekly_plan} />
        </div>
      </div>

      {Array.isArray(diet.tips) && diet.tips.length > 0 && (
        <div className="card mt-16">
          <div className="card__header"><h2 className="card__title">Consigli alimentari</h2></div>
          <div className="card__body">
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.65 }}>
              {diet.tips.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>
        </div>
      )}

      {typeof diet.substitutions === 'string' && diet.substitutions.trim() && (
        <div className="card mt-16">
          <div className="card__header"><h2 className="card__title">Sostituzioni</h2></div>
          <div className="card__body" style={{ fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
            {diet.substitutions}
          </div>
        </div>
      )}

      <div className={`toast${msg ? ' show' : ''}`}>{msg}</div>
    </div>
  )
}

const TABS = ['profile', 'diet', 'bot', 'trends']

export default function PatientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [patient, setPatient] = useState(null)
  const [activeTab, setActiveTab] = useState(() => {
    const t = new URLSearchParams(location.search).get('tab')
    return TABS.includes(t) ? t : 'profile'
  })
  const [loading, setLoading] = useState(true)
  const showLoading = useMinDuration(loading)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState('')
  const [deactivateModal, setDeactivateModal] = useState(false)
  const [reactivateModal, setReactivateModal] = useState(false)
  const [statusOverlay, setStatusOverlay] = useState(null)

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
      allergies: splitList(form.allergies),
      wakes_up_at: form.wakes_up_at || null,
      goes_to_sleep_at: form.goes_to_sleep_at || null,
      breakfast_at: form.breakfast_at || null,
      lunch_at: form.lunch_at || null,
      dinner_at: form.dinner_at || null,
    })
    setPatient(p => ({ ...p, ...form }))
    setToast('Scheda aggiornata')
    setTimeout(() => setToast(''), 2000)
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  async function handleConfirmDeactivate() {
    await deactivatePatient(id)
    setPatient(p => ({ ...p, active: false }))
    setDeactivateModal(false)
    setStatusOverlay({
      icon: 'pause', tone: 'warn',
      title: 'Paziente disattivato',
      message: `${patient.name || 'Il paziente'} non riceverà più risposte dal bot.`,
    })
  }

  async function handleConfirmReactivate() {
    await reactivatePatient(id)
    setPatient(p => ({ ...p, active: true }))
    setReactivateModal(false)
    setStatusOverlay({
      icon: 'check', tone: 'brand',
      title: 'Paziente riattivato',
      message: `${patient.name || 'Il paziente'} torna a essere seguito dal bot.`,
    })
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
      <Breadcrumb parent="Pazienti" parentTo="/pazienti" current={patient.name || 'Paziente'} />
      <main className="page">
        <div className={`patient-header${status === 'inactive' ? ' is-inactive' : ''}`}>
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
            {status !== 'inactive' && (
              <button className="btn btn--secondary btn--sm" onClick={() => navigate(`/agenda?paziente=${id}`)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                Appuntamento
              </button>
            )}
            {status === 'inactive' ? (
              <button className="btn btn--secondary btn--sm" onClick={() => setReactivateModal(true)}>
                <PlayIcon /> Riattiva
              </button>
            ) : (
              <button className="btn btn--secondary btn--sm" onClick={() => setDeactivateModal(true)}>
                <PauseIcon /> Disattiva
              </button>
            )}
          </div>
        </div>

        <nav className="tabs" role="tablist">
          {[['profile', 'Profilo'], ['diet', 'Piano alimentare'], ['bot', 'Attività bot'], ['trends', 'Andamento']].map(([id, label]) => (
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
        {activeTab === 'diet' && <DietTab patientId={patient.id} />}
        {activeTab === 'bot' && <BotTab patientId={patient.id} status={status} patientName={patient.name} />}
        {activeTab === 'trends' && <TrendsTab patientId={patient.id} status={status} />}
      </main>

      <DeactivatePatientModal
        patient={deactivateModal ? patient : null}
        onCancel={() => setDeactivateModal(false)}
        onConfirm={handleConfirmDeactivate}
      />

      <ReactivatePatientModal
        patient={reactivateModal ? patient : null}
        onCancel={() => setReactivateModal(false)}
        onConfirm={handleConfirmReactivate}
      />

      <SuccessOverlay
        show={!!statusOverlay}
        icon={statusOverlay?.icon}
        tone={statusOverlay?.tone}
        confetti={false}
        duration={2200}
        title={statusOverlay?.title}
        message={statusOverlay?.message}
        onDone={() => setStatusOverlay(null)}
      />

      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
    </>
  )
}
