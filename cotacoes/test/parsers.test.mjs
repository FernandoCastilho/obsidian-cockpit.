// Testes dos parsers das fontes de dados e das funções puras. Rodam antes do build: se uma fonte mudar de formato, o deploy para.
import test from 'node:test'
import assert from 'node:assert/strict'
import { b3Url, parseB3, parseTreasury, pickDates } from '../scripts/curves-lib.mjs'
import { brDate, changePoints, focusFor, focusRelease, parseSgs, parseSofr, parseSofrAvg, ptaxFrom, toBr } from '../scripts/macro-lib.mjs'
import { parseYahoo } from '../scripts/intraday-lib.mjs'

test('B3: taxas em formato brasileiro e corte de vértices curtos', () => {
  const rows = [{ day252: 63, rate: '14,10' }, { day252: 1, rate: '1.234,50' }, { day252: 5, rate: 'x' }]
  assert.deepEqual(parseB3(rows), [[1, 1234.5], [63, 14.1]])
  assert.deepEqual(parseB3(rows, 21), [[63, 14.1]])
  assert.deepEqual(parseB3(undefined), [])
})

test('B3: URL com parâmetros em base64', () => {
  const u = b3Url('GetList', { id: 'PRE' })
  assert.ok(u.endsWith('/GetList/' + Buffer.from('{"id":"PRE"}').toString('base64')))
})

test('Treasury: CSV vira curvas por data, ignorando colunas vazias', () => {
  const t = parseTreasury('"Date","1 Mo","2 Mo","1 Yr","10 Yr"\n"10/08/2026","4.1","","3.9","4.2"')
  const pts = t['2026-10-08']
  assert.equal(pts.length, 3)
  assert.deepEqual(pts.map((p) => p[2]), ['1 Mo', '1 Yr', '10 Yr'])
  assert.equal(pts[2][0], 10)
})

test('datas de comparação: pega a mais recente que não passa do alvo', () => {
  const r = pickDates(['2026-10-08T00:00:00', '2026-10-07T00:00:00', '2026-09-30T00:00:00', '2025-10-01T00:00:00'])
  assert.deepEqual(r.map((x) => [x.id, x.date]), [['hoje', '2026-10-08'], ['d1', '2026-10-07'], ['w1', '2026-09-30'], ['m1', '2025-10-01']])
  assert.deepEqual(pickDates([]), [])
})

test('SGS do Banco Central: datas e valores', () => {
  assert.deepEqual(parseSgs([{ data: '08/10/2026', valor: '14.90' }, { data: 'x', valor: '1' }]), [[brDate('08/10/2026'), 14.9]])
  assert.equal(toBr(brDate('08/10/2026')), '08/10/2026')
})

test('mudanças de Selic e Focus', () => {
  assert.deepEqual(changePoints([[1, 15], [2, 15], [3, 14.5], [4, 14.5]]).map((p) => p[1]), [15, 14.5, 14.5])
  const f = focusFor([{ Data: '2026-10-02', DataReferencia: '2026', Mediana: 14.5, Minimo: 14, Maximo: 15, numeroRespondentes: 100 }, { Data: '2026-09-25', DataReferencia: '2026', Mediana: 14.75 }])
  assert.equal(f.date, '2026-10-02')
  assert.equal(f.values['2026'].median, 14.5)
  assert.equal(focusRelease('2026-10-02'), '2026-10-05')
  assert.equal(focusFor([]), null)
})

test('PTAX: prefere o boletim de fechamento', () => {
  const p = ptaxFrom([{ cotacaoCompra: 5.2, cotacaoVenda: 5.21, tipoBoletim: 'Abertura' }, { cotacaoCompra: 5.3, cotacaoVenda: 5.31, tipoBoletim: 'Fechamento PTAX' }, { cotacaoCompra: 5.25, cotacaoVenda: 5.26, tipoBoletim: 'Intermediário' }])
  assert.equal(p.sell, 5.31)
  assert.equal(ptaxFrom([]), null)
})

test('SOFR do NY Fed: taxa, percentis e médias, tolerando campos ausentes', () => {
  const s = parseSofr({ refRates: [{ effectiveDate: '2026-10-08', percentRate: 3.87, percentPercentile1: 3.83, percentPercentile99: 3.95 }, { effectiveDate: '2026-10-07', percentRate: 3.88 }, { effectiveDate: '2026-10-06' }] })
  assert.equal(s.length, 2)
  assert.deepEqual(s[1].slice(1), [3.87, 3.83, 3.95])
  assert.deepEqual(s[0].slice(1), [3.88, null, null])
  const a = parseSofrAvg({ refRates: [{ effectiveDate: '2026-10-08', average30day: 4.1, average90day: 4.2, average180day: null }] })
  assert.deepEqual(a[0].slice(1), [4.1, 4.2, null])
  assert.deepEqual(parseSofrAvg({}), [])
})

test('Yahoo: descarta barras vazias e ordena', () => {
  const r = parseYahoo({ chart: { result: [{ timestamp: [20, 10, 30], indicators: { quote: [{ close: [5.2, 5.1, null] }] } }] } })
  assert.deepEqual(r, [[10000, 5.1], [20000, 5.2]])
  assert.deepEqual(parseYahoo({}), [])
})

test('intraday: amostras horárias acrescentam sem duplicar e descartam o que passou de 5 dias', async () => {
  const { mergeSnapshots } = await import('../scripts/intraday-lib.mjs')
  const now = 10 * 864e5
  const prev = { USD: { points: [[1, 5.0], [now - 2 * 864e5, 5.1]] } }
  const m = mergeSnapshots(prev, { USD: [now, 5.2], EUR: [now, 6.0] }, 5 * 864e5, now)
  assert.deepEqual(m.USD.points.map((p) => p[1]), [5.1, 5.2])
  assert.deepEqual(m.EUR.points, [[now, 6.0]])
  // mesma amostra de novo não duplica; amostra inválida é ignorada
  assert.equal(mergeSnapshots(m, { USD: [now, 5.2] }, 5 * 864e5, now).USD.points.length, 2)
  assert.equal(mergeSnapshots(m, { USD: [now + 1, NaN] }, 5 * 864e5, now).USD.points.length, 2)
})
