const { chromium } = require('playwright')
const BASE = 'https://fernandocastilho.github.io/obsidian-cockpit./'
const out = (k, v) => console.log(`${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
const age = (t) => (Number.isFinite(t) ? `${((Date.now() - t) / 36e5).toFixed(1)} h` : '?')
;(async () => {
  // 1. arquivos de dados publicados
  const files = ['divida.json', 'ipca.json', 'ipca-groups.json', 'macro.json', 'curves.json', 'bndes.json', 'moedas.json', 'indexadores.json', 'policy-rates.json', 'oil.json', 'commodities.json', 'freight.json', 'freight-jp.json', 'calendar.json', 'news.json', 'manifest.webmanifest']
  const data = {}
  for (const f of files) {
    try { const r = await fetch(BASE + f + '?t=' + Date.now()); const txt = await r.text(); let j = null; try { j = JSON.parse(txt) } catch { /* não JSON */ } data[f] = j; out(`ARQ ${f}`, { status: r.status, bytes: txt.length, generatedAt: j?.generatedAt ? new Date(j.generatedAt).toISOString() : null, idade: age(typeof j?.generatedAt === 'number' ? j.generatedAt : Date.parse(j?.generatedAt)) }) } catch (e) { out(`ARQ ${f}`, `ERRO ${e.message}`) }
  }
  const d = data['divida.json']?.series
  out('DIVIDA', d ? { id: d.id, meses: d.points?.length, primeiro: d.points?.[0], ultimo: d.points?.at(-1), stale: d.stale, error: d.error, checkedAt: d.checkedAt } : 'AUSENTE')
  const ip = data['ipca.json']?.series; out('IPCA', ip ? { meses: ip.points?.length, ultimo: ip.points?.at(-1), stale: ip.stale, error: ip.error } : 'AUSENTE')
  const m = data['macro.json']; out('MACRO', m ? { cdi: m.cdi?.length, cdiUltimo: m.cdi?.at(-1), selic: m.selic?.length, selicUltimo: m.selic?.at(-1), stale: m.stale, errors: m.errors } : 'AUSENTE')
  const stales = Object.entries(data).filter(([, j]) => j?.series?.stale || (j?.stale && Object.keys(j.stale).length)).map(([f, j]) => [f, j.series?.error || j.stale])
  out('FONTES_COM_DADO_PARADO', stales)

  // 2. o app real, em navegador
  const b = await chromium.launch()
  for (const [w, h] of [[1280, 900], [390, 800]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, serviceWorkers: 'block' })
    await ctx.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }))
    const p = await ctx.newPage(), erros = [], falhas = []
    p.on('pageerror', (e) => erros.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') erros.push('console: ' + m.text().slice(0, 160)) })
    p.on('response', (r) => { if (r.status() >= 400) falhas.push(`${r.status()} ${r.url().replace(BASE, '/').slice(0, 90)}`) })
    const tag = `[${w}px]`
    await p.goto(BASE + '#resumo'); await p.waitForTimeout(2500)
    out(tag + ' titulo', await p.title())
    const aviso = p.getByRole('dialog', { name: 'Aviso', exact: true })
    out(tag + ' aviso', (await aviso.count()) ? (await aviso.innerText()).replace(/\s+/g, ' ') : 'NÃO APARECEU')
    if (await aviso.count()) await aviso.getByRole('button', { name: 'Entendi' }).click()
    if (w >= 1000) out(tag + ' marca', (await p.locator('.topbar-brand').innerText()).replace(/\s+/g, ' '))
    const cards = await p.locator('.kpis .kpi').evaluateAll((els) => els.map((e) => ({ nome: e.querySelector('.kpi-name')?.innerText.trim(), valor: e.querySelector('.kpi-value')?.innerText.trim(), var: e.querySelector('.kpi-change')?.innerText.trim().replace(/\s+/g, ' '), spark: !!e.querySelector('.kpi-spark svg path.line'), nota: e.querySelector('.kpi-spark')?.getAttribute('aria-label') || null })))
    out(tag + ' cards', cards)
    out(tag + ' status_cambio', (await p.locator('.status.src').first().innerText().catch(() => '?')).replace(/\s+/g, ' '))
    await p.goto(BASE + '#cenarios/outros'); await p.waitForTimeout(2500)
    const tabs = await p.locator('.ind-table').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').slice(0, 420)))
    out(tag + ' outros_tabelas', tabs); out(tag + ' outros_msg', await p.locator('.outros [role="status"]').allInnerTexts())
    await p.goto(BASE + '#aprender'); await p.waitForTimeout(1500)
    out(tag + ' aprender', { conceitos: await p.locator('.learn-list li').count(), topicos: (await p.locator('.learn-topic').allTextContents()).map((t) => t.trim()), busca: await p.getByRole('searchbox', { name: 'Buscar conceito' }).count() })
    await p.getByRole('searchbox', { name: 'Buscar conceito' }).fill('fidc'); out(tag + ' busca_fidc', await p.locator('.learn-list li').count())
    await p.goto(BASE + '#config'); await p.waitForTimeout(2500)
    out(tag + ' governanca_linhas', await p.locator('.config-gov tbody tr').count())
    const estado = await p.locator('.config-table').first().locator('tbody tr').evaluateAll((els) => els.map((e) => `${e.querySelector('th')?.innerText.trim()} | ${e.querySelectorAll('td')[0]?.innerText.trim()} | ${e.querySelectorAll('td')[2]?.innerText.trim()}`))
    out(tag + ' estado_dos_dados', estado)
    out(tag + ' rolagem_lateral', await p.evaluate(() => document.documentElement.scrollWidth > innerWidth))
    out(tag + ' erros_js', erros.slice(0, 8)); out(tag + ' falhas_http', falhas.slice(0, 12))
    await ctx.close()
  }
  await b.close()
})().catch((e) => { console.error('FALHA DA SONDA', e); process.exit(1) })
