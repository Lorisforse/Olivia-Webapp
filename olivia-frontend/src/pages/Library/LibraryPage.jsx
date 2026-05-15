import { useState, useMemo } from 'react'
import { Icon, StatPill } from '../../components/ui'

const FOOD_LIBRARY = [
  { name: 'Pasta integrale',   cat: 'Cereali',       kcal: 348, carb: 67,   prot: 13,  fat: 2.5,  portion: '80g',     unit: 'secco' },
  { name: 'Riso basmati',      cat: 'Cereali',       kcal: 355, carb: 78,   prot: 7,   fat: 0.6,  portion: '80g',     unit: 'secco' },
  { name: 'Farro perlato',     cat: 'Cereali',       kcal: 335, carb: 67,   prot: 15,  fat: 2,    portion: '70g',     unit: 'secco' },
  { name: 'Pane integrale',    cat: 'Cereali',       kcal: 225, carb: 41,   prot: 9,   fat: 3,    portion: '60g',     unit: '' },
  { name: 'Pollo (petto)',     cat: 'Carni',         kcal: 110, carb: 0,    prot: 23,  fat: 1.5,  portion: '150g',    unit: 'crudo' },
  { name: 'Tacchino (fesa)',   cat: 'Carni',         kcal: 107, carb: 0,    prot: 24,  fat: 1,    portion: '150g',    unit: 'crudo' },
  { name: 'Bresaola',          cat: 'Carni',         kcal: 151, carb: 0,    prot: 33,  fat: 2,    portion: '80g',     unit: '' },
  { name: 'Salmone',           cat: 'Pesce',         kcal: 208, carb: 0,    prot: 20,  fat: 13,   portion: '150g',    unit: 'crudo' },
  { name: 'Orata',             cat: 'Pesce',         kcal: 121, carb: 0,    prot: 20,  fat: 4,    portion: '180g',    unit: 'crudo' },
  { name: 'Merluzzo',          cat: 'Pesce',         kcal: 82,  carb: 0,    prot: 18,  fat: 0.7,  portion: '180g',    unit: 'crudo' },
  { name: 'Tonno al naturale', cat: 'Pesce',         kcal: 103, carb: 0,    prot: 24,  fat: 0.8,  portion: '80g',     unit: 'sgocciolato' },
  { name: 'Yogurt greco 0%',   cat: 'Latticini',     kcal: 59,  carb: 3.6,  prot: 10,  fat: 0.4,  portion: '150g',    unit: '' },
  { name: 'Ricotta vaccina',   cat: 'Latticini',     kcal: 146, carb: 3,    prot: 11,  fat: 10,   portion: '80g',     unit: '' },
  { name: 'Feta',              cat: 'Latticini',     kcal: 264, carb: 4,    prot: 14,  fat: 21,   portion: '30g',     unit: '' },
  { name: 'Uova intere',       cat: 'Uova',          kcal: 143, carb: 0.7,  prot: 13,  fat: 10,   portion: '2 uova',  unit: '' },
  { name: 'Ceci cotti',        cat: 'Legumi',        kcal: 139, carb: 21,   prot: 9,   fat: 2.6,  portion: '150g',    unit: 'cotti' },
  { name: 'Lenticchie',        cat: 'Legumi',        kcal: 116, carb: 20,   prot: 9,   fat: 0.4,  portion: '150g',    unit: 'cotte' },
  { name: 'Fagioli borlotti',  cat: 'Legumi',        kcal: 127, carb: 23,   prot: 9,   fat: 0.5,  portion: '150g',    unit: 'cotti' },
  { name: 'Mela',              cat: 'Frutta',        kcal: 52,  carb: 14,   prot: 0.3, fat: 0.2,  portion: '150g',    unit: '' },
  { name: 'Banana',            cat: 'Frutta',        kcal: 89,  carb: 23,   prot: 1,   fat: 0.3,  portion: '120g',    unit: '' },
  { name: 'Mirtilli',          cat: 'Frutta',        kcal: 57,  carb: 14,   prot: 0.7, fat: 0.3,  portion: '100g',    unit: '' },
  { name: 'Spinaci',           cat: 'Verdure',       kcal: 23,  carb: 3.6,  prot: 2.9, fat: 0.4,  portion: '200g',    unit: '' },
  { name: 'Broccoli',          cat: 'Verdure',       kcal: 34,  carb: 7,    prot: 2.8, fat: 0.4,  portion: '200g',    unit: '' },
  { name: 'Zucchine',          cat: 'Verdure',       kcal: 17,  carb: 3.1,  prot: 1.2, fat: 0.3,  portion: '200g',    unit: '' },
  { name: 'Mandorle',          cat: 'Frutta secca',  kcal: 579, carb: 22,   prot: 21,  fat: 50,   portion: '20g',     unit: '' },
  { name: 'Noci',              cat: 'Frutta secca',  kcal: 654, carb: 14,   prot: 15,  fat: 65,   portion: '15g',     unit: '' },
  { name: 'Olio EVO',          cat: 'Condimenti',    kcal: 884, carb: 0,    prot: 0,   fat: 100,  portion: '10g',     unit: '' },
]

