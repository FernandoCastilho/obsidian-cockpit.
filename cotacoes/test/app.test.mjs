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
  const q = (b) => ({ bid: String(b), ask: String(b + 0.01), high: String(b + 0.1), low: String(Math.max(0.001, b - 0.1)), pctChange: '0.5', timestamp: String(now) })
  const calls = []
  const real = globalThis.fetch
  globalThis.fetch = async (url) => {
    calls.push(String(url))
    return { ok: true, status: 200, json: async () => ({ USDBRL: q(5.3), EURBRL: q(6.1), JPYBRL: q(0.035), USDCNH: q(7.1) }) }
  }
  const { results: r } = await fetchQuotes()
  globalThis.fetch = real
  assert.equal(calls.length, 1)
  assert.match(calls[0], /USD-BRL,EUR-BRL,JPY-BRL,USD-CNH/)
  assert.equal(r.USD.quote.bid, 5.3)
  assert.equal(r.CNH.quote.source, 'CNH')
  assert.ok(Math.abs(r.CNH.quote.bid - 5.3 / 7.11) < 1e-9)
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
  const quotes = { USDBRL: q(5.3), EURBRL: q(6.1), JPYBRL: q(0.035), USDCNH: q(7.1) }
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
  const v = rateTiles({ selic: [[0, 15.25], [1, 15]], cdi: [[0, 14.9], [1, 14.9]], sofr: [[0, 3.85], [1, 3.87]] }, null)
  assert.ok(Math.abs(v.find((x) => x.key === 'selic').delta - -0.25) < 1e-9) // variação sobre a publicação anterior
  assert.equal(v.find((x) => x.key === 'cdi').delta, 0)
  assert.ok(Math.abs(v.find((x) => x.key === 'sofr').delta - 0.02) < 1e-9)
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
  assert.match(seriesName(cnh, 'CNH'), /offshore/)
  assert.match(seriesName(cnh, undefined), /offshore/)
  assert.equal(seriesName(CURRENCIES[0], 'USD'), CURRENCIES[0].name)
})

import { GLOSSARY } from '../src/glossary.js'
import { readFileSync } from 'node:fs'
test('glossário: toda explicação tem as quatro partes e todo id usado no app existe', () => {
  for (const [id, g] of Object.entries(GLOSSARY)) {
    for (const k of ['t', 'a', 'b', 'c']) assert.ok(g[k] && g[k].length > (k === 't' ? 2 : 10), `${id}.${k}`)
    assert.ok(g.a.length + g.b.length + g.c.length < 520, `${id} longo demais para um popover`)
    if (g.d) assert.ok(g.d.length > 80 && g.d.length < 420, `${id}.d fora do tamanho`)
  }
  const used = new Set()
  for (const f of ['App', 'Resumo', 'Macro', 'Sofr', 'Curves', 'CdiFuturo', 'HistoryChart', 'ParityChart', 'Projecoes', 'Agenda', 'News']) {
    for (const m of readFileSync(new URL(`../src/${f}.jsx`, import.meta.url), 'utf8').matchAll(/<Explain id="(\w+)"/g)) used.add(m[1])
  }
  for (const id of used) assert.ok(GLOSSARY[id], `id sem texto: ${id}`)
  for (const id of ['selic', 'cdi', 'sofr', 'di1', 'ust10']) assert.ok(GLOSSARY[id]) // quadros de juros do Resumo usam r.key
})

