const H = { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36', accept: '*/*' }
const ORI = 'https://www.bndes.gov.br'
async function get(path) {
  try {
    const r = await fetch(ORI + path, { headers: { ...H, referer: ORI + '/' }, signal: AbortSignal.timeout(30000) })
    const t = await r.text()
    const lines = t.split(/\r?\n/).filter(Boolean)
    return { s: r.status, n: lines.length, first: lines[1], last: lines.at(-1), head: lines[0] }
  } catch (e) { return { err: e.message } }
}
const codes = []
for (let i = 1; i <= 26; i++) codes.push('C' + String(i).padStart(2, '0'))
codes.push('TD1', 'TD2', 'TD3', 'TG1', 'TG2', 'TG3', 'TR1', 'TR2', 'TR3', 'TR4', 'TR5', 'TR6', 'TR7', 'TR8', '603', '602', '600', '601')
for (const c of codes) {
  let hit = null
  for (const p of [`/Moedas/um${c}.txt`, `/Moedas/un${c}.txt`, `/Moedas/${c}.txt`]) { const r = await get(p); if (r.s === 200 && r.n > 1) { hit = [p, r]; break } }
  console.log(hit ? `OK  ${hit[0]} linhas ${hit[1].n} | 1ª(topo): ${hit[1].first} | última: ${hit[1].last}` : `404 ${c}`)
}
console.log('### FIM')
