const B = 'https://raw.githubusercontent.com/FernandoCastilho/obsidian-cockpit./data'
const i = await (await fetch(`${B}/intraday.json`)).json()
const iso = (t) => new Date(t).toISOString().slice(5, 16)
for (const c of ['USD', 'EUR', 'JPY', 'CNH']) {
  const p = i.series[c].points
  const k = p.findIndex((x, n) => n && Math.abs(x[1] / p[n - 1][1] - 1) > 0.05)
  console.log('###', c, 'n', p.length, 'salto idx', k, 'res', i.resolution)
  if (k > 0) for (const x of p.slice(Math.max(0, k - 4), k + 4)) console.log(c, iso(x[0]), x[1])
  console.log(c, 'primeiros', p.slice(0, 3).map((x) => iso(x[0]) + '=' + x[1]).join(' '))
}
const h = await (await fetch(`${B}/history.json`)).json()
for (const c of ['USD', 'EUR', 'JPY', 'CNH']) {
  const p = h.series[c].points.slice(-8)
  console.log('hist', c, p.map((x) => iso(x.t) + '=' + (+x.bid).toFixed(4)).join(' '))
}
const q = await (await fetch(`${B}/quotes.json`)).json()
console.log('quotes', JSON.stringify(Object.fromEntries(Object.entries(q.quotes).map(([k, v]) => [k, [v.bid, v.timestamp, v.pctChange]]))), new Date(q.generatedAt).toISOString())
