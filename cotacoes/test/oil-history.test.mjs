import test from 'node:test'
import assert from 'node:assert/strict'
import { oilHistory } from '../src/oilHistory.js'
import { selectedPeriod } from '../src/summaryPeriod.js'
const now=new Date(2026,9,21)
const points=[{date:'2026-10-19',value:100},{date:'2026-10-20',value:110}]
test('oil historical range is inclusive with first-to-last variation',()=>{
 const r=oilHistory(points,selectedPeriod('2026-10-19','2026-10-20',now),now)
 assert.deepEqual(r.points,points);assert.ok(Math.abs(r.change-10)<1e-10)
})
test('empty and single-day ranges do not fabricate price or variation',()=>{
 assert.deepEqual(oilHistory(points,{intraday:true},now).points,[])
 assert.equal(oilHistory(points,selectedPeriod('2026-10-20','2026-10-20',now),now).change,null)
})
