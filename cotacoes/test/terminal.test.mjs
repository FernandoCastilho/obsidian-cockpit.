import assert from 'node:assert/strict'
import test from 'node:test'
import { liveCross } from '../src/parity.js'
import { ageText, brentItem, changeText, dataStatus, feedState, ipcaItem, kpiItems, parseCommand, tapeItems } from '../src/terminal.js'

const q = (bid, pct, extra = {}) => ({ bid, ask: bid, high: bid, low: bid, pct, timestamp: Date.now(), ...extra })
const quotes = { USD: q(5, 1, { source: 'USD' }), EUR: q(6, -0.5, { source: 'EUR' }), JPY: q(0.034, 0.2, { source: 'JPY' }), CNH: q(0.74, 0.1, { source: 'CNH' }) }
const rates = [
  { key: 'selic', label: 'Selic', value: 14.25, delta: 0 },
  { key: 'cdi', label: 'CDI', value: 14.15, delta: null },
  { key: 'di1', label: 'DI 1 ano', value: 13.8, delta: 0.04 },
  { key: 'ust10', label: 'Treasury 10a', value: 4.18, delta: -0.03 },
]

test('comandos: moedas, paridade e seções, com variações de escrita', () => {
  assert.deepEqual(parseCommand('USDBRL Curncy'), { kind: 'currency', code: 'USD' })
  assert.deepEqual(parseCommand(' usd/brl <GO> '), { kind: 'currency', code: 'USD' })
  assert.deepEqual(parseCommand('dólar'), { kind: 'currency', code: 'USD' })
  assert.deepEqual(parseCommand('iene'), { kind: 'currency', code: 'JPY' })
  assert.deepEqual(parseCommand('CNY'), { kind: 'currency', code: 'CNH' })
  assert.deepEqual(parseCommand('EUR/USD'), { kind: 'pair' })
  assert.deepEqual(parseCommand('juros'), { kind: 'tab', id: 'juros', sub: '' })
  assert.deepEqual(parseCommand('Notícias'), { kind: 'tab', id: 'noticias', sub: '' })
  assert.deepEqual(parseCommand('finimp'), { kind: 'tab', id: 'calculadora', sub: 'finimp' })
  assert.deepEqual(parseCommand('cenários'), { kind: 'tab', id: 'cenarios', sub: '' })
})

test('comando desconhecido ou vazio não navega', () => {
  assert.equal(parseCommand(''), null)
  assert.equal(parseCommand('   '), null)
  assert.equal(parseCommand(undefined), null)
  assert.equal(parseCommand('PETR4'), null)
})

test('variação: sinal, vírgula decimal e unidade; ausência não vira zero', () => {
  assert.equal(changeText(0.42), '+0,42%')
  assert.equal(changeText(-1.1234), '−1,12%')
  assert.equal(changeText(0), '0,00%')
  assert.equal(changeText(0.04, 'bps'), '+4 bps')
  assert.equal(changeText(-0.03, 'bps'), '−3 bps')
  assert.equal(changeText(null), null)
  assert.equal(changeText(NaN, 'bps'), null)
})

test('faixa: câmbio, paridade e juros, com tom pela direção', () => {
  const items = tapeItems(quotes, rates)
  assert.deepEqual(items.map((i) => i.label), ['USD/BRL', 'EUR/BRL', 'JPY/BRL', 'CNH/BRL', 'EUR/USD', 'Selic', 'CDI', 'DI 1 ano', 'Treasury 10a'])
  assert.equal(items[0].value, '5,0000')
  assert.equal(items[2].value, '0,03400')
  assert.equal(items[0].tone, 'up')
  assert.equal(items[1].tone, 'down')
  const parity = items.find((i) => i.key === 'EURUSD')
  assert.equal(parity.value, '1,2000')
  assert.equal(items.find((i) => i.key === 'selic').tone, 'flat')
  assert.equal(items.find((i) => i.key === 'cdi').text, null)
})

test('cotação de reserva (BCE) não exibe variação do dia nem entra na paridade', () => {
  const fb = { ...quotes, EUR: q(6, 0, { source: 'EUR', fallback: true }) }
  const items = tapeItems(fb, [])
  assert.equal(items.find((i) => i.key === 'EURBRL').text, null)
  assert.equal(items.find((i) => i.key === 'EURUSD'), undefined)
  assert.equal(kpiItems(fb, []).some((i) => i.key === 'EURUSD'), false)
})

