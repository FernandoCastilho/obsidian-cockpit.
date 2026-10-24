import { readFile, writeFile } from 'node:fs/promises'
import { loadPrevious } from './prev-lib.mjs'
import { POLICY_SOURCES, parseFedPolicy, parseEcbPolicy, parseBoePolicy, normalizePolicyPoints, preservePolicySeries } from './policy-rates-lib.mjs'
import { collectBoj } from './boj-policy.mjs'

const output = new URL('../public/policy-rates.json', import.meta.url)
let local
try { local = JSON.parse(await readFile(output, 'utf8')) } catch {}
const remote = await loadPrevious('policy-rates.json')
const now = Date.now(), out = { schemaVersion:1, generatedAt:now, series:{}, errors:[] }
async function table(id, parse) {
  const response = await fetch(POLICY_SOURCES[id], { headers:{'user-agent':'Obsidian-Cockpit policy rates (public official tables)'}, signal:AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return {points:parse(await response.text()),sourceUrl:POLICY_SOURCES[id],checkedAt:now}
}
await Promise.all(Object.entries({FED:parseFedPolicy,ECB:parseEcbPolicy,BOE:parseBoePolicy,BOJ:null}).map(async ([id,parse]) => {
  // BOJ permits reproduction with credit but commercial use needs prior permission.
  // Do not infer the user's purpose, or retain previously collected values when blocked.
  if (id === 'BOJ' && !['noncommercial','permission-confirmed'].includes(process.env.POLICY_BOJ_USE)) {
    out.series[id] = {id,points:[],usagePending:true,checkedAt:null,sourceUrl:POLICY_SOURCES.BOJ}
    return
  }
  const previous = [local?.series?.[id],remote?.series?.[id]].filter(Boolean).sort((a,b)=>(b.checkedAt||0)-(a.checkedAt||0))[0]
  try {
    const series = id === 'BOJ' ? await collectBoj(previous,now) : await table(id,parse)
    series.points = normalizePolicyPoints(series.points)
    const last = previous?.points?.at(-1)?.date
    if (last && series.points.at(-1).date < last) throw new Error('Fonte retornou histórico anterior ao já validado')
    out.series[id] = {...series,id,checkedAt:now,stale:false}
  } catch(error) {
    out.series[id] = {...preservePolicySeries(previous,error),id,sourceUrl:previous?.sourceUrl || POLICY_SOURCES[id]}
    out.errors.push(`${id}: ${error.message}`)
  }
}))
await writeFile(output,`${JSON.stringify(out,null,2)}\n`)
for(const [id,s] of Object.entries(out.series)) console.log(`${id}: ${s.points.length} vigências; última ${s.points.at(-1)?.date || 'ausente'}; pendente=${!!(s.stale || s.usagePending)}`)
