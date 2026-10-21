import { flagSvg } from './flags.js'
import { DATA_BASE } from './useQuotes.js'

// Variação no mês (30 dias) e no ano (desde o fechamento do último dia útil do ano anterior), contra a cotação atual.
async function periodChanges(quotes) {
  const out = {}
  try {
    const r = await fetch(`${DATA_BASE}/history.json?t=${Math.floor(Date.now() / 600000)}`)
    const file = await r.json()
    const now = Date.now()
    const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime()
    for (const c of ['USD', 'EUR', 'JPY', 'CNH']) {
      const pts = file?.series?.[c]?.points ?? []
      const cur = quotes?.[c]?.bid
      const before = (t) => { let p = null; for (const x of pts) { if (x.t <= t) p = x; else break } return p }
      const chg = (p) => (p && p.bid > 0 && Number.isFinite(cur) ? ((cur - p.bid) / p.bid) * 100 : null)
      out[c] = { month: chg(before(now - 30 * 864e5)), year: chg(before(yearStart - 1)) }
    }
  } catch { /* sem histórico: mostra só o dia */ }
  return out
}

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
  const S = 2, W = 720, H = 510
  const per = await periodChanges(quotes)
  const cv = document.createElement('canvas'); cv.width = W * S; cv.height = H * S
  const ctx = cv.getContext('2d'); ctx.scale(S, S)
  const font = (w, s) => `${w} ${s}px system-ui, -apple-system, Roboto, sans-serif`
  ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, W, H)
  const now = new Date()
  ctx.fillStyle = '#e6edf3'; ctx.font = font(700, 26); ctx.fillText('Cotações do dia', 28, 50)
  ctx.fillStyle = '#8b949e'; ctx.font = font(400, 16)
  ctx.fillText(`${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · compra, em R$`, 28, 76)
  const cw = (W - 28 * 2 - 16) / 2, ch = 180
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
    const items = [['Dia', ok && !q.fallback ? q.pct : null], ['Mês', per[c]?.month], ['Ano', per[c]?.year]]
    const colW = (cw - 40) / 3
    items.forEach(([lab, v], j) => {
      const cx = x + 20 + j * colW
      ctx.fillStyle = '#8b949e'; ctx.font = font(400, 13); ctx.fillText(lab, cx, y + 132)
      const has = Number.isFinite(v)
      const up = v > 0, flat = !has || v === 0
      ctx.fillStyle = !has ? '#6e7681' : flat ? '#8b949e' : up ? '#3fb950' : '#f85149'; ctx.font = font(600, 17)
      ctx.fillText(has ? `${flat ? '•' : up ? '▲' : '▼'} ${up ? '+' : flat ? '' : '−'}${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : '—', cx, y + 156)
    })
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
