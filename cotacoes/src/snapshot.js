// Números do resumo: juros (Selic, CDI, SOFR, DI 1 ano, Treasury 10 anos) a partir de macro.json e curves.json.
const last = (a) => (a?.length ? a[a.length - 1] : null)
const dm = (t) => new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })
const nearest = (pts, target) => pts?.reduce((b, p) => (b && Math.abs(b[0] - target) <= Math.abs(p[0] - target) ? b : p), null)
const at = (c, id) => c?.compare?.find((x) => x.id === id)

export function rateTiles(macro, curves) {
  const out = []
  const selic = last(macro?.selic)
  const cdi = last(macro?.cdi)
  const sofr = last(macro?.sofr)
  if (selic) out.push({ key: 'selic', label: 'Selic', value: selic[1], sub: 'meta a.a.', short: 'meta a.a.', at: selic[0] })
  if (cdi) out.push({ key: 'cdi', label: 'CDI', value: cdi[1], sub: `a.a. · ${dm(cdi[0])}`, short: 'a.a.', at: cdi[0] })
  if (sofr) out.push({ key: 'sofr', label: 'SOFR', value: sofr[1], sub: `EUA · ${dm(sofr[0])}`, short: 'EUA', at: sofr[0] })

  const brNow = at(curves?.br, 'hoje')
  if (brNow) {
    const a = nearest(curves.br.curves[brNow.date], 252)
    const prev = at(curves.br, 'd1')
    const b = prev && nearest(curves.br.curves[prev.date], 252)
    if (a) out.push({ key: 'di1', label: 'DI 1 ano', value: a[1], delta: b ? a[1] - b[1] : null, sub: `B3 · ${dm(brNow.date + 'T12:00:00Z')}`, short: 'B3', at: Date.parse(`${brNow.date}T12:00:00Z`) })
  }
  const usNow = at(curves?.us, 'hoje')
  if (usNow) {
    const a = curves.us.curves[usNow.date]?.find((p) => p[2] === '10 Yr')
    const prev = at(curves.us, 'd1')
    const b = prev && curves.us.curves[prev.date]?.find((p) => p[2] === '10 Yr')
    if (a) out.push({ key: 'ust10', label: 'Treasury 10a', value: a[1], delta: b ? a[1] - b[1] : null, sub: `EUA · ${dm(usNow.date + 'T12:00:00Z')}`, short: 'EUA', at: Date.parse(`${usNow.date}T12:00:00Z`) })
  }
  return out
}

// Manchete mais recente de cada moeda (notícias já traduzidas), uma por moeda.
export function topHeadlines(news, codes = ['USD', 'EUR', 'JPY', 'CNH']) {
  return codes
    .map((code) => {
      const items = news?.news?.[code] ?? []
      const best = items.reduce((b, n) => (!b || (n.t ?? 0) > (b.t ?? 0) ? n : b), null)
      return best ? { code, ...best } : null
    })
    .filter(Boolean)
}
