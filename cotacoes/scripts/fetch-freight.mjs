import {readFile,writeFile} from 'node:fs/promises'
import {loadPrevious} from './prev-lib.mjs'
import {FREIGHT_API,parseFreight,freightFile} from './freight-lib.mjs'
const output=new URL('../public/freight.json',import.meta.url),now=new Date().toISOString()
let local
try{local=JSON.parse(await readFile(output,'utf8'))}catch{/* ignora */}
const remote=await loadPrevious('freight.json')
const previous=[local,remote].filter(f=>f?.series?.id==='freight-us-ppi' && f.series.points?.length).sort((a,b)=>Date.parse(b.series.checkedAt)-Date.parse(a.series.checkedAt))[0]
let result
// Monthly source: at most one call per 24h, never one call per website visitor.
if(previous && !previous.series.stale && Date.now()-Date.parse(previous.series.checkedAt)<86400000)result=previous
else try {
 const response=await fetch(FREIGHT_API,{signal:AbortSignal.timeout(30000)})
 if(!response.ok)throw new Error(`BLS HTTP ${response.status}`)
 const fresh=parseFreight(await response.json())
 if(previous && fresh.at(-1).period<previous.series.points.at(-1).period)throw new Error('BLS retornou cobertura anterior à preservada')
 const merged=new Map((previous?.series.points || []).map(p=>[p.period,p]))
 for(const p of fresh)merged.set(p.period,p)
 result=freightFile([...merged.values()].sort((a,b)=>a.period.localeCompare(b.period)),now)
}catch(error){
 result=previous?{...previous,series:{...previous.series,stale:true,error:error.message}}:freightFile([],now,{stale:true,error:error.message})
}
await writeFile(output,JSON.stringify(result,null,2)+'\n')
console.log(`BLS fretes EUA: ${result.series.points.length} meses; último ${result.series.points.at(-1)?.period || 'ausente'}; pendente=${!!result.series.stale}`)
