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

test('Curitiba: feriados religiosos municipais; aniversário e 19/12 não viram feriado civil', async () => {
  const { holidayMap, isBusinessDay, calFlag, calLabel, CALENDARS } = await import('../src/holidays.js')
  const cwb = holidayMap('CWB', 2026), pr = holidayMap('PR', 2026), est = holidayMap('PRE', 2026)
  assert.equal(cwb.has('2026-03-29'), false); assert.match(cwb.get('2026-09-08'), /Nossa Senhora da Luz dos Pinhais/)
  assert.equal(cwb.size, 3); assert.equal(est.has('2026-12-19'), false)
  assert.deepEqual([...pr.keys()], ['2026-04-03', '2026-06-04', '2026-09-08'], 'Lei municipal 3.015: Sexta-feira Santa, Corpus Christi e padroeira')
  assert.equal(isBusinessDay('2027-03-29', 'CWB'), true)
  assert.equal(isBusinessDay('2025-12-19', 'PR'), true)
  assert.equal(isBusinessDay('2026-09-08', 'PR'), false); assert.equal(isBusinessDay('2026-09-08', 'BR'), true, 'só vale na praça de Curitiba')
  assert.equal(isBusinessDay('2026-09-09', 'PR'), true)
  assert.equal(calFlag('PR'), 'BRL'); assert.equal(calLabel('PR'), 'Curitiba')
  assert.ok(CALENDARS.find((c) => c.id === 'PR' && !c.hidden) && CALENDARS.find((c) => c.id === 'CWB')?.hidden && CALENDARS.find((c) => c.id === 'PRE')?.hidden)
  for (const y of [2025, 2027, 2028]) assert.equal(holidayMap('PR', y).size, 3, String(y))
})
