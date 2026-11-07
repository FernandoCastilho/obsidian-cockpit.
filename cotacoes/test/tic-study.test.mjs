import test from 'node:test'
import assert from 'node:assert/strict'
import { TIC_STUDY } from '../src/ticStudy.js'
import { CATALOGO_SETORIAL } from '../src/centralSetorial.js'

test('recorte TIC é navegável e mantém os setores existentes', () => {
  const tic = CATALOGO_SETORIAL.find(group => group.id === 'tic')
  assert.equal(tic.topics[0], TIC_STUDY.title)
  assert.equal(CATALOGO_SETORIAL.find(group => group.id === 'base-florestal').topics[3], 'Compensados')
  assert.equal(new Set(TIC_STUDY.sections.map(section => section.id)).size, TIC_STUDY.sections.length)
})

test('gráficos mantêm anos observados, denominador e histórico estimado separados de projeções', () => {
  const [cloud, cyber] = TIC_STUDY.charts
  assert.deepEqual(cloud.years, [2021, 2023, 2024, 2025])
  assert.match(cloud.unit, /empresas com acesso à Internet/)
  assert.deepEqual(cyber.years, [2023, 2024, 2025])
  assert.match(cyber.scope, /Histórico estimado/)
  for (const chart of TIC_STUDY.charts) {
    assert.match(chart.source.url, /^https:\/\//)
    for (const series of chart.series) {
      assert.equal(series.values.length, chart.years.length)
      assert.ok(series.values.every(value => Number.isFinite(value) && value >= 0))
    }
  }
  assert.equal(cloud.series.reduce((total, series) => total + series.values.length, 0) + cyber.series[0].values.length, 15)
})
