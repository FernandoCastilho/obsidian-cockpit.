// Cenários › Outros (IPCA e dívida bruta) e Frete marítimo: tabela no formato do Mercado; clicar abre o gráfico em tela cheia com filtros no topo.
const { chromium } = require('playwright'), assert = require('node:assert/strict')
const points = []
let index = 100
for (let y = 2018; y <= 2026; y++) for (let m = 1; m <= 12; m++) {
  if (y === 2026 && m > 9) break
  const mom = 0.2 + 0.5 * Math.abs(Math.sin(y * 12 + m)); index *= 1 + mom / 100
  points.push({ period: `${y}-${String(m).padStart(2, '0')}`, mom: +mom.toFixed(2), ytd: +(mom * m).toFixed(2), y12: +(mom * 12).toFixed(2), index: +index.toFixed(2) })
}
const ipca = { schemaVersion: 1, generatedAt: new Date().toISOString(), series: { id: 'ipca', sourceName: 'IBGE · SIDRA (fixture de teste)', sourceUrl: 'https://sidra.ibge.gov.br/tabela/1737', checkedAt: new Date().toISOString(), stale: false, points } }
const divida = { schemaVersion: 1, generatedAt: new Date().toISOString(), series: { id: 'divida-bruta', sourceName: 'Banco Central (fixture de teste)', sourceUrl: 'https://www.bcb.gov.br/estatisticas/historicoestatisticassetorpublico', checkedAt: new Date().toISOString(), stale: false,
  points: Array.from({ length: 30 }, (_, i) => ({ period: `${2024 + Math.floor((i + 3) / 12)}-${String(((i + 3) % 12) + 1).padStart(2, '0')}`, pib: +(72 + i * 0.2).toFixed(1), brl: Math.round(8200000 + i * 60000) })) } }
// últimos dois meses com a diferença de 0,06 p.p. que uma casa decimal esconderia (82,9% e 82,9%)
divida.series.points.at(-2).pib = 82.87; divida.series.points.at(-1).pib = 82.93
const grp = (id, name, a, b) => ({ id, name, byPeriod: { '2026-08': a, '2026-09': b } })
const ipcaGroups = { schemaVersion: 1, generatedAt: new Date().toISOString(), series: { id: 'ipca-groups', sourceName: 'IBGE · SIDRA (fixture de teste)', sourceUrl: 'https://sidra.ibge.gov.br/tabela/7060', checkedAt: new Date().toISOString(), stale: false, periods: ['2026-08', '2026-09'], groups: [
  grp(7169, 'Índice geral', { mom: 0.2, weight: 100, ytd: 3, y12: 4.5 }, { mom: 0.5, weight: 100, ytd: 3.5, y12: 4.7 }),
  grp(7170, 'Alimentação e bebidas', { mom: 0.2, weight: 21 }, { mom: 1.0, weight: 21.5, y12: 6 }),
  grp(7625, 'Transportes', { mom: 0.1, weight: 20 }, { mom: -0.5, weight: 20, y12: 3 })] } }
const jp = { schemaVersion: 1, generatedAt: new Date().toISOString(), series: { id: 'freight-jp-sppi', unit: 'pontos · média de 2020 = 100', frequency: 'monthly', sourceName: 'Banco do Japão (fixture de teste)', sourceUrl: 'https://www.boj.or.jp/en/statistics/pi/sppi_2020/index.htm', checkedAt: new Date().toISOString(), stale: false, releaseDate: null,
  points: Array.from({ length: 40 }, (_, i) => ({ period: `${2023 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`, value: 100 + i * 1.5 })) } }
