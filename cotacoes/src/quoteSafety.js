// Verificações de integridade compartilhadas pela coleta e pelo navegador.
// Faixas amplas já usadas na auditoria; não são previsão nem garantia de preço de mercado.
const RANGE = { USDBRL: [2, 12], EURBRL: [2, 14], JPYBRL: [0.01, 0.1], CNHBRL: [0.3, 2.5], EURUSD: [0.7, 1.8] }
export const RAW_PAIRS = ['USDBRL', 'EURBRL', 'JPYBRL', 'USDCNH']
const numeric = v => (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '')) && Number.isFinite(Number(v))
const positive = v => numeric(v) && Number(v) > 0
const withinRange = (q, pair) => !RANGE[pair] || ['bid', 'ask', 'high', 'low'].every(k => Number(q[k]) >= RANGE[pair][0] && Number(q[k]) <= RANGE[pair][1])

export function rawQuoteError(q, pair, now = Date.now()) {
  if (!q) return pair + ': cotação ausente'
  if (['bid', 'ask', 'high', 'low', 'timestamp'].some(k => !positive(q[k]))) return pair + ': campo ausente ou inválido'
  if (!numeric(q.pctChange)) return pair + ': variação inválida'
  if (Number(q.timestamp) * 1000 > now + 60000) return pair + ': horário no futuro'
  if (!withinRange(q, pair)) return pair + ': valor fora da faixa de segurança'
  if (Number(q.bid) > Number(q.ask) * 1.001) return pair + ': compra maior que venda'
  if (Number(q.high) < Number(q.low) || Number(q.bid) > Number(q.high) * 1.0005 || Number(q.bid) < Number(q.low) * 0.9995) return pair + ': máxima e mínima incoerentes'
  return ''
}

export const CNH_MAX_LEG_GAP_MS = 3600000
export function cnhTimingError(brl, cnh) {
  const gap = Math.abs(Number(brl?.timestamp) - Number(cnh?.timestamp)) * 1000
  return Number.isFinite(gap) && gap > CNH_MAX_LEG_GAP_MS ? `CNH: pontas com ${Math.round(gap/60000)} min de diferença; aguardando referências compatíveis` : ''
}

export function cnhQuoteError(q, now = Date.now()) {
  if (!q || q.source !== 'CNH' || q.cross !== true) return 'CNH: cruzamento ausente'
  if (['bid', 'ask', 'high', 'low', 'timestamp'].some(k => !positive(q[k])) || (q.pct !== null && !Number.isFinite(q.pct)) || (q.delta !== null && !Number.isFinite(q.delta))) return 'CNH: cruzamento inválido'
  if (q.legTimestamps && (Object.values(q.legTimestamps).some(t=>!positive(t)) || Math.abs(q.legTimestamps.USDBRL-q.legTimestamps.USDCNH)>CNH_MAX_LEG_GAP_MS || q.timestamp!==Math.min(q.legTimestamps.USDBRL,q.legTimestamps.USDCNH))) return 'CNH: horários de origem incompatíveis'
  if (q.timestamp > now + 60000 || !withinRange(q, 'CNHBRL') || q.high < q.low || q.bid > q.ask * 1.001) return 'CNH: cruzamento fora da faixa de segurança'
  return ''
}

export function withCnhVariation(quote) {
  // Arquivos antigos não guardavam a base anterior e usavam dois cálculos diferentes.
  if (positive(quote.previousBid)) {
    const delta = quote.bid - quote.previousBid
    const pct = delta / quote.previousBid * 100
    if (Number.isFinite(delta) && Number.isFinite(pct)) return { ...quote, delta, pct }
  }
  return { ...quote, previousBid: null, delta: null, pct: null }
}

export function cnhCross(brl, cnh, now = Date.now()) {
  if (rawQuoteError(brl, 'USDBRL', now) || rawQuoteError(cnh, 'USDCNH', now) || cnhTimingError(brl,cnh)) return null
  const n = Number
  const bid = n(brl.bid) / n(cnh.ask)
  let previousBid = null
  if (numeric(brl.varBid) && numeric(cnh.varBid)) {
    const previousBrlBid = n(brl.bid) - n(brl.varBid)
    const previousCnhBid = n(cnh.bid) - n(cnh.varBid)
    if (positive(previousBrlBid) && positive(previousCnhBid)) {
      // varBid só informa a compra. Estima a venda anterior com a mesma razão venda/compra atual.
      previousBid = bid * ((previousBrlBid / n(brl.bid)) / (previousCnhBid / n(cnh.bid)))
    }
  }
  const quote = withCnhVariation({
    source: 'CNH', cross: true, previousBid,
    legTimestamps: {USDBRL:n(brl.timestamp)*1000,USDCNH:n(cnh.timestamp)*1000},
    bid, ask: n(brl.ask) / n(cnh.bid),
    high: n(brl.high) / n(cnh.low), low: n(brl.low) / n(cnh.high),
    timestamp: Math.min(n(brl.timestamp), n(cnh.timestamp)) * 1000,
  })
  return cnhQuoteError(quote, now) ? null : quote
}
