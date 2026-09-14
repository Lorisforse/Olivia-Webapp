/**
 * Forza il salvataggio di un Blob come file, via <a download> temporaneo.
 * Serve quando la risorsa richiede l'header Authorization e non può quindi
 * essere aperta con un semplice link (es. il PDF di un piano dietetico).
 */
export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || 'download'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * Scarica una data URI (es. l'SVG del QR di onboarding, già pronto in
 * memoria lato client) come file, senza bisogno di un fetch/Blob intermedio.
 */
export function saveDataUri(dataUri, filename) {
  const a = document.createElement('a')
  a.href = dataUri
  a.download = filename || 'download'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

/**
 * Apre una finestra minimale con una sola immagine e lancia la stampa non
 * appena è caricata (niente chrome della webapp nel foglio stampato). Pensata
 * per il QR di collegamento, ma generica per qualsiasi immagine/data URI.
 */
export function printImage(dataUri, { title = '', subtitle = '' } = {}) {
  const win = window.open('', '_blank', 'width=420,height=560')
  if (!win) return
  win.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title><style>
    body{font-family:sans-serif;text-align:center;padding:48px 24px;color:#1f2419}
    img{width:240px;height:240px}
    h1{font-size:17px;margin:0 0 4px}
    p{font-size:12.5px;color:#5c5f52;margin:4px 0 0}
  </style></head><body>
    <h1>${escapeHtml(title)}</h1>
    ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}
    <img src="${escapeHtml(dataUri)}" alt="QR" onload="window.print()" />
  </body></html>`)
  win.document.close()
}
