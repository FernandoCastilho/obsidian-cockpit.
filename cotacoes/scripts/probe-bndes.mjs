const H = { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36', accept: '*/*' }
const ORI = 'https://www.bndes.gov.br'
const base = ORI + '/apoioFinanceiro/rest/taxas/'
async function get(url) {
  try {
    const r = await fetch(url, { headers: { ...H, referer: ORI + '/' }, signal: AbortSignal.timeout(40000) })
    const t = await r.text()
    return { s: r.status, len: t.length, head: t.slice(0, 120).replace(/\s+/g, ' '), tail: t.slice(-70).replace(/\s+/g, ' '), body: t }
  } catch (e) { return { err: e.message, body: '' } }
}
const G = ORI + '/wps/portal/site/home/financiamento/guia/custos-financeiros/'
console.log('### PÁGINAS: códigos do serviço no script de cada gráfico')
for (const p of ['taxa-fixa-bndes-baseada-em-tr/', 'tfb-taxa-fixa-bndes-digital', 'taxa-fixa-bndes-em-dolar', 'tfb-taxa-fixa-bndes']) {
  const r = await get(G + p)
  const codes = new Set([...r.body.matchAll(/\b(TFB[A-Z]*_[0-9A-Za-z_]+|TFC[A-Z]*_?[0-9A-Za-z_]*|TFBD[A-Z]*)\b/g)].map((m) => m[0]))
  const i = r.body.search(/diasLiberacao|rest\/taxas/)
  console.log(`\n[${p}] http ${r.s} bytes ${r.len ?? 0}\n codes=${[...codes].slice(0, 40).join(' | ')}\n script=${i >= 0 ? r.body.slice(Math.max(0, i - 200), i + 900).replace(/\s+/g, ' ') : '(sem script)'}`)
  const tfc = [...r.body.matchAll(/[^<>]{0,80}\bTFC\b[^<>]{0,120}/g)].slice(0, 4).map((m) => m[0].trim())
  if (tfc.length) console.log(' TFC no texto:', JSON.stringify(tfc))
}
console.log('\n### SERVIÇO: candidatos')
const cands = []
for (const f of ['TFBTR', 'TFC', 'TFCTR', 'TFBDIG', 'TFBD']) for (const p of [36, 60, 84, 120]) for (const l of [30, 60, 90]) cands.push(`${f}_${p}_${l}`)
cands.push('TFBDIG', 'TFBD', 'TFC', 'TFBTR', 'TFB_DIG', 'TFBD_30', 'TFBD_90', 'TFBDIG_30', 'TFBDIG_90')
for (const c of cands) {
  const j = await get(`${base}${c}/20261015/20261029`)
  if (j.s === 200 && j.len > 4) console.log('OK ', c, 'json', j.len, j.head, '...', j.tail)
  else if (j.s !== 404) console.log('?? ', c, j.s, j.len, j.head)
}
console.log('### FIM (candidatos 404 omitidos)')
