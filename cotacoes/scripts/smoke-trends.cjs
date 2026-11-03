const { chromium } = require('playwright')
const fs = require('node:fs')
const assert = require('node:assert/strict')
;(async () => {
  const browser = await chromium.launch(require('./smoke-launch.cjs')())
  const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5279'
  const out = process.env.TRENDS_QA_OUTPUT || 'workspace-qa/trends'
  fs.mkdirSync(out, { recursive: true })
  try {
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 1100 }, serviceWorkers: 'block' })
      const errors = []
      page.on('pageerror', e => errors.push(e.message))
      await page.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort())
      await page.goto(base)
      await page.getByRole('tab', { name: 'Google Trends', exact: true }).click()
      const panel = page.locator('.google-trends')
      await panel.getByRole('heading', { name: 'O que está despertando atenção' }).waitFor()
      await panel.getByRole('img', { name: /Interesse em capital de giro/ }).waitFor()
      for (const name of ['Investimento', 'Juros, câmbio e comex', 'Custos', 'Reforma tributária', 'Crédito e caixa']) {
        await panel.getByRole('button', { name, exact: true }).click()
        assert.equal(await panel.getByRole('button', { name, exact: true }).getAttribute('aria-pressed'), 'true')
        assert.match(await panel.innerText(), /Hipótese para a conversa/)
      }
      await panel.getByRole('combobox').selectOption('today 12-m')
      assert.match(await panel.innerText(), /sem snapshot local/)
      assert.equal(await panel.locator('figure svg').count(), 0)
      await panel.getByRole('combobox').selectOption('today 3-m')
      assert.equal(await panel.locator('figure svg').count(), 1)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      assert.deepEqual(errors, [])
      await panel.screenshot({ path: `${out}/${width}-trends.png` })
      await page.close()
      console.log(`Trends ${width}px: grupos, períodos, snapshot e ausência de overflow OK`)
    }
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exit(1) })
