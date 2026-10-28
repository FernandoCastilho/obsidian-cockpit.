// SONDAGEM TEMPORÁRIA 6 (sai do repositório depois): destino dos links "Taxas para prazos..." do guia de custos do BNDES.
const H = { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36', accept: 'text/html,*/*' }
const text = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim()
const G = 'https://www.bndes.gov.br/wps/portal/site/home/financiamento/guia/custos-financeiros/'
for (const slug of ['tfb-taxa-fixa-bndes', 'taxa-fixa-bndes-baseada-em-tr']) {
  const r = await fetch(G + slug, { headers: H, signal: AbortSignal.timeout(40000) }); const b = new TextDecoder('utf-8').decode(await r.arrayBuffer())
  console.log('\n### ' + slug)
  for (const m of b.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const t = text(m[2]); if (/Taxas para prazos|hist[óo]ric|Moedas|Acompanhe|variações/i.test(t + m[1])) console.log(' -', t.slice(0, 80), '|', m[1])
  }
  const i = b.search(/Taxas para prazos de libera/i); console.log('HTML ao redor:', b.slice(Math.max(0, i - 700), i + 500).replace(/\s+/g, ' '))
}
console.log('### FIM')
