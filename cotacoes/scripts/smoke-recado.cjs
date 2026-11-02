// Recado da administração: pop-up quando recado.json está ligado, espera o aviso inicial, aparece uma vez por recado e volta quando o texto muda.
const { chromium } = require('playwright'), assert = require('node:assert/strict')
;(async () => {
  const b = await chromium.launch(require('./smoke-launch.cjs')()), base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5216'
  try {
    for (const width of [390, 1280]) {
      const ctx = await b.newContext({ viewport: { width, height: 800 }, serviceWorkers: 'block' }), p = await ctx.newPage(), errors = []
      p.on('pageerror', (e) => errors.push(e.message))
      await ctx.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false })) // o aviso inicial e o recado não aparecem para navegador automatizado
      // A fila completa é coberta em smoke-conceito-diario; aqui o conceito já foi lido hoje.
      await ctx.addInitScript(() => localStorage.setItem('aprender-conceito-dia', new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())))
      let file = { ativo: true, nivel: 'urgente', titulo: 'Manutenção hoje', texto: 'O painel fica fora do ar das 18h às 19h.\nObrigado.' }
      await ctx.route('**/recado.json*', (r) => r.fulfill({ json: file }))
      await p.goto(base + '/#resumo')
      // primeiro o aviso inicial; o recado espera ele fechar
      const aviso = p.locator('dialog.aviso-inicial:not(.recado)'); await aviso.waitFor()
      await p.waitForTimeout(1500)
      assert.equal(await p.locator('dialog.recado').count(), 0, 'recado não se sobrepõe ao aviso inicial')
      await aviso.getByRole('button', { name: 'Entendi' }).click()
      const d = p.getByRole('dialog', { name: 'Manutenção hoje' }); await d.waitFor()
      assert.match(await d.innerText(), /urgente da administração[\s\S]*18h às 19h\.\nObrigado\./i)
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      await d.getByRole('button', { name: 'Entendi' }).click(); await d.waitFor({ state: 'detached' })
      // mesmo recado: não volta ao reabrir
      await p.reload(); await p.locator('dialog.aviso-inicial:not(.recado)').getByRole('button', { name: 'Entendi' }).click()
      await p.waitForTimeout(1500)
      assert.equal(await p.locator('dialog.recado').count(), 0, 'recado já visto não volta')
      // recado novo (texto mudou) chega sem recarregar, na próxima leitura (relê a cada minuto)
      file = { ...file, nivel: 'info', titulo: 'Novo indicador', texto: 'A aba Setores ganhou o preço do alumínio.' }
      await p.clock.install(); await p.clock.fastForward('01:05')
      await p.evaluate(() => window.dispatchEvent(new Event('focus')))
      const n = p.getByRole('dialog', { name: 'Novo indicador' }); await n.waitFor({ timeout: 10000 })
      assert.match(await n.innerText(), /^Recado da administração/i)
      await p.keyboard.press('Escape'); await n.waitFor({ state: 'detached' })
      // desligado: nada aparece
      file = { ativo: false, titulo: 'x', texto: 'y' }
      await p.evaluate(() => localStorage.clear()); await p.reload(); await p.locator('dialog.aviso-inicial:not(.recado)').getByRole('button', { name: 'Entendi' }).click()
      await p.waitForTimeout(1500)
      assert.equal(await p.locator('dialog.recado').count(), 0, 'recado desligado não aparece')
      assert.deepEqual(errors, [])
      await ctx.close()
      console.log(width + ' PASS recado da administração: espera o aviso, aparece uma vez, recado novo sem recarregar, desligado não aparece')
    }
  } finally { await b.close() }
})().catch((e) => { console.error(e); process.exit(1) })
