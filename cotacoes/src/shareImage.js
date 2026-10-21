import { flagSvg } from './flags.js'

// Monta uma imagem (PNG) com os quadros de dólar, euro, iene e yuan e abre o compartilhar do celular.
const NAMES = { USD: 'Dólar', EUR: 'Euro', JPY: 'Iene', CNH: 'Yuan' }
const loadImg = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src })
const svgUrl = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.includes('xmlns') ? svg : svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"'))}`

function round(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}

export async function shareQuotesImage(quotes) {
  const codes = ['USD', 'EUR', 'JPY', 'CNH']
  const S = 2, W = 720, H = 470
  const cv = document.createElement('canvas'); cv.width = W * S; cv.height = H * S
  const ctx = cv.getContext('2d'); ctx.scale(S, S)
  const font = (w, s) => `${w} ${s}px system-ui, -apple-system, Roboto, sans-serif`
  ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, W, H)
  const now = new Date()
  ctx.fillStyle = '#e6edf3'; ctx.font = font(700, 26); ctx.fillText('Cotações do dia', 28, 50)
  ctx.fillStyle = '#8b949e'; ctx.font = font(400, 16)
  ctx.fillText(`${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · compra, em R$`, 28, 76)
  const cw = (W - 28 * 2 - 16) / 2, ch = 160
  for (let k = 0; k < codes.length; k++) {
    const c = codes[k], q = quotes?.[c]
    const x = 28 + (k % 2) * (cw + 16), y = 100 + Math.floor(k / 2) * (ch + 16)
    ctx.fillStyle = '#161b22'; round(ctx, x, y, cw, ch, 16); ctx.fill()
    ctx.strokeStyle = '#30363d'; ctx.lineWidth = 1; ctx.stroke()
    const fl = await loadImg(svgUrl(flagSvg(c === 'CNH' ? 'CNH' : c, 'width="42" height="28"')))
    if (fl) ctx.drawImage(fl, x + 20, y + 20, 42, 28)
    ctx.fillStyle = '#e6edf3'; ctx.font = font(700, 22); ctx.fillText(NAMES[c], x + 74, y + 42)
    ctx.fillStyle = '#8b949e'; ctx.font = font(400, 15); ctx.fillText(`${c === 'CNH' ? 'CNH' : c}/BRL`, x + 74 + ctx.measureText(NAMES[c]).width * 1.5 + 14, y + 42)
    const ok = q && Number.isFinite(q.bid)
    ctx.fillStyle = '#e6edf3'; ctx.font = font(700, 38)
    ctx.fillText(ok ? `R$ ${q.bid.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}` : '—', x + 20, y + 100)
    if (ok && Number.isFinite(q.pct)) {
      const up = q.pct > 0, flat = q.pct === 0
      ctx.fillStyle = flat ? '#8b949e' : up ? '#3fb950' : '#f85149'; ctx.font = font(600, 20)
      ctx.fillText(`${flat ? '•' : up ? '▲' : '▼'} ${up ? '+' : flat ? '' : '−'}${Math.abs(q.pct).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% hoje`, x + 20, y + 136)
    }
  }
  ctx.fillStyle = '#6e7681'; ctx.font = font(400, 13)
  ctx.fillText('Referência de mercado, sujeita a alteração. Não é cotação firme.', 28, H - 20)
  const blob = await new Promise((ok) => cv.toBlob(ok, 'image/png'))
  const file = new File([blob], `cotacoes-${now.toISOString().slice(0, 10)}.png`, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Cotações do dia' }) } catch { /* cancelado */ }
    return
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 5000)
}
