// Seletor de período em uma linha: abre o calendário, escolhe início e fim com dois cliques, Escape fecha só o calendário.
const { chromium } = require('playwright'), assert = require('node:assert/strict')
;(async () => {
  const b = await chromium.launch(require('./smoke-launch.cjs')()), base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5216'
  try {
    for (const width of [390, 1440]) {
      const p = await b.newPage({ viewport: { width, height: 900 }, serviceWorkers: 'block' }), errors = []
      p.on('pageerror', (e) => errors.push(e.message))
      // o histórico do Brent abre da tabela de Cenários › Commodities (gráfico compartilhado com as demais referências)
      await p.goto(base + '/#cenarios/commodities')
      await p.getByRole('button', { name: 'Petróleo Brent: abrir gráfico e histórico' }).click()
      const d = p.getByRole('dialog', { name: /histórico de Petróleo Brent/i })
      await d.waitFor()
      await d.getByRole('group', { name: 'Período da referência' }).getByRole('button', { name: '12 meses', exact: true }).click()
      // um único controle em linha no lugar de De/Até; nenhum campo nativo de data
      assert.equal(await d.locator('input[type="date"]').count(), 0)
      const trigger = d.getByRole('button', { name: /^Período da referência: de .* a .*Abrir calendário$/ })
      await trigger.waitFor()
      const before = await trigger.innerText()
      assert.match(before, /^\d{2}\/\d{2}\/\d{2} → \d{2}\/\d{2}\/\d{2}$/)
      assert.ok((await trigger.boundingBox()).height >= 44)
      await trigger.click()
      const cal = d.getByRole('dialog', { name: 'Período da referência: calendário' })
      await cal.waitFor()
      const box = await cal.boundingBox()
      assert.ok(box.x >= 0 && box.x + box.width <= width + 1, 'calendário dentro da tela')
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      assert.equal(await cal.locator('.drp-month').count(), width >= 640 ? 2 : 1)
      // 1º clique define o início e fica em destaque; Escape cancela a escolha e depois fecha só o calendário
      const days = cal.locator('.drp-cell:not(:disabled)')
      const n = await days.count(); assert.ok(n > 20)
      await days.nth(3).click()
      assert.match(await cal.locator('.drp-hint').innerText(), /Escolha a data final/)
      assert.equal(await cal.locator('.is-edge').count(), 1)
      await p.keyboard.press('Escape')
      assert.match(await cal.locator('.drp-hint').innerText(), /Escolha a data inicial/)
      await p.keyboard.press('Escape')
      await cal.waitFor({ state: 'hidden' })
      assert.equal(await d.isVisible(), true, 'Escape não fecha a tela ampliada')
      // dois cliques aplicam e fecham; segundo clique anterior ao primeiro inverte o par
      await trigger.click(); await cal.waitFor()
      const all = cal.locator('.drp-cell:not(:disabled)')
      const m = await all.count()
      await all.nth(Math.max(10, m - 6)).click()
      await all.nth(Math.max(2, m - 14)).click()
      await cal.waitFor({ state: 'hidden' })
      const after = await trigger.innerText()
      assert.notEqual(after, before)
      const [s, e] = after.split(' → ').map((x) => x.split('/').reverse().join('-'))
      assert.ok(s <= e, 'início não passa do fim')
      assert.equal(await p.evaluate(() => document.activeElement?.className.includes('drp-trigger')), true, 'foco volta ao botão')
      // teclado: setas e Enter
      await trigger.focus(); await p.keyboard.press('Enter'); await cal.waitFor()
      await p.keyboard.press('ArrowRight'); await p.keyboard.press('Enter')
      await p.keyboard.press('ArrowRight'); await p.keyboard.press('Enter')
      await cal.waitFor({ state: 'hidden' })
      await d.locator('.expandable-controls button').first().click()
      assert.deepEqual(errors, [])
    }
    console.log('PASS seletor de período em uma linha (Brent em Commodities): 390 e 1440')
  } finally { await b.close() }
})().catch((e) => { console.error(e); process.exit(1) })
