import test from 'node:test'
import assert from 'node:assert/strict'
import { snapshotPeriods,lastAt,snapshotRows,brDay } from '../src/ratesSnapshot.js'
test('snapshot uses Sao Paulo day, calendar month/year clamp and 180 calendar days',()=>{
 const p=snapshotPeriods(Date.parse('2026-03-31T15:00Z'))
 assert.equal(p[1].date,'2026-02-28');assert.equal(p[2].date,'2025-10-02');assert.equal(p[3].date,'2025-03-31')
 assert.equal(snapshotPeriods(Date.parse('2024-02-29T15:00Z'))[3].date,'2023-02-28')
 assert.equal(brDay(Date.parse('2026-10-22T01:00Z')),'2026-10-21')
})
test('lastAt chooses nearest preceding observation inclusively, never future or zero by absence',()=>{
 const p=[{date:'2026-10-21',value:5},{date:'2026-10-23',value:6},{date:'2026-10-20',value:4}]
 assert.equal(lastAt(p,'2026-10-22').value,5);assert.equal(lastAt(p,'2026-10-21').value,5)
 assert.equal(lastAt(p,'2026-10-19'),null);assert.equal(lastAt([{date:'2026-10-21',value:NaN}],'2026-10-22'),null)
})
test('snapshot keeps units, timestamps, Selic effective date and CNH distinct from CNY',()=>{
 const periods=snapshotPeriods(Date.parse('2026-10-22T12:00Z'))
 const rows=snapshotRows({periods,quotes:{CNH:{source:'CNY',bid:99,timestamp:Date.parse('2026-10-22T12:00Z')}},history:{series:{CNH:{source:'CNH',points:[{t:Date.parse('2026-10-21T12:00Z'),bid:.75}]}}},macro:{selic:[[Date.parse('2026-09-01T12:00Z'),13.75],[Date.parse('2026-10-21T12:00Z'),13.75]],ptaxHist:{USD:{'2026-10-21':5.02}}},oil:{points:[{date:'2026-10-20',value:115.22}]}})
 assert.equal(rows.find(r=>r.id==='CNH').cells.day.value,'R$ 0,7500')
 assert.equal(rows.find(r=>r.id==='SELIC').cells.day.date,'01/09/2026')
 assert.match(rows.find(r=>r.id==='SELIC').cells.day.status,/Vigente/)
 assert.equal(rows.find(r=>r.id==='BRENT').unit,'US$/barril')
 assert.equal(rows.find(r=>r.id==='PTAX-USD').cells.day.date,'21/10/2026')
 assert.equal(rows.find(r=>r.id==='USD').cells.year.value,'—')
})

test('legacy onshore history is not labeled CNH offshore',()=>{
 const rows=snapshotRows({periods:snapshotPeriods(Date.parse('2026-10-22T12:00Z')),history:{series:{CNH:{source:'CNY',points:[{t:Date.parse('2026-10-21T12:00Z'),bid:.8}]}}}})
 assert.equal(rows.find(r=>r.id==='CNH').cells.day.value,'—')
})
test('Juros renders summary before charts without replacing them',async()=>{
 const {readFile}=await import('node:fs/promises');const source=await readFile(new URL('../src/App.jsx',import.meta.url),'utf8')
 const section=source.slice(source.indexOf("{tab === 'juros'"),source.indexOf("{tab === 'cenarios'"))
 assert.ok(section.indexOf('<RatesSnapshot')<section.indexOf('<Macro'))
 assert.ok(section.includes('<CdiFuturo'));assert.ok(section.includes('<Curves'))
})
test('older quote cannot replace newer historical observation on the same day',()=>{
 const rows=snapshotRows({periods:snapshotPeriods(Date.parse('2026-10-22T20:00Z')),quotes:{USD:{source:'USD',bid:4,timestamp:Date.parse('2026-10-22T12:00Z')}},history:{series:{USD:{source:'USD',points:[{t:Date.parse('2026-10-22T16:00Z'),bid:5}]}}}})
 assert.equal(rows.find(r=>r.id==='USD').cells.day.value,'R$ 5,0000')
})
