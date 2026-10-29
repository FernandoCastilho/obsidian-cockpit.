import assert from 'node:assert/strict'
import test from 'node:test'
import { DEFAULT_SELECTION, FAMILIES, familyRows, seriesFor } from '../src/bndesView.js'

const NOW = Date.UTC(2026, 9, 29, 15)
const bndes = { stale: {}, series: { TFB_60_90: { prazo: 60, liberacao: 90, points: [['2026-10-28', 16.27], ['2026-10-29', 16.38]] } }, tlp: { points: [['2026-09-01', 8.3], ['2026-10-01', 8.12], ['2026-11-01', 7.9]] } }
const moedas = { stale: {}, series: { C01: { points: [['2026-10-28', 14], ['2026-10-29', 14.1]] }, 604: { points: [['2026-10-29', 5.34]] } } }

test('famílias e seleção padrão: TFB 60 meses, liberação em 90 dias', () => {
  assert.deepEqual(FAMILIES.map((f) => f.id), ['tfb', 'tlp', 'tfc', 'moedas'])
  assert.equal(DEFAULT_SELECTION.tfb, 'TFB_60_90')
  assert.ok(FAMILIES.every((f) => f.definition && f.source))
})

test('familyRows: mesmas colunas em todas as famílias; TLP ignora o mês seguinte já publicado', () => {
  const tfb = familyRows('tfb', bndes, moedas, NOW)
  assert.equal(tfb.length, 8); assert.equal(tfb.find((r) => r.id === 'TFB_60_90').text, '16,38% a.a.')
  assert.equal(tfb.find((r) => r.id === 'TFB_36_30').missing, true)
  const tlp = familyRows('tlp', bndes, moedas, NOW)
  assert.equal(tlp.length, 1); assert.equal(tlp[0].text, '8,12% a.a.'); assert.equal(tlp[0].date, '2026-10-01'); assert.equal(tlp[0].nextRelease, '2026-10-30')
  assert.equal(familyRows('tlp', null, null, NOW)[0].missing, true)
  assert.equal(familyRows('tfc', bndes, moedas, NOW).length, 24)
  assert.equal(familyRows('moedas', bndes, moedas, NOW)[0].text, 'R$ 5,3400')
})

test('seriesFor: nome, unidade, tipo de cobertura e pontos até hoje', () => {
  const a = seriesFor('tfb', 'TFB_60_90', bndes, moedas, NOW)
  assert.equal(a.name, 'TFB · 36 a 60 meses · liberação em 90 dias'); assert.equal(a.kind, 'day'); assert.equal(a.list.length, 2)
  const t = seriesFor('tlp', 'TLP', bndes, moedas, NOW)
  assert.equal(t.kind, 'month'); assert.equal(t.list.length, 2, 'o ponto de novembro ainda não vale')
  const c = seriesFor('tfc', 'C01', bndes, moedas, NOW)
  assert.equal(c.name, 'TFC_60.90 (C01)'); assert.equal(c.unit, '% a.a.'); assert.equal(c.kind, 'sparse')
  const d = seriesFor('moedas', '604', bndes, moedas, NOW)
  assert.equal(d.unit, 'R$'); assert.equal(d.decimals, 4)
  assert.deepEqual(seriesFor('tfb', 'TFB_36_30', null, null, NOW).list, [])
})
