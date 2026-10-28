// Leitura de cenário do cupom cambial (B3, DI x dólar) a partir das curvas já coletadas: DI pré, cupom e Treasuries.
// Convenções (aproximadas, avisadas na tela): DI pré = composto, 252 dias úteis; cupom = linear, base 360 dias corridos
// (dias corridos ≈ dias úteis × 365/252); Treasuries = par yield, equivalente a título (semestral).
export const VERTICES = [
  { du: 63, label: '3 meses' },
  { du: 126, label: '6 meses' },
  { du: 252, label: '1 ano' },
  { du: 504, label: '2 anos' },
]

// Interpolação linear entre vértices vizinhos; fora da faixa devolve null (nunca extrapola).
export function interp(points, x) {
  if (!Array.isArray(points) || points.length < 2 || !Number.isFinite(x)) return null
  const p = [...points].sort((a, b) => a[0] - b[0])
  if (x < p[0][0] || x > p.at(-1)[0]) return null
  const i = p.findIndex((v) => v[0] >= x)
  if (p[i][0] === x) return p[i][1]
  const [x0, y0] = p[i - 1], [x1, y1] = p[i]
  return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)
}

// Cupom (linear, 360 corridos) -> taxa efetiva anual comparável ao DI (composta, 252 d.u.).
export function cupomEfetivo(rate, du) {
  if (!Number.isFinite(rate) || !(du > 0)) return null
  const factor = 1 + (rate / 100) * ((du * 365) / 252 / 360)
  return factor > 0 ? (factor ** (252 / du) - 1) * 100 : null
}

// Par yield do Tesouro (equivalente a título, semestral) -> taxa efetiva anual.
export const ustEfetivo = (y) => (Number.isFinite(y) ? ((1 + y / 200) ** 2 - 1) * 100 : null)

// Desvalorização cambial implícita a.a.: o que o DI pré e o cupom, juntos, dizem que o dólar sobe em reais.
export function desvalorizacaoImplicita(pre, cupomRate, du) {
  const cc = cupomEfetivo(cupomRate, du)
  return Number.isFinite(pre) && cc != null ? ((1 + pre / 100) / (1 + cc / 100) - 1) * 100 : null
}

// Prêmio do cupom sobre o Treasury do mesmo prazo, em p.p. (efetivas anuais).
export function premioSobreUst(cupomRate, du, us) {
  const cc = cupomEfetivo(cupomRate, du)
  const ust = ustEfetivo(interp((us ?? []).map((p) => [p[0], p[1]]), du / 252))
  return cc != null && ust != null ? { cupom: cc, ust, spread: cc - ust } : null
}

const curveAt = (set, date) => set?.curves?.[date] ?? null

// Tabela por vértice na data: DI, cupom, desvalorização implícita e prêmio sobre o UST.
export function leitura({ br, cc, us }, date, usDate = date) {
  const pre = curveAt(br, date), cup = curveAt(cc, date), ust = curveAt(us, usDate)
  if (!pre || !cup) return []
  return VERTICES.map((v) => {
    const preRate = interp(pre, v.du), ccRate = interp(cup, v.du)
    return {
      ...v, pre: preRate, cupom: ccRate,
      depreciacao: preRate != null && ccRate != null ? desvalorizacaoImplicita(preRate, ccRate, v.du) : null,
      premio: ccRate != null && ust ? premioSobreUst(ccRate, v.du, ust) : null,
    }
  })
}

// Variação do cupom entre duas datas em bps, nos vértices comuns às duas curvas.
export function variacaoPorVertice(cc, from, to) {
  const a = curveAt(cc, from), b = curveAt(cc, to)
  if (!a || !b) return []
  const fromMap = new Map(a.map((p) => [p[0], p[1]]))
  return b.filter((p) => fromMap.has(p[0])).map((p) => ({ du: p[0], bps: (p[1] - fromMap.get(p[0])) * 100 })).sort((x, y) => x.du - y.du)
}

// Nível (média), inclinação (longo menos curto) e o nome do movimento.
export function formaDoMovimento(changes) {
  const usable = changes.filter((c) => c.du >= 63)
  if (usable.length < 3) return null
  const level = usable.reduce((s, c) => s + c.bps, 0) / usable.length
  const short = usable.slice(0, 2).reduce((s, c) => s + c.bps, 0) / 2
  const long = usable.slice(-2).reduce((s, c) => s + c.bps, 0) / 2
  const slope = long - short
  const small = Math.abs(level) < 2 && Math.abs(slope) < 2
  const kind = small ? 'estável' : Math.abs(slope) < Math.max(2, Math.abs(level) * 0.25) ? 'paralelo' : slope > 0 ? 'inclinação (longo sobe mais que o curto)' : 'achatamento (curto sobe mais que o longo)'
  return { level, slope, kind }
}

// Série do cupom num vértice fixo, nas datas de comparação disponíveis (não é série diária).
export function serieDoVertice(cc, du) {
  return (cc?.compare ?? [])
    .map((c) => ({ date: c.date, label: c.label, value: interp(curveAt(cc, c.date), du) }))
    .filter((p) => p.value != null)
    .sort((a, b) => a.date.localeCompare(b.date))
}

const f2 = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const sg = (v, unit) => {
  const d = unit === 'bps' ? 0 : 2
  const zero = Math.round(Math.abs(v) * 10 ** d) === 0 // arredonda para zero: sem sinal
  return `${zero ? '' : v > 0 ? '+' : '−'}${Math.abs(v).toLocaleString('pt-BR', { maximumFractionDigits: d, minimumFractionDigits: d })} ${unit}`
}

// Frases factuais para o topo da leitura; sem recomendação.
export function resumoTexto({ br, cc, us }) {
  const dates = (cc?.compare ?? []).map((c) => c.date)
  if (!dates.length) return []
  const last = dates[0], prev = dates[1]
  const out = []
  const atual = leitura({ br, cc, us }, last, matchUsDate(us, last))
  const y1 = atual.find((r) => r.du === 252)
  if (y1?.cupom != null) out.push(`Cupom cambial de 1 ano em ${f2(y1.cupom)}% a.a. (${dm(last)}).`)
  if (y1?.depreciacao != null) out.push(`Com o DI de 1 ano em ${f2(y1.pre)}%, o mercado embute desvalorização do real de cerca de ${f2(y1.depreciacao)}% a.a. em 12 meses.`)
  if (y1?.premio) out.push(`O cupom de 1 ano está ${f2(Math.abs(y1.premio.spread))} p.p. ${y1.premio.spread >= 0 ? 'acima' : 'abaixo'} do Treasury de 1 ano (prêmio Brasil em dólar).`)
  if (prev) {
    const m = formaDoMovimento(variacaoPorVertice(cc, prev, last))
    const c1 = variacaoPorVertice(cc, prev, last).find((c) => c.du === 252)
    if (m && c1) out.push(`Desde ${dm(prev)}: cupom de 1 ano ${sg(c1.bps, 'bps')}; movimento ${m.kind} (nível ${sg(m.level, 'bps')}, inclinação ${sg(m.slope, 'bps')}).`)
  }
  return out
}

const dm = (iso) => iso.split('-').reverse().slice(0, 2).join('/')
// Data da curva americana equivalente (a lista de datas dos EUA pode diferir das da B3).
export function matchUsDate(us, date) {
  const days = Object.keys(us?.curves ?? {}).sort()
  return days.filter((d) => d <= date).at(-1) ?? days.at(-1) ?? date
}
