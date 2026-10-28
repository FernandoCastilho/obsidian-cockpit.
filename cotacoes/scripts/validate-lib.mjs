// Validação cruzada dos dados publicados (quotes, history, intraday e PTAX). Devolve achados; nunca lança.
// Objetivo: pegar dado errado ou ausente (ex.: uma ponta do cruzamento CNH) antes de o usuário ver.
const PAIRS = { USD: 'USDBRL', EUR: 'EURBRL', JPY: 'JPYBRL' }
const CODES = ['USD', 'EUR', 'JPY', 'CNH']
const pos = (v) => Number.isFinite(Number(v)) && Number(v) > 0
const num = Number
// Faixas largas de plausibilidade (uma cotação fora delas é erro de fonte, não mercado).
const RANGE = { USD: [2, 12], EUR: [2, 14], JPY: [0.01, 0.1], CNH: [0.3, 2.5] }
const PTAX_TOL = 0.03 // cotação ao vivo × PTAX do mesmo par
const JUMP = { daily: 0.12, intraday: 0.06 } // salto máximo entre pontos consecutivos

const hours = (ms) => Math.round(ms / 36e5 * 10) / 10

export function validateQuotes(file, now = Date.now()) {
  const out = []
  const add = (area, message) => out.push({ area, message })
  const q = file?.quotes
  if (!q) return [{ area: 'quotes', message: 'quotes.json ausente ou inválido' }]
  const age = now - num(file.generatedAt)
  if (!Number.isFinite(age)) add('quotes', 'quotes.json sem data de coleta')
  else if (age > 6 * 36e5) add('quotes', `coleta de cotações parada há ${hours(age)} h`)
  for (const key of ['USDBRL', 'EURBRL', 'JPYBRL', 'USDCNH']) {
    const r = q[key]
    if (!r) { add('quotes', `${key} ausente`); continue }
    for (const f of ['bid', 'ask', 'high', 'low', 'timestamp']) if (!pos(r[f])) add('quotes', `${key}: campo ${f} ausente ou inválido`)
    if (r.pctChange == null || r.pctChange === '' || !Number.isFinite(num(r.pctChange))) add('quotes', `${key}: pctChange ausente`)
    if (pos(r.bid) && pos(r.ask) && num(r.bid) > num(r.ask) * 1.001) add('quotes', `${key}: compra maior que venda`)
    if (pos(r.bid) && pos(r.high) && pos(r.low) && (num(r.bid) > num(r.high) * 1.0005 || num(r.bid) < num(r.low) * 0.9995)) add('quotes', `${key}: cotação fora da máxima/mínima do dia`)
    if (r.varBid !== '' && r.varBid != null && Number.isFinite(num(r.varBid)) && Number.isFinite(num(r.pctChange)) && pos(r.bid)) {
      const implied = num(r.varBid) / (num(r.bid) - num(r.varBid)) * 100
      if (Math.abs(implied - num(r.pctChange)) > 0.2) add('quotes', `${key}: variação absoluta (${r.varBid}) incoerente com a % (${r.pctChange})`)
    }
  }
  if (pos(q.USDBRL?.bid) && pos(q.USDCNH?.ask)) {
    const cnh = num(q.USDBRL.bid) / num(q.USDCNH.ask)
    if (cnh < RANGE.CNH[0] || cnh > RANGE.CNH[1]) add('quotes', `CNH/BRL cruzado fora do plausível (${cnh.toFixed(4)})`)
    const gap = Math.abs(num(q.USDBRL.timestamp) - num(q.USDCNH.timestamp))
    if (gap > 3600) add('quotes', `pontas do CNH com ${Math.round(gap / 60)} min de diferença (cruzamento distorcido)`)
  }
  for (const [code, key] of Object.entries(PAIRS)) {
    const r = q[key]; const [lo, hi] = RANGE[code]
    if (pos(r?.bid) && (num(r.bid) < lo || num(r.bid) > hi)) add('quotes', `${code}/BRL fora do plausível (${r.bid})`)
  }
  if (pos(q.EURBRL?.bid) && pos(q.USDBRL?.bid)) {
    const eurusd = num(q.EURBRL.bid) / num(q.USDBRL.bid)
    if (eurusd < 0.8 || eurusd > 1.6) add('quotes', `EUR/USD implícito fora do plausível (${eurusd.toFixed(4)})`)
  }
  return out
}

// PTAX publicada × cotação ao vivo do mesmo par: divergência grande indica erro em uma das fontes.
export function validateAgainstPtax(file, macro) {
  const out = []
  for (const [code, key] of Object.entries(PAIRS)) {
    const bid = num(file?.quotes?.[key]?.bid), sell = num(macro?.ptax?.[code]?.sell)
    if (!(bid > 0) || !(sell > 0)) continue
    const d = Math.abs(bid / sell - 1)
    if (d > PTAX_TOL) out.push({ area: 'ptax', message: `${code}/BRL ${bid} difere ${(d * 100).toFixed(1)}% da PTAX ${sell}` })
  }
  return out
}

function checkSeries(area, code, pts, jump, now, maxAgeH, minPoints, tOf, vOf) {
  const out = []
  if (!Array.isArray(pts) || pts.length < minPoints) return [{ area, message: `${code}: série com ${pts?.length ?? 0} pontos (mínimo ${minPoints})` }]
  const last = tOf(pts.at(-1))
  if (!Number.isFinite(last) || now - last > maxAgeH * 36e5) out.push({ area, message: `${code}: último ponto há ${Number.isFinite(last) ? hours(now - last) : '?'} h` })
  const [lo, hi] = RANGE[code] ?? [0, Infinity]
  let bad = 0, jumps = 0, unordered = 0, first = ''
  for (let i = 0; i < pts.length; i++) {
    const v = vOf(pts[i])
    if (!(v > 0) || v < lo || v > hi) bad++
    if (i && !(tOf(pts[i]) >= tOf(pts[i - 1]))) unordered++
    if (i && v > 0 && vOf(pts[i - 1]) > 0 && Math.abs(v / vOf(pts[i - 1]) - 1) > jump) { if (!jumps++) first = ` (primeiro: ${vOf(pts[i - 1])} → ${v} em ${new Date(tOf(pts[i])).toISOString().slice(0, 16)}Z)` }
  }
  if (bad) out.push({ area, message: `${code}: ${bad} ponto(s) inválido(s) ou fora do plausível` })
  if (unordered) out.push({ area, message: `${code}: ${unordered} ponto(s) fora de ordem cronológica` })
  if (jumps) out.push({ area, message: `${code}: ${jumps} salto(s) acima de ${jump * 100}% entre pontos consecutivos${first}` })
  return out
}

export function validateHistory(file, now = Date.now()) {
  if (!file?.series) return [{ area: 'history', message: 'history.json ausente ou inválido' }]
  return CODES.flatMap((code) => checkSeries('history', code, file.series[code]?.points, JUMP.daily, now, 5 * 24, 250, (p) => p?.t, (p) => p?.bid))
}

export function validateIntraday(file, now = Date.now()) {
  if (!file?.series) return [{ area: 'intraday', message: 'intraday.json ausente ou inválido' }]
  return CODES.flatMap((code) => checkSeries('intraday', code, file.series[code]?.points, JUMP.intraday, now, 72, 20, (p) => p?.[0], (p) => p?.[1]))
}

export function validateAll({ quotes, history, intraday, macro }, now = Date.now()) {
  return [...validateQuotes(quotes, now), ...validateAgainstPtax(quotes, macro), ...validateHistory(history, now), ...validateIntraday(intraday, now)]
}