function MacroRing({ carb, prot, fat, size = 140 }) {
  const total = carb + prot + fat || 1
  const r = size / 2 - 14
  const c = 2 * Math.PI * r
  const cPct = carb / total, pPct = prot / total, fPct = fat / total
  const seg = (pct, offset, color) => (
    <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="12"
      strokeDasharray={`${pct * c} ${c}`} strokeDashoffset={-offset * c}
      transform={`rotate(-90 ${size / 2} ${size / 2})`} />
  )
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5ECF3" strokeWidth="12" />
      {seg(cPct, 0, '#1B4F8A')}
      {seg(pPct, cPct, '#2E7D5E')}
      {seg(fPct, cPct + pPct, '#B45309')}
    </svg>
  )
}

export default function LibraryPage() {
  const [cat, setCat] = useState('all')
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState(FOOD_LIBRARY[0])

  const cats = useMemo(() => ['all', ...Array.from(new Set(FOOD_LIBRARY.map(f => f.cat)))], [])
  const filtered = useMemo(() =>
    FOOD_LIBRARY.filter(f =>
      (cat === 'all' || f.cat === cat) &&
      (!q || f.name.toLowerCase().includes(q.toLowerCase()))
    ),
    [cat, q]
  )

  return (
    <div className="screen">
      <div className="page-head">
        <div>
          <div className="breadcrumbs mono">Clinica &nbsp;/&nbsp; Libreria alimentare</div>
          <h1 className="page-title">Libreria alimentare <span className="page-title__count mono">{FOOD_LIBRARY.length}</span></h1>
          <div className="stat-pills">
            <StatPill label="alimenti" value={FOOD_LIBRARY.length} tone="blue" />
            <StatPill label="categorie" value={cats.length - 1} tone="neutral" />
            <StatPill label="fonte" value="INRAN/CREA" tone="gray" />
            <StatPill label="aggiornato" value="apr 2026" tone="green" />
          </div>
        </div>
        <div className="page-head__actions">
          <button className="btn btn--ghost"><Icon name="download" size={14} /> Esporta</button>
          <button className="btn btn--primary"><Icon name="plus" size={14} /> Nuovo alimento</button>
        </div>
      </div>

      <div className="library">
        <aside className="library__side">
          <div className="library__search">
            <Icon name="search" size={14} color="#7B8A99" />
            <input placeholder="Cerca alimento…" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div className="library__cats">
            {cats.map(c => (
              <button key={c} className={`library__cat${cat === c ? ' is-active' : ''}`} onClick={() => setCat(c)}>
                <span>{c === 'all' ? 'Tutte le categorie' : c}</span>
                <span className="mono muted">{c === 'all' ? FOOD_LIBRARY.length : FOOD_LIBRARY.filter(f => f.cat === c).length}</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="library__table card card--table">
          <table className="ptable">
            <thead>
              <tr>
                <th>Alimento</th>
                <th>Categoria</th>
                <th className="th-num">kcal</th>
                <th className="th-num">CHO</th>
                <th className="th-num">PRO</th>
                <th className="th-num">FAT</th>
                <th>Porzione</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.name} onClick={() => setSelected(f)} className={selected?.name === f.name ? 'is-selected' : ''}>
                  <td><div className="cell-patient__name">{f.name}</div></td>
                  <td className="muted">{f.cat}</td>
                  <td className="mono th-num">{f.kcal}</td>
                  <td className="mono th-num">{f.carb}</td>
                  <td className="mono th-num">{f.prot}</td>
                  <td className="mono th-num">{f.fat}</td>
                  <td className="mono muted">{f.portion}{f.unit ? ` · ${f.unit}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="library__detail card card--pad">
          {selected && (
            <>
              <div className="mono eyebrow">SCHEDA ALIMENTO</div>
              <h2 className="sec-title" style={{ marginTop: 6 }}>{selected.name}</h2>
              <div className="muted small">{selected.cat} · {selected.portion}{selected.unit ? ` (${selected.unit})` : ''}</div>
              <div className="macro-ring-wrap">
                <MacroRing carb={selected.carb} prot={selected.prot} fat={selected.fat} />
                <div className="macro-legend">
                  <div><span className="dot" style={{ background: '#1B4F8A' }} /> Carboidrati <b className="mono">{selected.carb}g</b></div>
                  <div><span className="dot" style={{ background: '#2E7D5E' }} /> Proteine <b className="mono">{selected.prot}g</b></div>
                  <div><span className="dot" style={{ background: '#B45309' }} /> Grassi <b className="mono">{selected.fat}g</b></div>
                </div>
              </div>
              <div className="macro-kcal">
                <span className="mono big">{selected.kcal}</span>
                <span className="muted small">kcal per 100g</span>
              </div>
              <div className="food-meta">
                <div className="kv"><span className="kv__l">Porzione standard</span><span className="kv__v mono">{selected.portion}</span></div>
                <div className="kv"><span className="kv__l">Stato</span><span className="kv__v">{selected.unit || 'tal quale'}</span></div>
                <div className="kv"><span className="kv__l">Allergeni</span><span className="kv__v">—</span></div>
              </div>
              <div className="food-sub">
                <div className="mono eyebrow">SOSTITUZIONI SUGGERITE</div>
                <div className="food-sub__list">
                  {FOOD_LIBRARY.filter(x => x.cat === selected.cat && x.name !== selected.name).slice(0, 3).map(x => (
                    <button key={x.name} className="food-sub__chip" onClick={() => setSelected(x)}>{x.name}</button>
                  ))}
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
