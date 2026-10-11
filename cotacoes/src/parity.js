// Paridade EUR/USD calculada a partir das séries USD/BRL e EUR/BRL (sem consultar outro par). invert=false: USD/EUR; invert=true: EUR/USD.
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

// Paridade ao vivo EUR/USD (dólares por 1 euro, convenção de mercado) a partir das cotações USD/BRL e EUR/BRL.
// compra = euro compra ÷ dólar venda; venda = euro venda ÷ dólar compra; principal = euro compra ÷ dólar compra.
export function liveParity(usd, eur) {
  if (!usd || !eur || !(usd.bid > 0) || !(eur.bid > 0) || !(eur.ask > 0) || !(usd.ask > 0)) return null
  const pct = ((1 + eur.pct / 100) / (1 + usd.pct / 100) - 1) * 100
  return { main: eur.bid / usd.bid, buy: eur.bid / usd.ask, sell: eur.ask / usd.bid, pct: Number.isFinite(pct) ? pct : 0 }
}

// Cruzamento genérico base/cotada (unidades da cotada por 1 da base), a partir das cotações em reais de cada moeda.
export function liveCross(base, quote) {
  if (!base || !quote || !(base.bid > 0) || !(quote.bid > 0)) return null
  const pct = ((1 + base.pct / 100) / (1 + quote.pct / 100) - 1) * 100
  return { main: base.bid / quote.bid, pct: Number.isFinite(pct) ? pct : 0 }
}
