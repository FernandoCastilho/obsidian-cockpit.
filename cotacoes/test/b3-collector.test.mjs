import test from 'node:test'
import assert from 'node:assert/strict'
import { collectB3Curve, requestB3 } from '../scripts/b3-collector.mjs'
import { parseB3 } from '../scripts/curves-lib.mjs'
const page = (rows,totalPages=1,totalRecords=rows.length) => ({page:{totalPages,totalRecords},results:rows})
const row=(day252,rate='13,65')=>({code:'PRE',day252,rate})

test('B3 retries HTTP200 empty body and empty catalogue without treating them as data', async()=>{
 let calls=0
 const fetchImpl=async()=>({ok:true,status:200,text:async()=>++calls===1?'':calls===2?'[]':'["2026-10-23T00:00:00"]'})
 assert.deepEqual(await requestB3('GetDate',{}, {fetchImpl,wait:async()=>{},tries:3}),['2026-10-23T00:00:00'])
 assert.equal(calls,3)
})
test('B3 rates keep numeric/dot decimal values and reject blank or malformed input',()=>{
 assert.deepEqual(parseB3([row(1,13.65),row(2,'13.65'),row(3,'13,65'),row(4,''),row(5,'1,000.00')]),[[1,13.65],[2,13.65],[3,13.65]])
})
test('B3 assembles all pages atomically and keeps actual reference separate from check time',async()=>{
 const data=await collectB3Curve('PRE',1,{now:123,request:async(route,p)=>route==='GetDate'?['2026-10-23']:page([row(p.pageNumber)],2,2)})
 assert.equal(data.sourceDate,'2026-10-23');assert.equal(data.checkedAt,123)
 assert.equal(data.curves['2026-10-23'].length,2);assert.equal(data.discoveryPending,false)
})
test('missing last page or invalid rows cannot publish a truncated latest curve',async()=>{
 await assert.rejects(()=>collectB3Curve('PRE',1,{request:async(route,p)=>route==='GetDate'?['2026-10-23']:p.pageNumber===1?page([row(1)],2,2):Promise.reject(new Error('HTTP 200 vazio'))}),/HTTP 200 vazio/)
 await assert.rejects(()=>collectB3Curve('PRE',1,{request:async route=>route==='GetDate'?['2026-10-23']:page([row(1,'')])}),/inválidos/)
})
test('catalogue failure can recheck known official dates but does not claim newest reference confirmed',async()=>{
 const previous={compare:[{id:'hoje',date:'2026-10-23'}],curves:{'2026-10-23':[[1,13.65]]}}
 const data=await collectB3Curve('PRE',1,{previous,request:async route=>route==='GetDate'?Promise.reject(new Error('resposta vazia')):page([row(1)])})
 assert.equal(data.sourceDate,'2026-10-23');assert.equal(data.discoveryPending,true)
 assert.match(data.warnings[0],/mais recente não confirmada/)
 await assert.rejects(()=>collectB3Curve('PRE',1,{request:async()=>{throw new Error('resposta vazia')}}),/datas/)
})
test('comparação não pode ser cópia da curva do último dia: tenta outros formatos de data e, se a B3 ignorar a data, omite',async()=>{
 const cat=['2026-10-30T00:00:00','2026-10-29T00:00:00','2026-10-23T00:00:00']
 const curva=(v)=>page([row(1,v)])
 // B3 ignora qualquer data: tudo igual → só o último dia, com aviso; cópia antiga também não é reaproveitada
 const previous={curves:{'2026-10-29':[[1,13.65]]}}
 const ignora=await collectB3Curve('PRE',1,{previous,request:async route=>route==='GetDate'?cat:curva(13.65)})
 assert.deepEqual(ignora.compare.map(c=>c.date),['2026-10-30'])
 assert.match(ignora.warnings.join(' '),/devolveu a curva do último dia/)
 // B3 só respeita dd/mm/aaaa: comparações chegam com os valores certos
 const pedidos=[]
 const br=await collectB3Curve('PRE',1,{request:async(route,p)=>{if(route==='GetDate')return cat;pedidos.push(p.date);const m=String(p.date).match(/^(\d{2})\/10\/2026$/);return curva(m?13+Number(m[1])/100:13.30)}})
 assert.deepEqual(br.compare.map(c=>c.date),['2026-10-30','2026-10-29','2026-10-23'])
 assert.deepEqual(br.curves['2026-10-29'],[[1,13.29]]);assert.deepEqual(br.curves['2026-10-23'],[[1,13.23]])
 assert.equal(pedidos[0],'2026-10-30T00:00:00','o último dia é pedido no formato do catálogo')
 // B3 respeita o formato do catálogo: uma chamada por comparação
 const n=[];await collectB3Curve('PRE',1,{request:async(route,p)=>{if(route==='GetDate')return cat;n.push(p.date);return curva({'2026-10-30T00:00:00':13.3,'2026-10-29T00:00:00':13.29,'2026-10-23T00:00:00':13.23}[p.date] ?? 13.3)}})
 assert.deepEqual(n,cat)
})
test('app: comparação idêntica ao último dia some (dados já publicados com cópia)',async()=>{
 const { semCopias } = await import('../src/useCurves.js')
 const set={compare:[{date:'2026-10-30'},{date:'2026-10-29'},{date:'2026-10-23'}],curves:{'2026-10-30':[[1,13.65]],'2026-10-29':[[1,13.65]],'2026-10-23':[[1,13.5]]}}
 assert.deepEqual(semCopias(set).compare.map(c=>c.date),['2026-10-30','2026-10-23'])
 const ok={compare:[{date:'a'},{date:'b'}],curves:{a:[[1,1]],b:[[1,2]]}}
 assert.equal(semCopias(ok),ok,'sem cópia, mesmo objeto')
 assert.equal(semCopias(null),null)
})
