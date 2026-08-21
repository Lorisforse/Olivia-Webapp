/**
 * Logo Olivia: oliva + wordmark, nei colori chiari usati sui fondi scuri
 * (topbar e pannello di login). L'altezza guida la larghezza, il rapporto è 3:1.
 */
export default function OliviaLogo({ height = 40 }) {
  return (
    <svg
      width={height * 3}
      height={height}
      viewBox="0 0 240 80"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Olivia"
    >
      <g transform="translate(0, 4)">
        <ellipse cx="30" cy="40" rx="22" ry="28" fill="#E8E4D6"/>
        <ellipse cx="23" cy="30" rx="5" ry="7" fill="#FAF8F2" opacity="0.55"/>
        <path d="M30 12 C 30 8, 30 6, 30 3" stroke="#E8E4D6" strokeWidth="1.6" strokeLinecap="round" fill="none"/>
        <path d="M30 4 C 34 2, 38 2, 41 0 C 40 4, 36 6, 31 6 Z" fill="#FAF8F2"/>
      </g>
      <text x="56" y="54" fontFamily="Fraunces, 'Times New Roman', serif" fontSize="52" fontWeight="500" fill="#FAF8F2" letterSpacing="-1">livia</text>
    </svg>
  )
}
