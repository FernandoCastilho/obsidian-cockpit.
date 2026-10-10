// Testes da lógica do app (sem navegador): agenda, estatísticas, paridade, mensagens e resumo.
import test from 'node:test'
import assert from 'node:assert/strict'
import { upcoming, zonedToUtc } from '../src/agenda.js'
import { rangeStats } from '../src/stats.js'
import { liveParity, mergeDaily, mergeTicks } from '../src/parity.js'
import { buildMessage, buildSummary } from '../src/whatsapp.js'
import { friendlyError } from '../src/useQuotes.js'

test('fuso: 14h de Nova York em 28/10/2026 (horário de verão) = 18h UTC; Brasília 18h30 = 21h30 UTC', () => {
  assert.equal(new Date(zonedToUtc('2026-10-28', '14:00', 'America/New_York')).toISOString(), '2026-10-28T18:00:00.000Z')
  assert.equal(new Date(zonedToUtc('2026-11-04', '18:30', 'America/Sao_Paulo')).toISOString(), '2026-11-04T21:30:00.000Z')
  // depois do fim do horário de verão dos EUA (1/11/2026): 14h ET = 19h UTC
  assert.equal(new Date(zonedToUtc('2026-12-09', '14:00', 'America/New_York')).toISOString(), '2026-12-09T19:00:00.000Z')
})

test('agenda: ordem cronológica, janela de dias e Focus às segundas', () => {
  const ev = upcoming(new Date('2026-10-10T12:00:00Z'), 30)
  assert.ok(ev.length >= 5)
  assert.deepEqual(ev.map((e) => e.t), [...ev.map((e) => e.t)].sort((a, b) => a - b))
  assert.ok(ev.some((e) => e.kind === 'FOMC'))
  assert.ok(ev.some((e) => e.kind === 'Copom'))
  const focus = ev.filter((e) => e.kind === 'Focus')
  assert.ok(focus.length >= 4)
  for (const f of focus) assert.equal(new Date(f.t - 3 * 3600e3).getUTCDay(), 1)
  assert.equal(upcoming(new Date('2030-01-01T00:00:00Z'), 10).filter((e) => e.kind !== 'Focus').length, 0)
})

test('variações por intervalo e volatilidade', () => {
  const day = 864e5
  const end = Date.UTC(2026, 9, 8)
  const pts = Array.from({ length: 300 }, (_, i) => ({ t: end - (299 - i) * day, bid: 5 + i * 0.001 }))
  const s = rangeStats(pts)
  assert.ok(s.week > 0 && s.month > s.week && s.year > s.month)
  assert.ok(s.vol >= 0)
  assert.equal(rangeStats([{ t: 1, bid: 5 }]), null)
  assert.equal(rangeStats(undefined), null)
})

test('paridade EUR/USD: euro ÷ dólar (padrão de mercado) e inversão no histórico', () => {
  const p = liveParity({ bid: 5.3, ask: 5.31, pct: 0 }, { bid: 6.1, ask: 6.12, pct: 0 })
  assert.ok(Math.abs(p.main - 6.1 / 5.3) < 1e-12)
  assert.ok(p.main > 1) // dólares por euro
  assert.ok(Math.abs(p.buy - 6.1 / 5.31) < 1e-12 && Math.abs(p.sell - 6.12 / 5.3) < 1e-12)
  assert.ok(p.buy < p.sell)
  assert.equal(liveParity(null, { bid: 1, ask: 1 }), null)
  const t0 = new Date('2026-10-08T12:00:00').getTime()
  assert.equal(mergeDaily([{ t: t0, bid: 5 }], [{ t: t0, bid: 10 }]).at(0).bid, 0.5)
  assert.equal(mergeDaily([{ t: t0, bid: 5 }], [{ t: t0, bid: 10 }], true).at(0).bid, 2)
  assert.equal(mergeTicks([{ t: 5, bid: 4 }], [{ t: 1, bid: 8 }]).at(0).bid, 0.5)
})

test('mensagem do WhatsApp e resumo do dia', () => {
  const q = (b, p) => ({ bid: b, ask: b, pct: p })
  const quotes = { USD: q(5.3, 0.4), EUR: q(6.1, -0.2) }
  const msg = buildMessage(quotes, new Date('2026-10-10T12:00:00'))
  assert.match(msg, /\*USD\* R\$ 5,3000 🟢/)
  assert.match(msg, /\*EUR\/USD\* US\$ 1,1509/)
  const br = { compare: [{ id: 'hoje', date: '2026-10-08' }, { id: 'd1', date: '2026-10-07' }], curves: { '2026-10-08': [[252, 13.8]], '2026-10-07': [[252, 13.85]] } }
  const text = buildSummary({ quotes, macro: { sofr: [[Date.UTC(2026, 9, 8, 12), 3.87]], cdi: [[0, 14.9]], selic: [[0, 15]] }, curves: { br } })
  assert.match(text, /DI x pré/)
  assert.match(text, /1a 13,80% \(−5 bps\)/)
  assert.match(text, /SOFR 3,87%/)
  assert.equal(buildSummary({ quotes: null, macro: null, curves: null }), '')
})

test('erros técnicos viram texto em português', () => {
  assert.match(friendlyError('USD-BRL: HTTP 429'), /limite de consultas/)
  assert.match(friendlyError('Failed to fetch'), /sem conexão/)
  assert.match(friendlyError('USD-BRL: HTTP 503'), /instável/)
})
