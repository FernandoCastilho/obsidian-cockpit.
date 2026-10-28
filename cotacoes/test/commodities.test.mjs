import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { buildWti, parsePinkRows, discoverPinkSheetUrl, commodityFallback, validCommodity } from '../scripts/commodities-lib.mjs'
const now = new Date('2026-10-23T14:00:00Z')
const url = 'https://thedocs.worldbank.org/en/doc/example/related/CMO-Historical-Data-Monthly.xlsx'
const rows = () => [
 { A:'World Bank Commodity Price Data (The Pink Sheet)' },
 { A:'monthly prices in nominal US dollars, 1960 to present' },
 { A:'Updated on October 02, 2026' },
 { B:'Iron ore, cfr spot', C:'Soybeans', D:'Maize', E:'Gold' },
 { B:'($/dmtu)', C:'($/mt)', D:'($/mt)', E:'($/troy oz)' },
 { A:'2026M08', B:'96.3', C:'482', D:'224', E:'4411' },
 { A:'2026M09', B:'97.7', C:'524', D:'239.6', E:'4319' },
]
const wti = `<title>Cushing, OK WTI Spot Price FOB (Dollars per Barrel)</title><table><tr><td>2026 Oct-19 to Oct-23</td><td>110.01</td><td>107.89</td><td></td><td></td><td></td></tr></table><td>Release Date: 10/21/2026</td><td>Next Release Date: 10/28/2026</td>`
test('WTI diário preserva série, observação, publicação e comparação diária', () => {
 const result = buildWti(wti, now)
 assert.equal(result.value,107.89); assert.equal(result.period,'2026-10-20'); assert.equal(result.releaseDate,'2026-10-21')
 assert.equal(result.previousValue,110.01); assert.equal(result.nature,'spot diário'); assert.ok(validCommodity(result,'wti'))
 assert.throws(() => buildWti(wti.replace('WTI','Brent'),now))
 assert.throws(() => buildWti(wti,new Date('2026-10-01')))
})
test('Pink Sheet separa média mensal de publicação e mantém benchmarks/unidades', () => {
 const result = parsePinkRows(rows(),url,now)
 assert.deepEqual(result.map(c=>c.value),[97.7,524,239.6,4319])
 assert.ok(result.every(c=>c.period==='2026-09' && c.releaseDate==='2026-10-02' && c.nature==='média mensal'))
 assert.equal(result[0].unit,'USD/tonelada seca'); assert.equal(result[3].unit,'USD/onça troy')
 assert.equal(result[1].previousPeriod,'2026-08'); assert.equal(result[1].previousValue,482)
 assert.ok(result.every(c=>validCommodity(c,c.id)))
})
test('Pink Sheet rejeita zero, ausência, unidade incorreta, competência duplicada e data futura', () => {
 for (const value of ['0','…','NaN','']) { const r=rows(); r.at(-1).B=value; assert.throws(()=>parsePinkRows(r,url,now)) }
 const wrong=rows(); wrong[4].E='($/kg)'; assert.throws(()=>parsePinkRows(wrong,url,now))
 const duplicate=rows(); duplicate.push(duplicate.at(-1)); assert.throws(()=>parsePinkRows(duplicate,url,now))
 assert.throws(()=>parsePinkRows(rows(),url,new Date('2026-09-01')))
})
test('mensal não compara com mês não consecutivo', () => {
 const r=rows(); r.at(-2).A='2026M07'; assert.equal(parsePinkRows(r,url,now)[0].variationPct,null)
})
test('descobre somente XLSX mensal no host oficial', () => {
 assert.equal(discoverPinkSheetUrl(`<a href="${url}">Monthly prices</a>`),url)
 assert.throws(()=>discoverPinkSheetUrl(`<a href="https://evil.example/CMO-Historical-Data-Monthly.xlsx">X</a>`))
})
test('fallback preserva último positivo e checkedAt original mesmo após falhas repetidas', () => {
 const fresh=parsePinkRows(rows(),url,now)[0]
 const old={...fresh,period:'2026-08',value:96.3}
 const fallback=commodityFallback('iron-ore',[old,fresh,{...fresh,value:0}],new Error('timeout'))
 assert.equal(fallback.value,97.7); assert.equal(fallback.checkedAt,fresh.checkedAt); assert.equal(fallback.stale,true)
 assert.equal(commodityFallback('iron-ore',[fallback],'503').checkedAt,fresh.checkedAt)
 const empty=commodityFallback('gold',[{value:0}], 'timeout'); assert.equal(empty.value,null); assert.equal(empty.checkedAt,null)
})
test('XLSX reader resolves named sheet, sparse columns and shared strings using stdlib', () => {
 const script = fileURLToPath(new URL('../scripts/read-pink-sheet.py',import.meta.url))
 const fixture = spawnSync('python3',['-c',`import io,zipfile,sys
b=io.BytesIO()
with zipfile.ZipFile(b,'w') as z:
 z.writestr('xl/workbook.xml','<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Monthly Prices" r:id="rId2"/></sheets></workbook>')
 z.writestr('xl/_rels/workbook.xml.rels','<Relationships><Relationship Id="rId2" Target="worksheets/sheet2.xml"/></Relationships>')
 z.writestr('xl/sharedStrings.xml','<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>Gold</t></si></sst>')
 z.writestr('xl/worksheets/sheet2.xml','<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row><c r="BR5" t="s"><v>0</v></c><c r="A5" t="inlineStr"><is><t>2026M09</t></is></c><c r="C5"><v>4319</v></c></row></sheetData></worksheet>')
sys.stdout.buffer.write(b.getvalue())`])
 assert.equal(fixture.status,0)
 const parsed=spawnSync('python3',[script],{input:fixture.stdout,encoding:'utf8'})
 assert.equal(parsed.status,0,parsed.stderr)
 assert.deepEqual(JSON.parse(parsed.stdout),[{BR:'Gold',A:'2026M09',C:'4319'}])
})

