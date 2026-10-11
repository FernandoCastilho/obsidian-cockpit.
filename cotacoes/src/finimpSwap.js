// FINIMP 4131 com swap para CDI: cronograma no formato da cotação do banco (parcelas a cada 30 dias corridos, ajustadas ao dia útil
// comum às praças), com a perna em dólar (juros, IR gross-up, amortização) e a perna em reais do swap (CDI esperado + spread).
// Fórmulas, coluna a coluna, em FORMULAS (usadas na tela). Tudo é estimativa a partir do que o usuário informa e da curva DI x pré.
import { addDays, busDaysIn, nextBusinessDay } from './holidays.js'
import { growthAt } from './cdiFuturo.js'

const DAY = 864e5
const day = (iso) => Date.parse(`${iso}T00:00:00Z`)
export const daysBetween = (a, b) => Math.round((day(b) - day(a)) / DAY)
const r2 = (v) => Math.round((v + Number.EPSILON) * 100) / 100

export const FORMULAS = [
  ['#', 'Número da parcela: 1 a N.'],
  ['Início', 'Parcela 1: data do desembolso. Demais: Data Final da parcela anterior.'],
  ['Data Final', 'Data do desembolso + 30 × # dias corridos; se não for dia útil em todas as praças (Brasil e Nova York), vai para o próximo dia útil comum.'],
  ['DC', 'Dias corridos acumulados: Data Final − data do desembolso.'],
  ['DU Intra', 'Dias úteis brasileiros no período: depois do Início, até a Data Final (inclusive). Usa o calendário nacional (ANBIMA).'],
  ['Saldo devedor USD', 'Parcela 1: volume em USD. Demais: saldo anterior − amortização anterior.'],
  ['Amortização USD', 'Zero na carência. Depois: volume ÷ (N − carência), arredondado a 2 casas; a última parcela leva a diferença.'],
  ['Juros', 'Saldo devedor × taxa a.a. × (Data Final − Início) ÷ 360, arredondado a 2 casas (juros simples, ACT/360).'],
  ['IR', 'Juros × alíquota ÷ (1 − alíquota). É o IR retido sobre a remessa, pago pela empresa (gross-up): o banco recebe o juro líquido.'],
  ['Parcela USD', 'Juros + IR + Amortização.'],
  ['Parcela Esperada BRL', 'Perna em reais do swap: saldo em R$ × [CDI esperado no período × (1 + spread)^(DU ÷ 252) − 1] + amortização em R$. CDI esperado = taxa a termo da curva DI x pré entre o Início e a Data Final.'],
]

// Fator de capitalização do DI até d dias úteis; além do último vértice, continua na última taxa a termo.
function growth(pts, d) {
  const g = growthAt(pts, d)
  if (g != null) return { g, extrapolated: false }
  const v = [...pts].filter(([x, r]) => x > 0 && Number.isFinite(r)).sort((a, b) => a[0] - b[0])
  if (v.length < 2 || d <= 0) return { g: null, extrapolated: false }
  const [x1, r1] = v[v.length - 2]
  const [x2, r2_] = v[v.length - 1]
  const fwd = ((1 + r2_ / 100) ** (x2 / 252) / (1 + r1 / 100) ** (x1 / 252)) ** (252 / (x2 - x1)) - 1
  return { g: growthAt(pts, x2) * (1 + fwd) ** ((d - x2) / 252), extrapolated: true }
}

