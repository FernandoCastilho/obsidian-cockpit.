import test from 'node:test'
import assert from 'node:assert/strict'
import { ipcaFile, parseIpca } from '../scripts/ipca-lib.mjs'
const head = { V: 'Valor', D2C: 'Variável (Código)', D3C: 'Mês (Código)' }
const row = (v, code, period, V) => ({ D2C: String(code), D3C: period, V: String(V) })
const rows = (n = 14) => {
  const out = [head]
  for (let i = 0; i < n; i++) {
    const period = `${2025 + Math.floor((i + 8) / 12)}${String(((i + 8) % 12) + 1).padStart(2, '0')}`
    out.push(row(0, 63, period, (0.1 * i).toFixed(2)), row(0, 69, period, (0.2 * i).toFixed(2)), row(0, 2265, period, '4.50'), row(0, 2266, period, (7000 + i).toFixed(2)))
  }
  return out
}

test('IPCA: junta as quatro variáveis por mês, em ordem', () => {
  const p = parseIpca(rows())
  assert.equal(p.length, 14)
  assert.equal(p[0].period, '2025-09')
  assert.deepEqual(Object.keys(p[0]).sort(), ['index', 'mom', 'period', 'y12', 'ytd'])
  assert.equal(p[1].mom, 0.1); assert.equal(p[13].index, 7013)
  assert.ok(p.every((x, i) => i === 0 || p[i - 1].period < x.period))
})

test('IPCA: "..." (sem divulgação) fica nulo, nunca zero', () => {
  const r = rows(); r.splice(1, 0, row(0, 63, '197912', '...'), row(0, 2266, '197912', '100'))
  const p = parseIpca(r)
  assert.equal(p[0].period, '1979-12'); assert.equal(p[0].mom, null); assert.equal(p[0].index, 100)
})

test('IPCA: recusa resposta curta, linha de variável desconhecida e mês inválido', () => {
  assert.throws(() => parseIpca([head]), /poucas linhas/)
  assert.throws(() => parseIpca([...rows(), row(0, 999, '202610', '1')]), /inesperada/)
  assert.throws(() => parseIpca([...rows(), row(0, 63, '202613', '1')]), /inválido/)
  assert.throws(() => parseIpca(null), /poucas linhas/)
})

test('IPCA: arquivo publicado guarda fonte, conferência e pontos', () => {
  const f = ipcaFile(parseIpca(rows()), '2026-10-28T00:00:00Z')
  assert.equal(f.series.id, 'ipca'); assert.match(f.series.sourceUrl, /^https:\/\/sidra\.ibge\.gov\.br/); assert.equal(f.series.stale, false)
})
