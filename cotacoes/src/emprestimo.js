// Capital de giro (empréstimo em reais): parcela, juros totais e pagamento final (total pago) por Price, SAC ou Bullet.
// Estimativa com a taxa informada: sem tarifas, IOF, seguros nem impostos.
export const SYSTEMS = [
  { id: 'price', label: 'Price', hint: 'parcelas iguais' },
  { id: 'sac', label: 'SAC', hint: 'amortização constante, parcelas decrescentes' },
  { id: 'bullet', label: 'Bullet', hint: 'juros capitalizados, pagamento único no vencimento' },
]

// Número em pt-BR ("1,5"), aceitando ponto como decimal apenas sem vírgula ("1.5"). Vazio ou lixo viram null.
export function parseDecimal(text) {
  const t = String(text ?? '').trim().replace('%', '').trim()
  if (!/^\d+(?:[.,]\d+)?$/.test(t)) return null
  const v = Number(t.replace(',', '.'))
  return Number.isFinite(v) ? v : null
}

// Taxa mensal efetiva: a.m. é usada como está; a.a. converte por juros compostos.
export const monthlyRate = (rate, unit) => (unit === 'aa' ? (1 + rate / 100) ** (1 / 12) - 1 : rate / 100)

// value em R$, n = meses (inteiro), rate em % (a.m. ou a.a.), system 'price' | 'sac' | 'bullet'.
export function loan({ value, n, rate, unit = 'am', system }) {
  const missing = []
  if (!(value > 0)) missing.push('valor')
  if (!Number.isInteger(n) || n < 1 || n > 600) missing.push('prazo (1 a 600 meses)')
  if (!Number.isFinite(rate) || rate < 0 || rate > 1000) missing.push('taxa')
  if (!SYSTEMS.some((s) => s.id === system)) missing.push('sistema de amortização')
  if (missing.length) return { ok: false, missing }
  const i = monthlyRate(rate, unit)
  let installment, last = null, total
  if (system === 'price') {
    installment = i === 0 ? value / n : (value * i) / (1 - (1 + i) ** -n)
    total = installment * n
  } else if (system === 'sac') {
    const amort = value / n
    installment = amort + value * i // 1ª parcela, a maior
    last = amort + amort * i
    total = value + (i * value * (n + 1)) / 2
  } else {
    installment = null // sem parcelas periódicas
    total = value * (1 + i) ** n
  }
  return { ok: true, system, n, monthly: i, installment, last, interest: total - value, total }
}
