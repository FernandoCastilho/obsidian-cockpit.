import test from 'node:test'
import assert from 'node:assert/strict'
import {recoveryWeek,shiftRecoveryWeek,normalizeRecoveryStatus} from '../src/recuperacao.js'
import {RECOVERY_SOURCE_URLS,RECOVERY_REVIEW_MS,recoveryReviewDue,reviewRecoverySources} from '../scripts/recuperacao-lib.mjs'
test('recovery week uses Brazil civil date and handles year boundary and invalid dates',()=>{
 assert.deepEqual(recoveryWeek('2026-01-01'),{start:'2025-12-29',end:'2026-01-04'})
 assert.deepEqual(recoveryWeek(Date.parse('2026-11-02T01:00:00Z')),{start:'2026-10-26',end:'2026-11-01'})
 assert.deepEqual(shiftRecoveryWeek(recoveryWeek('2026-01-01'),7),{start:'2026-01-05',end:'2026-01-11'})
 for(const v of ['2026-02-30','invalida','2026-13-01'])assert.equal(recoveryWeek(v),null)
})
test('source review is weekly, not an hourly process-data collection',()=>{
 assert.equal(recoveryReviewDue({reviewedAt:1000},1000+RECOVERY_REVIEW_MS-1),false)
 assert.equal(recoveryReviewDue({reviewedAt:1000},1000+RECOVERY_REVIEW_MS),true)
 assert.equal(recoveryReviewDue(null,1000),true)
})
test('collector only HEADs approved official addresses and never fabricates analytics on success or failure',async()=>{
 const calls=[]
 const data=await reviewRecoverySources({now:1000,fetchImpl:async(url,opts)=>{calls.push({url,method:opts.method});if(url.endsWith('.pdf'))throw new Error('offline');return {ok:true,status:200}}})
 assert.equal(calls.length,3);assert.ok(calls.every(c=>c.method==='HEAD' && RECOVERY_SOURCE_URLS.some(s=>s.url===c.url)))
 assert.equal(data.weekly.status,'unavailable');assert.deepEqual(data.weekly.counts,{pedido:null,deferimento:null,concessao:null});assert.equal(data.registry.count,null);assert.equal(data.registry.status,'not-ingested');assert.equal(data.sourceChecks.at(-1).available,false)
 assert.equal(normalizeRecoveryStatus(data),data)
 assert.throws(()=>normalizeRecoveryStatus({...data,registry:{...data.registry,count:0}}))
 assert.throws(()=>normalizeRecoveryStatus({...data,weekly:{...data.weekly,counts:{pedido:3}}}))
})
