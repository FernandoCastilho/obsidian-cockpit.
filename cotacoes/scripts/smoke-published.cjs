// Read-only browser verification of the delivered UI. No source fixtures or notification grants.
const { chromium } = require('playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const base = (process.env.SMOKE_PUBLISHED_URL || process.env.SMOKE_BASE_URL || 'http://127.0.0.1:8768').replace(/\/$/, '')
const out = process.env.PUBLISHED_QA_OUTPUT || 'workspace-qa/published'
const links = {
  'Materiais Industrializados': 'https://www.bndes.gov.br/wps/portal/site/home/financiamento/produto/finame-materiais-industrializados',
  'Máquinas e Equipamentos': 'https://www.bndes.gov.br/wps/portal/site/home/financiamento/produto/bndes-finame-bk-aquisicao-comercializacao',
}
;(async () => {
  fs.mkdirSync(out, { recursive: true })
  const browser = await chromium.launch(require('./smoke-launch.cjs')())
  const report = []
  let page
  try {
    for (const width of [390, 820, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, colorScheme: 'light', reducedMotion: 'reduce', serviceWorkers: 'block', permissions: [] })
      page = await context.newPage()
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      const visit = async (route, selector) => {
        await page.goto(base + '/?qa=' + Date.now() + '#' + route, { waitUntil: 'domcontentloaded' })
        await page.locator(selector).first().waitFor()
        const notice = page.getByRole('dialog', { name: 'Aviso', exact: true })
        if (await notice.isVisible()) await notice.getByRole('button', { name: 'Entendi', exact: true }).click()
        await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))) })
      }
      const contained = async label => {
        const geometry = await page.evaluate(() => ({ width: innerWidth, document: document.documentElement.scrollWidth }))
        assert.ok(geometry.document <= geometry.width + 1, label + ': ' + JSON.stringify(geometry))
      }

      await visit('calculadora/finimp', '#fi-currency')
      assert.deepEqual(await page.locator('#fi-currency option').allTextContents(), ['USD', 'EUR', 'JPY', 'CNH', 'BRL'])
      for (const code of ['JPY', 'CNH']) {
        await page.locator('#fi-currency').selectOption(code)
        assert.equal(await page.locator('#fi-currency').inputValue(), code)
      }
      await contained('FINIMP')
      await page.screenshot({ path: path.join(out, width + '-finimp.png') })

      await visit('calculadora/conta-garantida', '#cg-rate')
      assert.equal(await page.locator('#cg-status, #cg-rateBase, #cg-conversion').count(), 0)
      assert.equal(await page.locator('#cg-taxProfile').count(), 1)
      assert.equal(await page.getByLabel('Taxa do contrato (% a.m.)', { exact: true }).count(), 1)
      await contained('Conta Garantida')

      await visit('aprender', '.learn-group')
      assert.equal(await page.locator('.learn-group').count(), 7)
      assert.equal(await page.locator('.learn-group[open]').count(), 0)
      await page.getByRole('button', { name: 'Expandir todas', exact: true }).click()
      await page.waitForFunction(() => document.querySelectorAll('.learn-group[open]').length === 7)
      for (const term of ['Escala 6x1', 'Reforma tributária', 'Split payment', 'Dividendos']) {
        assert.equal(await page.locator('.learn-list li button').filter({ hasText: new RegExp(term, 'i') }).count(), 1, term)
      }
      assert.equal(await page.locator('.learn-list li').count(), 25)
      assert.equal(await page.locator('.learn-list li button').filter({ hasText: 'Regime FÁCIL' }).count(), 1)
      await page.getByRole('button', { name: 'Recolher todas', exact: true }).click()
      await page.waitForFunction(() => document.querySelectorAll('.learn-group[open]').length === 0)
      await contained('Aprender')
      await page.screenshot({ path: path.join(out, width + '-aprender.png') })

      await visit('bndes', '.bn')
      for (const [name, href] of Object.entries(links)) {
        const link = page.getByRole('navigation', { name: 'Linhas oficiais BNDES' }).getByRole('link', { name: new RegExp(name) })
        assert.equal(await link.count(), 1)
        assert.equal(await link.getAttribute('href'), href)
      }
      await contained('BNDES')
      await page.screenshot({ path: path.join(out, width + '-bndes.png') })

      await visit('resumo', '#r-moedas')
      await page.getByRole('tab', { name: 'Google Trends', exact: true }).click()
      await page.locator('.google-trends').waitFor()
      assert.match(await page.locator('.google-trends').innerText(), /8h e 15h/)
      await contained('Google Trends')

      await visit('config', '.config-gov')
      await page.waitForFunction(() => document.documentElement.dataset.theme === 'light')
      await page.emulateMedia({ colorScheme: 'dark' })
      await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark')
      await contained('Configurações')
      const refresh = page.getByRole('button', { name: 'Atualizar Governança dos dados', exact: true })
      await refresh.locator('..').locator('.refresh-stamp').waitFor()
      const box = await refresh.boundingBox()
      assert.ok(box && box.width >= 44 && box.height >= 44 && box.x >= 0 && box.x + box.width <= width + 1, 'Governança: botão inteiro dentro da tela')
      await page.screenshot({ path: path.join(out, width + '-config.png') })
      assert.deepEqual(errors, [])
      report.push({ width, passed: true, checks: ['FINIMP JPY/CNH', 'Conta Garantida % a.m. e IOF', 'Aprender 25/7 e categorias', 'dois links BNDES', 'Google Trends', 'tema automático', 'Governança sem overflow'], errors })
      await context.close()
      page = null
    }
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({ base, checkedAt: new Date().toISOString(), report }, null, 2))
    console.log('PASS versão entregue: ' + JSON.stringify(report))
  } catch (error) {
    await page?.screenshot({ path: path.join(out, 'failure.png'), fullPage: true }).catch(() => {})
    throw error
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exit(1) })
