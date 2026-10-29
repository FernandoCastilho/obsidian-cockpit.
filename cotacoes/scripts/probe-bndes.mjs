const H = { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36', accept: '*/*' }
const ORI = 'https://www.bndes.gov.br'
const text = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim()
async function page(u) {
  try {
    const r = await fetch(u.startsWith('http') ? u : ORI + u, { headers: { ...H, referer: ORI + '/' }, signal: AbortSignal.timeout(40000), redirect: 'follow' })
    return { s: r.status, url: r.url, b: new TextDecoder('latin1').decode(await r.arrayBuffer()) }
  } catch (e) { return { s: 0, b: '', err: e.message } }
}
const cands = ['/SiteBNDES/bndes/bndes_pt/Galerias/Convivencia/Moedas_Contratuais/index.html', '/Moedas/', '/Moedas/index.html', '/Moedas/index.htm', '/Moedas/moedas.html', '/Moedas/moedas.txt', '/Moedas/codigos.txt', '/Moedas/lista.txt']
for (const u of cands) {
  const r = await page(u)
  console.log(`\n######## ${u} -> http ${r.s} ${r.err ?? ''} bytes ${r.b.length} url ${r.url ?? ''}`)
  if (r.s !== 200) continue
  const t = text(r.b)
  console.log('LINKS:', [...r.b.matchAll(/(?:href|src|action)=["']([^"']+)["']/gi)].map((m) => m[1]).filter((x) => !/^(#|javascript|mailto)/i.test(x)).slice(0, 60).join(' | '))
  console.log('TFC:', JSON.stringify([...t.matchAll(/.{0,200}TFC.{0,300}/g)].slice(0, 6).map((m) => m[0])))
  for (const c of ['143', '024', '236', '777', '604', 'C02']) console.log(`COD ${c}:`, JSON.stringify([...t.matchAll(new RegExp(`.{0,120}\\b${c}\\b.{0,160}`, 'g'))].slice(0, 3).map((m) => m[0])))
  console.log('TEXTO:', t.slice(0, 3500))
}
console.log('### FIM')
