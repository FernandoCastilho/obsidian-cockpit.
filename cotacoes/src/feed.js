// Fila única de manchetes (estilo terminal): junta as moedas, une a mesma matéria em vários tickers e ordena por horário.
export function buildFeed(news, filter = 'ALL', limit = 60) {
  // A mesma matéria pode chegar com links diferentes (cada busca do Google Notícias gera o seu): une também pelo título + veículo.
  const byLink = new Map(), byTitle = new Map()
  const titleKey = (n) => `${String(n.title).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()}|${String(n.source ?? '').toLowerCase()}`
  for (const [code, items] of Object.entries(news ?? {})) {
    for (const n of items ?? []) {
      if (!n?.link || !n.title) continue
      const cur = byLink.get(n.link) ?? byTitle.get(titleKey(n))
      if (cur) { if (!cur.codes.includes(code)) cur.codes.push(code) }
      else { const item = { ...n, codes: [code] }; byLink.set(n.link, item); byTitle.set(titleKey(n), item) }
    }
  }
  return [...byLink.values()]
    .filter((n) => filter === 'ALL' || n.codes.includes(filter))
    .sort((a, b) => (b.t ?? 0) - (a.t ?? 0))
    .slice(0, limit)
}
