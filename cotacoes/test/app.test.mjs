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
  assert.match(friendlyError('USD-BRL: HTTP 429'), /cota de consultas/)
  assert.match(friendlyError('Failed to fetch'), /sem conexão/)
  assert.match(friendlyError('USD-BRL: HTTP 503'), /instável/)
})

test('cotações: uma única consulta para as quatro moedas (poupa a cota da API)', async () => {
  const { fetchQuotes } = await import('../src/useQuotes.js')
  const now = Math.floor(Date.now() / 1000)
  const q = (b) => ({ bid: String(b), ask: String(b + 0.01), high: String(b + 0.1), low: String(b - 0.1), pctChange: '0.5', timestamp: String(now) })
  const calls = []
  const real = globalThis.fetch
  globalThis.fetch = async (url) => {
    calls.push(String(url))
    return { ok: true, status: 200, json: async () => ({ USDBRL: q(5.3), EURBRL: q(6.1), JPYBRL: q(0.035), CNYBRL: q(0.74) }) }
  }
  const { results: r } = await fetchQuotes()
  globalThis.fetch = real
  assert.equal(calls.length, 1)
  assert.match(calls[0], /USD-BRL,EUR-BRL,JPY-BRL,CNY-BRL/)
  assert.equal(r.USD.quote.bid, 5.3)
  assert.equal(r.CNH.quote.source, 'CNY')
})

test('cotações: 429 usa a reserva do BCE e não insiste por 60 s', async () => {
  const { fetchQuotes } = await import('../src/useQuotes.js')
  const calls = []
  const real = globalThis.fetch
  globalThis.fetch = async (url) => {
    calls.push(String(url))
    if (String(url).includes('frankfurter')) return { ok: true, status: 200, json: async () => ({ date: '2026-10-09', rates: { BRL: 5.0 } }) }
    return { ok: false, status: 429 }
  }
  const { results: r } = await fetchQuotes(undefined, { direct: true })
  const awesome = calls.filter((u) => u.includes('awesomeapi')).length
  await fetchQuotes() // dentro dos 60 s: nem chega a consultar a AwesomeAPI de novo
  globalThis.fetch = real
  assert.equal(awesome, 1)
  assert.equal(calls.filter((u) => u.includes('awesomeapi')).length, 1)
  assert.equal(r.USD.quote.fallback, true)
  assert.equal(r.USD.quote.bid, 5)
})

test('cotações: lê a coleta central sem consultar a API; arquivo velho cai para a consulta direta', async () => {
  const { fetchQuotes } = await import('../src/useQuotes.js')
  const q = (b) => ({ bid: String(b), ask: String(b + 0.01), high: String(b), low: String(b), pctChange: '0', timestamp: String(Math.floor(Date.now() / 1000)) })
  const quotes = { USDBRL: q(5.3), EURBRL: q(6.1), JPYBRL: q(0.035), CNYBRL: q(0.74), USDCNH: q(7.1) }
  const calls = []
  const real = globalThis.fetch
  globalThis.fetch = async (url) => {
    calls.push(String(url))
    return { ok: true, status: 200, json: async () => ({ generatedAt: Date.now() - 4 * 60000, quotes }) }
  }
  const central = await fetchQuotes(undefined, { base: 'https://x/data' })
  assert.equal(central.via, 'central')
  assert.equal(calls.length, 1)
  assert.match(calls[0], /^https:\/\/x\/data\/quotes\.json\?t=\d+$/)
  assert.equal(central.results.EUR.quote.bid, 6.1)
  assert.ok(Math.abs(central.collectedAt - (Date.now() - 4 * 60000)) < 2000)
  globalThis.fetch = real
})