test('WTI aceita histórico negativo legítimo e preserva negativo no fallback', () => {
 const historical='<tr><td>&nbsp;&nbsp;2020 Apr-20 to Apr-24</td><td>-36.98</td><td>8.91</td><td>13.64</td><td>15.06</td><td>15.99</td></tr>'
 assert.equal(buildWti(wti.replace('</table>',historical+'</table>'),now).value,107.89)
 const negative=buildWti(wti.replace('107.89','-36.98'),now)
 assert.equal(negative.value,-36.98); assert.ok(validCommodity(negative,'wti'))
 assert.equal(commodityFallback('wti',[negative],'timeout').value,-36.98)
})

test('commodities: série histórica acompanha cada referência (mensal do Banco Mundial; diária do WTI), sem zeros inventados', async () => {
  const lib = await import('../scripts/commodities-lib.mjs')
  const rows = [
    { A: 'World Bank Commodity Price Data', B: 'monthly prices in nominal US dollars' },
    { A: '', B: 'Updated on October 02, 2026' },
    { A: '', B: 'Iron ore, cfr spot', C: 'Soybeans', D: 'Maize', E: 'Gold' },
    { A: '', B: '($/dmt)', C: '($/mt)', D: '($/mt)', E: '($/troy oz)' },
    { A: '2026M07', B: '100', C: '500', D: '230', E: '' },
    { A: '2026M08', B: '99', C: '510', D: '235', E: '4300' },
    { A: '2026M09', B: '97.7', C: '524', D: '239.6', E: '4319' },
  ]
  const items = lib.parsePinkRows(rows, 'https://thedocs.worldbank.org/x.xlsx', new Date('2026-10-05T00:00:00Z'))
  const gold = items.find(i => i.id === 'gold')
  assert.deepEqual(gold.history, [{ period: '2026-08', value: 4300 }, { period: '2026-09', value: 4319 }]) // julho sem valor fica de fora
  assert.equal(items.find(i => i.id === 'corn').history.length, 3)
})
