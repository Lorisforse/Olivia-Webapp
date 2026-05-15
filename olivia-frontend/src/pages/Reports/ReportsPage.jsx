import { useState, useEffect, useMemo } from 'react'
import { getPatients } from '../../api/patients'
import { Icon, StatPill, Avatar, AdherenceMeter } from '../../components/ui'
import { BarChart } from '../../components/ui'

function calcBmi(w, h) {
  if (!w || !h) return 0
  return +(w / ((h / 100) ** 2)).toFixed(1)
}

function deriveStatus(p) {
  if (p.chat_id == null) return 'pending'
  if (!p.active_diet_plan_id) return 'no-diet'
  return 'active'
}

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(' ').filter(Boolean)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function ReportsPage() {
  const [raw, setRaw] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPatients()
      .then(setRaw)
      .catch(() => setRaw([]))
      .finally(() => setLoading(false))
  }, [])

  const patients = useMemo(() => raw.map(p => ({
    ...p,
    fullName: p.name || '—',
    initials: getInitials(p.name),
    status: deriveStatus(p),
    bmi: calcBmi(p.weight, p.height),
    adherence: 0,
    weightTrend: [],
  })), [raw])

  const active = patients.filter(p => p.status === 'active')
  const avgAdh = 0
  const highAdh = 0
  const lowAdh = 0

  const bmiDist = [
    { label: 'Sottopeso',  v: patients.filter(p => p.bmi > 0 && p.bmi < 18.5).length,              color: '#8A96A3' },
    { label: 'Normopeso',  v: patients.filter(p => p.bmi >= 18.5 && p.bmi < 25).length,             color: '#2E7D5E' },
    { label: 'Sovrappeso', v: patients.filter(p => p.bmi >= 25 && p.bmi < 30).length,               color: '#B45309' },
    { label: 'Obesità',    v: patients.filter(p => p.bmi >= 30).length,                              color: '#8E3A0A' },
  ]
  const maxBmi = Math.max(...bmiDist.map(x => x.v), 1)

  const goalDist = {}
  patients.forEach(p => { if (p.goal) goalDist[p.goal] = (goalDist[p.goal] || 0) + 1 })
  const goalEntries = Object.entries(goalDist).sort((a, b) => b[1] - a[1])
  const maxGoal = Math.max(...goalEntries.map(x => x[1]), 1)

  const agg14 = Array.from({ length: 14 }, () => 0)

  if (loading) return <div className="screen" style={{ padding: 48, textAlign: 'center', color: '#7B8A99' }}>Caricamento report…</div>

  return (
    <div className="screen">
      <div className="page-head">
        <div>
          <div className="breadcrumbs mono">Clinica &nbsp;/&nbsp; Report clinici</div>
          <h1 className="page-title">Report clinici aggregati</h1>
          <div className="stat-pills">
            <StatPill label="coorte attiva" value={active.length} tone="green" />
            <StatPill label="aderenza media" value={`${avgAdh}%`} tone="blue" />
            <StatPill label="alta aderenza ≥80" value={highAdh} tone="green" />
            <StatPill label="bassa aderenza &lt;50" value={lowAdh} tone="amber" />
            <StatPill label="periodo" value="apr 2026" tone="neutral" />
          </div>
        </div>
        <div className="page-head__actions">
          <button className="btn btn--ghost"><Icon name="print" size={14} /> Stampa PDF</button>
          <button className="btn btn--primary"><Icon name="download" size={14} /> Esporta report</button>
        </div>
      </div>

      <div className="reports-grid">
        <div className="card card--pad chart-card" style={{ gridColumn: 'span 2' }}>
          <div className="chart-card__head">
            <div>
              <div className="mono eyebrow">ADERENZA COORTE · 14 GIORNI</div>
              <div className="chart-card__val">
                <span className="mono big">{avgAdh}%</span>
                <span className="muted small">media giornaliera</span>
              </div>
            </div>
            <span className="chart-card__target mono">target ≥ 80%</span>
          </div>
          <BarChart data={agg14} labels={Array.from({ length: 14 }, (_, i) => `${i + 1}`)} width={900} height={200} color="#1B4F8A" targetLine={80} />
          <p className="muted small" style={{ marginTop: 8 }}>I dati di aderenza vengono popolati automaticamente dal bot Telegram.</p>
        </div>

        <div className="card card--pad chart-card">
          <div className="chart-card__head">
            <div><div className="mono eyebrow">DISTRIBUZIONE BMI</div></div>
          </div>
          <div className="hbars">
            {bmiDist.map(b => (
              <div key={b.label} className="hbar">
                <div className="hbar__l">{b.label}</div>
                <div className="hbar__track">
                  <div className="hbar__fill" style={{ width: `${b.v / maxBmi * 100}%`, background: b.color }} />
                </div>
                <div className="hbar__v mono">{b.v}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card card--pad chart-card">
          <div className="chart-card__head">
            <div><div className="mono eyebrow">OBIETTIVI CLINICI</div></div>
          </div>
          <div className="hbars">
            {goalEntries.length === 0 && <p className="muted small">Nessun obiettivo configurato.</p>}
            {goalEntries.map(([g, v]) => (
              <div key={g} className="hbar">
                <div className="hbar__l">{g}</div>
                <div className="hbar__track">
                  <div className="hbar__fill" style={{ width: `${v / maxGoal * 100}%`, background: '#1B4F8A' }} />
                </div>
                <div className="hbar__v mono">{v}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card card--pad chart-card" style={{ gridColumn: 'span 2' }}>
          <div className="chart-card__head">
            <div>
              <div className="mono eyebrow">ELENCO PAZIENTI</div>
              <div className="muted small" style={{ marginTop: 4 }}>Tutti i pazienti registrati</div>
            </div>
          </div>
          <table className="ptable ptable--simple">
            <thead>
              <tr>
                <th style={{ width: 30 }}>#</th>
                <th>Paziente</th>
                <th>Obiettivo</th>
                <th>BMI</th>
                <th>Stato</th>
                <th>Aderenza</th>
              </tr>
            </thead>
            <tbody>
              {patients.slice(0, 10).map((p, i) => (
                <tr key={p.id}>
                  <td className="mono muted">{i + 1}</td>
                  <td>
                    <div className="cell-patient">
                      <Avatar initials={p.initials} size={24} tone={i % 5} />
                      <span>{p.fullName}</span>
                    </div>
                  </td>
                  <td className="muted">{p.goal || '—'}</td>
                  <td className="mono">{p.bmi > 0 ? p.bmi : '—'}</td>
                  <td className="muted">{p.status}</td>
                  <td><AdherenceMeter value={p.adherence} width={140} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
