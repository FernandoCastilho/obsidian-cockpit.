import test from 'node:test'
import assert from 'node:assert/strict'
import { novidadesDaSemana } from '../src/novidadesSemana.js'

test('novidades da semana: só entradas com resumo dos últimos 7 dias, mais recente primeiro, no máximo 4', () => {
  const e = [
    { date: '03/11/2026', resumo: 'A' }, { date: '02/11/2026', resumo: 'B' }, { date: '02/11/2026' }, { date: '01/11/2026', resumo: 'C' },
    { date: '31/10/2026', resumo: 'D' }, { date: '28/10/2026', resumo: 'E' }, { date: '20/10/2026', resumo: 'F' },
  ]
  const now = Date.parse('2026-11-03T15:00:00Z')
  assert.deepEqual(novidadesDaSemana(e, now), ['A', 'B', 'C', 'D'])
  assert.deepEqual(novidadesDaSemana(e, now, 10), ['A', 'B', 'C', 'D', 'E'])
  assert.deepEqual(novidadesDaSemana(e, Date.parse('2026-11-20T15:00:00Z')), [])
})