test('sem dados: nada é inventado', () => {
  assert.deepEqual(tapeItems(null, undefined), [])
  assert.deepEqual(kpiItems(undefined, []), [])
})

test('indicadores: dólar, euro, paridade e juros do Brasil, nessa ordem', () => {
  assert.deepEqual(kpiItems(quotes, rates).map((i) => i.key), ['USDBRL', 'EURBRL', 'EURUSD', 'selic', 'cdi', 'di1'])
})

test('estado dos dados: erro vence; antigo avisa; sem cotação ainda carrega', () => {
  assert.equal(feedState({ error: 'x', aged: false, hasQuotes: true }), 'err')
  assert.equal(feedState({ error: null, aged: false, hasQuotes: false }), 'loading')
  assert.equal(feedState({ error: null, aged: true, hasQuotes: true }), 'delayed')
  assert.equal(feedState({ error: null, aged: undefined, hasQuotes: true }), 'ok')
})

const oil = { benchmark: 'Brent', kind: 'spot', unit: 'USD/barril', value: 115.22, observationDate: '2026-10-20' }

test('Brent da EIA entra na faixa com a data da observação e sem variação inventada', () => {
  const b = brentItem(oil)
  assert.equal(b.value, '115,22')
  assert.equal(b.note, '20/10')
  assert.equal(b.change, null)
  const items = tapeItems(quotes, rates, oil)
  assert.equal(items.at(-1).label, 'Brent EIA')
  assert.equal(items.at(-1).text, null)
  assert.equal(items.at(-1).tone, 'flat')
})

test('Brent com série traz a variação do dia (faixa); o card do topo agora é o IPCA', () => {
  const withPoints = { ...oil, points: [{ date: '2026-10-19', value: 118.82 }, { date: '2026-10-20', value: 115.22 }] }
  assert.ok(Math.abs(brentItem(withPoints).change - (115.22 / 118.82 - 1) * 100) < 1e-9)
  assert.equal(tapeItems(quotes, rates, withPoints).some((i) => i.key === 'BRENT'), true)
  assert.equal(kpiItems(quotes, rates, null).some((i) => i.key === 'BRENT'), false)
})

test('IPCA 12 meses no topo: valor, diferença em p.p. sobre o mês anterior e mês de referência', () => {
  const series = { points: [{ period: '2026-07', y12: 5.2 }, { period: '2026-08', y12: 4.9 }, { period: '2026-09', y12: 4.68 }] }
  const item = ipcaItem(series)
  assert.equal(item.label, 'IPCA 12m'); assert.equal(item.value, '4,68%'); assert.match(item.note, /set\/26/)
  assert.ok(Math.abs(item.change - (4.68 - 4.9)) < 1e-9)
  const k = kpiItems(quotes, rates, series)
  assert.equal(k.map((i) => i.key).join(), 'USDBRL,EURBRL,EURUSD,IPCA,selic,cdi,di1')
  const card = k.find((i) => i.key === 'IPCA')
  assert.equal(card.text, '−0,22 p.p.'); assert.equal(card.tone, 'down')
  // sem o mês anterior a variação some, sem virar zero; sem série, o card não existe
  assert.equal(ipcaItem({ points: [{ period: '2026-09', y12: 4.68 }] }).change, null)
  assert.equal(ipcaItem({ points: [] }), null)
  assert.equal(ipcaItem(null), null)
  assert.equal(changeText(0.001, 'pp'), '0,00 p.p.')
})

test('Brent inválido ou de outra série não entra', () => {
  assert.equal(brentItem(null), null)
  assert.equal(brentItem({ ...oil, kind: 'futures' }), null)
  assert.equal(brentItem({ ...oil, value: null }), null)
  assert.equal(tapeItems(quotes, [], { ...oil, unit: 'USD/m3' }).some((i) => i.key === 'BRENT'), false)
})

