// Local/CI build only. No publication, remote writes or live source mutation.
const { chromium } = require('playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const studies = require('../src/sectorStudies/studies.json')
const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:8768'
const out = process.env.RESEARCHED_SECTORS_QA_OUTPUT || 'workspace-qa/researched-sectors'
const report = { studies: studies.length, results: [], errors: [] }
;(async () => {
  const { CATALOGO_SETORIAL } = await import('../src/centralSetorial.js')
  const catalog = CATALOGO_SETORIAL.flatMap(group => group.topics.map((title, topicIndex) => ({ group: group.id, topicIndex, title })))
  assert.equal(catalog.length, 67, 'catálogo completo, incluindo o piloto TIC')
  assert.ok(studies.length <= 66, 'até 66 estudos adicionais; lote parcial aprovado é válido')
  const included = new Set(studies.map(study => `${study.group}/${study.topicIndex}`))
  assert.equal(included.size, studies.length, 'nenhum estudo duplicado')
  const pending = catalog.filter(study => `${study.group}/${study.topicIndex}` !== 'tic/0' && !included.has(`${study.group}/${study.topicIndex}`))
  report.pending = pending.length
  fs.mkdirSync(out, { recursive: true })
  const browser = await chromium.launch(require('./smoke-launch.cjs')())
  let activePage
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, serviceWorkers: 'block', reducedMotion: 'no-preference' })
      await context.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort())
      await context.route('**/recado.json*', route => route.fulfill({ json: { ativo: false } }))
      const page = await context.newPage()
      activePage = page
      page.on('pageerror', error => report.errors.push({ width, url: page.url(), message: error.message }))
      const capturedGroups = new Set()
      for (const study of studies) {
        const key = `${study.group}-${study.topicIndex}`
        const url = `${base}/#setores/topico/${study.group}/${study.topicIndex}`
        try {
          await page.goto(url)
          const article = page.locator('.central-detail .sector-study')
          await article.getByRole('heading', { name: study.title, exact: true }).waitFor()
          assert.equal(await article.locator('.study-canvas-questions > li').count(), study.canvasQuestions.length, key)
          assert.equal(await article.locator('.sector-chain-node').count(), study.diagram.nodes.length, key)
          assert.equal(await article.locator('.sector-chain-edges > li').count(), study.diagram.edges.length, key)
          assert.equal(await article.locator('.study-nav button').count(), study.sections.length, key)
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `overflow ${width} ${key}`)
          for (const chart of study.charts) {
            const panel = article.locator('section.study-chart').filter({ has: page.locator(`[id="chart-${chart.id}"]`) })
            await panel.getByText('Ver todos os dados e método', { exact: true }).click()
            assert.equal(await panel.locator('thead th').first().innerText(), chart.categoryLabel || 'Ano', key)
            assert.equal(await panel.locator('tbody tr').count(), chart.years.length, key)
            for (let seriesIndex = 0; seriesIndex < chart.series.length; seriesIndex++) {
              if (chart.series.length > 1) await panel.getByRole('combobox').selectOption(String(seriesIndex))
              const values = chart.series[seriesIndex].values
              const signed = chart.series.some(series => series.values.some(value => value < 0))
              assert.deepEqual(await panel.locator('.study-bar-row strong').allTextContents(), values.map(value => value.toLocaleString('pt-BR', { signDisplay: signed ? 'exceptZero' : 'auto' })), key)
              assert.equal(await panel.locator('.research-bar-negative').count(), values.filter(value => value < 0).length, key)
              if (signed) assert.ok((await panel.locator('.research-bar-axis').innerText()).includes('0'), key)
              const geometry = await panel.locator('.research-bar').evaluateAll(elements => elements.map(element => ({ left: parseFloat(element.style.left), width: parseFloat(element.style.width) })))
              geometry.forEach((bar, index) => { assert.ok(bar.left >= -0.01 && bar.left + bar.width <= 100.01, key); if (values[index] < 0) assert.ok(bar.left < 50 && Math.abs(bar.left + bar.width - 50) < .01, key) })
            }
          }
          const audio = article.locator('audio')
          if (study.audio?.src) {
            assert.equal(await audio.count(), 1, key)
            await audio.evaluate(element => element.load())
            await page.waitForFunction(() => { const audio = document.querySelector('.sector-study audio'); return audio && audio.readyState >= 1 && Number.isFinite(audio.duration) && audio.duration > 0 })
            assert.equal(await audio.evaluate(element => element.playbackRate), 1.25, key)
            assert.equal(await audio.evaluate(element => element.preservesPitch), true, key)
            assert.match(await article.innerText(), /Voz sintética/)
            await article.getByLabel('Velocidade').selectOption('1.5')
            assert.equal(await audio.evaluate(element => element.playbackRate), 1.5, key)
            await article.getByText('Ler transcrição', { exact: true }).click()
          } else {
            assert.equal(await audio.count(), 0, key)
            assert.match(await article.innerText(), /Áudio produzido ainda não disponível/)
            await article.getByText('Ler síntese em texto', { exact: true }).click()
          }
          if (!capturedGroups.has(study.group)) {
            capturedGroups.add(study.group)
            await article.locator('.study-canvas-callout').screenshot({ path: path.join(out, `${key}-${width}-canvas.png`) })
            await article.locator('.researched-flow').screenshot({ path: path.join(out, `${key}-${width}-cadeia.png`) })
          }
          if (study.group === 'tic' && study.topicIndex === 6) await article.locator('section.study-chart').last().screenshot({ path: path.join(out, `${key}-${width}-mercados.png`) })
          if (study.charts.some(chart => chart.series.some(series => series.values.some(value => value < 0))) && !fs.existsSync(path.join(out, `bipolar-${width}.png`))) await article.locator('section.study-chart').last().screenshot({ path: path.join(out, `bipolar-${width}.png`) })
          report.results.push({ width, study: key, status: 'passed' })
        } catch (error) {
          report.results.push({ width, study: key, status: 'failed', message: error.message })
          await page.screenshot({ path: path.join(out, `${key}-${width}-failure.png`), fullPage: true }).catch(() => {})
          throw error
        }
      }
      for (const [index, study] of pending.entries()) {
        await page.goto(`${base}/#setores/topico/${study.group}/${study.topicIndex}`)
        const detail = page.locator('.central-detail')
        await detail.getByRole('heading', { name: study.title, exact: true }).waitFor()
        assert.equal(await detail.locator('.sector-study').count(), 0, 'recorte excluído não pode expor rascunho')
        assert.match(await detail.innerText(), /Estudo setorial não incluído ainda/)
        assert.equal(await detail.locator('audio').count(), 0)
        if (index === 0) await detail.screenshot({ path: path.join(out, `pending-${width}.png`) })
        report.results.push({ width, study: `${study.group}-${study.topicIndex}`, status: 'pending-honest' })
      }
      await page.goto(`${base}/#setores/topico/tic/0`)
      await page.locator('#tic-study-title').waitFor()
      assert.equal(await page.locator('.tic-flow-stage').count(), 13, 'piloto TIC preservado')
      if (!studies.length) { await context.close(); continue }
      const selected = studies.find(study => study.group === 'base-florestal' && study.topicIndex === 3) || studies[0]
      const alternate = studies.find(study => study.title !== selected.title) || null
      await page.goto(`${base}/#setores/topico/${selected.group}/${selected.topicIndex}`)
      const diagram = page.locator('.researched-flow')
      await diagram.waitFor()
      const stage = diagram.locator('.sector-chain-node').first()
      assert.equal(await stage.evaluate(element => getComputedStyle(element).animationName), 'sector-chain-step')
      await diagram.getByRole('button', { name: 'Pausar animação do diagrama' }).click()
      assert.equal(await stage.evaluate(element => getComputedStyle(element).animationPlayState), 'paused')
      await diagram.getByRole('button', { name: 'Retomar animação do diagrama' }).click()
      assert.equal(await stage.evaluate(element => getComputedStyle(element).animationPlayState), 'running')
      await page.emulateMedia({ reducedMotion: 'reduce' })
      assert.equal(await stage.evaluate(element => getComputedStyle(element).animationName), 'none')
      assert.equal(await diagram.getByRole('button', { name: 'Maximizar diagrama' }).isVisible(), true)
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await diagram.getByRole('button', { name: 'Maximizar diagrama' }).click()
      const modal = page.getByRole('dialog', { name: 'Diagrama em tela cheia' })
      await modal.waitFor()
      assert.equal(await modal.locator('button:visible').count(), 1)
      const bounds = await modal.locator('.researched-flow').boundingBox()
      assert.ok(bounds.x >= -1 && bounds.y >= -1 && bounds.x + bounds.width <= width + 1 && bounds.y + bounds.height <= 1001, JSON.stringify(bounds))
      await modal.getByRole('button', { name: 'Ativar laser' }).click()
      await page.mouse.move(width / 2, 400)
      assert.equal(await modal.locator('.tic-flow-laser').isVisible(), true)
      await page.keyboard.press('Tab')
      assert.equal(await modal.getByRole('button', { name: 'Desativar laser' }).evaluate(element => element === document.activeElement), true)
      await page.keyboard.press('p')
      assert.equal(await modal.locator('.sector-chain-node').first().evaluate(element => getComputedStyle(element).animationPlayState), 'paused')
      await modal.screenshot({ path: path.join(out, `fullscreen-${width}.png`) })
      await page.keyboard.press('Escape')
      await modal.waitFor({ state: 'hidden' })
      await page.waitForFunction(() => !history.state?.sectorDiagramFullscreen)
      assert.equal(await page.locator('#root').evaluate(element => element.inert), false)
      await diagram.getByRole('button', { name: 'Maximizar diagrama' }).click()
      await modal.waitFor()
      await page.emulateMedia({ reducedMotion: 'reduce' })
      assert.equal(await modal.locator('.sector-chain-node').first().evaluate(element => getComputedStyle(element).animationName), 'none')
      await page.goBack()
      await modal.waitFor({ state: 'hidden' })
      const destination = alternate || { group: 'tic', topicIndex: 0, title: 'Integração de TI e infraestrutura digital' }
      const search = page.getByLabel('Buscar setor ou subsetor')
      await search.fill(destination.title)
      await page.locator('.central-catalog').getByRole('button', { name: destination.title, exact: true }).first().click()
      await page.waitForURL(`**/#setores/topico/${destination.group}/${destination.topicIndex}`)
      await page.locator('.sector-study').getByRole('heading', { name: destination.title, exact: true }).waitFor()
      await page.goBack()
      await page.locator('.sector-study').getByRole('heading', { name: selected.title, exact: true }).waitFor()
      await page.goForward()
      await page.locator('.sector-study').getByRole('heading', { name: destination.title, exact: true }).waitFor()
      await page.reload()
      await page.locator('.sector-study').getByRole('heading', { name: destination.title, exact: true }).waitFor()
      await context.close()
    }
    assert.deepEqual(report.errors, [], 'erros JavaScript no navegador')
    console.log(`PASS: ${studies.length} estudos e ${pending.length} placeholders em desktop/mobile; piloto TIC preservado; dados, áudio, apresentação e navegação`)
  } catch (error) {
    report.failure = error.message
    if (activePage && !activePage.isClosed()) await activePage.screenshot({ path: path.join(out, 'interaction-failure.png'), fullPage: true }).catch(() => {})
    throw error
  } finally {
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2))
    await browser.close()
  }
})().catch(error => { console.error(error); process.exit(1) })
