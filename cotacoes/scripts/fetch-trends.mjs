import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { loadPrevious } from './prev-lib.mjs'
import { collectTrends } from './trends-lib.mjs'
import { validTrendData, trendStamp } from '../src/trends.js'
const output = new URL('../public/trends.json', import.meta.url)
let local = null
try { local = JSON.parse(await readFile(output, 'utf8')) } catch { /* primeira coleta */ }
const remote = await loadPrevious('trends.json')
const previous = [local, remote].filter(validTrendData).sort((a, b) => trendStamp(b.generatedAt) - trendStamp(a.generatedAt))[0]
// Builds horários preservam o snapshot; só as duas agendas e execuções manuais consultam a fonte.
const shouldCollect = process.env.TRENDS_COLLECT !== 'false'
const result = shouldCollect ? await collectTrends({ previous }) : previous ?? { generatedAt: null, source: 'https://trends.google.com/trending/rss?geo=BR', region: 'BR', items: [], stale: true }
await mkdir(new URL('../public/', import.meta.url), { recursive: true })
await writeFile(output, JSON.stringify(result) + '\n', 'utf8')
console.log(`Trends: ${shouldCollect ? 'consulta' : 'preservação'}; ${result.items.length} itens; coleta válida=${result.generatedAt}; stale=${result.stale}`)
