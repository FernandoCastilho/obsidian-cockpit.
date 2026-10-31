import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {b3CollectionDecision,saoPauloParts,FOCUS_CRON} from '../scripts/data-schedules.mjs'
import {collectFocus,preserveFocus} from '../scripts/focus-collector.mjs'
test('B3 closes listed derivatives on official holidays, not Sao Paulo or US-only holidays',()=>{
 for(const d of ['2026-02-16','2026-02-17','2026-11-02','2026-11-20','2026-12-24','2026-12-31'])assert.equal(b3CollectionDecision(d+'T15:00:00Z').run,false)
 for(const d of ['2026-07-09','2026-07-03','2026-11-26','2026-02-18'])assert.equal(b3CollectionDecision(d+'T15:00:00Z').run,true)
 assert.equal(b3CollectionDecision('2026-10-25T15:00:00Z').run,false)
 assert.equal(b3CollectionDecision('2027-01-04T15:00:00Z').run,false)
})
test('B3 respects Brazil civil date and deduplicates only completed same-hour checks',()=>{
 assert.equal(saoPauloParts('2026-10-27T01:30:00Z').date,'2026-10-26')
 assert.equal(b3CollectionDecision('2026-10-26T15:50:00Z','2026-10-26T15:17:00Z').run,false)
 assert.equal(b3CollectionDecision('2026-10-26T16:17:00Z','2026-10-26T15:17:00Z').run,true)
 assert.equal(b3CollectionDecision('2026-10-26T16:17:00Z').run,true)
})
test('one weekly cron at Monday09:30 Brazil; hourly crons and coin workflow not duplicated',async()=>{
 assert.equal(FOCUS_CRON,'30 12 * * 1');const p=saoPauloParts('2026-11-02T12:30:00Z');assert.equal(p.weekday,'Mon');assert.equal(p.hour,'09');assert.equal(p.minute,'30')
 const y=await readFile(new URL('../../.github/workflows/pages.yml',import.meta.url),'utf8')
 const crons=[...y.matchAll(/- cron: '([^']+)'/g)].map(m=>m[1]);assert.equal(crons.length,3);assert.equal(new Set(crons).size,3)
 assert.match(y,/if: github.event.schedule == '30 12 \* \* 1'/)
 assert.equal((y.match(/if: github.event.schedule != '30 12 \* \* 1'/g)||[]).length,24)
})
test('Focus failure/skip preserves actual publication date, values and quote timestamps',()=>{
 const prev={generatedAt:1,focusCheckedAt:2,focus:{date:'2026-10-23',rows:[{values:{2026:10}}]},stale:{focus:1}}
 const skipped=preserveFocus({generatedAt:3},prev,{skipped:true,checkedAt:3});assert.deepEqual(skipped.focus,prev.focus);assert.equal(skipped.focusCheckedAt,2);assert.equal(skipped.stale.focus,1)
 const failed=preserveFocus({},prev,{checkedAt:4,error:'HTTP503'});assert.deepEqual(failed.focus,prev.focus);assert.equal(failed.focusSchedule.error,'HTTP503');assert.equal(failed.focus.date,'2026-10-23')
})
test('Focus rejects missing rows and non-OK responses rather than replacing verified snapshot',async()=>{
 await assert.rejects(collectFocus({fetchImpl:async()=>({ok:false,status:503})}),/HTTP 503/)
 await assert.rejects(collectFocus({fetchImpl:async()=>({ok:true,json:async()=>({value:[]})})}),/incompleto/)
})
test('Focus complete response is deterministic and uses source dates, not an invented publication date',async()=>{
 const row={Data:'2026-10-23',DataReferencia:'2026',Mediana:10,Minimo:9,Maximo:11,numeroRespondentes:50}
 const fetchImpl=async()=>({ok:true,json:async()=>({value:[row]})})
 const a=await collectFocus({fetchImpl,now:Date.parse('2026-10-26T12:30:00Z')}),b=await collectFocus({fetchImpl,now:Date.parse('2026-10-26T12:31:00Z')})
 assert.deepEqual(a,b);assert.equal(a.rows.length,4);assert.equal(a.date,'2026-10-23');assert.equal(a.release,undefined)
 let count=0
 await assert.rejects(collectFocus({now:Date.parse('2026-10-26T12:30:00Z'),fetchImpl:async()=>({ok:true,json:async()=>({value:[{...row,Data:++count===2?'2026-10-22':row.Data}]})})}),/divergentes/)
 await assert.rejects(collectFocus({now:Date.parse('2026-10-26T12:30:00Z'),fetchImpl:async()=>({ok:true,json:async()=>({value:[{...row,Mediana:NaN}]})})}),/incompleto/)
})
test('weekly refresh changes only Focus; missing prerequisite aborts before any write',async()=>{
 const {refreshScenarios,RETAIN_FILES}=await import('../scripts/refresh-scenarios.mjs')
 const old={generatedAt:10,focusCheckedAt:9,focus:{date:'2026-10-16',rows:[]},ptax:{USD:{sell:5}},stale:{focus:9}}
 const inputs=Object.fromEntries(RETAIN_FILES.map(f=>[f,f==='macro.json'?old:{generatedAt:8,value:f}]))
 const written={};const focus={date:'2026-10-23',rows:[]}
 await refreshScenarios({load:async f=>inputs[f],collect:async()=>focus,save:async(f,d)=>written[f]=d,now:20})
 assert.deepEqual(written['macro.json'].ptax,old.ptax);assert.equal(written['macro.json'].generatedAt,10);assert.equal(written['macro.json'].focus.date,'2026-10-23');assert.equal(written['macro.json'].stale.focus,undefined)
 for(const f of RETAIN_FILES.filter(f=>f!=='macro.json'))assert.deepEqual(written[f],inputs[f])
 let writes=0;await assert.rejects(refreshScenarios({load:async f=>f==='oil.json'?null:inputs[f],save:async()=>writes++}),/preservar oil/);assert.equal(writes,0)
 const retained=await refreshScenarios({load:async f=>inputs[f],collect:async()=>{throw new Error('HTTP503')},save:async()=>{},now:20});assert.deepEqual(retained['macro.json'].focus,old.focus);assert.equal(retained['macro.json'].stale.focus,9)
})
test('hourly triggers cover exactly each Brazil weekday hour once and weekly cannot cancel active deployment',async()=>{
 const y=await readFile(new URL('../../.github/workflows/pages.yml',import.meta.url),'utf8');assert.match(y,/cancel-in-progress: false/)
 const hours=[]
 for(let day=25;day<=31;day++)for(let hour=0;hour<24;hour++){
  const utc=new Date(Date.UTC(2026,9,day,hour,17)),weekday=utc.getUTCDay()
  if((hour>=3&&weekday>=1&&weekday<=5)||(hour<=2&&weekday>=2&&weekday<=6)){const p=saoPauloParts(utc);assert.ok(!['Sat','Sun'].includes(p.weekday));hours.push(p.date+'T'+p.hour)}
 }
 assert.equal(hours.length,120);assert.equal(new Set(hours).size,120)
})
