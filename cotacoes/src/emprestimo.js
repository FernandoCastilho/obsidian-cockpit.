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

// IOF de crédito para pessoa jurídica: alíquota adicional única + alíquota diária por dia de cada parcela (até 365 dias).
// Padrão do Decreto 12.499/2025 (0,38% + 0,0082% ao dia). As fontes consultadas divergem em detalhes (base e adicional);
// por isso os dois percentuais são editáveis na tela. O prazo de cada parcela usa meses de 365/12 dias, pois a tela não pede datas.
export const IOF_PJ = { fixed: 0.38, daily: 0.0082, maxDays: 365 }

// value em R$, n = meses (inteiro), rate em % (a.m. ou a.a.), system 'price' | 'sac' | 'bullet'; iof = { fixed, daily } em %.
export function loan({ value, n, rate, unit = 'am', system, iof = IOF_PJ }) {
  const missing = []
  if (!(value > 0)) missing.push('valor')
  if (!Number.isInteger(n) || n < 1 || n > 600) missing.push('prazo (1 a 600 meses)')
  if (!Number.isFinite(rate) || rate < 0 || rate > 1000) missing.push('taxa')
  if (!SYSTEMS.some((s) => s.id === system)) missing.push('sistema de amortização')
  const fixed = iof?.fixed, daily = iof?.daily
  if (![fixed, daily].every((v) => Number.isFinite(v) && v >= 0 && v <= 100)) missing.push('alíquotas do IOF')
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
  // IOF: principal de cada parcela × dias até o vencimento × alíquota diária (dias limitados a 365) + adicional único sobre o valor.
  let bal = value, dailyBase = 0
  for (let k = 1; k <= n; k++) {
    const amort = system === 'bullet' ? (k === n ? value : 0) : system === 'sac' ? value / n : installment - bal * i
    if (system !== 'bullet') bal -= amort
    dailyBase += amort * Math.min(Math.round((k * 365) / 12), IOF_PJ.maxDays)
  }
  const iofDaily = (dailyBase * daily) / 100, iofFixed = (value * fixed) / 100, iofTotal = iofDaily + iofFixed
  return { ok: true, system, n, monthly: i, installment, last, interest: total - value, iof: iofTotal, iofFixed, iofDaily, total: total + iofTotal }
}

// Comparação com os outros sistemas, com as mesmas condições: SAC ↔ Price; no Bullet, mostra Price e SAC.
export function compareSystems(params) {
  const selected = loan(params)
  if (!selected.ok) return { selected, others: [] }
  const ids = params.system === 'price' ? ['sac'] : params.system === 'sac' ? ['price'] : ['price', 'sac']
  return {
    selected,
    others: ids.map((system) => {
      const r = loan({ ...params, system })
      return { system, label: SYSTEMS.find((s) => s.id === system).label, result: r, totalDiff: r.total - selected.total, interestDiff: r.interest - selected.interest, iofDiff: r.iof - selected.iof }
    }),
  }
}
