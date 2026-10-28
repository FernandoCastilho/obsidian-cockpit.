// SONDAGEM TEMPORÁRIA 5 (sai do repositório depois): valores públicos de TFB/TFBTR/TLP no guia de custos e dados abertos do BNDES.
const H = { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36', accept: 'text/html,application/json,*/*' }
const get = async (u) => { try { const r = await fetch(u, { headers: H, signal: AbortSignal.timeout(40000) }); return { s: r.status, b: new TextDecoder('utf-8').decode(await r.arrayBuffer()) } } catch (e) { return { s: 0, b: String(e.cause?.code || e.message) } } }
const text = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim()
const G = 'https://www.bndes.gov.br/wps/portal/site/home/financiamento/guia/custos-financeiros/'
for (const [nome, slug] of [['TFB', 'tfb-taxa-fixa-bndes'], ['TFBTR', 'taxa-fixa-bndes-baseada-em-tr'], ['TLP', 'tlp-taxa-de-longo-prazo']]) {
  const r = await get(G + slug); const t = text(r.b)
  const i = t.search(/Valor d[aeo]s? (TFB|TFBTR|TLP)|Valores? (da|das) /i)
  console.log(`\n### ${nome} http ${r.s} bytes ${r.b.length} | início da seção de valores em ${i}`)
  console.log(t.slice(Math.max(0, i), Math.max(0, i) + 1500))
  const iframes = [...r.b.matchAll(/<(iframe|object|embed)\b[^>]*(src|data)=["']([^"']+)/gi)].map((m) => m[3]); console.log('iframes:', iframes)
  const files = [...r.b.matchAll(/href=["']([^"']+\.(?:csv|xls|xlsx|pdf|json)[^"']*)/gi)].map((m) => m[1]).slice(0, 6); console.log('arquivos:', files)
}
console.log('\n### DADOS ABERTOS')
for (const q of ['taxa', 'TFB', 'TLP', 'moedas contratuais', 'custos financeiros']) {
  const r = await get('https://dadosabertos.bndes.gov.br/api/3/action/package_search?rows=8&q=' + encodeURIComponent(q))
  try { const j = JSON.parse(r.b); console.log(`q=${q}: ${j.result.count} conjuntos`); for (const p of j.result.results) console.log('  -', p.name, '|', p.title.slice(0, 80), '| recursos:', p.resources.length) } catch { console.log(`q=${q}: http ${r.s} ${r.b.slice(0, 150)}`) }
}
console.log('### FIM')
