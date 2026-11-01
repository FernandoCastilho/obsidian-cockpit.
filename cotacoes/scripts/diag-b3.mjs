// Diagnóstico (não publica nada): a B3 respeita a data pedida em GetList? Pede a mesma curva em várias datas e formatos e compara.
import { createHash } from 'node:crypto'
import { b3Url } from './curves-lib.mjs'
const H = { 'user-agent': 'Mozilla/5.0', accept: 'application/json' }
const get = async (route, params) => { const r = await fetch(b3Url(route, params), { headers: H, signal: AbortSignal.timeout(30000) }); const t = await r.text(); return { status: r.status, t } }
const hash = (s) => createHash('sha1').update(s).digest('hex').slice(0, 10)
for (const id of ['PRE', 'DOL']) {
  const cat = await get('GetDate', { language: 'pt-br', id })
  let dates = []; try { dates = JSON.parse(cat.t) } catch {}
  console.log(`\n== ${id} GetDate HTTP ${cat.status}: ${dates.length} datas; primeiras: ${JSON.stringify(dates.slice(0, 4))}`)
  const picks = [dates[0], dates[1], dates[5], dates[20]].filter(Boolean)
  for (const raw of picks) {
    const iso = String(raw).slice(0, 10), [y, m, d] = iso.split('-')
    for (const fmt of [...new Set([raw, iso, `${d}/${m}/${y}`, `${y}${m}${d}`])]) {
      for (const key of ['date', 'Date', 'referenceDate']) {
        const r = await get('GetList', { language: 'pt-br', id, pageNumber: 1, pageSize: 100, [key]: fmt })
        let first = '', keys = '', n = ''
        try { const j = JSON.parse(r.t); const res = j.results || []; n = `${j.page?.totalRecords} vértices`; keys = Object.keys(res[0] || {}).join(','); first = JSON.stringify(res.slice(0, 2)) } catch { first = r.t.slice(0, 120) }
        console.log(`${id} pedido ${key}=${fmt} → HTTP ${r.status} · ${n} · hash ${hash(r.t)} · campos [${keys}] · ${first.slice(0, 220)}`)
      }
    }
  }
}
