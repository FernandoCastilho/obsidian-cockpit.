import test from 'node:test'
import assert from 'node:assert/strict'
import { dividaFile, parseDivida } from '../scripts/divida-lib.mjs'
import { dividaRows, dividaSeries, DIVIDA_METRICS, normalizeDivida } from '../src/divida.js'
const month = (i) => `01/${String((i % 12) + 1).padStart(2, '0')}/${2024 + Math.floor(i / 12)}`
const rows = (n, base, step) => Array.from({ length: n }, (_, i) => ({ data: month(i), valor: String(+(base + step * i).toFixed(2)) }))

test('dívida bruta: junta % do PIB e R$ por mês, em ordem', () => {
  const p = parseDivida(rows(14, 74, 0.1), rows(14, 8000, 50))
  assert.equal(p.length, 14)
  assert.deepEqual(p[0], { period: '2024-01', pib: 74, brl: 8000 })
  assert.equal(p[13].period, '2025-02'); assert.equal(p[13].pib, 75.3)
})
test('dívida bruta: mês presente em só uma série fica nulo na outra, nunca zero', () => {
  const p = parseDivida(rows(14, 74, 0.1), rows(13, 8000, 50))
  assert.equal(p[13].brl, null); assert.equal(p[13].pib, 75.3)
})
test('dívida bruta: recusa resposta curta, data inválida, valor ausente/zero e mês duplicado', () => {
  assert.throws(() => parseDivida(rows(3, 74, 0.1), rows(14, 8000, 50)), /poucas linhas/)
  assert.throws(() => parseDivida(null, rows(14, 8000, 50)), /poucas linhas/)
  const bad = rows(14, 74, 0.1); bad[2].data = '2024-03-01'
  assert.throws(() => parseDivida(bad, rows(14, 8000, 50)), /inválida/)
  const empty = rows(14, 74, 0.1); empty[2].valor = ''
  assert.throws(() => parseDivida(empty, rows(14, 8000, 50)), /inválida/)
  const zero = rows(14, 74, 0.1); zero[2].valor = '0'
  assert.throws(() => parseDivida(zero, rows(14, 8000, 50)), /inválida/)
  const dup = rows(14, 74, 0.1); dup[13].data = dup[0].data
  assert.throws(() => parseDivida(dup, rows(14, 8000, 50)), /duplicado/)
})
test('dívida bruta: arquivo publicado guarda fonte, conferência e pontos', () => {
  const f = dividaFile(parseDivida(rows(14, 74, 0.1), rows(14, 8000, 50)), '2026-10-30T00:00:00Z')
  assert.equal(f.series.id, 'divida-bruta'); assert.match(f.series.sourceUrl, /^https:\/\/www\.bcb\.gov\.br/); assert.equal(f.series.stale, false)
  const e = dividaFile([], '2026-10-30T00:00:00Z', { stale: true, error: 'HTTP 502' })
  assert.equal(e.series.stale, true); assert.equal(e.series.error, 'HTTP 502')
})
test('dívida bruta: tela normaliza, converte para R$ bilhões e calcula variações', () => {
  const file = dividaFile(parseDivida(rows(14, 74, 0.1), rows(14, 8000000, 50000)), '2026-10-30T00:00:00Z')
  const s = normalizeDivida(file)
  assert.equal(dividaSeries(s, DIVIDA_METRICS[1])[0].value, 8000)
  const [pib, brl] = dividaRows(s)
  assert.equal(pib.last.period, '2025-02'); assert.equal(pib.prev.period, '2025-01'); assert.equal(pib.yearAgo.period, '2024-02')
  assert.ok(Math.abs(pib.delta - 0.1) < 1e-9); assert.ok(Math.abs(pib.deltaYear - 1.2) < 1e-9)
  assert.equal(pib.peak.period, '2025-02'); assert.equal(brl.last.value, 8650)
})
test('dívida bruta: arquivo de outra série ou com meses repetidos é recusado', () => {
  assert.throws(() => normalizeDivida({ series: { id: 'ipca', points: [], checkedAt: 'x' } }), /inválido/)
  assert.throws(() => normalizeDivida({ series: { id: 'divida-bruta', checkedAt: 'x', points: [{ period: '2025-01' }, { period: '2025-01' }] } }), /inválido/)
})

test('dívida bruta: % do PIB com duas casas, para a variação pequena não sumir no arredondamento', () => {
  assert.equal(DIVIDA_METRICS[0].decimals, 2)
  const f = dividaFile([{ period: '2026-08', pib: 82.87, brl: 11054954.37 }, { period: '2026-09', pib: 82.93, brl: 11113782.53 }], '2026-10-30T00:00:00Z')
  const [pib] = dividaRows({ ...f.series, points: [...Array.from({ length: 12 }, (_, i) => ({ period: `2025-${String(i + 1).padStart(2, '0')}`, pib: 80, brl: 1e7 })), ...f.series.points] })
  assert.ok(Math.abs(pib.delta - 0.06) < 1e-9)
  assert.equal(pib.last.value.toFixed(2), '82.93'); assert.equal(pib.prev.value.toFixed(2), '82.87')
})
