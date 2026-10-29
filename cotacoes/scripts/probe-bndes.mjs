const H = { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36', accept: '*/*' }
const ORI = 'https://www.bndes.gov.br'
const base = ORI + '/apoioFinanceiro/rest/taxas/'
async function get(url) {
  try {
    const r = await fetch(url, { headers: { ...H, referer: ORI + '/' }, signal: AbortSignal.timeout(40000) })
    const t = await r.text()
    return { s: r.status, ct: r.headers.get('content-type'), len: t.length, head: t.slice(0, 260).replace(/\s+/g, ' '), tail: t.slice(-130).replace(/\s+/g, ' '), body: t }
  } catch (e) { return { err: e.message, body: '' } }
}
const show = (r) => JSON.stringify({ ...r, body: undefined })
console.log('### CÓDIGOS CANDIDATOS')
const codes = ['um143', 'UM143', 'um024', 'um236', 'um777', 'um604', 'umTR1', 'umTR2', 'UMTR1', 'UMTR2', 'TR', 'TR1', 'TR2', 'UMBNDES', 'umbndes']
for (const c of codes) {
  const a = await get(`${base}${c}/20261015/20261029`)
  console.log(c, 'json', show(a))
  const b = await get(`${base}${c}.txt`)
  console.log(c, 'txt ', show(b))
}
console.log('### PÁGINAS DO GUIA: referências ao serviço')
const G = ORI + '/wps/portal/site/home/financiamento/guia/custos-financeiros/'
for (const p of ['', 'cesta-de-moedas', 'tfb-taxa-fixa-bndes', 'tr-taxa-referencial', 'tlp-taxa-de-longo-prazo', 'moedas-contratuais']) {
  const r = await get(G + p)
  const refs = new Set([...r.body.matchAll(/(?:rest\/taxas\/|taxas\/)([A-Za-z0-9_./{}$+'" -]{2,60})/g)].map((m) => m[1]))
  const ums = new Set([...r.body.matchAll(/\b[uU][mM][A-Za-z]{0,3}\d{2,3}\b/g)].map((m) => m[0]))
  console.log(`\n[${p || '(índice)'}] http ${r.s} bytes ${r.len ?? 0} refs=${[...refs].slice(0, 25).join(' | ')} ums=${[...ums].slice(0, 30).join(',')}`)
}
console.log('### FIM')
