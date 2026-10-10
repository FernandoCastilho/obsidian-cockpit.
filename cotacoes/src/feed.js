// Fila única de manchetes (estilo terminal): junta as moedas, une a mesma matéria em vários tickers e ordena por horário.
export function buildFeed(news, filter = 'ALL', limit = 60) {
  const byLink = new Map()
  for (const [code, items] of Object.entries(news ?? {})) {
    for (const n of items ?? []) {
      if (!n?.link || !n.title) continue
      const cur = byLink.get(n.link)
      if (cur) cur.codes.push(code)
      else byLink.set(n.link, { ...n, codes: [code] })
    }
  }
  return [...byLink.values()]
    .filter((n) => filter === 'ALL' || n.codes.includes(filter))
    .sort((a, b) => (b.t ?? 0) - (a.t ?? 0))
    .slice(0, limit)
}
