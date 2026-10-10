// Quais blocos de dados estão sendo servidos com o último dado publicado (fonte fora do ar) há mais de `hours` horas.
const LABELS = {
  macro: { cdi: 'CDI', selic: 'Selic', sofr: 'SOFR', sofrAvg: 'médias da SOFR', focus: 'Boletim Focus', ptax: 'PTAX' },
  curves: { br: 'DI x pré', cc: 'cupom cambial', us: 'Treasuries' },
  news: { USD: 'notícias do USD', EUR: 'notícias do EUR', JPY: 'notícias do JPY', CNH: 'notícias do CNH' },
}

// files = { macro, curves, news } (conteúdo dos JSON gerados). Devolve [{ file, key, label, since, hours }].
export function staleReport(files, now = Date.now(), hours = 6) {
  const items = []
  for (const [file, labels] of Object.entries(LABELS)) {
    for (const [key, since] of Object.entries(files?.[file]?.stale ?? {})) {
      const h = since ? (now - since) / 36e5 : Infinity
      if (h > hours) items.push({ file, key, label: labels[key] ?? key, since: since ?? null, hours: Number.isFinite(h) ? Math.round(h * 10) / 10 : null })
    }
  }
  return items
}
