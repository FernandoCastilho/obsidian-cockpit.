const get = async (u) => { try { const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 (cotacoes-sonda)', accept: 'application/json' }, signal: AbortSignal.timeout(30000) }); return `${r.status} ${(await r.text()).slice(0, 600)}` } catch (e) { return `ERRO ${e.message}` } }
for (const code of [13762, 13761, 4513, 4536, 13759, 13760]) {
  const base = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados`
  console.log(`--- SGS ${code}\nprimeiros: ${await get(`${base}?formato=json&dataInicial=01/01/2000&dataFinal=31/12/2007`)}\núltimos: ${await get(`${base}/ultimos/4?formato=json`)}`)
}
const meta = await get('https://www3.bcb.gov.br/sgspub/consultarvalores/telaCvsSelecionarSeries.paint?path=conteudo.paint')
console.log('meta', meta.slice(0, 200))
