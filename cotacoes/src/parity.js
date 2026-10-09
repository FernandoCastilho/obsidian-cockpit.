// Paridade dólar/euro calculada a partir das séries USD/BRL e EUR/BRL (sem consultar outro par).
const day = (t) => {
  const d = new Date(t)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

const ratio = (usd, eur, invert) => (invert ? eur / usd : usd / eur)

// Diário: uma razão por dia em que as duas moedas têm fechamento.
export function mergeDaily(usd, eur, invert = false) {
  const byDay = new Map(eur.map((p) => [day(p.t), p.bid]))
  return usd
    .filter((p) => byDay.has(day(p.t)))
    .map((p) => ({ t: p.t, bid: ratio(p.bid, byDay.get(day(p.t)), invert) }))
}

// Intraday: para cada cotação do dólar, usa a última cotação do euro até aquele instante.
export function mergeTicks(usd, eur, invert = false) {
  const out = []
  let j = -1
  for (const p of usd) {
    while (j + 1 < eur.length && eur[j + 1].t <= p.t) j++
    if (j >= 0) out.push({ t: p.t, bid: ratio(p.bid, eur[j].bid, invert) })
  }
  return out
}

// Paridade ao vivo (euros por 1 dólar) a partir das cotações USD/BRL e EUR/BRL.
// compra = dólar compra ÷ euro venda; venda = dólar venda ÷ euro compra; principal = dólar compra ÷ euro compra.
export function liveParity(usd, eur) {
  if (!usd || !eur || !(usd.bid > 0) || !(eur.bid > 0) || !(eur.ask > 0) || !(usd.ask > 0)) return null
  const pct = ((1 + usd.pct / 100) / (1 + eur.pct / 100) - 1) * 100
  return { main: usd.bid / eur.bid, buy: usd.bid / eur.ask, sell: usd.ask / eur.bid, pct: Number.isFinite(pct) ? pct : 0 }
}