test('resumo: tiles de juros e manchetes mais recentes', async () => {
  const { rateTiles, topHeadlines } = await import('../src/snapshot.js')
  const { periodChange } = await import('../src/stats.js')
  const br = { compare: [{ id: 'hoje', date: '2026-10-08' }, { id: 'd1', date: '2026-10-07' }], curves: { '2026-10-08': [[252, 13.8]], '2026-10-07': [[252, 13.85]] } }
  const us = { compare: [{ id: 'hoje', date: '2026-10-08' }], curves: { '2026-10-08': [[10, 4.2, '10 Yr']] } }
  const t = rateTiles({ selic: [[0, 15]], cdi: [[Date.UTC(2026, 9, 8, 12), 14.9]], sofr: [[Date.UTC(2026, 9, 8, 12), 3.87]] }, { br, us })
  assert.deepEqual(t.map((x) => x.key), ['selic', 'cdi', 'sofr', 'di1', 'ust10'])
  assert.ok(Math.abs(t.find((x) => x.key === 'di1').delta - -0.05) < 1e-9)
  assert.equal(t.find((x) => x.key === 'ust10').delta, null)
  assert.deepEqual(rateTiles(null, null), [])
  const h = topHeadlines({ news: { USD: [{ title: 'a', t: 1 }, { title: 'b', t: 5 }], EUR: [], JPY: [{ title: 'c', t: 2 }] } })
  assert.deepEqual(h.map((x) => `${x.code}:${x.title}`), ['USD:b', 'JPY:c'])
  assert.ok(periodChange([{ bid: 5 }, { bid: 5.5 }]) > 9.9)
  assert.equal(periodChange([{ bid: 5 }]), null)
})

import { forwardCurve, horizonTable } from '../src/cdiFuturo.js'
test('CDI futuro: taxa a termo da curva DI', () => {
  // curva plana em 10% => a termo também 10%
  for (const f of forwardCurve([[63, 10], [126, 10], [252, 10]])) assert.ok(Math.abs(f.rate - 10) < 1e-9)
  // 1a a 10% e 2a a 11% => a termo 1a-2a = 1,11^2/1,10 − 1 = 12,0091%
  const [f] = forwardCurve([[252, 10], [504, 11]])
  assert.ok(Math.abs(f.rate - (1.11 ** 2 / 1.1 - 1) * 100) < 1e-9)
  const t = horizonTable([[63, 14], [252, 14.5], [504, 14.8]])
  assert.deepEqual(t.map((r) => r.label), ['3 meses', '1 ano', '2 anos'])
  assert.equal(t[0].fwd, null)
})

import { busDays, forwardBetween, forwardSeries, growthAt } from '../src/cdiFuturo.js'
test('CDI futuro por datas: dias úteis, interpolação e taxa a termo', () => {
  assert.equal(busDays('2026-10-09', '2026-10-16'), 5) // sex -> sex seguinte: seg a sex
  assert.equal(busDays('2026-10-16', '2026-10-09'), 0)
  const flat = [[63, 10], [252, 10], [504, 10]]
  assert.ok(Math.abs(forwardBetween(flat, 30, 400) - 10) < 1e-9)
  assert.ok(Math.abs(forwardBetween(flat, 0, 252) - 10) < 1e-9)
  const pts = [[252, 10], [504, 11]]
  assert.ok(Math.abs(forwardBetween(pts, 252, 504) - (1.11 ** 2 / 1.1 - 1) * 100) < 1e-6)
  assert.equal(growthAt(pts, 600), null) // além do último vértice
  assert.ok(forwardSeries(pts, 10, 500).length >= 2)
})

import { buildFeed } from '../src/feed.js'
test('fila de notícias: une a mesma matéria em vários tickers, ordena por horário e filtra', () => {
  const news = {
    USD: [{ link: 'a', title: 'A', t: 100 }, { link: 'b', title: 'B', t: 300 }],
    EUR: [{ link: 'a', title: 'A', t: 100 }, { link: 'c', title: 'C', t: 200 }],
  }
  const all = buildFeed(news)
  assert.deepEqual(all.map((n) => n.link), ['b', 'c', 'a'])
  assert.deepEqual(all[2].codes, ['USD', 'EUR'])
  assert.deepEqual(buildFeed(news, 'EUR').map((n) => n.link), ['c', 'a'])
  assert.equal(buildFeed(news, 'ALL', 1).length, 1)
  assert.deepEqual(buildFeed(undefined), [])
})

