import assert from 'node:assert/strict'
import test from 'node:test'
import { INDEXADORES, bndesRows, buildIndexadores, sgsWindow, fillSeriesFromPrevious, parseIndexador, urlOf } from '../scripts/indexadores-lib.mjs'
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

test('endereços: TR e TBF no SGS; TLP no arquivo da moeda 777 do BNDES (mesma fonte da aba BNDES)', () => {
  assert.match(urlOf(INDEXADORES.TR, NOW), /api\.bcb\.gov\.br.*sgs\.226/)
  assert.equal(urlOf(INDEXADORES.TLP, NOW), 'https://www.bndes.gov.br/Moedas/um777.txt')
  assert.equal(INDEXADORES.TLP.source, 'BNDES')
  assert.deepEqual(bndesRows('   data   ;     valor\r\n01/10/2026;       8,120000\r\n01/09/2026;       8,300000\r\n01/11/2026;       7,900000\r\n'), [{ data: '2026-09-01', valor: 8.3 }, { data: '2026-10-01', valor: 8.12 }, { data: '2026-11-01', valor: 7.9 }])
  const p = parseIndexador(bndesRows('01/10/2026;  8,12\n01/09/2026;  8,30\n01/12/2026;  7,90\n'), 18, NOW)
  assert.equal(p.latest.value, 8.12, 'mês futuro já publicado não vale ainda')
  const rows = indexRows(buildIndexadores({ TLP: bndesRows('01/10/2026; 8,12\n01/09/2026; 8,30\n') }, [], NOW))
  assert.equal(rows.find((r) => r.key === 'TLP').sourceText, 'BNDES 777')
})

import { DIVULGACAO, dailyDue, lastBusinessDay, tlpNextRelease } from '../src/indexadores.js'
test('divulgação: último dia útil do mês (TLP) e prazo de TR/TBF', () => {
  assert.equal(lastBusinessDay(2026, 10), '2026-10-30') // 31/10/2026 é sábado
  assert.equal(lastBusinessDay(2026, 12), '2026-12-31')
  assert.equal(tlpNextRelease(Date.UTC(2026, 9, 29, 15)), '2026-10-30')
  assert.equal(tlpNextRelease(Date.UTC(2026, 10, 2, 15)), '2026-11-30') // passou do último dia útil de outubro
  assert.equal(tlpNextRelease(Date.UTC(2026, 11, 31, 15)), '2026-12-31')
  assert.equal(dailyDue('2026-10-29'), '2026-10-30') // quinta -> sexta
  assert.equal(dailyDue('2026-10-30'), '2026-11-03') // sexta -> terça (2/11 é Finados)
  assert.ok(DIVULGACAO.TR.norm.includes('4.624') && DIVULGACAO.TLP.norm.includes('4.600'))
})
test('indexRows traz a regra e as datas de divulgação, também sem dado', () => {
  const now = Date.UTC(2026, 9, 29, 15)
  const rows = indexRows(buildIndexadores({ TR: tr, TLP: tlp }, [], NOW), now)
  assert.match(rows.find((r) => r.key === 'TLP').release.detail, /próxima: 30\/10\/2026/)
  assert.match(rows.find((r) => r.key === 'TR').release.detail, /divulgada até \d{2}\/\d{2}/)
  assert.match(rows.find((r) => r.key === 'TBF').release.rule, /Diária/)
})
