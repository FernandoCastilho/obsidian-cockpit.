import test from 'node:test'
import assert from 'node:assert/strict'
import { nextChartIndex } from '../src/chartNavigation.js'
test('gráficos: teclado percorre pontos sem ultrapassar limites', () => {
  assert.equal(nextChartIndex('Home', 4, 5), 0)
  assert.equal(nextChartIndex('End', 0, 5), 4)
  assert.equal(nextChartIndex('ArrowRight', 1, 5), 2)
  assert.equal(nextChartIndex('ArrowLeft', 0, 5), 0)
  assert.equal(nextChartIndex('ArrowRight', 4, 5), 4)
  assert.equal(nextChartIndex('End', 0, 0), null)
  assert.equal(nextChartIndex('Escape', 0, 5), null)
  assert.equal(nextChartIndex('ArrowLeft', 20, 5), 3)
})
