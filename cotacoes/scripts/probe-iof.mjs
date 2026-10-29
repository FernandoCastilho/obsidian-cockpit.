const get = async (u) => { const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 (cotacoes-coleta)' }, signal: AbortSignal.timeout(30000) }); return [r.status, new TextDecoder('latin1').decode(await r.arrayBuffer())] }
const strip = (h) => h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ')
for (const u of ['https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2007/decreto/d6306.htm', 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/decreto/d12499.htm']) {
  try {
    const [s, h] = await get(u); const t = strip(h); console.log('### ' + u, s, t.length)
    const i = t.indexOf('Art. 7'); console.log('--- Art.7 em', i); if (i >= 0) console.log(t.slice(i, i + 3800))
    for (const m of t.matchAll(/0,0082|0,0041|0,38|365 dias/g)) { console.log('>>', t.slice(Math.max(0, m.index - 160), m.index + 200)); break }
  } catch (e) { console.log('### ERRO ' + u, e.cause?.code || e.message) }
}
