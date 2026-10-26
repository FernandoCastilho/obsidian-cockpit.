import test from 'node:test'
import assert from 'node:assert/strict'
import {deflateRawSync} from 'node:zlib'
import {parseBisJapan,csvFromBisZip,csvRecords} from '../scripts/bis-policy.mjs'
import {parseFreight,freightFile} from '../scripts/freight-lib.mjs'
import {freightContext} from '../src/freight.js'
import {policyRows} from '../src/policyRates.js'
const head='FREQ,REF_AREA,Series,SOURCE_REF,COMPILATION,2024-03-21,2024-08-01,2026-09-24,2026-10-20,2026-11-01'
const csv=head+'\nM,JP,M:JP,Bank of Japan,uncollateralized overnight call rate,0.05,99,99,99,99\nD,JP,D:JP,Bank of Japan,uncollateralized overnight call rate,0.05,0.25,1.25,1.25,9\n'
test('BIS Japan selects daily JP frequency, skips band regime and future/missing cells without zeros',()=>{
 const data=parseBisJapan(csv,Date.parse('2026-10-26T12:00Z'))
 assert.deepEqual(data.points.map(p=>[p.date,p.value]),[['2024-08-01',.25],['2026-09-24',1.25]])
 assert.equal(data.lastObservationDate,'2026-10-20');assert.equal(data.sourceName,'Bank of Japan · compilado pelo BIS')
 assert.equal(parseBisJapan(csv.replace('0.25,1.25,1.25,9','0.25,,1.25,9'),Date.parse('2026-10-26')).points.at(-1).date,'2026-10-20')
 assert.throws(()=>parseBisJapan(csv.replaceAll('Bank of Japan','Other source')),/fonte/)
 assert.deepEqual([...csvRecords('a,"b,c","d""e"\n')],[['a','b,c','d"e']])
})
test('BIS archive only accepts expected CSV and bounded uncompressed length',()=>{
 const name=Buffer.from('WS_CBPOL_csv_col.csv'),body=Buffer.from(csv),packed=deflateRawSync(body)
 const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50);local.writeUInt16LE(8,8);local.writeUInt16LE(name.length,26)
 const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(8,10);central.writeUInt32LE(packed.length,20);central.writeUInt32LE(body.length,24);central.writeUInt16LE(name.length,28)
 const before=Buffer.concat([local,name,packed]),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt32LE(before.length,16)
 const zip=Buffer.concat([before,central,name,end])
 assert.equal(csvFromBisZip(zip),csv)
 assert.throws(()=>csvFromBisZip(Buffer.from('not zip')),/ZIP/)
 const corrupt=Buffer.from(zip);corrupt.writeUInt32LE(20*1024*1024,before.length+24);assert.throws(()=>csvFromBisZip(corrupt),/inesperado/)
})
test('Japan display uses BIS provenance and observation wording rather than inventing effective date',()=>{
 const series=parseBisJapan(csv,Date.parse('2026-10-26'))
 const row=policyRows({series:{BOJ:series}},[{id:'day',date:'2026-10-26'},{id:'old',date:'2024-03-21'}],{now:Date.parse('2026-10-26')}).find(r=>r.id==='BOJ')
 assert.match(row.cells.day.value,/1,25/);assert.match(row.cells.day.status,/Primeira observação/);assert.match(row.cells.day.source,/BIS/);assert.equal(row.cells.old.value,'-')
})
const payload={status:'REQUEST_SUCCEEDED',Results:{series:[{seriesID:'PCU483111483111',data:[{year:'2026',period:'M09',value:'534.796',footnotes:[{code:'P'}]},{year:'2025',period:'M13',value:'500'},{year:'2026',period:'M08',value:'532.736'}]}]}}
test('BLS monthly freight excludes annual average, preserves preliminary and distinct US index identity',()=>{
 const pts=parseFreight(payload);assert.equal(pts.length,2);assert.equal(pts.at(-1).preliminary,true)
 const view=freightContext(freightFile(pts,'2026-10-26T12:00:00Z'))
 assert.equal(view.item.value,534.796);assert.match(view.item.label,/EUA/);assert.match(view.item.unit,/1988/);assert.match(view.item.note,/Não é cotação de rota/);assert.equal(view.item.releaseDate,null)
 assert.equal(freightContext(freightFile([],'2026-10-26')).item.value,null)
 assert.throws(()=>parseFreight({...payload,status:'REQUEST_FAILED'}),/BLS/)
 const bad=structuredClone(payload);bad.Results.series[0].data[0].value='';assert.throws(()=>parseFreight(bad),/inválida/)
})
