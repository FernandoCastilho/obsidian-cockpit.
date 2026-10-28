// Cenários › Outros (IPCA) e Frete marítimo: tabela no formato do Mercado; clicar abre o gráfico em tela cheia com filtros no topo.
const { chromium } = require('playwright'), assert = require('node:assert/strict')
const points = []
let index = 100
for (let y = 2018; y <= 2026; y++) for (let m = 1; m <= 12; m++) {
  if (y === 2026 && m > 9) break
  const mom = 0.2 + 0.5 * Math.abs(Math.sin(y * 12 + m)); index *= 1 + mom / 100
  points.push({ period: `${y}-${String(m).padStart(2, '0')}`, mom: +mom.toFixed(2), ytd: +(mom * m).toFixed(2), y12: +(mom * 12).toFixed(2), index: +index.toFixed(2) })
}
const ipca = { schemaVersion: 1, generatedAt: new Date().toISOString(), series: { id: 'ipca', sourceName: 'IBGE · SIDRA (fixture de teste)', sourceUrl: 'https://sidra.ibge.gov.br/tabela/1737', checkedAt: new Date().toISOString(), stale: false, points } }
const jp = { schemaVersion: 1, generatedAt: new Date().toISOString(), series: { id: 'freight-jp-sppi', unit: 'pontos · média de 2020 = 100', frequency: 'monthly', sourceName: 'Banco do Japão (fixture de teste)', sourceUrl: 'https://www.boj.or.jp/en/statistics/pi/sppi_2020/index.htm', checkedAt: new Date().toISOString(), stale: false, releaseDate: null,
  points: Array.from({ length: 40 }, (_, i) => ({ period: `${2023 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`, value: 100 + i * 1.5 })) } }
const monthly = (v0) => Array.from({ length: 60 }, (_, i) => { const d = new Date(Date.UTC(2026, 8, 15)); d.setUTCMonth(d.getUTCMonth() - (59 - i)); return { period: d.toISOString().slice(0, 7), value: +(v0 * (1 + 0.1 * Math.sin(i / 8) + i / 600)).toFixed(2) } })
const commodity = (id, label, unit, value, history) => ({ id, label, unit, nature: 'média mensal', sourceName: 'Banco Mundial • Pink Sheet (fixture)', sourceUrl: 'https://www.worldbank.org/en/research/commodity-markets', benchmark: 'teste', value, period: '2026-09', releaseDate: '2026-10-02', checkedAt: '2026-10-05T00:00:00Z', stale: false, error: null, previousValue: null, previousPeriod: null, variationPct: null, variationBasis: 'mês anterior', history })
const commodities = { schemaVersion: 1, generatedAt: new Date().toISOString(), commodities: [commodity('gold', 'Ouro', 'USD/onça troy', 4319, monthly(4000)), commodity('iron-ore', 'Minério de ferro', 'USD/tonelada seca', 97.7, monthly(90)), commodity('soybeans', 'Soja', 'USD/tonelada', 524, []), commodity('corn', 'Milho', 'USD/tonelada', 239.6, monthly(230))] }
;(async () => {
  const b = await chromium.launch({ channel: process.env.SMOKE_CHANNEL || 'msedge', headless: true }), base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5216'
  try {
    for (const width of [390, 1280]) {
      const p = await b.newPage({ viewport: { width, height: 900 }, serviceWorkers: 'block' }), errors = []
      p.on('pageerror', (e) => errors.push(e.message))
      await p.route('**/ipca.json*', (r) => r.fulfill({ json: ipca }))
      await p.route('**/commodities.json*', (r) => r.fulfill({ json: commodities }))
      await p.route('**/freight-jp.json*', (r) => r.fulfill({ json: jp }))
      // card do topo do Mercado: IPCA 12m no lugar do Brent; clique leva a Cenários › Outros
      await p.goto(base + '/#resumo')
      const card = p.locator('.kpis .kpi', { hasText: 'IPCA 12m' })
      await card.waitFor()
      assert.equal(await p.locator('.kpis .kpi', { hasText: 'Brent' }).count(), 0)
      assert.match(await card.innerText(), /%[\s\S]*p\.p\./)
      await card.click()
      await p.waitForURL('**/#cenarios/outros')
      const table = p.locator('.ind-table')
      await table.waitFor()
      assert.equal(await table.locator('tbody').count(), 4, 'quatro leituras do IPCA')
      assert.match(await table.innerText(), /Acumulado em 12 meses/)
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
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
      const f = p.locator('.ind-table')
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
      const at = p.locator('.ind-table'); await at.waitFor()
      assert.equal(await at.locator('tbody').count(), 5, 'cinco indicadores de atividade e emprego')
      assert.match(await at.innerText(), /Anterior[\s\S]*Variação[\s\S]*Ano anterior/)
      await at.getByRole('button', { name: /Payroll . EUA: abrir gráfico/ }).click()
      const ad = p.getByRole('dialog', { name: /histórico de Payroll/i }); await ad.waitFor()
      assert.equal(await ad.locator('.chart-filters').count(), 1)
      assert.deepEqual(await ad.locator('.expandable-controls button').allInnerTexts(), ['Fechar ×'])
      await p.keyboard.press('Escape'); await ad.waitFor({ state: 'hidden' })
      // commodities: tabela com variações; a linha com histórico abre o gráfico, a sem histórico não abre
      await p.goto(base + '/#cenarios/commodities')
      const ct = p.locator('.ind-table'); await ct.waitFor()
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
      assert.equal(await p.locator('.learn-list li').count(), 5)
      assert.doesNotMatch(await p.locator('main').innerText(), /feynman/i)
      await p.locator('.learn-list button', { hasText: 'SOFR' }).click()
      await p.locator('.learn-detail h2', { hasText: 'SOFR' }).waitFor()
      if (width >= 1000) { const l = await p.locator('.learn-list').boundingBox(), d = await p.locator('.learn-detail').boundingBox(); assert.ok(d.x > l.x + l.width - 1, 'explicação ao lado da lista') }
      assert.deepEqual(errors, [])
      console.log(width + ' PASS IPCA em Outros (tabela, gráfico em tela cheia, filtros no topo) e frete em tabela')
      await p.close()
    }
  } finally { await b.close() }
})().catch((e) => { console.error(e); process.exit(1) })
