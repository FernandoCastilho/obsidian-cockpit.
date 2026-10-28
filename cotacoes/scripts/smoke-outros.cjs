// Cenários › Outros (IPCA) e Frete marítimo: tabela no formato do Mercado; clicar abre o gráfico em tela cheia com filtros no topo.
const { chromium } = require('playwright'), assert = require('node:assert/strict')
const points = []
let index = 100
for (let y = 2018; y <= 2026; y++) for (let m = 1; m <= 12; m++) {
  if (y === 2026 && m > 9) break
  const mom = 0.2 + 0.5 * Math.abs(Math.sin(y * 12 + m)); index *= 1 + mom / 100
  points.push({ period: `${y}-${String(m).padStart(2, '0')}`, mom: +mom.toFixed(2), ytd: +(mom * m).toFixed(2), y12: +(mom * 12).toFixed(2), index: +index.toFixed(2) })
}
const ipca = { schemaVersion: 1, generatedAt: new Date().toISOString(), series: { id: 'ipca', sourceName: 'IBGE · SIDRA (fixture de teste)', sourceUrl: 'https://sidra.ibge.gov.br/tabela/1737', checkedAt: new Date().toISOString(), stale: false, points } }
const jp = { schemaVersion: 1, generatedAt: new Date().toISOString(), series: { id: 'freight-jp-sppi', unit: 'pontos · média de 2020 = 100', frequency: 'monthly', sourceName: 'Banco do Japão (fixture de teste)', sourceUrl: 'https://www.boj.or.jp/en/statistics/pi/sppi_2020/index.htm', checkedAt: new Date().toISOString(), stale: false, releaseDate: null,
  points: Array.from({ length: 40 }, (_, i) => ({ period: `${2023 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`, value: 100 + i * 1.5 })) } }
;(async () => {
  const b = await chromium.launch({ channel: process.env.SMOKE_CHANNEL || 'msedge', headless: true }), base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5216'
  try {
    for (const width of [390, 1280]) {
      const p = await b.newPage({ viewport: { width, height: 900 }, serviceWorkers: 'block' }), errors = []
      p.on('pageerror', (e) => errors.push(e.message))
      await p.route('**/ipca.json*', (r) => r.fulfill({ json: ipca }))
      await p.route('**/freight-jp.json*', (r) => r.fulfill({ json: jp }))
      await p.goto(base + '/#cenarios/outros')
      const table = p.locator('.ind-table')
      await table.waitFor()
      assert.equal(await table.locator('tbody').count(), 4, 'quatro leituras do IPCA')
      assert.match(await table.innerText(), /Acumulado em 12 meses/)
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      await p.getByRole('button', { name: 'Acumulado em 12 meses: abrir gráfico' }).click()
      const d = p.getByRole('dialog', { name: /histórico de IPCA/ })
      await d.waitFor()
      assert.deepEqual(await d.locator('.expandable-controls button').allInnerTexts(), ['Fechar ×'])
      assert.equal(await d.locator('.chart-filters').count(), 1, 'filtros num bloco só, acima do gráfico')
      await d.getByRole('group', { name: 'Período do indicador' }).getByRole('button', { name: 'Tudo' }).click()
      await d.locator('.plot svg').first().waitFor()
      await p.keyboard.press('Escape'); await d.waitFor({ state: 'hidden' })
      // frete marítimo: mesma tabela; a linha abre o gráfico
      await p.goto(base + '/#cenarios/frete')
      const f = p.locator('.ind-table')
      await f.waitFor()
      assert.match(await f.innerText(), /Δ mês %[\s\S]*12 meses %[\s\S]*Ano %/)
      assert.equal(await f.locator('tbody').count(), 2, 'EUA e Japão')
      assert.match(await f.innerText(), /Japão · Transporte marítimo/)
      await f.getByRole('button', { name: /Japão.*abrir histórico e gráfico/ }).click()
      const jd = p.getByRole('dialog', { name: /histórico de Japão/i }); await jd.waitFor()
      await p.keyboard.press('Escape'); await jd.waitFor({ state: 'hidden' })
      await f.getByRole('button', { name: /EUA.*abrir histórico e gráfico/ }).click()
      const fd = p.getByRole('dialog', { name: /histórico de /i }); await fd.waitFor()
      assert.equal(await fd.locator('.chart-filters').count(), 1)
      await p.keyboard.press('Escape'); await fd.waitFor({ state: 'hidden' })
      // atividade e emprego: tabela; a linha abre o gráfico em tela cheia
      await p.goto(base + '/#cenarios/atividade')
      const at = p.locator('.ind-table'); await at.waitFor()
      assert.equal(await at.locator('tbody').count(), 5, 'cinco indicadores de atividade e emprego')
      assert.match(await at.innerText(), /Anterior[\s\S]*Variação[\s\S]*Ano anterior/)
      await at.getByRole('button', { name: /Payroll . EUA: abrir gráfico/ }).click()
      const ad = p.getByRole('dialog', { name: /histórico de Payroll/i }); await ad.waitFor()
      assert.equal(await ad.locator('.chart-filters').count(), 1)
      assert.deepEqual(await ad.locator('.expandable-controls button').allInnerTexts(), ['Fechar ×'])
      await p.keyboard.press('Escape'); await ad.waitFor({ state: 'hidden' })
      assert.deepEqual(errors, [])
      console.log(width + ' PASS IPCA em Outros (tabela, gráfico em tela cheia, filtros no topo) e frete em tabela')
      await p.close()
    }
  } finally { await b.close() }
})().catch((e) => { console.error(e); process.exit(1) })
