// Aba BNDES: TFB por prazo e liberação (8 linhas), variações, seleção da série e histórico com período; menu, atalho e comando.
const { chromium } = require('playwright'), assert = require('node:assert/strict')
const day = (i) => new Date(Date.UTC(2024, 0, 1) + i * 864e5).toISOString().slice(0, 10)
const wk = (iso) => { const d = new Date(`${iso}T12:00:00Z`).getUTCDay(); return d !== 0 && d !== 6 }
const points = (base, step) => Array.from({ length: 1000 }, (_, i) => day(i)).filter(wk).map((d, i) => [d, Math.round((base + i * step) * 1e4) / 1e4])
;(async () => {
  const b = await chromium.launch(require('./smoke-launch.cjs')()), base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5216'
  try {
    for (const width of [390, 1280]) {
      const series = {}
      for (const [prazo, add] of [[36, 0], [60, 0.5], [84, 1]]) for (const liberacao of [30, 90]) series[`TFB_${prazo}_${liberacao}`] = { prazo, liberacao, points: points(10 + add + (liberacao === 90 ? 0.2 : 0), 0.02) }
      const months = Array.from({ length: 60 }, (_, i) => [new Date(Date.UTC(2021, i, 1)).toISOString().slice(0, 10), Math.round((6 + i * 0.05) * 100) / 100])
      const file = { schemaVersion: 1, generatedAt: Date.now(), series, tlp: { code: 27572, unit: 'a.a.', points: months }, stale: {}, errors: [] }
      const p = await b.newPage({ viewport: { width, height: 900 }, serviceWorkers: 'block' }), errors = []
      p.on('pageerror', (e) => errors.push(e.message))
      await p.route('**/bndes.json*', (r) => r.fulfill({ json: file }))
      await p.route('**/indexadores.json*', (r) => r.fulfill({ json: { schemaVersion: 1, generatedAt: Date.now(), series: {}, stale: {}, errors: [] } }))
      await p.goto(base + '/#bndes')
      const table = p.locator('.bn-table').first(); await table.waitFor()
      assert.equal(await table.locator('tbody tr').count(), 8, '4 prazos x 2 liberações')
      assert.deepEqual(await table.locator('thead th').allInnerTexts().then((a) => a.map((t) => t.toLowerCase())), ['prazo do financiamento', 'liberação', 'taxa', 'dia', 'mês', 'ano', 'data'])
      const row = (n) => table.locator('tbody tr').nth(n)
      assert.match(await row(0).innerText(), /até 36 meses[\s\S]*30 dias[\s\S]*% a\.a\./)
      assert.match(await row(0).innerText(), /▲ \+0,02 p\.p\./, 'variação no dia com seta')
      assert.match(await row(6).innerText(), /84 a 120 meses[\s\S]*indisponível/, 'série ausente fica marcada, não vira zero')
      // escolher uma linha leva o histórico para aquela série
      await row(3).getByRole('button').click()
      assert.match(await p.locator('.desk-panel header small', { hasText: /TFB ·/ }).innerText(), /36 a 60 meses · liberação em 90 dias/)
      await p.getByRole('group', { name: 'Prazo do financiamento' }).getByRole('button', { name: '60 a 84 meses' }).click()
      await p.getByRole('group', { name: 'Liberação dos recursos' }).getByRole('button', { name: 'Liberação em 30 dias' }).click()
      assert.match(await p.locator('.desk-panel header small', { hasText: /TFB ·/ }).innerText(), /60 a 84 meses · liberação em 30 dias/)
      await p.getByRole('group', { name: 'Período da TFB' }).getByRole('button', { name: '3 meses' }).click()
      await p.locator('svg').last().waitFor()
      assert.match(await p.locator('.bn-range').first().innerText(), /No período: \d{2}\/\d{2}\/\d{4} [\d,]+% → \d{2}\/\d{2}\/\d{4} [\d,]+% a\.a\. \(\+[\d,]+ p\.p\.\)/)
      assert.ok(await p.locator('.bn-obs').first().locator('tbody tr').count() > 20)
      assert.match(await p.locator('.bn-obs caption').first().innerText(), /mais recentes primeiro/)
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'sem rolagem horizontal da página')
      // TLP: valor vigente, variações e histórico mensal próprio
      const tlp = p.locator('.bn-tlp'); await tlp.waitFor()
      assert.match(await tlp.locator('tbody tr').innerText(), /01\/12\/2025[\s\S]*8,95% a\.a\.[\s\S]*▲ \+0,05 p\.p\.[\s\S]*▲ \+0,60 p\.p\.[\s\S]*\d{2}\/\d{2}\/\d{4}/)
      await p.getByRole('group', { name: 'Período da TLP' }).getByRole('button', { name: 'Tudo' }).click()
      assert.match(await p.locator('.bn-range').last().innerText(), /No período: 01\/01\/2021 6,00% → 01\/12\/2025 8,95% a\.a\./)
      assert.match(await p.locator('.bn-obs caption').last().innerText(), /TLP/)
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'sem rolagem horizontal da página')
      // TFB saiu do quadro de indexadores (aba Juros)
      await p.goto(base + '/#juros'); await p.locator('.idx-table').waitFor()
      assert.doesNotMatch(await p.locator('.idx-table').innerText(), /TFB/)
      if (width >= 900) { await p.keyboard.press('Alt+5'); await p.waitForURL('**/#bndes') }
      assert.deepEqual(errors, [])
    }
    console.log('PASS aba BNDES: TFB por prazo e liberação, variações, histórico e menu (390 e 1280)')
  } finally { await b.close() }
})().catch((e) => { console.error(e); process.exit(1) })
