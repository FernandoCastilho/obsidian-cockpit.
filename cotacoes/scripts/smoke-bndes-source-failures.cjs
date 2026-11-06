// Teste de navegador determinístico: cada fonte falha isoladamente e se recupera.
// Todas as séries são sintéticas, salvo o snapshot LD1 do próprio aplicativo; nenhuma fonte externa é consultada.
const { chromium } = require('playwright'), assert = require('node:assert/strict')
const { mkdir } = require('node:fs/promises')
const path = require('node:path')
const now = Date.parse('2026-11-05T18:00:00Z')
const dates = ['2026-11-03', '2026-11-04', '2026-11-05']
const points = (value) => dates.map((day, i) => [day, value - (2 - i) * .01])
function fixtures(revision) {
  const series = {}
  for (const prazo of [36, 60, 84, 120]) for (const liberacao of [30, 90]) series[`TFB_${prazo}_${liberacao}`] = { prazo, liberacao, points: points(10.5 + revision) }
  return {
    'bndes.json': { schemaVersion: 1, generatedAt: now + revision, stale: {}, errors: [], series, tlp: { code: 777, unit: 'a.a.', points: [['2026-09-01', 6.7], ['2026-10-01', 6.8], ['2026-11-01', 6.9 + revision]] } },
    'moedas.json': { schemaVersion: 1, generatedAt: now + revision, stale: {}, errors: [], series: { C01: { points: points(12.34 + revision) }, C02: { points: points(12.56 + revision) }, 604: { points: points(5.01 + revision) }, 143: { points: points(4.01 + revision) } } },
  }
}
;(async () => {
  const b = await chromium.launch(require('./smoke-launch.cjs')()), base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5216'
  const out = process.env.SMOKE_OUT || path.join(process.cwd(), 'qa-output', 'bndes-fontes')
  await mkdir(out, { recursive: true })
  const start = async (width, initialFailure) => {
    let failed = initialFailure, revision = 0
    const p = await b.newPage({ viewport: { width, height: 900 }, serviceWorkers: 'block' }), errors = [], requests = { 'bndes.json': 0, 'moedas.json': 0 }
    p.on('pageerror', (e) => errors.push(e.message))
    await p.clock.setFixedTime(now)
    await p.route('**/*', (r) => r.request().url().startsWith(base) ? r.continue() : r.abort())
    for (const file of Object.keys(requests)) await p.route(`**/${file}*`, (r) => {
      requests[file]++
      return file === failed ? r.fulfill({ status: 503, body: 'Falha sintética isolada' }) : r.fulfill({ json: fixtures(revision)[file] })
    })
    await p.route('**/curves.json*', (r) => r.fulfill({ json: { generatedAt: now, br: null, stale: {}, errors: [] } }))
    await p.route('**/recado.json*', (r) => r.fulfill({ json: { ativo: false } }))
    await p.goto(base + '/#bndes/tfb/TFB_60_90')
    const panel = p.locator('.bn .desk-panel'), fam = p.getByRole('group', { name: 'Família de séries' })
    await fam.waitFor()
    const select = async (family) => { await fam.getByRole('button', { name: family, exact: true }).click(); await p.waitForURL(new RegExp(`#bndes/${family.toLowerCase()}/`)) }
    const row = (id) => panel.locator('.bn-main tbody tr:not(.bn-extra)').filter({ has: p.locator('.bn-pick small', { hasText: new RegExp(`^${id} ·`) }) })
    const healthy = async (id, rx) => { await row(id).filter({ hasText: rx }).waitFor(); assert.match(await row(id).innerText(), rx); assert.equal(await panel.locator('.estado-erro').count(), 0) }
    const unavailable = async () => { await panel.locator('.estado-erro').waitFor(); assert.match(await panel.locator('.estado-erro').innerText(), /Séries indisponíveis agora/); assert.equal(await panel.locator('.bn-main').count(), 0, 'erro não vira tabela de zeros') }
    const refresh = async (file, nextRevision = revision) => {
      failed = file; revision = nextRevision
      const previous = { ...requests }, button = panel.getByRole('button', { name: 'Atualizar BNDES · taxas e moedas contratuais', exact: true })
      await button.click()
      await p.waitForFunction(() => document.querySelector('.bn .refresh-btn')?.getAttribute('aria-disabled') !== 'true')
      for (const name of Object.keys(requests)) assert.equal(requests[name], previous[name] + 1, `atualização consulta ${name} uma vez`)
    }
    const capture = async (name) => {
      await panel.scrollIntoViewIfNeeded()
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'sem rolagem horizontal da página')
      await p.screenshot({ path: path.join(out, `bndes-${width}-${name}.png`), fullPage: true })
    }
    const finish = async () => { assert.deepEqual(errors, []); await p.close() }
    return { p, panel, select, row, healthy, unavailable, refresh, capture, finish }
  }
  try {
    for (const width of [390, 1280]) {
      // moedas.json indisponível na primeira leitura: TFC erro, Moedas só snapshot datado, TFB/TLP preservadas.
      let s = await start(width, 'moedas.json')
      await s.healthy('TFB_60_90', /10,50% a\.a\./)
      await s.select('TLP'); await s.healthy('777', /6,90% a\.a\./)
      await s.select('TFC'); await s.unavailable(); await s.capture('moedas-falha-tfc')
      await s.select('Moedas')
      await s.panel.getByText(/Não foi possível atualizar as moedas contratuais/).waitFor()
      await s.healthy('LD1', /-0,110000% a\.a\.[\s\S]*dado anterior/)
      assert.match(await s.row('604').innerText(), /indisponível/, 'snapshot LD1 não fabrica dólar')
      assert.match(await s.panel.innerText(), /snapshot oficial consultado em 05\/11\/2026/)
      await s.capture('moedas-falha-snapshot')
      await s.refresh(null)
      await s.healthy('604', /R\$ 5,0100/)
      assert.equal(await s.panel.locator('.status.stale').count(), 0, 'aviso some ao recuperar fonte')
      await s.select('TFC'); await s.healthy('C01', /12,34% a\.a\./); await s.capture('moedas-recuperada')
      await s.finish()

      // bndes.json indisponível: LD1 e TFC saudáveis não escondem erro de TFB/TLP.
      s = await start(width, 'bndes.json')
      await s.unavailable(); await s.capture('bndes-falha-tfb')
      await s.select('TLP'); await s.unavailable()
      await s.select('TFC'); await s.healthy('C01', /12,34% a\.a\./)
      await s.select('Moedas'); await s.healthy('604', /R\$ 5,0100/)
      assert.equal(await s.panel.locator('.status.stale').count(), 0, 'falha da outra fonte não contamina Moedas')
      await s.refresh(null)
      await s.select('TFB'); await s.healthy('TFB_60_90', /10,50% a\.a\./)
      await s.select('TLP'); await s.healthy('777', /6,90% a\.a\./); await s.capture('bndes-recuperada')
      await s.finish()

      // Falha depois de sucesso retém o último valor com aviso; nova leitura válida substitui e limpa o erro.
      s = await start(width, null)
      await s.healthy('TFB_60_90', /10,50% a\.a\./)
      await s.select('TFC'); await s.healthy('C01', /12,34% a\.a\./)
      await s.refresh('moedas.json')
      await s.panel.getByText(/Não foi possível atualizar as séries TFC/).waitFor()
      await s.healthy('C01', /12,34% a\.a\./); await s.capture('tfc-dado-retido')
      await s.select('Moedas'); await s.healthy('604', /R\$ 5,0100/)
      await s.panel.getByText(/Não foi possível atualizar as moedas contratuais/).waitFor()
      await s.select('TFB'); await s.healthy('TFB_60_90', /10,50% a\.a\./)
      assert.equal(await s.panel.locator('.status.stale').count(), 0)
      await s.refresh(null, 1)
      await s.select('TFC'); await s.healthy('C01', /13,34% a\.a\./)
      assert.equal(await s.panel.locator('.status.stale').count(), 0)
      await s.select('Moedas'); await s.healthy('604', /R\$ 6,0100/)
      assert.equal(await s.panel.locator('.status.stale').count(), 0)
      await s.capture('tfc-dado-recuperado')
      // A outra fonte também deve sinalizar retenção, sem contaminar TFC/Moedas.
      await s.select('TFB'); await s.healthy('TFB_60_90', /11,50% a\.a\./)
      await s.refresh('bndes.json', 1)
      await s.panel.getByText(/Não foi possível atualizar as séries TFB/).waitFor()
      await s.healthy('TFB_60_90', /11,50% a\.a\./); await s.capture('tfb-dado-retido')
      await s.select('TLP'); await s.healthy('777', /7,90% a\.a\./)
      await s.panel.getByText(/Não foi possível atualizar as séries TLP/).waitFor()
      await s.select('TFC'); await s.healthy('C01', /13,34% a\.a\./)
      assert.equal(await s.panel.locator('.status.stale').count(), 0, 'falha BNDES não contamina TFC')
      await s.refresh(null, 2)
      await s.select('TFB'); await s.healthy('TFB_60_90', /12,50% a\.a\./)
      assert.equal(await s.panel.locator('.status.stale').count(), 0)
      await s.select('TLP'); await s.healthy('777', /8,90% a\.a\./)
      assert.equal(await s.panel.locator('.status.stale').count(), 0)
      await s.capture('tfb-tlp-dado-recuperado'); await s.finish()
      console.log(`${width} PASS falhas isoladas moedas/BNDES, snapshot LD1, TFC/TFB/TLP retidas e recuperação sem erro residual`)
    }
  } finally { await b.close() }
})().catch((e) => { console.error(e); process.exit(1) })
