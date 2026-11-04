import test from 'node:test'
import assert from 'node:assert/strict'
import { compareWindow, comparisonRows, previousYear, seriesFrequency } from '../src/chartComparison.js'
const t=p=>Date.parse(p+'T12:00:00Z'), point=(p,v)=>({t:t(p),v})
test('monthly comparison spans year boundary and uses all exact months, in either drag direction',()=>{
 const p=[point('2024-11-01',1),point('2024-12-01',2),point('2025-01-01',3),point('2025-02-01',4),point('2025-11-01',5),point('2025-12-01',6),point('2026-01-01',7),point('2026-02-01',8)]
 const r=compareWindow(p,t('2025-11-01'),t('2026-02-01'),{frequency:'month',prior:true})
 assert.equal(r.delta,3);assert.equal(r.segment.length,4)
 assert.deepEqual(r,compareWindow(p,t('2026-02-01'),t('2025-11-01'),{frequency:'month',prior:true}))
 assert.equal(compareWindow(p.filter(x=>x.t!==t('2024-12-01')),t('2025-11-01'),t('2026-02-01'),{frequency:'month',prior:true}),null)
})
test('missing endpoints and zero base never invent an annual percentage',()=>{
 assert.equal(compareWindow([point('2025-01-01',1)],t('2026-01-01'),t('2026-02-01'),{prior:true}),null)
 const r=compareWindow([point('2025-01-01',0),point('2025-02-01',2)],t('2025-01-01'),t('2025-02-01'),{frequency:'month'})
 assert.equal(r.delta,2);assert.equal(r.pct,null)
 assert.equal(compareWindow([point('2025-01-01',1),point('2025-03-01',2)],t('2025-01-01'),t('2025-03-01'),{frequency:'month'}),null)
})
test('UTC annual shift clamps leap day to February, preserving time and January',()=>{
 assert.equal(new Date(previousYear(t('2024-02-29'))).toISOString(),'2023-02-28T12:00:00.000Z')
 assert.equal(new Date(previousYear(t('2026-01-01'))).toISOString(),'2025-01-01T12:00:00.000Z')
})
test('inflation range compounds monthly percentages; PF and PJ are independently comparable',()=>{
 const p=[point('2025-01-01',1),point('2025-02-01',2)]
 assert.ok(Math.abs(compareWindow(p,p[0].t,p[1].t,{frequency:'month',compound:true}).accumulated-3.02)<1e-9)
 const s=[{key:'pf',name:'PF',points:p},{key:'pj',name:'PJ',points:p}]
 const rows=comparisonRows(s,[{key:'pf',points:[point('2024-01-01',0),point('2024-02-01',1)]}],p[0].t,p[1].t,{frequency:'month'})
 assert.ok(rows[0].prior);assert.equal(rows[1].prior,null)
})
test('intraday and annual observations are not mistaken for monthly histories',()=>{
 const p=[point('2025-01-01',1),{t:t('2025-01-01')+60000,v:2}]
 assert.equal(seriesFrequency(p),'intraday');assert.equal(compareWindow(p,p[0].t,p[1].t,{prior:true}),null)
 assert.equal(seriesFrequency([point('2024-01-01',1),point('2025-01-01',2)]),'year')
})
