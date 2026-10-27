import {mkdir,writeFile} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import {resolve} from 'node:path'
import {loadPrevious} from './prev-lib.mjs'
import {collectFocus,preserveFocus} from './focus-collector.mjs'
export const RETAIN_FILES=['macro.json','curves.json','news.json','feriados.json','oil.json','commodities.json','freight.json','policy-rates.json']
const saveFile=async(file,out)=>{await mkdir(new URL('../public/',import.meta.url),{recursive:true});await writeFile(new URL('../public/'+file,import.meta.url),JSON.stringify(out))}
export async function refreshScenarios({load=loadPrevious,collect=collectFocus,save=saveFile,now=Date.now()}={}) {
 const retained={}
 // Resolve every prerequisite before writing any file. Failure aborts deployment.
 for(const file of RETAIN_FILES){const value=await load(file);if(!value||typeof value!=='object')throw new Error(`Publicação semanal abortada: não foi possível preservar ${file}`);retained[file]=value}
 const previous=retained['macro.json'];let macro
 try {macro={...previous,focus:await collect({now}),focusCheckedAt:now,focusSchedule:{cadence:'segunda 09:30 America/Sao_Paulo',skipped:false,error:null},stale:{...previous.stale}};delete macro.stale.focus}
 catch(error){macro=preserveFocus({...previous},previous,{checkedAt:now,error:error.message});console.warn('Focus: último dado preservado; '+error.message)}
 retained['macro.json']=macro
 for(const file of RETAIN_FILES)await save(file,retained[file])
 return retained
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await refreshScenarios()
