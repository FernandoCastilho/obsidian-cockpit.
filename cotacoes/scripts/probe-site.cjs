const { chromium } = require('playwright')
const BASE = 'https://fernandocastilho.github.io/obsidian-cockpit./'
const out = (k, v) => console.log(`${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
;(async () => {
  const files = ['divida.json', 'ipca.json', 'macro.json', 'curves.json', 'bndes.json', 'moedas.json', 'indexadores.json', 'oil.json', 'commodities.json', 'freight.json', 'calendar.json', 'news.json']
  for (const f of files) {
    try { const r = await fetch(BASE + f + '?t=' + Date.now()); const j = await r.json().catch(() => null); const g = j?.generatedAt; const t = typeof g === 'number' ? g : Date.parse(g); out(`ARQ ${f}`, { status: r.status, idadeH: Number.isFinite(t) ? +((Date.now() - t) / 36e5).toFixed(1) : null, parado: !!(j?.series?.stale || (j?.stale && Object.keys(j.stale).length)) }) } catch (e) { out(`ARQ ${f}`, `ERRO ${e.message}`) }
  }
  const d = (await (await fetch(BASE + 'divida.json?t=' + Date.now())).json()).series
  out('DIVIDA', { meses: d.points.length, ultimo: d.points.at(-1) })
  const b = await chromium.launch()
  for (const [w, h] of [[1280, 900], [390, 800]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block' })
    await ctx.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }))
    const p = await ctx.newPage(), erros = [], falhas = []
    p.on('pageerror', (e) => erros.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') erros.push('console: ' + m.text().slice(0, 160)) })
    p.on('response', (r) => { if (r.status() >= 400) falhas.push(`${r.status()} ${r.url().replace(BASE, '/').slice(0, 90)}`) })
    const tag = `[${w}px]`
    await p.goto(BASE + '#resumo'); await p.waitForTimeout(3000)
    out(tag + ' titulo', await p.title())
    const aviso = p.getByRole('dialog', { name: 'Aviso', exact: true })
    out(tag + ' aviso', (await aviso.count()) ? 'aparece' : 'NÃO APARECEU')
    if (await aviso.count()) await aviso.getByRole('button', { name: 'Entendi' }).click()
    if (w >= 1000) out(tag + ' marca', (await p.locator('.topbar-brand').innerText()).replace(/\s+/g, ' '))
    out(tag + ' cards', await p.locator('.kpis .kpi').evaluateAll((els) => els.map((e) => `${e.querySelector('.kpi-name')?.innerText.trim()} ${e.querySelector('.kpi-value')?.innerText.trim()} ${e.querySelector('.kpi-spark svg path.line') ? '[gráfico]' : '[sem gráfico]'}`)))
    await p.goto(BASE + '#cenarios/outros'); await p.waitForTimeout(2500)
    out(tag + ' divida_tabela', await p.locator('.ind-table').nth(1).evaluate((e) => e.innerText.replace(/\s+/g, ' ')).catch(() => 'AUSENTE'))
    await p.goto(BASE + '#config'); await p.waitForTimeout(2500)
    out(tag + ' resumo_governanca', await p.locator('.config-resumo li').allInnerTexts().then((a) => a.map((t) => t.slice(0, 70))))
    out(tag + ' governanca_linhas', await p.locator('.config-gov tbody tr').count())
    out(tag + ' estado_dos_dados', await p.locator('.config-table').first().locator('tbody tr .chip').allInnerTexts().then((a) => a.reduce((m, s) => ({ ...m, [s]: (m[s] || 0) + 1 }), {})))
    await p.goto(BASE + '#aprender'); await p.waitForTimeout(1500)
    out(tag + ' aprender', { conceitos: await p.locator('.learn-list li').count(), topicos: await p.locator('.learn-topic').count() })
    out(tag + ' rolagem_lateral', await p.evaluate(() => document.documentElement.scrollWidth > innerWidth))
    out(tag + ' erros_js', erros.slice(0, 6)); out(tag + ' falhas_http', falhas.slice(0, 8))
    await ctx.close()
  }
  await b.close()
})().catch((e) => { console.error('FALHA DA SONDA', e); process.exit(1) })
