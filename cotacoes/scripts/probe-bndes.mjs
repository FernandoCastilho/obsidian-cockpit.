const H = { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36', accept: '*/*' }
const ORI = 'https://www.bndes.gov.br'
async function get(path) {
  try {
    const r = await fetch(ORI + path, { headers: { ...H, referer: ORI + '/' }, signal: AbortSignal.timeout(40000) })
    const b = new Uint8Array(await r.arrayBuffer())
    const t = new TextDecoder('latin1').decode(b)
    return { s: r.status, ct: r.headers.get('content-type'), len: t.length, head: t.slice(0, 420), tail: t.slice(-260), lines: t.split(/\r?\n/).length }
  } catch (e) { return { err: e.message } }
}
const show = (p, r) => console.log(`\n== ${p} -> ${r.err ?? `http ${r.s} ${r.ct} bytes ${r.len} linhas ${r.lines}`}\n${r.head ? 'HEAD: ' + JSON.stringify(r.head) + '\nTAIL: ' + JSON.stringify(r.tail) : ''}`)
const main = ['unC02', 'um143', 'um024', 'um236', 'um777', 'um604', 'umTR1', 'umTR2', 'UMTR1', 'UMTR2', 'unC01', 'unC03', 'unC04', 'unC05', 'unC10']
for (const c of main) { const r = await get(`/Moedas/${c}.txt`); if (r.s === 200 || r.err || c === 'unC02' || c === 'um143') show(`/Moedas/${c}.txt`, r); else console.log(`${c}: http ${r.s}`) }
console.log('\n### FIM')
