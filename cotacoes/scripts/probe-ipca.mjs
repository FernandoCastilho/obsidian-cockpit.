// SONDAGEM TEMPORÁRIA: formato da API SIDRA (IBGE) para o IPCA.
const urls = [
  'https://apisidra.ibge.gov.br/values/t/1737/n1/1/v/63,69,2265,2266/p/last%203?formato=json',
  'https://apisidra.ibge.gov.br/values/t/1737/n1/1/v/63,69,2265,2266/p/all?formato=json',
  'https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json&dataInicial=01/01/2026&dataFinal=31/10/2026',
]
for (const u of urls) {
  try {
    const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 (cotacoes-sondagem)' }, signal: AbortSignal.timeout(60000) })
    const t = await r.text()
    console.log('URL', u, 'HTTP', r.status, 'bytes', t.length)
    let j; try { j = JSON.parse(t) } catch { console.log('não-JSON:', t.slice(0, 200)); continue }
    console.log('linhas', Array.isArray(j) ? j.length : typeof j)
    if (Array.isArray(j)) { console.log(JSON.stringify(j.slice(0, 3))); console.log(JSON.stringify(j.slice(-3))) }
  } catch (e) { console.log('ERRO', u, e.message) }
}
