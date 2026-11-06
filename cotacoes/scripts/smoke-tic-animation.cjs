const { chromium } = require('playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')
;(async () => {
  const browser = await chromium.launch(require('./smoke-launch.cjs')())
  const base = process.env.SMOKE_PUBLISHED_URL || process.env.SMOKE_BASE_URL || 'http://127.0.0.1:8786'
  const out = process.env.TIC_QA_OUTPUT || process.env.PUBLISHED_QA_OUTPUT || '/tmp/tic-animation-qa'
  fs.mkdirSync(out, { recursive: true })
  try {
    for (const width of [390, 820, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'no-preference' })
      await page.goto(base + '/#setores/topico/tic/0')
      const notice = page.getByRole('dialog', { name: 'Aviso', exact: true })
      if (await notice.isVisible()) await notice.getByRole('button', { name: 'Entendi', exact: true }).click()
      await page.locator('#tic-negocio').evaluate(el => { el.open = true })
      const diagram = page.locator('.tic-flow')
      await diagram.waitFor()
      assert.equal(await diagram.locator('.tic-flow-stage').count(), 13)
      const stage = diagram.locator('.tic-flow-stage').first()
      assert.equal(await stage.evaluate(el => getComputedStyle(el).animationName), 'tic-flow-stage')
      const delays = await diagram.locator('.tic-flow-stage').evaluateAll(els => els.map(el => parseFloat(getComputedStyle(el).animationDelay)))
      assert.deepEqual(delays, Array.from({ length: 13 }, (_, i) => i * 1.5))
      await diagram.getByRole('button', { name: 'Pausar animação do diagrama' }).click()
      assert.equal(await stage.evaluate(el => getComputedStyle(el).animationPlayState), 'paused')
      await diagram.getByRole('button', { name: 'Retomar animação do diagrama' }).focus()
      await page.keyboard.press('Enter')
      assert.equal(await stage.evaluate(el => getComputedStyle(el).animationPlayState), 'running')
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false)
      await diagram.screenshot({ path: out + '/tic-' + width + '.png' })
      await page.emulateMedia({ reducedMotion: 'reduce' })
      assert.equal(await stage.evaluate(el => getComputedStyle(el).animationName), 'none')
      assert.equal(await diagram.getByRole('button').isVisible(), false)
      await page.close()
    }
    console.log('PASS: sequência, pausa/retomada por teclado, movimento reduzido e largura 390/820/1440')
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exit(1) })
