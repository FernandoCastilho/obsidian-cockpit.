const H = { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36', accept: '*/*' }
const ORI = 'https://www.bndes.gov.br'
const G = ORI + '/wps/portal/site/home/financiamento/guia/custos-financeiros/'
const text = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim()
for (const p of ['moedas-contratuais', 'cesta-de-moedas']) {
  const r = await fetch(G + p, { headers: H }); const b = await r.text()
  console.log(`\n######## ${p} http ${r.status} bytes ${b.length}`)
  const t = text(b)
  const at = [...t.matchAll(/TFC/g)].map((m) => m.index)
  console.log('TFC no texto:', at.length, 'vezes')
  for (const i of at.slice(0, 5)) console.log('  …' + t.slice(Math.max(0, i - 260), i + 360) + '…')
  const i0 = t.search(/Moedas Contratuais/i); console.log('TEXTO:', t.slice(i0, i0 + 1800))
  console.log('FORMS:'); for (const m of b.matchAll(/<form\b[^>]*>/gi)) console.log('  ', m[0].slice(0, 300))
  console.log('SELECTS/INPUTS:'); for (const m of [...b.matchAll(/<(select|input)\b[^>]*>/gi)].slice(0, 40)) console.log('  ', m[0].slice(0, 220))
  console.log('OPTIONS:', [...b.matchAll(/<option\b[^>]*>([^<]*)/gi)].map((m) => m[1].trim()).filter(Boolean).slice(0, 60).join(' | '))
  console.log('REFS (rest/ajax/txt/.json/.csv):'); for (const m of new Set([...b.matchAll(/["'(]([^"'()\s]*(?:rest\/|\.txt|\.json|\.csv|ajax|servlet|taxas|moeda)[^"'()\s]*)["')]/gi)].map((x) => x[1]))) console.log('  ', m.slice(0, 200))
  console.log('SCRIPT SRC:'); for (const m of b.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)) if (!/gstatic|jquery|bootstrap|googletag|analytics/i.test(m[1])) console.log('  ', m[1].slice(0, 200))
  const j = b.search(/urlServico|\$\.ajax|fetch\(|XMLHttpRequest/); if (j >= 0) console.log('JS:', b.slice(Math.max(0, j - 300), j + 1200).replace(/\s+/g, ' '))
}
console.log('### FIM')
