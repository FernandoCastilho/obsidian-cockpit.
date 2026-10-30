// Aba BNDES: uma área de trabalho com abas por família (TFB, TLP, TFC, Moedas), período único para todas as séries e observações recolhidas.
const { chromium } = require('playwright'), assert = require('node:assert/strict')
const wk = (iso) => { const d = new Date(`${iso}T12:00:00Z`).getUTCDay(); return d !== 0 && d !== 6 }
const iso = (start, i) => new Date(start + i * 864e5).toISOString().slice(0, 10)
const todayIso = new Date().toISOString().slice(0, 10)
const daily = (start, n, base, step, dec = 4) => Array.from({ length: n }, (_, i) => iso(start, i)).filter(wk).filter((d) => d <= todayIso).map((d, i) => [d, Math.round((base + i * step) * 10 ** dec) / 10 ** dec])
;(async () => {
  const b = await chromium.launch(require('./smoke-launch.cjs')()), base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5216'
  try {
    for (const width of [390, 1280]) {
      const series = {}
      for (const [prazo, add] of [[36, 0], [60, 0.5], [84, 1]]) for (const liberacao of [30, 90]) series[`TFB_${prazo}_${liberacao}`] = { prazo, liberacao, points: daily(Date.UTC(2024, 0, 1), 1000, 10 + add + (liberacao === 90 ? 0.2 : 0), 0.02) }
      const months = Array.from({ length: 60 }, (_, i) => [new Date(Date.UTC(2021, i, 1)).toISOString().slice(0, 10), Math.round((6 + i * 0.05) * 100) / 100])
      const file = { schemaVersion: 1, generatedAt: Date.now(), series, tlp: { code: 777, unit: 'a.a.', points: months }, stale: {}, errors: [] }
      const t0 = Date.UTC(2025, 5, 2)
      const moedas = { schemaVersion: 1, generatedAt: Date.now(), stale: {}, errors: [], series: { C01: { points: daily(t0, 520, 12, 0.01, 6) }, C02: { points: daily(t0, 520, 12.5, 0.01, 6) }, 604: { points: daily(t0, 520, 5, 0.001, 4) }, 143: { points: daily(t0, 520, 4, 0.002, 6) }, TR1: { points: [['2026-09-01', 3.64], ['2026-10-01', 3.6], ['2099-01-01', 9]] } } }
      { const sp = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }), pts = moedas.series.C02.points.filter((x) => x[0] <= sp); pts[pts.length - 1][1] += 2 } // salto de 2 p.p. no último dia da TFC_120.90
      const p = await b.newPage({ viewport: { width, height: 900 }, serviceWorkers: 'block' }), errors = []
      p.on('pageerror', (e) => errors.push(e.message))
      await p.route('**/bndes.json*', (r) => r.fulfill({ json: file }))
      await p.route('**/moedas.json*', (r) => r.fulfill({ json: moedas }))
      await p.route('**/indexadores.json*', (r) => r.fulfill({ json: { schemaVersion: 1, generatedAt: Date.now(), series: {}, stale: {}, errors: [] } }))
      await p.goto(base + '/#bndes')
      const fam = p.getByRole('group', { name: 'Família de séries' }); await fam.waitFor()
      const tbl = () => p.locator('.bn-scroll').first().locator('tbody tr')
      const pressed = async (group, name) => (await p.getByRole('group', { name: group }).getByRole('button', { name, exact: true }).getAttribute('aria-pressed')) === 'true'
      const noOverflow = async () => assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'sem rolagem horizontal da página')
      assert.deepEqual(await fam.getByRole('button').allInnerTexts(), ['TFB', 'TLP', 'TFC', 'Moedas'])
      // padrão: TFB 60 meses, liberação em 90 dias, 12 meses
      assert.match(await p.locator('.bn-sub').nth(1).innerText(), /TFB · 36 a 60 meses · liberação em 90 dias/i)
      assert.equal(await pressed('Período da série', '12 meses'), true)
      // TFB: 8 linhas, colunas, série ausente marcada
      assert.equal(await tbl().count(), 8, '4 prazos x 2 liberações')
      assert.deepEqual(await p.locator('.bn-scroll').first().locator('thead th').allInnerTexts().then((a) => a.map((t) => t.toLowerCase())), ['série', 'valor', 'dia', 'mês', 'ano', 'data'])
      assert.match(await tbl().nth(0).innerText(), /até 36 meses · 30 dias[\s\S]*% a\.a\.[\s\S]*▲ \+0,02 p\.p\./)
      assert.match(await tbl().nth(6).innerText(), /84 a 120 meses · 30 dias[\s\S]*indisponível/, 'série ausente fica marcada, não vira zero')
      // observações do período recolhidas por padrão; abrem sob demanda
      const obs = p.locator('details.bn-obs-d'); await obs.waitFor()
      assert.equal(await obs.getAttribute('open'), null, 'tabela de observações recolhida')
      assert.equal(await obs.locator('.bn-obs').isVisible(), false)
      await obs.locator('summary').click()
      assert.ok(await obs.locator('tbody tr').count() > 20); assert.match(await obs.locator('caption').innerText(), /mais recentes primeiro/)
      await obs.locator('summary').click()
      // escolher uma linha leva o gráfico para a série; o período continua o mesmo
      await tbl().nth(4).getByRole('button').click()
      assert.match(await p.locator('.bn-sub').nth(1).innerText(), /60 a 84 meses · liberação em 30 dias/i)
      await p.getByRole('group', { name: 'Período da série' }).getByRole('button', { name: '3 meses', exact: true }).click()
      assert.match(await p.locator('.bn-range').innerText(), /No período: \d{2}\/\d{2}\/\d{4} [\d,]+% a\.a\. → \d{2}\/\d{2}\/\d{4} [\d,]+% a\.a\. \(\+[\d,]+ p\.p\.\)/)
      // TLP: uma linha, próxima divulgação, histórico mensal sob o mesmo período
      await fam.getByRole('button', { name: 'TLP', exact: true }).click()
      assert.equal(await tbl().count(), 1)
      assert.match(await tbl().first().innerText(), /TLP[\s\S]*8,95% a\.a\.[\s\S]*▲ \+0,05 p\.p\.[\s\S]*▲ \+0,60 p\.p\./)
      assert.match(await p.locator('.bn-def').first().innerText(), /Próxima divulgação da TLP: \d{2}\/\d{2}\/\d{4}\./)
      assert.equal(await pressed('Período da série', '3 meses'), true, 'um único filtro de período: continua em 3 meses')
      await p.getByRole('group', { name: 'Período da série' }).getByRole('button', { name: 'Tudo', exact: true }).click()
      assert.match(await p.locator('.bn-range').innerText(), /No período: 01\/01\/2021 6,00% a\.a\. → 01\/12\/2025 8,95% a\.a\./)
      // TFC: 24 séries (C19 e C21 não existem), variação em p.p., ausente marcada
      await fam.getByRole('button', { name: 'TFC', exact: true }).click()
      assert.equal(await tbl().count(), 24)
      assert.match(await tbl().nth(0).innerText(), /TFC_60\.90[\s\S]*% a\.a\.[\s\S]*▲ \+0,01 p\.p\./)
      assert.match(await tbl().nth(5).innerText(), /TFC_TR_120\.90[\s\S]*indisponível/)
      assert.doesNotMatch(await tbl().nth(0).innerText(), /salto/i, 'variação normal não leva selo')
      assert.match(await tbl().nth(1).innerText(), /▲ \+2,0\d p\.p\.\s*salto/i, 'variação do dia acima do limite leva o selo salto')
      assert.equal(await tbl().nth(1).getByRole('img', { name: /salto: .*confira a fonte do BNDES/i }).count(), 1)
      assert.equal(await pressed('Período da série', 'Tudo'), true, 'o período segue valendo na TFC')
      await tbl().nth(1).getByRole('button').click()
      assert.match(await p.locator('.bn-sub').nth(1).innerText(), /TFC_120\.90 \(C02\)/i)
      // Moedas: dólar em %, TFBTR vigente ignora data futura, sobretaxa ausente marcada
      await fam.getByRole('button', { name: 'Moedas', exact: true }).click()
      assert.equal(await tbl().count(), 6)
      assert.match(await tbl().nth(0).innerText(), /US\$[\s\S]*R\$ 5,\d{4}[\s\S]*▲ \+0,\d\d%/)
      assert.match(await tbl().nth(4).innerText(), /TFBTR60\.90[\s\S]*3,60% a\.a\./, 'valor vigente da TR1: o do mês corrente, não o de 2099')
      assert.match(await tbl().nth(2).innerText(), /SOBRETAXA FIXA SELIC[\s\S]*indisponível/)
      await tbl().nth(0).getByRole('button').click()
      assert.match(await p.locator('.bn-range').innerText(), /No período: .* R\$ [\d,]+ → .* R\$ [\d,]+ \(\+[\d,]+%\)/)
      // definição e fonte recolhidas; sem rolagem horizontal da página
      assert.equal(await p.locator('details.bn-src').getAttribute('open'), null)
      await noOverflow()
      // TFB saiu do quadro de indexadores (aba Juros)
      await p.goto(base + '/#juros'); await p.locator('.idx-table').waitFor()
      assert.doesNotMatch(await p.locator('.idx-table').innerText(), /TFB/)
      if (width >= 900) { await p.keyboard.press('Alt+5'); await p.waitForURL('**/#bndes') }
      assert.deepEqual(errors, [])
    }
    console.log('PASS aba BNDES: famílias com período único, tabelas, observações recolhidas e menu (390 e 1280)')
  } finally { await b.close() }
})().catch((e) => { console.error(e); process.exit(1) })
