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

export function saveDataUri(dataUri, filename) {
  const a = document.createElement('a')
  a.href = dataUri
  a.download = filename || 'download'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export function svgToPngDataUri(svgDataUri, size = 640) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, 0, 0, size, size)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => reject(new Error('Impossibile convertire il QR in PNG'))
    img.src = svgDataUri
  })
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

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
