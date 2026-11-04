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
      await ctx.route('**/*', (r) => { const u = r.request().url(); return u.startsWith(base) || /api\.microlink\.io/.test(u) ? r.continue() : r.abort() })
      await p.route('**/quotes.json*', (r) => r.fulfill({ json: quotes }))
      await p.route('**/history.json*', (r) => r.fulfill({ json: history }))
      await p.route('**/commodities.json*', (r) => r.fulfill({ json: commodities }))
      await p.route('**/temas.json*', (r) => r.fulfill({ json: temas }))
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
      // capa com o nome do site e o setor; 5 itens + capa, cenário, cadeia, agenda, perguntas e fim = 11 slides
      assert.equal(await dlg.locator('h1').innerText(), 'Metalúrgica Exemplo')
      assert.match(await dlg.locator('.apr-capa-desc').innerText(), /Peças usinadas/)
      assert.equal(await dlg.locator('.apr-contador').innerText(), '1 / 11')
      await p.waitForTimeout(350) // fim da entrada suave antes da captura
      await p.screenshot({ path: `${out}/apresentacao-capa-${width}.png` })
      await p.keyboard.press('ArrowRight')
      await dlg.locator('.apr-cenario').waitFor()
      assert.ok(await dlg.locator('.apr-cenario li').count() >= 1)
      await p.keyboard.press('ArrowRight')
      await dlg.locator('.apr-cadeia').waitFor()
      assert.equal(await dlg.locator('.apr-cad-chip-forte').innerText(), 'Usinagem, montagem e integração')
      await p.waitForTimeout(350)
      await p.screenshot({ path: `${out}/apresentacao-cadeia-${width}.png` })
      await p.keyboard.press('ArrowRight') // dólar
      await dlg.locator('.apr-item').waitFor()
      assert.equal(await dlg.locator('h2').innerText(), 'Dólar')
      assert.match(await dlg.locator('.apr-valor').innerText(), /^R\$ \d+,\d{2}$/)
      assert.match(await dlg.locator('.apr-frase').innerText(), /^Dólar a R\$ \d+,\d{2}: [+−]?\d+,\d% em 6 meses\.$/)
      assert.ok(await dlg.locator('.apr-spark svg path').count() >= 1, 'minigráfico do período')
      assert.match(await dlg.locator('.apr-manchetes').innerText(), /Dólar sobe com decisão do Fed/)
      await p.waitForTimeout(350)
      await p.screenshot({ path: `${out}/apresentacao-dolar-${width}.png` })
      await p.keyboard.press('ArrowRight') // aço: só matérias
      assert.equal(await dlg.locator('h2').innerText(), 'Aço')
      assert.match(await dlg.locator('.apr-vazio').first().innerText(), /não tem série de preço/)
      await p.keyboard.press('ArrowRight') // cobre
      assert.equal(await dlg.locator('h2').innerText(), 'Cobre')
      assert.match(await dlg.locator('.apr-frase').innerText(), /em dólar\. Em reais, [+−]?\d+,\d%: o dólar (subiu|caiu)/)
      await p.waitForTimeout(350)
      await p.screenshot({ path: `${out}/apresentacao-cobre-${width}.png` })
      await p.keyboard.press('End')
      assert.equal(await dlg.locator('.apr-contador').innerText(), '11 / 11')
      assert.ok(await dlg.locator('.apr-fim-pontos li').count() >= 1, 'resumo final com os maiores movimentos')
      await p.keyboard.press('ArrowLeft')
      await dlg.locator('.apr-perguntas').waitFor()
      // botões da barra: anterior leva à agenda
      await dlg.getByRole('button', { name: 'Slide anterior' }).click()
      await dlg.locator('.apr-agenda, .apr-vazio').first().waitFor()
      await p.keyboard.press('Escape')
      await dlg.waitFor({ state: 'detached' })
      await form.waitFor()
      assert.deepEqual(errors, [])
      await ctx.close()
    }
    console.log('smoke-apresentacao ok')
  } finally { await b.close() }
})().catch((e) => { console.error(e); process.exit(1) })
