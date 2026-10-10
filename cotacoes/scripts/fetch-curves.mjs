// Coleta as curvas de juros (DI x pré da B3 e Treasuries dos EUA) e grava public/curves.json. Rodado a cada hora pelo GitHub Actions.
import { mkdir, writeFile } from 'node:fs/promises'
import { b3Url, parseB3, parseTreasury, pickDates } from './curves-lib.mjs'

const UA = { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36', accept: 'application/json, text/csv, */*' }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const errors = []

async function get(url, label, text = false, tries = 4) {
  let last
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(30000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = await res.text()
      if (!body.trim()) throw new Error(`resposta vazia (HTTP ${res.status})`)
      return text ? body : JSON.parse(body)
    } catch (e) {
      last = e
      await sleep(2000 * i)
    }
  }
  errors.push(`${label}: ${last.message}`)
  return null
}

const out = { generatedAt: Date.now(), br: null, cc: null, us: null, errors }

// Brasil (B3, Taxas referenciais): PRE = DI x pré; DOL = DI x dólar (cupom cambial). minDays corta os vértices curtos, muito ruidosos no cupom.
async function b3Curve(id, minDays) {
  const dates = await get(b3Url('GetDate', { language: 'pt-br', id }), `B3 ${id} datas`)
  const picks = pickDates(dates ?? [])
  const curves = {}
  for (const p of picks) {
    const pts = []
    for (let page = 1; page <= 5; page++) {
      const r = await get(b3Url('GetList', { language: 'pt-br', id, pageNumber: page, pageSize: 100, date: p.date }), `B3 ${id} ${p.date} p${page}`)
      pts.push(...parseB3(r?.results, minDays))
      if (!r || page >= (r.page?.totalPages ?? 0)) break
    }
    if (pts.length) curves[p.date] = pts
  }
  const compare = picks.filter((p) => curves[p.date])
  console.log(`B3 ${id}:`, compare.map((p) => p.date).join(', ') || 'sem dados')
  return compare.length ? { compare, curves } : null
}
out.br = await b3Curve('PRE', 1)
out.cc = await b3Curve('DOL', 21)

// EUA: Treasury par yield curve (Tesouro dos EUA)
{
  const year = new Date().getUTCFullYear()
  let all = {}
  for (const y of [year - 1, year]) {
    const csv = await get(`https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/${y}/all?type=daily_treasury_yield_curve&field_tdr_date_value=${y}&page&_format=csv`, `Treasury ${y}`, true)
    if (csv) all = { ...all, ...parseTreasury(csv) }
  }
  const picks = pickDates(Object.keys(all))
  const curves = Object.fromEntries(picks.map((p) => [p.date, all[p.date].map(([years, rate, label]) => [years, rate, label])]))
  out.us = picks.length ? { compare: picks, curves } : null
  console.log('Treasuries:', picks.map((p) => p.date).join(', ') || 'sem dados')
}

if (!out.br && !out.us && process.env.CURVES_STRICT) {
  console.error('Nenhuma curva coletada:', errors)
  process.exit(1)
}
await mkdir(new URL('../public/', import.meta.url), { recursive: true })
await writeFile(new URL('../public/curves.json', import.meta.url), JSON.stringify(out))
if (errors.length) console.log('Avisos:', errors.join(' | '))
