// Alerta de variação: dólar acima de 0,30% da primeira cotação do dia aparece na faixa do topo, uma vez; "Ok" dispensa no dia;
// euro dentro do limite não aparece. Testa em 390 e 1280 px, com a exceção dos testes automáticos desligada.
const { chromium } = require('playwright'), assert = require('node:assert/strict')
;(async () => {
  const b = await chromium.launch(require('./smoke-launch.cjs')()), base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5216'
  const now = Date.now(), t0 = now - 2 * 3600e3
  const raw = (bid, ts) => ({ bid: String(bid), ask: String(bid * 1.0003), high: String(bid * 1.01), low: String(bid * 0.99), pctChange: '0.2', varBid: '0.01', timestamp: String(Math.floor(ts / 1000)) })
  const quotes = { generatedAt: now - 60000, source: 'AwesomeAPI', rejected: {}, quotes: { USDBRL: raw(5.5000, now - 60000), EURBRL: raw(6.1500, now - 60000), JPYBRL: raw(0.0347, now - 60000), USDCNH: raw(6.67, now - 60000) } }
  const pts = (v0, v1) => [[t0, v0], [t0 + 300000, (v0 + v1) / 2], [now - 60000, v1]]
  const intraday = { generatedAt: now - 60000, resolution: '5 min', series: { USD: { points: pts(5.4800, 5.5000) }, EUR: { points: pts(6.1400, 6.1500) }, JPY: { points: [] }, CNH: { points: [] } } }
  try {
    for (const width of [390, 1280]) {
      const ctx = await b.newContext({ viewport: { width, height: 800 }, serviceWorkers: 'block' })
      await ctx.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); try { localStorage.setItem('aprender-conceito-dia', new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())) } catch { /* sem armazenamento */ } })
      await ctx.route('**/*', (r) => { const u = r.request().url(); return u.startsWith(base) ? r.continue() : r.abort() })
      await ctx.route('**/recado.json*', (r) => r.fulfill({ json: { ativo: false } }))
      await ctx.route('**/quotes.json*', (r) => r.fulfill({ json: quotes }))
      await ctx.route('**/intraday.json*', (r) => r.fulfill({ json: intraday }))
      const p = await ctx.newPage(), errors = []
      p.on('pageerror', (e) => errors.push(e.message))
      await p.goto(base + '/#resumo')
      const aviso = p.locator('dialog.aviso-inicial:not(.recado)'); await aviso.waitFor(); await aviso.getByRole('button', { name: 'Entendi' }).click()
      const faixa = p.locator('.alerta-variacao'); await faixa.waitFor({ timeout: 20000 })
      const itens = faixa.locator('.alerta-var-item')
      assert.equal(await itens.count(), 1, 'só o dólar passou de 0,30%')
      assert.match(await itens.first().innerText(), /Dólar em alta de 0,36% desde a primeira cotação do dia \(5,4800/)
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'sem rolagem lateral')
      await p.screenshot({ path: `${process.env.SMOKE_OUT || '/tmp'}/alerta-${width}.png` })
      await itens.first().getByRole('button', { name: /Dispensar alerta do dólar/ }).click()
      await faixa.waitFor({ state: 'detached' })
      await p.reload(); await p.locator('dialog.aviso-inicial:not(.recado)').getByRole('button', { name: 'Entendi' }).click()
      await p.waitForTimeout(1500)
      assert.equal(await p.locator('.alerta-variacao').count(), 0, 'dispensado não volta no mesmo dia')
      assert.deepEqual(errors, [])
      await ctx.close()
      console.log(width, 'PASS alerta de variação: dólar +0,36% aparece, euro +0,16% não, dispensar vale para o dia')
    }
  } finally { await b.close() }
})().catch((e) => { console.error(e); process.exit(1) })
