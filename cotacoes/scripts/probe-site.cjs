const { chromium } = require('playwright')
const BASE = 'https://fernandocastilho.github.io/obsidian-cockpit./'
const out = (k, v) => console.log(`${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
;(async () => {
  const r = await fetch(BASE + 'estr.json?t=' + Date.now()); const j = await r.json().catch(() => null)
  out('estr.json', { status: r.status, dias: j?.series?.points?.length, primeiro: j?.series?.points?.[0], ultimo: j?.series?.points?.at(-1), stale: j?.series?.stale, erro: j?.series?.error, checkedAt: j?.series?.checkedAt })
  const pol = await (await fetch(BASE + 'policy-rates.json?t=' + Date.now())).json()
  out('policy-rates series', Object.keys(pol.series || {}))
  const b = await chromium.launch()
  for (const [w, h] of [[1280, 1000], [390, 900]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block' })
    await ctx.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }))
    const p = await ctx.newPage(), erros = [], falhas = []
    p.on('pageerror', (e) => erros.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') erros.push('console: ' + m.text().slice(0, 160)) })
    p.on('response', (r2) => { if (r2.status() >= 400) falhas.push(`${r2.status()} ${r2.url().replace(BASE, '/').slice(0, 90)}`) })
    const tag = `[${w}px]`
    await p.goto(BASE + '#juros'); await p.waitForTimeout(4000)
    const aviso = p.getByRole('dialog', { name: 'Aviso', exact: true }); if (await aviso.count()) await aviso.getByRole('button', { name: 'Entendi' }).click()
    out(tag + ' linhas_quadro', await p.locator('.executive-rates__table tbody tr').evaluateAll((els) => els.map((e) => `${e.querySelector('.executive-rates__name')?.innerText.trim().replace(/\s+/g, ' ')} | flag:${!!e.querySelector('.flag')} | ${e.querySelectorAll('td')[0]?.innerText.trim().replace(/\s+/g, ' ').slice(0, 60)}`)))
    const corpo = await p.locator('main').innerText()
    out(tag + ' reino_unido_em_juros', /Reino Unido|Bank Rate|Bank of England|BoE/.test(corpo))
    out(tag + ' titulos_graficos', await p.locator('.chart h3').evaluateAll((els) => els.map((e) => `${e.querySelector('.flag') ? '[bandeira] ' : '[sem bandeira] '}${e.innerText.trim().split('\n')[0]}`)))
    out(tag + ' estr_grafico_svg', await p.locator('.chart', { hasText: '€STR' }).first().locator('svg path.line').count().catch(() => 0))
    await p.goto(BASE + '#config'); await p.waitForTimeout(2500)
    out(tag + ' estado_dos_dados', await p.locator('.config-table').first().locator('tbody tr').evaluateAll((els) => els.map((e) => `${e.querySelector('th')?.innerText.trim()} | ${e.querySelector('.chip')?.innerText}`)).then((a) => ({ total: a.length, atualizados: a.filter((x) => /ATUALIZADO/i.test(x)).length, estr: a.find((x) => /€STR/.test(x)), fora: a.filter((x) => !/ATUALIZADO/i.test(x)) })))
    out(tag + ' governanca_linhas', await p.locator('.config-gov tbody tr').count())
    out(tag + ' rolagem_lateral', await p.evaluate(() => document.documentElement.scrollWidth > innerWidth))
    out(tag + ' erros_js', erros.slice(0, 6)); out(tag + ' falhas_http', falhas.slice(0, 8))
    await ctx.close()
  }
  await b.close()
})().catch((e) => { console.error('FALHA DA SONDA', e); process.exit(1) })
