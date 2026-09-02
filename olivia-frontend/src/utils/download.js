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
