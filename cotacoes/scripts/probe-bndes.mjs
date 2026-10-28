// SONDAGEM TEMPORÁRIA 3 (sai do repositório depois): consulta POST do BNDES para TFB, TFC, TLP e TR.
const UA = { 'user-agent': 'Mozilla/5.0 (cotacoes-sondagem)', accept: 'text/html,*/*', 'content-type': 'application/x-www-form-urlencoded', referer: 'https://www.bndes.gov.br/SiteBNDES/bndes/bndes_pt/Galerias/Convivencia/Moedas_Contratuais/index.html' }
const URL_ = 'https://www.bndes.gov.br/SiteBNDES/bndes/bndes_pt/Galerias/Convivencia/Moedas_Contratuais/consulta_moedas.html'
const text = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim()
const post = async (moeda, data = '') => {
  try {
    const r = await fetch(URL_, { method: 'POST', headers: UA, body: new URLSearchParams({ Moeda: moeda, Data: data }).toString(), signal: AbortSignal.timeout(40000) })
    const buf = await r.arrayBuffer(); return { status: r.status, type: r.headers.get('content-type'), body: new TextDecoder('latin1').decode(buf) }
  } catch (e) { return { status: 0, body: String(e.cause?.code || e.message) } }
}
for (const [moeda, nome] of [['TFB_60_30', 'TFB60.30'], ['C01', 'TFC_60.90(C01)'], ['777', 'TLP pré-fixada'], ['236', 'TLP-IPCA'], ['200', 'TR'], ['311', 'TJLP']]) {
  const r = await post(moeda)
  const t = text(r.body); const rows = (r.body.match(/<tr\b/gi) || []).length
  console.log(`\n### ${nome} (${moeda}) http ${r.status} ${r.type} bytes ${r.body.length} linhas <tr>: ${rows}`)
  const i = t.search(/\d{2}\/\d{2}\/\d{4}/)
  console.log(t.slice(Math.max(0, i - 260), i + 700))
}
console.log('\n### HTML BRUTO DA TFB (trecho da tabela)')
const raw = (await post('TFB_60_30')).body; const k = raw.search(/<table/i); console.log(raw.slice(Math.max(0, k - 200), k + 1400).replace(/\s+/g, ' '))
console.log('### FIM')
