const { chromium } = require('playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

;(async () => {
  const browser = await chromium.launch(require('./smoke-launch.cjs')())
  const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:8773'
  const out = process.env.SETORES_QA_OUTPUT || 'workspace-qa/setores'
  fs.mkdirSync(out, { recursive: true })
  try {
    for (const width of [390, 820, 1280]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 }, hasTouch: true, serviceWorkers: 'block', reducedMotion: 'reduce' })
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      const now = Date.now()
      await page.clock.setFixedTime(now)
      const sectorFixture = { schemaVersion: 1, generatedAt: new Date(now).toISOString(), topics: { agricultura: { items: [] } }, sourceStates: {} }
      await page.route('**/sector-news.json*', route => route.fulfill({ json: sectorFixture }))
      try {
        await page.goto(base + '/#setores')
        await page.locator('.central-setorial').getByRole('heading', { name: 'Central de setores', exact: true }).waitFor()
        assert.equal(await page.getByRole('button', { name: 'Visão bancária', exact: true }).count(), 0)
        assert.equal(await page.getByRole('button', { name: 'Referência B3', exact: true }).count(), 0)
        const search = page.getByLabel('Buscar setor ou subsetor')
        await search.fill('compensados')
        await page.locator('.central-setorial').getByRole('button', { name: 'Compensados', exact: true }).click()
        await page.waitForURL('**/#setores/topico/base-florestal/3')
        const detail = page.locator('.central-detail')
        await detail.getByRole('heading', { name: 'Compensados', exact: true }).waitFor()
        await page.reload()
        await detail.getByRole('heading', { name: 'Compensados', exact: true }).waitFor()
        assert.match(page.url(), /#setores\/topico\/base-florestal\/3$/)
        assert.equal(await detail.locator('ol > li').count(), 9)
        await page.waitForFunction(() => document.activeElement?.classList.contains('central-detail'))
        // O detalhe deve ser levado ao campo visual, especialmente na tela estreita.
        const visible = await detail.evaluate(el => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < window.innerHeight })
        assert.equal(visible, true, 'resultado selecionado visível sem rolagem manual')
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, 'sem transbordamento horizontal')
        await page.screenshot({ path: path.join(out, `central-${width}.png`), fullPage: true })

        await search.fill('móveis')
        const moveis = page.locator('.central-setorial').getByRole('button', { name: 'Móveis', exact: true })
        await moveis.focus(); await page.keyboard.press('Enter')
        await page.waitForURL('**/#setores/topico/base-florestal/5')
        await detail.getByRole('heading', { name: 'Móveis', exact: true }).waitFor()
        await page.goBack(); await page.waitForURL('**/#setores/topico/base-florestal/3')
        await detail.getByRole('heading', { name: 'Compensados', exact: true }).waitFor()
        await page.goForward(); await page.waitForURL('**/#setores/topico/base-florestal/5')
        await detail.getByRole('heading', { name: 'Móveis', exact: true }).waitFor()

        await page.keyboard.press('Control+Shift+F')
        const dialog = page.getByRole('dialog', { name: 'Buscar no painel' })
        await dialog.getByRole('searchbox').fill('compensados')
        const result = dialog.getByRole('region', { name: 'Resultados em Setores' }).getByRole('button', { name: /Compensados/i }).first()
        await result.waitFor()
        await result.focus(); await page.keyboard.press('Enter')
        await page.waitForURL('**/#setores/topico/base-florestal/3')
        await detail.getByRole('heading', { name: 'Compensados', exact: true }).waitFor()

        await page.goto(base + '/#setores/agricultura')
        const coverage = page.getByRole('region', { name: 'Notícias e comunicados · últimos 5 dias' })
        await coverage.getByRole('status').filter({ hasText: /^Cobertura ainda não disponível:/ }).waitFor()
        assert.equal(await coverage.locator('.sector-news-list').count(), 0, 'não inventa notícias ausentes')
        assert.doesNotMatch(await coverage.innerText(), /Arquivo de notícias inválido|Nenhuma manchete relevante encontrada nas fontes consultadas/)
        await coverage.getByText('Fontes consultadas e limites da cobertura', { exact: true }).click()
        assert.equal(await coverage.getByRole('link', { name: 'Ministério da Agricultura e Pecuária', exact: true }).count(), 1)
        assert.match(await coverage.locator('details').innerText(), /não disponível/)

        await page.goto(base + '/#setores/b3/financeiro')
        await page.locator('.central-setorial > p[role="status"]').filter({ hasText: /antiga classificação B3 foi substituída/ }).waitFor()
        await page.locator('.central-detail').getByRole('heading', { name: 'Escolha um subsetor', exact: true }).waitFor()
        assert.equal(await page.getByRole('button', { name: 'Referência B3', exact: true }).count(), 0)
        for (const button of await page.locator('.central-setorial button:visible').all()) {
          const box = await button.boundingBox()
          assert.ok(box && box.height >= 44, `alvo menor que 44px: ${await button.innerText()}`)
        }
        await page.locator('.central-setorial').getByRole('button', { name: 'Cobre', exact: true }).click()
        await page.waitForURL('**/#setores/cobre')
        await page.getByRole('heading', { name: /Preparar a visita · Cobre/ }).waitFor()
        await page.getByRole('button', { name: '← Central de setores' }).click()
        await page.waitForURL('**/#setores/central')
        await page.locator('.central-existing summary').click()
        await page.locator('.central-setorial').getByRole('button', { name: 'Veículos pesados', exact: true }).click()
        await page.waitForURL('**/#setores/veiculos-pesados')
        await page.getByRole('region', { name: 'Indicadores de veículos pesados' }).waitFor()
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, 'roteiro sem transbordamento horizontal')
        assert.deepEqual(errors, [])
        console.log(`PASS central setorial ${width}`)
      } catch (error) {
        await page.screenshot({ path: path.join(out, `central-erro-${width}.png`), fullPage: true }).catch(() => {})
        throw error
      } finally { await page.close() }
    }
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exit(1) })
