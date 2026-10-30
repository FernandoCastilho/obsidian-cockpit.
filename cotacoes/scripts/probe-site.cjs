const { chromium } = require('playwright')
const BASE = 'https://fernandocastilho.github.io/obsidian-cockpit./'
;(async () => {
  const b = await chromium.launch()
  for (const [w, h] of [[390, 800], [1280, 900], [390, 800]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block' })
    await ctx.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }))
    const p = await ctx.newPage(), falhas = []
    p.on('response', (r) => { if (/intraday|quotes|history|raw\.githubusercontent/.test(r.url())) falhas.push(`${r.status()} ${r.url().slice(0, 100)} ${r.headers()['content-length'] || ''}`) })
    await p.goto(BASE + '#resumo')
    const aviso = p.getByRole('dialog', { name: 'Aviso', exact: true }); await aviso.waitFor(); await aviso.getByRole('button', { name: 'Entendi' }).click()
    for (const espera of [1500, 3000, 6000, 12000]) {
      await p.waitForTimeout(espera === 1500 ? 1500 : espera - ({ 3000: 1500, 6000: 3000, 12000: 6000 })[espera])
      const r = await p.locator('.kpis .kpi').evaluateAll((els) => els.map((e) => `${e.querySelector('.kpi-name')?.innerText.trim()}:${e.querySelector('.kpi-spark svg path.line') ? 'S' : '-'}`).join(' '))
      console.log(`[${w}px] +${espera}ms ${r}`)
    }
    console.log(`[${w}px] requisições de dados:`, JSON.stringify(falhas))
    await ctx.close()
  }
  await b.close()
})().catch((e) => { console.error('FALHA', e); process.exit(1) })
