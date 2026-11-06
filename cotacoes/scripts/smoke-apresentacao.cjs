// Apresentar (#apresentar): montagem com nome, setor e itens; apresentação em tela com capa, cenário, cadeia e itens; teclado e Escape; celular e computador.
const { chromium } = require('playwright'), assert = require('node:assert/strict')
const DIA = 864e5, agora = Date.now()
const diaria = (n, de, ate) => Array.from({ length: n }, (_, i) => ({ t: agora - (n - 1 - i) * DIA, bid: +(de + ((ate - de) * i) / (n - 1)).toFixed(4), high: ate, low: de }))
const history = { generatedAt: agora, series: { USD: { source: 'USD', points: diaria(400, 5.0, 5.3) }, EUR: { source: 'EUR', points: diaria(400, 5.8, 6.1) }, JPY: { source: 'JPY', points: diaria(400, 0.034, 0.035) }, CNH: { source: 'CNH', points: diaria(400, 0.7, 0.74) } } }
const meses = Array.from({ length: 12 }, (_, i) => { const d = new Date(agora); d.setUTCMonth(d.getUTCMonth() - (12 - i)); return d.toISOString().slice(0, 7) })
const comm = (id, label, unit, v) => ({ id, label, unit, nature: 'média mensal', sourceName: 'x', sourceUrl: 'https://x', benchmark: 'ref', value: v, period: meses.at(-1), releaseDate: '2026-10-02', checkedAt: new Date(agora).toISOString(), stale: false, error: null, previousValue: v * 0.98, previousPeriod: meses.at(-2), variationPct: 2.04, variationBasis: 'mês anterior', history: meses.map((p, i) => ({ period: p, value: +(v * (1.1 - i * 0.01)).toFixed(2) })) })
const commodities = { schemaVersion: 1, generatedAt: new Date(agora).toISOString(), commodities: [comm('iron-ore', 'Minério de ferro', 'USD/tonelada seca', 97.7), comm('copper', 'Cobre', 'USD/tonelada', 9800), comm('aluminum', 'Alumínio', 'USD/tonelada', 2600), comm('wti', 'WTI', 'USD/barril', 60)] }
const temas = { generatedAt: agora, windowDays: 7, temas: { 'moeda-usd': { label: 'Dólar', grupo: 'moeda', items: [{ t: agora - 3600e3, title: 'Dólar sobe com decisão do Fed', source: 'Valor', link: 'https://exemplo/1' }] }, aco: { label: 'Aço', grupo: 'insumo', items: [{ t: agora - 7200e3, title: 'Aço: nova cota de importação', source: 'Reuters', link: 'https://exemplo/2' }] }, minerio: { label: 'Minério', grupo: 'insumo', items: [] } } }
const raw = (bid, pct) => ({ bid: String(bid), ask: String(bid * 1.0003), high: String(bid * 1.01), low: String(bid * 0.99), pctChange: String(pct), varBid: '0.01', timestamp: String(Math.floor((agora - 60000) / 1000)) })
const quotes = { generatedAt: agora - 60000, source: 'AwesomeAPI', rejected: {}, quotes: { USDBRL: raw(5.3, 0.25), EURBRL: raw(6.1, -0.1), JPYBRL: raw(0.035, 0), USDCNH: raw(7.16, 0.05) } }
const out = process.env.SMOKE_OUT || '/tmp'
;(async () => {
  const b = await chromium.launch(require('./smoke-launch.cjs')()), base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5216'
  try {
    for (const width of [1280, 390]) {
      const ctx = await b.newContext({ viewport: { width, height: width > 700 ? 800 : 844 }, serviceWorkers: 'block' })
      const p = await ctx.newPage(), errors = []
      p.on('pageerror', (e) => errors.push(e.message))
      await ctx.route('**/*', (r) => { const u = r.request().url(); return u.startsWith(base) || /api\.microlink\.io|api\.frankfurter\.dev/.test(u) ? r.continue() : r.abort() })
      // referência do BCE para o ano anterior das moedas: 2 anos de dias úteis
      const ecbRates = {}; for (let i = 730; i >= 0; i--) { const d = new Date(agora - i * DIA); if (d.getUTCDay() % 6) ecbRates[d.toISOString().slice(0, 10)] = { BRL: +(4.9 + (730 - i) * 0.0004).toFixed(4) } }
      await p.route('**/api.frankfurter.dev/**', (r) => r.fulfill({ json: { base: 'USD', rates: ecbRates } }))
      await p.route('**/quotes.json*', (r) => r.fulfill({ json: quotes }))
      await p.route('**/history.json*', (r) => r.fulfill({ json: history }))
      await p.route('**/commodities.json*', (r) => r.fulfill({ json: commodities }))
      await p.route('**/temas.json*', (r) => r.fulfill({ json: temas }))
      const mes = (i) => { const d = new Date(agora); d.setUTCMonth(d.getUTCMonth() - i); return d.toISOString().slice(0, 7) }
      await p.route('**/indicator-history.json*', (r) => r.fulfill({ json: { series: [{ id: 'caged', unit: 'postos de trabalho', points: Array.from({ length: 14 }, (_, i) => ({ period: mes(13 - i), value: i % 4 === 0 ? -12000 : 90000 + i * 1000 })) }] } }))
      await p.route('**/inadimplencia.json*', (r) => r.fulfill({ json: { generatedAt: agora, series: ['pf-total', 'pj-total', 'pf-livres'].map((key) => ({ key, person: key.slice(0, 2).toUpperCase(), type: key.split('-')[1], points: Array.from({ length: 24 }, (_, i) => ({ period: mes(23 - i), t: agora - (23 - i) * 30 * DIA, v: +(key.startsWith('pf') ? 5 + i * 0.05 : 3 + i * 0.02).toFixed(2) })) })) } }))
      await p.route('**/macro.json*', (r) => r.fulfill({ json: { generatedAt: agora, selic: Array.from({ length: 8 }, (_, i) => [agora - (8 - i) * 45 * DIA, 15 - i * 0.25]), cdi: [[agora - DIA, 14.15]], sofr: [], sofrAvg: [], focus: { date: new Date(agora - 4 * DIA).toISOString().slice(0, 10), rows: [{ label: 'Selic', indicator: 'Selic', values: { [new Date(agora).getUTCFullYear()]: { median: 12.5 } } }, { label: 'IPCA', indicator: 'IPCA', values: { [new Date(agora).getUTCFullYear()]: { median: 4.5 } } }] }, ptax: {}, ptaxHist: {}, errors: [], stale: {} } }))
      await p.route('**/api.microlink.io/**', (r) => /tubokraft/.test(r.request().url()) ? r.fulfill({ status: 403, json: { status: 'fail', code: 'EFAILED', message: 'site não respondeu' } }) : r.fulfill({ json: { status: 'success', data: { title: 'Metalúrgica Exemplo | Home', publisher: 'Metalúrgica Exemplo', description: 'Peças usinadas para a indústria.', logo: null, image: null } } }))
      await p.goto(base + '/#apresentar')
      const form = p.locator('.apr-form'); await form.waitFor()
      // a aba não aparece no menu nem na barra do computador
      assert.equal(await p.locator('nav.tabs button', { hasText: 'Apresentar' }).count(), 0)
      // sem cliente, não apresenta
      const btn = p.getByRole('button', { name: 'Apresentar', exact: true })
      assert.ok(await btn.isDisabled())
      // só o nome, sem domínio: tenta .com.br e .com; falhando, diz o que tentou e pede o endereço completo; o nome digitado libera a apresentação
      await p.getByLabel('Site da empresa').fill('tubokraft')
      await p.getByRole('button', { name: 'Ler site' }).click()
      const aviso = p.locator('.estado-aviso'); await aviso.waitFor()
      assert.match(await aviso.innerText(), /Não consegui ler tubokraft\.com\.br nem tubokraft\.com\. Digite o endereço completo/)
      assert.ok(await btn.isDisabled())
      await p.getByLabel(/Nome da empresa/).fill('Tubokraft')
      assert.ok(!(await btn.isDisabled()))
      await p.getByLabel(/Nome da empresa/).fill('')
      // o site informa a capa
      await p.getByLabel('Site da empresa').fill('exemplo.com.br')
      await p.getByRole('button', { name: 'Ler site' }).click()
      await p.getByText('Capa com os dados do site').waitFor()
      // setor padrão: metalmecânica, com aço, cobre, alumínio, dólar, euro e minério marcados
      const marcados = await p.locator('.apr-itens button[aria-pressed="true"]').allInnerTexts()
      assert.deepEqual(marcados.map((t) => t.split(' ·')[0]), ['Dólar', 'Aço', 'Cobre', 'Alumínio', 'Euro', 'Minério de ferro'])
      // planejados ficam desligados
      await p.getByRole('button', { name: 'Telecom e data center' }).click()
      assert.ok(await p.locator('.apr-itens button', { hasText: 'Energia elétrica' }).isDisabled())
      await p.getByRole('button', { name: 'Metalmecânica e equipamentos' }).click()
      // tira o euro, deixa 5 itens
      await p.locator('.apr-itens button', { hasText: 'Euro' }).click()
      await btn.click()
      const dlg = p.getByRole('dialog', { name: 'Apresentação' }); await dlg.waitFor()
      // 1º slide: perguntas para quem apresenta; depois a capa com o nome do site e o setor; 5 itens + perguntas, capa, cenário, cadeia, agenda e fim = 11 slides
      assert.equal(await dlg.locator('.apr-contador').innerText(), '1 / 11')
      assert.match(await dlg.locator('h2').innerText(), /^Para a conversa com Metalúrgica Exemplo/)
      assert.ok(await dlg.locator('.apr-perguntas li').count() >= 3)
      await p.waitForTimeout(900)
      await p.screenshot({ path: `${out}/apresentacao-perguntas-${width}.png` })
      await p.keyboard.press('ArrowRight')
      await dlg.locator('h1').waitFor()
      assert.equal(await dlg.locator('h1').innerText(), 'Metalúrgica Exemplo')
      assert.match(await dlg.locator('.apr-capa-desc').innerText(), /Peças usinadas/)
      await p.waitForTimeout(900) // fim das entradas por bloco antes da captura
      await p.screenshot({ path: `${out}/apresentacao-capa-${width}.png` })
      await p.keyboard.press('ArrowRight')
      await dlg.locator('.apr-cenario').waitFor()
      assert.ok(await dlg.locator('.apr-cenario li').count() >= 1)
      // leitura de uma linha em cada quadro; emprego em barras e inadimplência PF e PJ em linhas, abaixo
      assert.ok(await dlg.locator('.apr-cenario .apr-cen-leitura').count() >= 1)
      await dlg.locator('.apr-barras rect').first().waitFor()
      assert.equal(await dlg.locator('.apr-barras rect').count(), 12)
      assert.equal(await dlg.locator('.apr-cen-graficos .ml-line').count(), 2)
      await p.waitForTimeout(900)
      await p.screenshot({ path: `${out}/apresentacao-cenario-${width}.png` })
      await p.keyboard.press('ArrowRight')
      await dlg.locator('.apr-cadeia').waitFor()
      assert.equal(await dlg.locator('.apr-cad-chip-forte').innerText(), 'Usinagem, montagem e integração')
      assert.equal(await dlg.locator('.apr-cad-trans li').count(), 3)
      assert.match(await dlg.locator('.apr-cad-trans').innerText(), /Dólar\.[\s\S]*Importação[\s\S]*Exportação/)
      await p.waitForTimeout(350)
      await p.screenshot({ path: `${out}/apresentacao-cadeia-${width}.png` })
      await p.keyboard.press('ArrowRight') // dólar
      await dlg.locator('.apr-item').waitFor()
      assert.equal(await dlg.locator('h2').innerText(), 'Dólar')
      assert.match(await dlg.locator('.apr-valor').innerText(), /^R\$ \d+,\d{2}$/)
      assert.match(await dlg.locator('.apr-frase').innerText(), /^Dólar a R\$ \d+,\d{2}: [+−]?\d+,\d% em 6 meses\.$/)
      // gráfico do painel: arrastar um trecho mostra a variação e o mesmo trecho do ano anterior
      const plot = dlg.locator('.apr-grafico .plot svg'); await plot.waitFor()
      const pb = await plot.boundingBox()
      await p.mouse.move(pb.x + pb.width * 0.3, pb.y + pb.height / 2); await p.mouse.down(); await p.mouse.move(pb.x + pb.width * 0.7, pb.y + pb.height / 2, { steps: 8 }); await p.mouse.up()
      await p.waitForTimeout(300)
      assert.match(await dlg.locator('.apr-grafico').innerText(), /Ano anterior[\s\S]*→/, 'o mesmo trecho do ano anterior, pela referência do BCE')
      assert.match(await dlg.locator('.apr-grafico-nota').innerText(), /ano anterior pela referência diária do BCE/)
      assert.match(await dlg.locator('.apr-manchetes').innerText(), /Dólar sobe com decisão do Fed/)
      await p.waitForTimeout(350)
      await p.screenshot({ path: `${out}/apresentacao-dolar-${width}.png` })
      // O gráfico usa as setas para percorrer os pontos; a navegação dos slides parte do player.
      await plot.focus()
      await p.keyboard.press('ArrowRight')
      assert.equal(await dlg.locator('.apr-contador').innerText(), '5 / 11', 'seta com foco no gráfico percorre os pontos, sem trocar o slide')
      assert.equal(await dlg.locator('h2').innerText(), 'Dólar')
      await dlg.focus()
      await p.keyboard.press('ArrowRight') // aço: só matérias
      await dlg.getByRole('heading', { name: 'Aço', exact: true }).waitFor()
      assert.equal(await dlg.locator('h2').innerText(), 'Aço')
      assert.match(await dlg.locator('.apr-vazio').first().innerText(), /não tem série de preço/)
      await p.keyboard.press('ArrowRight') // cobre
      await dlg.getByRole('heading', { name: 'Cobre', exact: true }).waitFor()
      assert.equal(await dlg.locator('h2').innerText(), 'Cobre')
      assert.match(await dlg.locator('.apr-frase').innerText(), /em dólar\. Em reais, [+−]?\d+,\d%: o dólar (subiu|caiu)/)
      await p.waitForTimeout(350)
      await p.screenshot({ path: `${out}/apresentacao-cobre-${width}.png` })
      await p.keyboard.press('End')
      assert.equal(await dlg.locator('.apr-contador').innerText(), '11 / 11')
      assert.ok(await dlg.locator('.apr-fim-pontos li').count() >= 1, 'resumo final com os maiores movimentos')
      // miniaturas de tudo o que foi falado: itens com série, Selic, emprego e inadimplência, cada uma com minigráfico
      const minis = await dlg.locator('.apr-mini').allInnerTexts()
      assert.ok(minis.some((t) => /^Dólar/.test(t)) && minis.some((t) => /^Selic/.test(t)) && minis.some((t) => /Emprego formal/.test(t)) && minis.some((t) => /Inadimplência PF/.test(t)), minis.join(' | '))
      assert.ok(await dlg.locator('.apr-mini .spark').count() >= 4)
      await p.waitForTimeout(900)
      await p.screenshot({ path: `${out}/apresentacao-fim-${width}.png` })
      // botões da barra: anterior leva à agenda, com a leitura curta de cada evento
      await dlg.getByRole('button', { name: 'Slide anterior' }).click()
      await dlg.locator('.apr-agenda, .apr-vazio').first().waitFor()
      if (await dlg.locator('.apr-agenda li').count()) assert.ok(await dlg.locator('.apr-agenda-texto small').count() >= 1)
      await p.keyboard.press('Escape')
      await dlg.waitFor({ state: 'detached' })
      await form.waitFor()
      assert.deepEqual(errors, [])
      await ctx.close()
    }
    console.log('smoke-apresentacao ok')
  } finally { await b.close() }
})().catch((e) => { console.error(e); process.exit(1) })
