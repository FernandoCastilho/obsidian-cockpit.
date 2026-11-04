import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {loadPrevious} from './prev-lib.mjs'
import {refreshHeavy} from './heavy-vehicles-lib.mjs'
const output=new URL('../public/heavy-vehicles.json',import.meta.url)
let local=null;try{local=JSON.parse(await readFile(output,'utf8'))}catch{/* primeira coleta */}
const remote=await loadPrevious('heavy-vehicles.json'),previous=[local,remote].filter(x=>x?.generatedAt).sort((a,b)=>b.generatedAt-a.generatedAt)[0]
const result=await refreshHeavy({previous,force:process.env.HEAVY_FORCE==='1',extractPdf:buf=>{
 const run=spawnSync(process.env.PYTHON || 'python3',[fileURLToPath(new URL('./read-heavy-pdf.py',import.meta.url))],{input:buf,maxBuffer:8*1024*1024})
 if(run.status!==0)throw new Error('Não foi possível ler o PDF oficial')
 return JSON.parse(run.stdout.toString())
}})
if(result.stale||result.error)console.warn('ANFAVEA: última referência preservada; '+result.error)
await mkdir(new URL('../public/',import.meta.url),{recursive:true});await writeFile(output,JSON.stringify(result)+'\n')
console.log('ANFAVEA: referência '+(result.period||'indisponível'))
