import assert from 'node:assert/strict'
import test from 'node:test'
import { HEADER, buildCsvs, toCsv } from '../scripts/csv-lib.mjs'
import { diRate, tfbSpread } from '../src/spread.js'
import { familyRows } from '../src/bndesView.js'

const bndes = { series: { TFB_60_90: { points: [['2026-10-23', 14.04], ['2026-10-26', 14.02], ['2026-10-29', 16.38]] } }, tlp: { points: [['2026-09-01', 8.3], ['2026-10-01', 8.12]] } }
const moedas = { series: { C01: { points: [['2026-10-29', 14.7154]] }, 604: { points: [['2026-10-29', 5.3744]] } } }

test('CSV: cabeçalho, BOM, ISO, ponto decimal, uma linha por observação, série ausente não gera linha', () => {
  const f = buildCsvs({ bndes, moedas })
  assert.equal(Object.keys(f).join(), 'tfb.csv,tlp.csv,tfc.csv,moedas.csv')
  const tfb = f['tfb.csv'].split('\r\n')
  assert.equal(tfb[0], '﻿serie,nome,data,valor,unidade')
  assert.equal(tfb[1], 'TFB_60_90,TFB 60 meses · liberação em 90 dias,2026-10-23,14.04,% a.a.')
  assert.equal(tfb.length, 3 + 1 + 1, 'cabeçalho + 3 observações + linha final vazia')
  assert.match(f['tlp.csv'], /TLP,TLP \(moeda 777 do BNDES\),2026-09-01,8\.3,% a\.a\./)
  assert.match(f['tfc.csv'], /C01,TFC_60\.90,2026-10-29,14\.7154,% a\.a\./)
  assert.match(f['moedas.csv'], /604,US\$,2026-10-29,5\.3744,R\$/)
  assert.equal(buildCsvs({})['tfb.csv'], toCsv([]))
})

test('CSV: campo com vírgula ou aspas é escapado', () => {
  assert.equal(toCsv([['a', 'x, "y"', '2026-01-01', 1, '%']]).split('\r\n')[1], 'a,"x, ""y""",2026-01-01,1,%')
  assert.deepEqual(HEADER, ['serie', 'nome', 'data', 'valor', 'unidade'])
})

const br = { sourceDate: '2026-10-26', curves: { '2026-10-26': [[1, 14.7], [756, 13.6676], [1260, 13.7184], [1764, 13.761], [2520, 13.8039]] } }

test('diRate interpola entre vértices e devolve null fora da curva', () => {
  assert.equal(diRate(br.curves['2026-10-26'], 1260), 13.7184)
  assert.ok(Math.abs(diRate(br.curves['2026-10-26'], 1008) - (13.6676 + (13.7184 - 13.6676) * (1008 - 756) / (1260 - 756))) < 1e-9)
  assert.equal(diRate(br.curves['2026-10-26'], 3000), null); assert.equal(diRate([], 100), null)
})

test('tfbSpread usa a TFB do dia da curva (não a mais recente) e explica a data', () => {
  const s = tfbSpread(bndes.series.TFB_60_90.points, br, 60)
  assert.equal(s.tfbDate, '2026-10-26'); assert.equal(s.curveDate, '2026-10-26'); assert.equal(s.du, 1260)
  assert.equal(s.text, '+0,30 p.p.')
  assert.equal(tfbSpread([['2026-10-27', 16]], br, 60), null, 'sem TFB até o dia da curva')
  assert.equal(tfbSpread(bndes.series.TFB_60_90.points, null, 60), null)
  assert.equal(tfbSpread(bndes.series.TFB_60_90.points, br, 200), null, 'prazo além da curva')
})

test('familyRows: linhas da TFB ganham spread quando há curva; sem curva ficam sem', () => {
  const rows = familyRows('tfb', bndes, moedas, Date.UTC(2026, 9, 29, 15), br)
  assert.equal(rows.find((r) => r.id === 'TFB_60_90').spread.text, '+0,30 p.p.')
  assert.equal(rows.find((r) => r.id === 'TFB_36_30').spread, null)
  assert.equal(rows.every((r) => r.hasSpread), true)
  assert.equal(familyRows('tfb', bndes, moedas, Date.UTC(2026, 9, 29, 15), null).find((r) => r.id === 'TFB_60_90').spread, null)
  assert.equal(familyRows('tfc', bndes, moedas, Date.UTC(2026, 9, 29, 15), br)[0].hasSpread, undefined)
})
