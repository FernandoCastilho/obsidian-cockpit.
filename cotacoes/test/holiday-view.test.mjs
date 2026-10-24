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
