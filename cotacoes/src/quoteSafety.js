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

export function cnhQuoteError(q, now = Date.now()) {
  if (!q || q.source !== 'CNH' || q.cross !== true) return 'CNH: cruzamento ausente'
  if (['bid', 'ask', 'high', 'low', 'timestamp'].some(k => !positive(q[k])) || !Number.isFinite(q.pct) || (q.delta !== null && !Number.isFinite(q.delta))) return 'CNH: cruzamento inválido'
  if (q.timestamp > now + 60000 || !withinRange(q, 'CNHBRL') || q.high < q.low || q.bid > q.ask * 1.001) return 'CNH: cruzamento fora da faixa de segurança'
  return ''
}

// Preserva a metodologia atual: nenhuma alteração na fórmula ou na defasagem das pontas.
export function cnhCross(brl, cnh, now = Date.now()) {
  if (rawQuoteError(brl, 'USDBRL', now) || rawQuoteError(cnh, 'USDCNH', now)) return null
  const n = Number
  const legs = [brl.varBid, cnh.varBid].every(v => v !== '' && v != null && Number.isFinite(n(v)))
  const previous = legs ? (n(brl.bid) - n(brl.varBid)) / (n(cnh.ask) - n(cnh.varBid)) : NaN
  const delta = Number.isFinite(previous) && previous > 0 ? n(brl.bid) / n(cnh.ask) - previous : null
  const quote = {
    source: 'CNH', cross: true, delta,
    bid: n(brl.bid) / n(cnh.ask), ask: n(brl.ask) / n(cnh.bid),
    high: n(brl.high) / n(cnh.low), low: n(brl.low) / n(cnh.high),
    pct: n(brl.pctChange) - n(cnh.pctChange),
    timestamp: Math.min(n(brl.timestamp), n(cnh.timestamp)) * 1000,
  }
  return cnhQuoteError(quote, now) ? null : quote
}
