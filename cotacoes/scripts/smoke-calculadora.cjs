// Calculadoras › Capital de Giro: ícone, condições gerais, linha em branco e resultado (Parcela, Juros Totais, Pagamento Final).
const { chromium } = require('playwright'), assert = require('node:assert/strict')
;(async () => {
  const b = await chromium.launch(require('./smoke-launch.cjs')()), base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5216'
  try {
    for (const width of [390, 1280]) {
      const p = await b.newPage({ viewport: { width, height: 1000 }, serviceWorkers: 'block' }), errors = []
      p.on('pageerror', (e) => errors.push(e.message))
      await p.goto(base + '/#calculadora')
      const tile = p.getByRole('button', { name: 'Capital de Giro: abrir calculadora' })
      await tile.waitFor()
      assert.equal(await tile.locator('svg').count(), 1, 'ícone do Capital de Giro')
      assert.ok((await tile.boundingBox()).height >= 44)
      await tile.click()
      await p.waitForURL('**/#calculadora/giro')
      const sec = p.locator('section.cx[aria-labelledby="calc-h"]'); await sec.waitFor()
      // estrutura pedida: Condições gerais (Valor, Prazo, Taxa, Sistema) · linha em branco · Resultado (Parcela, Juros Totais, Pagamento Final)
      assert.deepEqual(await sec.locator('header h3').allInnerTexts(), ['Condições gerais', 'Resultado'])
      for (const label of ['Valor', 'Prazo (meses)', 'Taxa (%)']) await sec.getByLabel(label, { exact: true }).waitFor()
      await sec.getByText('Sistema de amortização', { exact: true }).waitFor()
      assert.deepEqual(await sec.locator('.cx-result dt').allInnerTexts().then((a) => a.map((t) => t.toLowerCase())), ['parcela', 'juros totais', 'pagamento final'])
      const gap = await sec.locator('.cx-gap').boundingBox(), cond = await sec.locator('.cx-panel').first().boundingBox(), res = await sec.locator('.cx-panel').nth(1).boundingBox()
      assert.ok(res.y - (cond.y + cond.height) >= 16, 'linha em branco entre as duas seções'); assert.ok(gap.height >= 16)
      // padrão: R$ 100.000,00, 12 meses, 2% a.m., Price
      const dd = sec.locator('.cx-result dd')
      assert.equal((await dd.nth(0).innerText()).replace(/\s/g, ' '), 'R$ 9.455,96')
      assert.equal((await dd.nth(2).innerText()).replace(/\s/g, ' '), 'R$ 113.471,52')
      assert.equal((await dd.nth(1).innerText()).replace(/\s/g, ' '), 'R$ 13.471,52')
      // SAC: 1ª parcela e total; Bullet: sem parcela
      await sec.getByRole('button', { name: 'SAC', exact: true }).click()
      assert.match(await dd.nth(0).innerText(), /R\$\s*10\.333,33/)
      assert.match(await sec.locator('.cx-result small').first().innerText(), /última é R\$\s*8\.499,99|última é R\$\s*8\.500,00/)
      await sec.getByRole('button', { name: 'Bullet', exact: true }).click()
      assert.equal(await dd.nth(0).innerText(), '—'); assert.match(await dd.nth(2).innerText(), /R\$\s*126\.824,18/)
      // taxa anual convertida; entrada inválida mostra aviso e zera o resultado
      await sec.getByRole('button', { name: 'Price', exact: true }).click()
      await sec.getByRole('button', { name: 'a.a.', exact: true }).click(); await sec.getByLabel('Taxa (%)', { exact: true }).fill('12,6825') // 12,6825% a.a. = 1% a.m. (PMT de R$ 100.000 em 12 meses a 1% a.m.)
      assert.match(await dd.nth(0).innerText(), /R\$\s*8\.884,88/)
      await sec.getByLabel('Prazo (meses)', { exact: true }).fill('0')
      assert.match(await sec.locator('[role="alert"]').innerText(), /prazo em meses/)
      assert.equal(await dd.nth(0).innerText(), '—')
      await sec.getByLabel('Prazo (meses)', { exact: true }).fill('12')
      await sec.getByLabel('Valor', { exact: true }).fill('1,000.00')
      assert.match(await sec.locator('[role="alert"]').innerText(), /formato brasileiro/)
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      await sec.getByRole('button', { name: /Calculadoras/ }).click(); await p.waitForURL('**/#calculadora')
      assert.deepEqual(errors, [])
    }
    console.log('PASS calculadora de capital de giro: ícone, condições gerais, resultado e sistemas (390 e 1280)')
  } finally { await b.close() }
})().catch((e) => { console.error(e); process.exit(1) })
