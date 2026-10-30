import assert from 'node:assert/strict'
import test from 'node:test'
import { validateAll, validateBndes } from '../scripts/validate-lib.mjs'
import { staleReport } from '../scripts/stale-lib.mjs'
import { BNDES_SERIES } from '../scripts/bndes-lib.mjs'
import { MOEDAS_CATALOG } from '../scripts/moedas-lib.mjs'
import { JUMP_PCT, JUMP_PP, isJump } from '../src/jumps.js'
import { change } from '../src/bndes.js'
import { changePct, groupRows } from '../src/moedas.js'

const NOW = Date.UTC(2026, 9, 29, 15)
const days = (vals, last = '2026-10-29') => vals.map((v, i) => [new Date(Date.parse(`${last}T12:00:00Z`) - (vals.length - 1 - i) * 864e5).toISOString().slice(0, 10), v])
const okBndes = () => ({ series: Object.fromEntries(BNDES_SERIES.map((s) => [s.key, { points: days([16.1, 16.2, 16.3, 16.38]) }])), tlp: { points: [['2026-09-01', 8.3], ['2026-10-01', 8.12]] } })
const okMoedas = () => ({ series: Object.fromEntries(MOEDAS_CATALOG.map((c) => [c.id, { points: c.kind === 'level' ? days([5.3, 5.31, 5.32]) : c.kind === 'pct' ? [['2026-10-15', 0.8], ['2026-09-15', -0.3]].reverse() : c.id === 'TR1' || c.id === 'TR2' ? [['2026-09-01', 3.6], ['2026-10-01', 3.5]] : c.id === '024' ? [['2026-07-01', 0.05], ['2026-10-01', 0.04]] : days([14.1, 14.2, 14.1]) }])) })
const msgs = (b, m) => validateBndes({ bndes: b, moedas: m }, NOW).map((i) => `[${i.area}] ${i.message}`)

test('dados consistentes: sem achados', () => assert.deepEqual(msgs(okBndes(), okMoedas()), []))

test('arquivo ausente e série ausente viram achado', () => {
  assert.deepEqual(msgs(null, null), ['[bndes] bndes.json ausente ou inválido', '[moedas] moedas.json ausente ou inválido'])
  const b = okBndes(); delete b.series.TFB_60_90; b.tlp = null
  assert.deepEqual(msgs(b, okMoedas()), ['[bndes] TFB_60_90: série ausente', '[bndes] TLP: série ausente'])
})

test('dado parado: limite de 6 dias nas diárias; mensais e trimestral têm limite próprio', () => {
  const b = okBndes(); b.series.TFB_36_30.points = days([16, 16.1], '2026-10-20')
  assert.match(msgs(b, okMoedas()).join('|'), /TFB_36_30: último dado de 20\/10\/2026, há 9 dias \(limite 6\)/)
  const m = okMoedas(); m.series.TR1.points = [['2026-08-01', 3.6]]
  assert.match(msgs(okBndes(), m).join('|'), /TFBTR60\.90 \(TR1\): último dado de 01\/08\/2026, há 89 dias \(limite 40\)/)
  const trim = okMoedas(); trim.series['024'].points = [['2026-07-01', 0.05]]
  assert.deepEqual(msgs(okBndes(), trim), [], 'trimestral: 120 dias de folga')
})

test('salto de taxa e de nível nas últimas observações; salto antigo não alerta; futuro é ignorado', () => {
  const b = okBndes(); b.series.TFB_60_90.points = days([14.02, 16.7, 16.7, 16.71])
  assert.match(msgs(b, okMoedas()).join('|'), /TFB_60_90: salto de \+2,68 p\.p\. em 27\/10\/2026/)
  const old = okBndes(); old.series.TFB_60_90.points = days([14.02, 16.7, 16.71, 16.72, 16.73])
  assert.deepEqual(msgs(old, okMoedas()), [], 'o salto saiu da janela das 3 últimas variações')
  const m = okMoedas(); m.series['604'].points = days([5.04, 5.5007])
  assert.match(msgs(okBndes(), m).join('|'), /US\$ \(604\): salto de \+9,14% em 29\/10\/2026/)
  const fut = okMoedas(); fut.series['143'].points = [...days([4.27, 4.273]), ['2026-10-30', 9.9]]
  assert.deepEqual(msgs(okBndes(), fut), [], 'ponto de amanhã (já publicado) não vale hoje')
})

test('validateAll só inclui BNDES quando os arquivos são passados', () => {
  assert.equal(validateAll({ quotes: null, history: null, intraday: null, macro: null }, NOW).some((i) => i.area === 'bndes'), false)
  assert.equal(validateAll({ quotes: null, history: null, intraday: null, macro: null, bndes: null, moedas: null }, NOW).some((i) => i.area === 'bndes'), true)
})

test('relatório de dados desatualizados reconhece bndes e moedas', () => {
  const since = NOW - 10 * 36e5
  const items = staleReport({ bndes: { stale: { TFB_60_90: since, TLP: since } }, moedas: { stale: { C01: since } }, indexadores: { stale: { TLP: since } } }, NOW, 6)
  assert.deepEqual(items.map((i) => i.label).sort(), ['TFB 60 meses, liberação em 90 dias', 'TFC_60.90 (C01)', 'TLP', 'TLP (BNDES)'].sort())
})

test('selo de salto: só na variação do dia, com o mesmo limite do alerta', () => {
  assert.equal(JUMP_PP, 1); assert.equal(JUMP_PCT[604], 8)
  assert.equal(isJump('rate', 2.5), true); assert.equal(isJump('rate', -0.9), false); assert.equal(isJump('level', 9.15, '604'), true); assert.equal(isJump('pct', 5), false)
  assert.equal(change(16.7, ['d', 14.02], 'rate').jump, true)
  assert.equal(change(16.7, ['d', 14.02]).jump, false, 'sem kind (mês e ano) nunca marca salto')
  assert.equal(changePct(5.5, ['d', 5.04], '604').jump, true); assert.equal(changePct(5.5, ['d', 5.04]).jump, false)
  const rows = groupRows({ stale: {}, series: { 604: { points: [['2026-10-27', 5.04], ['2026-10-29', 5.5]] } } }, 'moedas', NOW)
  assert.equal(rows.find((r) => r.id === '604').day.jump, true); assert.equal(rows.find((r) => r.id === '604').month, null)
})