// input: { start, usd, brl, n, grace, step, ratePct, irPct, spreadPct, pts, base, cals, ctx, flatCdi }
export function finimpSwap(input) {
  const { start, usd, brl, n, grace = 0, step = 30, ratePct, irPct = 0, spreadPct, pts, base, cals = ['BR', 'NY'], ctx = {}, flatCdi } = input
  const missing = []
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start ?? '')) missing.push('data do desembolso')
  if (!(usd > 0)) missing.push('volume em USD')
  if (!(brl > 0)) missing.push('volume em R$ (nocional do swap)')
  if (!(n >= 1) || !Number.isInteger(n)) missing.push('número de parcelas')
  if (!Number.isInteger(grace) || grace < 0 || grace >= n) missing.push('carência (menor que o número de parcelas)')
  if (!(step >= 1)) missing.push('intervalo entre parcelas (dias)')
  if (!Number.isFinite(ratePct) || ratePct < 0) missing.push('taxa do ativo (% a.a.)')
  if (!Number.isFinite(spreadPct)) missing.push('spread sobre o CDI (% a.a.)')
  if (!(irPct >= 0 && irPct < 100)) missing.push('alíquota de IR (0 a 99%)')
  const useFlat = Number.isFinite(flatCdi) && flatCdi > 0
  if (!useFlat && !(pts?.length >= 2 && base)) missing.push('curva DI (ou informe um CDI fixo)')
  if (missing.length) return { ok: false, missing }

  const m = n - grace
  const amortUsd = r2(usd / m)
  const amortBrl = r2(brl / m)
  const rows = []
  let balUsd = usd
  let balBrl = brl
  let prev = start
  let extrapolated = false
  for (let k = 1; k <= n; k++) {
    const end = nextBusinessDay(addDays(start, step * k), cals, ctx)
    const dc = daysBetween(start, end)
    const days = daysBetween(prev, end)
    const du = busDaysIn(prev, end, ['BR'], ctx)
    const last = k === n
    const amU = k <= grace ? 0 : last ? r2(balUsd) : amortUsd
    const amB = k <= grace ? 0 : last ? r2(balBrl) : amortBrl
    // juros e IR sem arredondar na soma: a parcela é arredondada uma vez (como na cotação do banco); as colunas mostram 2 casas
    const jurosRaw = (balUsd * ratePct * days) / 36000
    const irRaw = irPct > 0 ? (jurosRaw * irPct) / (100 - irPct) : 0
    const juros = r2(jurosRaw)
    const ir = r2(irRaw)
    // CDI esperado no período (fator) e juros da perna em reais
    let cdi
    if (useFlat) cdi = (1 + flatCdi / 100) ** (du / 252)
    else {
      const d1 = busDaysIn(base, prev, ['BR'], ctx)
      const d2 = busDaysIn(base, end, ['BR'], ctx)
      const g2 = growth(pts, d2)
      extrapolated ||= g2.extrapolated
      if (prev <= base) cdi = g2.g != null && d2 > 0 ? g2.g ** (du / d2) : 1 // período já iniciado: média da curva até a Data Final
      else {
        const g1 = growth(pts, d1)
        cdi = g1.g != null && g2.g != null ? g2.g / g1.g : 1
      }
    }
    const jurosBrl = r2(balBrl * (cdi * (1 + spreadPct / 100) ** (du / 252) - 1))
    rows.push({ k, start: prev, end, dc, days, du, balUsd, amUsd: amU, juros, ir, parcelaUsd: r2(jurosRaw + irRaw + amU), balBrl, amBrl: amB, jurosBrl, parcelaBrl: r2(jurosBrl + amB), cdiAa: du > 0 ? (cdi ** (252 / du) - 1) * 100 : null })
    balUsd = r2(balUsd - amU)
    balBrl = r2(balBrl - amB)
    prev = end
  }
  const sum = (key) => r2(rows.reduce((s, r) => s + r[key], 0))
  const totals = { juros: sum('juros'), ir: sum('ir'), amUsd: sum('amUsd'), parcelaUsd: sum('parcelaUsd'), amBrl: sum('amBrl'), jurosBrl: sum('jurosBrl'), parcelaBrl: sum('parcelaBrl') }
  const checks = [
    { label: 'Amortizações em USD somam o volume', ok: Math.abs(totals.amUsd - usd) < 0.005 },
    { label: 'Amortizações em R$ somam o nocional', ok: Math.abs(totals.amBrl - brl) < 0.005 },
    { label: 'Saldo final zerado', ok: Math.abs(balUsd) < 0.005 && Math.abs(balBrl) < 0.005 },
  ]
  return {
    ok: true,
    rows,
    totals,
    checks,
    extrapolated,
    allIn: ratePct / (1 - irPct / 100), // taxa do ativo + IR (% a.a.)
    spreadAm: ((1 + spreadPct / 100) ** (1 / 12) - 1) * 100, // spread em % a.m.
    first: rows[0].end,
    last: rows[rows.length - 1].end,
  }
}

// Texto separado por tabulação (colar no Excel), com os mesmos títulos da cotação do banco.
export function swapTsv(res) {
  const n = (v) => v.toFixed(2).replace('.', ',')
  const d = (s) => s.split('-').reverse().join('/')
  const head = ['#', 'Início', 'Data Final', 'DC', 'DU Intra', 'Saldo devedor USD', 'Amortização USD', 'Juros', 'IR', 'Parcela USD', 'Parcela Esperada BRL']
  return [head, ...res.rows.map((r) => [r.k, d(r.start), d(r.end), r.dc, r.du, n(r.balUsd), n(r.amUsd), n(r.juros), n(r.ir), n(r.parcelaUsd), n(r.parcelaBrl)])].map((l) => l.join('\t')).join('\n')
}
