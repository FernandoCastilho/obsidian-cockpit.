// SONDAGEM TEMPORÁRIA 7 (sai do repositório depois): serviço público de taxas que os gráficos do guia do BNDES usam.
const H = { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36', accept: 'application/json,text/html,*/*' }
const ORI = 'https://www.bndes.gov.br'
const get = async (u) => { try { const r = await fetch(u, { headers: H, signal: AbortSignal.timeout(40000) }); return { s: r.status, t: r.headers.get('content-type') || '', b: new TextDecoder('utf-8').decode(await r.arrayBuffer()) } } catch (e) { return { s: 0, t: '', b: String(e.cause?.code || e.message) } } }
const G = ORI + '/wps/portal/site/home/financiamento/guia/custos-financeiros/'
const page = await get(G + 'tfb-taxa-fixa-bndes')
const i = page.b.search(/let diasLiberacao/); const j = page.b.indexOf('</script>', i)
console.log('### SCRIPT DO GRÁFICO (TFB)\n' + page.b.slice(i, j).replace(/\s+/g, ' ').slice(0, 3800))
console.log('\n### GUIA DE CUSTOS: páginas com TFC / taxa fixa')
const idx = await get(G)
for (const m of idx.b.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) { const t = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); if (/TFC|taxa fixa|TFB|TLP|TR\b|cesta|TJ/i.test(t + m[1])) console.log(' -', t.slice(0, 70), '|', m[1].slice(0, 130)) }
console.log('\n### SERVIÇO REST')
for (const p of ['TFB_60_30', 'TFB_36_30', 'TFB_60_30/', 'TFBTR_60_90', 'TFBTR_60', 'TFC_60_90', 'TFC_C01', 'C01', 'TLP', 'TR']) {
  const r = await get(ORI + '/apoioFinanceiro/rest/taxas/' + p)
  console.log(`\n${p} -> http ${r.s} ${r.t} bytes ${r.b.length}\n  ${r.b.replace(/\s+/g, ' ').slice(0, 420)}`)
}
console.log('### FIM')
