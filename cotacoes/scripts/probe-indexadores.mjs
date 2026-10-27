// SONDAGEM TEMPORÁRIA (sai do repositório na etapa seguinte): lê o nome oficial das séries candidatas no SGS do Banco Central.
const get = async (url, ms = 25000) => {
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (cotacoes-sondagem)', accept: '*/*' }, signal: AbortSignal.timeout(ms) })
    return { status: res.status, body: await res.text() }
  } catch (e) {
    return { status: 0, body: String(e.message) }
  }
}
const text = (html) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
console.log('### SONDAGEM 2 (metadados)')
const CODES = [25, 226, 253, 7811, 7812, 7813, 7814, 7815, 27572, 27573, 27574, 27570, 27571, 27578, 27579, 27580, 27581, 27582, 27583, 27584, 27585]
for (const code of CODES) {
  const r = await get(`https://www3.bcb.gov.br/sgspub/consultarmetadados/consultarMetadadosSeries.do?method=consultarMetadadosSeriesInternet&hdOidSeriesSelecionadas=${code}`, 20000)
  const t = text(r.body)
  const m = t.match(/Nome completo[:\s]*(.{0,170})/i) || t.match(/Nome abreviado[:\s]*(.{0,170})/i)
  console.log(`[meta ${code}] http ${r.status} ${m ? m[1] : t.slice(0, 200)}`)
}
for (const code of [27572, 27573]) {
  const r = await get(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados/ultimos/14?formato=json`, 40000)
  console.log(`[sgs ${code}] http ${r.status} ${r.body.replace(/\s+/g, ' ').slice(0, 700)}`)
}
console.log('### FIM DA SONDAGEM 2')
