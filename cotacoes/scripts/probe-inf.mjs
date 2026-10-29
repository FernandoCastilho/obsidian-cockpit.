import { googleUrl, parseRss, canonicalSource } from './news-lib.mjs'
const H = { 'user-agent': 'Mozilla/5.0 (cotacoes-coleta)' }
const get = async (u) => { const r = await fetch(u, { headers: H, signal: AbortSignal.timeout(30000) }); return [r.status, await r.text()] }
// 1) SIDRA 7060: IPCA por grupos
const groups = '7169,7170,7445,7486,7558,7625,7660,7712,7766,7786'
for (const u of [
  `https://apisidra.ibge.gov.br/values/t/7060/n1/1/v/63,66,69,2265/p/last%203/c315/${groups}?formato=json`,
]) {
  try { const [s, t] = await get(u); console.log('### SIDRA', s, t.length); const j = JSON.parse(t); console.log(JSON.stringify(j.slice(0, 3))); console.log('linhas', j.length); const seen = new Set(); for (const r of j.slice(1)) { const k = `${r.D4C}|${r.D4N}`; if (!seen.has(k)) { seen.add(k); console.log(k) } } console.log([...new Set(j.slice(1).map((r) => r.D2C + ':' + r.D2N))].join(' ; ')); console.log([...new Set(j.slice(1).map((r) => r.D3C))].join(',')) } catch (e) { console.log('### SIDRA ERRO', e.message) }
}
// 2) Notícias do mercado hoje (Valor e geral), janela de 2 dias
const Q = ['mercado financeiro Ibovespa dólar juros', 'Copom Selic inflação juros futuros DI', 'bolsa petróleo Fed dólar Treasuries']
for (const [label, site] of [['valor', ' site:valor.globo.com'], ['geral', '']]) {
  for (const q of Q) {
    const u = googleUrl(q + site, 'pt').replace('when%3A7d', 'when%3A2d')
    try { const [s, t] = await get(u); const items = parseRss(t); console.log(`### ${label} | ${q} | ${s} | itens=${items.length}`); for (const it of items.slice(0, 4)) console.log('  -', new Date(it.t).toISOString().slice(0, 16), canonicalSource(it), '|', it.title.slice(0, 110)) } catch (e) { console.log('### ERRO', label, q, e.message) }
  }
}