import { CURRENCIES, seriesName } from '../src/useQuotes.js'
test('rótulo do yuan acompanha a série realmente usada', () => {
  const cnh = CURRENCIES.find((c) => c.code === 'CNH')
  assert.match(seriesName(cnh, 'CNY'), /onshore \(CNY\)/)
  assert.match(seriesName(cnh, 'CNH'), /offshore/)
  assert.match(seriesName(cnh, undefined), /onshore/)
  assert.equal(seriesName(CURRENCIES[0], 'USD'), CURRENCIES[0].name)
})

import { GLOSSARY } from '../src/glossary.js'
import { readFileSync } from 'node:fs'
test('glossário: toda explicação tem as quatro partes e todo id usado no app existe', () => {
  for (const [id, g] of Object.entries(GLOSSARY)) {
    for (const k of ['t', 'a', 'b', 'c']) assert.ok(g[k] && g[k].length > (k === 't' ? 2 : 10), `${id}.${k}`)
    assert.ok(g.a.length + g.b.length + g.c.length < 520, `${id} longo demais para um popover`)
  }
  const used = new Set()
  for (const f of ['App', 'Resumo', 'Macro', 'Sofr', 'Curves', 'CdiFuturo', 'HistoryChart', 'ParityChart', 'Projecoes', 'Agenda', 'News', 'Calculadora', 'Finimp']) {
    for (const m of readFileSync(new URL(`../src/${f}.jsx`, import.meta.url), 'utf8').matchAll(/<Explain id="(\w+)"/g)) used.add(m[1])
  }
  for (const id of used) assert.ok(GLOSSARY[id], `id sem texto: ${id}`)
  for (const id of ['selic', 'cdi', 'sofr', 'di1', 'ust10']) assert.ok(GLOSSARY[id]) // quadros de juros do Resumo usam r.key
})

import { compare, parseNum } from '../src/calc.js'
test('calculadora: parse de números e comparação com a curva DI', () => {
  assert.equal(parseNum('1.000.000,50'), 1000000.5)
  assert.equal(parseNum('14,5'), 14.5)
  assert.equal(parseNum('1.000'), 1000)
  assert.ok(Number.isNaN(parseNum('abc')))
  const flat = [[63, 10], [252, 10], [504, 10]]
  // curva plana em 10%: 100% do CDI = DI; pré 10% = DI; 110% do CDI rende mais; CDI + 1% rende mais
  const base = { pts: flat, d: 252, value: 1000 }
  const di = compare({ ...base, mode: 'cdi', rate: 100 })
  assert.ok(Math.abs(di.diff) < 1e-6 && Math.abs(di.op.fv - 1100) < 1e-6)
  assert.ok(Math.abs(compare({ ...base, mode: 'pre', rate: 10 }).diff) < 1e-6)
  const c110 = compare({ ...base, mode: 'cdi', rate: 110 })
  assert.ok(c110.diff > 0 && c110.good && Math.abs(c110.cdiEquivalent - 110.532) < 0.01)
  assert.ok(compare({ ...base, mode: 'spread', rate: 1 }).diffBps > 99)
  assert.equal(compare({ ...base, mode: 'cdi', rate: 110, side: 'borrow' }).good, false) // paga mais que o DI
  assert.match(compare({ pts: flat, d: 900, value: 1000, mode: 'pre', rate: 10 }).error, /fora da curva/)
  assert.match(compare({ ...base, value: NaN, mode: 'pre', rate: 10 }).error, /Preencha/)
})

