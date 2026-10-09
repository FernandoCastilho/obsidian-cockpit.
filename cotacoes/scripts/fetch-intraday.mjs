// Coleta barras de 5 min (últimos 5 dias úteis) de USD, EUR, JPY e CNH em reais e grava public/intraday.json.
import { mkdir, writeFile } from 'node:fs/promises'
import { SYMBOLS, parseYahoo, yahooUrl } from './intraday-lib.mjs'

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

const series = {}
for (const [code, symbol] of Object.entries(SYMBOLS)) {
  const points = parseYahoo(await getJson(yahooUrl(symbol), `intraday ${code}`))
  if (points.length) series[code] = { symbol, points }
  console.log(code, symbol, points.length, 'barras')
  await sleep(300)
}

const total = Object.values(series).reduce((n, s) => n + s.points.length, 0)
if (errors.length) console.warn('Falhas:', errors.join(' | '))
if (!total) {
  // Sem barras novas: reaproveita o intraday.json já publicado, para não apagar o histórico do dia nem travar o deploy.
  const [owner, repo] = (process.env.GITHUB_REPOSITORY ?? '').split('/')
  const prev = owner ? await getJson(`https://${owner.toLowerCase()}.github.io/${repo}/intraday.json`, 'intraday publicado', 2) : null
  if (prev?.series && Object.keys(prev.series).length) {
    await mkdir(new URL('../public/', import.meta.url), { recursive: true })
    await writeFile(new URL('../public/intraday.json', import.meta.url), JSON.stringify(prev))
    console.log('Yahoo indisponível; mantido o intraday.json publicado anteriormente (gerado em', new Date(prev.generatedAt).toISOString() + ')')
    process.exit(0)
  }
  if (process.env.INTRADAY_STRICT === 'true') {
    console.error('Nenhuma barra coletada e nenhum intraday anterior disponível; abortando.')
    process.exit(1)
  }
}
await mkdir(new URL('../public/', import.meta.url), { recursive: true })
await writeFile(new URL('../public/intraday.json', import.meta.url), JSON.stringify({ generatedAt: Date.now(), source: 'Yahoo Finance', series, errors }))
console.log('intraday.json gravado:', total, 'barras')