const monthly = (v0) => Array.from({ length: 60 }, (_, i) => { const d = new Date(Date.UTC(2026, 8, 15)); d.setUTCMonth(d.getUTCMonth() - (59 - i)); return { period: d.toISOString().slice(0, 7), value: +(v0 * (1 + 0.1 * Math.sin(i / 8) + i / 600)).toFixed(2) } })
const commodity = (id, label, unit, value, history) => ({ id, label, unit, nature: 'média mensal', sourceName: 'Banco Mundial • Pink Sheet (fixture)', sourceUrl: 'https://www.worldbank.org/en/research/commodity-markets', benchmark: 'teste', value, period: '2026-09', releaseDate: '2026-10-02', checkedAt: '2026-10-05T00:00:00Z', stale: false, error: null, previousValue: null, previousPeriod: null, variationPct: null, variationBasis: 'mês anterior', history })
const commodities = { schemaVersion: 1, generatedAt: new Date().toISOString(), commodities: [commodity('gold', 'Ouro', 'USD/onça troy', 4319, monthly(4000)), commodity('iron-ore', 'Minério de ferro', 'USD/tonelada seca', 97.7, monthly(90)), commodity('soybeans', 'Soja', 'USD/tonelada', 524, []), commodity('corn', 'Milho', 'USD/tonelada', 239.6, monthly(230))] }
;(async () => {
  const b = await chromium.launch({ channel: process.env.SMOKE_CHANNEL || 'msedge', headless: true }), base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5216'
  try {
    // aviso de entrada: aparece a cada abertura do app, fecha com o botão e não volta ao trocar de aba
    for (const width of [390, 1280]) {
      const ctx = await b.newContext({ viewport: { width, height: 800 }, serviceWorkers: 'block' })
      await ctx.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }))
      const p = await ctx.newPage()
      await p.goto(base + '/#resumo')
      const aviso = p.getByRole('dialog', { name: 'Aviso' }); await aviso.waitFor()
      assert.match(await aviso.innerText(), /aplicativo educacional[\s\S]*informação ilustrativa[\s\S]*Não representa compromisso nem informações atualizadas on-line/)
      const box = await aviso.boundingBox(); assert.ok(box.x >= 0 && box.x + box.width <= width, 'aviso cabe na largura')
      await aviso.getByRole('button', { name: 'Entendi' }).click(); await aviso.waitFor({ state: 'hidden' })
      await p.goto(base + '/#juros'); assert.equal(await p.getByRole('dialog', { name: 'Aviso' }).count(), 0, 'não reaparece ao trocar de aba')
      await p.reload(); await p.getByRole('dialog', { name: 'Aviso' }).waitFor()
      await p.keyboard.press('Escape'); await p.getByRole('dialog', { name: 'Aviso' }).waitFor({ state: 'hidden' })
      await ctx.close()
    }
    // Juros: sem Reino Unido e com a bandeira de cada país nas linhas e nos títulos dos gráficos
    for (const width of [390, 1280]) {
      const p = await b.newPage({ viewport: { width, height: 900 }, serviceWorkers: 'block' })
      const hoje = Date.now(), dia = 864e5
      const estr = { schemaVersion: 1, generatedAt: new Date().toISOString(), series: { id: 'estr', sourceName: 'BCE (fixture de teste)', sourceUrl: 'https://www.ecb.europa.eu/', checkedAt: new Date().toISOString(), stale: false,
        points: Array.from({ length: 400 }, (_, i) => ({ date: new Date(hoje - (400 - i) * dia).toISOString().slice(0, 10), value: +(1.9 + i * 0.0005).toFixed(3) })) } }
      await p.route('**/estr.json*', (r) => r.fulfill({ json: estr }))
      // macro simulado: no CI não há arquivos de dados reais (eles são gerados no deploy), então os gráficos de Juros precisam deles
      const dias = Array.from({ length: 400 }, (_, i) => { const d = new Date(hoje - (400 - i) * dia); d.setUTCHours(12, 0, 0, 0); return d.getTime() })
      const macro = { generatedAt: hoje, focus: null, ptax: {}, ptaxHist: {}, sofrAvg: dias.map((t) => [t, 3.2, 3.3, 3.4]),
        cdi: dias.map((t, i) => [t, +(14.1 + (i % 7) * 0.01).toFixed(2)]), selic: [[dias[0], 14.5], [dias[200], 14.25]], sofr: dias.map((t, i) => [t, +(4.3 - i * 0.003).toFixed(2), 4.2, 4.4]) }
      await p.route('**/macro.json*', (r) => r.fulfill({ json: macro }))
      await p.goto(base + '/#juros'); await p.locator('.executive-rates__table tbody tr').first().waitFor()
      const linhas = p.locator('.executive-rates__table tbody tr .executive-rates__name')
      const n = await linhas.count()
      assert.ok(n >= 7, 'Selic, CDI, SOFR, Fed, €STR, BCE e BoJ')
      await p.locator('.executive-rates__table tbody tr', { hasText: '€STR' }).filter({ hasText: /\d,\d{3}%/ }).first().waitFor() // o arquivo simulado chega depois da primeira renderização
      assert.match(await p.locator('.executive-rates__table tbody tr', { hasText: '€STR' }).first().innerText(), /Área do euro · €STR overnight[\s\S]*\d,\d{3}%/)
      assert.equal(await p.locator('.executive-rates__table tbody tr .executive-rates__name .flag').count(), n, 'bandeira em cada linha')
      const corpo = await p.locator('main').innerText()
      assert.doesNotMatch(corpo, /Reino Unido|Bank Rate|Bank of England|BoE/, 'sem Reino Unido em Juros')
      assert.match(await p.locator('.executive-rates__table tbody').innerText(), /Área do euro · BCE[\s\S]*Japão/)
      await p.locator('.chart h3', { hasText: 'Área do euro · €STR' }).first().waitFor()
      await p.locator('.chart h3', { hasText: 'Brasil · CDI' }).first().waitFor()
      assert.ok(await p.locator('.chart h3 .flag').count() >= 4, 'bandeira nos títulos dos gráficos (CDI, Selic, SOFR e €STR)')
      await p.close()
    }
    // governança dos dados em Configurações: tabela por fonte, regras e nenhuma rolagem lateral da página
    for (const width of [390, 1280]) {
      const p = await b.newPage({ viewport: { width, height: 900 }, serviceWorkers: 'block' })
      await p.goto(base + '/#config')
      const gov = p.locator('.desk-panel', { has: p.getByRole('heading', { name: 'Governança dos dados' }) }); await gov.waitFor()
      assert.equal(await gov.locator('.config-gov tbody tr').count(), 13, 'uma linha por fonte')
      const txt = await gov.innerText()
      assert.match(txt, /A cada 5 min no pregão/i); assert.match(txt, /Em resumo[\s\S]*Só o câmbio é coletado de 5 em 5 minutos[\s\S]*Coletar não é o mesmo que o número mudar/i); assert.match(txt, /Relê os arquivos publicados a cada 1 min/); assert.match(txt, /30 por dia/); assert.match(txt, /Atrasado após/i)
      assert.match(await gov.locator('.config-gov tbody tr', { hasText: 'Dívida bruta' }).innerText(), /72 h/)
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `sem rolagem lateral a ${width}px`)
      if (width < 700) assert.equal(await p.evaluate(() => { const sc = document.querySelector('.config-gov').closest('.config-scroll'); return sc.scrollWidth > sc.clientWidth + 1 }), false, 'no celular a tabela vira cartões, sem rolagem interna')
      await p.close()
    }
    // minigráficos de IPCA, Selic e CDI nos cards do Mercado: só com dados observados, nada inventado
    {
      const day = 864e5, now = Date.now(), noon = (t) => { const d = new Date(t); d.setUTCHours(12, 0, 0, 0); return d.getTime() }
      const cdi = [], selic = [[noon(now - 700 * day), 14.9], [noon(now - 200 * day), 14.5], [noon(now - 2 * day), 14.5]]
      for (let t = now - 420 * day; t <= now - day; t += day) { const w = new Date(t).getUTCDay(); if (w && w < 6) cdi.push([noon(t), t < now - 200 * day ? 14.9 : 14.4]) }
      const macroOk = { generatedAt: now, cdi, selic, sofr: [], sofrAvg: [], ptax: {}, ptaxHist: {}, focus: null }
      for (const [label, macro, expected] of [['com dados', macroOk, true], ['sem dados', { ...macroOk, cdi: [], selic: [[noon(now - 2 * day), 14.5]] }, false]]) {
        const p = await b.newPage({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' })
        await p.route('**/ipca.json*', (r) => r.fulfill({ json: ipca }))
        await p.route('**/macro.json*', (r) => r.fulfill({ json: macro }))
        await p.goto(base + '/#resumo')
        const cards = p.locator('.kpis .kpi'); await cards.first().waitFor()
        const spark = (name) => cards.filter({ hasText: name }).first().locator('.kpi-spark[role="img"]')
        for (const name of ['Selic', 'CDI']) assert.equal(await spark(name).count(), expected ? 1 : 0, `${name} ${label}`)
        assert.equal(await spark('IPCA 12m').count(), 1, 'IPCA sempre tem 12 meses divulgados')
        if (expected) {
          assert.match(await spark('CDI').getAttribute('aria-label'), /CDI: fechamento mensal, 12 meses/)
          assert.match(await spark('IPCA 12m').getAttribute('aria-label'), /IPCA: últimos 12 meses divulgados/)
          assert.ok(await spark('CDI').locator('svg path.line').count() > 0)
        }
        await p.close()
      }
    }
    for (const width of [390, 1280]) {
      const p = await b.newPage({ viewport: { width, height: 900 }, serviceWorkers: 'block' }), errors = []
      p.on('pageerror', (e) => errors.push(e.message))
      await p.route('**/ipca.json*', (r) => r.fulfill({ json: ipca }))
      await p.route('**/divida.json*', (r) => r.fulfill({ json: divida }))
      await p.route('**/commodities.json*', (r) => r.fulfill({ json: commodities }))
      await p.route('**/ipca-groups.json*', (r) => r.fulfill({ json: ipcaGroups }))
      await p.route('**/freight-jp.json*', (r) => r.fulfill({ json: jp }))
      // Cenários › Projeções: sinais ▲ ▼ = de cada banco contra o FOCUS, linha a linha
      await p.route('**/macro.json*', (r) => r.fulfill({ json: { generatedAt: Date.now(), cdi: [], selic: [], sofr: [], sofrAvg: [], ptax: {}, ptaxHist: {}, focus: { date: '2026-10-26', rows: [
        { label: 'PIB', values: { 2026: { median: 2.5 }, 2027: { median: 2 } } }, { label: 'IPCA', values: { 2026: { median: 4.5 }, 2027: { median: 4 } } },
        { label: 'Selic', values: { 2026: { median: 14.25 }, 2027: { median: 12 } } }, { label: 'Câmbio', values: { 2026: { median: 5.4 }, 2027: { median: 5.5 } } }] } } }))
      await p.route('**/cenarios.json*', (r) => r.fulfill({ json: { institutions: [
        { name: 'Itaú BBA', date: '2026-10-20', years: { 2026: { pib: 2.8, ipca: 4.2, selic: 14.25, usd: 5.4 } } },
        { name: 'Bradesco', date: '2026-10-20', years: { 2026: { pib: 2.5, ipca: 4.5 } } }] } }))
      await p.goto(base + '/#cenarios/projecoes')
      const sc = p.locator('.scenario-table'); await sc.waitFor()
      const rowOf = (name) => sc.locator('tbody tr', { hasText: name }).first()
      await rowOf('PIB').locator('.fm').first().waitFor()
      assert.equal(await rowOf('PIB').getByRole('img', { name: 'acima do Focus' }).count(), 1, 'Itaú acima no PIB')
      assert.equal(await rowOf('PIB').getByRole('img', { name: 'igual ao Focus' }).count(), 1, 'Bradesco igual no PIB')
      assert.equal(await rowOf('IPCA').getByRole('img', { name: 'abaixo do Focus' }).count(), 1, 'Itaú abaixo no IPCA')
      assert.equal(await rowOf('Selic').getByRole('img', { name: 'igual ao Focus' }).count(), 1)
      assert.equal(await sc.locator('tbody tr', { hasText: 'IPCA' }).first().locator('td').first().locator('.fm').count(), 0, 'a coluna FOCUS não recebe sinal')
      assert.equal(await rowOf('USD').getByRole('img', { name: 'igual ao Focus' }).count(), 1)
      assert.match(await sc.locator('caption').innerText(), /▲[\s\S]*acima[\s\S]*▼[\s\S]*abaixo[\s\S]*=[\s\S]*igual/)
      // menu na ordem pedida
      const names = await p.getByRole('navigation', { name: /Navegação principal|Seções/ }).getByRole('button').allInnerTexts()
      if (width >= 700) assert.deepEqual(names.slice(0, 3).map((t) => t.trim().toLowerCase().split(' ')[0]), ['mercado', 'juros', 'cenários'])
      // card do topo do Mercado: IPCA 12m no lugar do Brent; clique leva a Cenários › Outros
      await p.goto(base + '/#resumo')
      const card = p.locator('.kpis .kpi', { hasText: 'IPCA 12m' })
      await card.waitFor()
      assert.equal(await p.locator('.kpis .kpi', { hasText: 'Brent' }).count(), 0)
      assert.match(await card.innerText(), /%[\s\S]*p\.p\./)
      await card.click()
      await p.waitForURL('**/#cenarios/outros')
      const table = p.locator('.ind-table').first()
      await table.waitFor()
      assert.equal(await table.locator('tbody').count(), 4, 'quatro leituras do IPCA')
      assert.match(await table.innerText(), /Acumulado em 12 meses/)
      // quadro abaixo de Inflação · IPCA: grupos do índice e fatores fora dele
      const infl = p.locator('section.infl'); await infl.waitFor()
      assert.ok((await infl.boundingBox()).y > (await table.boundingBox()).y, 'quadro abaixo da tabela do IPCA')
      const g = infl.locator('table').first()
      assert.equal(await g.locator('tbody tr').count(), 3)
      assert.match(await g.innerText(), /Alimentação e bebidas[\s\S]*\+0,22[\s\S]*Transportes[\s\S]*−0,10/)
      assert.equal(await g.getByRole('img', { name: 'acima do mês anterior' }).count(), 2, 'geral e alimentação aceleram; transportes cai')
      assert.equal(await g.getByRole('img', { name: 'abaixo do mês anterior' }).count(), 1)
      assert.match(await infl.locator('p.infl-summary').innerText(), /maior pressão veio de Alimentação e bebidas[\s\S]*maior alívio, de Transportes/)
      const ft = infl.locator('table.infl-factors')
      for (const label of ['Câmbio', 'Petróleo', 'Soja', 'Milho', 'Expectativas', 'Juros']) await ft.getByRole('rowheader', { name: new RegExp(label) }).waitFor()
      assert.match(await ft.locator('tr', { hasText: 'Expectativas' }).innerText(), /4,50%.*meta 3,0%/)
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      // dívida bruta do governo geral: tabela própria abaixo do quadro de inflação; a linha abre o histórico
      const dt = p.locator('.ind-table').nth(1); await dt.waitFor()
      assert.equal(await dt.locator('tbody').count(), 2, 'duas leituras da dívida bruta')
      assert.match(await dt.innerText(), /Máxima da série[\s\S]*DBGG · % do PIB[\s\S]*DBGG · saldo em R\$ bilhões/)
      assert.match(await dt.locator('tbody').first().innerText(), /82,93%[\s\S]*82,87%[\s\S]*\+0,06 p\.p\./, '% do PIB com duas casas, como o BCB publica: variação de 0,06 p.p. visível')
      await p.getByRole('button', { name: /DBGG . % do PIB: abrir gráfico/ }).click()
      const dd = p.getByRole('dialog', { name: /histórico de DBGG/i }); await dd.waitFor()
      assert.equal(await dd.locator('.chart-filters').count(), 1)
      await dd.locator('.plot svg').first().waitFor()
      await p.keyboard.press('Escape'); await dd.waitFor({ state: 'hidden' })
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'sem rolagem lateral com a tabela da dívida')
      await p.getByRole('button', { name: 'Acumulado em 12 meses: abrir gráfico' }).click()
      const d = p.getByRole('dialog', { name: /histórico de IPCA/ })
      await d.waitFor()
      assert.deepEqual(await d.locator('.expandable-controls button').allInnerTexts(), ['Fechar ×'])
      assert.equal(await d.locator('.chart-filters').count(), 1, 'filtros num bloco só, acima do gráfico')
      await d.getByRole('group', { name: 'Período do indicador' }).getByRole('button', { name: 'Tudo' }).click()
      await d.locator('.plot svg').first().waitFor()
      // período mensal no mesmo seletor de intervalo: grade de meses; dois cliques aplicam
      assert.equal(await d.locator('input[type="month"], input[type="date"]').count(), 0)
      const trig = d.getByRole('button', { name: /^Período do indicador: de .* a .*Abrir calendário$/ }); await trig.click()
      const cal = d.getByRole('dialog', { name: 'Período do indicador: calendário' }); await cal.waitFor()
      assert.equal(await cal.locator('.drp-grid-months .drp-cell').count(), 12)
      const ms = cal.locator('.drp-cell:not(:disabled)'); await ms.first().click(); await ms.last().click()
      await cal.waitFor({ state: 'hidden' })
      assert.match(await trig.innerText(), /^[a-zç]{3}\/\d{2} → [a-zç]{3}\/\d{2}$/)
      await p.keyboard.press('Escape'); await d.waitFor({ state: 'hidden' })
      // frete marítimo: mesma tabela; a linha abre o gráfico
      await p.goto(base + '/#cenarios/frete')
      const f = p.locator('.ind-table', { hasText: 'Transporte marítimo' })
      await f.waitFor()
      assert.match(await f.innerText(), /Δ mês %[\s\S]*12 meses %[\s\S]*Ano %/)
      assert.equal(await f.locator('tbody').count(), 2, 'EUA e Japão')
      assert.match(await f.innerText(), /Japão · Transporte marítimo/)
      await f.getByRole('button', { name: /Japão.*abrir histórico e gráfico/ }).click()
      const jd = p.getByRole('dialog', { name: /histórico de Japão/i }); await jd.waitFor()
      await p.keyboard.press('Escape'); await jd.waitFor({ state: 'hidden' })
      await f.getByRole('button', { name: /EUA.*abrir histórico e gráfico/ }).click()
      const fd = p.getByRole('dialog', { name: /histórico de /i }); await fd.waitFor()
      assert.equal(await fd.locator('.chart-filters').count(), 1)
      await p.keyboard.press('Escape'); await fd.waitFor({ state: 'hidden' })
      // atividade e emprego: tabela; a linha abre o gráfico em tela cheia
      await p.goto(base + '/#cenarios/atividade')
      const at = p.locator('.ind-table', { hasText: 'Payroll' }); await at.waitFor()
      assert.equal(await at.locator('tbody').count(), 5, 'cinco indicadores de atividade e emprego')
      assert.match(await at.innerText(), /Anterior[\s\S]*Variação[\s\S]*Ano anterior/)
      await at.getByRole('button', { name: /Payroll . EUA: abrir gráfico/ }).click()
      const ad = p.getByRole('dialog', { name: /histórico de Payroll/i }); await ad.waitFor()
      assert.equal(await ad.locator('.chart-filters').count(), 1)
      assert.deepEqual(await ad.locator('.expandable-controls button').allInnerTexts(), ['Fechar ×'])
      await p.keyboard.press('Escape'); await ad.waitFor({ state: 'hidden' })
      // commodities: tabela com variações; a linha com histórico abre o gráfico, a sem histórico não abre
      await p.goto(base + '/#cenarios/commodities')
      const ct = p.locator('.ind-table', { hasText: 'Ouro' }); await ct.waitFor()
      assert.match(await ct.innerText(), /Δ %[\s\S]*12 meses %[\s\S]*Ano %/)
      assert.equal(await ct.getByRole('button', { name: /Soja: histórico indisponível/ }).isDisabled(), true)
      await ct.getByRole('button', { name: /Ouro: abrir gráfico/ }).click()
      const cd = p.getByRole('dialog', { name: /histórico de Ouro/i }); await cd.waitFor()
      assert.equal(await cd.locator('.chart-filters').count(), 1)
      assert.deepEqual(await cd.locator('.expandable-controls button').allInnerTexts(), ['Fechar ×'])
      await cd.locator('.plot svg').first().waitFor()
      await p.keyboard.press('Escape'); await cd.waitFor({ state: 'hidden' })
      // feriados: Londres, Tóquio e China entram na aba, com a bandeira do país em cada linha
      await p.goto(base + '/#feriados')
      await p.locator('.fer-filter select').waitFor()
      const opts = await p.locator('.fer-filter option').allInnerTexts()
      for (const praca of ['Londres', 'Tóquio', 'China (continental)']) assert.ok(opts.includes(praca), praca)
      assert.ok(await p.locator('.fer-where .flag').count() > 0, 'bandeiras nas linhas de feriado')
      await p.locator('.fer-filter select').selectOption('JP')
      assert.ok(await p.locator('.fer-list li').count() > 0, 'feriados do Japão')
      // aprender: lista de conceitos de um lado, explicação do outro, sem texto sobre o método
      await p.goto(base + '/#aprender')
      await p.locator('.learn-list').waitFor()
      assert.equal(await p.locator('.learn-list li').count(), 11)
      assert.doesNotMatch(await p.locator('main').innerText(), /feynman/i)
      await p.locator('.learn-list button', { hasText: 'Diferencial de juros' }).click()
      await p.locator('.learn-detail h2', { hasText: 'Diferencial de juros' }).waitFor()
      assert.match(await p.locator('.learn-detail').innerText(), /9,62%[\s\S]*R\$ 5,48/)
      // tópicos e busca
      assert.deepEqual((await p.locator('.learn-topic').allTextContents()).map((t) => t.trim()), ['Juros e câmbio', 'Funding e risco', 'Operações de crédito', 'Inflação'])
      const busca = p.getByRole('searchbox', { name: 'Buscar conceito' })
      await busca.fill('FIDC')
      assert.equal(await p.locator('.learn-list li').count(), 1)
      assert.deepEqual((await p.locator('.learn-topic').allTextContents()).map((t) => t.trim()), ['Operações de crédito'], 'só o tópico com resultado')
      assert.match(await p.locator('.learn-count').innerText(), /1 conceito encontrado/)
      await busca.fill('debenture'); assert.equal(await p.locator('.learn-list li', { hasText: 'Debênture' }).count(), 1, 'busca sem acento')
      await busca.fill('zzzxyz'); assert.match(await p.locator('.learn-count').innerText(), /Nenhum conceito encontrado/); assert.equal(await p.locator('.learn-list li').count(), 0)
      await p.getByRole('button', { name: 'Limpar busca' }).click(); assert.equal(await busca.inputValue(), ''); assert.equal(await p.locator('.learn-list li').count(), 11)
      await busca.fill('recebiveis'); await p.locator('.learn-list button', { hasText: 'FIDC' }).click()
      await p.locator('.learn-detail h2', { hasText: 'FIDC' }).waitFor()
      assert.match(await p.locator('.learn-detail').innerText(), /subordinação[\s\S]*30%[\s\S]*R\$ 1\.000\.000[\s\S]*R\$ 1\.000\.000/)
      // conexões: em cada conceito, "Conecta com" leva ao conceito ligado; o quadro geral cobre todos
      assert.match(await p.locator('.learn-detail').innerText(), /Conecta com[\s\S]*Liquidação antecipada ›[\s\S]*Debênture ›[\s\S]*Nota comercial ›/i)
      await p.locator('.learn-detail .learn-conecta .learn-link', { hasText: 'Debênture' }).click()
      await p.locator('.learn-detail h2', { hasText: 'Debênture' }).waitFor()
      await busca.fill('')
      for (const [nome, rx] of [['Debênture', /16,28%[\s\S]*162\.800/], ['Nota comercial', /17,42%[\s\S]*0,50 ano/], ['Inflação', /4,91%[\s\S]*9,1\d%/]]) {
        await p.locator('.learn-list button', { hasText: nome }).first().click()
        await p.locator('.learn-detail h2', { hasText: nome }).waitFor()
        assert.match(await p.locator('.learn-detail').innerText(), rx, nome)
      }
      await p.locator('.learn-detail .learn-go').click(); await p.waitForURL('**/#cenarios/outros')
      await p.goto(base + '/#aprender')
      await p.locator('.learn-list').waitFor()
      const geral = p.locator('.learn-detail')
      await geral.getByRole('heading', { name: 'Como as peças se encaixam' }).waitFor()
      assert.equal(await geral.locator('.learn-links').first().locator('li').count(), 11, 'um papel para cada conceito')
      assert.match(await geral.innerText(), /O caminho de ponta a ponta[\s\S]*Inflação →[\s\S]*Quem se liga a quem[\s\S]*Liquidação antecipada ↔ FIDC/i)
      await p.locator('.learn-list button', { hasText: 'Liquidação antecipada' }).click()
      await p.locator('.learn-detail h2', { hasText: 'Liquidação antecipada' }).waitFor()
      assert.match(await p.locator('.learn-detail').innerText(), /Na curva[\s\S]*1\.150\.000[\s\S]*1\.180\.804[\s\S]*Break funding[\s\S]*10\.089/)
      await p.locator('.learn-list button', { hasText: 'SOFR' }).click()
      await p.locator('.learn-detail h2', { hasText: 'SOFR' }).waitFor()
      if (width >= 1000) { const l = await p.locator('.learn-list').boundingBox(), d = await p.locator('.learn-detail').boundingBox(); assert.ok(d.x > l.x + l.width - 1, 'explicação ao lado da lista') }
      assert.deepEqual(errors, [])
      console.log(width + ' PASS IPCA em Outros (tabela, gráfico em tela cheia, filtros no topo) e frete em tabela')
      await p.close()
    }
  } finally { await b.close() }
})().catch((e) => { console.error(e); process.exit(1) })