import { daysBetween, simulate, toTsv } from '../src/finimp.js'
const FI = { currency: 'USD', disb: [{ date: '2026-01-15', amount: 1000000 }], structure: 'bullet', maturity: '2026-07-14', rate: 6, rule: 'prop', dayCount: 'ACT/360' }
test('FINIMP: bloqueia sem convenção/regra/taxa e lista só o que falta; ausente não vira zero', () => {
  const r = simulate({ ...FI, dayCount: '', rule: '', rate: NaN })
  assert.equal(r.ok, false)
  assert.equal(r.missing.length, 3)
  assert.ok(r.missing.some((m) => /convenção/.test(m)) && r.missing.some((m) => /regra/.test(m)) && r.missing.some((m) => /taxa/.test(m)))
  assert.equal(simulate({ ...FI, rate: 0 }).ok, true) // zero informado é diferente de ausente
})
test('FINIMP: taxa zero, proporcional ACT/360 e ACT/365F, e bullet sem capitalização', () => {
  assert.equal(simulate({ ...FI, rate: 0 }).totals.interest, 0)
  const d = daysBetween('2026-01-15', '2026-07-14') // 180 dias
  assert.equal(d, 180)
  const a = simulate(FI)
  assert.ok(Math.abs(a.totals.interest - 1e6 * 0.06 * (180 / 360)) < 1e-6) // 30.000
  const b = simulate({ ...FI, dayCount: 'ACT/365F' })
  assert.ok(Math.abs(b.totals.interest - 1e6 * 0.06 * (180 / 365)) < 1e-6)
  assert.ok(a.totals.interest > b.totals.interest)
  assert.equal(a.rows.length, 2) // desembolso e vencimento: juros pagos só no vencimento, sem capitalizar
  assert.equal(a.rows[1].amortization, 1e6)
  assert.ok(a.checks.every((c) => c.ok))
})
test('FINIMP: composta × proporcional e ano bissexto (ACT/365F usa 365 mesmo em 366 dias)', () => {
  const c = simulate({ ...FI, rule: 'comp' })
  assert.ok(Math.abs(c.totals.interest - 1e6 * (1.06 ** (180 / 360) - 1)) < 1e-6)
  assert.ok(c.totals.interest < simulate(FI).totals.interest + 1) // composta em fração < 1 é menor que a linear
  const leap = simulate({ ...FI, disb: [{ date: '2024-01-01', amount: 1000 }], maturity: '2025-01-01', dayCount: 'ACT/365F' })
  assert.equal(daysBetween('2024-01-01', '2025-01-01'), 366)
  assert.ok(Math.abs(leap.totals.interest - 1000 * 0.06 * (366 / 365)) < 1e-9)
})
test('FINIMP: juros periódicos, períodos irregulares e composta aditiva entre trechos', () => {
  const one = simulate({ ...FI, rule: 'comp' })
  // juros pagos em data intermediária: a composta de cada período parte do início do período, sem capitalizar
  const per = simulate({ ...FI, rule: 'comp', structure: 'periodic', interestDates: ['2026-04-15'] })
  assert.equal(per.rows.filter((r) => r.interestPaid > 0).length, 2)
  const d1 = daysBetween('2026-01-15', '2026-04-15')
  const d2 = daysBetween('2026-04-15', '2026-07-14')
  assert.ok(Math.abs(per.totals.interest - 1e6 * ((1.06 ** (d1 / 360) - 1) + (1.06 ** (d2 / 360) - 1))) < 1e-6)
  assert.ok(per.checks.every((c) => c.ok) && one.checks.every((c) => c.ok))
  // desembolso no meio do período: soma dos trechos (composta aditiva) = fórmula fechada para saldo constante
  const split = simulate({ ...FI, rule: 'comp', disb: [{ date: '2026-01-15', amount: 500000 }, { date: '2026-03-01', amount: 500000 }] })
  const f = (a, b) => daysBetween(a, b) / 360
  const exp = 500000 * (1.06 ** f('2026-01-15', '2026-07-14') - 1) + 500000 * (1.06 ** f('2026-01-15', '2026-07-14') - 1.06 ** f('2026-01-15', '2026-03-01'))
  assert.ok(Math.abs(split.totals.interest - exp) < 1e-6)
})
test('FINIMP: amortização parcial por valor e por percentual, soma e saldo validados', () => {
  const base = { ...FI, structure: 'amort', rule: 'prop' }
  const ok = simulate({ ...base, amort: [{ date: '2026-04-15', kind: 'pct', amount: 40 }, { date: '2026-07-14', kind: 'value', amount: 600000 }] })
  assert.equal(ok.ok, true)
  assert.equal(ok.maturity, '2026-07-14')
  const first = ok.rows.find((r) => r.date === '2026-04-15')
  assert.equal(first.amortization, 400000)
  const j1 = 1e6 * 0.06 * (daysBetween('2026-01-15', '2026-04-15') / 360)
  const j2 = 600000 * 0.06 * (daysBetween('2026-04-15', '2026-07-14') / 360)
  assert.ok(Math.abs(ok.totals.interest - (j1 + j2)) < 1e-6)
  assert.ok(ok.checks.every((c) => c.ok))
  assert.match(simulate({ ...base, amort: [{ date: '2026-07-14', kind: 'value', amount: 900000 }] }).errors[0], /soma das amortizações/)
  assert.match(simulate({ ...base, amort: [{ date: '2026-04-15', kind: 'value', amount: 1000000 }, { date: '2026-07-14', kind: 'value', amount: 1 }] }).errors.join(' '), /soma das amortizações|Saldo negativo/)
})
test('FINIMP: arredondamento explícito por parcela, JPY sem casas e cópia para Excel', () => {
  const r = simulate({ ...FI, disb: [{ date: '2026-01-15', amount: 123456.78 }], round: true })
  assert.equal(r.rows[1].interestPaid, Math.round(r.rows[1].interestPaid * 100) / 100)
  const jpy = simulate({ ...FI, currency: 'JPY', disb: [{ date: '2026-01-15', amount: 100000000 }], round: true })
  assert.equal(jpy.dec, 0)
  assert.equal(jpy.rows[1].interestPaid, Math.round(jpy.rows[1].interestPaid))
  assert.match(toTsv(r), /^Data\tSaldo inicial/)
})
test('FINIMP: validações de datas', () => {
  assert.match(simulate({ ...FI, maturity: '2026-01-15' }).errors.join(' '), /posterior/)
  assert.match(simulate({ ...FI, structure: 'periodic', interestDates: ['2027-01-01'] }).errors.join(' '), /fora do prazo/)
})

