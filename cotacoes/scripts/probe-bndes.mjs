// SONDAGEM TEMPORÁRIA 2 (sai do repositório depois): como o formulário de Moedas Contratuais do BNDES consulta cotações.
const UA = { 'user-agent': 'Mozilla/5.0 (cotacoes-sondagem)', accept: '*/*' }
const get = async (url, init = {}, ms = 30000) => {
  try {
    const r = await fetch(url, { headers: { ...UA, ...(init.headers || {}) }, method: init.method || 'GET', body: init.body, signal: AbortSignal.timeout(ms), redirect: 'follow' })
    const buf = await r.arrayBuffer()
    return { status: r.status, type: r.headers.get('content-type') || '', url: r.url, body: new TextDecoder('latin1').decode(buf) }
  } catch (e) { return { status: 0, type: '', url, body: String(e.cause?.code || e.message) } }
}
const text = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim()
const BASE = 'https://www.bndes.gov.br/SiteBNDES/bndes/bndes_pt/Galerias/Convivencia/Moedas_Contratuais/'
const p = await get(BASE + 'index.html')
console.log('### PÁGINA http', p.status, 'bytes', p.body.length)
console.log('### FORMS')
for (const m of p.body.matchAll(/<form\b[^>]*>/gi)) console.log(m[0])
console.log('### INPUTS/SELECTS (sem options)')
for (const m of p.body.matchAll(/<(input|select|button|textarea)\b[^>]*>/gi)) console.log(m[0].slice(0, 220))
console.log('### OPTIONS (5 primeiras e as de TFB/TFC/TLP/TR)')
const opts = [...p.body.matchAll(/<option\b[^>]*value=["']?([^"'>\s]*)["']?[^>]*>([\s\S]*?)(?=<option|<\/select)/gi)].map((m) => [m[1], text(m[2])])
console.log('total options', opts.length)
for (const o of opts.slice(0, 6)) console.log(' ', JSON.stringify(o))
for (const o of opts.filter(([v, t]) => /^(TFB36\.30|TFB60\.30|TFC_60|TLP|TR \(|TR$|TJLP|UMBNDES)/i.test(t))) console.log(' *', JSON.stringify(o))
console.log('### SCRIPTS')
for (const m of p.body.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  const src = /src=["']([^"']+)/i.exec(m[1])?.[1]
  if (src) console.log(' src:', src)
  else if (m[2].trim()) console.log(' inline:', m[2].replace(/\s+/g, ' ').slice(0, 900))
}
console.log('### TRECHO DO HTML AO REDOR DO SELECT')
const i = p.body.search(/<select/i); console.log(p.body.slice(Math.max(0, i - 900), i + 500).replace(/\s+/g, ' '))
console.log('### FIM')
