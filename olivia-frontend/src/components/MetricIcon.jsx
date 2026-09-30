// Icona di una metrica in un cerchio del colore del suo grafico, per riconoscere
// le card a colpo d'occhio (Home, tab Andamento, pannello "Personalizza").
// `color` è una tonalità più scura del colore delle barre, così l'icona resta leggibile sul fondo chiaro.
const METRIC_ICONS = {
  weight: {
    color: '#4A5528', bg: '#E4E7D5',
    paths: <><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></>,
  },
  adherence: {
    color: '#4A5528', bg: '#E4E7D5',
    paths: <><rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></>,
  },
  satisfaction: {
    color: '#9A6334', bg: '#F3E6D9',
    paths: <><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/></>,
  },
  sleep: {
    color: '#6B5B95', bg: '#E9E4F2',
    paths: <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>,
  },
  hunger: {
    color: '#9C4760', bg: '#F5E1E7',
    paths: <><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></>,
  },
  hydration: {
    color: '#3F7A96', bg: '#DDEBF2',
    paths: <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>,
  },
  messages: {
    color: '#4F7A68', bg: '#DDEAE4',
    paths: <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>,
  },
  mood: {
    color: '#8A6424', bg: '#F3E8D2',
    paths: <><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></>,
  },
  // Non è una metrica: la card che raccoglie aderenza, sonno e fame nella scheda paziente.
  diary: {
    color: '#5C5F52', bg: '#ECE9DC',
    paths: <><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></>,
  },
}

export default function MetricIcon({ metric, size = 'md' }) {
  const icon = METRIC_ICONS[metric]
  if (!icon) return null
  return (
    <span className={`metric-icon metric-icon--${size}`} style={{ background: icon.bg, color: icon.color }} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {icon.paths}
      </svg>
    </span>
  )
}
