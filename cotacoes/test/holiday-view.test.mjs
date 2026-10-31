import test from 'node:test'
import assert from 'node:assert/strict'
import { groupHolidayRows } from '../src/holidayView.js'

const rows = [
  { d: '2027-01-01', name: 'Ano Novo', places: ['BR', 'NY'] },
  { d: '2026-11-11', name: 'Veterans Day', places: ['NY'] },
  { d: '2026-11-02', name: 'Finados', places: ['BR'] },
]
test('holiday view groups chronologically across years without mutating data', () => {
  const original = JSON.stringify(rows)
  const groups = groupHolidayRows(rows)
  assert.deepEqual(groups.map((g) => g.month), ['2026-11', '2027-01'])
  assert.equal(groups[0].rows[0].name, 'Finados')
  assert.equal(JSON.stringify(rows), original)
})
test('holiday view filters exact plaza and preserves multi-plaza events', () => {
  assert.deepEqual(groupHolidayRows(rows, 'NY').flatMap((g) => g.rows).map((r) => r.name), ['Veterans Day', 'Ano Novo'])
  assert.deepEqual(groupHolidayRows(rows, 'BR').flatMap((g) => g.rows).map((r) => r.name), ['Finados', 'Ano Novo'])
  assert.deepEqual(groupHolidayRows(rows, 'SOR'), [])
})

test('Curitiba: aniversário (29/03), padroeira (08/09) e Emancipação do Paraná (19/12), sem duplicar o calendário nacional', async () => {
  const { holidayMap, isBusinessDay, calFlag, calLabel, CALENDARS } = await import('../src/holidays.js')
  const cwb = holidayMap('CWB', 2026), pr = holidayMap('PR', 2026), est = holidayMap('PRE', 2026)
  assert.equal(cwb.get('2026-03-29'), 'Aniversário de Curitiba'); assert.match(cwb.get('2026-09-08'), /Nossa Senhora da Luz dos Pinhais/)
  assert.equal(cwb.size, 2); assert.equal(est.get('2026-12-19'), 'Emancipação Política do Paraná')
  assert.deepEqual([...pr.keys()], ['2026-03-29', '2026-09-08', '2026-12-19'], 'praça Curitiba = cidade + estado, em ordem de data')
  assert.equal(isBusinessDay('2026-09-08', 'PR'), false); assert.equal(isBusinessDay('2026-09-08', 'BR'), true, 'só vale na praça de Curitiba')
  assert.equal(isBusinessDay('2026-09-09', 'PR'), true)
  assert.equal(calFlag('PR'), 'BRL'); assert.equal(calLabel('PR'), 'Curitiba')
  assert.ok(CALENDARS.find((c) => c.id === 'PR' && !c.hidden) && CALENDARS.find((c) => c.id === 'CWB')?.hidden && CALENDARS.find((c) => c.id === 'PRE')?.hidden)
  for (const y of [2025, 2027, 2028]) assert.equal(holidayMap('PR', y).size, 3, String(y))
})
