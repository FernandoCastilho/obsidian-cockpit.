// Coleta central: grava as cotações e acumula o intraday sem duplicar, e uma falha da fonte preserva os arquivos anteriores.
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { collect } from '../scripts/quotes-lib.mjs'

const q = (b, ts) => ({ bid: String(b), ask: String(b + 0.01), high: String(b), low: String(b), pctChange: '0', timestamp: String(ts) })
const api = (ts, b = 5.3) => async () => ({ ok: true, status: 200, json: async () => ({ USDBRL: q(b, ts), EURBRL: q(6.1, ts), JPYBRL: q(0.035, ts), USDCNH: q(7.1, ts) }) })

test('coleta: grava quotes.json e intraday.json', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'q-'))
  const now = 1_800_000_000_000
  const r = await collect({ dir, fetchFn: api(now / 1000), now, tries: 1 })
  assert.equal(r.ok, true)
  const quotes = JSON.parse(await readFile(join(dir, 'quotes.json'), 'utf8'))
  assert.equal(quotes.generatedAt, now)
  assert.equal(quotes.quotes.USDBRL.bid, '5.3')
  const intra = JSON.parse(await readFile(join(dir, 'intraday.json'), 'utf8'))
  assert.equal(intra.resolution, '5 min')
  assert.deepEqual(Object.keys(intra.series).sort(), ['CNH', 'EUR', 'JPY', 'USD'])
  assert.deepEqual(intra.series.USD.points, [[now, 5.3]])
})

test('coleta: acumula pontos novos e não duplica quando a fonte repete a última cotação', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'q-'))
  const t0 = 1_800_000_000_000
  await collect({ dir, fetchFn: api(t0 / 1000, 5.3), now: t0, tries: 1 })
  await collect({ dir, fetchFn: api((t0 + 300000) / 1000, 5.31), now: t0 + 300000, tries: 1 })
  await collect({ dir, fetchFn: api((t0 + 300000) / 1000, 5.31), now: t0 + 600000, tries: 1 }) // mercado fechado: mesma cotação
  const intra = JSON.parse(await readFile(join(dir, 'intraday.json'), 'utf8'))
  assert.deepEqual(intra.series.USD.points.map((p) => p[1]), [5.3, 5.31])
})

test('coleta: falha da fonte devolve erro e preserva os arquivos anteriores', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'q-'))
  await writeFile(join(dir, 'quotes.json'), '{"generatedAt":1,"quotes":{}}')
  const r = await collect({ dir, fetchFn: async () => ({ ok: false, status: 429 }), tries: 1 })
  assert.equal(r.ok, false)
  assert.match(r.error, /429/)
  assert.equal(JSON.parse(await readFile(join(dir, 'quotes.json'), 'utf8')).generatedAt, 1)
})

test('coleta: usa a chave quando existe', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'q-'))
  let url = ''
  await collect({ dir, key: 'abc 123', fetchFn: async (u) => ((url = String(u)), { ok: false, status: 500 }), tries: 1 })
  assert.match(url, /\?token=abc%20123$/)
  assert.match(url, /USD-BRL,EUR-BRL,JPY-BRL,USD-CNH/)
})

import { collectHistory, parseDaily } from '../scripts/quotes-lib.mjs'
import { pickCentral } from '../src/useHistory.js'

const row = (day, b) => ({ timestamp: String(Date.parse(`${day}T15:00:00Z`) / 1000), bid: String(b), high: String(b + 0.1), low: String(b - 0.1) })
const dailyApi = (n = 40) => async () => ({
  ok: true,
  status: 200,
  json: async () => Array.from({ length: n }, (_, i) => row(new Date(Date.UTC(2026, 8, 30) - i * 864e5).toISOString().slice(0, 10), 5 + i / 100)),
})

test('histórico: parseDaily ordena, remove dia repetido e valores inválidos', () => {
  const p = parseDaily([row('2026-10-02', 5.2), row('2026-10-01', 5.1), row('2026-10-01', 5.15), { timestamp: 'x', bid: '1' }, row('2026-10-03', 0)])
  assert.deepEqual(p.map((x) => x.bid), [5.15, 5.2])
})

test('histórico: grava history.json por moeda e não consulta de novo antes de 6 h', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'h-'))
  const now = 1_800_000_000_000
  let calls = 0
  const f = async (...a) => (calls++, dailyApi()(...a))
  const r = await collectHistory({ dir, key: 'k', fetchFn: f, now })
  assert.equal(r.ok, true)
  assert.equal(calls, 4)
  const file = JSON.parse(await readFile(join(dir, 'history.json'), 'utf8'))
  assert.deepEqual(Object.keys(file.series).sort(), ['CNH', 'EUR', 'JPY', 'USD'])
  assert.equal(file.series.USD.source, 'USD')
  const again = await collectHistory({ dir, key: 'k', fetchFn: f, now: now + 3600e3 })
  assert.equal(again.skipped, true)
  assert.equal(calls, 4)
})

test('histórico: falha preserva o arquivo anterior', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'h-'))
  const now = 1_800_000_000_000
  await collectHistory({ dir, fetchFn: dailyApi(), now })
  const r = await collectHistory({ dir, fetchFn: async () => ({ ok: false, status: 429 }), now: now + 7 * 3600e3 })
  assert.equal(r.ok, true)
  const file = JSON.parse(await readFile(join(dir, 'history.json'), 'utf8'))
  assert.equal(file.series.USD.points.length, 40)
})

test('histórico no navegador: recorte do arquivo central e recusa de período que ele não cobre', () => {
  const points = Array.from({ length: 30 }, (_, i) => ({ t: Date.UTC(2026, 8, 1 + i, 15), bid: 5 + i / 100, high: 5, low: 5 }))
  const file = { series: { USD: { source: 'USD', points } } }
  const r = pickCentral(file, 'USD', new Date(2026, 8, 5), new Date(2026, 8, 10))
  assert.equal(r.points.length, 6)
  assert.throws(() => pickCentral(file, 'USD', new Date(2025, 0, 1), new Date(2026, 8, 10)), /maior que o histórico/)
  assert.throws(() => pickCentral(file, 'EUR', new Date(2026, 8, 5), new Date(2026, 8, 10)), /sem dados/)
})
