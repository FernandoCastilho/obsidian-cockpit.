// SONDAGEM TEMPORÁRIA: PTAX no macro.json publicado.
const r = await fetch('https://fernandocastilho.github.io/obsidian-cockpit./macro.json?t=' + Date.now())
const m = await r.json()
console.log('HTTP', r.status, 'generatedAt', new Date(m.generatedAt).toISOString(), 'errors', JSON.stringify(m.errors), 'stale', JSON.stringify(m.stale))
console.log('ptax', JSON.stringify(m.ptax))
console.log('ptaxHist chaves', Object.keys(m.ptaxHist ?? {}), 'USD últimos', JSON.stringify(Object.entries(m.ptaxHist?.USD ?? {}).slice(-3)))
