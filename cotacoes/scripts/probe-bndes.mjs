// SONDAGEM TEMPORÁRIA (sai do repositório depois): lê no BNDES as moedas contratuais, TFB e TFC.
const UA = { 'user-agent': 'Mozilla/5.0 (cotacoes-sondagem)', accept: '*/*' }
const get = async (url, ms = 30000) => {
  try {
    const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(ms), redirect: 'follow' })
    return { status: r.status, type: r.headers.get('content-type') || '', url: r.url, body: await r.text() }
  } catch (e) { return { status: 0, type: '', url, body: String(e.cause?.code || e.message) } }
}
const text = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim()
const links = (h, base) => [...h.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map((m) => { try { return [new URL(m[1], base).href, text(m[2]).slice(0, 70)] } catch { return null } }).filter(Boolean)
const PAGE = 'https://www.bndes.gov.br/SiteBNDES/bndes/bndes_pt/Galerias/Convivencia/Moedas_Contratuais/index.html'
console.log('### MOEDAS CONTRATUAIS')
const p = await get(PAGE)
console.log('http', p.status, p.type, p.url, 'bytes', p.body.length)
const t = text(p.body)
console.log(t.slice(0, 5000))
const ls = links(p.body, p.url).filter(([u]) => !/facebook|twitter|youtube|linkedin|instagram/.test(u))
console.log('\n### LINKS DA PÁGINA (' + ls.length + ')')
for (const [u, x] of ls.slice(0, 90)) console.log(' -', x, '|', u)
const hits = (s, re) => [...s.matchAll(re)].map((m) => s.slice(Math.max(0, m.index - 80), m.index + 160))
console.log('\n### TRECHOS COM TFC / TFB')
for (const h of hits(t, /\bTF[CB]\w*\b/g).slice(0, 12)) console.log(' ...', h)
// segue os links que parecem tabelas/arquivos de moedas contratuais
const follow = ls.filter(([u, x]) => /moeda|cota|taxa|tfb|tfc|umbndes|\.(csv|xls|xlsx|json|txt)(\?|$)|asp|jsp/i.test(u + ' ' + x)).slice(0, 8)
for (const [u, x] of follow) {
  const r = await get(u)
  console.log('\n### SEGUIDO:', x, '|', u, '| http', r.status, r.type)
  const tx = /html|xml/.test(r.type) ? text(r.body) : r.body
  console.log(tx.slice(0, 1800))
  for (const h of hits(tx, /\bTFC\b/g).slice(0, 4)) console.log(' [TFC]', h)
}
console.log('\n### TFB / TFBD (guia de custos)')
for (const u of ['https://www.bndes.gov.br/wps/portal/site/home/financiamento/guia/custos-financeiros/tfb-taxa-fixa-bndes', 'https://www.bndes.gov.br/wps/portal/site/home/financiamento/guia/custos-financeiros/taxa-fixa-bndes-em-dolar']) {
  const r = await get(u); const tx = text(r.body)
  console.log('\n', u, '| http', r.status, '| bytes', r.body.length); console.log(tx.slice(0, 1500))
  for (const [l, x] of links(r.body, r.url).filter(([l, x]) => /\.(csv|xls|xlsx|json)|moedas|cotac|tabela/i.test(l + x)).slice(0, 8)) console.log(' link:', x, '|', l)
}
console.log('\n### DADOS ABERTOS (CKAN)')
const k = await get('https://dadosabertos.bndes.gov.br/api/3/action/package_search?q=taxa&rows=8')
console.log('http', k.status, k.body.slice(0, 600).replace(/\s+/g, ' '))
console.log('### FIM')
