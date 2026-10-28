// SONDAGEM TEMPORÁRIA 4 (sai do repositório depois): como consultar Moedas Contratuais do BNDES.
const BASE = 'https://www.bndes.gov.br/SiteBNDES/bndes/bndes_pt/Galerias/Convivencia/Moedas_Contratuais/'
const H = { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36', accept: 'text/html,application/xhtml+xml,*/*;q=0.8', 'accept-language': 'pt-BR,pt;q=0.9' }
const dec = (b) => new TextDecoder('latin1').decode(b)
const text = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim()
let cookies = ''
const req = async (url, init = {}) => {
  const r = await fetch(url, { redirect: 'manual', ...init, headers: { ...H, ...(cookies ? { cookie: cookies } : {}), ...(init.headers || {}) }, signal: AbortSignal.timeout(40000) })
  const sc = r.headers.getSetCookie?.() || []
  if (sc.length) cookies = [...new Set([...cookies.split('; ').filter(Boolean), ...sc.map((c) => c.split(';')[0])])].join('; ')
  const body = dec(await r.arrayBuffer())
  return { status: r.status, loc: r.headers.get('location'), type: r.headers.get('content-type'), body }
}
const idx = await req(BASE + 'index.html')
console.log('### index', idx.status, 'cookies:', cookies.replace(/=[^;]+/g, '=…') || '(nenhum)')
const scripts = [...idx.body.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]).filter((s) => /valida/.test(s))
console.log('### valida() COMPLETO\n' + (scripts[0] || '').replace(/\s+/g, ' ').slice(0, 3500))
const hidden = [...idx.body.matchAll(/<input[^>]+type=["']?hidden["']?[^>]*>/gi)].map((m) => m[0])
console.log('### hidden inputs', hidden)
const tries = [
  ['POST consulta_moedas.html Moeda+Data(vazio)', BASE + 'consulta_moedas.html', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', referer: BASE + 'index.html', origin: 'https://www.bndes.gov.br' }, body: 'Moeda=TFB_60_30&Data=' }],
  ['POST Moeda+Data dd/mm/aaaa', BASE + 'consulta_moedas.html', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', referer: BASE + 'index.html', origin: 'https://www.bndes.gov.br' }, body: 'Moeda=TFB_60_30&Data=27%2F10%2F2026' }],
  ['GET consulta_moedas.html?Moeda=', BASE + 'consulta_moedas.html?Moeda=TFB_60_30&Data=', {}],
  ['GET consulta_moedas.jsp?Moeda=', BASE + 'consulta_moedas.jsp?Moeda=TFB_60_30&Data=', {}],
  ['POST consulta_moedas.jsp', BASE + 'consulta_moedas.jsp', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', referer: BASE + 'index.html' }, body: 'Moeda=TFB_60_30&Data=' }],
  ['POST index.html (mesma página)', BASE + 'index.html', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', referer: BASE + 'index.html' }, body: 'Moeda=TFB_60_30&Data=' }],
  ['POST Moeda=777 (TLP) consulta_moedas.html', BASE + 'consulta_moedas.html', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', referer: BASE + 'index.html' }, body: 'Moeda=777&Data=' }],
]
for (const [nome, url, init] of tries) {
  const r = await req(url, init).catch((e) => ({ status: 0, body: String(e.cause?.code || e.message) }))
  const t = text(r.body)
  console.log(`\n### ${nome} -> http ${r.status}${r.loc ? ' loc=' + r.loc : ''} ${r.type || ''} bytes ${r.body.length}`)
  console.log(t.slice(0, 600))
}
console.log('### FIM')
