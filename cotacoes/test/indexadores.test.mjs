import assert from 'node:assert/strict'
import test from 'node:test'
import { INDEXADORES, buildIndexadores, sgsWindow, fillSeriesFromPrevious, parseIndexador } from '../scripts/indexadores-lib.mjs'
import { anual, indexRows } from '../src/indexadores.js'

const NOW = Date.UTC(2026, 9, 27, 15)
const tr = [{ data: '25/10/2026', dataFim: '25/11/2026', valor: '0.0000' }, { data: '24/10/2026', dataFim: '24/11/2026', valor: '0.0123' }, { data: 'x', valor: '1' }]
const tlp = [{ data: '01/09/2026', valor: '8.30' }, { data: '01/10/2026', valor: '8.12' }]

test('parseIndexador ordena, descarta lixo e preserva a vigência', () => {
  const p = parseIndexador(tr, 30, NOW)
  assert.equal(p.history.length, 2)
  assert.equal(p.latest.value, 0)
  assert.equal(p.latest.end, Date.UTC(2026, 10, 25, 12))
  assert.equal(parseIndexador([], 30, NOW), null)
  assert.equal(parseIndexador('<html>', 30, NOW), null)
})

test('parseIndexador ignora ponto com início no futuro', () => {
  assert.equal(parseIndexador([{ data: '01/12/2026', valor: '9' }], 30, NOW), null)
})

test('buildIndexadores e fallback para o dado anterior', () => {
  const out = buildIndexadores({ TR: tr, TBF: null, TLP: tlp }, ['TBF: HTTP 502'], NOW)
  assert.deepEqual(Object.keys(out.series), ['TR', 'TLP'])
  const prev = { generatedAt: 1000, series: { TBF: { latest: { start: 1, value: 0.1 }, history: [] } } }
  fillSeriesFromPrevious(out, prev)
  assert.ok(out.series.TBF)
  assert.deepEqual(out.stale, { TBF: 1000 })
})

test('equivalente anual', () => {
  assert.ok(Math.abs(anual(0.5, 'a.m.') - 6.1678) < 1e-3)
  assert.equal(anual(8.12, 'a.a.'), 8.12)
  assert.equal(anual(NaN, 'a.m.'), null)
})

test('indexRows monta TR, TBF e TLP e marca a série ausente', () => {
  const data = buildIndexadores({ TR: tr, TBF: null, TLP: tlp }, [], NOW)
  const rows = indexRows(data)
  assert.deepEqual(rows.map((r) => r.key), ['TR', 'TBF', 'TLP'])
  assert.equal(rows[0].text, '0,0000% a.m.')
  assert.equal(rows[1].missing, true)
  assert.equal(rows[2].text, '8,12% a.a.')
  assert.match(rows[2].period, /01\/10\/2026 a 31\/10\/2026/)
  assert.ok(Math.abs(rows[2].delta - -0.18) < 1e-9)
  assert.equal(indexRows(null).every((r) => r.missing), true)
})

test('janela de datas do SGS (séries diárias não aceitam /ultimos)', () => {
  const url = sgsWindow(226, 45, NOW)
  assert.match(url, /sgs\.226\/dados\?formato=json&dataInicial=12\/09\/2026&dataFinal=27\/10\/2026$/)
  assert.ok(Object.values(INDEXADORES).every((d) => d.days >= d.keep))
})
