// Capital de giro (empréstimo em reais): cronograma, custo total e custo efetivo, comparados com o DI da curva.
// Taxas, tarifas e impostos são informados por você; nada é presumido. Resultado é estimativa, não é CET regulatório.
import { growthAt } from './cdiFuturo.js'

// Soma k meses a uma data 'AAAA-MM-DD', limitando ao último dia do mês (31/01 + 1 mês = 28 ou 29/02).
export function addMonths(iso, k) {
  const [y, m, d] = iso.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1 + k, 1))
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate()
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), Math.min(d, last))).toISOString().slice(0, 10)
}

// Taxa efetiva por período do fluxo (bisseção): valor presente dos fluxos igual a zero. Fluxo 0 = dinheiro recebido; demais = pagamentos.
function irr(flows) {
  const npv = (r) => flows.reduce((s, cf, k) => s + cf / (1 + r) ** k, 0)
  if (npv(0) >= 0) return null // paga menos ou igual ao que recebe: não há taxa positiva
  let lo = 0
  let hi = 1
  while (npv(hi) < 0 && hi < 1e3) hi *= 2
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    if (npv(mid) < 0) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

// structure: 'bullet' (principal e juros no fim), 'price' (parcelas iguais) ou 'sac' (amortização constante). n = número de meses (parcelas).
// rate em % ao mês (unit 'am') ou ao ano (unit 'aa', convertida por (1+r)^(1/12) − 1). fees = despesas à vista (R$) descontadas do valor liberado.
export function giro({ value, n, structure, rate, unit = 'am', start, fees = 0 }) {
  const missing = []
  if (!(value > 0)) missing.push('valor')
  if (!(n >= 1) || !Number.isInteger(n)) missing.push('prazo em meses (número inteiro)')
  if (!structure) missing.push('estrutura de pagamento')
  if (!Number.isFinite(rate) || rate < 0) missing.push('taxa')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start ?? '')) missing.push('data de início')
  if (missing.length) return { ok: false, missing }
  const f = Number.isFinite(fees) && fees > 0 ? fees : 0
  if (f >= value) return { ok: false, missing: [], error: 'As despesas à vista não podem ser maiores que o valor.' }
  const i = unit === 'aa' ? (1 + rate / 100) ** (1 / 12) - 1 : rate / 100
  const rows = []
  let bal = value
  const pmt = i === 0 ? value / n : (value * i) / (1 - (1 + i) ** -n)
  for (let k = 1; k <= n; k++) {
    const interest = bal * i
    let amort
    let payment
    if (structure === 'bullet') {
      amort = k === n ? value : 0
      payment = k === n ? value * (1 + i) ** n : 0
      // juros compostos no fim: o saldo cresce sem pagamento
      const growth = value * (1 + i) ** k - value * (1 + i) ** (k - 1)
      rows.push({ k, date: addMonths(start, k), payment, interest: k === n ? value * (1 + i) ** n - value : 0, accrued: growth, amort, balance: k === n ? 0 : value * (1 + i) ** k })
      continue
    }
    if (structure === 'price') {
      amort = pmt - interest
      payment = pmt
    } else {
      amort = value / n
      payment = amort + interest
    }
    bal = k === n ? 0 : bal - amort
    rows.push({ k, date: addMonths(start, k), payment, interest, accrued: interest, amort, balance: Math.abs(bal) < 1e-8 ? 0 : bal })
  }
  const totalPaid = rows.reduce((s, r) => s + r.payment, 0)
  const totalInterest = totalPaid - value
  const avgLife = rows.reduce((s, r) => s + r.amort * r.k, 0) / value // prazo médio em meses
  const cash = value - f
  const m = irr([cash, ...rows.map((r) => -r.payment)])
  return {
    ok: true,
    rows,
    i: i * 100,
    totalPaid,
    totalInterest,
    avgLife,
    cash,
    fees: f,
    cost: m == null ? null : { am: m * 100, aa: ((1 + m) ** 12 - 1) * 100 },
    end: rows.at(-1).date,
  }
}

// Custo efetivo anual comparado com o DI da curva no prazo médio (21 dias úteis por mês).
export function giroVsCdi(pts, res) {
  if (!res?.cost) return null
  const d = Math.max(1, Math.round(res.avgLife * 21))
  const G = growthAt(pts, d)
  if (G == null) return null
  const diAa = (G ** (252 / d) - 1) * 100
  return { d, diAa, pctCdi: diAa > 0 ? (res.cost.aa / diAa) * 100 : null }
}

export function giroTsv(res) {
  const n = (v) => v.toFixed(2).replace('.', ',')
  const head = ['Parcela', 'Data', 'Pagamento', 'Juros', 'Amortização', 'Saldo devedor']
  return [head, ...res.rows.map((r) => [r.k, r.date.split('-').reverse().join('/'), n(r.payment), n(r.interest), n(r.amort), n(r.balance)])].map((l) => l.join('\t')).join('\n')
}
