// Coleta barras de 5 min (últimos 5 dias úteis) de USD, EUR, JPY e CNH em reais e grava public/intraday.json.
import { mkdir, writeFile } from 'node:fs/promises'
import { SYMBOLS, mergeSnapshots, parseYahoo, yahooUrl } from './intraday-lib.mjs'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const errors = []

// O Yahoo responde 429 para IPs compartilhados do GitHub: alterna entre os dois hosts e espaça as tentativas.
const HOSTS = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com']

async function getJson(url0, label, tries = 4) {
  let last
  for (let i = 1; i <= tries; i++) {
    const url = url0.replace(HOSTS[0], HOSTS[(i - 1) % HOSTS.length])
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36', accept: 'application/json' }, signal: AbortSignal.timeout(25000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (e) {
      last = e
      await sleep(3000 * i)
    }
  }
  errors.push(`${label}: ${last.message}`)
  return null
}

const PAIRS = { USD: 'USD-BRL', EUR: 'EUR-BRL', JPY: 'JPY-BRL', CNH: 'CNY-BRL' }
const series = {}
for (const [code, symbol] of Object.entries(SYMBOLS)) {
  const points = parseYahoo(await getJson(yahooUrl(symbol), `intraday ${code}`))
  if (points.length) series[code] = { symbol, points }
  console.log(code, symbol, points.length, 'barras')
  await sleep(300)
}

const total = Object.values(series).reduce((n, s) => n + s.points.length, 0)
if (errors.length) console.warn('Falhas:', errors.join(' | '))

let out = { generatedAt: Date.now(), source: 'Yahoo Finance', resolution: '5 min', series, errors }
if (!total) {
  // Yahoo indisponível: parte do intraday.json já publicado e acrescenta uma amostra por hora da AwesomeAPI.
  // Nunca derruba o deploy: o intraday é um complemento e as demais coletas precisam seguir.
  const [owner, repo] = (process.env.GITHUB_REPOSITORY ?? '').split('/')
  const prev = owner ? await getJson(`https://${owner.toLowerCase()}.github.io/${repo}/intraday.json`, 'intraday publicado', 2) : null
  const snaps = {}
  for (const [code, pair] of Object.entries(PAIRS)) {
    const j = await getJson(`https://economia.awesomeapi.com.br/json/last/${pair}`, `amostra ${code}`, 3)
    const q = j?.[pair.replace('-', '')]
    if (q) snaps[code] = [Number(q.timestamp) * 1000, Number(q.bid)]
  }
  const merged = mergeSnapshots(prev?.series, snaps)
  const n = Object.values(merged).reduce((k, s) => k + s.points.length, 0)
  const hourly = Object.values(merged).some((s) => s.hourly) || Object.keys(snaps).length > 0
  for (const c of Object.keys(snaps)) if (merged[c]) merged[c].hourly = true
  out = { generatedAt: Date.now(), source: hourly ? 'AwesomeAPI (1 amostra por hora; Yahoo indisponível)' : (prev?.source ?? 'Yahoo Finance'), resolution: hourly ? '1 h' : (prev?.resolution ?? '5 min'), series: merged, errors }
  console.log('Yahoo indisponível; amostras horárias:', Object.keys(snaps).join(',') || 'nenhuma', '·', n, 'pontos no total')
}
await mkdir(new URL('../public/', import.meta.url), { recursive: true })
await writeFile(new URL('../public/intraday.json', import.meta.url), JSON.stringify(out))
console.log('intraday.json gravado')
