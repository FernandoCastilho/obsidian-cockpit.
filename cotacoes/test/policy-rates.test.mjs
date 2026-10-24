import test from 'node:test'
import assert from 'node:assert/strict'
import { parseFedPolicy, parseEcbPolicy, parseBoePolicy, preservePolicySeries, normalizePolicyPoints } from '../scripts/policy-rates-lib.mjs'
import { policyRows } from '../src/policyRates.js'

// Small structural fixtures matching the official tables; test values only.
test('Fed parser keeps both target bounds and the effective date; skips old single-target regime',()=>{
 const html=`FOMC's target federal funds rate or range <h4>2026</h4><table><tr><td>September 17</td><td>25</td><td>0</td><td>3.75-4.00</td></tr></table><h4>2025</h4><table><tr><td>December 11</td><td>0</td><td>25</td><td>3.50-3.75</td></tr></table><h4>2008</h4><table><tr><td>December 16</td><td>0</td><td>75</td><td>0-0.25</td></tr><tr><td>October 29</td><td>0</td><td>50</td><td>1.00</td></tr></table>`
 const p=parseFedPolicy(html)
 assert.equal(p.length,3);assert.equal(p[0].lower,0);assert.equal(p.at(-1).date,'2026-09-17');assert.equal(p.at(-1).lower,3.75);assert.equal(p.at(-1).upper,4)
 assert.throws(()=>parseFedPolicy('<h1>Blocked</h1>'),/não reconhecida/)
})
test('BCE parser reads deposit column, carries year and removes footnote, including negative rates',()=>{
 const html=`Date (with effect from) Deposit facility <table><tr><td><strong>2026</strong></td><td>16 Sep.</td><td>2.50</td><td>2.65</td></tr><tr><td>2014</td><td>10 Sep.<sup>4</sup></td><td>−0.20</td><td>0.05</td></tr><tr><td>&nbsp;</td><td>11 Jun.</td><td>&minus;0.10</td><td>0.15</td></tr></table>`
 const p=parseEcbPolicy(html);assert.deepEqual(p.map(p=>[p.date,p.value]),[['2014-06-11',-.1],['2014-09-10',-.2],['2026-09-16',2.5]])
})
test('BoE parser uses Date Changed and unambiguous century for1975+ archive',()=>{
 const p=parseBoePolicy(`Official Bank Rate Date Changed <table><tr><td>18 Dec 25</td><td>3.75</td></tr><tr><td>05 Mar 09</td><td>0.50</td></tr><tr><td>20 Jan 75</td><td>11.25</td></tr></table>`)
 assert.deepEqual(p.map(p=>p.date),['1975-01-20','2009-03-05','2025-12-18']);assert.equal(p.at(-1).value,3.75)
})
test('invalid, empty or conflicting policy observations fail closed; fallback preserves timestamp and valid zero',()=>{
 assert.throws(()=>normalizePolicyPoints([]),/Nenhuma/)
 for(const p of [{date:'2026-02-30',value:1},{date:'2026-01-01',value:null},{date:'2026-01-01',lower:4,upper:3}]) assert.throws(()=>normalizePolicyPoints([p]),/inválido/)
 assert.throws(()=>normalizePolicyPoints([{date:'2026-01-01',value:1},{date:'2026-01-01',value:2}]),/conflitantes/)
 const old={checkedAt:123,points:[{date:'2024-03-21',lower:0,upper:.1}]}
 const fallback=preservePolicySeries(old,new Error('offline'));assert.equal(fallback.checkedAt,123);assert.equal(fallback.points[0].lower,0);assert.equal(fallback.stale,true)
})
test('policy comparison uses last effective rate at cutoff, never future, averages, zero-for-missing or new hold date',()=>{
 const periods=[{id:'day',date:'2026-09-23'},{id:'month',date:'2026-08-23'},{id:'year',date:'2023-10-23'}]
 const data={series:{FED:{checkedAt:100,points:[{date:'2026-09-17',lower:3.75,upper:4},{date:'2025-12-11',lower:3.5,upper:3.75}]},BOJ:{points:[{date:'2026-06-17',value:1,approximate:true},{date:'2026-09-24',value:1.25,approximate:true}],stale:true}}}
 const r=policyRows(data,periods,{now:100});const fed=r.find(r=>r.id==='FED'),boj=r.find(r=>r.id==='BOJ')
 assert.equal(fed.cells.day.value,'3,75%–4,00%');assert.equal(fed.cells.month.value,'3,50%–3,75%');assert.equal(fed.cells.day.date,'17/09/2026')
 assert.equal(boj.cells.day.value,'≈1,00%');assert.equal(boj.cells.day.date,'17/06/2026');assert.match(boj.cells.day.status,/pendente/);assert.equal(boj.cells.year.value,'-')
 assert.equal(r.find(r=>r.id==='ECB').cells.day.value,'-');assert.match(policyRows(null,periods,{loading:true})[0].cells.day.status,/Carregando/)
})
