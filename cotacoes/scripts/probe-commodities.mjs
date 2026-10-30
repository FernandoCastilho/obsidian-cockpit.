import { spawnSync } from 'node:child_process'
const get = async (u, t = 'text') => { const r = await fetch(u, { signal: AbortSignal.timeout(40000), headers: { 'user-agent': 'Mozilla/5.0' } }); console.log(r.status, u); if (!r.ok) return null; return t === 'buf' ? Buffer.from(await r.arrayBuffer()) : r.text() }
const tryit = async (name, fn) => { try { await fn() } catch (e) { console.log('ERRO', name, e.message) } }
for (const c of [27574, 27575, 27576, 27577, 1, 11752, 11753]) await tryit('sgs' + c, async () => { console.log('SGS', c, (await get(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${c}/dados/ultimos/3?formato=json`))?.replace(/\s+/g, ' ')) })
for (const p of ['RNGWHHD', 'EER_EPD2DXL0_PF4_Y35NY_DPGD', 'EER_EPMRU_PF4_Y35NY_DPGD']) await tryit(p, async () => {
  const h = await get(`https://www.eia.gov/dnav/pet/hist/${p}.htm`); if (!h) return
  const t = h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
  console.log(p, t.match(/[^.]{0,120}\(Dollars per [^)]*\)/i)?.[0], '|', t.match(/Release Date:[^A-Z]*[\d/]+/i)?.[0], '|', t.match(/Next Release Date:[^A-Z]*[\d/]+/i)?.[0])
  console.log([...h.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m => m[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()).filter(x => /^\d{4}\s/.test(x)).slice(-3))
})
await tryit('pink', async () => {
  const html = await get('https://www.worldbank.org/en/research/commodity-markets'); const m = html.match(/href\s*=\s*["']([^"']+CMO-Historical-Data-Monthly\.xlsx)["']/i); console.log('link', m?.[1])
  const buf = await get(new URL(m[1], 'https://www.worldbank.org').href, 'buf')
  const out = spawnSync('python3', ['cotacoes/scripts/read-pink-sheet.py'], { input: buf, encoding: 'utf8', maxBuffer: 50e6 }); const rows = JSON.parse(out.stdout)
  const i = rows.findIndex(r => Object.values(r).includes('Soybeans')); const h = rows[i], u = rows[i + 1]
  for (const k of Object.keys(h)) console.log('COL', k, '|', h[k], '|', u[k])
})
await tryit('anp', async () => {
  const h = await get('https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/levantamento-de-precos-de-combustiveis-ultimas-semanas-pesquisadas')
  if (h) console.log([...h.matchAll(/href="([^"]+\.(?:xlsx|xls|csv))"/gi)].map(m => m[1]).slice(0, 15))
})