test('estado das fontes: atrasado só acima do limite; fim de semana não atrasa coleta de dia útil', () => {
  const now = Date.parse('2026-10-27T12:00:00Z')
  const H = 3600e3
  const rows = dataStatus([
    { key: 'a', label: 'A', at: now - 2 * H, maxAge: 6 * H, weekdays: true },
    { key: 'b', label: 'B', at: now - 9 * H, maxAge: 6 * H, weekdays: true },
    { key: 'c', label: 'C', at: new Date(now - 9 * H).toISOString(), maxAge: 6 * H, weekdays: false },
    { key: 'd', label: 'D', at: undefined, maxAge: 6 * H, weekdays: true },
  ], now, false)
  assert.deepEqual(rows.map((r) => r.state), ['ok', 'old', 'old', 'missing'])
  const weekend = dataStatus([{ key: 'b', label: 'B', at: now - 40 * H, maxAge: 6 * H, weekdays: true }, { key: 'q', label: 'Q', at: now - 40 * H, maxAge: 6 * H, weekdays: false }], now, true)
  assert.deepEqual(weekend.map((r) => r.state), ['ok', 'old'])
})

test('idade em texto', () => {
  assert.equal(ageText(20e3), 'agora')
  assert.equal(ageText(5 * 60e3), 'há 5 min')
  assert.equal(ageText(3 * 3600e3), 'há 3 h')
  assert.equal(ageText(72 * 3600e3), 'há 3 dias')
  assert.equal(ageText(NaN), '—')
})

test('paridade: cotações de horários distintos não geram variação do dia', () => {
  const now = Date.now()
  const stale = { ...quotes, USD: { ...quotes.USD, timestamp: now - 6 * 3600e3 }, EUR: { ...quotes.EUR, timestamp: now } }
  const p = tapeItems(stale, []).find((i) => i.key === 'EURUSD')
  assert.equal(p.change, null)
  assert.equal(p.text, null)
  assert.equal(p.reason, 'cotações de horários distintos')
  assert.equal(kpiItems(stale, []).find((i) => i.key === 'EURUSD').text, null)
  const sync = { ...quotes, USD: { ...quotes.USD, timestamp: now }, EUR: { ...quotes.EUR, timestamp: now - 5 * 60e3 } }
  assert.ok(Number.isFinite(tapeItems(sync, []).find((i) => i.key === 'EURUSD').change))
})

test('liveCross sinaliza horários distintos e aceita cotações sem horário', () => {
  const a = { bid: 6, pct: -0.1, timestamp: 2e6 }
  assert.equal(liveCross(a, { bid: 5, pct: 0.1, timestamp: 2e6 + 29 * 60e3 }).comparable, true)
  assert.equal(liveCross(a, { bid: 5, pct: 0.1, timestamp: 2e6 + 31 * 60e3 }).comparable, false)
  assert.equal(liveCross({ bid: 6, pct: 0 }, { bid: 5, pct: 0 }).comparable, true)
})

test('variação que arredonda para zero fica neutra, sem seta de alta ou baixa', () => {
  const r = [{ key: 'cdi', label: 'CDI', value: 14.19, delta: 0.0004 }, { key: 'selic', label: 'Selic', value: 14.25, delta: -0.004 }, { key: 'di1', label: 'DI 1 ano', value: 13.8, delta: 0.006 }]
  const items = tapeItems(null, r)
  assert.deepEqual(items.map((i) => [i.tone, i.text]), [['flat', '0 bps'], ['flat', '0 bps'], ['up', '+1 bps']])
  assert.equal(changeText(0.004), '0,00%')
  assert.equal(changeText(-0.004), '0,00%')
})

test('comandos levam ao assunto certo dentro de Cenários', () => {
  assert.deepEqual(parseCommand('commodities'), { kind: 'tab', id: 'cenarios', sub: 'commodities' })
  assert.deepEqual(parseCommand('PMI'), { kind: 'tab', id: 'cenarios', sub: 'atividade' })
  assert.deepEqual(parseCommand('frete'), { kind: 'tab', id: 'cenarios', sub: 'frete' })
  assert.deepEqual(parseCommand('focus'), { kind: 'tab', id: 'cenarios', sub: 'projecoes' })
  assert.deepEqual(parseCommand('cenários'), { kind: 'tab', id: 'cenarios', sub: '' })
})
