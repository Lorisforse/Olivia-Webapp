/**
 * Stato di caricamento condiviso: un'oliva che dondola sul ramo, stesse
 * forme/colori del marchio in OliviaLogo, invece del vecchio testo piatto.
 */
export default function LoadingScreen({ label = 'Caricamento…' }) {
  return (
    <div className="loading-screen">
      <svg className="loading-olive" width="40" height="60" viewBox="0 0 46 70" aria-hidden="true">
        <path d="M23 6 C23 3 23 2 23 0" stroke="#8A9258" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path className="loading-olive__leaf" d="M23 3 C28 0 33 0 37 -2 C36 3 31 6 24 5 Z" fill="#8A9258" />
        <ellipse cx="23" cy="38" rx="15" ry="20" fill="var(--brand)" />
        <ellipse cx="17" cy="28" rx="4" ry="5" fill="#8A9258" opacity=".55" />
      </svg>
      <span>{label}</span>
    </div>
  )
}
