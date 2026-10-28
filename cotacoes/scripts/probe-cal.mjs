const B = 'https://raw.githubusercontent.com/FernandoCastilho/obsidian-cockpit./data'
for (const f of ['history.json', 'intraday.json']) {
  const j = await (await fetch(`${B}/${f}`)).json()
  console.log('###', f, Object.keys(j).join(','), 'gen', j.generatedAt)
  const root = j.series ?? j.history ?? j.data ?? j
  for (const [k, v] of Object.entries(root)) {
    const pts = Array.isArray(v) ? v : v?.points
    if (!Array.isArray(pts)) { console.log(k, typeof v, JSON.stringify(v)?.slice(0, 120)); continue }
    console.log(k, 'n=', pts.length, 'first', JSON.stringify(pts[0]), 'last', JSON.stringify(pts.at(-1)), 'prev', JSON.stringify(pts.at(-2)))
  }
}
const q = await (await fetch(`${B}/quotes.json`)).json()
console.log('quotes', Object.keys(q.quotes).join(','), q.generatedAt)