import { rateFactor } from '../src/calc.js'
test('calculadora: taxa ao mês, no período e % do CDI do período', () => {
  const flat = [[63, 10], [252, 10], [504, 10]]
  const base = { pts: flat, d: 252, value: 1000, mode: 'pre' }
  // 1% ao mês composto por 12 meses (252 d.u.) = 12,6825% no período e a.a.
  const m = compare({ ...base, unit: 'am', rate: 1 })
  assert.ok(Math.abs(m.op.period - (1.01 ** 12 - 1) * 100) < 1e-9)
  assert.ok(Math.abs(m.op.aa - m.op.period) < 1e-9)
  assert.ok(Math.abs(m.op.am - 1) < 1e-9)
  // mesma taxa expressa ao ano ou no período dá o mesmo resultado
  const a = compare({ ...base, unit: 'aa', rate: (1.01 ** 12 - 1) * 100 })
  const p = compare({ ...base, unit: 'periodo', rate: (1.01 ** 12 - 1) * 100 })
  assert.ok(Math.abs(a.op.fv - m.op.fv) < 1e-6 && Math.abs(p.op.fv - m.op.fv) < 1e-6)
  // prazo de 126 d.u. (meio ano): 1% a.m. rende (1,01^6 − 1); CDI do período = 1,10^0,5 − 1
  const h = compare({ ...base, d: 126, unit: 'am', rate: 1 })
  assert.ok(Math.abs(h.op.period - (1.01 ** 6 - 1) * 100) < 1e-9)
  assert.ok(Math.abs(h.cdiEquivalent - ((1.01 ** 6 - 1) / (1.1 ** 0.5 - 1)) * 100) < 1e-6)
  assert.ok(Math.abs(rateFactor(10, 'am', 21) - 1.1) < 1e-12)
  // % do CDI composto dia a dia: 100% = DI exato
  assert.ok(Math.abs(compare({ ...base, mode: 'cdi', rate: 100 }).diff) < 1e-6)
})
