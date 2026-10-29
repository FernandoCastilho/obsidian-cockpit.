import test from 'node:test'
import assert from 'node:assert/strict'
import { ipcaGroupsFile, parseIpcaGroups } from '../scripts/ipca-groups-lib.mjs'

const IDS = [7169, 7170, 7445, 7486, 7558, 7625, 7660, 7712, 7766, 7786]
const header = { D2C: 'Variável (Código)', D3C: 'Mês (Código)', D4C: 'Geral...', V: 'Valor' }
function rows(months, skip = () => false) {
  const out = [header]
  for (const m of months) for (const v of [63, 66, 69, 2265]) for (const id of IDS) {
    if (skip(m, v, id)) { out.push({ D2C: String(v), D3C: m, D4C: String(id), V: '...' }); continue }
    out.push({ D2C: String(v), D3C: m, D4C: String(id), V: String(v === 66 ? 10 : (id - 7000) / 1000 + Number(m.slice(4)) / 100) })
  }
  return out
}

test('IPCA por grupos: agrupa por grupo e mês, na ordem do IBGE, com as quatro leituras', () => {
  const p = parseIpcaGroups(rows(['202607', '202608', '202609']))
  assert.deepEqual(p.periods, ['2026-07', '2026-08', '2026-09'])
  assert.equal(p.groups.length, 10)
  assert.equal(p.groups[0].name, 'Índice geral'); assert.equal(p.groups[1].name, 'Alimentação e bebidas')
  const g = p.groups[1].byPeriod['2026-09']
  assert.deepEqual(Object.keys(g).sort(), ['mom', 'weight', 'y12', 'ytd'])
  assert.equal(g.weight, 10)
})

test('IPCA por grupos: valor ausente fica de fora, nunca vira zero; mês sem o geral invalida', () => {
  const ok = parseIpcaGroups(rows(['202608', '202609'], (m, v, id) => id === 7558 && v === 63 && m === '202608'))
  assert.equal('mom' in ok.groups.find((g) => g.id === 7558).byPeriod['2026-08'], false)
  assert.throws(() => parseIpcaGroups(rows(['202608', '202609'], (m, v, id) => id === 7169 && v === 63 && m === '202609')), /incompleto/)
  assert.throws(() => parseIpcaGroups([header]), /poucas linhas/)
  assert.throws(() => parseIpcaGroups([header, ...rows(['202609']).slice(1, 30).map((r) => ({ ...r, D2C: '999' }))]), /inesperada/)
  assert.throws(() => parseIpcaGroups([header, ...rows(['202613']).slice(1)]), /Mês inválido/)
})

test('arquivo publicado carrega fonte, conferência e estado de pendência', () => {
  const f = ipcaGroupsFile(parseIpcaGroups(rows(['202608', '202609'])), '2026-10-29T12:00:00.000Z')
  assert.equal(f.series.id, 'ipca-groups'); assert.match(f.series.sourceUrl, /7060/); assert.equal(f.series.stale, false)
  const e = ipcaGroupsFile(null, '2026-10-29T12:00:00.000Z', { stale: true, error: 'HTTP 500' })
  assert.deepEqual(e.series.groups, []); assert.equal(e.series.stale, true)
})