import { addDays as hAdd, busDaysIn, buildCn, cnMissingYears, easter, holidayMap, isBusinessDay, nextBusinessDay, nthWeekday, offReasons, upcomingHolidays } from '../src/holidays.js'
test('feriados: Páscoa, Brasil (Carnaval, Sexta Santa, Corpus Christi) e dias úteis do DI', () => {
  assert.equal(easter(2026), '2026-04-05')
  assert.equal(easter(2027), '2027-03-28')
  const br = holidayMap('BR', 2026)
  assert.equal(br.get('2026-02-16'), 'Carnaval (segunda)')
  assert.ok(br.has('2026-04-03') && br.has('2026-06-04') && br.has('2026-11-20'))
  assert.ok(!holidayMap('BR', 2023).has('2023-11-20')) // Consciência Negra só é nacional desde 2024
  // 04/04/2026 (sábado) a 13/04/2026: segunda 6, 7, 8, 9, 10 e 13 = 6 dias úteis; 21/04 é Tiradentes
  assert.equal(busDaysIn('2026-04-03', '2026-04-13', ['BR']), 6)
  assert.equal(busDaysIn('2026-04-20', '2026-04-22', ['BR']), 1)
})
test('feriados: Nova York (sábado não compensado, domingo vira segunda) e Thanksgiving', () => {
  const ny = holidayMap('NY', 2026)
  assert.ok(!ny.has('2026-07-03') && !ny.has('2026-07-04')) // 4/jul/2026 é sábado: a Fed abre na sexta
  assert.equal(holidayMap('NY', 2027).get('2027-07-05'), 'Independência dos EUA (observado)') // 4/jul/2027 é domingo
  assert.equal(ny.get('2026-11-26'), 'Thanksgiving')
  assert.equal(nthWeekday(2026, 5, 1, -1), '2026-05-25')
  assert.ok(ny.has('2026-06-19') && ny.has('2026-12-25'))
})
test('feriados: Londres (Boxing Day compensado) e Japão (Semana Dourada, Silver Week, domingo)', () => {
  const uk = holidayMap('UK', 2026)
  assert.ok(uk.has('2026-12-25') && uk.has('2026-12-28') && !uk.has('2026-12-26')) // 26/12/2026 é sábado
  assert.ok(uk.has('2026-05-04') && uk.has('2026-05-25') && uk.has('2026-08-31'))
  const jp = holidayMap('JP', 2026)
  assert.ok(jp.has('2026-03-20') && jp.has('2026-09-23')) // equinócios
  assert.equal(jp.get('2026-09-22'), 'Feriado dos cidadãos') // entre 21/09 e 23/09
  assert.ok(jp.has('2026-05-06')) // 3/mai/2026 é domingo: compensado em 6/mai
  assert.ok(jp.has('2026-12-31') && jp.has('2026-01-02'))
})
test('feriados: China usa dados oficiais, com dia de compensação útil e aviso de ano sem dado', () => {
  const ctx = {
    cn: buildCn({ years: { 2026: { days: [
      { name: '春节', nameEn: 'Spring Festival', date: '2026-02-17', isOffDay: true },
      { name: '春节', nameEn: 'Spring Festival', date: '2026-02-14', isOffDay: false },
    ] } } }),
  }
  assert.equal(isBusinessDay('2026-02-17', 'CN', ctx), false) // terça: feriado
  assert.equal(isBusinessDay('2026-02-14', 'CN', ctx), true) // sábado de compensação
  assert.equal(isBusinessDay('2026-02-14', 'BR', ctx), false) // no Brasil continua fim de semana
  assert.equal(offReasons('2026-02-17', ['BR', 'CN'], ctx).length, 2) // Carnaval no Brasil e Festival da Primavera na China
  assert.deepEqual(offReasons('2026-02-14', ['BR', 'CN'], ctx).map((r) => r.cal), ['BR']) // sábado de compensação: só o Brasil fecha
  assert.deepEqual(cnMissingYears([2026, 2027], ctx), [2027])
  assert.equal(holidayMap('CN', 2027, ctx).size, 0)
})
test('feriados: próximo dia útil comum às praças e lista de próximos feriados', () => {
  const ctx = { cn: {} }
  // Sexta-feira Santa 3/4/2026 fecha Brasil e Londres; sábado, domingo e 6/4 (Páscoa) fecham Londres: próximo comum é 7/4
  assert.equal(nextBusinessDay('2026-04-03', ['BR', 'UK'], ctx), '2026-04-07')
  const up = upcomingHolidays('2026-11-23', 7, ['NY', 'BR'], ctx)
  assert.deepEqual(up.map((u) => `${u.date} ${u.cal}`), ['2026-11-26 NY'])
  assert.equal(hAdd('2026-12-31', 1), '2027-01-01')
})

test('cotações: CNH ganha variação absoluta pelos fechamentos anteriores das duas pontas; sem varBid de uma ponta fica ausente', async () => {
  const { fetchQuotes } = await import('../src/useQuotes.js?cnh-delta')
  const now = Math.floor(Date.now() / 1000)
  const q = (b, v) => ({ bid: String(b), ask: String(b), high: String(b + 0.1), low: String(b - 0.1), pctChange: '0.5', timestamp: String(now), ...(v === undefined ? {} : { varBid: String(v) }) })
  const real = globalThis.fetch
  const run = async (cnhVar) => {
    globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ USDBRL: q(5.3304, -0.021), EURBRL: q(6.1, 0), JPYBRL: q(0.035, 0), USDCNH: q(6.66367, cnhVar) }) })
    try { return (await fetchQuotes(undefined, { direct: true })).results.CNH.quote } finally { globalThis.fetch = real }
  }
  const withLegs = await run(-0.00151)
  assert.ok(Math.abs(withLegs.delta - (5.3304 / 6.66367 - (5.3304 + 0.021) / (6.66367 + 0.00151))) < 1e-12)
  assert.ok(withLegs.delta < 0)
  assert.equal((await run(undefined)).delta, null)
})

import { policyRows as _policyRows } from '../src/policyRates.js'
import { estrRow as _estrRow } from '../src/estr.js'
import { snapshotRows as _snapshotRows } from '../src/ratesSnapshot.js'
test('Juros: toda linha do quadro e todo indexador tem tooltip com texto no glossário', () => {
  const periods = [{ id: 'day', date: '2026-10-29' }]
  const rows = [..._snapshotRows({ macro: {}, periods }), ..._policyRows({ series: {} }, periods), _estrRow(null, periods)]
  assert.deepEqual(rows.map((r) => r.id), ['SELIC', 'CDI', 'SOFR', 'FED', 'ECB', 'BOJ', 'ESTR'])
  for (const r of rows) assert.ok(r.help && GLOSSARY[r.help], `linha ${r.id} sem tooltip`)
  for (const k of ['tr', 'tbf', 'tlp']) assert.ok(GLOSSARY[k], `indexador ${k} sem tooltip`)
  assert.match(readFileSync(new URL('../src/Indexadores.jsx', import.meta.url), 'utf8'), /<Explain id=\{r\.key\.toLowerCase\(\)\}/)
  assert.match(readFileSync(new URL('../src/Macro.jsx', import.meta.url), 'utf8'), /help="estr"/)
})

test('glossário: todo indicador de Juros traz "Para dominar" (o que mais um especialista precisa saber)', () => {
  const juros = ['selic', 'cdi', 'sofr', 'sofrMedia', 'di1', 'ust10', 'curvaDi', 'cupom', 'fedFaixa', 'estr', 'bceDeposito', 'bojMeta', 'tr', 'tbf', 'tlp', 'curvaEuro', 'treasuries', 'cdiFuturo', 'focus']
  for (const id of juros) assert.ok(GLOSSARY[id]?.d, `${id} sem "Para dominar"`)
})
